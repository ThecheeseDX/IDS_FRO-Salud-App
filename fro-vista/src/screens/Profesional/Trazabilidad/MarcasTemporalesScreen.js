import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  finalizarAtencion,
  getCitasMarcasTemporales,
  iniciarAtencion,
} from '../../../api/client';
import ErrorRetry from '../../../components/ErrorRetry';
import VistaConTeclado from '../../../components/VistaConTeclado';

function formatearFecha(fecha) {
  if (!fecha) return 'No registrada';
  return new Date(fecha).toLocaleString('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function estadoNormalizado(estado) {
  return String(estado || '').trim().toUpperCase().replace(/\s+/g, '_');
}

export default function MarcasTemporalesScreen() {
  const [citas, setCitas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [procesandoId, setProcesandoId] = useState(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [marcaManual, setMarcaManual] = useState({
    visible: false,
    tipo: '',
    citaId: null,
    fechaHora: '',
    justificacion: '',
  });

  const cargarCitas = async (esActualizacion = false) => {
    if (esActualizacion) setActualizando(true);
    else setCargando(true);
    setErrorCarga(false);

    try {
      const data = await getCitasMarcasTemporales();
      setCitas(data.citas || []);
    } catch (error) {
      setErrorCarga(true);
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  };

  useEffect(() => {
    cargarCitas();
  }, []);

  const ejecutarInicio = async (
    citaId,
    confirmarAnticipado = false,
    payloadAdicional = {}
  ) => {
    setProcesandoId(citaId);
    try {
      const data = await iniciarAtencion(citaId, {
        confirmar_inicio_anticipado: confirmarAnticipado,
        ...payloadAdicional,
      });
      Alert.alert('Atencion iniciada', `Marca: ${formatearFecha(data.marca_inicio)}`);
      await cargarCitas(true);
    } catch (error) {
      const detalle = error.response?.data;
      if (detalle?.error === 'INICIO_ANTICIPADO') {
        Alert.alert(
          'Inicio anticipado',
          'La cita aun no alcanza su bloque horario. El inicio quedara auditado.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Confirmar inicio',
              onPress: () =>
                ejecutarInicio(citaId, true, payloadAdicional),
            },
          ]
        );
      } else {
        Alert.alert(
          'No fue posible iniciar',
          detalle?.mensaje || 'Revisa la conexion e intenta nuevamente.'
        );
      }
    } finally {
      setProcesandoId(null);
    }
  };

  const ejecutarTermino = async (citaId, payload = {}) => {
    setProcesandoId(citaId);
    try {
      const data = await finalizarAtencion(citaId, payload);
      Alert.alert(
        'Atencion finalizada',
        `Duracion total: ${data.duracion_minutos} minutos.`
      );
      await cargarCitas(true);
    } catch (error) {
      Alert.alert(
        'No fue posible finalizar',
        error.response?.data?.mensaje || 'Revisa la conexion e intenta nuevamente.'
      );
    } finally {
      setProcesandoId(null);
    }
  };

  const confirmarTermino = (citaId) => {
    Alert.alert(
      'Finalizar atencion',
      'Se registrara la hora de termino y la duracion quedara inmutable en auditoria.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Finalizar', onPress: () => ejecutarTermino(citaId) },
      ]
    );
  };

  const abrirMarcaManual = (tipo, citaId) => {
    setMarcaManual({
      visible: true,
      tipo,
      citaId,
      fechaHora: new Date().toISOString(),
      justificacion: '',
    });
  };

  const cerrarMarcaManual = () => {
    setMarcaManual({
      visible: false,
      tipo: '',
      citaId: null,
      fechaHora: '',
      justificacion: '',
    });
  };

  const confirmarMarcaManual = async () => {
    if (!marcaManual.fechaHora.trim() || !marcaManual.justificacion.trim()) {
      Alert.alert(
        'Datos requeridos',
        'Indica la fecha, hora y justificacion de la marca manual.'
      );
      return;
    }

    const payload = {
      marca_manual: marcaManual.fechaHora.trim(),
      justificacion_manual: marcaManual.justificacion.trim(),
    };
    const { tipo, citaId } = marcaManual;
    cerrarMarcaManual();

    if (tipo === 'INICIO') {
      await ejecutarInicio(citaId, false, payload);
    } else {
      await ejecutarTermino(citaId, payload);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={actualizando}
          onRefresh={() => cargarCitas(true)}
          colors={['#2e7d32']}
        />
      }
    >
      <Text style={styles.title}>Marcas temporales</Text>
      <Text style={styles.subtitle}>
        Registra el inicio y termino efectivo de cada prestacion.
      </Text>

      {cargando ? (
        <ActivityIndicator size="large" color="#2e7d32" />
      ) : errorCarga ? (
        <ErrorRetry
          mensaje="No fue posible recuperar las citas."
          onRetry={cargarCitas}
        />
      ) : citas.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No hay citas confirmadas, en curso o realizadas.
          </Text>
        </View>
      ) : (
        citas.map((cita) => {
          const estado = estadoNormalizado(cita.estado);
          const procesando = procesandoId === cita.cita_id;

          return (
            <View key={cita.cita_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.patient}>{cita.paciente}</Text>
                <Text
                  style={[
                    styles.badge,
                    estado === 'EN_CURSO'
                      ? styles.badgeActive
                      : estado === 'REALIZADA'
                        ? styles.badgeDone
                        : styles.badgeReady,
                  ]}
                >
                  {estado}
                </Text>
              </View>

              <Text style={styles.detail}>Cita #{cita.cita_id}</Text>
              <Text style={styles.detail}>
                Inicio agendado: {formatearFecha(cita.fecha_hora_inicio)}
              </Text>
              <Text style={styles.detail}>
                Marca de inicio: {formatearFecha(cita.checkin_profesional)}
              </Text>

              {estado === 'REALIZADA' && (
                <>
                  <Text style={styles.detail}>
                    Marca de termino: {formatearFecha(cita.fecha_hora_fin)}
                  </Text>
                  <Text style={styles.duration}>
                    Duracion: {cita.duracion_minutos ?? 0} minutos
                  </Text>
                </>
              )}

              {estado === 'EN_CURSO' && !cita.checkin_profesional && (
                <View style={styles.recoveryBox}>
                  <Text style={styles.recoveryText}>
                    Sesion activa sin marca de inicio. Al finalizar se usara el
                    inicio agendado y la recuperacion quedara auditada.
                  </Text>
                </View>
              )}

              {estado === 'CONFIRMADA' && (
                <>
                  <TouchableOpacity
                    style={styles.startButton}
                    disabled={procesando}
                    onPress={() => ejecutarInicio(cita.cita_id)}
                  >
                    {procesando ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Iniciar atencion</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.manualButton}
                    disabled={procesando}
                    onPress={() => abrirMarcaManual('INICIO', cita.cita_id)}
                  >
                    <Text style={styles.manualButtonText}>
                      Registrar inicio manual justificado
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {estado === 'EN_CURSO' && (
                <>
                  <TouchableOpacity
                    style={styles.finishButton}
                    disabled={procesando}
                    onPress={() => confirmarTermino(cita.cita_id)}
                  >
                    {procesando ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Finalizar atencion</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.manualButton}
                    disabled={procesando}
                    onPress={() => abrirMarcaManual('TERMINO', cita.cita_id)}
                  >
                    <Text style={styles.manualButtonText}>
                      Registrar termino manual justificado
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          );
        })
      )}

      <Modal
        visible={marcaManual.visible}
        transparent
        animationType="fade"
        onRequestClose={cerrarMarcaManual}
      >
        {/* Un Modal renderiza en su propia raíz nativa, así que necesita su
            propio manejo del teclado, independiente del resto de la pantalla. */}
        <VistaConTeclado
          style={styles.modalOverlay}
          contentContainerStyle={styles.modalContenido}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Marca manual justificada</Text>
            <Text style={styles.modalHelp}>
              Utiliza formato ISO, por ejemplo: 2026-06-15T14:30:00-04:00
            </Text>
            <TextInput
              style={styles.input}
              value={marcaManual.fechaHora}
              onChangeText={(fechaHora) =>
                setMarcaManual((actual) => ({ ...actual, fechaHora }))
              }
              autoCapitalize="none"
              placeholder="Fecha y hora"
            />
            <TextInput
              style={[styles.input, styles.justificationInput]}
              value={marcaManual.justificacion}
              onChangeText={(justificacion) =>
                setMarcaManual((actual) => ({ ...actual, justificacion }))
              }
              multiline
              textAlignVertical="top"
              placeholder="Justificacion de trazabilidad"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cerrarMarcaManual}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmarMarcaManual}
              >
                <Text style={styles.buttonText}>Registrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </VistaConTeclado>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e8f5e9' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  subtitle: { color: '#666', marginTop: 4, marginBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#c8e6c9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  patient: { flex: 1, fontSize: 17, fontWeight: 'bold', color: '#1f2937' },
  badge: {
    overflow: 'hidden',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: 'bold',
  },
  badgeReady: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
  badgeActive: { backgroundColor: '#ede9fe', color: '#6d28d9' },
  badgeDone: { backgroundColor: '#dcfce7', color: '#15803d' },
  detail: { color: '#4b5563', marginBottom: 5 },
  duration: {
    color: '#2e7d32',
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 6,
  },
  startButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 9,
    padding: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  finishButton: {
    backgroundColor: '#0052cc',
    borderRadius: 9,
    padding: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  manualButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  manualButtonText: {
    color: '#0052cc',
    fontSize: 13,
    fontWeight: '600',
  },
  recoveryBox: {
    backgroundColor: '#fff7ed',
    borderLeftWidth: 4,
    borderLeftColor: '#f97316',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  recoveryText: { color: '#9a3412', fontSize: 13 },
  emptyCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#c8e6c9',
    borderRadius: 12,
    padding: 20,
  },
  emptyText: { color: '#666', textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalContenido: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 6,
  },
  modalHelp: { color: '#6b7280', fontSize: 12, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 11,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
  },
  justificationInput: { minHeight: 90 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginRight: 8,
  },
  cancelButtonText: { color: '#4b5563', fontWeight: 'bold' },
  confirmButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
});
