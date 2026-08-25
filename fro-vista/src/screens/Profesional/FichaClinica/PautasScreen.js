// Ruta: fro-vista/src/screens/Profesional/FichaClinica/PautasScreen.js
//
// Pestaña de pautas de ejercicio dentro de la Ficha Clínica.
// CU46: biblioteca centralizada con buscador de material terapéutico.
// CU47: prescripción de pautas con series, repeticiones y frecuencia.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

import apiClient from '../../../api/client';
import ErrorRetry from '../../../components/ErrorRetry';
import VistaConTeclado from '../../../components/VistaConTeclado';

const COLOR_ESTADO = { VIGENTE: '#2e7d32', PROGRAMADA: '#0052cc', EXPIRADA: '#9e9e9e' };

function fechaMasDias(dias) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

export default function PautasScreen({ route }) {
  const { pacienteId } = route?.params || {};

  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [episodios, setEpisodios] = useState([]);
  const [pautas, setPautas] = useState([]);

  // CU46: biblioteca
  const [materiales, setMateriales] = useState([]);
  const [buscarMaterial, setBuscarMaterial] = useState('');
  const [buscandoBiblioteca, setBuscandoBiblioteca] = useState(false);
  const [resultadosBiblioteca, setResultadosBiblioteca] = useState(null);

  // CU47: formulario de nueva pauta
  const [formVisible, setFormVisible] = useState(false);
  const [episodioId, setEpisodioId] = useState('');
  const [nombrePauta, setNombrePauta] = useState('');
  const [fechaInicio, setFechaInicio] = useState(fechaMasDias(0));
  const [fechaFin, setFechaFin] = useState(fechaMasDias(30));
  const [ejercicios, setEjercicios] = useState([]);
  const [guardando, setGuardando] = useState(false);

  const cargarTodo = async () => {
    setCargando(true);
    setErrorCarga(false);
    try {
      const [datos, biblioteca] = await Promise.all([
        apiClient.get(`/clinica/pautas/paciente/${pacienteId}`),
        apiClient.get('/clinica/materiales'),
      ]);
      setEpisodios(datos.data?.episodios || []);
      setPautas(datos.data?.pautas || []);
      setMateriales(biblioteca.data?.materiales || []);
      if (datos.data?.episodios?.length > 0) {
        setEpisodioId(String(datos.data.episodios[0].episodio_clinico_id));
      }
    } catch {
      setErrorCarga(true);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  // ── CU46: buscador de la biblioteca ────────────────────────────────────────
  const ejecutarBusqueda = async () => {
    setBuscandoBiblioteca(true);
    try {
      const { data } = await apiClient.get('/clinica/materiales', {
        params: { buscar: buscarMaterial.trim() },
      });
      setResultadosBiblioteca(data?.materiales || []);
    } catch {
      // CU46 — Excepción 2: sin motor de búsqueda, catálogo completo.
      setResultadosBiblioteca(materiales);
      Alert.alert('Aviso', 'El buscador no respondió; se muestra el catálogo completo.');
    } finally {
      setBuscandoBiblioteca(false);
    }
  };

  // ── CU47: manejo del formulario ────────────────────────────────────────────
  const agregarEjercicio = () => {
    setEjercicios([
      ...ejercicios,
      { nombre_ejercicio: '', series: '3', repeticiones: '10', frecuencia: 'DIARIA', material_terapeutico_id: '' },
    ]);
  };

  const actualizarEjercicio = (indice, campo, valor) => {
    const nuevos = [...ejercicios];
    nuevos[indice][campo] = valor;
    setEjercicios(nuevos);
  };

  const quitarEjercicio = (indice) => {
    setEjercicios(ejercicios.filter((_, i) => i !== indice));
  };

  const guardarPauta = async () => {
    // CU47 — Excepción 4: sin episodio clínico no hay vinculación.
    if (!episodioId) {
      Alert.alert(
        'Falta el episodio clínico',
        'Este paciente no tiene episodios. Crea primero el episodio base en la pestaña Episodios.'
      );
      return;
    }
    if (!nombrePauta.trim()) {
      Alert.alert('Falta el nombre', 'Dale un nombre a la pauta (ej: "Rehabilitación rodilla semana 1-4").');
      return;
    }
    if (ejercicios.length === 0) {
      Alert.alert('Pauta vacía', 'Agrega al menos un ejercicio.');
      return;
    }
    for (const ejercicio of ejercicios) {
      if (!ejercicio.nombre_ejercicio.trim()) {
        Alert.alert('Ejercicio sin nombre', 'Todos los ejercicios necesitan un nombre.');
        return;
      }
      // CU47 — Excepción 3: solo números en series y repeticiones.
      if (!/^\d+$/.test(ejercicio.series) || !/^\d+$/.test(ejercicio.repeticiones)) {
        Alert.alert('Valores inválidos', `Series y repeticiones de "${ejercicio.nombre_ejercicio}" deben ser números.`);
        return;
      }
    }

    setGuardando(true);
    try {
      await apiClient.post('/clinica/pautas', {
        episodio_clinico_id: Number(episodioId),
        nombre: nombrePauta.trim(),
        fecha_inicio: fechaInicio,
        fecha_expiracion: fechaFin,
        ejercicios: ejercicios.map((e) => ({
          nombre_ejercicio: e.nombre_ejercicio.trim(),
          series: Number(e.series),
          repeticiones: Number(e.repeticiones),
          frecuencia: e.frecuencia,
          material_terapeutico_id: e.material_terapeutico_id ? Number(e.material_terapeutico_id) : null,
        })),
      });

      Alert.alert('Pauta prescrita', 'El paciente ya puede verla en su aplicación.');
      setFormVisible(false);
      setNombrePauta('');
      setEjercicios([]);
      cargarTodo();
    } catch (err) {
      const respuesta = err.response?.data;
      Alert.alert('No se pudo guardar', respuesta?.mensaje || respuesta?.error || 'Intenta nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <View style={estilos.centrado}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  if (errorCarga) {
    return (
      <View style={estilos.centrado}>
        <ErrorRetry mensaje="No se pudieron cargar las pautas." onRetry={cargarTodo} />
      </View>
    );
  }

  const listaBiblioteca = resultadosBiblioteca ?? [];

  return (
    <VistaConTeclado style={estilos.fondo} contentContainerStyle={estilos.contenido}>
      <Text style={estilos.titulo}>Pautas de ejercicio</Text>

      {/* ── CU46: Biblioteca ── */}
      <View style={estilos.tarjeta}>
        <Text style={estilos.seccion}>📚 Biblioteca de material</Text>
        <View style={estilos.filaBusqueda}>
          <TextInput
            style={estilos.inputBusqueda}
            placeholder="Buscar por nombre, categoría o tipo…"
            value={buscarMaterial}
            onChangeText={setBuscarMaterial}
            onSubmitEditing={ejecutarBusqueda}
            returnKeyType="search"
          />
          <TouchableOpacity style={estilos.botonBuscar} onPress={ejecutarBusqueda} disabled={buscandoBiblioteca}>
            <Text style={estilos.botonBuscarTexto}>{buscandoBiblioteca ? '…' : 'Buscar'}</Text>
          </TouchableOpacity>
        </View>

        {resultadosBiblioteca !== null &&
          (listaBiblioteca.length === 0 ? (
            // CU46 — Excepción 1: sin coincidencias.
            <Text style={estilos.sinResultados}>
              Sin coincidencias para "{buscarMaterial.trim()}". Limpia el filtro para ver todo.
            </Text>
          ) : (
            listaBiblioteca.map((material) => (
              <View key={material.material_terapeutico_id} style={estilos.tarjetaMaterial}>
                <Text style={estilos.materialNombre}>{material.nombre}</Text>
                <Text style={estilos.materialDetalle}>
                  {material.categoria} · {material.tipo} · {material.formato}
                </Text>
              </View>
            ))
          ))}
      </View>

      {/* ── Pautas existentes ── */}
      <Text style={estilos.seccion}>Pautas del paciente</Text>
      {pautas.length === 0 ? (
        <Text style={estilos.sinResultados}>Aún no hay pautas prescritas.</Text>
      ) : (
        pautas.map((pauta) => (
          <View key={pauta.pauta_tratamiento_id} style={estilos.tarjeta}>
            <View style={estilos.filaPauta}>
              <Text style={estilos.pautaNombre}>{pauta.nombre}</Text>
              <Text style={[estilos.badge, { color: COLOR_ESTADO[pauta.estado] || '#555' }]}>
                {pauta.estado}
              </Text>
            </View>
            <Text style={estilos.pautaDetalle}>
              {pauta.fecha_inicio} → {pauta.fecha_expiracion} · Episodio #{pauta.episodio_clinico_id}
            </Text>
            {pauta.ejercicios.map((ejercicio) => (
              <Text key={ejercicio.pauta_ejercicio_id} style={estilos.ejercicioLinea}>
                • {ejercicio.nombre_ejercicio} — {ejercicio.series}×{ejercicio.repeticiones} ({ejercicio.frecuencia.toLowerCase()})
                {ejercicio.material_nombre ? `  📚 ${ejercicio.material_nombre}` : ''}
                {`  ✅ ${ejercicio.dias_cumplidos} día(s)`}
              </Text>
            ))}
          </View>
        ))
      )}

      {/* ── CU47: Nueva pauta ── */}
      {!formVisible ? (
        <TouchableOpacity style={estilos.botonPrimario} onPress={() => setFormVisible(true)}>
          <Text style={estilos.botonPrimarioTexto}>＋ Nueva pauta</Text>
        </TouchableOpacity>
      ) : (
        <View style={estilos.tarjeta}>
          <Text style={estilos.seccion}>Nueva pauta</Text>

          <Text style={estilos.etiqueta}>Episodio clínico</Text>
          <View style={estilos.selector}>
            <Picker selectedValue={episodioId} onValueChange={(v) => setEpisodioId(String(v))}>
              {episodios.length === 0 ? (
                <Picker.Item label="— Sin episodios: crea uno primero —" value="" />
              ) : (
                episodios.map((episodio) => (
                  <Picker.Item
                    key={episodio.episodio_clinico_id}
                    label={`#${episodio.episodio_clinico_id} · ${episodio.motivo_consulta}`}
                    value={String(episodio.episodio_clinico_id)}
                  />
                ))
              )}
            </Picker>
          </View>

          <Text style={estilos.etiqueta}>Nombre de la pauta</Text>
          <TextInput
            style={estilos.input}
            placeholder="Ej: Rehabilitación rodilla semanas 1-4"
            value={nombrePauta}
            onChangeText={setNombrePauta}
          />

          <View style={estilos.filaFechas}>
            <View style={estilos.mitad}>
              <Text style={estilos.etiqueta}>Inicio (AAAA-MM-DD)</Text>
              <TextInput style={estilos.input} value={fechaInicio} onChangeText={setFechaInicio} />
            </View>
            <View style={estilos.mitad}>
              <Text style={estilos.etiqueta}>Término (AAAA-MM-DD)</Text>
              <TextInput style={estilos.input} value={fechaFin} onChangeText={setFechaFin} />
            </View>
          </View>

          <Text style={estilos.etiqueta}>Ejercicios</Text>
          {ejercicios.map((ejercicio, indice) => (
            <View key={indice} style={estilos.tarjetaEjercicio}>
              <TextInput
                style={estilos.input}
                placeholder="Nombre del ejercicio"
                value={ejercicio.nombre_ejercicio}
                onChangeText={(v) => actualizarEjercicio(indice, 'nombre_ejercicio', v)}
              />
              <View style={estilos.filaFechas}>
                <TextInput
                  style={[estilos.input, estilos.tercio]}
                  placeholder="Series"
                  keyboardType="numeric"
                  value={ejercicio.series}
                  onChangeText={(v) => actualizarEjercicio(indice, 'series', v.replace(/[^0-9]/g, ''))}
                />
                <TextInput
                  style={[estilos.input, estilos.tercio]}
                  placeholder="Repeticiones"
                  keyboardType="numeric"
                  value={ejercicio.repeticiones}
                  onChangeText={(v) => actualizarEjercicio(indice, 'repeticiones', v.replace(/[^0-9]/g, ''))}
                />
                <View style={[estilos.selector, estilos.tercio]}>
                  <Picker
                    selectedValue={ejercicio.frecuencia}
                    onValueChange={(v) => actualizarEjercicio(indice, 'frecuencia', v)}
                  >
                    <Picker.Item label="Diaria" value="DIARIA" />
                    <Picker.Item label="Semanal" value="SEMANAL" />
                  </Picker>
                </View>
              </View>
              <View style={estilos.selector}>
                <Picker
                  selectedValue={ejercicio.material_terapeutico_id}
                  onValueChange={(v) => actualizarEjercicio(indice, 'material_terapeutico_id', v)}
                >
                  <Picker.Item label="Sin material de apoyo" value="" />
                  {materiales.map((material) => (
                    <Picker.Item
                      key={material.material_terapeutico_id}
                      label={`${material.nombre} (${material.categoria})`}
                      value={String(material.material_terapeutico_id)}
                    />
                  ))}
                </Picker>
              </View>
              <TouchableOpacity onPress={() => quitarEjercicio(indice)}>
                <Text style={estilos.quitarEjercicio}>Quitar ejercicio</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={estilos.botonSecundario} onPress={agregarEjercicio}>
            <Text style={estilos.botonSecundarioTexto}>＋ Agregar ejercicio</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[estilos.botonPrimario, guardando && estilos.deshabilitado]}
            onPress={guardarPauta}
            disabled={guardando}
          >
            {guardando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={estilos.botonPrimarioTexto}>Prescribir pauta</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFormVisible(false)} disabled={guardando}>
            <Text style={estilos.enlace}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}
    </VistaConTeclado>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#f5f5f5' },
  contenido: { padding: 16, paddingBottom: 40 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  titulo: { fontSize: 22, fontWeight: 'bold', color: '#1b5e20', marginBottom: 12 },
  seccion: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32', marginBottom: 10, marginTop: 4 },
  etiqueta: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 4 },

  tarjeta: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 14,
    marginBottom: 14,
  },
  filaBusqueda: { flexDirection: 'row', gap: 8 },
  inputBusqueda: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 10,
  },
  botonBuscar: {
    backgroundColor: '#2e7d32',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  botonBuscarTexto: { color: '#fff', fontWeight: 'bold' },
  sinResultados: { color: '#777', fontStyle: 'italic', marginTop: 10, marginBottom: 6 },
  tarjetaMaterial: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 8,
    marginTop: 8,
  },
  materialNombre: { fontWeight: 'bold', color: '#1f2937' },
  materialDetalle: { color: '#777', fontSize: 12, marginTop: 2 },

  filaPauta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pautaNombre: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', flex: 1 },
  badge: { fontWeight: 'bold', fontSize: 12, marginLeft: 8 },
  pautaDetalle: { color: '#777', fontSize: 12, marginBottom: 8 },
  ejercicioLinea: { color: '#444', marginBottom: 4, fontSize: 13 },

  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  selector: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  filaFechas: { flexDirection: 'row', gap: 8 },
  mitad: { flex: 1 },
  tercio: { flex: 1 },

  tarjetaEjercicio: {
    borderWidth: 1,
    borderColor: '#c8e6c9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#f9fff9',
  },
  quitarEjercicio: { color: '#d32f2f', fontWeight: '600', fontSize: 13, textAlign: 'right' },

  botonPrimario: {
    backgroundColor: '#2e7d32',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  botonPrimarioTexto: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  botonSecundario: {
    borderWidth: 1,
    borderColor: '#2e7d32',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  botonSecundarioTexto: { color: '#2e7d32', fontWeight: 'bold' },
  deshabilitado: { opacity: 0.6 },
  enlace: { color: '#555', textAlign: 'center', marginTop: 8, fontWeight: '600' },
});
