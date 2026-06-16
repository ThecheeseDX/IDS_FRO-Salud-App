import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const COMPUTADORA_IP = '192.168.100.52';

const apiClient = axios.create({
  baseURL: `http://${COMPUTADORA_IP}:3000/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Canal para que AuthContext inyecte su logoutSession.
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

// Interceptor de respuestas.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // 401: token expirado/inválido → logout global (vía AuthContext).
    if (status === 401 && _onUnauthorized) {
      _onUnauthorized();
    }

    // ── CU70 Exc 3: el backend agotó los reintentos contra el proveedor externo (HTTP 503). ──
    // Enriquecemos el error para que la pantalla que hizo la llamada muestre <ErrorRetry/>.
    if (status === 503) {
      error.proveedorNoDisponible = true;
      error.mensajeUsuario = 'El proveedor externo no respondió tras varios intentos. Inténtalo nuevamente en unos minutos.';
    }

    return Promise.reject(error);
  }
);

// =========================================================================
// AUTH
// =========================================================================

export const login = async (rut, contrasena) => {
  const response = await apiClient.post('/auth/login', {
    rut,
    contrasena,
  });

  return response.data;
};

// =========================================================================
// CU11 - PACIENTES ASIGNADOS
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
// HISTORIAL PACIENTE
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

// =========================================================================
// CU40 - INTERVENCION Y RESPUESTA FISIOLOGICA
// =========================================================================

export const getSesionesIntervencion = async () => {
  const response = await apiClient.get('/clinica/intervenciones/sesiones');
  return response.data;
};

export const getIntervencion = async (episodioId) => {
  const response = await apiClient.get(`/clinica/intervenciones/${episodioId}`);
  return response.data;
};

export const guardarIntervencion = async (episodioId, payload) => {
  const response = await apiClient.put(
    `/clinica/intervenciones/${episodioId}`,
    payload
  );
  return response.data;
};

// =========================================================================
// CU38 - MARCAS TEMPORALES DE LA PRESTACION
// =========================================================================

export const getCitasMarcasTemporales = async () => {
  const response = await apiClient.get('/citas/marcas-temporales');
  return response.data;
};

export const iniciarAtencion = async (citaId, payload = {}) => {
  const response = await apiClient.post(
    `/citas/marcas-temporales/${citaId}/iniciar`,
    payload
  );
  return response.data;
};

export const finalizarAtencion = async (citaId, payload = {}) => {
  const response = await apiClient.post(
    `/citas/marcas-temporales/${citaId}/finalizar`,
    payload
  );
  return response.data;
};

export default apiClient;
