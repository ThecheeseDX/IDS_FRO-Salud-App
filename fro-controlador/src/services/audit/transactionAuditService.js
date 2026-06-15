const TransactionAuditModel = require('../../models/transactionAuditModel');

const UMBRAL_LATENCIA_MS = parseInt(process.env.LATENCIA_UMBRAL_MS || '5000', 10);
const ACCION = 'INTEGRACION_EXTERNA';

function serializar(payload) {
  if (payload == null) return null;
  if (typeof payload === 'string') return payload;
  try { return JSON.stringify(payload); } catch { return String(payload); }
}

function atributosFaltantes({ proveedor, operacion }) {
  const faltantes = [];
  if (!proveedor) faltantes.push('proveedor');
  if (!operacion) faltantes.push('operacion');
  return faltantes;
}

// Escribe UNA fila de evento en Bitacora_Auditoria (detalle en datos_adicionales).
async function escribirEvento({ proveedor, operacion, usuarioId, estado, datos }) {
  try {
    await TransactionAuditModel.registrar({
      accion: ACCION,
      entidad_afectada: proveedor || 'DESCONOCIDO',
      usuario_id: usuarioId || null,
      datos: { operacion, estado, ...datos }
    });
  } catch (e) {
    console.error('[transactionAudit] No se pudo escribir en la bitácora:', e.message);
  }
}

// ── Excepción 1 (standalone): payload sin atributos obligatorios. ──
async function registrarFalloSintaxis({ proveedor, operacion, usuarioId = null, faltantes = [], payloadEnviado = null, error = null }) {
  await escribirEvento({
    proveedor, operacion, usuarioId,
    estado: 'FALLO_SINTAXIS',
    datos: {
      error_detalle: error?.message
        || (faltantes.length ? `Atributos obligatorios ausentes: ${faltantes.join(', ')}` : 'Fallo de sintaxis en el payload de salida.'),
      payload_enviado: serializar(payloadEnviado)
    }
  });
}

// ── Excepción 4 (standalone): respuesta con esquema divergente; aísla el paquete crudo. ──
async function registrarEsquemaDivergente({ proveedor, operacion, usuarioId = null, payloadRecibido = null, error = null }) {
  await escribirEvento({
    proveedor, operacion, usuarioId,
    estado: 'ESQUEMA_INVALIDO',
    datos: {
      payload_recibido: serializar(payloadRecibido),
      error_detalle: error?.message || String(error || 'Esquema de respuesta divergente.')
    }
  });
}

// ── Inicia la transacción (lifecycle de red). Valida proveedor/operacion (Excepción 1). ──
async function iniciarTransaccion({ proveedor, operacion, payloadEnviado = null, usuarioId = null }) {
  const faltantes = atributosFaltantes({ proveedor, operacion });
  if (faltantes.length > 0) {
    await registrarFalloSintaxis({ proveedor, operacion, usuarioId, faltantes, payloadEnviado });
    const err = new Error(`Transmisión abortada: faltan atributos obligatorios (${faltantes.join(', ')}).`);
    err.code = 'FALLO_SINTAXIS';
    throw err;
  }
  return { proveedor, operacion, usuarioId, payloadEnviado, inicio: Date.now() };
}

// ── Éxito: mide latencia y la marca crítica si excede el umbral (Excepción 3). ──
async function registrarExito(ctx, { codigoRespuesta = 200, payloadRecibido = null } = {}) {
  const latencia = Date.now() - ctx.inicio;
  const estado = latencia > UMBRAL_LATENCIA_MS ? 'LATENCIA_CRITICA' : 'EXITOSA';
  await escribirEvento({
    ...ctx, estado,
    datos: {
      codigo_respuesta: codigoRespuesta,
      latencia_ms: latencia,
      payload_enviado: serializar(ctx.payloadEnviado),
      payload_recibido: serializar(payloadRecibido)
    }
  });
  return { estado, latencia };
}

// ── Excepción 3: latencia crítica explícita. ──
async function registrarLatenciaCritica(ctx, { codigoRespuesta = null } = {}) {
  const latencia = ctx?.inicio ? Date.now() - ctx.inicio : null;
  await escribirEvento({
    ...ctx, estado: 'LATENCIA_CRITICA',
    datos: {
      codigo_respuesta: codigoRespuesta,
      latencia_ms: latencia,
      error_detalle: `Tiempo de respuesta (${latencia} ms) excede el umbral (${UMBRAL_LATENCIA_MS} ms).`,
      payload_enviado: serializar(ctx?.payloadEnviado)
    }
  });
  return { latencia };
}

// ── Excepción 2: caída de red / servicio. ──
async function registrarFalloRed(ctx, { error, codigoRespuesta = null, intento = 1 } = {}) {
  const latencia = ctx?.inicio ? Date.now() - ctx.inicio : null;
  await escribirEvento({
    ...ctx, estado: 'FALLO_RED',
    datos: {
      codigo_respuesta: codigoRespuesta,
      latencia_ms: latencia,
      intento,
      error_detalle: error?.message || String(error),
      payload_enviado: serializar(ctx?.payloadEnviado)
    }
  });
}

module.exports = {
  iniciarTransaccion,
  registrarExito,
  registrarLatenciaCritica,
  registrarFalloRed,
  registrarFalloSintaxis,
  registrarEsquemaDivergente,
  UMBRAL_LATENCIA_MS
};