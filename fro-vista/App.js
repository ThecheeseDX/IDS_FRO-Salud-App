// Ruta: fro-vista/App.js
import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext'; // Importamos el proveedor

export default function App() {
  return (
    // Envolvemos el navegador para que el estado global cubra toda la app
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}