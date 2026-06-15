const audit = require('../services/audit/transactionAuditService');

// Configurables por entorno (ver nota al final).
const TIMEOUT_MS   = parseInt(process.env.EXTERNAL_TIMEOUT_MS  || '5000', 10);
const MAX_INTENTOS = parseInt(process.env.EXTERNAL_MAX_INTENTOS || '3', 10);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Intenta parsear el cuerpo como JSON; si no lo es, devuelve el texto crudo.
function parsearCuerpo(texto) {
  if (!texto) return null;
  try { return JSON.parse(texto); } catch { return texto; }
}

// Oculta secretos (Authorization, api-key, token) antes de auditar el payload enviado.
function sanearHeaders(headers = {}) {
  const copia = { ...headers };
  for (const k of Object.keys(copia)) {
    if (/authorization|api[-_]?key|token|secret/i.test(k)) copia[k] = '***';
  }
  return copia;
}

// ─────────────────────────────────────────────────────────────────────────────
// CU68 - Paso 3: Cliente HTTP base para proveedores externos.
// Timeout estricto (Excepción 3) + reintentos automáticos en 5xx/red (Excepción 2),
// con auditoría integrada vía transactionAuditService.
// ─────────────────────────────────────────────────────────────────────────────
async function enviarPeticion({
  proveedor,
  operacion,
  url,
  method = 'GET',
  headers = {},
  body = null,
  usuarioId = null,
  timeoutMs = TIMEOUT_MS,
  maxIntentos = MAX_INTENTOS
}) {
  if (!url) {
    const err = new Error('externalHttpClient: falta la URL de destino.');
    err.code = 'FALLO_SINTAXIS';
    throw err;
  }

  // Excepción 1: iniciarTransaccion valida proveedor/operacion y lanza si faltan.
  const payloadEnviado = { url, method, headers: sanearHeaders(headers), body };
  const ctx = await audit.iniciarTransaccion({ proveedor, operacion, payloadEnviado, usuarioId });

  let ultimoError = null;

  for (let intento = 1; intento <= maxIntentos; intento++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body != null && method !== 'GET'
          ? (typeof body === 'string' ? body : JSON.stringify(body))
          : undefined,
        signal: controller.signal
      });
      clearTimeout(timer);

      const textoCrudo = await res.text();
      const data = parsearCuerpo(textoCrudo);

      // ── Excepción 2: 5xx = caída del servicio → reintentar ──────────────
      if (res.status >= 500) {
        ultimoError = new Error(`El proveedor respondió HTTP ${res.status}`);
        if (intento < maxIntentos) {
          await sleep(300 * intento); // backoff incremental
          continue;
        }
        await audit.registrarFalloRed(ctx, { error: ultimoError, codigoRespuesta: res.status, intento });
        const err = new Error(`El proveedor ${proveedor} falló tras ${intento} intentos (HTTP ${res.status}).`);
        err.code = 'FALLO_RED';
        err.status = res.status;
        throw err;
      }

      // El proveedor respondió (2xx–4xx). Auditamos éxito (marca latencia crítica si fue lento).
      const { estado, latencia } = await audit.registrarExito(ctx, {
        codigoRespuesta: res.status,
        payloadRecibido: textoCrudo
      });
      return { status: res.status, data, raw: textoCrudo, latencia, estado, intentos: intento };

    } catch (error) {
      clearTimeout(timer);

      // ── Excepción 3: timeout → latencia crítica, se interrumpe (sin reintento) ──
      if (error.name === 'AbortError') {
        await audit.registrarLatenciaCritica(ctx, {});
        const err = new Error(`Tiempo de espera agotado (${timeoutMs} ms) con el proveedor ${proveedor}.`);
        err.code = 'LATENCIA_CRITICA';
        throw err;
      }

      // Errores ya estandarizados arriba (5xx agotado): re-lanzar sin auditar de nuevo.
      if (error.code === 'FALLO_RED') throw error;

      // ── Excepción 2: error de red → reintentar ──────────────────────────
      ultimoError = error;
      if (intento < maxIntentos) {
        await sleep(300 * intento);
        continue;
      }
      await audit.registrarFalloRed(ctx, { error, intento });
      const err = new Error(`No se pudo conectar con el proveedor ${proveedor} tras ${intento} intentos.`);
      err.code = 'FALLO_RED';
      throw err;
    }
  }

  // Salvaguarda (no debería alcanzarse).
  await audit.registrarFalloRed(ctx, { error: ultimoError || new Error('Fallo desconocido'), intento: maxIntentos });
  const err = new Error(`Fallo de comunicación con el proveedor ${proveedor}.`);
  err.code = 'FALLO_RED';
  throw err;
}

module.exports = { enviarPeticion };