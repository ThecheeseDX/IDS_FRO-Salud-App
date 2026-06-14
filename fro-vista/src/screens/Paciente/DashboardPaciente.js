// Ruta: fro-vista/src/screens/Paciente/DashboardPaciente.js
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import apiClient from '../../api/client';
import ErrorRetry from '../../components/ErrorRetry';

export default function DashboardPaciente({ navigation }) {
  const { userData, logoutSession } = useContext(AuthContext);

  const [isLoading, setIsLoading] = useState(true);
  const [errorRed, setErrorRed] = useState(false);
  const [datosSensibles, setDatosSensibles] = useState('');

  const cargarDatosProtegidos = async () => {
    setIsLoading(true);
    setErrorRed(false);
    try {
      const response = await apiClient.get('/auth/mi-perfil');
      setDatosSensibles(response.data.mensaje);
      setIsLoading(false);
    } catch (error) {
      if (!error.response || error.response.status >= 500) {
        setErrorRed(true);
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarDatosProtegidos();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Panel de Paciente</Text>
        <Text style={styles.subtitle}>Bienvenido, {userData?.nombres || 'Usuario'}</Text>
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#0052cc" />
        ) : errorRed ? (
          <ErrorRetry
            mensaje="Hubo un problema al validar tus permisos con el servidor central."
            onRetry={cargarDatosProtegidos}
          />
        ) : (
          <>
            <View style={styles.dataCard}>
              <Text style={styles.dataTitle}>Información Protegida:</Text>
              <Text style={styles.dataText}>{datosSensibles}</Text>
            </View>

            {/* CU15: Botón de agendamiento */}
            <TouchableOpacity
              style={styles.agendarBtn}
              onPress={() => navigation.navigate('Agendamiento')}
            >
              <Text style={styles.agendarIcon}>📅</Text>
              <Text style={styles.agendarTitle}>Agendar Cita</Text>
              <Text style={styles.agendarSubtitle}>Selecciona un profesional y horario disponible.</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logoutSession}>
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: {
    backgroundColor: '#0052cc', padding: 20, paddingTop: 40,
    borderBottomLeftRadius: 15, borderBottomRightRadius: 15
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 16, color: '#e0e0e0', marginTop: 5 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  dataCard: {
    backgroundColor: '#ffffff', padding: 20, borderRadius: 10,
    borderWidth: 1, borderColor: '#e0e0e0', width: '100%', elevation: 2, marginBottom: 16
  },
  dataTitle: { fontWeight: 'bold', fontSize: 16, color: '#333', marginBottom: 10 },
  dataText: { fontSize: 14, color: '#0052cc', fontStyle: 'italic' },
  agendarBtn: {
    backgroundColor: '#fff', padding: 20, borderRadius: 10,
    borderWidth: 1, borderColor: '#0052cc', width: '100%',
    alignItems: 'center', elevation: 2
  },
  agendarIcon: { fontSize: 36, marginBottom: 8 },
  agendarTitle: { fontSize: 18, fontWeight: 'bold', color: '#0052cc', marginBottom: 4 },
  agendarSubtitle: { fontSize: 13, color: '#666', textAlign: 'center' },
  logoutButton: {
    backgroundColor: '#d32f2f', margin: 20,
    padding: 15, borderRadius: 8, alignItems: 'center'
  },
  logoutButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 }
});