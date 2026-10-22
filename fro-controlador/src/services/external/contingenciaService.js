/**
 * CU72 — ¿Está el financiador en contingencia? (Incremento 4, decisión D5)
 *
 * La interfaz de ingreso manual de bonos solo se habilita cuando la
 * validación automática no es posible. Hay dos formas de entrar:
 *
 *   - AUTOMATICA: la última transacción con el financiador dentro de la
 *     ventana (VENTANA_CONTINGENCIA_MINUTOS, 30 por defecto) terminó con los
 *     reintentos agotados o sin respuesta. La capa adaptadora (CU68-CU70) ya
 *     deja ese rastro en Bitacora_Auditoria; aquí solo se lee.
 *   - MANUAL: un administrador fuerza el modo con el parámetro global
 *     MODO_CONTINGENCIA_FINANCIADOR = 1.
 *
 * Una transacción exitosa posterior apaga la contingencia automática.
 */

const { leerParametroEntero } = require('../agenda/agendaService');

const CLAVE_MODO = 'MODO_CONTINGENCIA_FINANCIADOR';
const CLAVE_VENTANA = 'VENTANA_CONTINGENCIA_MINUTOS';

function esFalla(estado, codigoRespuesta) {
  if (estado === 'LIMITE_REINTENTOS') return true;
  // Un éxito lento también se anota como LATENCIA_CRITICA, pero con código
  // de respuesta. Sin código fue un tiempo de espera agotado: el financiador
  // no contestó.
  const sinCodigo = codigoRespuesta === null || codigoRespuesta === undefined || codigoRespuesta === 'null';
  return estado === 'LATENCIA_CRITICA' && sinCodigo;
}

/**
 * @returns {Promise<{activa:boolean, origen:'MANUAL'|'AUTOMATICA'|null, motivo:string, desde:Date|null, forzada:boolean, ventana_minutos:number}>}
 */
async function estadoContingencia(conexion) {
  const forzada = (await leerParametroEntero(conexion, CLAVE_MODO, 0)) === 1;
  const ventana = Math.max(1, await leerParametroEntero(conexion, CLAVE_VENTANA, 30));

  if (forzada) {
    const [[param]] = await conexion.query(
      `SELECT ultima_modificacion FROM Parametro_Global WHERE clave = ? LIMIT 1`,
      [CLAVE_MODO]
    );
    return {
      activa: true,
      origen: 'MANUAL',
      motivo: 'Un administrador activó el modo de contingencia del financiador.',
      desde: param?.ultima_modificacion || null,
      forzada: true,
      ventana_minutos: ventana,
    };
  }

  const [[ultima]] = await conexion.query(
    `SELECT momento_evento,
            JSON_UNQUOTE(JSON_EXTRACT(datos_adicionales, '$.estado')) AS estado,
            JSON_UNQUOTE(JSON_EXTRACT(datos_adicionales, '$.codigo_respuesta')) AS codigo_respuesta
       FROM Bitacora_Auditoria
      WHERE accion = 'INTEGRACION_EXTERNA' AND entidad_afectada = 'FINANCIADOR'
        AND momento_evento >= NOW() - INTERVAL ? MINUTE
      ORDER BY bitacora_auditoria_id DESC
      LIMIT 1`,
    [ventana]
  );

  if (ultima && esFalla(ultima.estado, ultima.codigo_respuesta)) {
    return {
      activa: true,
      origen: 'AUTOMATICA',
      motivo: 'El financiador no respondió tras agotar los reintentos de validación.',
      desde: ultima.momento_evento,
      forzada: false,
      ventana_minutos: ventana,
    };
  }

  return {
    activa: false,
    origen: null,
    motivo: 'El financiador está operativo: los bonos se validan de forma automática.',
    desde: null,
    forzada: false,
    ventana_minutos: ventana,
  };
}

module.exports = { estadoContingencia, esFalla, CLAVE_MODO, CLAVE_VENTANA };
