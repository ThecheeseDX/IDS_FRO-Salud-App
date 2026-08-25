// Ruta: fro-vista/src/screens/Paciente/TriajeScreen.js
//
// CU27 → CU23 → CU24 en un solo flujo:
// 1. Disclaimer legal (aceptar habilita; rechazar devuelve al inicio).
// 2. Entrevista guiada por el árbol de decisión (cada respuesta se guarda,
//    así que cerrar la app no pierde el avance).
// 3. Al terminar, las respuestas se estructuran y quedan en la ficha clínica.

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';

import apiClient from '../../api/client';
import ErrorRetry from '../../components/ErrorRetry';
import VistaConTeclado from '../../components/VistaConTeclado';

export default function TriajeScreen({ navigation }) {
  // fase: 'cargando' | 'error' | 'disclaimer' | 'entrevista' | 'completado' | 'resumen'
  const [fase, setFase] = useState('cargando');
  const [disclaimer, setDisclaimer] = useState(null);
  const [arbol, setArbol] = useState(null);
  const [nodoActual, setNodoActual] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [entradaTexto, setEntradaTexto] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [fechaCompletado, setFechaCompletado] = useState(null);
  const [vistaPrevia, setVistaPrevia] = useState('');
  const respuestasRef = useRef({});

  // ── Arranque: estado del ciclo ─────────────────────────────────────────────
  const iniciar = async () => {
    setFase('cargando');
    try {
      const { data } = await apiClient.get('/clinica/triaje/estado');

      if (data.triaje?.estado === 'COMPLETADO') {
        setFechaCompletado(data.triaje.momento_completado);
        setFase('completado');
        return;
      }

      // Recuperar avance parcial si lo hay (Exc.3 del CU23).
      const previas = data.triaje?.respuestas || {};
      setRespuestas(previas);
      respuestasRef.current = previas;

      if (!data.disclaimer_aceptado) {
        const respuesta = await apiClient.get('/clinica/triaje/disclaimer');
        setDisclaimer(respuesta.data);
        setFase('disclaimer');
        return;
      }

      await cargarArbol(previas);
    } catch {
      // CU27 Exc.1 / CU23 Exc.2: sin texto legal o sin reglas, se bloquea.
      setFase('error');
    }
  };

  useEffect(() => {
    iniciar();
  }, []);

  const cargarArbol = async (previas) => {
    const { data } = await apiClient.get('/clinica/triaje/arbol');
    setArbol(data);
    setNodoActual(reanudarDesde(data, previas));
    setFase('entrevista');
  };

  /** Avanza por el árbol siguiendo las respuestas ya guardadas. */
  const reanudarDesde = (datosArbol, previas) => {
    let cursor = datosArbol.inicio;
    while (cursor && cursor !== 'FIN') {
      const nodo = datosArbol.nodos[cursor];
      if (!nodo || !(nodo.id in previas)) return cursor;

      if (nodo.tipo === 'opciones') {
        const opcion = nodo.opciones.find((o) => o.valor === previas[nodo.id]);
        cursor = opcion ? opcion.siguiente : cursor;
        if (!opcion) return cursor;
      } else {
        cursor = nodo.siguiente;
      }
    }
    return cursor; // 'FIN' si todo estaba respondido
  };

  // ── CU27: aceptación / rechazo ─────────────────────────────────────────────
  const aceptarDisclaimer = async () => {
    setProcesando(true);
    try {
      await apiClient.post('/clinica/triaje/disclaimer/aceptar');
      await cargarArbol(respuestasRef.current);
    } catch (err) {
      // Exc.3: sin marca temporal no se habilita el triaje.
      Alert.alert(
        'No se pudo registrar',
        err.response?.data?.mensaje || 'Tu consentimiento no quedó registrado. Intenta nuevamente.'
      );
    } finally {
      setProcesando(false);
    }
  };

  const rechazarDisclaimer = () => {
    // Exc.2: el rechazo bloquea la herramienta y devuelve al inicio.
    Alert.alert(
      'Entrevista no disponible',
      'Sin tu consentimiento no podemos usar la entrevista automatizada. Tu profesional tomará tus datos directamente en la consulta.',
      [{ text: 'Entendido', onPress: () => navigation.goBack() }]
    );
  };

  // ── CU23: responder y avanzar ──────────────────────────────────────────────
  const responder = async (valor) => {
    const nodo = arbol.nodos[nodoActual];
    const valorLimpio = typeof valor === 'string' ? valor.trim() : valor;

    if (nodo.tipo !== 'opciones' && !String(valorLimpio).length) {
      Alert.alert('Respuesta vacía', 'Escribe una respuesta para continuar.');
      return;
    }
    if (nodo.tipo === 'numero') {
      const numero = Number(valorLimpio);
      if (!Number.isFinite(numero) || numero < (nodo.minimo ?? 0) || numero > (nodo.maximo ?? 999)) {
        Alert.alert('Valor fuera de rango', `Ingresa un número entre ${nodo.minimo} y ${nodo.maximo}.`);
        return;
      }
    }

    const nuevas = { ...respuestasRef.current, [nodo.id]: valorLimpio };
    respuestasRef.current = nuevas;
    setRespuestas(nuevas);
    setEntradaTexto('');

    // Guardado parcial silencioso: si falla, la entrevista continúa igual y
    // el próximo guardado lo reintenta (Exc.4 del CU23).
    apiClient.put('/clinica/triaje/respuestas', { respuestas: nuevas }).catch(() => {});

    const siguiente =
      nodo.tipo === 'opciones'
        ? nodo.opciones.find((o) => o.valor === valorLimpio)?.siguiente
        : nodo.siguiente;

    if (siguiente === 'FIN') {
      completar(nuevas);
    } else {
      setNodoActual(siguiente);
    }
  };

  // ── CU24: completar e integrar ─────────────────────────────────────────────
  const completar = async (finales) => {
    setProcesando(true);
    setFase('cargando');
    try {
      const { data } = await apiClient.post('/clinica/triaje/completar', {
        respuestas: finales,
      });
      setVistaPrevia(data?.vista_previa || '');
      setFase('resumen');
    } catch (err) {
      const respuesta = err.response?.data;
      Alert.alert(
        'No se pudo integrar',
        respuesta?.mensaje || 'Tus respuestas siguen guardadas. Reintenta en unos minutos.',
        [
          { text: 'Reintentar', onPress: () => completar(finales) },
          { text: 'Salir', onPress: () => navigation.goBack() },
        ]
      );
      setFase('entrevista');
    } finally {
      setProcesando(false);
    }
  };

  // ── CU27: un ciclo nuevo exige aceptar de nuevo ────────────────────────────
  const rehacerTriaje = async () => {
    setProcesando(true);
    try {
      const respuesta = await apiClient.get('/clinica/triaje/disclaimer');
      setDisclaimer(respuesta.data);
      respuestasRef.current = {};
      setRespuestas({});
      setFase('disclaimer');
    } catch {
      Alert.alert('Error', 'No se pudo iniciar una nueva entrevista.');
    } finally {
      setProcesando(false);
    }
  };

  // ── Render por fase ────────────────────────────────────────────────────────

  if (fase === 'cargando') {
    return (
      <View style={estilos.centrado}>
        <ActivityIndicator size="large" color="#0052cc" />
      </View>
    );
  }

  if (fase === 'error') {
    return (
      <View style={estilos.centrado}>
        <ErrorRetry
          mensaje="No se pudo cargar la entrevista. Sin sus reglas no es posible continuar."
          onRetry={iniciar}
        />
      </View>
    );
  }

  if (fase === 'disclaimer') {
    return (
      <VistaConTeclado style={estilos.fondo} contentContainerStyle={estilos.contenido}>
        <Text style={estilos.titulo}>Antes de comenzar</Text>
        <View style={estilos.tarjetaLegal}>
          <Text style={estilos.textoLegal}>{disclaimer?.texto}</Text>
          <Text style={estilos.versionLegal}>Versión {disclaimer?.version}</Text>
        </View>
        <TouchableOpacity
          style={[estilos.botonPrimario, procesando && estilos.deshabilitado]}
          onPress={aceptarDisclaimer}
          disabled={procesando}
        >
          {procesando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={estilos.botonPrimarioTexto}>Acepto y quiero continuar</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={rechazarDisclaimer} disabled={procesando}>
          <Text style={estilos.enlaceRechazo}>No acepto</Text>
        </TouchableOpacity>
      </VistaConTeclado>
    );
  }

  if (fase === 'completado') {
    return (
      <View style={estilos.centrado}>
        <Text style={estilos.iconoGrande}>✅</Text>
        <Text style={estilos.tituloCentrado}>Ya completaste tu entrevista</Text>
        <Text style={estilos.textoCentrado}>
          Tus respuestas fueron integradas a tu ficha clínica
          {fechaCompletado
            ? ` el ${new Date(fechaCompletado).toLocaleDateString('es-CL')}`
            : ''}.
          Tu profesional las revisará en la consulta.
        </Text>
        <TouchableOpacity
          style={[estilos.botonPrimario, procesando && estilos.deshabilitado]}
          onPress={rehacerTriaje}
          disabled={procesando}
        >
          <Text style={estilos.botonPrimarioTexto}>Responder una nueva entrevista</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (fase === 'resumen') {
    return (
      <VistaConTeclado style={estilos.fondo} contentContainerStyle={estilos.contenido}>
        <Text style={estilos.iconoGrande}>🩺</Text>
        <Text style={estilos.tituloCentrado}>¡Entrevista completada!</Text>
        <Text style={estilos.textoCentrado}>
          Esto es lo que quedó registrado en tu ficha clínica:
        </Text>
        <View style={estilos.tarjetaResumen}>
          <Text style={estilos.textoResumen}>{vistaPrevia}</Text>
        </View>
        <TouchableOpacity style={estilos.botonPrimario} onPress={() => navigation.goBack()}>
          <Text style={estilos.botonPrimarioTexto}>Volver al inicio</Text>
        </TouchableOpacity>
      </VistaConTeclado>
    );
  }

  // fase === 'entrevista'
  const nodo = arbol?.nodos?.[nodoActual];
  if (!nodo) {
    return (
      <View style={estilos.centrado}>
        <ErrorRetry mensaje="La entrevista quedó en un estado inesperado." onRetry={iniciar} />
      </View>
    );
  }

  const totalRespondidas = Object.keys(respuestas).length;

  return (
    <VistaConTeclado style={estilos.fondo} contentContainerStyle={estilos.contenido}>
      <Text style={estilos.progreso}>Pregunta {totalRespondidas + 1}</Text>
      <Text style={estilos.pregunta}>{nodo.pregunta}</Text>

      {nodo.tipo === 'opciones' ? (
        nodo.opciones.map((opcion) => (
          <TouchableOpacity
            key={opcion.valor}
            style={estilos.opcion}
            onPress={() => responder(opcion.valor)}
          >
            <Text style={estilos.opcionTexto}>{opcion.etiqueta}</Text>
          </TouchableOpacity>
        ))
      ) : (
        <>
          <TextInput
            style={[estilos.entrada, nodo.tipo === 'texto' && estilos.entradaLarga]}
            placeholder={nodo.tipo === 'numero' ? `${nodo.minimo} a ${nodo.maximo}` : 'Escribe tu respuesta…'}
            keyboardType={nodo.tipo === 'numero' ? 'numeric' : 'default'}
            multiline={nodo.tipo === 'texto'}
            value={entradaTexto}
            onChangeText={setEntradaTexto}
          />
          <TouchableOpacity style={estilos.botonPrimario} onPress={() => responder(entradaTexto)}>
            <Text style={estilos.botonPrimarioTexto}>Continuar</Text>
          </TouchableOpacity>
        </>
      )}

      <Text style={estilos.notaAvance}>
        Tu avance se guarda automáticamente: puedes salir y retomar cuando quieras.
      </Text>
    </VistaConTeclado>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#f4f6f8' },
  contenido: { padding: 20, paddingBottom: 40 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  titulo: { fontSize: 22, fontWeight: 'bold', color: '#1c3d5a', marginBottom: 14 },
  tarjetaLegal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 18,
    marginBottom: 18,
  },
  textoLegal: { color: '#333', lineHeight: 21 },
  versionLegal: { color: '#999', fontSize: 12, marginTop: 12, textAlign: 'right' },
  enlaceRechazo: { color: '#d32f2f', textAlign: 'center', marginTop: 14, fontWeight: '600' },

  iconoGrande: { fontSize: 52, marginBottom: 10, textAlign: 'center' },
  tituloCentrado: { fontSize: 20, fontWeight: 'bold', color: '#1c3d5a', textAlign: 'center', marginBottom: 8 },
  textoCentrado: { color: '#555', textAlign: 'center', marginBottom: 18, lineHeight: 20 },

  tarjetaResumen: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    padding: 16,
    marginBottom: 18,
  },
  textoResumen: { color: '#333', fontFamily: 'monospace', fontSize: 12.5, lineHeight: 19 },

  progreso: { color: '#0052cc', fontWeight: 'bold', fontSize: 13, marginBottom: 6 },
  pregunta: { fontSize: 19, fontWeight: 'bold', color: '#1f2937', marginBottom: 18, lineHeight: 26 },
  opcion: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0052cc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  opcionTexto: { color: '#0052cc', fontWeight: '600', fontSize: 15 },
  entrada: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  entradaLarga: { minHeight: 100, textAlignVertical: 'top' },

  botonPrimario: {
    backgroundColor: '#0052cc',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  botonPrimarioTexto: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  deshabilitado: { opacity: 0.6 },
  notaAvance: { color: '#888', fontSize: 12, textAlign: 'center', marginTop: 16 },
});
