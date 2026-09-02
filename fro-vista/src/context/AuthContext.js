import React, { createContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import apiClient, { setUnauthorizedHandler } from '../api/client';

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

  /**
   * Cierra la sesión localmente. Cuando el cierre lo provoca el servidor
   * (motivo presente), se explica por qué: CU08 exige avisar al usuario que su
   * sesión fue cerrada desde otro dispositivo, y antes se cerraba en silencio.
   */
  const logoutSession = async (motivoRecibido) => {
    // Solo cuenta como motivo lo que manda el interceptor ({codigo, mensaje}).
    // Los botones "Cerrar sesión" llamaban onPress={logoutSession} y React
    // Native pasaba el evento del toque como primer argumento: como era un
    // objeto, se tomaba por motivo y salía el aviso de "sesión expirada" en
    // cada cierre manual.
    const motivo =
      motivoRecibido && typeof motivoRecibido === 'object' && !motivoRecibido.nativeEvent &&
      (motivoRecibido.codigo || motivoRecibido.mensaje)
        ? motivoRecibido
        : null;

    // CU08: se avisa al servidor para que la sesión deje de figurar como
    // activa. Mejor esfuerzo: si falla, el cierre local ocurre igual.
    apiClient.post('/auth/logout').catch(() => {});

    setUserToken(null);
    setUserData(null);
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userData');

    if (motivo) {
      const esRevocada = motivo.codigo === 'SESION_REVOCADA';
      Alert.alert(
        esRevocada ? 'Sesión cerrada' : 'Sesión finalizada',
        motivo.mensaje ||
          (esRevocada
            ? 'La sesión fue cerrada desde otro dispositivo. Inicia sesión nuevamente.'
            : 'Tu sesión expiró. Inicia sesión nuevamente.')
      );
    }
  };

  /** Cierre manual: pide confirmación antes de salir, sin ningún aviso extra. */
  const confirmarCierreSesion = () => {
    Alert.alert('Cerrar sesión', '¿Quieres cerrar tu sesión en este dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => logoutSession() },
    ]);
  };

  // Registra logoutSession como handler del interceptor de Axios.
  // Si el servidor devuelve 401, se limpia estado + SecureStore juntos.
  useEffect(() => {
    setUnauthorizedHandler((motivo) => logoutSession(motivo));
  }, []);

  return (
    <AuthContext.Provider value={{ loginSession, logoutSession, confirmarCierreSesion, userToken, userData, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};