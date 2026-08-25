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
import RecuperarContrasenaScreen from '../screens/Auth/RecuperarContrasenaScreen';
// Pantallas — Paciente
import DashboardPaciente from '../screens/Paciente/DashboardPaciente';
import MisCitasScreen from '../screens/Paciente/MisCitasScreen';
import MisPautasScreen from '../screens/Paciente/MisPautasScreen';
import TriajeScreen from '../screens/Paciente/TriajeScreen';
import PagosScreen from '../screens/Paciente/PagosScreen';
import BuscarCitaScreen from '../screens/Paciente/BuscarCitaScreen';
// Pantallas — Profesional
import DashboardProfesional from '../screens/Profesional/DashboardProfesional';
import GestionDisponibilidadScreen from '../screens/Profesional/GestionDisponibilidadScreen';
import FichaClinicaScreen from '../screens/Profesional/FichaClinica/FichaClinicaScreen';
import TrazabilidadScreen from '../screens/Profesional/Trazabilidad/TrazabilidadScreen';
// Pantallas — Administrador
import ParametrosScreen from '../screens/Admin/ParametrosScreen';
// Pantallas — Comunes a todos los roles
import SeguridadScreen from '../screens/Comun/SeguridadScreen';
import EvidenciaSesionScreen from '../screens/Comun/EvidenciaSesionScreen';
import FirmaConformidadScreen from '../screens/Profesional/FirmaConformidadScreen';
import DocumentosScreen from '../screens/Comun/DocumentosScreen';
import VisorDocumentoScreen from '../screens/Comun/VisorDocumentoScreen';

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
              name="RecuperarContrasena"
              component={RecuperarContrasenaScreen}
              options={{ title: 'Recuperar Contraseña' }}
            />
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
            {/* Gestión de citas unificada: listado + reserva desde el botón flotante */}
            <Stack.Screen name="MisCitas" component={MisCitasScreen} options={{ title: 'Mis Citas' }} />
            <Stack.Screen name="MisPautas" component={MisPautasScreen} options={{ title: 'Mis Ejercicios' }} />
            <Stack.Screen name="Triaje" component={TriajeScreen} options={{ title: 'Entrevista Previa' }} />
            <Stack.Screen name="Pagos" component={PagosScreen} options={{ title: 'Pagos y Bonos' }} />
            <Stack.Screen name="EvidenciaSesion" component={EvidenciaSesionScreen} options={{ title: 'Evidencia de Sesión' }} />
            <Stack.Screen
              name="BuscarCita"
              component={BuscarCitaScreen}
              options={{ title: 'Buscar y Agendar Cita' }}
            />
            <Stack.Screen name="Seguridad" component={SeguridadScreen} options={{ title: 'Seguridad de la Cuenta' }} />
            {/* CU35: el paciente consulta su repositorio con el visor embebido */}
            <Stack.Screen name="Documentos" component={DocumentosScreen} options={{ title: 'Mis Documentos' }} />
            <Stack.Screen name="VisorDocumento" component={VisorDocumentoScreen} options={{ title: 'Visor de Documento' }} />
          </>
        ) : userData?.rol === 'Profesional' ? (
          // ── ESCENARIO C: Profesional Autenticado ──
          <>
            {/* El dashboard es la lista de pacientes asignados */}
            <Stack.Screen
              name="DashboardProfesional"
              component={DashboardProfesional}
              options={{ title: 'Mis Pacientes', headerBackVisible: false, gestureEnabled: false }}
            />
            {/* Ficha clínica consolidada: historial, anamnesis, episodios, evolución e intervención */}
            <Stack.Screen name="FichaClinica" component={FichaClinicaScreen} options={{ title: 'Ficha Clínica' }} />
            {/* Auditoría y seguridad del documento clínico */}
            <Stack.Screen
              name="Trazabilidad"
              component={TrazabilidadScreen}
              options={{ title: 'Trazabilidad del Documento' }}
            />
            <Stack.Screen
              name="GestionDisponibilidad"
              component={GestionDisponibilidadScreen}
              options={{ title: 'Gestión de Agenda' }}
            />
            <Stack.Screen name="Seguridad" component={SeguridadScreen} options={{ title: 'Seguridad de la Cuenta' }} />
            <Stack.Screen name="EvidenciaSesion" component={EvidenciaSesionScreen} options={{ title: 'Evidencia de Sesión' }} />
            <Stack.Screen name="FirmaConformidad" component={FirmaConformidadScreen} options={{ title: 'Firma de Conformidad' }} />
            {/* CU33/CU34/CU35: repositorio multimedia del paciente en atención */}
            <Stack.Screen name="Documentos" component={DocumentosScreen} options={{ title: 'Documentos del Paciente' }} />
            <Stack.Screen name="VisorDocumento" component={VisorDocumentoScreen} options={{ title: 'Visor de Documento' }} />
          </>
        ) : userData?.rol === 'Administrador' ? (
          // ── ESCENARIO D: Administrador Autenticado (CU59) ──
          <>
            <Stack.Screen
              name="ParametrosScreen"
              component={ParametrosScreen}
              options={{ title: 'Configuración Maestra', headerBackVisible: false, gestureEnabled: false }}
            />
            <Stack.Screen name="Seguridad" component={SeguridadScreen} options={{ title: 'Seguridad de la Cuenta' }} />
          </>
        ) : (
          // ── ESCENARIO E: Rol Desconocido ──
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Rol no autorizado' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
