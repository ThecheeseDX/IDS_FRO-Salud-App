import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
 
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
// CU04: Importar pantalla de verificación OTP
import OTPScreen from '../screens/Auth/OTPScreen';
 
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
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: 'Ingreso al Sistema' }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: 'Crear Cuenta' }}
        />
        {/* CU04: Pantalla de verificación OTP — sin botón de volver atrás
            para evitar que el usuario omita la verificación              */}
        <Stack.Screen
          name="OTP"
          component={OTPScreen}
          options={{
            title: 'Verificar Cuenta',
            headerBackVisible: false,   // No puede volver al registro
            gestureEnabled: false,      // Bloquea swipe back en iOS
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
 