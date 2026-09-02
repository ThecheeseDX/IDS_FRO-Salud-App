// Ruta: fro-vista/src/screens/Paciente/MisPautasScreen.js
//
// CU48: el paciente marca a diario los ejercicios que completó.
// CU49: las pautas expiradas quedan cerradas y su material deja de mostrarse.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import apiClient from '../../api/client';
import { formatearFecha, formatearFechaHora } from '../../utils/fechas';
import ErrorRetry from '../../components/ErrorRetry';
import VistaConTeclado from '../../components/VistaConTeclado';

// CU48 — Excepción 2: última pauta que cargó bien, para mostrarla sin señal.
const CLAVE_CACHE = 'cu48_cache_pautas';

export default function MisPautasScreen() {
  const [pautas, setPautas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [errorRed, setErrorRed] = useState(false);
  const [marcandoId, setMarcandoId] = useState(null);
  // Fecha en que se guardó la copia local que se está mostrando (null = datos en vivo).
  const [desdeCache, setDesdeCache] = useState(null);

  const cargarPautas = useCallback(async (esRefresco = false) => {
    if (esRefresco) setRefrescando(true);
    else setCargando(true);
    setErrorRed(false);

    try {
      const { data } = await apiClient.get('/clinica/pautas/mis-pautas');
      const lista = data?.pautas || [];
      setPautas(lista);
      setDesdeCache(null);
      // Cada carga exitosa deja una copia local: es lo que se muestra sin señal.
      AsyncStorage.setItem(
        CLAVE_CACHE,
        JSON.stringify({ pautas: lista, guardadoEn: new Date().toISOString() })
      ).catch(() => {});
    } catch {
      // CU48 — Excepción 2: falla de comunicación → se activa la caché local.
      // Si hay copia, se muestra (solo lectura) con la fecha en que se guardó;
      // si no la hay, se ofrece recargar.
      try {
        const copia = await AsyncStorage.getItem(CLAVE_CACHE);
        if (copia) {
          const { pautas: guardadas, guardadoEn } = JSON.parse(copia);
          setPautas(guardadas || []);
          setDesdeCache(guardadoEn || 'desconocida');
          return;
        }
      } catch {
        // caché ilegible: se cae al aviso de recarga
      }
      setErrorRed(true);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    cargarPautas();
  }, [cargarPautas]);

  // ── CU48: marcar / desmarcar el día de hoy ─────────────────────────────────
  const alternarCumplimiento = async (ejercicio) => {
    // Sin conexión no se puede registrar: la marca necesita llegar al servidor.
    if (desdeCache) {
      Alert.alert('Sin conexión', 'Estás viendo tu pauta guardada. Recarga la lista cuando vuelva la señal para marcar ejercicios.');
      return;
    }
    // Anti-rebote local: mientras hay una marca en vuelo se ignoran más toques.
    if (marcandoId !== null) return;
    setMarcandoId(ejercicio.pauta_ejercicio_id);

    try {
      if (ejercicio.cumplido_hoy) {
        await apiClient.delete(`/clinica/pautas/ejercicios/${ejercicio.pauta_ejercicio_id}/cumplimiento`);
      } else {
        await apiClient.post(`/clinica/pautas/ejercicios/${ejercicio.pauta_ejercicio_id}/cumplimiento`);
      }
      await cargarPautas(true);
    } catch (err) {
      const respuesta = err.response?.data;
      Alert.alert('No se pudo registrar', respuesta?.mensaje || respuesta?.error || 'Intenta nuevamente.');
    } finally {
      setMarcandoId(null);
    }
  };

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
          mensaje="No pudimos cargar tus ejercicios. Revisa tu conexión y recarga la lista."
          onRetry={() => cargarPautas(false)}
        />
      </View>
    );
  }

  return (
    <VistaConTeclado
      style={estilos.fondo}
      contentContainerStyle={estilos.contenido}
      refreshControl={
        <RefreshControl refreshing={refrescando} onRefresh={() => cargarPautas(true)} colors={['#0052cc']} />
      }
    >
      {desdeCache && (
        <View style={estilos.avisoCache}>
          <Text style={estilos.avisoCacheTexto}>
            📴 Sin conexión. Mostrando tu pauta guardada el {formatearFechaHora(desdeCache, 'fecha desconocida')}.
            Desliza hacia abajo para recargar cuando vuelva la señal.
          </Text>
        </View>
      )}

      {pautas.length === 0 ? (
        // CU48 — Excepción 1: sin rutinas en el rango actual.
        <View style={estilos.vacio}>
          <Text style={estilos.vacioIcono}>🏋️</Text>
          <Text style={estilos.vacioTitulo}>No tienes ejercicios asignados</Text>
          <Text style={estilos.vacioTexto}>
            Cuando tu profesional te prescriba una pauta, aparecerá aquí.
          </Text>
        </View>
      ) : (
        pautas.map((pauta) => {
          const expirada = pauta.estado === 'EXPIRADA';
          const programada = pauta.estado === 'PROGRAMADA';

          return (
            <View key={pauta.pauta_tratamiento_id} style={[estilos.tarjeta, expirada && estilos.tarjetaExpirada]}>
              <View style={estilos.filaTitulo}>
                <Text style={estilos.pautaNombre}>
                  {expirada ? '🔒 ' : ''}{pauta.nombre}
                </Text>
                <Text
                  style={[
                    estilos.badge,
                    { color: expirada ? '#9e9e9e' : programada ? '#0052cc' : '#2e7d32' },
                  ]}
                >
                  {pauta.estado}
                </Text>
              </View>
              <Text style={estilos.pautaFechas}>
                {formatearFecha(pauta.fecha_inicio)} → {formatearFecha(pauta.fecha_expiracion)}
              </Text>

              {expirada ? (
                // CU49: el contenido de una pauta vencida queda resguardado.
                <Text style={estilos.textoExpirada}>
                  Esta pauta terminó y su contenido quedó cerrado. Si necesitas continuar,
                  pídele a tu profesional una pauta nueva.
                </Text>
              ) : programada ? (
                <Text style={estilos.textoProgramada}>
                  Esta pauta comienza el {formatearFecha(pauta.fecha_inicio)}. Aún no puedes marcar ejercicios.
                </Text>
              ) : (
                pauta.ejercicios.map((ejercicio) => (
                  <TouchableOpacity
                    key={ejercicio.pauta_ejercicio_id}
                    style={[estilos.filaEjercicio, ejercicio.cumplido_hoy && estilos.filaCumplida]}
                    onPress={() => alternarCumplimiento(ejercicio)}
                    disabled={marcandoId !== null || desdeCache !== null}
                  >
                    <Text style={estilos.checkbox}>
                      {marcandoId === ejercicio.pauta_ejercicio_id
                        ? '⏳'
                        : ejercicio.cumplido_hoy
                          ? '✅'
                          : '⬜'}
                    </Text>
                    <View style={estilos.ejercicioInfo}>
                      <Text style={estilos.ejercicioNombre}>{ejercicio.nombre_ejercicio}</Text>
                      <Text style={estilos.ejercicioDetalle}>
                        {ejercicio.series} series × {ejercicio.repeticiones} repeticiones ·{' '}
                        {ejercicio.frecuencia.toLowerCase()}
                        {ejercicio.material_nombre ? `\n📚 ${ejercicio.material_nombre}` : ''}
                      </Text>
                      <Text style={estilos.adherencia}>
                        Llevas {ejercicio.dias_cumplidos} día(s) registrado(s)
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          );
        })
      )}

      <Text style={estilos.notaPie}>
        Marca cada ejercicio el día que lo completes. Solo puedes registrar el día de hoy.
      </Text>
    </VistaConTeclado>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#f4f6f8' },
  contenido: { padding: 16, paddingBottom: 40 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },

  avisoCache: {
    backgroundColor: '#fff4e5',
    borderWidth: 1,
    borderColor: '#ffcc80',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  avisoCacheTexto: { color: '#8a4b00', fontSize: 13, lineHeight: 18 },
  vacio: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  vacioIcono: { fontSize: 48, marginBottom: 12 },
  vacioTitulo: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  vacioTexto: { color: '#666', textAlign: 'center' },

  tarjeta: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 14,
    marginBottom: 14,
  },
  tarjetaExpirada: { backgroundColor: '#f5f5f5' },
  filaTitulo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pautaNombre: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', flex: 1 },
  badge: { fontWeight: 'bold', fontSize: 12, marginLeft: 8 },
  pautaFechas: { color: '#777', fontSize: 12, marginBottom: 10 },

  textoExpirada: { color: '#757575', fontStyle: 'italic' },
  textoProgramada: { color: '#0052cc', fontStyle: 'italic' },

  filaEjercicio: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  filaCumplida: { backgroundColor: '#e8f5e9', borderColor: '#c8e6c9' },
  checkbox: { fontSize: 22, marginRight: 12 },
  ejercicioInfo: { flex: 1 },
  ejercicioNombre: { fontWeight: 'bold', color: '#1f2937' },
  ejercicioDetalle: { color: '#666', fontSize: 13, marginTop: 2 },
  adherencia: { color: '#2e7d32', fontSize: 12, marginTop: 4, fontWeight: '600' },

  notaPie: { color: '#888', fontSize: 12, textAlign: 'center', marginTop: 8 },
});
