import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import apiClient, { getFichaClinica, guardarAnamnesis } from '../../../api/client';
import VistaConTeclado from '../../../components/VistaConTeclado';

// CU77: el bloque estructurado de la evaluación viaja dentro de la anamnesis
// delimitado por estas marcas, para poder reconstruir los campos al cargar.
const MARCA_INICIO = '═══ EVALUACIÓN ESTRUCTURADA ═══';
const MARCA_FIN = '═══ FIN EVALUACIÓN ═══';

const claveBorrador = (pacienteId) => `cu77_borrador_${pacienteId}`;

// CU24: el triaje del paciente se anexa a la anamnesis entre estas marcas.
// Antes quedaba mezclado dentro del cuadro de texto editable y se leía como
// un bloque confuso; ahora se separa y se muestra como tarjeta de lectura.
const TRIAJE_INICIO = '── TRIAJE AUTOMATIZADO';
const TRIAJE_FIN = '── FIN TRIAJE ──';

/** Extrae los bloques de triaje del texto y devuelve el resto editable. */
function separarTriajes(texto) {
  const bloques = [];
  let resto = texto;
  for (;;) {
    const inicio = resto.indexOf(TRIAJE_INICIO);
    if (inicio === -1) break;
    const fin = resto.indexOf(TRIAJE_FIN, inicio);
    if (fin === -1) break;
    bloques.push(resto.slice(inicio, fin + TRIAJE_FIN.length).trim());
    resto = (resto.slice(0, inicio) + resto.slice(fin + TRIAJE_FIN.length)).trim();
  }
  return { bloques, resto };
}

/** Líneas legibles de un bloque de triaje (sin las marcas). */
function lineasDeTriaje(bloque) {
  return bloque
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith(TRIAJE_INICIO) && l !== TRIAJE_FIN);
}

/** Fecha del bloque, si el encabezado la trae: "── TRIAJE AUTOMATIZADO (05/09/2026) ──" */
function fechaDeTriaje(bloque) {
  return bloque.match(/\(([^)]+)\)/)?.[1] || '';
}

// Valores del triaje que corresponden a campos de la plantilla de evaluación.
// Solo se proponen si el campo está vacío; el profesional siempre puede
// corregirlos.
const PRELLENADO_DESDE_TRIAJE = [
  { campoId: 'dolor_eva', prefijo: 'Intensidad reportada: ', limpiar: (v) => v.replace('/10', '').replace('.', '').trim() },
  { campoId: 'habitos', prefijo: 'Hábitos alimentarios declarados: ', limpiar: (v) => v.replace(/\.$/, '').trim() },
];

/** Separa el bloque estructurado del texto libre de la anamnesis. */
function separarBloque(texto) {
  const inicio = texto.indexOf(MARCA_INICIO);
  const fin = texto.indexOf(MARCA_FIN);
  if (inicio === -1 || fin === -1 || fin < inicio) {
    return { lineasBloque: [], libre: texto };
  }
  const dentro = texto.slice(inicio + MARCA_INICIO.length, fin).trim();
  const libre = (texto.slice(0, inicio) + texto.slice(fin + MARCA_FIN.length)).trim();
  return { lineasBloque: dentro.split('\n').filter(Boolean), libre };
}

const LIMITE_ANAMNESIS = 2000;

