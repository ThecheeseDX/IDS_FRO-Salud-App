const { ejecutarTransaccion } = require('../services/external/providerAdapter');

// ⚠️ ─────────────────────────────────────────────────────────────────────────
// CU68/CU70 - ENDPOINT DE REFERENCIA / DEMO  ·  ⚠️ DEUDA TÉCNICA (SE DEBE REEMPLAZAR) ⚠️
//
// Este controlador NO es una funcionalidad de negocio. Existe ÚNICAMENTE para
// DEMOSTRAR y dejar EVIDENCIA de que la capa adaptadora funciona de punta a punta
// y mapea las excepciones estandarizadas a códigos HTTP coherentes.
//
// SE DEBE: reemplazar por la integración real cuando exista un proveedor concreto.
// NO DEJAR EN PRODUCCIÓN: acepta `urlOverride`, lo que habilita SSRF si se expone.
// ─────────────────────────────────────────────────────────────────────────────

// Mapea el err.code estandarizado del adaptador → código HTTP.
function estadoHttpDeError(code) {
  switch (code) {
    case 'FALLO_SINTAXIS':         return 422; // CU68 Exc 1: payload de salida inválido
    case 'RECHAZO_FORMATO':        return 422; // CU70 Exc 1: proveedor rechazó por formato (HTTP 400)
    case 'LATENCIA_CRITICA':       return 504; // timeout / umbral de latencia excedido
    case 'LIMITE_REINTENTOS':      return 503; // CU70 Exc 3: proveedor inalcanzable tras reintentos
    case 'ESQUEMA_INVALIDO':       return 502; // CU68 Exc 4: respuesta divergente
    case 'PROVEEDOR_NO_SOPORTADO': return 400; // proveedor no registrado en PROVIDERS
    default:                       return 500;
  }
}

// POST /api/integracion-demo/ejecutar
exports.ejecutar = async (req, res) => {
  const { proveedor, operacion, datosInternos, usuarioId = null, urlOverride = null } = req.body;

  try {
    const resultado = await ejecutarTransaccion({ proveedor, operacion, datosInternos, usuarioId, urlOverride });
    return res.status(200).json({ ok: true, ...resultado });
  } catch (error) {
    // Toda ruta de error devuelve una respuesta HTTP → no quedan hilos bloqueados (poscondición CU70).
    const status = estadoHttpDeError(error.code);
    return res.status(status).json({
      ok: false,
      code: error.code || 'ERROR_DESCONOCIDO',
      mensaje: error.message,
      detalle: error.detalle || null
    });
  }
};