// Ruta: fro-vista/src/navigation/AppNavigator.js
import React, { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthContext } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import OTPScreen from '../screens/Auth/OTPScreen';
import DashboardPaciente from '../screens/Paciente/DashboardPaciente';
import DashboardProfesional from '../screens/Profesional/DashboardProfesional';
// CU13: Pantalla de episodios clínicos
import EpisodioScreen from '../screens/Profesional/EpisodioScreen';

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
          // ── ESCENARIO A: Rutas Públicas ──
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
            {/* CU13: Episodios clínicos — acceso auditado automáticamente */}
            <Stack.Screen
              name="Episodio"
              component={EpisodioScreen}
              options={{ title: 'Episodios Clínicos' }}
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