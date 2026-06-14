// Ruta: fro-vista/src/navigation/AppNavigator.js
import React, { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// 1. Importamos el contexto global para saber quién está logueado
import { AuthContext } from '../context/AuthContext';

// Importamos las pantallas reales
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import OTPScreen from '../screens/Auth/OTPScreen';
import DashboardPaciente from '../screens/Paciente/DashboardPaciente';
import DashboardProfesional from '../screens/Profesional/DashboardProfesional';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  // 2. Extraemos los datos de la sesión actual
  const { userToken, userData, isLoading } = useContext(AuthContext);

  // 3. Pantalla de carga mientras lee el SecureStore
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
        {/* =========================================================
            🛡️ LÓGICA DE RBAC (Excepción 4)
            ========================================================= */}

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
          </>
        ) : userData?.rol === 'Profesional' ? (
          // ── ESCENARIO C: Profesional Autenticado ──
          <>
            <Stack.Screen 
              name="DashboardProfesional" 
              component={DashboardProfesional} 
              options={{ title: 'Mi Agenda', headerBackVisible: false, gestureEnabled: false }} 
            />
          </>
        ) : (
          // ── ESCENARIO D: Administrador o Rol Desconocido ──
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Rol no autorizado' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}