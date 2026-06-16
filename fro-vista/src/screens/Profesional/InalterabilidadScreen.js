import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, StyleSheet, ActivityIndicator,
} from 'react-native';
import apiClient from '../../api/client';

export default function InalterabilidadScreen() {
  const [evolucionId, setEvolucionId] = useState('');
  const [cargando, setCargando] = useState(false);
  const [firmaExitosa, setFirmaExitosa] = useState(null); // Para mostrar la firma generada

  // CU36 - Flujo previo a la petición
  const intentarFirmar = () => {
    setFirmaExitosa(null);

    // CU36 - Excepción 1: Campos obligatorios vacíos
    if (!evolucionId) {
      Alert.alert(
        'Campos Incompletos', 
        'El sistema bloqueó la firma. Debe ingresar el ID de la evolución clínica.'
      );
      return;
    }

    // CU36 - Excepción 3: Aviso de inalterabilidad
    Alert.alert(
      'Aviso de Inalterabilidad',
      'Al firmar digitalmente este documento, quedará sellado y no podrá ser modificado bajo ninguna circunstancia. ¿Desea confirmar su intención de firma?',
      [
        {
          text: 'Cancelar (Continuar editando)',
          style: 'cancel', // El sistema cancela la firma y se mantiene en la pantalla
        },
        {
          text: 'Aceptar y Firmar',
          onPress: ejecutarPeticionFirma, // Flujo Principal
        },
      ]
    );
  };

  const ejecutarPeticionFirma = async () => {
    try {
      setCargando(true);

      // Flujo Principal: El backend ahora genera la firma con el Token, no mandamos body.
      const response = await apiClient.post(
        `/inalterabilidad/finalizar/${evolucionId}`
      );

      Alert.alert(
        'Registro finalizado',
        response.data.mensaje || 'El registro clínico fue finalizado y protegido correctamente.'
      );

      // Mostramos la firma que el backend autogeneró
      if (response.data.firma_digital) {
        setFirmaExitosa(response.data.firma_digital);
      }

      setEvolucionId('');
    } catch (error) {
      // Aquí se atrapan la Excepción 2 (Falta de acreditación 403) 
      // y la Excepción 4 (Error de sincronización 500)
      Alert.alert(
        'Operación Rechazada',
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
      <Text style={styles.title}>Firma de Documentos Clínicos</Text>

      <Text style={styles.description}>
        Acredite la autoría y finalice la evolución clínica. El sistema aplicará su Firma Digital Simple automáticamente.
      </Text>

      <Text style={styles.label}>ID Evolución Clínica</Text>
      <TextInput
        style={styles.input}
        value={evolucionId}
        onChangeText={setEvolucionId}
        placeholder="Ej: 1"
        keyboardType="numeric"
      />

      {/* eliminacion el TextInput de la "Firma Digital Simple" porque ahora la hace el Backend */}

      <TouchableOpacity
        style={styles.button}
        onPress={intentarFirmar}
        disabled={cargando}
      >
        {cargando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Firmar y Sellar Documento</Text>
        )}
      </TouchableOpacity>

      {/* Muestra la firma como evidencia visual si el proceso fue exitoso */}
      {firmaExitosa && (
        <View style={styles.successBox}>
          <Text style={styles.successTitle}>✓ Documento Sellado</Text>
          <Text style={styles.successText}>{firmaExitosa}</Text>
        </View>
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>CU36 - Inalterabilidad</Text>
        <Text style={styles.infoText}>
          Una vez aceptado el aviso, el registro queda legalmente firmado y protegido contra modificaciones posteriores.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f4f6f8' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0052cc', marginBottom: 10, textAlign: 'center' },
  description: { fontSize: 14, color: '#555', marginBottom: 24, textAlign: 'center' },
  label: { fontWeight: 'bold', color: '#333', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 16 },
  button: { backgroundColor: '#2e7d32', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  infoBox: { marginTop: 24, backgroundColor: '#fff', borderLeftWidth: 4, borderLeftColor: '#0052cc', padding: 14, borderRadius: 8 },
  infoTitle: { fontWeight: 'bold', color: '#0052cc', marginBottom: 4 },
  infoText: { color: '#555' },
  successBox: { marginTop: 20, backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#c8e6c9', padding: 15, borderRadius: 8 },
  successTitle: { fontWeight: 'bold', color: '#2e7d32', marginBottom: 5 },
  successText: { color: '#1b5e20', fontSize: 13, fontStyle: 'italic' }
});