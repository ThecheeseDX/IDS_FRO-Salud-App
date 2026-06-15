const { ejecutarTransaccion } = require('../services/external/providerAdapter');

// ⚠️ ─────────────────────────────────────────────────────────────────────────
// CU68 - ENDPOINT DE REFERENCIA / DEMO  ·  ⚠️ DEUDA TÉCNICA (SE DEBE REEMPLAZAR) ⚠️
//
// Este controlador NO es una funcionalidad de negocio. Existe ÚNICAMENTE para
// DEMOSTRAR y dejar EVIDENCIA de que la capa adaptadora del CU68 funciona de punta
// a punta y mapea las excepciones estandarizadas a códigos HTTP coherentes.
//
// SE DEBE: reemplazar por la integración real cuando exista un proveedor concreto
//          (triaje IA / IMED / pago) con sus credenciales y contrato.
// NO DEJAR EN PRODUCCIÓN: acepta `urlOverride`, lo que habilita SSRF si se expone.
//          Eliminar este endpoint o protegerlo (auth + lista blanca) antes de prod.
// ─────────────────────────────────────────────────────────────────────────────

// Mapea el err.code estandarizado del adaptador → código HTTP (resuelve el [VERIFICAR]).
function estadoHttpDeError(code) {
  switch (code) {
    case 'FALLO_SINTAXIS':         return 422; // Excepción 1: payload de salida inválido
    case 'LATENCIA_CRITICA':       return 504; // Excepción 3: timeout / umbral excedido
    case 'FALLO_RED':              return 502; // Excepción 2: proveedor caído tras reintentos
    case 'ESQUEMA_INVALIDO':       return 502; // Excepción 4: respuesta divergente
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
    const status = estadoHttpDeError(error.code);
    return res.status(status).json({
      ok: false,
      code: error.code || 'ERROR_DESCONOCIDO',
      mensaje: error.message,
      detalle: error.detalle || null
    });
  }
};