import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const COMPUTADORA_IP = '192.168.1.10';

const apiClient = axios.create({
  baseURL: `http://${COMPUTADORA_IP}:3000/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Canal para que AuthContext inyecte su logoutSession.
// Se llama una sola vez al montar el contexto.
let _onUnauthorized = null;
export const setUnauthorizedHandler = (handler) => {
  _onUnauthorized = handler;
};

// Interceptor de peticiones: inyecta el token en cada llamada.
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
  (error) => Promise.reject(error)
);

// Interceptor de respuestas: si el servidor devuelve 401 (token expirado
// o inválido), dispara el logout completo a través del AuthContext.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && _onUnauthorized) {
      _onUnauthorized();
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

export const getPacientesProfesional = async (profesionalId, buscar = '') => {
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

export const getHistorialPaciente = async (pacienteId, usuarioId) => {
  const response = await apiClient.get(
    `/profesionales/pacientes/${pacienteId}/historial`,
    {
      params: { usuarioId },
    }
  );

  return response.data;
};

export const getPacientesUsuarioProfesional = async (usuarioId, buscar = '') => {
  const response = await apiClient.get(
    `/profesionales/usuario/${usuarioId}/pacientes`,
    {
      params: { buscar },
    }
  );

  return response.data;
};

// =========================================================================
// CU29 - FICHA CLÍNICA / ANAMNESIS
// =========================================================================

export const getFichaClinica = async (pacienteId) => {
  const response = await apiClient.get(`/clinica/ficha/${pacienteId}`);
  return response.data;
};

export const guardarAnamnesis = async (payload) => {
  const response = await apiClient.post('/clinica/ficha', payload);
  return response.data;
};

export default apiClient;