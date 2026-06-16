// Ruta: fro-vista/src/screens/Paciente/AgendamientoScreen.js
import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import apiClient from '../../api/client';
import ErrorRetry from '../../components/ErrorRetry';

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function proximaFecha(diaSemana) {
  const hoy  = new Date();
  const diff = (diaSemana - hoy.getDay() + 7) % 7 || 7;
  const fecha = new Date(hoy);
  fecha.setDate(hoy.getDate() + diff);
  return fecha.toISOString().split('T')[0];
}

// ─────────────────────────────────────────────
//  CU20 — Máquina de estados (espejo del backend)
// ─────────────────────────────────────────────
const COLOR_ESTADO = {
  AGENDADA:     '#F59E0B',
  CONFIRMADA:   '#3B82F6',
  EN_CURSO:     '#8B5CF6',
  REALIZADA:    '#10B981',
  CANCELADA:    '#EF4444',
  INASISTENCIA: '#6B7280',
};

const ESTADOS_TERMINALES = new Set(['REALIZADA', 'CANCELADA', 'INASISTENCIA']);

// Acciones disponibles por estado y rol
const ACCIONES_POR_ESTADO = {
  AGENDADA: [
    { label: 'Cancelar cita',          evento: 'CANCELAR',                 roles: ['Paciente', 'Profesional', 'Administrador'] },
    { label: 'Confirmar cita',          evento: 'CONFIRMAR',                roles: ['Profesional', 'Administrador'] },
  ],
  CONFIRMADA: [
    { label: 'Iniciar atención',        evento: 'INICIAR',                  roles: ['Profesional'] },
    { label: 'Registrar inasistencia',  evento: 'REGISTRAR_INASISTENCIA',   roles: ['Profesional', 'Administrador'] },
    { label: 'Cancelar cita',           evento: 'CANCELAR',                 roles: ['Paciente', 'Profesional', 'Administrador'] },
  ],
  EN_CURSO: [
    { label: 'Finalizar atención',      evento: 'FINALIZAR',                roles: ['Profesional'] },
  ],
};

// ─────────────────────────────────────────────
//  Sub-componente: Badge de estado
// ─────────────────────────────────────────────
const BadgeEstado = ({ estado }) => (
  <View style={[styles.badge, { backgroundColor: COLOR_ESTADO[estado] ?? '#9CA3AF' }]}>
    <Text style={styles.badgeTexto}>{estado}</Text>
  </View>
);

// ─────────────────────────────────────────────
//  Sub-componente: Panel CU20 dentro de una tarjeta de cita
// ─────────────────────────────────────────────
const PanelEstadoCita = ({ cita, rol, onTransicion }) => {
  const [loadingEvento, setLoadingEvento] = useState(null);
  const esTerminal = ESTADOS_TERMINALES.has(cita.estado);
  const acciones   = (ACCIONES_POR_ESTADO[cita.estado] ?? []).filter(a => a.roles.includes(rol));

  const handleAccion = async (evento) => {
    setLoadingEvento(evento);
    await onTransicion(cita.cita_id, evento);
    setLoadingEvento(null);
  };

  return (
    <View style={styles.panelEstado}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitulo}>Estado de la cita</Text>
        <BadgeEstado estado={cita.estado} />
      </View>

      {esTerminal ? (
        <Text style={styles.textoTerminal}>Estado final — sin acciones disponibles.</Text>
      ) : acciones.length === 0 ? (
        <Text style={styles.textoTerminal}>Sin acciones disponibles para tu rol.</Text>
      ) : (
        acciones.map(accion => (
          <TouchableOpacity
            key={accion.evento}
            style={[styles.botonAccion, loadingEvento !== null && styles.botonDeshabilitado]}
            onPress={() => handleAccion(accion.evento)}
            disabled={loadingEvento !== null}
          >
            {loadingEvento === accion.evento
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.botonAccionTexto}>{accion.label}</Text>
            }
          </TouchableOpacity>
        ))
      )}
    </View>
  );
};

