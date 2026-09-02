import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator
} from 'react-native';
import apiClient from '../../../api/client';
import VistaConTeclado from '../../../components/VistaConTeclado';
import { formatearFecha } from '../../../utils/fechas';

// ─────────────────────────────────────────────────────────────────────────────
// EpisodioScreen — CU13
// El token JWT se inyecta automáticamente por el interceptor de client.js
// Cada petición dispara auditarAccesoClinico en el backend
// ─────────────────────────────────────────────────────────────────────────────
export default function EpisodioScreen() {
  // ─ Estado para BUSCAR episodio ──────────────────────────────────────────
  const [episodioId, setEpisodioId] = useState('');
  const [episodio, setEpisodio] = useState(null);
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);

  // ─ Estado para el botón de iniciar atención
  const [cargandoEvolucion, setCargandoEvolucion] = useState(false);

  // ─ Estado para CREAR episodio ───────────────────────────────────────────
  const [nuevoEpisodio, setNuevoEpisodio] = useState({
    motivo_consulta: '',
    paciente_id: '',
    profesional_id: ''
  });
  const [cargandoCreacion, setCargandoCreacion] = useState(false);

  // ─ LECTURA: GET /api/clinica/episodio/:id ────────────────────────────────
  // ─ LECTURA_EPISODIO_CLINICO en Bitacora_Auditoria
  const buscarEpisodio = async () => {
    if (!episodioId) {
      Alert.alert('Error', 'Ingresa el ID del episodio.');
      return;
    }
    setCargandoBusqueda(true);
    setEpisodio(null);
    try {
      const { data } = await apiClient.get(`/clinica/episodio/${episodioId}`);
      setEpisodio(data);
    } catch (error) {
      const err = error.response?.data;
      if (error.response?.status === 401) {
        Alert.alert('Sesión inválida', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
      } else if (error.response?.status === 403) {
        Alert.alert('Acceso denegado', err?.error || 'No tienes permisos para esta acción.');
      } else if (err?.error === 'FALLO_BITACORA') {
        Alert.alert('Error de auditoría', err.mensaje);
      } else {
        Alert.alert('Error', err?.error || 'No se pudo obtener el episodio.');
      }
    } finally {
      setCargandoBusqueda(false);
    }
  };

  // ─ INICIAR ATENCIÓN (CREAR EVOLUCIÓN EN BLANCO) ──────────────────────────
  const iniciarAtencion = async () => {
    setCargandoEvolucion(true);
    try {
      const { data } = await apiClient.post(`/clinica/episodio/${episodio.episodio_clinico_id}/evolucion`);
      Alert.alert(
        'Atención Iniciada',
        `${data.mensaje}\n\nEl ID de tu nueva Evolución es: ${data.evolucion_clinica_id}\n(Anótalo para registrar avances o firmarlo)`
      );
    } catch (error) {
      const err = error.response?.data;
      Alert.alert('Error', err?.error || 'No se pudo iniciar la sesión clínica.');
    } finally {
      setCargandoEvolucion(false);
    }
  };

  // ─ CREACIÓN: POST /api/clinica/episodio ──────────────────────────────────
  // Dispara: CREACION_EPISODIO_CLINICO en Bitacora_Auditoria
  const crearEpisodio = async () => {
    const { motivo_consulta, paciente_id, profesional_id } = nuevoEpisodio;
    if (!motivo_consulta || !paciente_id || !profesional_id) {
      Alert.alert('Error', 'Todos los campos son requeridos.');
      return;
    }
    setCargandoCreacion(true);
    try {
      const { data } = await apiClient.post('/clinica/episodio', {
        motivo_consulta,
        paciente_id: parseInt(paciente_id),
        profesional_id: parseInt(profesional_id)
      });
      Alert.alert('Éxito', data.mensaje);
      setNuevoEpisodio({ motivo_consulta: '', paciente_id: '', profesional_id: '' });
    } catch (error) {
      const err = error.response?.data;
      if (error.response?.status === 401) {
        Alert.alert('Sesión inválida', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
      } else if (error.response?.status === 403) {
        Alert.alert('Acceso denegado', err?.error || 'No tienes permisos para esta acción.');
      } else if (err?.error === 'FALLO_BITACORA') {
        Alert.alert('Error de auditoría', err.mensaje);
      } else {
        Alert.alert('Error', err?.error || 'No se pudo crear el episodio.');
      }
    } finally {
      setCargandoCreacion(false);
    }
  };

  return (
    <VistaConTeclado style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.title}>Episodios Clínicos</Text>
        <Text style={styles.subtitulo}>Cada acción queda registrada en la bitácora de auditoría.</Text>

        {/* ── BUSCAR EPISODIO ─────────────────────────────────────────────── */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Consultar Episodio</Text>
          <TextInput
            style={styles.input}
            placeholder="ID del episodio"
            keyboardType="numeric"
            value={episodioId}
            onChangeText={setEpisodioId}
          />
          <TouchableOpacity style={styles.boton} onPress={buscarEpisodio} disabled={cargandoBusqueda}>
            {cargandoBusqueda
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.botonTexto}>Buscar</Text>}
          </TouchableOpacity>
          
          {episodio && (
            <View style={styles.resultado}>
              <Text style={styles.resultadoTitulo}>Episodio #{episodio.episodio_clinico_id}</Text>
              <Text style={styles.resultadoCampo}>Motivo: {episodio.motivo_consulta}</Text>
              <Text style={styles.resultadoCampo}>Estado: {episodio.estado ?? 'Sin estado'}</Text>
              <Text style={styles.resultadoCampo}>Inicio: {formatearFecha(episodio.fecha_inicio)}</Text>
              
              {/* NUEVO BOTÓN PARA CREAR LA EVOLUCIÓN */}
              <TouchableOpacity 
                style={[styles.boton, { backgroundColor: '#f57c00', marginTop: 15 }]} 
                onPress={iniciarAtencion} 
                disabled={cargandoEvolucion}
              >
                {cargandoEvolucion
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.botonTexto}>+ Iniciar Nueva Atención</Text>}
              </TouchableOpacity>

            </View>
          )}
        </View>

        {/* ── CREAR EPISODIO ──────────────────────────────────────────────── */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Crear Episodio</Text>
          <TextInput
            style={styles.input}
            placeholder="Motivo de consulta"
            value={nuevoEpisodio.motivo_consulta}
            onChangeText={(v) => setNuevoEpisodio({ ...nuevoEpisodio, motivo_consulta: v })}
          />
          <TextInput
            style={styles.input}
            placeholder="ID del paciente"
            keyboardType="numeric"
            value={nuevoEpisodio.paciente_id}
            onChangeText={(v) => setNuevoEpisodio({ ...nuevoEpisodio, paciente_id: v })}
          />
          <TextInput
            style={styles.input}
            placeholder="ID del profesional"
            keyboardType="numeric"
            value={nuevoEpisodio.profesional_id}
            onChangeText={(v) => setNuevoEpisodio({ ...nuevoEpisodio, profesional_id: v })}
          />
          <TouchableOpacity
            style={[styles.boton, { backgroundColor: '#2e7d32' }]}
            onPress={crearEpisodio}
            disabled={cargandoCreacion}
          >
            {cargandoCreacion
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.botonTexto}>Crear Episodio</Text>}
          </TouchableOpacity>
        </View>
      </VistaConTeclado>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1c3d5a', marginBottom: 4 },
  subtitulo: { fontSize: 13, color: '#888', marginBottom: 24, fontStyle: 'italic' },
  seccion: {
    backgroundColor: '#fff', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 20
  },
  seccionTitulo: { fontSize: 17, fontWeight: 'bold', color: '#2e7d32', marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: '#ccc', backgroundColor: '#f9f9f9',
    padding: 12, borderRadius: 10, marginBottom: 12, fontSize: 15
  },
  boton: { backgroundColor: '#0052cc', padding: 14, borderRadius: 10, alignItems: 'center' },
  botonTexto: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  resultado: {
    marginTop: 16, backgroundColor: '#e8f5e9',
    padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#c8e6c9'
  },
  resultadoTitulo: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32', marginBottom: 8 },
  resultadoCampo: { fontSize: 14, color: '#444', marginBottom: 4 }
});