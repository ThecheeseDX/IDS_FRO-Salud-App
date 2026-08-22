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
import ErrorRetry from '../../components/ErrorRetry';

// Estados desde los que el paciente todavía puede anular la hora (CU20).
const ESTADOS_CANCELABLES = ['AGENDADA', 'CONFIRMADA'];

const COLOR_ESTADO = {
  AGENDADA: '#0052cc',
  CONFIRMADA: '#2e7d32',
  EN_CURSO: '#ef6c00',
  REALIZADA: '#555',
  CANCELADA: '#d32f2f',
  INASISTENCIA: '#d32f2f',
};

function formatearFecha(valor) {
  if (!valor) return 'Fecha no informada';

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);

  return fecha.toLocaleString('es-CL', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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

  const confirmarCancelacion = (cita) => {
    Alert.alert(
      'Cancelar cita',
      `¿Deseas cancelar tu hora del ${formatearFecha(cita.fecha_hora_inicio)} con ${cita.nombre_profesional}?`,
      [
        { text: 'Volver', style: 'cancel' },
        { text: 'Cancelar cita', style: 'destructive', onPress: () => cancelarCita(cita) },
      ]
    );
  };

  const cancelarCita = async (cita) => {
    setCancelandoId(cita.cita_id);

    try {
      await apiClient.post(`/citas/${cita.cita_id}/transicionar`, { evento: 'CANCELAR' });
      Alert.alert('Cita cancelada', 'Tu hora fue liberada correctamente.');
      await cargarCitas(true);
    } catch (error) {
      const mensaje =
        error.response?.data?.error || 'No se pudo cancelar la cita. Intenta nuevamente.';
      Alert.alert('No se pudo cancelar', mensaje);
    } finally {
      setCancelandoId(null);
    }
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

        <Text style={styles.profesional}>Profesional: {item.nombre_profesional}</Text>

        {puedeCancelar && (
          <TouchableOpacity
            style={[styles.botonCancelar, cancelando && styles.botonDeshabilitado]}
            onPress={() => confirmarCancelacion(item)}
            disabled={cancelando}
          >
            <Text style={styles.botonCancelarTexto}>
              {cancelando ? 'Cancelando…' : 'Cancelar cita'}
            </Text>
          </TouchableOpacity>
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

  botonCancelar: {
    marginTop: 12,
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
