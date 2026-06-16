import React, { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { setUnauthorizedHandler } from '../api/client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const loginSession = async (token, usuario) => {
    setUserToken(token);
    setUserData(usuario);
    await SecureStore.setItemAsync('userToken', token);
    await SecureStore.setItemAsync('userData', JSON.stringify(usuario));
  };

  const logoutSession = async () => {
    setUserToken(null);
    setUserData(null);
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userData');
  };

  // Registra logoutSession como handler del interceptor de Axios.
  // Si el servidor devuelve 401, se limpia estado + SecureStore juntos.
  useEffect(() => {
    setUnauthorizedHandler(logoutSession);
  }, []);

  return (
    <AuthContext.Provider value={{ loginSession, logoutSession, userToken, userData, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};