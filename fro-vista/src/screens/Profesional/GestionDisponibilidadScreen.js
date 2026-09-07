import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import apiClient from '../../api/client';
import VistaConTeclado from '../../components/VistaConTeclado';
import { AuthContext } from '../../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colores, radio, sombra } from '../../theme';

export default function GestionDisponibilidadScreen() {
  const { userData, isLoading } = useContext(AuthContext);

  const [profId, setProfId] = useState(userData?.role === 'Admin' ? '' : String(userData?.usuario_id || ''));
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [show, setShow] = useState(false);
  const [modo, setModo] = useState('inicio');
  const [motivo, setMotivo] = useState('');

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colores.primario} />
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

        const idAEnviar = userData?.role === 'Admin' ? profId : (userData?.usuario_id || profId);
        
        console.log("Enviando bloqueo para el ID:", idAEnviar);
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
    <VistaConTeclado style={styles.container} contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Gestión de Agenda</Text>
        <Text style={styles.cardSubtitle}>Configure los periodos de inactividad</Text>

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
    </VistaConTeclado>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colores.fondo },
  card: { backgroundColor: colores.superficie, borderRadius: radio.lg, padding: 20,
    ...sombra.media,
  },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: colores.texto, marginBottom: 5 },
  cardSubtitle: { fontSize: 13, color: colores.textoSuave, marginBottom: 20 },
  inputContainer: { marginBottom: 15 },
  label: { fontSize: 13, fontWeight: '600', color: colores.textoSuave, marginBottom: 8 },
  input: { backgroundColor: colores.superficieSuave, borderRadius: radio.sm, padding: 12, borderWidth: 1, borderColor: colores.borde, fontSize: 17 },
  datePickerBtn: { backgroundColor: colores.superficieSuave, borderRadius: radio.sm, padding: 15, borderWidth: 1, borderColor: colores.primario, marginBottom: 15, alignItems: 'center' },
  datePickerText: { color: colores.primario, fontWeight: '500' },
  actionButton: { backgroundColor: colores.error, paddingVertical: 15, borderRadius: radio.md, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: colores.superficie, fontWeight: 'bold', fontSize: 15, letterSpacing: 1 },
  errorText: { textAlign: 'center', marginTop: 20, color: colores.error, fontSize: 17 }
});