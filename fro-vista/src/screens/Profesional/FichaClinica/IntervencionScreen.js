import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as SecureStore from 'expo-secure-store';

import {
  getIntervencion,
  getSesionesIntervencion,
  guardarIntervencion,
} from '../../../api/client';
import ErrorRetry from '../../../components/ErrorRetry';
import VistaConTeclado from '../../../components/VistaConTeclado';

const PATRON_ALERTA_PRIORITARIA =
  /\b(dolor\s+(intenso|severo|insoportable)|dificultad\s+respiratoria|p[eé]rdida\s+de\s+conciencia|desmayo|convulsi[oó]n|deterioro\s+(grave|severo)|signos?\s+vitales?\s+inestables?)\b/i;

const claveBorrador = (episodioId) => `cu40_borrador_${episodioId}`;

export default function IntervencionScreen() {
  const [sesiones, setSesiones] = useState([]);
  const [episodioId, setEpisodioId] = useState('');
  const [contexto, setContexto] = useState(null);
  const [tecnicasAplicadas, setTecnicasAplicadas] = useState('');
  const [respuestaFisiologica, setRespuestaFisiologica] = useState('');
  const [cargandoSesiones, setCargandoSesiones] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);

  const textoCompleto = `${tecnicasAplicadas} ${respuestaFisiologica}`;
  const posibleDeterioro = useMemo(
    () => PATRON_ALERTA_PRIORITARIA.test(textoCompleto),
    [textoCompleto]
  );

  const cargarSesiones = async () => {
    setCargandoSesiones(true);
    setErrorCarga(false);
    try {
      const data = await getSesionesIntervencion();
      setSesiones(data.sesiones || []);
    } catch (error) {
      setErrorCarga(true);
    } finally {
      setCargandoSesiones(false);
    }
  };

  useEffect(() => {
    cargarSesiones();
  }, []);

  const seleccionarEpisodio = async (valor) => {
    setEpisodioId(valor);
    setContexto(null);
    setTecnicasAplicadas('');
    setRespuestaFisiologica('');

    if (!valor) return;

    setCargandoDetalle(true);
    try {
      const data = await getIntervencion(valor);
      setContexto(data.contexto);

      const borradorGuardado = await SecureStore.getItemAsync(claveBorrador(valor));
      const borrador = borradorGuardado ? JSON.parse(borradorGuardado) : null;

      setTecnicasAplicadas(
        borrador?.tecnicas_aplicadas ?? data.evolucion?.tecnicas_aplicadas ?? ''
      );
      setRespuestaFisiologica(
        borrador?.respuesta_fisiologica ??
          data.evolucion?.respuesta_fisiologica ??
          ''
      );

      if (borrador) {
        Alert.alert(
          'Borrador recuperado',
          'Se recuperó el contenido guardado localmente para esta sesión.'
        );
      }
    } catch (error) {
      Alert.alert(
        'No fue posible cargar la sesión',
        error.response?.data?.mensaje || 'Revisa la conexión e intenta nuevamente.'
      );
    } finally {
      setCargandoDetalle(false);
    }
  };

  const guardarBorradorLocal = async () => {
    if (!episodioId) return;
    await SecureStore.setItemAsync(
      claveBorrador(episodioId),
      JSON.stringify({
        tecnicas_aplicadas: tecnicasAplicadas,
        respuesta_fisiologica: respuestaFisiologica,
      })
    );
  };

  const handleGuardar = async () => {
    if (!tecnicasAplicadas.trim() || !respuestaFisiologica.trim()) {
      Alert.alert(
        'Campos obligatorios',
        'Documenta las técnicas aplicadas y la respuesta fisiológica.'
      );
      return;
    }

    if (posibleDeterioro) {
      Alert.alert(
        'Posible deterioro clínico grave',
        'El texto contiene indicadores que requieren revisión prioritaria. Confirma la condición y activa el protocolo clínico correspondiente.',
        [
          { text: 'Revisar texto', style: 'cancel' },
          { text: 'Confirmar y guardar', onPress: ejecutarGuardado },
        ]
      );
      return;
    }

    await ejecutarGuardado();
  };

  const ejecutarGuardado = async () => {
    setGuardando(true);
    try {
      const data = await guardarIntervencion(episodioId, {
        tecnicas_aplicadas: tecnicasAplicadas.trim(),
        respuesta_fisiologica: respuestaFisiologica.trim(),
      });

      await SecureStore.deleteItemAsync(claveBorrador(episodioId));

      Alert.alert(
        data.alerta_prioritaria ? 'Registro con alerta prioritaria' : 'Registro guardado',
        data.alerta_prioritaria
          ? 'La intervención fue guardada. Activa el protocolo clínico prioritario.'
          : data.mensaje
      );
    } catch (error) {
      if (!error.response) {
        await guardarBorradorLocal();
        Alert.alert(
          'Sin conexión',
          'El contenido quedó guardado como borrador local. Podrás sincronizarlo al recuperar la conexión.'
        );
      } else {
        Alert.alert(
          'No fue posible guardar',
          error.response.data?.mensaje || 'Intenta nuevamente.'
        );
      }
    } finally {
      setGuardando(false);
    }
  };

  const editable = contexto?.editable === true;
  const etiquetaEspecialidad = contexto?.especialidad || 'General';

  return (
    <VistaConTeclado style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Intervención y respuesta fisiológica</Text>
      <Text style={styles.subtitle}>
        Registra las técnicas y ejercicios ejecutados durante la sesión.
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Sesión clínica</Text>

        {cargandoSesiones ? (
          <ActivityIndicator size="large" color="#2e7d32" />
        ) : errorCarga ? (
          <ErrorRetry
            mensaje="No fue posible recuperar las sesiones."
            onRetry={cargarSesiones}
          />
        ) : (
          <View style={styles.pickerContainer}>
            <Picker selectedValue={episodioId} onValueChange={seleccionarEpisodio}>
              <Picker.Item label="Selecciona un episodio..." value="" />
              {sesiones.map((sesion) => (
                <Picker.Item
                  key={sesion.episodio_clinico_id}
                  label={`#${sesion.episodio_clinico_id} - ${sesion.paciente} (${sesion.estado_cita || 'SIN SESIÓN ACTIVA'})`}
                  value={String(sesion.episodio_clinico_id)}
                />
              ))}
            </Picker>
          </View>
        )}
      </View>

      {cargandoDetalle && (
        <ActivityIndicator size="large" color="#2e7d32" style={styles.loading} />
      )}

      {contexto && !cargandoDetalle && (
        <>
          <View style={styles.patientCard}>
            <Text style={styles.patientName}>{contexto.paciente}</Text>
            <Text>Especialidad: {etiquetaEspecialidad}</Text>
            <Text>Motivo: {contexto.motivo_consulta}</Text>
            <Text style={editable ? styles.activeState : styles.readOnlyState}>
              {contexto.mensaje_estado}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Técnicas y ejercicios de {etiquetaEspecialidad}
            </Text>
            <Text style={styles.helper}>
              Detalla técnica, ejercicio, dosificación, duración y observaciones.
            </Text>
            <TextInput
              style={[styles.textArea, !editable && styles.disabledInput]}
              multiline
              textAlignVertical="top"
              editable={editable && !guardando}
              placeholder="Ej.: técnica aplicada, series, repeticiones y tolerancia..."
              value={tecnicasAplicadas}
              onChangeText={setTecnicasAplicadas}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Respuesta fisiológica observada</Text>
            <Text style={styles.helper}>
              Registra signos, síntomas, tolerancia y cambios observados.
            </Text>
            <TextInput
              style={[styles.textArea, !editable && styles.disabledInput]}
              multiline
              textAlignVertical="top"
              editable={editable && !guardando}
              placeholder="Describe la respuesta del paciente durante y después de la intervención..."
              value={respuestaFisiologica}
              onChangeText={setRespuestaFisiologica}
            />

            {posibleDeterioro && editable && (
              <View style={styles.alertBox}>
                <Text style={styles.alertTitle}>Revisión clínica prioritaria</Text>
                <Text style={styles.alertText}>
                  Se detectaron expresiones asociadas a posible deterioro grave.
                  Verifica el registro y aplica el protocolo clínico correspondiente.
                </Text>
              </View>
            )}
          </View>

          {editable && (
            <TouchableOpacity
              style={[styles.saveButton, guardando && styles.disabledButton]}
              disabled={guardando}
              onPress={handleGuardar}
            >
              {guardando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Guardar intervención</Text>
              )}
            </TouchableOpacity>
          )}
        </>
      )}
    </VistaConTeclado>
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
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
  },
  loading: { marginVertical: 20 },
  patientCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  patientName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1d4ed8',
    marginBottom: 6,
  },
  activeState: { color: '#2e7d32', fontWeight: 'bold', marginTop: 8 },
  readOnlyState: { color: '#b45309', fontWeight: 'bold', marginTop: 8 },
  helper: { color: '#6b7280', fontSize: 13, marginBottom: 10 },
  textArea: {
    minHeight: 150,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
    fontSize: 15,
  },
  disabledInput: { backgroundColor: '#e5e7eb', color: '#4b5563' },
  alertBox: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  alertTitle: { color: '#b91c1c', fontWeight: 'bold', marginBottom: 4 },
  alertText: { color: '#7f1d1d' },
  saveButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  disabledButton: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
