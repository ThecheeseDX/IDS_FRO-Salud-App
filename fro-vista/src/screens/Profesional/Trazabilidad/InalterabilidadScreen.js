import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, StyleSheet, ActivityIndicator,
} from 'react-native';
import apiClient from '../../../api/client';
import { colores, radio } from '../../../theme';

export default function InalterabilidadScreen() {
  const [evolucionId, setEvolucionId] = useState('');
  const [cargando, setCargando] = useState(false);
  const [firmaExitosa, setFirmaExitosa] = useState(null);

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
          onPress: ejecutarPeticionFirma,
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

      <TouchableOpacity
        style={styles.button}
        onPress={intentarFirmar}
        disabled={cargando}
      >
        {cargando ? (
          <ActivityIndicator color={colores.superficie} />
        ) : (
          <Text style={styles.buttonText}>Firmar y Sellar Documento</Text>
        )}
      </TouchableOpacity>

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
  container: { flex: 1, padding: 20, backgroundColor: colores.fondo },
  title: { fontSize: 22, fontWeight: 'bold', color: colores.primario, marginBottom: 10, textAlign: 'center' },
  description: { fontSize: 15, color: colores.textoSuave, marginBottom: 24, textAlign: 'center' },
  label: { fontWeight: 'bold', color: colores.texto, marginBottom: 6 },
  input: { backgroundColor: colores.superficie, borderWidth: 1, borderColor: colores.bordeCampo, borderRadius: radio.sm, padding: 12, marginBottom: 16 },
  button: { backgroundColor: colores.exito, padding: 15, borderRadius: radio.sm, alignItems: 'center', marginTop: 4 },
  buttonText: { color: colores.superficie, fontWeight: 'bold', fontSize: 17 },
  infoBox: { marginTop: 24, backgroundColor: colores.superficie, borderLeftWidth: 4, borderLeftColor: colores.primario, padding: 14, borderRadius: radio.sm },
  infoTitle: { fontWeight: 'bold', color: colores.primario, marginBottom: 4 },
  infoText: { color: colores.textoSuave },
  successBox: { marginTop: 20, backgroundColor: colores.exitoSuave, borderWidth: 1, borderColor: colores.exitoBorde, padding: 15, borderRadius: radio.sm },
  successTitle: { fontWeight: 'bold', color: colores.exito, marginBottom: 5 },
  successText: { color: colores.exito, fontSize: 13, fontStyle: 'italic' }
});