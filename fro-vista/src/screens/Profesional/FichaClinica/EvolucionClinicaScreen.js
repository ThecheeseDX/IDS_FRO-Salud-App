import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import apiClient from '../../../api/client';
import ErrorRetry from '../../../components/ErrorRetry';

// CU32 Paso 2.3: heurística de cuantificación (Excepción 1) — solo sugerencia de UX.
const PALABRAS_SUBJETIVAS = /\b(mejorar|mejor[íi]a|sentirse?\s+bien|bienestar|aliviar|alivio|fortalecer|avanzar|progresar|recuperar|estar\s+mejor|c[óo]modo|tranquil|m[áa]s\s+[áa]gil)/i;

// ─────────────────────────────────────────────────────────────────────────────
// CU32 — Evolución Clínica: Metas y avance terapéutico
// ─────────────────────────────────────────────────────────────────────────────
export default function EvolucionClinicaScreen({ route }) {
  const episodioIdParam = route?.params?.episodio_id;

  const [episodioId, setEpisodioId] = useState(episodioIdParam ? String(episodioIdParam) : '');

  // ── Listado de metas  ───────────────────────────────────────────
  const [metas, setMetas] = useState([]);
  const [isLoadingMetas, setIsLoadingMetas] = useState(false);
  const [errorRed, setErrorRed] = useState(false);

  // ── Crear objetivo ─────────────────────────────────────────────
  const [nuevoObjetivo, setNuevoObjetivo] = useState({ descripcion: '', meta_valor: '', unidad: '' });
  const [enviandoMeta, setEnviandoMeta] = useState(false);

  // ── Registrar avance ─────────────────────────────────────
  const [avance, setAvance] = useState({ objetivo_terapeutico_id: '', valor_actual: '' });
  const [avanceError, setAvanceError] = useState('');      //  Excepción 3
  const [enviandoAvance, setEnviandoAvance] = useState(false);
  const [avisoAsincrono, setAvisoAsincrono] = useState(false); //  Excepción 4

  // ── 2.2: GET metas + carga (Excepción 2) ──────────────────────────────────
  const cargarMetas = async () => {
    if (!episodioId) {
      Alert.alert('Falta el episodio', 'Indica el ID del episodio clínico para cargar sus metas.');
      return;
    }
    setIsLoadingMetas(true);
    setErrorRed(false);
    try {
      const { data } = await apiClient.get(`/clinica/episodio/${episodioId}/objetivos`);
      setMetas(data.objetivos || []);
    } catch (error) {
      if (error.response) {
        const err = error.response.data;
        if (error.response.status === 401) Alert.alert('Sesión inválida', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
        else if (error.response.status === 403) Alert.alert('Acceso denegado', err?.error || 'No tienes permisos para esta acción.');
        else Alert.alert('Error', err?.mensaje || err?.error || 'No se pudieron cargar las metas.');
      } else {
        setErrorRed(true);
      }
    } finally {
      setIsLoadingMetas(false);
    }
  };

  useEffect(() => {
    if (episodioIdParam) cargarMetas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─ 2.3: Crear meta con sugerencia de cuantificación (Excepción 1) ────────
  const handleCrearObjetivo = async () => {
    const descripcion = nuevoObjetivo.descripcion.trim();
    const metaValorTxt = nuevoObjetivo.meta_valor.trim();
    const unidad = nuevoObjetivo.unidad.trim();

    if (!episodioId) { Alert.alert('Falta el episodio', 'Carga primero un episodio clínico.'); return; }
    if (!descripcion) { Alert.alert('Campo requerido', 'Describe la meta clínica.'); return; }

    const sinCuantificar = metaValorTxt === '' || unidad === '';
    const pareceSubjetiva = PALABRAS_SUBJETIVAS.test(descripcion);

    if (pareceSubjetiva && sinCuantificar) {
      Alert.alert(
        'Meta poco medible',
        'La meta parece descriptiva (ej: "mejorar", "sentirse bien"). Para poder seguir el avance, define un valor numérico y una unidad de medida (ej: 30 grados, 10 repeticiones).',
        [{ text: 'Ajustar criterio' }]
      );
      return;
    }

    const metaNum = Number(metaValorTxt);
    if (metaValorTxt === '' || Number.isNaN(metaNum) || metaNum <= 0 || unidad === '') {
      Alert.alert('Meta no cuantificable', 'Indica un valor numérico mayor a 0 y una unidad de medida.');
      return;
    }

    setEnviandoMeta(true);
    try {
      const { data } = await apiClient.post(`/clinica/episodio/${episodioId}/objetivos`, {
        descripcion, meta_valor: metaNum, unidad
      });
      Alert.alert('Meta creada', data.mensaje || 'Objetivo definido correctamente.');
      setNuevoObjetivo({ descripcion: '', meta_valor: '', unidad: '' });
      cargarMetas();
    } catch (error) {
      if (error.response) {
        const err = error.response.data;
        if (error.response.status === 422) Alert.alert('Meta no cuantificable', err?.mensaje || 'Define un valor numérico y una unidad.');
        else if (error.response.status === 401) Alert.alert('Sesión inválida', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
        else if (error.response.status === 403) Alert.alert('Acceso denegado', err?.error || 'No tienes permisos para esta acción.');
        else Alert.alert('Error', err?.mensaje || err?.error || 'No se pudo crear la meta.');
      } else {
        Alert.alert('Sin conexión', 'No se pudo conectar con el servidor. Intenta nuevamente.');
      }
    } finally {
      setEnviandoMeta(false);
    }
  };

  // ── Helpers de avance ─────────────────────────────────────────────────────
  const objetivoSeleccionado = metas.find(
    (m) => String(m.objetivo_terapeutico_id) === String(avance.objetivo_terapeutico_id)
  );

  // 2.4 (Excepción 3): valida y BLOQUEA la entrada en tiempo real
  const onChangeValorAvance = (text) => {
    if (text === '') { setAvance({ ...avance, valor_actual: '' }); setAvanceError(''); return; }

    const limpio = text.replace(',', '.');
    if (!/^\d*\.?\d*$/.test(limpio)) return; // bloquea caracteres no numéricos

    const valorNum = Number(limpio);
    const metaValor = objetivoSeleccionado ? Number(objetivoSeleccionado.meta_valor) : null;

    if (metaValor !== null && valorNum > metaValor) {
      // Excepción 3: no actualizamos el estado (entrada bloqueada) + advertencia roja
      setAvanceError(`El valor no puede superar la meta (${metaValor} ${objetivoSeleccionado.unidad} = 100%).`);
      return;
    }

    setAvanceError('');
    setAvance({ ...avance, valor_actual: limpio });
  };

  // 2.5 (Excepción 4): repinta el panel gráfico; si el render local falla, avisa sin interrumpir
  const repintarPanel = (objetivoId, nuevoValor) => {
    setMetas((prev) =>
      prev.map((m) =>
        String(m.objetivo_terapeutico_id) === String(objetivoId)
          ? { ...m, valor_actual: nuevoValor }
          : m
      )
    );
  };

  const mostrarAvisoAsincrono = () => {
    setAvisoAsincrono(true);
    setTimeout(() => setAvisoAsincrono(false), 5000);
  };

  // 2.4 + 2.5: envío del avance
  const handleRegistrarAvance = async () => {
    const idObj = avance.objetivo_terapeutico_id;
    const valorTxt = String(avance.valor_actual).trim();

    if (!idObj) { Alert.alert('Selecciona un objetivo', 'Elige la meta a la que registrar el avance.'); return; }
    if (valorTxt === '') { Alert.alert('Campo requerido', 'Ingresa el valor medido alcanzado.'); return; }

    const valorNum = Number(valorTxt);
    const metaValor = objetivoSeleccionado ? Number(objetivoSeleccionado.meta_valor) : null;

    if (Number.isNaN(valorNum) || valorNum < 0) { Alert.alert('Valor inválido', 'El avance debe ser un número igual o mayor a 0.'); return; }
    if (metaValor !== null && valorNum > metaValor) {
      Alert.alert('Avance no válido', `No puede superar la meta (${metaValor} ${objetivoSeleccionado.unidad}).`);
      return;
    }

    setEnviandoAvance(true);
    try {
      const { data } = await apiClient.put(`/clinica/episodio/${episodioId}/avance`, {
        objetivo_terapeutico_id: Number(idObj),
        valor_actual: valorNum
      });

      // Backend OK (dato persistido). Ahora intentamos repintar el gráfico (Excepción 4).
      try {
        repintarPanel(idObj, valorNum);
      } catch (errRender) {
        // El dato YA se guardó; solo falló el render local → aviso no intrusivo.
        mostrarAvisoAsincrono();
      }

      Alert.alert('Avance registrado', `Cumplimiento actual: ${data.porcentaje_cumplimiento ?? '—'}%`);
      setAvance({ objetivo_terapeutico_id: '', valor_actual: '' });
      setAvanceError('');
    } catch (error) {
      if (error.response) {
        const err = error.response.data;
        if (error.response.status === 400 && err?.error === 'AVANCE_SUPERA_META') Alert.alert('Avance no válido', err.mensaje);
        else if (error.response.status === 404) Alert.alert('Objetivo no encontrado', err?.mensaje || 'La meta indicada no existe.');
        else if (error.response.status === 401) Alert.alert('Sesión inválida', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
        else if (error.response.status === 403) Alert.alert('Acceso denegado', err?.error || 'No tienes permisos para esta acción.');
        else Alert.alert('Error', err?.mensaje || err?.error || 'No se pudo registrar el avance.');
      } else {
        Alert.alert('Sin conexión', 'No se pudo conectar con el servidor. Intenta nuevamente.');
      }
    } finally {
      setEnviandoAvance(false);
    }
  };

  const camposBloqueados = isLoadingMetas;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* 2.5: aviso no intrusivo (Excepción 4) */}
        {avisoAsincrono && (
          <View style={styles.avisoBanner}>
            <Text style={styles.avisoBannerText}>
              ✅ La ficha clínica se guardó. La actualización gráfica asíncrona podría tardar.
            </Text>
          </View>
        )}

        <Text style={styles.title}>Evolución Clínica</Text>
        <Text style={styles.subtitulo}>Define metas cuantitativas y registra el avance de la sesión.</Text>

        {!episodioIdParam && (
          <View style={styles.seccion}>
            <Text style={styles.seccionTitulo}>Episodio activo</Text>
            <TextInput
              style={styles.input}
              placeholder="ID del episodio"
              keyboardType="numeric"
              value={episodioId}
              onChangeText={setEpisodioId}
            />
            <TouchableOpacity style={styles.boton} onPress={cargarMetas} disabled={isLoadingMetas}>
              {isLoadingMetas ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Cargar metas</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* 2.2 + 2.5: listado de metas = panel gráfico (barras de progreso) */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Objetivos del episodio</Text>

          {isLoadingMetas ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#0052cc" />
              <Text style={styles.loadingText}>Cargando historial de metas…</Text>
            </View>
          ) : errorRed ? (
            <ErrorRetry mensaje="No se pudo conectar con el servidor para traer las metas." onRetry={cargarMetas} />
          ) : metas.length === 0 ? (
            <Text style={styles.vacio}>Aún no hay objetivos definidos para este episodio.</Text>
          ) : (
            metas.map((m) => {
              const meta = Number(m.meta_valor) || 0;
              const actual = Number(m.valor_actual) || 0;
              const pct = meta > 0 ? Math.min(100, Math.round((actual / meta) * 100)) : 0;
              return (
                <View key={m.objetivo_terapeutico_id} style={styles.metaCard}>
                  <Text style={styles.metaDesc}>#{m.objetivo_terapeutico_id} · {m.descripcion}</Text>
                  <Text style={styles.metaValores}>{actual} / {meta} {m.unidad}  ·  {pct}%</Text>
                  <View style={styles.barraFondo}>
                    <View style={[styles.barraProgreso, { width: `${pct}%` }]} />
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* 2.3: crear objetivo */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Definir nueva meta</Text>
          <TextInput
            style={styles.input}
            placeholder="Descripción de la meta (ej: aumentar rango articular)"
            value={nuevoObjetivo.descripcion}
            editable={!camposBloqueados && !enviandoMeta}
            onChangeText={(v) => setNuevoObjetivo({ ...nuevoObjetivo, descripcion: v })}
          />
          <TextInput
            style={styles.input}
            placeholder="Valor meta (ej: 30)"
            keyboardType="numeric"
            value={nuevoObjetivo.meta_valor}
            editable={!camposBloqueados && !enviandoMeta}
            onChangeText={(v) => setNuevoObjetivo({ ...nuevoObjetivo, meta_valor: v })}
          />
          <TextInput
            style={styles.input}
            placeholder="Unidad (ej: grados, repeticiones)"
            value={nuevoObjetivo.unidad}
            editable={!camposBloqueados && !enviandoMeta}
            onChangeText={(v) => setNuevoObjetivo({ ...nuevoObjetivo, unidad: v })}
          />
          <TouchableOpacity
            style={[styles.boton, { backgroundColor: '#2e7d32' }, (camposBloqueados || enviandoMeta) && styles.botonOff]}
            onPress={handleCrearObjetivo}
            disabled={camposBloqueados || enviandoMeta}
          >
            {enviandoMeta ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Guardar meta</Text>}
          </TouchableOpacity>
        </View>

        {/* 2.4: registrar avance con bloqueo de entrada (Excepción 3) */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Registrar avance de la sesión</Text>

          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={avance.objetivo_terapeutico_id}
              enabled={!camposBloqueados && !enviandoAvance && metas.length > 0}
              onValueChange={(val) => { setAvance({ objetivo_terapeutico_id: val, valor_actual: '' }); setAvanceError(''); }}
            >
              <Picker.Item label="Selecciona un objetivo…" value="" />
              {metas.map((m) => (
                <Picker.Item
                  key={m.objetivo_terapeutico_id}
                  label={`#${m.objetivo_terapeutico_id} · ${m.descripcion} (meta ${m.meta_valor} ${m.unidad})`}
                  value={String(m.objetivo_terapeutico_id)}
                />
              ))}
            </Picker>
          </View>

          <TextInput
            style={[styles.input, avanceError ? styles.inputError : null]}
            placeholder={objetivoSeleccionado ? `Valor medido (máx ${objetivoSeleccionado.meta_valor} ${objetivoSeleccionado.unidad})` : 'Valor medido alcanzado'}
            keyboardType="numeric"
            value={avance.valor_actual}
            editable={!camposBloqueados && !enviandoAvance}
            onChangeText={onChangeValorAvance}
          />
          {avanceError ? <Text style={styles.errorText}>{avanceError}</Text> : null}

          <TouchableOpacity
            style={[styles.boton, (camposBloqueados || enviandoAvance) && styles.botonOff]}
            onPress={handleRegistrarAvance}
            disabled={camposBloqueados || enviandoAvance}
          >
            {enviandoAvance ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Registrar avance</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  inputError: { borderColor: '#d32f2f', backgroundColor: '#fff0f0' },
  errorText: { color: '#d32f2f', fontSize: 12, marginTop: -6, marginBottom: 12 },
  boton: { backgroundColor: '#0052cc', padding: 14, borderRadius: 10, alignItems: 'center' },
  botonOff: { opacity: 0.5 },
  botonTexto: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  loadingBox: { paddingVertical: 24, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666', fontSize: 14 },
  vacio: { color: '#888', fontStyle: 'italic', textAlign: 'center', paddingVertical: 10 },
  metaCard: {
    backgroundColor: '#f0f6ff', padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#d6e4ff', marginBottom: 10
  },
  metaDesc: { fontSize: 15, fontWeight: '600', color: '#1c3d5a', marginBottom: 4 },
  metaValores: { fontSize: 13, color: '#444', marginBottom: 8 },
  barraFondo: { height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, overflow: 'hidden' },
  barraProgreso: { height: 8, backgroundColor: '#0052cc', borderRadius: 4 },
  pickerWrap: { borderWidth: 1, borderColor: '#ccc', backgroundColor: '#f9f9f9', borderRadius: 10, marginBottom: 12 },
  avisoBanner: { backgroundColor: '#fff8e1', borderWidth: 1, borderColor: '#ffe082', borderRadius: 10, padding: 12, marginBottom: 16 },
  avisoBannerText: { color: '#8d6e00', fontSize: 13, textAlign: 'center' }
});