// ─────────────────────────────────────────────
//  Pantalla principal
// ─────────────────────────────────────────────
export default function AgendamientoScreen({ navigation }) {
  const { userData } = useContext(AuthContext);
  const rol = userData?.rol ?? 'Paciente'; // 'Paciente' | 'Profesional' | 'Administrador'

  // ── Estado local ─────────────────────────────────────────────────────────
  const [profesionales,           setProfesionales]           = useState([]);
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState(null);
  const [bloques,                 setBloques]                 = useState([]);
  const [bloqueSeleccionado,      setBloqueSeleccionado]      = useState(null);
  const [citasActivas,            setCitasActivas]            = useState([]);   // CU20
  const [cargandoProfesionales,   setCargandoProfesionales]   = useState(true);
  const [cargandoBloques,         setCargandoBloques]         = useState(false);
  const [cargandoBloqueo,         setCargandoBloqueo]         = useState(false);
  const [cargandoCitas,           setCargandoCitas]           = useState(true); // CU20
  const [refreshingCitas,         setRefreshingCitas]         = useState(false);
  const [errorRed,                setErrorRed]                = useState(false);

  // ── CU15: Cargar profesionales ───────────────────────────────────────────
  const cargarProfesionales = async () => {
    setCargandoProfesionales(true);
    setErrorRed(false);
    try {
      const { data } = await apiClient.get('/citas/profesionales');
      setProfesionales(data);
    } catch {
      setErrorRed(true);
    } finally {
      setCargandoProfesionales(false);
    }
  };

  // ── CU20: Cargar citas del usuario para gestionar estados ────────────────
 const cargarCitasActivas = async (esPull = false) => {
  esPull ? setRefreshingCitas(true) : setCargandoCitas(true);
  try {
    const endpoint = rol === 'Paciente' ? '/citas/mis-citas' : '/citas/asignadas';
    const response = await apiClient.get(endpoint);
    
    // 1. Espiamos qué formato real está enviando el backend
    console.log(`[DEBUG] Respuesta de ${endpoint}:`, response.data);
    
    // 2. Protegemos la app por si el backend envuelve las citas en un objeto { data: [...] }
    const listaCitas = Array.isArray(response.data) 
      ? response.data 
      : (response.data?.data || []);
      
    setCitasActivas(listaCitas);
  } catch (error) {
    // 3. ¡Ya no más secretos! Si hay error de token o ruta, saltará aquí:
    console.error(`[ERROR] Falló cargarCitasActivas (${rol}):`, error.response?.data || error.message);
    Alert.alert('Error', 'No se pudieron sincronizar tus citas activas.');
  } finally {
    esPull ? setRefreshingCitas(false) : setCargandoCitas(false);
  }
};

  useEffect(() => {
    cargarProfesionales();
    cargarCitasActivas();
  }, []);

  // ── CU15: Seleccionar profesional ────────────────────────────────────────
  const seleccionarProfesional = async (profesional) => {
    setProfesionalSeleccionado(profesional);
    setBloqueSeleccionado(null);
    setCargandoBloques(true);
    try {
      const { data } = await apiClient.get(`/citas/disponibilidad/${profesional.profesional_id}`);
      setBloques(data);
    } catch {
      Alert.alert('Error', 'No se pudo cargar la disponibilidad del profesional.');
      setBloques([]);
    } finally {
      setCargandoBloques(false);
    }
  };

  // ── CU15: Bloquear horario ───────────────────────────────────────────────
  const confirmarBloqueo = () => {
    if (!bloqueSeleccionado) {
      Alert.alert('Error', 'Selecciona un bloque horario primero.');
      return;
    }
    Alert.alert(
      'Confirmar reserva',
      `¿Deseas reservar el ${DIAS[bloqueSeleccionado.dia_semana]} de ${bloqueSeleccionado.hora_inicio} a ${bloqueSeleccionado.hora_fin} con ${profesionalSeleccionado.nombres} ${profesionalSeleccionado.apellido_paterno}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: ejecutarBloqueo },
      ]
    );
  };

  const ejecutarBloqueo = async () => {
    setCargandoBloqueo(true);
    const fecha            = proximaFecha(parseInt(bloqueSeleccionado.dia_semana));
    const fecha_hora_inicio = `${fecha} ${bloqueSeleccionado.hora_inicio}`;
    const fecha_hora_fin    = `${fecha} ${bloqueSeleccionado.hora_fin}`;

    try {
      await apiClient.post('/citas/bloquear', {
        profesional_id: profesionalSeleccionado.profesional_id,
        sede_id: 1,
        fecha_hora_inicio,
        fecha_hora_fin,
      });

      Alert.alert(
        '¡Reserva exitosa!',
        `Tu cita ha sido agendada para el ${DIAS[bloqueSeleccionado.dia_semana]} ${fecha} de ${bloqueSeleccionado.hora_inicio} a ${bloqueSeleccionado.hora_fin}.`,
        [{ text: 'OK', onPress: () => { cargarCitasActivas(); navigation.goBack(); } }]
      );
    } catch (error) {
      const err = error.response?.data;
      if (error.response?.status === 401) {
        Alert.alert('Sesión expirada', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
        return;
      }
      if (err?.error === 'BLOQUE_OCUPADO') {
        Alert.alert('Horario no disponible', err.mensaje,
          [{ text: 'Elegir otro horario', onPress: () => setBloqueSeleccionado(null) }]);
        return;
      }
      if (!error.response) {
        Alert.alert('Sin conexión', 'Verifica tu conexión e intenta nuevamente.');
        return;
      }
      Alert.alert('Error', 'No se pudo completar la reserva. Intenta nuevamente.');
    } finally {
      setCargandoBloqueo(false);
    }
  };

  // ── CU20: Transicionar estado de una cita ────────────────────────────────
  const handleTransicion = async (cita_id, evento) => {
    try {
      const { data } = await apiClient.post(`/citas/${cita_id}/transicionar`, { evento });

      // Actualizar estado local sin recargar toda la lista
      setCitasActivas(prev =>
        prev.map(c => c.cita_id === cita_id ? { ...c, estado: data.nuevo_estado } : c)
      );
      Alert.alert('✅ Actualizado', `Estado cambiado a: ${data.nuevo_estado}`);

    } catch (error) {
      const code    = error.response?.data?.code;
      const mensaje = error.response?.data?.error;

      // Excepción 1 — estado terminal
      if (code === 'ESTADO_TERMINAL') {
        Alert.alert('⛔ Acción no permitida', mensaje);
        return;
      }
      // Excepción 2 — transición inválida
      if (code === 'TRANSICION_INVALIDA') {
        Alert.alert('⚠️ Transición no válida', mensaje);
        return;
      }
      // Excepción 3 — sin conexión: ofrecer re-sincronizar
      if (!error.response) {
        Alert.alert(
          '🌐 Sin conexión',
          'El cambio puede haberse guardado en el servidor. Desliza hacia abajo para sincronizar.',
          [{ text: 'Sincronizar ahora', onPress: () => sincronizarCita(cita_id) }]
        );
        return;
      }
      // Excepción 4 — fallo crítico de persistencia
      Alert.alert('🚨 Error crítico', 'No se pudo guardar el estado. Contacta a soporte técnico.');
    }
  };

  // CU20 Excepción 3 — re-sincronizar una sola cita
  const sincronizarCita = async (cita_id) => {
    try {
      const { data } = await apiClient.get(`/citas/${cita_id}/estado`);
      setCitasActivas(prev =>
        prev.map(c => c.cita_id === cita_id ? { ...c, estado: data.estado } : c)
      );
    } catch {
      Alert.alert('Error', 'No se pudo sincronizar. Intenta más tarde.');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (cargandoProfesionales) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#0052cc" />
        <Text style={styles.cargandoTexto}>Cargando...</Text>
      </View>
    );
  }

  if (errorRed) {
    return <ErrorRetry mensaje="No se pudo conectar con el servidor." onRetry={cargarProfesionales} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshingCitas}
          onRefresh={() => cargarCitasActivas(true)}
          colors={['#0052cc']}
        />
      }
    >
      <Text style={styles.titulo}>Gestión de Citas</Text>

      {/* ══════════════════════════════════════════════════════
          CU20 — Panel de estados de citas existentes
      ══════════════════════════════════════════════════════ */}
      <Text style={styles.seccionTitulo}>Mis citas</Text>
      <Text style={styles.seccionSubtitulo}>Desliza hacia abajo para sincronizar</Text>

      {cargandoCitas ? (
        <ActivityIndicator size="small" color="#0052cc" style={{ marginVertical: 12 }} />
      ) : citasActivas.length === 0 ? (
        <Text style={styles.sinBloques}>No tienes citas registradas aún.</Text>
      ) : (
        citasActivas.map(cita => (
          <View key={cita.cita_id} style={styles.tarjeta}>
            <Text style={styles.tarjetaNombre}>
              Cita #{cita.cita_id} · {cita.fecha_hora_inicio?.slice(0, 16).replace('T', ' ')}
            </Text>
            <Text style={styles.tarjetaDetalle}>
              👤 {cita.nombre_paciente ?? 'Paciente'}
              {cita.nombre_profesional ? `  ·  🩺 ${cita.nombre_profesional}` : ''}
            </Text>
            <PanelEstadoCita cita={cita} rol={rol} onTransicion={handleTransicion} />
          </View>
        ))
      )}

      {/* ══════════════════════════════════════════════════════
          CU15 — Agendar nueva cita
      ══════════════════════════════════════════════════════ */}
      <Text style={[styles.seccionTitulo, { marginTop: 28 }]}>Agendar nueva cita</Text>

      {/* Paso 1 — Seleccionar profesional */}
      <Text style={styles.paso}>Paso 1 — Selecciona un profesional</Text>
      {profesionales.map((prof) => (
        <TouchableOpacity
          key={prof.profesional_id}
          style={[
            styles.tarjeta,
            profesionalSeleccionado?.profesional_id === prof.profesional_id && styles.tarjetaSeleccionada,
          ]}
          onPress={() => seleccionarProfesional(prof)}
        >
          <Text style={styles.tarjetaNombre}>{prof.nombres} {prof.apellido_paterno}</Text>
          <Text style={styles.tarjetaDetalle}>{prof.especialidad}</Text>
          <Text style={styles.tarjetaDetalle}>⭐ {prof.calificacion_promedio}</Text>
        </TouchableOpacity>
      ))}

      {/* Paso 2 — Seleccionar bloque horario */}
      {profesionalSeleccionado && (
        <>
          <Text style={styles.paso}>Paso 2 — Selecciona un bloque horario</Text>
          {cargandoBloques ? (
            <ActivityIndicator size="small" color="#0052cc" style={{ marginTop: 10 }} />
          ) : bloques.length === 0 ? (
            <Text style={styles.sinBloques}>No hay bloques disponibles.</Text>
          ) : (
            bloques.map((bloque, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.bloque, bloqueSeleccionado === bloque && styles.bloqueSeleccionado]}
                onPress={() => setBloqueSeleccionado(bloque)}
              >
                <Text style={styles.bloqueDia}>{DIAS[bloque.dia_semana]}</Text>
                <Text style={styles.bloqueHora}>{bloque.hora_inicio} — {bloque.hora_fin}</Text>
              </TouchableOpacity>
            ))
          )}
        </>
      )}

      {/* Paso 3 — Confirmar */}
      {bloqueSeleccionado && (
        <TouchableOpacity
          style={[styles.botonConfirmar, cargandoBloqueo && styles.botonDeshabilitado]}
          onPress={confirmarBloqueo}
          disabled={cargandoBloqueo}
        >
          {cargandoBloqueo
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.botonTexto}>Confirmar Reserva</Text>
          }
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
//  Estilos
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container:        { flex: 1, padding: 20, backgroundColor: '#f4f6f8' },
  centrado:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cargandoTexto:    { marginTop: 10, color: '#666' },
  titulo:           { fontSize: 24, fontWeight: 'bold', color: '#0052cc', marginBottom: 8 },
  seccionTitulo:    { fontSize: 18, fontWeight: '700', color: '#1c3d5a', marginBottom: 2 },
  seccionSubtitulo: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },
  paso:             { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 20, marginBottom: 10 },

  // Tarjetas
  tarjeta: {
    backgroundColor: '#fff', padding: 16, borderRadius: 10,
    borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 10,
  },
  tarjetaSeleccionada: { borderColor: '#0052cc', borderWidth: 2, backgroundColor: '#e8f0fe' },
  tarjetaNombre:       { fontSize: 16, fontWeight: 'bold', color: '#1c3d5a' },
  tarjetaDetalle:      { fontSize: 14, color: '#666', marginTop: 2 },

  // Bloques horarios
  bloque: {
    backgroundColor: '#fff', padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  bloqueSeleccionado: { borderColor: '#2e7d32', borderWidth: 2, backgroundColor: '#e8f5e9' },
  bloqueDia:          { fontSize: 15, fontWeight: 'bold', color: '#333' },
  bloqueHora:         { fontSize: 14, color: '#0052cc' },
  sinBloques:         { color: '#999', fontStyle: 'italic', textAlign: 'center', marginTop: 10 },

  // Botón confirmar reserva
  botonConfirmar: {
    backgroundColor: '#0052cc', padding: 16,
    borderRadius: 12, alignItems: 'center', marginTop: 24,
  },
  botonDeshabilitado: { opacity: 0.6 },
  botonTexto:         { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // ── CU20 ──
  panelEstado: {
    marginTop: 12,
    backgroundColor: '#F8FAFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  panelHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  panelTitulo:    { fontSize: 13, fontWeight: '600', color: '#374151' },
  badge:          { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeTexto:     { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  textoTerminal:  { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
  botonAccion: {
    backgroundColor: '#0052cc', borderRadius: 8,
    paddingVertical: 9, alignItems: 'center', marginTop: 6,
  },
  botonAccionTexto: { color: '#fff', fontSize: 14, fontWeight: '600' },
});