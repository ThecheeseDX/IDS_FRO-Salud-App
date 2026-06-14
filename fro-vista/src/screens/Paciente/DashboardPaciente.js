// Ruta: fro-vista/src/screens/Paciente/DashboardPaciente.js
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import apiClient from '../../api/client';
import ErrorRetry from '../../components/ErrorRetry';

export default function DashboardPaciente() {
  const { userData, logoutSession } = useContext(AuthContext);
  
  // Estados para controlar la vista
  const [isLoading, setIsLoading] = useState(true);
  const [errorRed, setErrorRed] = useState(false);
  const [datosSensibles, setDatosSensibles] = useState('');

  // Función que va a buscar los datos protegidos al backend
  const cargarDatosProtegidos = async () => {
    setIsLoading(true);
    setErrorRed(false); // Limpiamos errores previos al reintentar

    try {
      // Intentamos golpear la ruta genérica protegida que creaste en el backend
      const response = await apiClient.get('/auth/mi-perfil');
      
      // Si el guardia (RBAC) nos deja pasar, mostramos los datos
      setDatosSensibles(response.data.mensaje);
      setIsLoading(false);

    } catch (error) {
      // EXCEPCIÓN 3: El motor se cayó (500) o no hay internet
      // (Si es 401, el interceptor de Axios ya se encargó de botarnos)
      if (!error.response || error.response.status >= 500) {
        setErrorRed(true);
      }
      setIsLoading(false);
    }
  };

  // Se ejecuta automáticamente al entrar a la pantalla
  useEffect(() => {
    cargarDatosProtegidos();
  }, []);

  return (
    <View style={styles.container}>
      {/* Cabecera común */}
      <View style={styles.header}>
        <Text style={styles.title}>Panel de Paciente</Text>
        <Text style={styles.subtitle}>Bienvenido, {userData?.nombres || 'Usuario'}</Text>
      </View>

      {/* Control de Flujo de la Vista */}
      <View style={styles.content}>
        {isLoading ? (
          // 1. ESTADO DE ESPERA
          <ActivityIndicator size="large" color="#0052cc" />
        ) : errorRed ? (
          // 2. EXCEPCIÓN 3: ESTADO DE CAÍDA (Muestra nuestro nuevo componente)
          <ErrorRetry 
            mensaje="Hubo un problema al validar tus permisos con el servidor central."
            onRetry={cargarDatosProtegidos} 
          />
        ) : (
          // 3. ESTADO DE ÉXITO (Mostramos la información)
          <View style={styles.dataCard}>
            <Text style={styles.dataTitle}>Información Protegida:</Text>
            <Text style={styles.dataText}>{datosSensibles}</Text>
          </View>
        )}
      </View>

      {/* Botón para cerrar sesión */}
      <TouchableOpacity style={styles.logoutButton} onPress={logoutSession}>
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { backgroundColor: '#0052cc', padding: 20, paddingTop: 40, borderBottomLeftRadius: 15, borderBottomRightRadius: 15 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 16, color: '#e0e0e0', marginTop: 5 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  dataCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0', width: '100%', elevation: 2 },
  dataTitle: { fontWeight: 'bold', fontSize: 16, color: '#333', marginBottom: 10 },
  dataText: { fontSize: 14, color: '#0052cc', fontStyle: 'italic' },
  logoutButton: { backgroundColor: '#d32f2f', margin: 20, padding: 15, borderRadius: 8, alignItems: 'center' },
  logoutButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 }
});