export default function AnamnesisScreen({ route, navigation }) {
  const { pacienteId, nombrePaciente } = route.params;

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [version, setVersion] = useState(null);

  const [anamnesis, setAnamnesis] = useState('');
  const [plantillaEspecialidad, setPlantillaEspecialidad] = useState('');

  // CU77: plantilla dinámica según la especialidad del profesional
  const [plantilla, setPlantilla] = useState(null);
  const [sinEspecialidad, setSinEspecialidad] = useState(false);
  const [camposValores, setCamposValores] = useState({});
  const [erroresCampos, setErroresCampos] = useState({});

  // Listas representadas como texto separado por comas para edición simple
  // CU24: bloques de la entrevista previa (solo lectura, se conservan al guardar).
  const [bloquesTriaje, setBloquesTriaje] = useState([]);

  const [alergiasTexto, setAlergiasTexto] = useState('');
  const [quirurgicosTexto, setQuirurgicosTexto] = useState('');
  const [patologicosTexto, setPatologicosTexto] = useState('');

  // ─ Excepción 2: campos obligatorios resaltados 
  const [errores, setErrores] = useState({});

  // ─ Excepción 1: aviso de truncado 
  const [avisoTruncado, setAvisoTruncado] = useState('');

  const cargarFicha = async () => {
    setCargando(true);
    try {
      // CU77: la estructura del formulario depende de la especialidad
      // acreditada del profesional (Excepción 2 si no la tiene).
      let plantillaCargada = null;
      try {
        const respuesta = await apiClient.get('/clinica/plantilla-evaluacion');
        plantillaCargada = respuesta.data;
        setPlantilla(plantillaCargada);
        setPlantillaEspecialidad(respuesta.data.especialidad);
      } catch (errorPlantilla) {
        if (errorPlantilla.response?.data?.error === 'SIN_ESPECIALIDAD') {
          setSinEspecialidad(true);
        }
      }

      const data = await getFichaClinica(pacienteId);

      // Reconstruir los campos estructurados desde la anamnesis guardada.
      const { lineasBloque, libre } = separarBloque(data.anamnesis || '');
      const valores = {};
      if (plantillaCargada) {
        for (const linea of lineasBloque) {
          const separador = linea.indexOf(':');
          if (separador === -1) continue;
          const etiqueta = linea.slice(0, separador).trim();
          const campo = plantillaCargada.campos.find((c) => c.etiqueta === etiqueta);
          if (campo) valores[campo.id] = linea.slice(separador + 1).trim();
        }
      }

      // CU24: separar la entrevista del paciente del texto libre del profesional.
      const { bloques, resto } = separarTriajes(libre);
      setBloquesTriaje(bloques);

      // Lo que el paciente ya contestó se propone en la plantilla (si el
      // campo existe para esta especialidad y está vacío).
      if (plantillaCargada && bloques.length > 0) {
        const lineasUltimo = lineasDeTriaje(bloques[bloques.length - 1]);
        for (const regla of PRELLENADO_DESDE_TRIAJE) {
          const existe = plantillaCargada.campos.some((c) => c.id === regla.campoId);
          if (!existe || String(valores[regla.campoId] || '').trim()) continue;
          const linea = lineasUltimo.find((l) => l.startsWith(regla.prefijo));
          if (linea) valores[regla.campoId] = regla.limpiar(linea.slice(regla.prefijo.length));
        }
      }

      setCamposValores(valores);
      setAnamnesis(resto);
      if (!plantillaCargada) setPlantillaEspecialidad(data.plantilla_especialidad || '');
      setAlergiasTexto((data.alergias || []).join(', '));
      setQuirurgicosTexto((data.antecedentes_quirurgicos || []).join(', '));
      setPatologicosTexto((data.antecedentes_patologicos || []).join(', '));
      setVersion(data.version);

      // CU77 — Excepción 4: si quedó un borrador local de una caída de red,
      // se ofrece recuperarlo.
      const guardado = await SecureStore.getItemAsync(claveBorrador(pacienteId));
      if (guardado) {
        const borrador = JSON.parse(guardado);
        Alert.alert(
          'Borrador recuperado',
          'Hay una evaluación sin sincronizar guardada en este dispositivo. ¿Quieres recuperarla?',
          [
            { text: 'Descartar', onPress: () => SecureStore.deleteItemAsync(claveBorrador(pacienteId)) },
            {
              text: 'Recuperar',
              onPress: () => {
                setCamposValores(borrador.camposValores || {});
                setAnamnesis(borrador.anamnesis || '');
                setAlergiasTexto(borrador.alergiasTexto || '');
                setQuirurgicosTexto(borrador.quirurgicosTexto || '');
                setPatologicosTexto(borrador.patologicosTexto || '');
              },
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar la ficha clínica del paciente.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarFicha();
  }, []);

  // ─ Excepción 1: truncado en tiempo real 
  // El tope de 2000 es sobre el texto completo: lo que ocupa la entrevista del
  // paciente se descuenta del espacio libre para que nada se trunque al guardar.
  const textoTriaje = bloquesTriaje.join('\n\n');
  const limiteLibre = Math.max(200, LIMITE_ANAMNESIS - (textoTriaje ? textoTriaje.length + 2 : 0));

  const manejarCambioAnamnesis = (texto) => {
    if (texto.length > limiteLibre) {
      setAnamnesis(texto.slice(0, limiteLibre));
      setAvisoTruncado(`Se alcanzó el límite de ${limiteLibre} caracteres (la entrevista del paciente ocupa el resto).`);
    } else {
      setAnamnesis(texto);
      if (avisoTruncado) setAvisoTruncado('');
    }
    if (errores.anamnesis) setErrores({ ...errores, anamnesis: false });
  };

  const parsearLista = (texto) =>
    texto.split(',').map((s) => s.trim()).filter((s) => s.length > 0);

  // ─ Excepción 2: validación de campos obligatorios 
  const validar = () => {
    const nuevosErrores = {};
    if (!anamnesis.trim()) nuevosErrores.anamnesis = true;
    if (!plantillaEspecialidad.trim()) nuevosErrores.plantillaEspecialidad = true;

    // CU77 — Excepción 3: los campos obligatorios de la plantilla se
    // resaltan en rojo si quedaron vacíos.
    const nuevosErroresCampos = {};
    for (const campo of plantilla?.campos || []) {
      if (campo.obligatorio && !String(camposValores[campo.id] || '').trim()) {
        nuevosErroresCampos[campo.id] = true;
      }
    }
    setErroresCampos(nuevosErroresCampos);

    setErrores(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0 || Object.keys(nuevosErroresCampos).length > 0) {
      Alert.alert(
        'Campos incompletos',
        'Existen campos obligatorios sin completar. Revisa los bloques resaltados.'
      );
      return false;
    }
    return true;
  };

  // ─ Guardar (CU29 flujo principal) 
  const guardar = async () => {
    if (!validar()) return;

    setGuardando(true);

    // El bloque estructurado (CU77) viaja dentro de la anamnesis, delimitado
    // para poder reconstruirlo al volver a cargar.
    let anamnesisCompleta = anamnesis;
    if (plantilla) {
      const lineas = plantilla.campos
        .filter((campo) => String(camposValores[campo.id] || '').trim())
        .map((campo) => `${campo.etiqueta}: ${String(camposValores[campo.id]).trim()}`);
      if (lineas.length > 0) {
        anamnesisCompleta = `${MARCA_INICIO}\n${lineas.join('\n')}\n${MARCA_FIN}\n\n${anamnesis}`;
      }
    }
    // CU24: la entrevista del paciente se conserva íntegra al final.
    if (textoTriaje) {
      anamnesisCompleta = `${anamnesisCompleta.trim()}\n\n${textoTriaje}`;
    }

    try {
      const data = await guardarAnamnesis({
        paciente_id: pacienteId,
        anamnesis: anamnesisCompleta,
        plantilla_especialidad: plantillaEspecialidad,
        alergias: parsearLista(alergiasTexto),
        antecedentes_quirurgicos: parsearLista(quirurgicosTexto),
        antecedentes_patologicos: parsearLista(patologicosTexto),
        version
      });

      if (data.truncado) {
        Alert.alert(
          'Texto truncado',
          `La anamnesis excedía el límite de ${data.limite_anamnesis} caracteres y fue truncada.`
        );
      }

      setVersion(data.version);
      await SecureStore.deleteItemAsync(claveBorrador(pacienteId)).catch?.(() => {});
      Alert.alert('Éxito', data.mensaje);

    } catch (error) {
      const err = error.response?.data;

      // ─ Excepción 3: colisión de escritura 
      if (error.response?.status === 409 && err?.error === 'COLISION_ESCRITURA') {
        Alert.alert(
          'Conflicto de edición',
          err.mensaje,
          [{ text: 'Recargar', onPress: cargarFicha }]
        );
        return;
      }

      // ─ Excepción 2: backend detectó campos faltantes 
      if (error.response?.status === 400 && err?.error === 'CAMPOS_OBLIGATORIOS_FALTANTES') {
        const nuevosErrores = {};
        if (err.campos.includes('anamnesis')) nuevosErrores.anamnesis = true;
        if (err.campos.includes('plantilla_especialidad')) nuevosErrores.plantillaEspecialidad = true;
        setErrores(nuevosErrores);
        Alert.alert('Campos incompletos', err.mensaje);
        return;
      }

      if (error.response?.status === 401) {
        Alert.alert('Sesión expirada', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
        return;
      }

      if (error.response?.status === 403) {
        Alert.alert('Acceso denegado', err?.error || 'No tienes permisos para esta acción.');
        return;
      }

      if (err?.error === 'FALLO_BITACORA') {
        Alert.alert('Error de auditoría', err.mensaje);
        return;
      }

      if (!error.response) {
        // CU77 — Excepción 4: sin conexión, la evaluación queda en caché
        // local para sincronizarla cuando vuelva la red.
        await SecureStore.setItemAsync(
          claveBorrador(pacienteId),
          JSON.stringify({ camposValores, anamnesis, alergiasTexto, quirurgicosTexto, patologicosTexto })
        );
        Alert.alert(
          'Sin conexión',
          'La evaluación quedó guardada en este dispositivo. Cuando vuelva la señal, guarda de nuevo para sincronizarla.'
        );
        return;
      }

      Alert.alert('Error', err?.error || 'No se pudo guardar la anamnesis. Intenta nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#0052cc" />
        <Text style={styles.cargandoTexto}>Cargando ficha clínica...</Text>
      </View>
    );
  }

  return (
    <VistaConTeclado style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.title}>Evaluación Inicial — Anamnesis</Text>
        <Text style={styles.subtitulo}>Paciente: {nombrePaciente}</Text>

        {/* ─ CU77: plantilla dinámica según la especialidad acreditada */}
        {sinEspecialidad ? (
          <View style={styles.avisoSinEspecialidad}>
            <Text style={styles.avisoSinEspecialidadTexto}>
              Tu cuenta no tiene una especialidad acreditada, así que no se puede
              generar la plantilla de evaluación. Completa tu configuración
              profesional o contacta al administrador.
            </Text>
          </View>
        ) : plantilla ? (
          <View style={styles.bloquePlantilla}>
            <Text style={styles.chipEspecialidad}>
              Plantilla: {plantilla.especialidad}
            </Text>
            {plantilla.campos.map((campo) => (
              <View key={campo.id}>
                <Text style={styles.label}>
                  {campo.etiqueta}{campo.obligatorio ? ' *' : ''}
                </Text>
                <TextInput
                  style={[styles.input, erroresCampos[campo.id] && styles.inputError]}
                  placeholder={campo.tipo === 'numero' ? 'Solo números' : 'Escribe aquí…'}
                  keyboardType={campo.tipo === 'numero' ? 'numeric' : 'default'}
                  value={String(camposValores[campo.id] || '')}
                  onChangeText={(v) => {
                    const valor = campo.tipo === 'numero' ? v.replace(/[^0-9.,]/g, '') : v;
                    setCamposValores({ ...camposValores, [campo.id]: valor });
                    if (erroresCampos[campo.id]) {
                      setErroresCampos({ ...erroresCampos, [campo.id]: false });
                    }
                  }}
                />
                {erroresCampos[campo.id] && (
                  <Text style={styles.errorTexto}>Este campo es obligatorio para tu especialidad.</Text>
                )}
              </View>
            ))}
          </View>
        ) : (
          <>
            <Text style={styles.label}>Plantilla de especialidad *</Text>
            <TextInput
              style={[styles.input, errores.plantillaEspecialidad && styles.inputError]}
              placeholder="Ej: Kinesiología Respiratoria"
              value={plantillaEspecialidad}
              onChangeText={(v) => {
                setPlantillaEspecialidad(v);
                if (errores.plantillaEspecialidad) setErrores({ ...errores, plantillaEspecialidad: false });
              }}
            />
            {errores.plantillaEspecialidad && (
              <Text style={styles.errorTexto}>Este campo es obligatorio.</Text>
            )}
          </>
        )}

        {/* ─ CU24: entrevista previa del paciente (solo lectura) */}
        {bloquesTriaje.map((bloque, i) => (
          <View key={i} style={styles.tarjetaTriaje}>
            <Text style={styles.tituloTriaje}>
              🩺 Entrevista previa del paciente{fechaDeTriaje(bloque) ? ` · ${fechaDeTriaje(bloque)}` : ''}
            </Text>
            {lineasDeTriaje(bloque).map((linea, j) => (
              <Text key={j} style={styles.lineaTriaje}>• {linea}</Text>
            ))}
            <Text style={styles.notaTriaje}>
              Respuestas del propio paciente. Se conservan en la ficha; corrige o completa en los campos de abajo.
            </Text>
          </View>
        ))}

        {/* ─ Anamnesis */}
        <Text style={styles.label}>Anamnesis *</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            errores.anamnesis && styles.inputError
          ]}
          placeholder="Describe la anamnesis del paciente..."
          multiline
          numberOfLines={6}
          value={anamnesis}
          onChangeText={manejarCambioAnamnesis}
        />
        <Text style={styles.contador}>
          {anamnesis.length} / {limiteLibre}
        </Text>
        {errores.anamnesis && (
          <Text style={styles.errorTexto}>Este campo es obligatorio.</Text>
        )}
        {avisoTruncado !== '' && (
          <Text style={styles.avisoTruncado}>{avisoTruncado}</Text>
        )}

        {/* ─ Alergias  */}
        <Text style={styles.label}>Antecedentes alérgicos</Text>
        <TextInput
          style={[styles.input, styles.textAreaPeque]}
          placeholder="Separar con comas, ej: Penicilina, Polen"
          multiline
          value={alergiasTexto}
          onChangeText={setAlergiasTexto}
        />

        {/* ─ Antecedentes quirúrgicos  */}
        <Text style={styles.label}>Antecedentes quirúrgicos</Text>
        <TextInput
          style={[styles.input, styles.textAreaPeque]}
          placeholder="Separar con comas, ej: Apendicectomía 2018"
          multiline
          value={quirurgicosTexto}
          onChangeText={setQuirurgicosTexto}
        />

        {/* ─ Antecedentes patológicos */}
        <Text style={styles.label}>Antecedentes patológicos</Text>
        <TextInput
          style={[styles.input, styles.textAreaPeque]}
          placeholder="Separar con comas, ej: Hipertensión, Diabetes tipo 2"
          multiline
          value={patologicosTexto}
          onChangeText={setPatologicosTexto}
        />

        {/* ─ Guardar */}
        <TouchableOpacity
          style={[styles.boton, guardando && styles.botonDeshabilitado]}
          onPress={guardar}
          disabled={guardando}
        >
          {guardando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.botonTexto}>Guardar Anamnesis</Text>}
        </TouchableOpacity>
      </VistaConTeclado>
  );
}

const styles = StyleSheet.create({
  bloquePlantilla: {
    backgroundColor: '#eef4ff',
    borderWidth: 1,
    borderColor: '#c5d8f7',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  chipEspecialidad: {
    alignSelf: 'flex-start',
    backgroundColor: '#0052cc',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  avisoSinEspecialidad: {
    backgroundColor: '#fdecea',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
  },
  avisoSinEspecialidadTexto: { color: '#b71c1c' },
  tarjetaTriaje: {
    backgroundColor: '#fffbea',
    borderWidth: 1,
    borderColor: '#f3d27a',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  tituloTriaje: { fontWeight: 'bold', color: '#7a5c00', marginBottom: 6 },
  lineaTriaje: { color: '#3a3a3a', fontSize: 13, marginBottom: 3, lineHeight: 18 },
  notaTriaje: { color: '#8a7a3a', fontSize: 11, marginTop: 6, fontStyle: 'italic' },
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cargandoTexto: { marginTop: 10, color: '#666' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1c3d5a', marginBottom: 4 },
  subtitulo: { fontSize: 14, color: '#888', marginBottom: 20 },
  label: { fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12, fontSize: 14 },
  input: {
    borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff',
    padding: 12, borderRadius: 10, fontSize: 15
  },
  textArea: { minHeight: 140, textAlignVertical: 'top' },
  textAreaPeque: { minHeight: 70, textAlignVertical: 'top' },
  inputError: { borderColor: '#d32f2f', borderWidth: 2, backgroundColor: '#fff0f0' },
  errorTexto: { color: '#d32f2f', fontSize: 12, marginTop: 4 },
  contador: { textAlign: 'right', color: '#999', fontSize: 12, marginTop: 4 },
  avisoTruncado: { color: '#e65100', fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  boton: {
    backgroundColor: '#2e7d32', padding: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 28
  },
  botonDeshabilitado: { opacity: 0.6 },
  botonTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});