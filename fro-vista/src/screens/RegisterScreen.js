import React from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';

export default function RegisterScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📋 Registro de Paciente (CU1)</Text>
      <Text style={styles.subtitle}>Aquí construiremos el formulario con validación de integridad.</Text>
      <Button 
        title="Volver al Login" 
        onPress={() => navigation.navigate('Login')} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff', padding: 20 },
  title: { fontSize: 20, marginBottom: 10, fontWeight: 'bold', color: '#0052cc' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' }
});