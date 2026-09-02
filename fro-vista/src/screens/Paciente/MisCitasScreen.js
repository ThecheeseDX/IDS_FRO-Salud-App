// Ruta: fro-vista/src/screens/Paciente/MisCitasScreen.js
//
// Vista única de gestión de citas del paciente: muestra sus horas agendadas y
// concentra la acción de reservar en un botón flotante que abre el buscador.
// Reemplaza el flujo separado de agendamiento/búsqueda por uno continuo.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';

import apiClient from '../../api/client';
import DialogoMotivo from '../../components/DialogoMotivo';
import ErrorRetry from '../../components/ErrorRetry';
// Las horas de la base son hora de pared: se formatean sin convertir huso.
import { formatearFechaHora as formatearFecha } from '../../utils/fechas';
import { etiquetaModalidad, iconoModalidad } from '../../utils/modalidad';

// Estados desde los que el paciente todavía puede anular o mover la hora.
const ESTADOS_CANCELABLES = ['AGENDADA', 'CONFIRMADA'];

const COLOR_ESTADO = {
  AGENDADA: '#0052cc',
  CONFIRMADA: '#2e7d32',
  EN_CURSO: '#ef6c00',
  REALIZADA: '#555',
  CANCELADA: '#d32f2f',
  INASISTENCIA: '#d32f2f',
};

