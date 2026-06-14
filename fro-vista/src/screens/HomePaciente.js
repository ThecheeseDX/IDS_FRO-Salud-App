// src/screens/Paciente/HomePaciente.js
import React, { useContext, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import client from '../../api/client'; // Tu instancia de Axios

const HomePaciente = ({ navigation }) => {
  const { userData, logout } = useContext(AuthContext);
  const [citasProximas, setCitasProximas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carga las citas al montar el componente
  useEffect(() => {
    const fetchCitas = async () => {
      try {
        const response = await client.get(`/citas/paciente/${userData.id}`);
        setCitasProximas(response.data);
      } catch (error) {
        console.error("Error cargando citas:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCitas();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Bienvenido, {userData.nombre}</Text>
      
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={citasProximas}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => navigation.navigate('DetalleCita', { citaId: item.id })}
            >
              <Text>{item.fecha} - {item.especialidad}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={{color: 'white'}}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  welcome: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  card: { padding: 15, backgroundColor: '#fff', marginBottom: 10, borderRadius: 8 },
  logoutButton: { marginTop: 20, padding: 15, backgroundColor: 'red', alignItems: 'center' }
});

export default HomePaciente;