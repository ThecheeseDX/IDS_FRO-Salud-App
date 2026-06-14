import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
// CU04: Pantalla de verificación OTP
import OTPScreen from '../screens/Auth/OTPScreen';

// =================================================================
// PANTALLAS MOCKUP (Bases provisionales para probar el enrutamiento)
// =================================================================
const DashboardPaciente = () => (
  <View style={[styles.mockupContainer, { backgroundColor: '#e3f2fd' }]}>
    <Text style={styles.mockupText}>🏥 Panel de Paciente</Text>
  </View>
);
const DashboardProfesional = () => (
  <View style={[styles.mockupContainer, { backgroundColor: '#e8f5e9' }]}>
    <Text style={styles.mockupText}>💼 Panel de Profesional</Text>
  </View>
);
const DashboardAdmin = () => (
  <View style={[styles.mockupContainer, { backgroundColor: '#ffebee' }]}>
    <Text style={styles.mockupText}>⚙️ Panel de Administración</Text>
  </View>
);

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

        {/* CU04: Verificación OTP — sin botón de volver para evitar saltarse la verificación */}
        <Stack.Screen
          name="OTP"
          component={OTPScreen}
          options={{
            title: 'Verificar Cuenta',
            headerBackVisible: false,
            gestureEnabled: false,
          }}
        />

        {/* Rutas Privadas (Protegidas por Sesión) */}
        <Stack.Screen name="DashboardPaciente" component={DashboardPaciente} options={{ title: 'Mi Salud', headerBackVisible: false }} />
        <Stack.Screen name="DashboardProfesional" component={DashboardProfesional} options={{ title: 'Mi Agenda', headerBackVisible: false }} />
        <Stack.Screen name="DashboardAdmin" component={DashboardAdmin} options={{ title: 'Control Central', headerBackVisible: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  mockupContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mockupText: { fontSize: 24, fontWeight: 'bold', color: '#333' }
});