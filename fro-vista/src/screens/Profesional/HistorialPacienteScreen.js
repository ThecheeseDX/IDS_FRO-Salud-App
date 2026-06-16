// Ruta: fro-vista/src/screens/Profesional/HistorialPacienteScreen.js

import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,          // 1. Agregamos Alert para las excepciones
  RefreshControl, // 1. Agregamos RefreshControl para latencia de red
} from 'react-native';

// Importamos tanto el cliente base (apiClient) para los POST como el lector de historial
import apiClient, { getHistorialPaciente } from '../../api/client';
import { AuthContext } from '../../context/AuthContext';

export default function HistorialPacienteScreen({ route, navigation }) {
  const { pacienteId, nombrePaciente } = route.params;
  const { userData } = useContext(AuthContext);

  const [historial, setHistorial] = useState([]);
  const [episodios, setEpisodios] = useState([]);
  const [evoluciones, setEvoluciones] = useState([]);
  const [paciente, setPaciente] = useState(null);
  const [mensajeMultimedia, setMensajeMultimedia] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // 2. Estado para el pull-to-refresh
  const [error, setError] = useState('');

  // Modificamos para aceptar la bandera de actualización por red
  const cargarHistorial = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const data = await getHistorialPaciente(
        pacienteId,
        userData?.usuario_id
      );

      if (data.ok) {
        setPaciente(data.paciente || null);
        setHistorial(data.historial || []);
        setEpisodios(data.episodios || []);
        setEvoluciones(data.evoluciones || []);
        setMensajeMultimedia(data.mensajeMultimedia || '');
      } else {
        setError(data.message || 'Error al recuperar historial');
      }
    } catch (err) {
      console.error('ERROR HISTORIAL:', err?.response?.data || err.message);
      setError(
        err?.response?.data?.message ||
          'Error de conexión con la base de datos'
      );
    } finally {
      setLoading(false);
      setRefreshing(false); // Apagamos el indicador de refresco
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  // ⚡ FUNCIÓN MÁGICA: Controla y dispara las 4 Excepciones solicitadas
  const modificarEstadoCita = async (citaId, estadoActual, evento) => {
    
    // ❌ EXCEPCIÓN 1: Bloqueo de interacción sobre estados terminales
    // Validamos localmente si ya está cerrada antes de ir al servidor
    const estadosTerminales = ['Realizada', 'Cancelada', 'Inasistencia'];
    if (estadosTerminales.includes(estadoActual)) {
      Alert.alert(
        "Acción no permitida",
        "El Sistema bloquea la interacción debido a que la cita ya se encuentra en un estado terminal. Por favor, selecciona una cita activa para operar sobre ella."
      );
      return; 
    }

    try {
      // Intentamos persistir la transición en el endpoint correspondiente
      const response = await apiClient.post(`/citas/${citaId}/transicionar`, { evento });
      
      if (response.data.ok || response.status === 200) {
        Alert.alert("Éxito", "Estado de la cita actualizado con éxito.");
        cargarHistorial(false); // Sincroniza la vista al tiro
      }
    } catch (err) {
      if (err.response) {
        const { status, data } = err.response;

        // ❌ EXCEPCIÓN 2: Reglas de negocio inválidas (Transición incorrecta de flujo)
        if (status === 422 || data.code === 'TRANSICION_INVALIDA') {
          Alert.alert(
            "Error de validación de flujo lógico",
            "El evento de entrada no cumple con las reglas de negocio necesarias para la transición solicitada. El Sistema detiene el cambio de fase.\n\nPor favor, verifica los requisitos previos necesarios para habilitar dicho estado."
          );
        } 
        // ❌ EXCEPCIÓN 4: Fallo crítico de persistencia en la Base de Datos (Timeout o Crash)
        else if (status === 500 || data.code === 'FALLO_PERSISTENCIA' || data.code === 'PERSIST_FAIL') {
          Alert.alert(
            "Alerta de Error Crítica",
            "El motor de base de datos no logró guardar el nuevo estado debido a un fallo de persistencia o tiempo de espera agotado. El Sistema generó un reporte técnico automático.\n\nPor favor, contacta al soporte técnico para informar sobre la falla en el registro del estado."
          );
        } else {
          Alert.alert("Error", data.message || "No se pudo cambiar el estado.");
        }
      } else {
        // ❌ EXCEPCIÓN 3: Latencia crítica de red o desconexión temporal
        Alert.alert(
          "Sincronización en curso",
          "La latencia de red impide visualizar el cambio de estado en la interfaz de manera inmediata.\n\nEl Sistema procesará la transacción exitosamente en el servidor. Por favor, refresca la aplicación para sincronizar la vista con los datos del controlador.",
          [{ text: "Refrescar Ahora", onPress: () => cargarHistorial(true) }]
        );
      }
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'No informado';

    return new Date(fecha).toLocaleString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView 
      style={styles.container}
      // Implementamos el control de arrastrar para actualizar (Excepción 3)
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => cargarHistorial(true)} colors={['#2563eb']} />
      }
    >
      <Text style={styles.titulo}>Ficha Clínica Electrónica</Text>
      <Text style={styles.subtitulo}>Historial consolidado del paciente</Text>

      <View style={styles.infoPaciente}>
        <Text style={styles.infoTitulo}>Paciente</Text>
        <Text>Nombre: {paciente?.nombre_completo || nombrePaciente}</Text>
        <Text>ID paciente: {pacienteId}</Text>
        <Text>RUT: {paciente?.rut || 'No informado'}</Text>
        <Text>Sexo clínico: {paciente?.sexo_clinico || 'No informado'}</Text>
      </View>

      <TouchableOpacity
        style={styles.botonAnamnesis}
        onPress={() =>
          navigation.navigate('Anamnesis', {
            pacienteId,
            nombrePaciente,
          })
        }
      >
        <Text style={styles.botonAnamnesisTexto}>📋 Registrar Anamnesis</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" style={styles.loading} color="#2563eb" />}

      {error !== '' && (
        <View style={styles.errorContainer}>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity style={styles.boton} onPress={() => cargarHistorial(false)}>
            <Text style={styles.botonTexto}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && error === '' && (
        <>
          {mensajeMultimedia !== '' && (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Multimedia no disponible</Text>
              <Text style={styles.warningText}>{mensajeMultimedia}</Text>
            </View>
          )}

          <Text style={styles.seccionTitulo}>Atenciones / Citas</Text>

          {historial.length === 0 ? (
            <Text style={styles.sinResultados}>Sin atenciones registradas</Text>
          ) : (
            historial.map((item) => (
              <View key={item.cita_id} style={styles.card}>
                <Text style={styles.fecha}>
                  {formatearFecha(item.fecha_hora_inicio)}
                </Text>
                <Text style={{ fontWeight: '500' }}>Estado: {item.estado}</Text>
                <Text>Profesional: {item.profesional}</Text>
                <Text>Especialidad: {item.especialidad}</Text>
                <Text>Modalidad: {item.tipo_sede}</Text>

                {/* 🌟 NUEVO: PANEL DE ACCIONES DIRECTAS EN LA CITA */}
                <View style={styles.containerAcciones}>
                  <TouchableOpacity 
                    style={[styles.botonAccion, { backgroundColor: '#2563eb' }]}
                    onPress={() => modificarEstadoCita(item.cita_id, item.estado, 'INICIAR')}
                  >
                    <Text style={styles.textoBotonAccion}>▶️ Iniciar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.botonAccion, { backgroundColor: '#16a34a' }]}
                    onPress={() => modificarEstadoCita(item.cita_id, item.estado, 'FINALIZAR')}
                  >
                    <Text style={styles.textoBotonAccion}>✅ Finalizar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.botonAccion, { backgroundColor: '#dc2626' }]}
                    onPress={() => modificarEstadoCita(item.cita_id, item.estado, 'CANCELAR')}
                  >
                    <Text style={styles.textoBotonAccion}>❌ Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <Text style={styles.seccionTitulo}>Episodios Clínicos</Text>

          {episodios.length === 0 ? (
            <Text style={styles.sinResultados}>Sin episodios registrados</Text>
          ) : (
            episodios.map((item) => (
              <View key={item.episodio_clinico_id} style={styles.cardEpisodio}>
                <Text style={styles.fecha}>
                  Episodio #{item.episodio_clinico_id}
                </Text>
                <Text>Motivo: {item.motivo_consulta}</Text>
                <Text>Estado: {item.estado || 'No informado'}</Text>
                <Text>Inicio: {formatearFecha(item.fecha_inicio)}</Text>
                <Text>Término: {formatearFecha(item.fecha_terminado)}</Text>
              </View>
            ))
          )}

          <Text style={styles.seccionTitulo}>Evoluciones Clínicas</Text>

          {evoluciones.length === 0 ? (
            <Text style={styles.sinResultados}>
              Sin evoluciones clínicas registradas
            </Text>
          ) : (
            evoluciones.map((item) => (
              <View key={item.evolucion_clinica_id} style={styles.cardEvolucion}>
                <Text style={styles.fecha}>
                  Evolución #{item.evolucion_clinica_id}
                </Text>
                <Text>Episodio: #{item.episodio_clinico_id}</Text>
                <Text>Motivo episodio: {item.motivo_consulta}</Text>
                <Text>
                  Porcentaje objetivo:{' '}
                  {item.porcentaje_objetivo ?? 'No informado'}%
                </Text>
                <Text>
                  Respuesta fisiológica:{' '}
                  {item.respuesta_fisiologica || 'No informado'}
                </Text>
                <Text>
                  Técnicas aplicadas:{' '}
                  {item.tecnicas_aplicadas || 'No informado'}
                </Text>
                <Text>Inalterable: {item.inalterable === 1 ? 'Sí' : 'No'}</Text>
                <Text>
                  Firma digital:{' '}
                  {item.firma_digital ? 'Registrada' : 'No registrada'}
                </Text>
                <Text>Hora firma: {formatearFecha(item.hora_firma_digital)}</Text>
              </View>
            ))
          )}
        </>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1f2937',
  },
  subtitulo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  infoPaciente: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
  },
  infoTitulo: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 6,
    color: '#2563eb',
  },
  loading: { marginTop: 20 },
  seccionTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 18,
    marginBottom: 10,
    color: '#111827',
  },
  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  cardEpisodio: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#eff6ff',
  },
  cardEvolucion: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f0fdf4',
  },
  fecha: { fontWeight: 'bold', marginBottom: 6 },
  errorContainer: { marginTop: 20 },
  error: { color: 'red', marginBottom: 10 },
  boton: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  botonTexto: { color: '#fff', fontWeight: 'bold' },
  botonAnamnesis: {
    backgroundColor: '#2e7d32',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  botonAnamnesisTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  warningBox: {
    backgroundColor: '#fff7ed',
    borderLeftWidth: 4,
    borderLeftColor: '#f97316',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  warningTitle: {
    fontWeight: 'bold',
    color: '#c2410c',
    marginBottom: 4,
  },
  warningText: { color: '#7c2d12' },
  sinResultados: { color: '#666', marginBottom: 12 },
  
  // Estilos añadidos para el panel de acciones
  containerAcciones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  botonAccion: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  textoBotonAccion: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});