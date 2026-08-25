// Ruta: fro-vista/src/screens/Paciente/DashboardPaciente.js
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
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
    } catch (error) {
      if (!error.response || error.response.status >= 500) {
        setErrorRed(true);
      }
    } finally {
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
        <Text style={styles.subtitle}>
          Bienvenido, {userData?.nombres || 'Usuario'}
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
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
              <Text style={styles.dataTitle}>Información de sesión:</Text>
              <Text style={styles.dataText}>{datosSensibles}</Text>
            </View>

            {/* CU14 + CU15: gestión de citas unificada (ver, agendar y cancelar) */}
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => navigation.navigate('MisCitas')}
            >
              <Text style={styles.menuIcon}>📅</Text>
              <Text style={styles.menuTitle}>Mis Citas</Text>
              <Text style={styles.menuSubtitle}>
                Revisa tus horas agendadas y reserva nuevas desde un mismo lugar.
              </Text>
            </TouchableOpacity>

            {/* CU23/CU27: entrevista de triaje previa a la consulta */}
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => navigation.navigate('Triaje')}
            >
              <Text style={styles.menuIcon}>🩺</Text>
              <Text style={styles.menuTitle}>Entrevista Previa</Text>
              <Text style={styles.menuSubtitle}>
                Responde unas preguntas antes de tu consulta para adelantar tu ficha.
              </Text>
            </TouchableOpacity>

            {/* CU48: rutinas de ejercicio del tratamiento */}
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => navigation.navigate('MisPautas')}
            >
              <Text style={styles.menuIcon}>🏋️</Text>
              <Text style={styles.menuTitle}>Mis Ejercicios</Text>
              <Text style={styles.menuSubtitle}>
                Revisa tu rutina del día y marca los ejercicios que completes.
              </Text>
            </TouchableOpacity>

            {/* CU66/CU67: bonos, copagos y planes de sesiones */}
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => navigation.navigate('Pagos')}
            >
              <Text style={styles.menuIcon}>💳</Text>
              <Text style={styles.menuTitle}>Pagos y Bonos</Text>
              <Text style={styles.menuSubtitle}>
                Valida tus bonos de cobertura, paga tus copagos y compra planes.
              </Text>
            </TouchableOpacity>

            {/* CU35: repositorio de documentos clínicos con visor embebido */}
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => navigation.navigate('Documentos')}
            >
              <Text style={styles.menuIcon}>📁</Text>
              <Text style={styles.menuTitle}>Mis Documentos</Text>
              <Text style={styles.menuSubtitle}>
                Consulta tus exámenes e informes clínicos sin descargarlos.
              </Text>
            </TouchableOpacity>

            {/* CU07/CU08/CU09: seguridad de la cuenta */}
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => navigation.navigate('Seguridad')}
            >
              <Text style={styles.menuIcon}>🔐</Text>
              <Text style={styles.menuTitle}>Seguridad y privacidad</Text>
              <Text style={styles.menuSubtitle}>
                Cambia tu contraseña, revisa tus sesiones y decide qué datos compartes.
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.logoutButton} onPress={logoutSession}>
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
  },
  header: {
    backgroundColor: '#0052cc',
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e0e0',
    marginTop: 5,
  },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dataCard: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    width: '100%',
    elevation: 2,
    marginBottom: 16,
  },
  dataTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  dataText: {
    fontSize: 14,
    color: '#0052cc',
    fontStyle: 'italic',
  },
  menuBtn: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0052cc',
    width: '100%',
    alignItems: 'center',
    elevation: 2,
    marginBottom: 14,
  },
  menuIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0052cc',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#d32f2f',
    margin: 20,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});