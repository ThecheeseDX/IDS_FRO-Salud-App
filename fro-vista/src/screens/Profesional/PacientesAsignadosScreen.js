// Ruta: fro-vista/src/screens/Profesional/PacientesAsignadosScreen.js

import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl, // 1. Agregamos el control de refresco nativo
} from 'react-native';

import { AuthContext } from '../../context/AuthContext';
import apiClient from '../../api/client';

export default function PacientesAsignadosScreen({ navigation }) {
  const { userData } = useContext(AuthContext);

  const [pacientes, setPacientes] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // 2. Estado para el pull-to-refresh
  const [error, setError] = useState('');

  const cargarPacientes = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const usuarioId = userData?.usuario_id;
      if (!usuarioId) {
        setError('No se encontró la sesión del profesional');
        return;
      }

      const response = await apiClient.get(
        `/profesionales/usuario/${usuarioId}/pacientes`,
        { params: { buscar } }
      );

      const data = response.data;
      if (data.ok) {
        setPacientes(data.pacientes);
      } else {
        setError(data.message || 'Error al recuperar registros clínicos');
      }
    } catch (err) {
      console.error('ERROR PACIENTES:', err?.response?.data || err.message);
      setError('Error al recuperar registros clínicos');
    } finally {
      setLoading(false);
      setRefreshing(false); // 3. Apagamos el indicador de refresco
    }
  };

  useEffect(() => {
    cargarPacientes();
  }, []);

  // Función específica para el gesto de arrastrar hacia abajo (Excepción 3)
  const alRefrescar = () => {
    cargarPacientes(true);
  };

  const renderPaciente = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.nombre}>{item.nombre_completo}</Text>
      <Text>RUT: {item.rut}</Text>
      <Text>Sexo clínico: {item.sexo_clinico || 'No informado'}</Text>
      <Text>Dirección: {item.calle} {item.numero_calle}</Text>
      <Text>Total atenciones: {item.total_atenciones}</Text>
      <Text>Última atención: {item.ultima_atencion || 'Sin registros'}</Text>

      <TouchableOpacity
        style={styles.boton}
        onPress={() =>
          navigation.navigate('HistorialPaciente', {
            pacienteId: item.paciente_id,
            nombrePaciente: item.nombre_completo,
          })
        }
      >
        <Text style={styles.botonTexto}>Ver historial / Gestionar Citas</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Pacientes asignados</Text>

      <TextInput
        style={styles.input}
        placeholder="Buscar por nombre o RUT"
        value={buscar}
        onChangeText={setBuscar}
      />

      <TouchableOpacity style={styles.botonBuscar} onPress={() => cargarPacientes(false)}>
        <Text style={styles.botonTexto}>Buscar</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color="#2563eb" />}

      {error !== '' && (
        <View>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity style={styles.botonBuscar} onPress={() => cargarPacientes(false)}>
            <Text style={styles.botonTexto}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && pacientes.length === 0 && (
        <Text style={styles.sinResultados}>Sin resultados encontrados</Text>
      )}

      <FlatList
        data={pacientes}
        keyExtractor={(item) => item.paciente_id.toString()}
        renderItem={renderPaciente}
        // 4. Añadimos el refresco a la lista para cumplir la Excepción 3
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={alRefrescar} colors={['#2563eb']} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  titulo: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  botonBuscar: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  nombre: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  boton: {
    backgroundColor: '#16a34a',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  botonTexto: { color: '#fff', fontWeight: 'bold' },
  error: { color: 'red', marginBottom: 10 },
  sinResultados: { textAlign: 'center', marginTop: 20, color: '#666' },
});