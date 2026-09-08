import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Alert, StyleSheet, ActivityIndicator,
} from 'react-native';
import apiClient from '../../../api/client';
import { colores, espacio, piezas, radio, tipografia } from '../../../theme';

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
        <Text style={styles.infoTitle}>Cierre e inalterabilidad</Text>
        <Text style={styles.infoText}>
          Una vez aceptado el aviso, el registro queda legalmente firmado y protegido contra modificaciones posteriores.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colores.fondo,
    paddingHorizontal: espacio.lg,
    paddingTop: espacio.base,
    flex: 1,
  },
  title: {
    ...tipografia.titulo,
    color: colores.textoTitulo,
    marginBottom: 10,
  },
  description: {
    ...tipografia.meta,
    color: colores.textoSuave,
    marginBottom: 24,
  },
  label: {
    ...piezas.etiqueta,
    marginBottom: 6,
  },
  input: {
    ...piezas.campo,
    marginBottom: 16,
  },
  button: {
    ...piezas.botonPrimario,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    ...tipografia.cuerpoFuerte,
    color: colores.textoInverso,
  },
  infoBox: {
    backgroundColor: colores.primarioSuave,
    borderWidth: 1,
    borderColor: colores.primarioBorde,
    borderRadius: radio.lg,
    padding: espacio.base,
    marginTop: 24,
  },
  infoTitle: { fontWeight: 'bold', color: colores.primario, marginBottom: 4 },
  infoText: { color: colores.textoSuave },
  successBox: {
    backgroundColor: colores.exitoSuave,
    borderWidth: 1,
    borderColor: colores.exitoBorde,
    borderRadius: radio.lg,
    padding: espacio.base,
    marginTop: 20,
  },
  successTitle: { fontWeight: 'bold', color: colores.exito, marginBottom: 5 },
  successText: { color: colores.exito, fontSize: 13, fontStyle: 'italic' }
});