// Ruta: fro-vista/src/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Al abrir la app, revisamos si ya había una sesión guardada
  const checkToken = async () => {
    try {
      let token = await SecureStore.getItemAsync('userToken');
      let user = await SecureStore.getItemAsync('userData');
      if (token && user) {
        setUserToken(token);
        setUserData(JSON.parse(user));
      }
    } catch (e) {
      console.log('Error leyendo la sesión:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkToken();
  }, []);

  // Función para guardar la sesión cuando el Login es exitoso
  const loginSession = async (token, usuario) => {
    setUserToken(token);
    setUserData(usuario);
    await SecureStore.setItemAsync('userToken', token);
    await SecureStore.setItemAsync('userData', JSON.stringify(usuario));
  };

  // Función para cerrar sesión
  const logoutSession = async () => {
    setUserToken(null);
    setUserData(null);
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userData');
  };

  return (
    <AuthContext.Provider value={{ loginSession, logoutSession, userToken, userData, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};