import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import apiClient from '../../api/client';

export default function InalterabilidadScreen() {
  const [evolucionId, setEvolucionId] = useState('');
  const [firmaDigital, setFirmaDigital] = useState('');
  const [cargando, setCargando] = useState(false);

  const finalizarRegistro = async () => {
    if (!evolucionId || !firmaDigital) {
      Alert.alert('Error', 'Debe ingresar ID de evolución y firma digital.');
      return;
    }

    try {
      setCargando(true);

      const response = await apiClient.post(
        `/inalterabilidad/finalizar/${evolucionId}`,
        {
          firma_digital: firmaDigital,
        }
      );

      Alert.alert(
        'Registro finalizado',
        response.data.mensaje ||
          'El registro clínico fue finalizado y protegido correctamente.'
      );

      setEvolucionId('');
      setFirmaDigital('');
    } catch (error) {
      Alert.alert(
        'Error',
        error.response?.data?.mensaje ||
          error.response?.data?.error ||
          'No se pudo finalizar el registro clínico.'
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Asegurar Inalterabilidad</Text>

      <Text style={styles.description}>
        Finaliza una evolución clínica y la marca como inalterable, impidiendo
        su edición o eliminación posterior.
      </Text>

      <Text style={styles.label}>ID Evolución Clínica</Text>
      <TextInput
        style={styles.input}
        value={evolucionId}
        onChangeText={setEvolucionId}
        placeholder="Ej: 1"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Firma Digital Simple</Text>
      <TextInput
        style={styles.input}
        value={firmaDigital}
        onChangeText={setFirmaDigital}
        placeholder="Ingrese firma digital"
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={finalizarRegistro}
        disabled={cargando}
      >
        {cargando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Finalizar Registro Clínico</Text>
        )}
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>CU30</Text>
        <Text style={styles.infoText}>
          Una vez finalizado, el registro queda protegido contra modificaciones
          posteriores.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f4f6f8',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0052cc',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#555',
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2e7d32',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoBox: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderLeftColor: '#0052cc',
    padding: 14,
    borderRadius: 8,
  },
  infoTitle: {
    fontWeight: 'bold',
    color: '#0052cc',
    marginBottom: 4,
  },
  infoText: {
    color: '#555',
  },
});