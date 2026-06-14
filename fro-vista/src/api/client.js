// Ruta: fro-vista/src/api/client.js
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// IMPORTANTE: Recuerda cambiar esto por la IP local de tu computador (ej: 192.168.1.15)
const COMPUTADORA_IP = '192.168.0.24'; 

const apiClient = axios.create({
  baseURL: `http://${COMPUTADORA_IP}:3000/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: Antes de que cualquier petición salga de la app hacia el backend,
// busca el token guardado y lo inyecta en la cabecera.
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error al obtener token en el interceptor:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;