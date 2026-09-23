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

import apiClient, {
  getConfirmacionesPendientes,
  pedirNuevaSolicitudConfirmacion,
  getMisListasEspera,
  salirListaEspera,
  tomarCupoListaEspera,
} from '../../api/client';
import DialogoMotivo from '../../components/DialogoMotivo';
import ErrorRetry from '../../components/ErrorRetry';
// Las horas de la base son hora de pared: se formatean sin convertir huso.
import { formatearFechaHora as formatearFecha } from '../../utils/fechas';
import { etiquetaModalidad, iconoModalidad } from '../../utils/modalidad';
import { ordenarCitas } from '../../utils/estados';
import { colores, espacio, radio, sombra, tipografia, piezas, interaccion } from '../../theme';
import EtiquetaEstado from '../../components/EtiquetaEstado';
import DialogoAviso from '../../components/DialogoAviso';

// Estados desde los que el paciente todavía puede anular o mover la hora.
const ESTADOS_CANCELABLES = ['AGENDADA', 'CONFIRMADA'];

export default function MisCitasScreen({ navigation }) {
  // Avisos con el diálogo de la app (el Alert nativo no se estiliza).
  const [aviso, setAviso] = useState(null);
  const [citas, setCitas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [errorRed, setErrorRed] = useState(false);
  const [cancelandoId, setCancelandoId] = useState(null);
  // CU21: citas con una solicitud de confirmación abierta.
  const [porConfirmar, setPorConfirmar] = useState([]);
  const [confirmandoId, setConfirmandoId] = useState(null);
  // CU19: bloques ocupados en los que el paciente está esperando su turno.
  const [listasEspera, setListasEspera] = useState([]);
  const [tomandoCupo, setTomandoCupo] = useState(null);

  const cargarCitas = useCallback(async (esRefresco = false) => {
    if (esRefresco) {
      setRefrescando(true);
    } else {
      setCargando(true);
    }
    setErrorRed(false);

    try {
      const { data } = await apiClient.get('/citas/mis-citas');
      setCitas(ordenarCitas(Array.isArray(data) ? data : []));

      // CU21 y CU19 viajan junto con las citas: son parte de la misma vista.
      // Si alguno falla, las citas se muestran igual.
      const [confirmaciones, listas] = await Promise.all([
        getConfirmacionesPendientes().catch(() => ({ pendientes: [] })),
        getMisListasEspera().catch(() => ({ listas: [] })),
      ]);
      setPorConfirmar(confirmaciones.pendientes || []);
      setListasEspera(listas.listas || []);
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
      setAviso({ tono: 'info', titulo: 'Cita cancelada', mensaje: `Tu hora fue liberada correctamente.${aviso}` });
      await cargarCitas(true);
    } catch (error) {
      const respuesta = error.response?.data;
      setAviso({ tono: 'error', titulo: 'No se pudo cancelar', mensaje: respuesta?.mensaje || respuesta?.error || 'Intenta nuevamente.' });
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

  // ── CU21: confirmar o cancelar desde la app ────────────────────────────
  const responderSolicitud = async (cita, evento, motivo) => {
    setConfirmandoId(cita.cita_id);
    try {
      await apiClient.post(`/citas/${cita.cita_id}/transicionar`, {
        evento,
        ...(motivo ? { motivo } : {}),
      });
      setAviso({
        tono: 'ok',
        titulo: evento === 'CONFIRMAR' ? 'Asistencia confirmada' : 'Cita cancelada',
        mensaje:
          evento === 'CONFIRMAR'
            ? 'Gracias por confirmar. Te esperamos a la hora agendada.'
            : 'Tu cita quedó cancelada y el bloque se liberó.',
      });
      await cargarCitas(true);
    } catch (error) {
      // Excepción 4 del CU21: la respuesta no se pudo guardar.
      setAviso({
        tono: 'error',
        titulo: 'No se pudo guardar',
        mensaje:
          error.response?.data?.mensaje ||
          error.response?.data?.error ||
          'Refresca la pantalla e inténtalo otra vez.',
      });
    } finally {
      setConfirmandoId(null);
    }
  };

  // Excepción 2 del CU21: pedir un enlace nuevo cuando el anterior venció.
  const pedirOtroEnlace = async (cita) => {
    try {
      const datos = await pedirNuevaSolicitudConfirmacion(cita.cita_id);
      setAviso({ tono: 'ok', titulo: 'Solicitud reenviada', mensaje: datos.mensaje });
      await cargarCitas(true);
    } catch (error) {
      setAviso({
        tono: 'error',
        titulo: 'No se pudo reenviar',
        mensaje: error.response?.data?.mensaje || 'Intenta nuevamente.',
      });
    }
  };

  // ── CU19: tomar el cupo o salir de la lista ────────────────────────────
  const tomarCupo = async (lista) => {
    setTomandoCupo(lista.lista_espera_id);
    try {
      const datos = await tomarCupoListaEspera(lista.lista_espera_id);
      setAviso({
        tono: 'ok',
        titulo: '¡Cupo tomado!',
        mensaje: datos.mensaje || 'La hora quedó agendada a tu nombre.',
      });
      await cargarCitas(true);
    } catch (error) {
      setAviso({
        tono: 'alerta',
        titulo: 'No se pudo tomar el cupo',
        mensaje:
          error.response?.data?.mensaje ||
          'El cupo ya no está disponible. Busca otro horario.',
        alCerrar: () => cargarCitas(true),
      });
    } finally {
      setTomandoCupo(null);
    }
  };

  const salirDeLista = async (lista) => {
    try {
      await salirListaEspera(lista.cita_id);
      await cargarCitas(true);
    } catch (error) {
      setAviso({
        tono: 'error',
        titulo: 'No se pudo salir',
        mensaje: error.response?.data?.mensaje || 'Intenta nuevamente.',
      });
    }
  };

  const renderCita = ({ item }) => {
    const puedeCancelar = ESTADOS_CANCELABLES.includes(item.estado);
    const cancelando = cancelandoId === item.cita_id;
    const solicitud = porConfirmar.find((p) => Number(p.cita_id) === Number(item.cita_id));
    const confirmando = confirmandoId === item.cita_id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.fecha}>{formatearFecha(item.fecha_hora_inicio)}</Text>
          <EtiquetaEstado estado={item.estado} style={styles.estadoPastilla} />
        </View>

        <Text style={styles.profesional}>
          Profesional: {item.nombre_profesional}
          {`  ·  ${iconoModalidad(item.modalidad)} ${etiquetaModalidad(item.modalidad)}`}
        </Text>

        {/* CU21: si hay una solicitud abierta, la cita se responde aquí mismo. */}
        {solicitud && (
          <View style={styles.cajaConfirmar}>
            <Text style={styles.confirmarTitulo}>
              {solicitud.vencida ? '⌛ El enlace de confirmación venció' : '📅 Confirma tu asistencia'}
            </Text>
            <Text style={styles.confirmarTexto}>
              {solicitud.vencida
                ? 'Puedes responder igual desde aquí, o pedir que te reenviemos el correo.'
                : 'Te enviamos esta solicitud por correo y aquí. Responde para mantener tu hora reservada.'}
            </Text>
            <View style={styles.filaAcciones}>
              <TouchableOpacity
                style={[styles.botonConfirmar, confirmando && styles.botonDeshabilitado]}
                onPress={() => responderSolicitud(item, 'CONFIRMAR')}
                disabled={confirmando}
                activeOpacity={interaccion.opacidadActiva}
              >
                <Text style={styles.botonConfirmarTexto}>
                  {confirmando ? 'Guardando…' : '✓ Confirmar asistencia'}
                </Text>
              </TouchableOpacity>
            </View>
            {solicitud.vencida && (
              <TouchableOpacity onPress={() => pedirOtroEnlace(item)}>
                <Text style={styles.enlaceReenviar}>Enviarme un enlace nuevo</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

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
        <ActivityIndicator size="large" color={colores.primario} />
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
            colors={[colores.primario]}
          />
        }
        ListHeaderComponent={
          listasEspera.length > 0 ? (
            <View style={styles.bloqueEspera}>
              <Text style={styles.esperaTitulo}>En lista de espera</Text>
              {listasEspera.map((lista) => {
                const esMiTurno = lista.estado === 'NOTIFICADO';
                return (
                  <View
                    key={lista.lista_espera_id}
                    style={[styles.tarjetaEspera, esMiTurno && styles.tarjetaTurno]}
                  >
                    <Text style={styles.esperaFecha}>
                      {formatearFecha(lista.fecha_hora_inicio)} · {lista.profesional}
                    </Text>
                    <Text style={styles.esperaDato}>
                      {esMiTurno
                        ? '🎟️ ¡Es tu turno! El cupo se liberó y es tuyo si lo tomas ahora.'
                        : `Posición ${lista.posicion} de ${lista.en_espera} · ${lista.especialidad}`}
                    </Text>

                    {esMiTurno ? (
                      <TouchableOpacity
                        style={[
                          styles.botonTomarCupo,
                          tomandoCupo === lista.lista_espera_id && styles.botonDeshabilitado,
                        ]}
                        onPress={() => tomarCupo(lista)}
                        disabled={tomandoCupo === lista.lista_espera_id}
                        activeOpacity={interaccion.opacidadActiva}
                      >
                        <Text style={styles.botonTomarCupoTexto}>
                          {tomandoCupo === lista.lista_espera_id ? 'Reservando…' : 'Tomar el cupo'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={() => salirDeLista(lista)}>
                        <Text style={styles.enlaceSalir}>Salir de la lista</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          ) : null
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
    <DialogoAviso
      visible={aviso !== null}
      titulo={aviso?.titulo || ''}
      mensaje={aviso?.mensaje}
      tono={aviso?.tono}
      onCerrar={() => {
        const seguir = aviso?.alCerrar;
        setAviso(null);
        if (seguir) seguir();
      }}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  lista: { padding: 16, paddingBottom: 96 },

  card: {
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: 16,
    marginBottom: 12,
    ...sombra.suave,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  fecha: { flex: 1, fontSize: 15, fontWeight: 'bold', color: colores.texto, textTransform: 'capitalize' },
  estadoPastilla: { marginLeft: espacio.sm },
  profesional: { color: colores.textoSuave },

  filaAcciones: { flexDirection: 'row', gap: 10, marginTop: 12 },
  botonEvidencia: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colores.exito,
    borderRadius: radio.sm,
    padding: 10,
    alignItems: 'center',
  },
  botonEvidenciaTexto: { color: colores.exito, fontWeight: 'bold' },
  botonReprogramar: {
    flex: 1,
    borderWidth: 1,
    borderColor: colores.primario,
    borderRadius: radio.sm,
    padding: 10,
    alignItems: 'center',
  },
  botonReprogramarTexto: { color: colores.primario, fontWeight: 'bold' },
  botonCancelar: {
    flex: 1,
    borderWidth: 1,
    borderColor: colores.error,
    borderRadius: radio.sm,
    padding: 10,
    alignItems: 'center',
  },
  botonDeshabilitado: { opacity: 0.6 },
  botonCancelarTexto: { color: colores.error, fontWeight: 'bold' },

  vacio: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  vacioIcono: { fontSize: 48, marginBottom: 12 },
  vacioTitulo: { fontSize: 17, fontWeight: 'bold', color: colores.texto, marginBottom: 6 },
  vacioTexto: { color: colores.textoSuave, textAlign: 'center' },

  // CU21 — la solicitud de confirmación, dentro de la tarjeta de la cita.
  cajaConfirmar: {
    marginTop: espacio.md,
    padding: espacio.md,
    borderRadius: radio.md,
    backgroundColor: colores.primarioSuave,
    borderWidth: 1,
    borderColor: colores.primarioBorde,
  },
  confirmarTitulo: { ...tipografia.cuerpoFuerte, color: colores.primario },
  confirmarTexto: { ...tipografia.meta, color: colores.textoSuave, marginTop: 2, marginBottom: espacio.sm },
  botonConfirmar: {
    flex: 1,
    backgroundColor: colores.primario,
    borderRadius: radio.md,
    paddingVertical: espacio.md,
    alignItems: 'center',
  },
  botonConfirmarTexto: { ...tipografia.cuerpoFuerte, color: colores.textoInverso },
  enlaceReenviar: { ...tipografia.metaFuerte, color: colores.secundario, marginTop: espacio.sm },

  // CU19 — los bloques que el paciente está esperando.
  bloqueEspera: { marginBottom: espacio.lg },
  esperaTitulo: { ...tipografia.subtitulo, color: colores.textoTitulo, marginBottom: espacio.sm },
  tarjetaEspera: { ...piezas.tarjeta, marginBottom: espacio.md },
  // Cuando el cupo es suyo la tarjeta cambia de color: es una oportunidad con
  // plazo, no un dato más de la lista.
  tarjetaTurno: { borderColor: colores.exito, borderWidth: 1.5, backgroundColor: colores.exitoSuave },
  esperaFecha: { ...tipografia.cuerpoFuerte, color: colores.textoTitulo },
  esperaDato: { ...tipografia.meta, color: colores.textoSuave, marginTop: 2 },
  botonTomarCupo: {
    marginTop: espacio.sm,
    backgroundColor: colores.exito,
    borderRadius: radio.md,
    paddingVertical: espacio.md,
    alignItems: 'center',
  },
  botonTomarCupoTexto: { ...tipografia.cuerpoFuerte, color: colores.textoInverso },
  enlaceSalir: { ...tipografia.meta, color: colores.textoTenue, marginTop: espacio.sm },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: colores.primario,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: radio.completo,
    ...sombra.media,
  },
  fabTexto: { color: colores.superficie, fontWeight: 'bold', fontSize: 15 },
});
