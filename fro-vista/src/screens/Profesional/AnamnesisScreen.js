// Ruta: fro-vista/src/screens/Profesional/AnamnesisScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { getFichaClinica, guardarAnamnesis } from '../../api/client';

const LIMITE_ANAMNESIS = 2000;

export default function AnamnesisScreen({ route, navigation }) {
  const { pacienteId, nombrePaciente } = route.params;

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [version, setVersion] = useState(null);

  const [anamnesis, setAnamnesis] = useState('');
  const [plantillaEspecialidad, setPlantillaEspecialidad] = useState('');

  // Listas representadas como texto separado por comas para edición simple
  const [alergiasTexto, setAlergiasTexto] = useState('');
  const [quirurgicosTexto, setQuirurgicosTexto] = useState('');
  const [patologicosTexto, setPatologicosTexto] = useState('');

  // ── Excepción 2: campos obligatorios resaltados ──────────────────────────
  const [errores, setErrores] = useState({});

  // ── Excepción 1: aviso de truncado ───────────────────────────────────────
  const [avisoTruncado, setAvisoTruncado] = useState('');

  const cargarFicha = async () => {
    setCargando(true);
    try {
      const data = await getFichaClinica(pacienteId);
      setAnamnesis(data.anamnesis || '');
      setPlantillaEspecialidad(data.plantilla_especialidad || '');
      setAlergiasTexto((data.alergias || []).join(', '));
      setQuirurgicosTexto((data.antecedentes_quirurgicos || []).join(', '));
      setPatologicosTexto((data.antecedentes_patologicos || []).join(', '));
      setVersion(data.version);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar la ficha clínica del paciente.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarFicha();
  }, []);

  // ── Excepción 1: truncado en tiempo real ─────────────────────────────────
  const manejarCambioAnamnesis = (texto) => {
    if (texto.length > LIMITE_ANAMNESIS) {
      setAnamnesis(texto.slice(0, LIMITE_ANAMNESIS));
      setAvisoTruncado(`Se alcanzó el límite de ${LIMITE_ANAMNESIS} caracteres.`);
    } else {
      setAnamnesis(texto);
      if (avisoTruncado) setAvisoTruncado('');
    }
    if (errores.anamnesis) setErrores({ ...errores, anamnesis: false });
  };

  const parsearLista = (texto) =>
    texto.split(',').map((s) => s.trim()).filter((s) => s.length > 0);

  // ── Excepción 2: validación de campos obligatorios ───────────────────────
  const validar = () => {
    const nuevosErrores = {};
    if (!anamnesis.trim()) nuevosErrores.anamnesis = true;
    if (!plantillaEspecialidad.trim()) nuevosErrores.plantillaEspecialidad = true;

    setErrores(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) {
      Alert.alert(
        'Campos incompletos',
        'Existen campos obligatorios sin completar. Revisa los bloques resaltados.'
      );
      return false;
    }
    return true;
  };

  // ── Guardar (CU29 flujo principal) ───────────────────────────────────────
  const guardar = async () => {
    if (!validar()) return;

    setGuardando(true);
    try {
      const data = await guardarAnamnesis({
        paciente_id: pacienteId,
        anamnesis,
        plantilla_especialidad: plantillaEspecialidad,
        alergias: parsearLista(alergiasTexto),
        antecedentes_quirurgicos: parsearLista(quirurgicosTexto),
        antecedentes_patologicos: parsearLista(patologicosTexto),
        version
      });

      if (data.truncado) {
        Alert.alert(
          'Texto truncado',
          `La anamnesis excedía el límite de ${data.limite_anamnesis} caracteres y fue truncada.`
        );
      }

      setVersion(data.version);
      Alert.alert('Éxito', data.mensaje);

    } catch (error) {
      const err = error.response?.data;

      // ── Excepción 3: colisión de escritura ─────────────────────────────
      if (error.response?.status === 409 && err?.error === 'COLISION_ESCRITURA') {
        Alert.alert(
          'Conflicto de edición',
          err.mensaje,
          [{ text: 'Recargar', onPress: cargarFicha }]
        );
        return;
      }

      // ── Excepción 2: backend detectó campos faltantes ───────────────────
      if (error.response?.status === 400 && err?.error === 'CAMPOS_OBLIGATORIOS_FALTANTES') {
        const nuevosErrores = {};
        if (err.campos.includes('anamnesis')) nuevosErrores.anamnesis = true;
        if (err.campos.includes('plantilla_especialidad')) nuevosErrores.plantillaEspecialidad = true;
        setErrores(nuevosErrores);
        Alert.alert('Campos incompletos', err.mensaje);
        return;
      }

      if (error.response?.status === 401) {
        Alert.alert('Sesión expirada', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
        return;
      }

      if (error.response?.status === 403) {
        Alert.alert('Acceso denegado', err?.error || 'No tienes permisos para esta acción.');
        return;
      }

      if (err?.error === 'FALLO_BITACORA') {
        Alert.alert('Error de auditoría', err.mensaje);
        return;
      }

      Alert.alert('Error', err?.error || 'No se pudo guardar la anamnesis. Intenta nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#0052cc" />
        <Text style={styles.cargandoTexto}>Cargando ficha clínica...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.title}>Evaluación Inicial — Anamnesis</Text>
        <Text style={styles.subtitulo}>Paciente: {nombrePaciente}</Text>

        {/* ── Plantilla / especialidad ─────────────────────────────────── */}
        <Text style={styles.label}>Plantilla de especialidad *</Text>
        <TextInput
          style={[styles.input, errores.plantillaEspecialidad && styles.inputError]}
          placeholder="Ej: Kinesiología Respiratoria"
          value={plantillaEspecialidad}
          onChangeText={(v) => {
            setPlantillaEspecialidad(v);
            if (errores.plantillaEspecialidad) setErrores({ ...errores, plantillaEspecialidad: false });
          }}
        />
        {errores.plantillaEspecialidad && (
          <Text style={styles.errorTexto}>Este campo es obligatorio.</Text>
        )}

        {/* ── Anamnesis ─────────────────────────────────────────────────── */}
        <Text style={styles.label}>Anamnesis *</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            errores.anamnesis && styles.inputError
          ]}
          placeholder="Describe la anamnesis del paciente..."
          multiline
          numberOfLines={6}
          value={anamnesis}
          onChangeText={manejarCambioAnamnesis}
        />
        <Text style={styles.contador}>
          {anamnesis.length} / {LIMITE_ANAMNESIS}
        </Text>
        {errores.anamnesis && (
          <Text style={styles.errorTexto}>Este campo es obligatorio.</Text>
        )}
        {avisoTruncado !== '' && (
          <Text style={styles.avisoTruncado}>{avisoTruncado}</Text>
        )}

        {/* ── Alergias ──────────────────────────────────────────────────── */}
        <Text style={styles.label}>Antecedentes alérgicos</Text>
        <TextInput
          style={[styles.input, styles.textAreaPeque]}
          placeholder="Separar con comas, ej: Penicilina, Polen"
          multiline
          value={alergiasTexto}
          onChangeText={setAlergiasTexto}
        />

        {/* ── Antecedentes quirúrgicos ──────────────────────────────────── */}
        <Text style={styles.label}>Antecedentes quirúrgicos</Text>
        <TextInput
          style={[styles.input, styles.textAreaPeque]}
          placeholder="Separar con comas, ej: Apendicectomía 2018"
          multiline
          value={quirurgicosTexto}
          onChangeText={setQuirurgicosTexto}
        />

        {/* ── Antecedentes patológicos ─────────────────────────────────── */}
        <Text style={styles.label}>Antecedentes patológicos</Text>
        <TextInput
          style={[styles.input, styles.textAreaPeque]}
          placeholder="Separar con comas, ej: Hipertensión, Diabetes tipo 2"
          multiline
          value={patologicosTexto}
          onChangeText={setPatologicosTexto}
        />

        {/* ── Guardar ───────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.boton, guardando && styles.botonDeshabilitado]}
          onPress={guardar}
          disabled={guardando}
        >
          {guardando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.botonTexto}>Guardar Anamnesis</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cargandoTexto: { marginTop: 10, color: '#666' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1c3d5a', marginBottom: 4 },
  subtitulo: { fontSize: 14, color: '#888', marginBottom: 20 },
  label: { fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 12, fontSize: 14 },
  input: {
    borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff',
    padding: 12, borderRadius: 10, fontSize: 15
  },
  textArea: { minHeight: 140, textAlignVertical: 'top' },
  textAreaPeque: { minHeight: 70, textAlignVertical: 'top' },
  inputError: { borderColor: '#d32f2f', borderWidth: 2, backgroundColor: '#fff0f0' },
  errorTexto: { color: '#d32f2f', fontSize: 12, marginTop: 4 },
  contador: { textAlign: 'right', color: '#999', fontSize: 12, marginTop: 4 },
  avisoTruncado: { color: '#e65100', fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  boton: {
    backgroundColor: '#2e7d32', padding: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 28
  },
  botonDeshabilitado: { opacity: 0.6 },
  botonTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});