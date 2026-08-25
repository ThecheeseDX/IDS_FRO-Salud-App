// Ruta: fro-vista/src/screens/Paciente/PagosScreen.js
//
// CU66: registro y validación de bonos de cobertura por cita.
// CU67: pago del copago en pasarela simulada y compra de planes de sesiones.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

import apiClient from '../../api/client';
import ErrorRetry from '../../components/ErrorRetry';
import VistaConTeclado from '../../components/VistaConTeclado';

const METODOS = [
  { valor: 'TARJETA_OK', etiqueta: 'Tarjeta terminada en 1111' },
  { valor: 'TARJETA_LENTA', etiqueta: 'Tarjeta terminada en 2222 (lenta)' },
  { valor: 'TARJETA_RECHAZADA', etiqueta: 'Tarjeta terminada en 9999 (sin fondos)' },
];

const pesos = (n) => `$${Number(n || 0).toLocaleString('es-CL')}`;

export default function PagosScreen() {
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [errorRed, setErrorRed] = useState(false);
  const [procesandoId, setProcesandoId] = useState(null);

  // Formulario de bono por cita (solo una abierta a la vez)
  const [bonoAbiertoEn, setBonoAbiertoEn] = useState(null);
  const [folio, setFolio] = useState('');
  const [financiadorId, setFinanciadorId] = useState('');

  // Método de pago por cita
  const [metodoPago, setMetodoPago] = useState('TARJETA_OK');

  // Compra de paquetes
  const [sesionesPlan, setSesionesPlan] = useState('4');
  const [metodoPlan, setMetodoPlan] = useState('TARJETA_OK');
  const [comprandoPlan, setComprandoPlan] = useState(false);

  const cargar = useCallback(async (esRefresco = false) => {
    if (esRefresco) setRefrescando(true);
    else setCargando(true);
    setErrorRed(false);
    try {
      const { data } = await apiClient.get('/pagos/resumen');
      setResumen(data);
      if (data.financiadores?.length > 0 && !financiadorId) {
        setFinanciadorId(String(data.financiadores[0].financiador_id));
      }
    } catch {
      // CU67 — Excepción 1: sin conexión la deuda se retiene; solo recargar.
      setErrorRed(true);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [financiadorId]);

  useEffect(() => {
    cargar();
  }, []);

  // ── CU66: registrar bono ───────────────────────────────────────────────────
  const registrarBono = async (cita) => {
    const folioLimpio = folio.trim().toUpperCase();
    // Excepción 1: validación local por expresión regular antes de enviar.
    if (!/^BON-\d{6}$/.test(folioLimpio)) {
      Alert.alert('Folio inválido', 'El folio debe tener el formato BON-XXXXXX (6 dígitos). Ej: BON-123456');
      return;
    }

    setProcesandoId(cita.cita_id);
    try {
      const { data } = await apiClient.post(`/pagos/citas/${cita.cita_id}/bono`, {
        folio: folioLimpio,
        financiador_id: Number(financiadorId),
      });
      Alert.alert(
        'Bono validado',
        `${data.mensaje}\n\nArancel: ${pesos(data.arancel)}\nCobertura: ${pesos(data.monto_cobertura)}\nTu copago: ${pesos(data.copago)}`
      );
      setBonoAbiertoEn(null);
      setFolio('');
      await cargar(true);
    } catch (err) {
      const respuesta = err.response?.data;
      Alert.alert('No se pudo validar', respuesta?.mensaje || respuesta?.error || 'Intenta nuevamente.');
      if (respuesta?.error === 'BONO_NO_VALIDADO') {
        setBonoAbiertoEn(null);
        setFolio('');
        await cargar(true);
      }
    } finally {
      setProcesandoId(null);
    }
  };

  // ── CU67: pagar copago ─────────────────────────────────────────────────────
  const pagar = async (cita) => {
    setProcesandoId(cita.cita_id);
    try {
      const { data } = await apiClient.post(`/pagos/citas/${cita.cita_id}/pagar`, {
        metodo_pago: metodoPago,
      });
      Alert.alert(data.estado === 'EN_TRANSITO' ? 'Pago en tránsito' : 'Pago realizado', data.mensaje);
      await cargar(true);
    } catch (err) {
      const respuesta = err.response?.data;
      Alert.alert('Pago no completado', respuesta?.mensaje || respuesta?.error || 'Intenta nuevamente.');
      await cargar(true);
    } finally {
      setProcesandoId(null);
    }
  };

  // ── CU67: comprar plan de sesiones ─────────────────────────────────────────
  const comprarPlan = async () => {
    setComprandoPlan(true);
    try {
      const { data } = await apiClient.post('/pagos/paquetes', {
        sesiones: Number(sesionesPlan),
        metodo_pago: metodoPlan,
      });
      Alert.alert('Plan activado', data.mensaje);
      await cargar(true);
    } catch (err) {
      const respuesta = err.response?.data;
      Alert.alert('Compra no completada', respuesta?.mensaje || respuesta?.error || 'Intenta nuevamente.');
    } finally {
      setComprandoPlan(false);
    }
  };

  const formatearFecha = (valor) =>
    new Date(valor).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });

  if (cargando) {
    return (
      <View style={estilos.centrado}>
        <ActivityIndicator size="large" color="#0052cc" />
      </View>
    );
  }

  if (errorRed) {
    return (
      <View style={estilos.centrado}>
        <ErrorRetry
          mensaje="No pudimos cargar tu información de pagos. Tu deuda no cambió: recarga cuando tengas señal."
          onRetry={() => cargar(false)}
        />
      </View>
    );
  }

  return (
    <VistaConTeclado
      style={estilos.fondo}
      contentContainerStyle={estilos.contenido}
      refreshControl={
        <RefreshControl refreshing={refrescando} onRefresh={() => cargar(true)} colors={['#0052cc']} />
      }
    >
      {/* ── Citas y sus pagos ── */}
      <Text style={estilos.seccion}>Mis citas y copagos</Text>
      <Text style={estilos.ayuda}>
        Arancel de la prestación: {pesos(resumen?.arancel)}. Registra tu bono para
        calcular el copago; sin bono, se paga el arancel completo.
      </Text>

      {resumen?.citas?.length === 0 ? (
        <Text style={estilos.sinDatos}>No tienes citas con cobros asociados.</Text>
      ) : (
        resumen.citas.map((cita) => {
          const procesando = procesandoId === cita.cita_id;
          const bonoValidado = cita.estado_validacion === 'VALIDADO';
          const enTransito = cita.transacciones?.some((t) => t.estado === 'EN_TRANSITO');

          return (
            <View key={cita.cita_id} style={estilos.tarjeta}>
              <View style={estilos.filaTitulo}>
                <Text style={estilos.tituloCita}>
                  {formatearFecha(cita.fecha_hora_inicio)}
                </Text>
                <Text style={[estilos.badge, { color: cita.pagada ? '#2e7d32' : '#ef6c00' }]}>
                  {cita.pagada ? 'PAGADA' : enTransito ? 'EN TRÁNSITO' : 'PENDIENTE'}
                </Text>
              </View>
              <Text style={estilos.detalle}>
                {cita.nombre_profesional} · cita {cita.estado.toLowerCase()}
              </Text>

              {/* Estado del bono */}
              {cita.folio ? (
                <Text style={estilos.detalle}>
                  Bono {cita.folio} ({cita.nombre_institucion}):{' '}
                  <Text style={{ color: bonoValidado ? '#2e7d32' : '#d32f2f', fontWeight: 'bold' }}>
                    {cita.estado_validacion}
                  </Text>
                  {bonoValidado ? ` · cobertura ${pesos(cita.monto_cobertura)}` : ''}
                </Text>
              ) : (
                <Text style={estilos.detalle}>Sin bono registrado.</Text>
              )}

              {!cita.pagada && (
                <Text style={estilos.copago}>Copago exigible: {pesos(cita.copago_exigible)}</Text>
              )}

              {/* Acciones */}
              {!cita.pagada && (
                <>
                  {!bonoValidado &&
                    ['AGENDADA', 'CONFIRMADA'].includes(cita.estado) &&
                    (bonoAbiertoEn === cita.cita_id ? (
                      <View style={estilos.formBono}>
                        <TextInput
                          style={estilos.input}
                          placeholder="Folio del bono (BON-123456)"
                          autoCapitalize="characters"
                          value={folio}
                          onChangeText={setFolio}
                        />
                        <View style={estilos.selector}>
                          <Picker selectedValue={financiadorId} onValueChange={(v) => setFinanciadorId(String(v))}>
                            {(resumen.financiadores || []).map((financiador) => (
                              <Picker.Item
                                key={financiador.financiador_id}
                                label={financiador.nombre_institucion}
                                value={String(financiador.financiador_id)}
                              />
                            ))}
                          </Picker>
                        </View>
                        <TouchableOpacity
                          style={[estilos.botonPrimario, procesando && estilos.deshabilitado]}
                          onPress={() => registrarBono(cita)}
                          disabled={procesando}
                        >
                          {procesando ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <Text style={estilos.botonPrimarioTexto}>Validar bono</Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setBonoAbiertoEn(null)}>
                          <Text style={estilos.enlace}>Cancelar</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={estilos.botonSecundario}
                        onPress={() => setBonoAbiertoEn(cita.cita_id)}
                      >
                        <Text style={estilos.botonSecundarioTexto}>
                          {cita.folio ? 'Reintentar bono' : 'Registrar bono'}
                        </Text>
                      </TouchableOpacity>
                    ))}

                  <View style={estilos.selector}>
                    <Picker selectedValue={metodoPago} onValueChange={setMetodoPago}>
                      {METODOS.map((m) => (
                        <Picker.Item key={m.valor} label={m.etiqueta} value={m.valor} />
                      ))}
                    </Picker>
                  </View>
                  <TouchableOpacity
                    style={[estilos.botonPrimario, procesando && estilos.deshabilitado]}
                    onPress={() => pagar(cita)}
                    disabled={procesando}
                  >
                    {procesando ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={estilos.botonPrimarioTexto}>
                        {enTransito ? 'Conciliar pago en tránsito' : `Pagar ${pesos(cita.copago_exigible)}`}
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          );
        })
      )}

      {/* ── Planes de sesiones ── */}
      <Text style={estilos.seccion}>Planes de sesiones</Text>
      <Text style={estilos.ayuda}>
        Compra sesiones por adelantado con 10% de descuento. Se descuentan
        automáticamente al finalizar cada atención.
      </Text>

      {(resumen?.paquetes || []).map((paquete) => (
        <View key={paquete.paquete_sesiones_id} style={estilos.tarjetaPlan}>
          <Text style={estilos.tituloPlan}>
            Plan de {paquete.sesiones_total} sesiones · {paquete.estado}
          </Text>
          <Text style={estilos.detalle}>
            Usadas {paquete.sesiones_usadas} de {paquete.sesiones_total} · {pesos(paquete.precio_total)}
          </Text>
        </View>
      ))}

      <View style={estilos.tarjeta}>
        <View style={estilos.selector}>
          <Picker selectedValue={sesionesPlan} onValueChange={setSesionesPlan}>
            <Picker.Item label="Plan de 4 sesiones" value="4" />
            <Picker.Item label="Plan de 8 sesiones" value="8" />
            <Picker.Item label="Plan de 12 sesiones" value="12" />
          </Picker>
        </View>
        <View style={estilos.selector}>
          <Picker selectedValue={metodoPlan} onValueChange={setMetodoPlan}>
            {METODOS.map((m) => (
              <Picker.Item key={m.valor} label={m.etiqueta} value={m.valor} />
            ))}
          </Picker>
        </View>
        <TouchableOpacity
          style={[estilos.botonPrimario, comprandoPlan && estilos.deshabilitado]}
          onPress={comprarPlan}
          disabled={comprandoPlan}
        >
          {comprandoPlan ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={estilos.botonPrimarioTexto}>Comprar plan</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={estilos.notaDemo}>
        Demo del financiador: un folio terminado en 9 simula rechazo biométrico y
        uno terminado en 0 simula un financiador caído (reintentos y espera).
      </Text>
    </VistaConTeclado>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#f4f6f8' },
  contenido: { padding: 16, paddingBottom: 40 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },

  seccion: { fontSize: 18, fontWeight: 'bold', color: '#1c3d5a', marginTop: 10, marginBottom: 6 },
  ayuda: { color: '#666', fontSize: 13, marginBottom: 12 },
  sinDatos: { color: '#777', fontStyle: 'italic', marginBottom: 10 },

  tarjeta: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 14,
    marginBottom: 12,
  },
  filaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tituloCita: { fontWeight: 'bold', color: '#1f2937', fontSize: 15, textTransform: 'capitalize' },
  badge: { fontWeight: 'bold', fontSize: 12, marginLeft: 8 },
  detalle: { color: '#555', fontSize: 13, marginTop: 3 },
  copago: { color: '#1c3d5a', fontWeight: 'bold', marginTop: 8, fontSize: 15 },

  formBono: { marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 11,
    marginBottom: 8,
  },
  selector: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 4,
    overflow: 'hidden',
  },

  botonPrimario: {
    backgroundColor: '#0052cc',
    borderRadius: 8,
    padding: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  botonPrimarioTexto: { color: '#fff', fontWeight: 'bold' },
  botonSecundario: {
    borderWidth: 1,
    borderColor: '#0052cc',
    borderRadius: 8,
    padding: 11,
    alignItems: 'center',
    marginTop: 10,
  },
  botonSecundarioTexto: { color: '#0052cc', fontWeight: 'bold' },
  deshabilitado: { opacity: 0.6 },
  enlace: { color: '#555', textAlign: 'center', marginTop: 10, fontWeight: '600' },

  tarjetaPlan: {
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    padding: 12,
    marginBottom: 8,
  },
  tituloPlan: { fontWeight: 'bold', color: '#1b5e20' },

  notaDemo: { color: '#999', fontSize: 11, textAlign: 'center', marginTop: 14, fontStyle: 'italic' },
});
