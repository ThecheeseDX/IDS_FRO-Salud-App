import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native'; // ◄ Se agregó ActivityIndicator
import apiClient from '../../api/client';
import { AuthContext } from '../../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function GestionDisponibilidadScreen() {
  const { userData, isLoading } = useContext(AuthContext);

  // Estados del formulario
  const [profId, setProfId] = useState(userData?.role === 'Admin' ? '' : String(userData?.usuario_id || ''));
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [show, setShow] = useState(false);
  const [modo, setModo] = useState('inicio');
  const [motivo, setMotivo] = useState('');

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0052cc" />
      </View>
    );
  }

  if (!userData) {
    return <Text style={styles.errorText}>No se encontró sesión activa.</Text>;
  }

  const alCambiarFecha = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShow(false);
      return;
    }
    
    if (selectedDate) {
      setShow(false);
      const f = `${String(selectedDate.getDate()).padStart(2,'0')}/${String(selectedDate.getMonth()+1).padStart(2,'0')}/${selectedDate.getFullYear()}`;
      modo === 'inicio' ? setInicio(f) : setFin(f);
    }
  };

    const bloquearAgenda = async () => {
        if (!inicio || !fin || !motivo.trim()) {
            return Alert.alert("Campos Incompletos", "Debe ingresar las fechas y el motivo del bloqueo.");
        }

        if (userData?.role === 'Admin' && !profId.trim()) {
            return Alert.alert("Campos Incompletos", "Como Administrador, debe especificar el ID del profesional.");
        }

        // Identificar el ID correcto dinámicamente
        const idAEnviar = userData?.role === 'Admin' ? profId : (userData?.usuario_id || profId);
        
        console.log("✈️ Enviando bloqueo para el ID:", idAEnviar); // ◄ Para monitorear en tu consola

        try {
            await apiClient.post('/clinica/disponibilidad/restringir', {
                profesional_id: parseInt(idAEnviar, 10), 
                fecha_inicio: inicio,
                fecha_fin: fin,
                motivo: motivo.trim()
            });
            
            Alert.alert("Éxito", "Bloqueo registrado correctamente.");
            setInicio('');
            setFin('');
            setMotivo('');
            if (userData?.role === 'Admin') setProfId('');
            
        } catch (error) {
            Alert.alert("Error", error.response?.data?.mensaje || "Falla de red o de servidor.");
        }
    };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Gestión de Agenda</Text>
        <Text style={styles.cardSubtitle}>Configure los periodos de inactividad</Text>

        {/* Si es admin, mostramos el campo de ID */}
        {userData?.role === 'Admin' && (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>ID Profesional</Text>
            <TextInput 
              placeholder="Ej: 123" 
              value={profId} 
              onChangeText={setProfId} 
              style={styles.input}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Campo para el Motivo */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Motivo del Bloqueo</Text>
          <TextInput 
            placeholder="Ej: Vacaciones, Licencia médica, etc." 
            value={motivo} 
            onChangeText={setMotivo} 
            style={styles.input}
            maxLength={200}
          />
        </View>

        <Text style={styles.label}>Rango de Fechas</Text>
        <TouchableOpacity style={styles.datePickerBtn} onPress={() => { setModo('inicio'); setShow(true); }}>
          <Text style={styles.datePickerText}>{inicio || "📅 Inicio: DD/MM/AAAA"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.datePickerBtn} onPress={() => { setModo('fin'); setShow(true); }}>
          <Text style={styles.datePickerText}>{fin || "📅 Fin: DD/MM/AAAA"}</Text>
        </TouchableOpacity>

        {show && (
          <DateTimePicker 
            value={new Date()} 
            mode="date" 
            onValueChange={alCambiarFecha} 
            onDismiss={() => setShow(false)} 
          />
        )}

        <TouchableOpacity style={styles.actionButton} onPress={bloquearAgenda}>
          <Text style={styles.saveButtonText}>CONFIRMAR BLOQUEO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8', padding: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 15, padding: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  cardSubtitle: { fontSize: 13, color: '#777', marginBottom: 20 },
  inputContainer: { marginBottom: 15 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },
  input: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#e0e0e0', fontSize: 16 },
  datePickerBtn: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 15, borderWidth: 1, borderColor: '#0052cc', marginBottom: 15, alignItems: 'center' },
  datePickerText: { color: '#0052cc', fontWeight: '500' },
  actionButton: { backgroundColor: '#d32f2f', paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  errorText: { textAlign: 'center', marginTop: 20, color: '#d32f2f', fontSize: 16 }
});