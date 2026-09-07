import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator
} from 'react-native';
import apiClient from '../../../api/client';
import VistaConTeclado from '../../../components/VistaConTeclado';
import { formatearFecha } from '../../../utils/fechas';
import { colores, piezas, tipografia } from '../../../theme';

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
              ? <ActivityIndicator color={colores.superficie} />
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
                style={[styles.boton, { backgroundColor: colores.advertencia, marginTop: 15 }]} 
                onPress={iniciarAtencion} 
                disabled={cargandoEvolucion}
              >
                {cargandoEvolucion
                  ? <ActivityIndicator color={colores.superficie} />
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
            style={[styles.boton, { backgroundColor: colores.exito }]}
            onPress={crearEpisodio}
            disabled={cargandoCreacion}
          >
            {cargandoCreacion
              ? <ActivityIndicator color={colores.superficie} />
              : <Text style={styles.botonTexto}>Crear Episodio</Text>}
          </TouchableOpacity>
        </View>
      </VistaConTeclado>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  title: {
    ...tipografia.titulo,
    color: colores.textoTitulo,
    marginBottom: 4,
  },
  subtitulo: {
    ...tipografia.meta,
    color: colores.textoSuave,
    marginBottom: 24,
  },
  seccion: {
    ...tipografia.micro,
    color: colores.textoTenue,
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  seccionTitulo: {
    ...tipografia.micro,
    color: colores.textoTenue,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  input: {
    ...piezas.campo,
    marginBottom: 12,
  },
  boton: {
    ...piezas.botonPrimario,
    alignItems: 'center',
  },
  botonTexto: {
    ...tipografia.cuerpoFuerte,
    color: colores.textoInverso,
  },
  resultado: {
    ...piezas.tarjeta,
    marginTop: 16,
  },
  resultadoTitulo: { ...tipografia.subtitulo, color: colores.textoTitulo, marginBottom: 8 },
  resultadoCampo: { ...tipografia.cuerpo, color: colores.texto, marginBottom: 4 }
});