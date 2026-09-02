// Ruta: fro-vista/src/screens/Profesional/DashboardProfesional.js
//
// Panel principal del profesional. La lista de pacientes asignados es el núcleo
// de la vista: al entrar se ve de inmediato, y desde cada paciente se abre su
// ficha clínica completa. Las herramientas transversales (trazabilidad del
// documento y disponibilidad) quedan como accesos secundarios.

import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';

import { AuthContext } from '../../context/AuthContext';
import apiClient from '../../api/client';

export default function DashboardProfesional({ navigation }) {
  const { userData, confirmarCierreSesion } = useContext(AuthContext);

  const [pacientes, setPacientes] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
      setRefreshing(false);
    }
  };

  useEffect(() => {
    cargarPacientes();
  }, []);

  const abrirFicha = (paciente) => {
    navigation.navigate('FichaClinica', {
      pacienteId: paciente.paciente_id,
      nombrePaciente: paciente.nombre_completo,
    });
  };

  const renderPaciente = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => abrirFicha(item)}>
      <Text style={styles.nombre}>{item.nombre_completo}</Text>
      <Text style={styles.dato}>RUT: {item.rut}</Text>
      <Text style={styles.dato}>Sexo clínico: {item.sexo_clinico || 'No informado'}</Text>
      <Text style={styles.dato}>Total atenciones: {item.total_atenciones}</Text>
      <Text style={styles.dato}>Última atención: {item.ultima_atencion || 'Sin registros'}</Text>

      <View style={styles.boton}>
        <Text style={styles.botonTexto}>Abrir ficha clínica</Text>
      </View>
    </TouchableOpacity>
  );

  const Encabezado = (
    <View>
      <Text style={styles.title}>Dr(a). {userData?.apellido_paterno}</Text>
      <Text style={styles.subtitle}>Pacientes asignados</Text>

      <TextInput
        style={styles.input}
        placeholder="Buscar por nombre o RUT"
        value={buscar}
        onChangeText={setBuscar}
        onSubmitEditing={() => cargarPacientes(false)}
        returnKeyType="search"
      />

      <TouchableOpacity style={styles.botonBuscar} onPress={() => cargarPacientes(false)}>
        <Text style={styles.botonTexto}>Buscar</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color="#2e7d32" style={styles.cargando} />}

      {error !== '' && (
        <View style={styles.errorCaja}>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity style={styles.botonBuscar} onPress={() => cargarPacientes(false)}>
            <Text style={styles.botonTexto}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && pacientes.length === 0 && (
        <Text style={styles.sinResultados}>Sin resultados encontrados</Text>
      )}
    </View>
  );

  const PieDeLista = (
    <View style={styles.pie}>
      <Text style={styles.seccion}>Herramientas</Text>

      <TouchableOpacity
        style={styles.herramienta}
        onPress={() => navigation.navigate('Trazabilidad')}
      >
        <Text style={styles.herramientaIcono}>🔒</Text>
        <View style={styles.herramientaTexto}>
          <Text style={styles.herramientaTitulo}>Trazabilidad del Documento</Text>
          <Text style={styles.herramientaSub}>Inalterabilidad y marcas temporales.</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.herramienta}
        onPress={() => navigation.navigate('GestionDisponibilidad')}
      >
        <Text style={styles.herramientaIcono}>📅</Text>
        <View style={styles.herramientaTexto}>
          <Text style={styles.herramientaTitulo}>Gestionar Disponibilidad</Text>
          <Text style={styles.herramientaSub}>Bloquear horarios por vacaciones o licencias.</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.herramienta}
        onPress={() => navigation.navigate('Seguridad')}
      >
        <Text style={styles.herramientaIcono}>🔐</Text>
        <View style={styles.herramientaTexto}>
          <Text style={styles.herramientaTitulo}>Seguridad de la Cuenta</Text>
          <Text style={styles.herramientaSub}>Contraseña y sesiones activas.</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={confirmarCierreSesion}>
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={pacientes}
      keyExtractor={(item) => item.paciente_id.toString()}
      renderItem={renderPaciente}
      ListHeaderComponent={Encabezado}
      ListFooterComponent={PieDeLista}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => cargarPacientes(true)}
          colors={['#2e7d32']}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e8f5e9' },
  content: { padding: 16, paddingBottom: 32 },

  title: { fontSize: 26, fontWeight: 'bold', color: '#2e7d32' },
  subtitle: { fontSize: 16, color: '#555', marginBottom: 16 },

  input: {
    borderWidth: 1,
    borderColor: '#c8e6c9',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  botonBuscar: {
    backgroundColor: '#2e7d32',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  cargando: { marginBottom: 16 },
  errorCaja: { marginBottom: 8 },
  error: { color: '#d32f2f', marginBottom: 10 },
  sinResultados: { textAlign: 'center', marginVertical: 20, color: '#666' },

  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  nombre: { fontSize: 18, fontWeight: 'bold', marginBottom: 6, color: '#1b5e20' },
  dato: { color: '#555' },
  boton: {
    backgroundColor: '#16a34a',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  botonTexto: { color: '#fff', fontWeight: 'bold' },

  pie: { marginTop: 8 },
  seccion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 10,
    marginTop: 8,
  },
  herramienta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ff9800',
    marginBottom: 12,
  },
  herramientaIcono: { fontSize: 26, marginRight: 12 },
  herramientaTexto: { flex: 1 },
  herramientaTitulo: { fontSize: 16, fontWeight: 'bold', color: '#ef6c00' },
  herramientaSub: { color: '#666', fontSize: 13 },

  logoutBtn: {
    backgroundColor: '#d32f2f',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
