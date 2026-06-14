// Ruta: fro-vista/src/api/client.js
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// IMPORTANTE: Recuerda cambiar esto por la IP local de tu computador (ej: 192.168.1.15)
const COMPUTADORA_IP = '192.168.1.4'; 

const apiClient = axios.create({
  baseURL: `http://${COMPUTADORA_IP}:3000/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// =========================================================================
// 📤 INTERCEPTOR DE PETICIONES (Request) - Creado por el equipo
// =========================================================================
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Busca el token cifrado y lo inyecta en la cabecera
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

// =========================================================================
// 📥 INTERCEPTOR DE RESPUESTAS (Response) - Manejo de Excepción 1 (401)
// =========================================================================
apiClient.interceptors.response.use(
  (response) => {
    // Petición exitosa, la dejamos pasar al controlador de la pantalla
    return response;
  },
  async (error) => {
    // Verificamos si el backend nos detuvo con un error de autorización
    if (error.response && error.response.status === 401) {
      console.warn("🔒 RBAC [Excepción 1]: Token expirado/inválido. Limpiando bóveda segura...");
      
      try {
        // Borramos las credenciales cifradas para forzar el cierre de sesión
        await SecureStore.deleteItemAsync('userToken');
        await SecureStore.deleteItemAsync('userData');
      } catch (storeError) {
        console.error("Error al limpiar SecureStore:", storeError);
      }

      // El estado global (AuthContext) de la app detectará eventualmente la falta de datos, 
      // o la pantalla actual forzará el desvío al LoginScreen.
    }
    
    // Rechazamos la promesa para que la pantalla atrape el error 
    // y pueda mostrar alertas visuales (ej. Excepción 2 o 4).
    return Promise.reject(error);
  }
);

export default apiClient;