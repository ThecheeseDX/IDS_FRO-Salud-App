// Ruta: fro-vista/src/screens/Profesional/FichaClinica/HistorialPacienteScreen.js

import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';

import apiClient, {
  finalizarAtencion,
  getHistorialPaciente,
  iniciarAtencion,
} from '../../../api/client';
import { AuthContext } from '../../../context/AuthContext';
import DialogoMotivo from '../../../components/DialogoMotivo';

export default function HistorialPacienteScreen({ route, navigation }) {
  const { pacienteId, nombrePaciente } = route.params;
  const { userData } = useContext(AuthContext);

  const [historial, setHistorial] = useState([]);
  const [episodios, setEpisodios] = useState([]);
  const [evoluciones, setEvoluciones] = useState([]);
  const [paciente, setPaciente] = useState(null);
  const [mensajeMultimedia, setMensajeMultimedia] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  // CU22: cancelar exige motivo; se pide en un diálogo propio.
  const [citaPorCancelar, setCitaPorCancelar] = useState(null);
  // CU71: informe de cuadratura de coberturas (se descarta en memoria).
  const [cuadratura, setCuadratura] = useState(null);
  const [sincronizando, setSincronizando] = useState(false);
  // CU41: cierre manual justificado cuando el paciente no marcó su término.
  const [cierreManualCita, setCierreManualCita] = useState(null);
  // CU33/CU35: disponibilidad del repositorio multimedia y conteo de archivos.
  const [multimediaDisponible, setMultimediaDisponible] = useState(false);
  const [totalDocumentos, setTotalDocumentos] = useState(0);
  // CU31: evolución sobre la que se redacta una corrección versionada.
  const [correccionEvolucion, setCorreccionEvolucion] = useState(null);
  // CU31: versiones desplegadas por evolución { evolucionId: [versiones] }.
  const [versionesPorEvolucion, setVersionesPorEvolucion] = useState({});

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
        setMultimediaDisponible(Boolean(data.multimediaDisponible));
        setTotalDocumentos(data.totalDocumentos || 0);
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
      setRefreshing(false);
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  // ── CU31: correcciones versionadas sobre evoluciones cerradas ──────────────
  // El original nunca se toca: cada aclaración post-firma queda como una
  // versión indexada aparte, y el servidor valida autoría y tope de versiones.
  const alternarVersiones = async (evolucionId) => {
    if (versionesPorEvolucion[evolucionId]) {
      setVersionesPorEvolucion((previas) => {
        const copia = { ...previas };
        delete copia[evolucionId];
        return copia;
      });
      return;
    }
    try {
      const { data } = await apiClient.get(`/clinica/evolucion/${evolucionId}/versiones`);
      setVersionesPorEvolucion((previas) => ({
        ...previas,
        [evolucionId]: data.versiones || [],
      }));
    } catch (err) {
      Alert.alert('Error', 'No se pudieron cargar las versiones de este registro.');
    }
  };

  const crearCorreccion = async (evolucionId, texto) => {
    setCorreccionEvolucion(null);
    try {
      const { data } = await apiClient.post(`/clinica/evolucion/${evolucionId}/versiones`, {
        texto,
      });
      Alert.alert('Corrección guardada', data?.mensaje || 'Versión creada.');
      // Refrescar el desplegable si estaba abierto y el contador del historial.
      setVersionesPorEvolucion((previas) => {
        const copia = { ...previas };
        delete copia[evolucionId];
        return copia;
      });
      await cargarHistorial(true);
    } catch (err) {
      const respuesta = err.response?.data;
      // Excepciones CU31: sin autoría (403), tope de versiones o registro
      // abierto (409), corrección vacía (400) y fallo de vinculación (500).
      Alert.alert(
        'Corrección no guardada',
        respuesta?.mensaje || respuesta?.error || 'Reintenta el guardado.'
      );
    }
  };

  /**
   * Iniciar y finalizar una atención no son un simple cambio de estado: además
   * dejan la marca horaria auditable de la prestación (CU38). Por eso usan los
   * mismos servicios que la pantalla de Marcas Temporales, en vez de la
   * transición genérica, que dejaría la hora real sin registrar.
   */
  const registrarMarcaAtencion = async (citaId, evento) => {
    try {
      if (evento === 'INICIAR') {
        const data = await iniciarAtencion(citaId, {});
        Alert.alert('Atención iniciada', `Marca de inicio: ${formatearFecha(data.marca_inicio)}`);
      } else {
        const data = await finalizarAtencion(citaId, {});
        const inv = data.inventario;
        const detalleInventario = !inv
          ? ''
          : inv.sin_paquete
            ? '\n\nEl paciente no tiene un paquete de sesiones activo: no se descontó ninguna sesión.'
            : `\n\nSesiones restantes del paquete: ${inv.sesiones_restantes}${inv.paquete_agotado ? ' (paquete agotado)' : ''}`;
        Alert.alert('Atención finalizada', `Duración total: ${data.duracion_minutos} minutos.${detalleInventario}`);
      }
      cargarHistorial(false);
    } catch (err) {
      const detalle = err.response?.data;

      // La atención comienza antes de su bloque horario: queda auditado.
      if (detalle?.error === 'INICIO_ANTICIPADO') {
        Alert.alert(
          'Inicio anticipado',
          'La cita aún no alcanza su bloque horario. El inicio quedará auditado.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Confirmar inicio',
              onPress: async () => {
                try {
                  const data = await iniciarAtencion(citaId, { confirmar_inicio_anticipado: true });
                  Alert.alert('Atención iniciada', `Marca de inicio: ${formatearFecha(data.marca_inicio)}`);
                  cargarHistorial(false);
                } catch (error) {
                  Alert.alert(
                    'No fue posible iniciar',
                    error.response?.data?.mensaje || 'Intenta nuevamente.'
                  );
                }
              },
            },
          ]
        );
        return;
      }

      Alert.alert(
        evento === 'INICIAR' ? 'No fue posible iniciar' : 'No fue posible finalizar',
        detalle?.mensaje || 'Revisa la conexión e intenta nuevamente.'
      );
    }
  };

  const modificarEstadoCita = async (citaId, estadoActual, evento, motivo) => {
    // Exclusión local preventiva para estados terminales
    const deEstado = (estadoActual || '').toUpperCase();
    const estadosTerminales = ['REALIZADA', 'CANCELADA', 'INASISTENCIA'];

    if (estadosTerminales.includes(deEstado)) {
      Alert.alert(
        "Acción no permitida",
        "El Sistema bloquea la interacción debido a que la cita ya se encuentra en un estado terminal."
      );
      return;
    }

    // Estos dos eventos llevan marca horaria; el resto son cambios de estado.
    if (evento === 'INICIAR' || evento === 'FINALIZAR') {
      return registrarMarcaAtencion(citaId, evento);
    }

    // CU22: la cancelación necesita justificación; se pide y se retoma después.
    if (evento === 'CANCELAR' && !motivo) {
      setCitaPorCancelar({ citaId, estadoActual });
      return;
    }

    try {
      const response = await apiClient.post(`/citas/${citaId}/transicionar`, { evento, motivo });

      if (response.data.ok || response.status === 200) {
        Alert.alert("Éxito", `Cita actualizada exitosamente a: ${response.data.nuevo_estado || 'nuevo estado'}`);
        cargarHistorial(false); // Recargar la lista para reflejar los cambios inmediatos
      }
    } catch (err) {
      if (err.response) {
        const { status, data } = err.response;

        // EXCEPCIÓN 2: Muestra el error exacto que envía el backend para saber qué falló
        if (status === 422 || data.code === 'TRANSICION_INVALIDA') {
          Alert.alert(
            "Error de validación de flujo lógico",
            `${data.error || 'La transición no está permitida por las reglas de negocio.'}\n\nPor favor, sigue el orden del flujo clínico.`
          );
        } 
        // EXCEPCIÓN 4: Fallo de persistencia en BD
        else if (status === 500 || data.code === 'PERSIST_FAIL') {
          Alert.alert(
            "Alerta de Error Crítica",
            "El motor de base de datos no logró guardar el nuevo estado debido a un fallo de persistencia. Intente nuevamente o contacte a soporte."
          );
        } else {
          Alert.alert("Error", data.error || "No se pudo cambiar el estado.");
        }
      } else {
        // EXCEPCIÓN 3: Latencia o pérdida de red
        Alert.alert(
          "Sincronización en curso",
          "La latencia de red impide visualizar el cambio de estado de manera inmediata. Arrastre hacia abajo para refrescar.",
          [{ text: "Refrescar Ahora", onPress: () => cargarHistorial(true) }]
        );
      }
    }
  };

  // CU41: certificación multi-factor de la sesión.
  const textoFactores = (factores) =>
    (factores || []).map((f) => `${f.ok ? '✅' : '❌'} ${f.factor}`).join('\n');

  const validarSesion = async (citaId, extras = {}) => {
    try {
      const { data } = await apiClient.post(`/citas/${citaId}/validar-sesion`, extras);

      if (data.certificada) {
        Alert.alert('Sesión certificada', `${data.mensaje}\n\n${textoFactores(data.factores)}`);
        return;
      }

      // Excepción 1: falta el término del paciente → cierre manual justificado.
      if (data.requiere_cierre_manual) {
        Alert.alert(
          'Falta la marca del paciente',
          `${data.mensaje}\n\n${textoFactores(data.factores)}`,
          [
            { text: 'Volver', style: 'cancel' },
            { text: 'Cierre manual', onPress: () => setCierreManualCita(citaId) },
          ]
        );
        return;
      }

      // Excepción 3: el resumen se muestra y nada se persiste sin confirmar.
      if (data.resumen_pendiente) {
        Alert.alert(
          'Resumen de factores',
          `${textoFactores(data.factores)}\n\n¿Confirmas la certificación de la sesión?`,
          [
            { text: 'Rechazar', style: 'cancel' },
            { text: 'Confirmar', onPress: () => validarSesion(citaId, { confirmar: true }) },
          ]
        );
      }
    } catch (err) {
      const respuesta = err.response?.data;
      // Excepción 2: discrepancias críticas suspenden la validación.
      if (respuesta?.error === 'VALIDACION_SUSPENDIDA') {
        Alert.alert(
          'Validación suspendida',
          `${respuesta.mensaje}\n\n${textoFactores(respuesta.factores)}`
        );
        return;
      }
      Alert.alert(
        'No se pudo validar',
        respuesta?.mensaje || 'El cierre quedó encolado. Reintenta en unos minutos.'
      );
    }
  };

  // CU71: contrasta sesiones ejecutadas contra coberturas autorizadas.
  const sincronizarCoberturas = async () => {
    setSincronizando(true);
    try {
      const { data } = await apiClient.get(`/pagos/cuadratura/${pacienteId}`);
      setCuadratura(data);
    } catch (err) {
      // Excepción 4: la sincronización queda pendiente y se reintenta.
      Alert.alert(
        'Sincronización pendiente',
        err.response?.data?.mensaje || 'No se pudo completar. Reintenta en unos minutos.'
      );
    } finally {
      setSincronizando(false);
    }
  };

  // CU22: muestra el historial de cambios de una cita (responsable y motivo).
  const verTrazabilidad = async (citaId) => {
    try {
      const { data } = await apiClient.get(`/citas/${citaId}/trazabilidad`);
      const eventos = data?.eventos || [];

      if (eventos.length === 0) {
        Alert.alert('Trazabilidad', 'Esta cita aún no registra cambios auditados.');
        return;
      }

      const lineas = eventos.map((e) => {
        const momento = formatearFecha(e.momento);
        const cambio = e.accion === 'REPROGRAMACION_CITA'
          ? `Reprogramada al ${e.bloque_nuevo?.fecha_hora_inicio || '?'}`
          : `${e.estado_anterior || '?'} → ${e.nuevo_estado || '?'}`;
        const motivo = e.motivo ? `\n   Motivo: ${e.motivo}` : '';
        const actor = e.rol_actor ? ` (${e.rol_actor})` : '';
        return `• ${momento}${actor}\n   ${cambio}${motivo}`;
      });

      Alert.alert(`Trazabilidad cita #${citaId}`, lineas.join('\n\n'));
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la trazabilidad de la cita.');
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

          {/* CU33/CU34/CU35: repositorio multimedia del paciente */}
          {multimediaDisponible && (
            <TouchableOpacity
              style={styles.botonDocumentos}
              onPress={() =>
                navigation.navigate('Documentos', {
                  pacienteId,
                  nombrePaciente: nombrePaciente || paciente?.nombre_completo,
                })
              }
            >
              <Text style={styles.botonDocumentosTexto}>
                📁 Documentos del paciente{totalDocumentos > 0 ? ` (${totalDocumentos})` : ''}
              </Text>
            </TouchableOpacity>
          )}

          {/* ── CU71: cuadratura de sesiones bonificables ── */}
          <View style={styles.tarjetaCuadratura}>
            <Text style={styles.tituloCuadratura}>💳 Cuadratura de coberturas</Text>
            {cuadratura === null ? (
              <TouchableOpacity
                style={styles.botonCuadratura}
                onPress={sincronizarCoberturas}
                disabled={sincronizando}
              >
                {sincronizando ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.botonCuadraturaTexto}>Sincronizar con coberturas</Text>
                )}
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.lineaCuadratura}>
                  Sesiones realizadas: {cuadratura.sesiones_realizadas} · Autorizadas por planes:{' '}
                  {cuadratura.sesiones_autorizadas} (usadas {cuadratura.sesiones_usadas})
                </Text>
                {cuadratura.discrepancia_saldo && (
                  <Text style={styles.alertaCuadratura}>
                    ⚠️ Discrepancia de saldo: las sesiones ejecutadas superan las
                    autorizadas. Regulariza la cobertura con el paciente.
                  </Text>
                )}
                {cuadratura.realizadas_sin_bono.length > 0 && (
                  <Text style={styles.alertaCuadratura}>
                    ⚠️ {cuadratura.realizadas_sin_bono.length} atención(es) realizadas sin
                    bono registrado (citas #{cuadratura.realizadas_sin_bono.join(', #')}).
                  </Text>
                )}
                {!cuadratura.discrepancia_saldo && cuadratura.realizadas_sin_bono.length === 0 && (
                  <Text style={styles.okCuadratura}>
                    ✅ El registro contable está alineado con las autorizaciones.
                  </Text>
                )}
                <TouchableOpacity onPress={() => setCuadratura(null)}>
                  <Text style={styles.descartarCuadratura}>Descartar informe</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={styles.seccionTitulo}>Atenciones / Citas</Text>

          {historial.length === 0 ? (
            <Text style={styles.sinResultados}>Sin atenciones registradas</Text>
          ) : (
            historial.map((item) => {
              // Normalizamos el estado actual a mayúsculas para las comparaciones visuales
              const estadoCita = (item.estado || '').toUpperCase();

              return (
                <View key={item.cita_id} style={styles.card}>
                  <Text style={styles.fecha}>
                    {formatearFecha(item.fecha_hora_inicio)}
                  </Text>
                  <Text style={{ fontWeight: 'bold', color: '#374151' }}>
                    Estado: <Text style={styles.estadoTexto}>{item.estado}</Text>
                  </Text>
                  <Text>Profesional: {item.profesional}</Text>
                  <Text>Especialidad: {item.especialidad}</Text>
                  <Text>Modalidad: {item.tipo_sede}</Text>

                  {/* PANEL DE ACCIONES INTELIGENTES (MÁQUINA DE ESTADOS DINÁMICA) */}
                  <View style={styles.containerAcciones}>
                    
                    {/* ACCIONES SI LA CITA ESTÁ AGENDADA */}
                    {estadoCita === 'AGENDADA' && (
                      <>
                        <TouchableOpacity 
                          style={[styles.botonAccion, { backgroundColor: '#eab308' }]}
                          onPress={() => modificarEstadoCita(item.cita_id, item.estado, 'CONFIRMAR')}
                        >
                          <Text style={styles.textoBotonAccion}>👍 Confirmar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.botonAccion, { backgroundColor: '#dc2626' }]}
                          onPress={() => modificarEstadoCita(item.cita_id, item.estado, 'CANCELAR')}
                        >
                          <Text style={styles.textoBotonAccion}>❌ Cancelar</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {/* ACCIONES SI LA CITA ESTÁ CONFIRMADA */}
                    {estadoCita === 'CONFIRMADA' && (
                      <>
                        <TouchableOpacity 
                          style={[styles.botonAccion, { backgroundColor: '#2563eb' }]}
                          onPress={() => modificarEstadoCita(item.cita_id, item.estado, 'INICIAR')}
                        >
                          <Text style={styles.textoBotonAccion}>▶️ Iniciar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.botonAccion, { backgroundColor: '#d97706' }]}
                          onPress={() => modificarEstadoCita(item.cita_id, item.estado, 'REGISTRAR_INASISTENCIA')}
                        >
                          <Text style={styles.textoBotonAccion}>🤷‍♂️ Ausente</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.botonAccion, { backgroundColor: '#dc2626' }]}
                          onPress={() => modificarEstadoCita(item.cita_id, item.estado, 'CANCELAR')}
                        >
                          <Text style={styles.textoBotonAccion}>❌ Cancelar</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {/* ACCIONES SI LA CITA ESTÁ EN CURSO */}
                    {estadoCita === 'EN_CURSO' && (
                      <TouchableOpacity 
                        style={[styles.botonAccion, { backgroundColor: '#16a34a', marginHorizontal: 0 }]}
                        onPress={() => modificarEstadoCita(item.cita_id, item.estado, 'FINALIZAR')}
                      >
                        <Text style={styles.textoBotonAccion}>✅ Finalizar Atención</Text>
                      </TouchableOpacity>
                    )}

                    {/* MENSAJE SI LA CITA ESTÁ EN UN ESTADO FINAL O TERMINAL */}
                    {['REALIZADA', 'CANCELADA', 'INASISTENCIA'].includes(estadoCita) && (
                      <Text style={styles.textoTerminal}>🔒 Flujo concluido (Registro histórico cerrado)</Text>
                    )}
                  </View>

                  {/* CU39/CU43: evidencia de la sesión */}
                  {['CONFIRMADA', 'EN_CURSO'].includes(estadoCita) && (
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate('EvidenciaSesion', {
                          citaId: item.cita_id,
                          modalidad: item.modalidad,
                        })
                      }
                    >
                      <Text style={styles.enlaceEvidencia}>🛰️ Evidencia de sesión</Text>
                    </TouchableOpacity>
                  )}

                  {/* CU41 + CU42: cierre certificado de sesiones realizadas */}
                  {estadoCita === 'REALIZADA' && (
                    <View style={styles.filaCierre}>
                      <TouchableOpacity onPress={() => validarSesion(item.cita_id)}>
                        <Text style={styles.enlaceEvidencia}>🔏 Validar sesión</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          navigation.navigate('FirmaConformidad', {
                            citaId: item.cita_id,
                            nombrePaciente,
                          })
                        }
                      >
                        <Text style={styles.enlaceEvidencia}>✍️ Firma de conformidad</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* CU22: historial de cambios de la cita para auditoría */}
                  <TouchableOpacity onPress={() => verTrazabilidad(item.cita_id)}>
                    <Text style={styles.enlaceTrazabilidad}>📜 Ver trazabilidad de la cita</Text>
                  </TouchableOpacity>
                </View>
              );
            })
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

                {/* CU31: correcciones versionadas solo sobre registros cerrados */}
                {item.inalterable === 1 && (
                  <View style={styles.filaVersiones}>
                    <TouchableOpacity
                      onPress={() => alternarVersiones(item.evolucion_clinica_id)}
                    >
                      <Text style={styles.enlaceVersiones}>
                        {versionesPorEvolucion[item.evolucion_clinica_id]
                          ? '▲ Ocultar versiones'
                          : `📑 Versiones (${item.total_versiones || 0})`}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setCorreccionEvolucion(item)}>
                      <Text style={styles.enlaceCorreccion}>➕ Agregar corrección</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {versionesPorEvolucion[item.evolucion_clinica_id] && (
                  <View style={styles.cajaVersiones}>
                    {versionesPorEvolucion[item.evolucion_clinica_id].length === 0 ? (
                      <Text style={styles.textoVersion}>
                        Sin correcciones. El registro original está íntegro.
                      </Text>
                    ) : (
                      versionesPorEvolucion[item.evolucion_clinica_id].map((v) => (
                        <View key={v.version_id} style={styles.itemVersion}>
                          <Text style={styles.tituloVersion}>
                            Versión {v.numero_version} ·{' '}
                            {formatearFecha(v.fecha_creacion)} · {v.autor?.trim() || 'Autor no informado'}
                          </Text>
                          <Text style={styles.textoVersion}>{v.texto_correccion}</Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </>
      )}

      <View style={{ height: 30 }} />

      {/* CU31: la corrección exige texto descriptivo; el original no se toca */}
      <DialogoMotivo
        visible={correccionEvolucion !== null}
        titulo="Corrección versionada"
        descripcion={
          correccionEvolucion
            ? `Evolución #${correccionEvolucion.evolucion_clinica_id} (cerrada). Redacta la aclaración: se guardará como una nueva versión y el registro original quedará íntegro para auditoría.`
            : ''
        }
        etiquetaConfirmar="Guardar versión"
        colorConfirmar="#2e7d32"
        onConfirmar={(texto) => crearCorreccion(correccionEvolucion.evolucion_clinica_id, texto)}
        onCancelar={() => setCorreccionEvolucion(null)}
      />

      {/* CU41: cierre manual auditado cuando falta la marca del paciente */}
      <DialogoMotivo
        visible={cierreManualCita !== null}
        titulo="Cierre manual auditado"
        descripcion="Justifica el cierre sin la marca de término del paciente:"
        etiquetaConfirmar="Certificar sesión"
        colorConfirmar="#2e7d32"
        onConfirmar={(motivo) => {
          const cita = cierreManualCita;
          setCierreManualCita(null);
          validarSesion(cita, { confirmar: true, cierre_manual: true, justificacion: motivo });
        }}
        onCancelar={() => setCierreManualCita(null)}
      />

      {/* CU22: la cancelación del profesional también exige justificación */}
      <DialogoMotivo
        visible={citaPorCancelar !== null}
        titulo="Cancelar cita"
        descripcion="Indica el motivo de la cancelación (queda en la auditoría):"
        etiquetaConfirmar="Cancelar cita"
        onConfirmar={(motivo) => {
          const pendiente = citaPorCancelar;
          setCitaPorCancelar(null);
          modificarEstadoCita(pendiente.citaId, pendiente.estadoActual, 'CANCELAR', motivo);
        }}
        onCancelar={() => setCitaPorCancelar(null)}
      />
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
  // CU33/CU35: acceso al repositorio multimedia
  botonDocumentos: {
    borderWidth: 1,
    borderColor: '#0052cc',
    backgroundColor: '#eef4ff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  botonDocumentosTexto: { color: '#0052cc', fontWeight: 'bold' },
  // CU31: correcciones versionadas
  filaVersiones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  enlaceVersiones: { color: '#0052cc', fontWeight: '600', fontSize: 13 },
  enlaceCorreccion: { color: '#2e7d32', fontWeight: '600', fontSize: 13 },
  cajaVersiones: {
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0052cc',
    paddingLeft: 10,
  },
  itemVersion: { marginBottom: 8 },
  tituloVersion: { fontWeight: 'bold', fontSize: 12, color: '#1c3d5a' },
  textoVersion: { color: '#444', fontSize: 13 },
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
  
  containerAcciones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  botonAccion: {
    flex: 1,
    paddingVertical: 9,
    marginHorizontal: 4,
    borderRadius: 6,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  textoBotonAccion: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  estadoTexto: {
    fontWeight: '600',
    color: '#2563eb'
  },
  tarjetaCuadratura: {
    backgroundColor: '#fff8e1',
    borderWidth: 1,
    borderColor: '#ffe082',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    marginBottom: 6,
  },
  tituloCuadratura: { fontWeight: 'bold', color: '#8d6e00', marginBottom: 8, fontSize: 15 },
  botonCuadratura: {
    backgroundColor: '#ef6c00',
    borderRadius: 8,
    padding: 11,
    alignItems: 'center',
  },
  botonCuadraturaTexto: { color: '#fff', fontWeight: 'bold' },
  lineaCuadratura: { color: '#5d4a00', marginBottom: 6 },
  alertaCuadratura: { color: '#b71c1c', marginBottom: 6, fontWeight: '600' },
  okCuadratura: { color: '#2e7d32', marginBottom: 6, fontWeight: '600' },
  descartarCuadratura: { color: '#8d6e00', fontWeight: 'bold', textAlign: 'right', marginTop: 4 },
  enlaceEvidencia: {
    color: '#2e7d32',
    fontWeight: 'bold',
    fontSize: 13,
    marginTop: 10,
  },
  filaCierre: { flexDirection: 'row', justifyContent: 'space-between' },
  enlaceTrazabilidad: {
    color: '#0052cc',
    fontWeight: 'bold',
    fontSize: 13,
    marginTop: 10,
  },
  textoTerminal: {
    color: '#6b7280',
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 4,
    textAlign: 'center',
    flex: 1,
  }
});