export default function MisCitasScreen({ navigation }) {
  const [citas, setCitas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [errorRed, setErrorRed] = useState(false);
  const [cancelandoId, setCancelandoId] = useState(null);

  const cargarCitas = useCallback(async (esRefresco = false) => {
    if (esRefresco) {
      setRefrescando(true);
    } else {
      setCargando(true);
    }
    setErrorRed(false);

    try {
      const { data } = await apiClient.get('/citas/mis-citas');
      setCitas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('ERROR MIS CITAS:', error?.response?.data || error.message);
      setErrorRed(true);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    cargarCitas();
  }, [cargarCitas]);

  // Al volver del buscador, la lista se actualiza con la hora recién reservada.
  useEffect(() => {
    const quitarListener = navigation.addListener('focus', () => cargarCitas(true));
    return quitarListener;
  }, [navigation, cargarCitas]);

  // CU22: cancelar exige un motivo, así que se pide en un diálogo propio.
  const [citaPorCancelar, setCitaPorCancelar] = useState(null);

  const cancelarCita = async (cita, motivo) => {
    setCitaPorCancelar(null);
    setCancelandoId(cita.cita_id);

    try {
      const { data } = await apiClient.post(`/citas/${cita.cita_id}/transicionar`, {
        evento: 'CANCELAR',
        motivo,
      });
      const aviso =
        data?.cupos_notificados > 0
          ? ` Se avisó a ${data.cupos_notificados} persona(s) en lista de espera.`
          : '';
      Alert.alert('Cita cancelada', `Tu hora fue liberada correctamente.${aviso}`);
      await cargarCitas(true);
    } catch (error) {
      const respuesta = error.response?.data;
      Alert.alert(
        'No se pudo cancelar',
        respuesta?.mensaje || respuesta?.error || 'Intenta nuevamente.'
      );
    } finally {
      setCancelandoId(null);
    }
  };

  // CU17: reprogramar = elegir un bloque nuevo en el buscador de horas.
  const reprogramarCita = (cita) => {
    navigation.navigate('BuscarCita', {
      reprogramacion: {
        cita_id: cita.cita_id,
        fecha_original: cita.fecha_hora_inicio,
      },
    });
  };

  const renderCita = ({ item }) => {
    const puedeCancelar = ESTADOS_CANCELABLES.includes(item.estado);
    const cancelando = cancelandoId === item.cita_id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.fecha}>{formatearFecha(item.fecha_hora_inicio)}</Text>
          <Text style={[styles.estado, { color: COLOR_ESTADO[item.estado] || '#555' }]}>
            {item.estado}
          </Text>
        </View>

        <Text style={styles.profesional}>
          Profesional: {item.nombre_profesional}
          {`  ·  ${iconoModalidad(item.modalidad)} ${etiquetaModalidad(item.modalidad)}`}
        </Text>

        {/* CU39/CU43: evidencia de la sesión (check-in GPS o teleconsulta) */}
        {['CONFIRMADA', 'EN_CURSO'].includes(item.estado) && (
          <TouchableOpacity
            style={styles.botonEvidencia}
            onPress={() =>
              navigation.navigate('EvidenciaSesion', {
                citaId: item.cita_id,
                modalidad: item.modalidad,
              })
            }
          >
            <Text style={styles.botonEvidenciaTexto}>🛰️ Evidencia de sesión</Text>
          </TouchableOpacity>
        )}

        {puedeCancelar && (
          <View style={styles.filaAcciones}>
            <TouchableOpacity
              style={styles.botonReprogramar}
              onPress={() => reprogramarCita(item)}
              disabled={cancelando}
            >
              <Text style={styles.botonReprogramarTexto}>Reprogramar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.botonCancelar, cancelando && styles.botonDeshabilitado]}
              onPress={() => setCitaPorCancelar(item)}
              disabled={cancelando}
            >
              <Text style={styles.botonCancelarTexto}>
                {cancelando ? 'Cancelando…' : 'Cancelar'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#0052cc" />
      </View>
    );
  }

  if (errorRed) {
    return (
      <View style={styles.centrado}>
        <ErrorRetry
          mensaje="No pudimos cargar tus citas. Revisa tu conexión."
          onRetry={() => cargarCitas(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <FlatList
        data={citas}
        keyExtractor={(item) => String(item.cita_id)}
        renderItem={renderCita}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => cargarCitas(true)}
            colors={['#0052cc']}
          />
        }
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.vacioIcono}>📅</Text>
            <Text style={styles.vacioTitulo}>Aún no tienes citas</Text>
            <Text style={styles.vacioTexto}>
              Usa el botón de abajo para buscar disponibilidad y reservar tu primera hora.
            </Text>
          </View>
        }
      />

      {/* Botón flotante: unifica buscar y agendar en un solo paso. */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('BuscarCita')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabTexto}>＋  Buscar y agendar</Text>
      </TouchableOpacity>

      {/* CU22: la cancelación requiere justificación */}
      <DialogoMotivo
        visible={citaPorCancelar !== null}
        titulo="Cancelar cita"
        descripcion={
          citaPorCancelar
            ? `Hora del ${formatearFecha(citaPorCancelar.fecha_hora_inicio)} con ${citaPorCancelar.nombre_profesional}. Indica el motivo de la cancelación:`
            : ''
        }
        etiquetaConfirmar="Cancelar cita"
        onConfirmar={(motivo) => cancelarCita(citaPorCancelar, motivo)}
        onCancelar={() => setCitaPorCancelar(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f4f6f8' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  lista: { padding: 16, paddingBottom: 96 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  fecha: { flex: 1, fontSize: 15, fontWeight: 'bold', color: '#333', textTransform: 'capitalize' },
  estado: { fontSize: 12, fontWeight: 'bold', marginLeft: 8 },
  profesional: { color: '#555' },

  filaAcciones: { flexDirection: 'row', gap: 10, marginTop: 12 },
  botonEvidencia: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#2e7d32',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  botonEvidenciaTexto: { color: '#2e7d32', fontWeight: 'bold' },
  botonReprogramar: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#0052cc',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  botonReprogramarTexto: { color: '#0052cc', fontWeight: 'bold' },
  botonCancelar: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d32f2f',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  botonDeshabilitado: { opacity: 0.6 },
  botonCancelarTexto: { color: '#d32f2f', fontWeight: 'bold' },

  vacio: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  vacioIcono: { fontSize: 48, marginBottom: 12 },
  vacioTitulo: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  vacioTexto: { color: '#666', textAlign: 'center' },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: '#0052cc',
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 30,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabTexto: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
