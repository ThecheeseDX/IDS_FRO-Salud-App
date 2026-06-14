// Ruta: fro-vista/src/screens/Paciente/DashboardPaciente.js
import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AuthContext } from '../../context/AuthContext';

export default function DashboardPaciente({ navigation }) {
  const { userData, logoutSession } = useContext(AuthContext);

  const handleLogout = async () => {
    await logoutSession(); // Borra el token del dispositivo
    navigation.replace('Login'); // Devuelve al usuario al Login
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¡Hola, {userData?.nombres}!</Text>
      <Text style={styles.subtitle}>Mi Panel de Salud</Text>

      <View style={styles.card}>
        <Text style={styles.cardText}>Aquí se implementará el buscador de citas (CU14) en el próximo sprint.</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f4f6f8', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0052cc', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#555', marginBottom: 30 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', marginBottom: 30 },
  cardText: { color: '#666', textAlign: 'center', fontStyle: 'italic' },
  logoutBtn: { backgroundColor: '#d32f2f', padding: 15, borderRadius: 8, alignItems: 'center' },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});