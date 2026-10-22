/**
 * CU54 — Mensajes de refuerzo positivo (Incremento 4).
 *
 * Cuando el paciente marca un ejercicio y su índice de adherencia sube, se le
 * envía un mensaje de ánimo por el despachador (centro de notificaciones y
 * push). Reglas: solo si el paciente lo tiene activado en sus preferencias
 * (Preferencia_Notificacion.refuerzos), como máximo uno al día, y con un
 * texto distinto cuando cruza un hito (25, 50, 75 o 100 %).
 */

const { notificarUsuario } = require('../agenda/agendaService');

const HITOS = [
  { desde: 100, texto: '¡Completaste el 100 % de tus ejercicios! Tu constancia es la mejor parte del tratamiento.' },
  { desde: 75, texto: 'Vas en el {p} % de cumplimiento: ya pasaste las tres cuartas partes. ¡Sigue así!' },
  { desde: 50, texto: 'Llegaste al {p} %: la mitad del camino. Cada ejercicio cuenta.' },
  { desde: 25, texto: 'Ya llevas el {p} % de tus ejercicios. ¡Buen comienzo, sigue sumando!' },
];

function textoRefuerzo(anterior, actual) {
  for (const h of HITOS) {
    const cruzado = actual >= h.desde && (anterior === null || anterior < h.desde);
    if (cruzado) return h.texto.replace('{p}', actual);
  }
  return `Tu cumplimiento subió a ${actual} %. ¡Sigue así!`;
}

/**
 * @returns {Promise<{ enviado: boolean, motivo?: string, mensaje?: string }>}  nunca lanza.
 */
async function evaluarRefuerzo(conexion, { pacienteId, usuarioId, anterior, actual }) {
  try {
    if (!usuarioId || actual === null || actual === undefined) return { enviado: false, motivo: 'SIN_INDICE' };
    const previo = anterior === null || anterior === undefined ? null : Number(anterior);
    if (previo !== null && Number(actual) <= previo) return { enviado: false, motivo: 'NO_SUBIO' };

    // Excepción 2: el paciente desactivó los refuerzos → se termina aquí.
    const [[pref]] = await conexion.query(
      `SELECT refuerzos FROM Preferencia_Notificacion WHERE usuario_id = ? LIMIT 1`,
      [usuarioId]
    );
    if (pref && !pref.refuerzos) return { enviado: false, motivo: 'PREFERENCIA' };

    // Como máximo un refuerzo al día: más sería ruido, no ánimo.
    const [[hoy]] = await conexion.query(
      `SELECT 1 AS si FROM Notificacion
        WHERE usuario_id = ? AND tipo = 'REFUERZO_POSITIVO' AND DATE(momento_envio) = CURDATE()
        LIMIT 1`,
      [usuarioId]
    );
    if (hoy) return { enviado: false, motivo: 'YA_ENVIADO_HOY' };

    const mensaje = textoRefuerzo(previo, Number(actual));
    await notificarUsuario(conexion, usuarioId, 'REFUERZO_POSITIVO', mensaje, {
      datos: { pantalla: 'MiProgreso', adherencia: Number(actual) },
    });
    await conexion.query(
      `INSERT INTO Bitacora_Auditoria (accion, entidad_afectada, ip_origen, datos_adicionales, usuario_id)
       VALUES ('REFUERZO_POSITIVO_ENVIADO', 'Notificacion', NULL, ?, ?)`,
      [JSON.stringify({ paciente_id: pacienteId, anterior: previo, actual: Number(actual) }), usuarioId]
    ).catch(() => {});
    return { enviado: true, mensaje };
  } catch (error) {
    console.error('[refuerzo] no se pudo evaluar el refuerzo:', error.message);
    return { enviado: false, motivo: 'ERROR' };
  }
}

module.exports = { evaluarRefuerzo, textoRefuerzo };
