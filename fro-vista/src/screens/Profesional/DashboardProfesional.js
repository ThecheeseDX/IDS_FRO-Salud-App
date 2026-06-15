// Ruta: fro-vista/src/screens/Profesional/DashboardProfesional.js

import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AuthContext } from '../../context/AuthContext';

export default function DashboardProfesional({ navigation }) {
  const { userData, logoutSession } = useContext(AuthContext);

  const handleLogout = async () => {
    await logoutSession();
    navigation.replace('Login');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        Dr(a). {userData?.apellido_paterno}
      </Text>

      <Text style={styles.subtitle}>
        Panel Interno de Gestión
      </Text>

      {/* CU13 */}
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

      {/* CU32 */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('EvolucionClinica')}
      >
        <Text style={styles.cardIcon}>📈</Text>
        <Text style={styles.cardTitle}>Evolución Clínica</Text>
        <Text style={styles.cardText}>
          Definir metas terapéuticas y registrar el avance del paciente.
        </Text>
      </TouchableOpacity>

      {/* CU40 */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('Intervencion')}
      >
        <View style={styles.interventionIcon}>
          <View style={styles.interventionClip} />
          <View style={styles.interventionSheet}>
            <View style={styles.interventionLineLong} />
            <View style={styles.interventionLineShort} />
            <View style={styles.pulseRow}>
              <View style={styles.pulseLine} />
              <View style={styles.pulsePeak} />
              <View style={styles.pulseLine} />
            </View>
          </View>
        </View>
        <Text style={styles.cardTitle}>Intervención Clínica</Text>
        <Text style={styles.cardText}>
          Documentar técnicas aplicadas y respuesta fisiológica.
        </Text>
      </TouchableOpacity>

      {/* CU11 */}
      <TouchableOpacity
        style={styles.patientCard}
        onPress={() => navigation.navigate('PacientesAsignados')}
      >
        <Text style={styles.cardIcon}>👥</Text>
        <Text style={styles.patientTitle}>Pacientes Asignados</Text>
        <Text style={styles.cardText}>
          Consultar la lista de pacientes asignados al profesional.
        </Text>
      </TouchableOpacity>

      {/* CU30 */}
      <TouchableOpacity
        style={styles.securityBtn}
        onPress={() => navigation.navigate('Inalterabilidad')}
      >
        <Text style={styles.securityIcon}>🔒</Text>
        <Text style={styles.securityTitle}>
          Asegurar Inalterabilidad
        </Text>
        <Text style={styles.securityText}>
          Finalizar registros clínicos y protegerlos contra modificaciones.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>
          Cerrar Sesión
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e8f5e9',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
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

  interventionIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#a5d6a7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  interventionClip: {
    position: 'absolute',
    top: 7,
    width: 18,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2e7d32',
    zIndex: 2,
  },

  interventionSheet: {
    width: 32,
    height: 38,
    borderRadius: 5,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2e7d32',
    paddingHorizontal: 5,
    paddingTop: 9,
  },

  interventionLineLong: {
    height: 2,
    borderRadius: 1,
    backgroundColor: '#81c784',
    marginBottom: 4,
  },

  interventionLineShort: {
    width: 13,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#81c784',
    marginBottom: 6,
  },

  pulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  pulseLine: {
    width: 6,
    height: 2,
    backgroundColor: '#ef5350',
  },

  pulsePeak: {
    width: 8,
    height: 8,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#ef5350',
    transform: [{ rotate: '135deg' }],
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

  patientCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#90caf9',
    marginBottom: 16,
    alignItems: 'center',
  },

  patientTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },

  securityBtn: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ff9800',
    marginBottom: 16,
    alignItems: 'center',
  },

  securityIcon: {
    fontSize: 36,
    marginBottom: 8,
  },

  securityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef6c00',
    marginBottom: 4,
  },

  securityText: {
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
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
