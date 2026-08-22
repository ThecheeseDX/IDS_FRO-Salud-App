// Ruta: fro-vista/src/navigation/AppNavigator.js
import React, { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthContext } from '../context/AuthContext';

// Pantallas — Autenticación
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import OTPScreen from '../screens/Auth/OTPScreen';
// Pantallas — Paciente
import DashboardPaciente from '../screens/Paciente/DashboardPaciente';
import BuscarCitaScreen from '../screens/Paciente/BuscarCitaScreen';
// Pantallas — Profesional
import DashboardProfesional from '../screens/Profesional/DashboardProfesional';
import PacientesAsignadosScreen from '../screens/Profesional/PacientesAsignadosScreen';
import GestionDisponibilidadScreen from '../screens/Profesional/GestionDisponibilidadScreen';
// Pantallas — Profesional / Ficha Clínica
import HistorialPacienteScreen from '../screens/Profesional/FichaClinica/HistorialPacienteScreen';
import EpisodioScreen from '../screens/Profesional/FichaClinica/EpisodioScreen';
import AnamnesisScreen from '../screens/Profesional/FichaClinica/AnamnesisScreen';
import EvolucionClinicaScreen from '../screens/Profesional/FichaClinica/EvolucionClinicaScreen';
import IntervencionScreen from '../screens/Profesional/FichaClinica/IntervencionScreen';
// Pantallas — Profesional / Trazabilidad del Documento
import InalterabilidadScreen from '../screens/Profesional/Trazabilidad/InalterabilidadScreen';
import MarcasTemporalesScreen from '../screens/Profesional/Trazabilidad/MarcasTemporalesScreen';
// Pantallas — Administrador
import ParametrosScreen from '../screens/Admin/ParametrosScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { userToken, userData, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f6f8' }}>
        <ActivityIndicator size="large" color="#0052cc" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0052cc' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        {userToken == null ? (
          // ── ESCENARIO A: Rutas Públicas (Sin iniciar sesión) ──
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Ingreso al Sistema' }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Crear Cuenta' }} />
            <Stack.Screen
              name="OTP"
              component={OTPScreen}
              options={{ title: 'Verificar Cuenta', headerBackVisible: false, gestureEnabled: false }}
            />
          </>
        ) : userData?.rol === 'Paciente' ? (
          // ── ESCENARIO B: Paciente Autenticado ──
          <>
            <Stack.Screen
              name="DashboardPaciente"
              component={DashboardPaciente}
              options={{ title: 'Mi Salud', headerBackVisible: false, gestureEnabled: false }}
            />
            <Stack.Screen
              name="BuscarCita"
              component={BuscarCitaScreen}
              options={{ title: 'Buscar y Agendar Cita' }}
            />
          </>
        ) : userData?.rol === 'Profesional' ? (
          // ── ESCENARIO C: Profesional Autenticado ──
          <>
            <Stack.Screen
              name="DashboardProfesional"
              component={DashboardProfesional}
              options={{ title: 'Mi Agenda', headerBackVisible: false, gestureEnabled: false }}
            />
            <Stack.Screen name="PacientesAsignados" component={PacientesAsignadosScreen} options={{ title: 'Pacientes Asignados' }} />
            <Stack.Screen name="HistorialPaciente" component={HistorialPacienteScreen} options={{ title: 'Historial Paciente' }} />
            <Stack.Screen name="Episodio" component={EpisodioScreen} options={{ title: 'Episodios Clínicos' }} />
            <Stack.Screen name="Anamnesis" component={AnamnesisScreen} options={{ title: 'Evaluación Inicial' }} />
            <Stack.Screen name="Inalterabilidad" component={InalterabilidadScreen} options={{ title: 'Inalterabilidad Clínica' }} />
            <Stack.Screen name="EvolucionClinica" component={EvolucionClinicaScreen} options={{ title: 'Evolución Clínica' }} />
            <Stack.Screen name="Intervencion" component={IntervencionScreen} options={{ title: 'Intervención Clínica' }} />
            <Stack.Screen name="MarcasTemporales" component={MarcasTemporalesScreen} options={{ title: 'Marcas Temporales' }} />
          </>
        ) : userData?.rol === 'Administrador' ? (
          // ── ESCENARIO D: Administrador Autenticado (CU59) ──
          <>
            <Stack.Screen
              name="ParametrosScreen"
              component={ParametrosScreen}
              options={{ title: 'Configuración Maestra', headerBackVisible: false, gestureEnabled: false }}
            />
          </>
        ) : (
          // ── ESCENARIO E: Rol Desconocido ──
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Rol no autorizado' }} />
          </>
        )}

        <Stack.Screen 
        name="GestionDisponibilidad" 
        component={GestionDisponibilidadScreen} 
        options={{ title: 'Gestión de Agenda' }} 
        />
        
      </Stack.Navigator>
    </NavigationContainer>
  );
}
