// Ruta: fro-vista/src/api/client.js

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// IMPORTANTE: Cambiar por la IP local de tu computador
const COMPUTADORA_IP = '192.168.1.10';

const apiClient = axios.create({
  baseURL: `http://${COMPUTADORA_IP}:3000/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// =========================================================================
// 📤 INTERCEPTOR DE PETICIONES
// =========================================================================

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('userToken');

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error al obtener token:', error);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// =========================================================================
// 📥 INTERCEPTOR DE RESPUESTAS
// =========================================================================

apiClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    if (error.response && error.response.status === 401) {
      console.warn(
        '🔒 RBAC [Excepción 1]: Token expirado/inválido. Limpiando bóveda segura...'
      );

      try {
        await SecureStore.deleteItemAsync('userToken');
        await SecureStore.deleteItemAsync('userData');
      } catch (storeError) {
        console.error('Error al limpiar SecureStore:', storeError);
      }
    }

    return Promise.reject(error);
  }
);

// =========================================================================
// 🔐 AUTH
// =========================================================================

export const login = async (rut, contrasena) => {
  const response = await apiClient.post('/auth/login', {
    rut,
    contrasena,
  });

  return response.data;
};

// =========================================================================
// 👨‍⚕️ CU11 - PACIENTES ASIGNADOS
// =========================================================================

export const getPacientesProfesional = async (
  profesionalId,
  buscar = ''
) => {
  const response = await apiClient.get(
    `/profesionales/${profesionalId}/pacientes`,
    {
      params: { buscar },
    }
  );

  return response.data;
};

// =========================================================================
// 📋 HISTORIAL PACIENTE
// =========================================================================

export const getHistorialPaciente = async (pacienteId) => {
  const response = await apiClient.get(
    `/profesionales/pacientes/${pacienteId}/historial`
  );

  return response.data;
};

// =========================================================================

export const getPacientesUsuarioProfesional = async (usuarioId, buscar = '') => {
  const response = await apiClient.get(
    `/profesionales/usuario/${usuarioId}/pacientes`,
    {
      params: { buscar },
    }
  );

  return response.data;
};

export default apiClient;