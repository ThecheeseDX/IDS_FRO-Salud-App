// Ruta: fro-vista/src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Importamos las pantallas reales
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import OTPScreen from '../screens/Auth/OTPScreen';
import DashboardPaciente from '../screens/Paciente/DashboardPaciente';
import DashboardProfesional from '../screens/Profesional/DashboardProfesional';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: { backgroundColor: '#0052cc' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        {/* Rutas Públicas */}
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Ingreso al Sistema' }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Crear Cuenta' }} />
        <Stack.Screen 
          name="OTP" 
          component={OTPScreen} 
          options={{ title: 'Verificar Cuenta', headerBackVisible: false, gestureEnabled: false }} 
        />

        {/* Rutas Privadas */}
        <Stack.Screen 
          name="DashboardPaciente" 
          component={DashboardPaciente} 
          options={{ title: 'Mi Salud', headerBackVisible: false, gestureEnabled: false }} 
        />
        <Stack.Screen 
          name="DashboardProfesional" 
          component={DashboardProfesional} 
          options={{ title: 'Mi Agenda', headerBackVisible: false, gestureEnabled: false }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}