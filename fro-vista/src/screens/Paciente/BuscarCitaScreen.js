import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import apiClient from '../../api/client';
import { AuthContext } from '../../context/AuthContext';
import ErrorRetry from '../../components/ErrorRetry';

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// ─── CU14: Motor de búsqueda de citas
// ─── CU15: Bloqueo síncrono del horario seleccionado
export default function BuscarCitaScreen({ navigation }) {
  const { userData } = useContext(AuthContext);

  // ── CU14: filtros de búsqueda ─────────────────────────────────────────────
  const [especialidades, setEspecialidades] = useState([]);
  const [especialidadId, setEspecialidadId] = useState('');
  const [tipoSede, setTipoSede] = useState('ONLINE');
  const [fechaSeleccionada, setFechaSeleccionada] = useState('');
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [disponibilidad, setDisponibilidad] = useState([]);
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);
  const [errorEspecialidades, setErrorEspecialidades] = useState(false);

  // ── CU15: bloqueo del horario ─────────────────────────────────────────────
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState(null);
  const [cargandoBloqueo, setCargandoBloqueo] = useState(false);

  useEffect(() => {
    cargarEspecialidades();
  }, []);

  const formatearFecha = (fecha) => {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // ── CU14 — Excepción 1: fallo al cargar especialidades ───────────────────
  const cargarEspecialidades = async () => {
    setErrorEspecialidades(false);
    try {
      const response = await apiClient.get('/citas/especialidades');
      const data = response.data.data || [];
      setEspecialidades(data);
      if (data.length > 0) {
        setEspecialidadId(String(data[0].especialidad_id));
      }
    } catch (error) {
      // Excepción 1: el servicio de catálogos no carga las especialidades
      setErrorEspecialidades(true);
    }
  };

  // ── CU14 — Buscar disponibilidad (Excepción 2 si no hay resultados) ───────
  const buscarDisponibilidad = async () => {
    if (!especialidadId || !tipoSede || !fechaSeleccionada) {
      Alert.alert('Campos incompletos', 'Debe seleccionar especialidad, modalidad y fecha.');
      return;
    }
    setBloqueSeleccionado(null);
    setCargandoBusqueda(true);
    try {
      const response = await apiClient.get('/citas/disponibilidad', {
        params: {
          especialidad_id: especialidadId,
          tipo_sede: tipoSede,
          fecha: fechaSeleccionada,
        },
      });
      setDisponibilidad(response.data.data || []);
      // Excepción 2 se muestra visualmente cuando disponibilidad.length === 0
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudo obtener la disponibilidad.'
      );
    } finally {
      setCargandoBusqueda(false);
    }
  };

  // ── CU14 → CU15: el paciente selecciona un bloque y confirma ─────────────
  const seleccionarBloque = (item) => {
    setBloqueSeleccionado(item);
  };

  // ── CU15: confirmar y bloquear el horario ─────────────────────────────────
  const confirmarAgendamiento = () => {
    if (!bloqueSeleccionado) return;

    const { nombres, apellido_paterno, apellido_materno, fecha, hora_inicio, hora_fin } =
      bloqueSeleccionado;

    Alert.alert(
      'Confirmar reserva',
      `¿Deseas reservar el bloque ${hora_inicio.slice(0, 5)} – ${hora_fin.slice(0, 5)} del ${fecha}\ncon ${nombres} ${apellido_paterno} ${apellido_materno || ''}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: ejecutarBloqueo },
      ]
    );
  };

  const ejecutarBloqueo = async () => {
    setCargandoBloqueo(true);

    const fecha_hora_inicio = `${bloqueSeleccionado.fecha} ${bloqueSeleccionado.hora_inicio}`;
    const fecha_hora_fin = `${bloqueSeleccionado.fecha} ${bloqueSeleccionado.hora_fin}`;

    try {
      const { data } = await apiClient.post('/citas/bloquear', {
        profesional_id: bloqueSeleccionado.profesional_id,
        sede_id: bloqueSeleccionado.sede_id,
        fecha_hora_inicio,
        fecha_hora_fin,
      });

      // Poscondición CU15: bloque reservado exclusivamente
      Alert.alert(
        '¡Reserva exitosa!',
        `Tu cita quedó agendada para el ${bloqueSeleccionado.fecha} de ${bloqueSeleccionado.hora_inicio.slice(0, 5)} a ${bloqueSeleccionado.hora_fin.slice(0, 5)}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setBloqueSeleccionado(null);
              setDisponibilidad([]);
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      const err = error.response?.data;

      // CU15 — Excepción 2: token caducado
      if (error.response?.status === 401) {
        Alert.alert(
          'Sesión expirada',
          'Tu sesión ha expirado. Por favor inicia sesión nuevamente.'
        );
        return;
      }

      // CU15 — Excepción 4: colisión de reserva simultánea
      if (err?.error === 'BLOQUE_OCUPADO') {
        Alert.alert('Horario no disponible', err.mensaje, [
          {
            text: 'Elegir otro horario',
            onPress: () => {
              setBloqueSeleccionado(null);
              buscarDisponibilidad(); // refrescar la lista
            },
          },
        ]);
        return;
      }

      // CU15 — Excepción 1: pérdida de conexión
      if (!error.response) {
        Alert.alert(
          'Sin conexión',
          'Verifica tu conexión a internet e intenta nuevamente.'
        );
        return;
      }

      Alert.alert('Error', err?.error || 'No se pudo completar la reserva. Intenta nuevamente.');
    } finally {
      setCargandoBloqueo(false);
    }
  };

  // ─ CU14 — Excepción 1: mostrar pantalla de reintento 
  if (errorEspecialidades) {
    return (
      <ErrorRetry
        mensaje="El servicio de especialidades no está disponible momentáneamente. Verifica tu conexión e intenta de nuevo."
        onRetry={cargarEspecialidades}
      />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Buscar cita médica</Text>

      {/* ─ Filtros CU14  */}
      <Text style={styles.label}>Especialidad</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={especialidadId}
          onValueChange={(value) => {
            setEspecialidadId(String(value));
            setDisponibilidad([]);
            setBloqueSeleccionado(null);
          }}
        >
          {especialidades.map((item) => (
            <Picker.Item
              key={item.especialidad_id}
              label={item.nombre}
              value={String(item.especialidad_id)}
            />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Modalidad de atención</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={tipoSede}
          onValueChange={(value) => {
            setTipoSede(value);
            setDisponibilidad([]);
            setBloqueSeleccionado(null);
          }}
        >
          <Picker.Item label="Teleconsulta Online" value="ONLINE" />
          <Picker.Item label="Atención Domiciliaria" value="DOMICILIO" />
          <Picker.Item label="Ambas modalidades" value="AMBOS" />
        </Picker>
      </View>

      <Text style={styles.label}>Fecha</Text>
      <TouchableOpacity style={styles.fechaBtn} onPress={() => setMostrarCalendario(true)}>
        <Text style={styles.fechaBtnText}>
          {fechaSeleccionada ? `📅  ${fechaSeleccionada}` : '📅  Seleccionar fecha'}
        </Text>
      </TouchableOpacity>

      {mostrarCalendario && (
        <DateTimePicker
          value={fechaSeleccionada ? new Date(`${fechaSeleccionada}T00:00:00`) : new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setMostrarCalendario(false);
            if (selectedDate) {
              setFechaSeleccionada(formatearFecha(selectedDate));
              setDisponibilidad([]);
              setBloqueSeleccionado(null);
            }
          }}
        />
      )}

      <TouchableOpacity
        style={[styles.btnBuscar, cargandoBusqueda && styles.btnDeshabilitado]}
        onPress={buscarDisponibilidad}
        disabled={cargandoBusqueda}
      >
        {cargandoBusqueda ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnTexto}>Buscar disponibilidad</Text>
        )}
      </TouchableOpacity>

      {/* ─ CU14 — Excepción 2: sin resultados  */}
      {!cargandoBusqueda && disponibilidad.length === 0 && fechaSeleccionada !== '' && (
        <View style={styles.sinResultados}>
          <Text style={styles.sinResultadosTexto}>
            No hay profesionales disponibles para los filtros seleccionados.
          </Text>
          <Text style={styles.sinResultadosHint}>
            Prueba cambiando la fecha, la especialidad o la modalidad.
          </Text>
        </View>
      )}

      {/* ─ Lista de bloques disponibles  */}
      {disponibilidad.length > 0 && (
        <>
          <Text style={styles.subtitulo}>Selecciona un bloque horario</Text>
          {disponibilidad.map((item, index) => {
            const estaSeleccionado =
              bloqueSeleccionado?.profesional_id === item.profesional_id &&
              bloqueSeleccionado?.hora_inicio === item.hora_inicio &&
              bloqueSeleccionado?.fecha === item.fecha;

            return (
              <TouchableOpacity
                key={`${item.profesional_id}-${item.hora_inicio}-${index}`}
                style={[styles.card, estaSeleccionado && styles.cardSeleccionada]}
                onPress={() => seleccionarBloque(item)}
              >
                <Text style={styles.nombre}>
                  {item.nombres} {item.apellido_paterno} {item.apellido_materno || ''}
                </Text>
                <Text style={styles.detalle}>🏥  {item.especialidad}</Text>
                <Text style={styles.detalle}>
                  📍  {item.tipo_sede === 'ONLINE' ? 'Teleconsulta Online' : 'Atención Domiciliaria'}
                </Text>
                <Text style={styles.detalle}>📅  {item.fecha}</Text>
                <Text style={styles.bloque}>
                  🕐  {item.hora_inicio.slice(0, 5)} – {item.hora_fin.slice(0, 5)}
                </Text>
                {estaSeleccionado && (
                  <Text style={styles.seleccionadoLabel}>✓ Bloque seleccionado</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {/* ─ CU15: botón de confirmación de reserva */}
      {bloqueSeleccionado && (
        <TouchableOpacity
          style={[styles.btnConfirmar, cargandoBloqueo && styles.btnDeshabilitado]}
          onPress={confirmarAgendamiento}
          disabled={cargandoBloqueo}
        >
          {cargandoBloqueo ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnTexto}>Confirmar reserva</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0052cc',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  label: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    fontSize: 14,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 14,
    overflow: 'hidden',
  },
  fechaBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
  },
  fechaBtnText: {
    color: '#333',
    fontSize: 15,
  },
  btnBuscar: {
    backgroundColor: '#0052cc',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnConfirmar: {
    backgroundColor: '#2e7d32',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  btnDeshabilitado: {
    opacity: 0.6,
  },
  btnTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 12,
  },
  cardSeleccionada: {
    borderColor: '#0052cc',
    borderWidth: 2,
    backgroundColor: '#e8f0fe',
  },
  nombre: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1c3d5a',
    marginBottom: 6,
  },
  detalle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 3,
  },
  bloque: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0052cc',
    marginTop: 6,
  },
  seleccionadoLabel: {
    marginTop: 8,
    color: '#0052cc',
    fontWeight: 'bold',
    fontSize: 13,
  },
  sinResultados: {
    marginTop: 24,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sinResultadosTexto: {
    color: '#555',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 6,
  },
  sinResultadosHint: {
    color: '#999',
    fontSize: 13,
    textAlign: 'center',
  },
});