// Ruta: fro-vista/src/screens/Profesional/DashboardProfesional.js

import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AuthContext } from '../../context/AuthContext';

export default function DashboardProfesional({ navigation }) {
  const { userData, logoutSession } = useContext(AuthContext);

  const handleLogout = async () => {
    await logoutSession();
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dr(a). {userData?.apellido_paterno}</Text>
      <Text style={styles.subtitle}>Panel Interno de Gestión</Text>

      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('Episodio')}
      >
        <Text style={styles.cardIcon}>📁</Text>
        <Text style={styles.cardTitle}>Episodios Clínicos</Text>
        <Text style={styles.cardText}>
          Consultar y registrar episodios de pacientes.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigation.navigate('PacientesAsignados')}
      >
        <Text style={styles.primaryText}>Ver pacientes asignados</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 30,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    marginBottom: 16,
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 4,
  },
  cardText: {
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logoutBtn: {
    backgroundColor: '#d32f2f',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});