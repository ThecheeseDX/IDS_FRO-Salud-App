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

import apiClient from '../../api/client';
import ErrorRetry from '../../components/ErrorRetry';
import VistaConTeclado from '../../components/VistaConTeclado';

export default function MisPautasScreen() {
  const [pautas, setPautas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [errorRed, setErrorRed] = useState(false);
  const [marcandoId, setMarcandoId] = useState(null);

  const cargarPautas = useCallback(async (esRefresco = false) => {
    if (esRefresco) setRefrescando(true);
    else setCargando(true);
    setErrorRed(false);

    try {
      const { data } = await apiClient.get('/clinica/pautas/mis-pautas');
      setPautas(data?.pautas || []);
    } catch {
      // CU48 — Excepción 2: sin conexión se ofrece recargar la lista.
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
                {pauta.fecha_inicio} → {pauta.fecha_expiracion}
              </Text>

              {expirada ? (
                // CU49: el contenido de una pauta vencida queda resguardado.
                <Text style={estilos.textoExpirada}>
                  Esta pauta terminó y su contenido quedó cerrado. Si necesitas continuar,
                  pídele a tu profesional una pauta nueva.
                </Text>
              ) : programada ? (
                <Text style={estilos.textoProgramada}>
                  Esta pauta comienza el {pauta.fecha_inicio}. Aún no puedes marcar ejercicios.
                </Text>
              ) : (
                pauta.ejercicios.map((ejercicio) => (
                  <TouchableOpacity
                    key={ejercicio.pauta_ejercicio_id}
                    style={[estilos.filaEjercicio, ejercicio.cumplido_hoy && estilos.filaCumplida]}
                    onPress={() => alternarCumplimiento(ejercicio)}
                    disabled={marcandoId !== null}
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
