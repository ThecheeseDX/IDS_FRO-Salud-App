/**
 * CU62 — Escalamiento de eventos críticos a supervisión (Incremento 4).
 *
 * El diccionario de términos restringidos (CU57) suma la categoría CRITICO:
 * esas palabras no bloquean el texto, lo escalan. Cada coincidencia en el
 * chat, un reporte de síntomas, una reseña o un ticket crea un Evento_Critico
 * y avisa a los administradores (D1: cumplen el papel de supervisor) que
 * tienen una sesión activa. El evento queda PENDIENTE en la bandeja hasta
 * que un administrador acusa recibo.
 */

const { detectarCriticos } = require('./filtroContenidoService');
const { notificarUsuario } = require('../agenda/agendaService');

const ORIGENES = {
  CHAT: 'Mensaje del chat clínico',
  SINTOMAS: 'Comentario de un reporte de síntomas',
  RESENA: 'Reseña de una evaluación',
  TICKET: 'Solicitud de soporte',
};

/** Fragmento del texto alrededor del término, para la bandeja. */
function extracto(texto, termino, largo = 280) {
  const limpio = String(texto || '').replace(/\s+/g, ' ').trim();
  if (limpio.length <= largo) return limpio;
  const pos = limpio.toLowerCase().indexOf(String(termino || '').toLowerCase());
  const inicio = Math.max(0, (pos < 0 ? 0 : pos) - Math.floor(largo / 3));
  return `${inicio > 0 ? '…' : ''}${limpio.slice(inicio, inicio + largo)}…`;
}

/** Administradores con sesión activa; si no hay ninguno, todos los administradores. */
async function supervisores(conexion) {
  const [activos] = await conexion.query(
    `SELECT DISTINCT u.usuario_id
       FROM Usuario u
       JOIN Rol r ON r.rol_id = u.rol_id
       JOIN Sesion_Usuario s ON s.usuario_id = u.usuario_id AND s.activa = TRUE
      WHERE r.nombre_rol = 'Administrador' AND u.cuenta_activo = TRUE`
  );
  if (activos.length > 0) return { usuarios: activos.map((f) => f.usuario_id), con_sesion: true };
  const [todos] = await conexion.query(
    `SELECT u.usuario_id FROM Usuario u JOIN Rol r ON r.rol_id = u.rol_id
      WHERE r.nombre_rol = 'Administrador' AND u.cuenta_activo = TRUE`
  );
  return { usuarios: todos.map((f) => f.usuario_id), con_sesion: false };
}

/**
 * Revisa el texto y, si contiene términos críticos, registra el evento y
 * avisa. Nunca lanza: el escalamiento no puede romper la operación que lo
 * originó.
 *
 * @returns {Promise<number|null>} id del evento creado, o null.
 */
async function escalar(conexion, { texto, origen, entidad, entidadId, usuarioOrigenId = null, pacienteId = null }) {
  try {
    const criticos = await detectarCriticos(texto);
    if (criticos.length === 0) return null;

    // La reseña o el reporte los escribe el paciente: si no viene su id, se
    // deduce del usuario para que la bandeja muestre de quién se trata.
    let paciente = pacienteId;
    if (!paciente && usuarioOrigenId) {
      const [[fila]] = await conexion.query(
        `SELECT paciente_id FROM Paciente WHERE usuario_id = ? LIMIT 1`,
        [usuarioOrigenId]
      );
      paciente = fila?.paciente_id || null;
    }

    const termino = criticos[0];
    const [creado] = await conexion.query(
      `INSERT INTO Evento_Critico
         (origen, entidad, entidad_id, termino, terminos, extracto, usuario_origen_id, paciente_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [origen, entidad, entidadId || null, termino, JSON.stringify(criticos), extracto(texto, termino),
       usuarioOrigenId, paciente]
    );
    const eventoId = creado.insertId;

    await conexion.query(
      `INSERT INTO Bitacora_Auditoria (accion, entidad_afectada, ip_origen, datos_adicionales, usuario_id)
       VALUES ('EVENTO_CRITICO_ESCALADO', 'Evento_Critico', NULL, ?, ?)`,
      [JSON.stringify({ evento_critico_id: eventoId, origen, entidad, entidad_id: entidadId, terminos: criticos }), usuarioOrigenId]
    ).catch(() => {});

    const { usuarios, con_sesion } = await supervisores(conexion);
    const descripcion = ORIGENES[origen] || origen;
    for (const usuarioId of usuarios) {
      await notificarUsuario(
        conexion,
        usuarioId,
        'EVENTO_CRITICO',
        `${descripcion} con el término crítico "${termino}". Revisa la bandeja de eventos críticos y acusa recibo.`,
        {
          datos: { pantalla: 'EventosCriticos', evento_critico_id: eventoId },
          // Sin sesión activa el aviso llega igual por correo: un evento
          // crítico no puede esperar a que alguien abra la app.
          ...(con_sesion ? {} : { correo: { asunto: 'Evento crítico escalado - Punto Paz Salud' } }),
        }
      );
    }
    return eventoId;
  } catch (error) {
    console.error('[escalamiento] no se pudo escalar el evento:', error.message);
    return null;
  }
}

module.exports = { escalar, ORIGENES, extracto };
