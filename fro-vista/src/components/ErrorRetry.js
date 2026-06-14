// Ruta: fro-vista/src/components/ErrorRetry.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

/**
 * Componente reutilizable para manejar la Excepción 3 (Caída de red o servidor).
 * @param {string} mensaje - El texto explicativo del error.
 * @param {function} onRetry - La función que se ejecutará al presionar "Reintentar".
 */
export default function ErrorRetry({ mensaje, onRetry }) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔌</Text>
      <Text style={styles.title}>Servicio no disponible</Text>
      <Text style={styles.message}>
        {mensaje || 'El servicio de validación de políticas no está disponible momentáneamente. Comprueba tu conexión a internet o intenta más tarde.'}
      </Text>
      
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>REINTENTAR CONEXIÓN</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    margin: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  icon: {
    fontSize: 48,
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#0052cc',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    width: '100%',
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
  }
});