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
      <Text style={styles.subtitle}>Panel Interno de Gestión (CU11)</Text>

      <View style={styles.card}>
        <Text style={styles.cardText}>Aquí se cargará la nómina de pacientes y agenda del día.</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#e8f5e9', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2e7d32', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#555', marginBottom: 30 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 10, borderWidth: 1, borderColor: '#c8e6c9', marginBottom: 30 },
  cardText: { color: '#666', textAlign: 'center', fontStyle: 'italic' },
  logoutBtn: { backgroundColor: '#d32f2f', padding: 15, borderRadius: 8, alignItems: 'center' },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});