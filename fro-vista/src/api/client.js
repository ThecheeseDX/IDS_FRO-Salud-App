import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ── Dirección del backend ────────────────────────────────────────────────────
// En la nube se define EXPO_PUBLIC_API_URL en el archivo .env de fro-vista
// (ej. EXPO_PUBLIC_API_URL=https://fro-salud-api.onrender.com).
// Si no está definida, se usa la IP local de respaldo para trabajar sin nube.
const COMPUTADORA_IP = '192.168.1.130';
const URL_LOCAL = `http://${COMPUTADORA_IP}:3000`;

const servidor = (process.env.EXPO_PUBLIC_API_URL || URL_LOCAL).replace(/\/+$/, '');
// Se acepta tanto la URL con /api al final como sin ella.
const baseURL = servidor.endsWith('/api') ? servidor : `${servidor}/api`;

const apiClient = axios.create({
  baseURL,
  timeout: 100000,
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
    //
    // Solo aplica a peticiones que iban autenticadas: un login con contraseña
    // equivocada también responde 401, y ahí no corresponde avisar que "la
    // sesión fue cerrada" — no había ninguna sesión que cerrar.
    const ibaAutenticada = Boolean(error.config?.headers?.Authorization);

    if (status === 401 && ibaAutenticada && _onUnauthorized) {
      const datos = error.response?.data || {};
      _onUnauthorized({
        codigo: datos.code || null,
        mensaje: datos.error || datos.mensaje || null,
      });
    }

    // ── CU70 Exc 3: el backend agotó los reintentos contra el proveedor externo (HTTP 503). ──
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

// Pasa la atención en curso a otro episodio del mismo profesional: el paciente
// llegó por un motivo nuevo y la sesión se registra en el episodio nuevo.
export const trasladarAtencion = async (episodioId) => {
  const response = await apiClient.put(`/clinica/intervenciones/${episodioId}/atencion`);
  return response.data;
};

// =========================================================================
// CU38 - MARCAS TEMPORALES DE LA PRESTACION
// =========================================================================

// Opción C: la atención que el profesional tiene abierta ahora mismo, o null.
export const getAtencionEnCurso = async () => {
  const response = await apiClient.get('/citas/atencion-en-curso');
  return response.data;
};

// Sin rango devuelve toda la agenda; con desde/hasta (AAAA-MM-DD) solo esa
// franja, que es lo que necesita la jornada por día.
export const getCitasMarcasTemporales = async (rango = {}) => {
  const params = {};
  if (rango.desde && rango.hasta) {
    params.desde = rango.desde;
    params.hasta = rango.hasta;
  }
  const response = await apiClient.get('/citas/marcas-temporales', { params });
  return response.data;
};

export const getComunas = async () => {
  const response = await apiClient.get('/auth/comunas');
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

// ─────────────────────────────────────────────────────────────────────────────
//  CU52 — Centro de notificaciones, preferencias y dispositivos push
// ─────────────────────────────────────────────────────────────────────────────

export const getNotificaciones = async (pagina = 0) => {
  const response = await apiClient.get('/notificaciones', { params: { pagina } });
  return response.data;
};

export const getResumenNotificaciones = async () => {
  const response = await apiClient.get('/notificaciones/resumen');
  return response.data;
};

export const marcarNotificacionLeida = async (id) => {
  const response = await apiClient.post(`/notificaciones/${id}/leer`);
  return response.data;
};

export const marcarTodasLeidas = async () => {
  const response = await apiClient.post('/notificaciones/leer-todas');
  return response.data;
};

export const getPreferenciasNotificacion = async () => {
  const response = await apiClient.get('/notificaciones/preferencias');
  return response.data;
};

export const guardarPreferenciasNotificacion = async (preferencias) => {
  const response = await apiClient.put('/notificaciones/preferencias', preferencias);
  return response.data;
};

export const registrarDispositivoPush = async (token, plataforma) => {
  const response = await apiClient.post('/notificaciones/dispositivo', { token, plataforma });
  return response.data;
};

export const olvidarDispositivoPush = async (token) => {
  const response = await apiClient.delete('/notificaciones/dispositivo', { data: { token } });
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
//  CU21 — Confirmación de asistencia
// ─────────────────────────────────────────────────────────────────────────────

export const getConfirmacionesPendientes = async () => {
  const response = await apiClient.get('/citas/confirmaciones/pendientes');
  return response.data;
};

export const pedirNuevaSolicitudConfirmacion = async (citaId) => {
  const response = await apiClient.post(`/citas/${citaId}/solicitar-confirmacion`);
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
//  CU19 — Lista de espera
// ─────────────────────────────────────────────────────────────────────────────

export const getMisListasEspera = async () => {
  const response = await apiClient.get('/citas/mis-listas-espera');
  return response.data;
};

export const inscribirseListaEspera = async (citaId) => {
  const response = await apiClient.post(`/citas/${citaId}/lista-espera`);
  return response.data;
};

export const salirListaEspera = async (citaId) => {
  const response = await apiClient.delete(`/citas/${citaId}/lista-espera`);
  return response.data;
};

export const tomarCupoListaEspera = async (listaEsperaId) => {
  const response = await apiClient.post(`/citas/lista-espera/${listaEsperaId}/tomar`);
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
//  CU25 / CU26 / CU50 — Triaje inteligente, derivación y seguimiento
// ─────────────────────────────────────────────────────────────────────────────

export const getReportePreclinico = async (pacienteId) => {
  const response = await apiClient.get(`/clinica/pacientes/${pacienteId}/reporte-preclinico`);
  return response.data;
};

export const getMiDerivacion = async () => {
  const response = await apiClient.get('/clinica/mi-derivacion');
  return response.data;
};

export const enviarReporteSintomas = async (payload) => {
  const response = await apiClient.post('/clinica/sintomas', payload);
  return response.data;
};

export const getMisSintomas = async () => {
  const response = await apiClient.get('/clinica/mis-sintomas');
  return response.data;
};

export const getSintomasDePaciente = async (pacienteId) => {
  const response = await apiClient.get(`/clinica/pacientes/${pacienteId}/sintomas`);
  return response.data;
};

export const getAlertasClinicas = async () => {
  const response = await apiClient.get('/clinica/alertas');
  return response.data;
};

export const revisarAlertaClinica = async (alertaId) => {
  const response = await apiClient.post(`/clinica/alertas/${alertaId}/revisar`);
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
//  CU44 / CU45 — Adherencia y panel de progreso
// ─────────────────────────────────────────────────────────────────────────────

export const getMiProgreso = async ({ desde, hasta } = {}) => {
  const params = {};
  if (desde) params.desde = desde;
  if (hasta) params.hasta = hasta;
  const response = await apiClient.get('/clinica/mi-progreso', { params });
  return response.data;
};

export const getAdherenciaDePaciente = async (pacienteId) => {
  const response = await apiClient.get(`/clinica/pacientes/${pacienteId}/adherencia`);
  return response.data;
};

export default apiClient;
