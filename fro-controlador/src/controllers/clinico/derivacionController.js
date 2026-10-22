/**
 * CU65 — Registrando y siguiendo derivaciones internas (Incremento 4).
 *
 * Desde la ficha, el profesional a cargo de un episodio ABIERTO lo deriva a
 * otra especialidad y a un profesional concreto (D6), con una justificación
 * obligatoria. La derivación es el "puente" de acceso: mientras esté
 * PENDIENTE o ACEPTADA y el episodio siga abierto, el profesional derivado
 * puede consultar la ficha del paciente (ver accesoClinicoService).
 *
 * Estados: PENDIENTE → ACEPTADA | RECHAZADA; ACEPTADA → CERRADA. Al cerrarse
 * el episodio todas pasan a CERRADA.
 */

const pool = require('../../config/database');
const { notificarUsuario } = require('../../services/agenda/agendaService');
const { obtenerEpisodio, estaCerrado } = require('../../services/clinico/episodioService');

const LARGO_MINIMO_JUSTIFICACION = 10;
const LARGO_MAXIMO_JUSTIFICACION = 255;

function obtenerIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;
}

async function auditar(conexion, req, accion, datos) {
  await conexion.query(
    `INSERT INTO Bitacora_Auditoria (accion, entidad_afectada, ip_origen, datos_adicionales, usuario_id)
     VALUES (?, 'Derivacion_Interna', ?, ?, ?)`,
    [accion, obtenerIP(req), JSON.stringify(datos), req.user?.usuario_id || null]
  );
}

async function profesionalDelUsuario(conexion, usuarioId) {
  const [[fila]] = await conexion.query(
    `SELECT pr.profesional_id, pr.especialidad_id,
            CONCAT(u.nombres, ' ', u.apellido_paterno) AS nombre
       FROM Profesional pr JOIN Usuario u ON u.usuario_id = pr.usuario_id
      WHERE pr.usuario_id = ? LIMIT 1`,
    [usuarioId]
  );
  return fila || null;
}

/**
 * Comprueba que quien deriva sea el profesional a cargo y que el episodio
 * siga abierto. Responde y devuelve null si no corresponde.
 */
async function episodioDerivable(req, res) {
  const episodio = await obtenerEpisodio(pool, req.params.episodio_id);
  if (!episodio) {
    res.status(404).json({ error: 'EPISODIO_NO_ENCONTRADO', mensaje: 'El episodio clínico no existe.' });
    return null;
  }
  const propio = await profesionalDelUsuario(pool, req.user.usuario_id);
  if (!propio || Number(propio.profesional_id) !== Number(episodio.profesional_id)) {
    res.status(403).json({
      error: 'EPISODIO_AJENO',
      mensaje: 'Solo el profesional a cargo del episodio puede derivarlo.',
    });
    return null;
  }
  // Excepción 1: un episodio cerrado es inalterable; la derivación va en uno nuevo.
  if (estaCerrado(episodio.estado)) {
    res.status(409).json({
      error: 'EPISODIO_INALTERABLE',
      mensaje: 'Este episodio está cerrado y es inalterable. Para derivar al paciente, abre un episodio clínico nuevo.',
    });
    return null;
  }
  return { episodio, propio };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /clinica/episodio/:episodio_id/derivaciones/opciones
// Matriz de especialidades con los profesionales que pueden recibir.
// ─────────────────────────────────────────────────────────────────────────────
exports.opciones = async (req, res) => {
  try {
    const contexto = await episodioDerivable(req, res);
    if (!contexto) return;

    const [especialidades] = await pool.query(
      `SELECT especialidad_id, nombre FROM Especialidad ORDER BY nombre`
    );
    const [profesionales] = await pool.query(
      `SELECT pr.profesional_id, pr.especialidad_id, pr.foto_url,
              CONCAT(u.nombres, ' ', u.apellido_paterno) AS nombre
         FROM Profesional pr JOIN Usuario u ON u.usuario_id = pr.usuario_id
        WHERE u.cuenta_activo = TRUE AND pr.profesional_id <> ?
        ORDER BY u.nombres, u.apellido_paterno`,
      [contexto.propio.profesional_id]
    );

    const matriz = especialidades.map((e) => ({
      ...e,
      profesionales: profesionales.filter((p) => p.especialidad_id === e.especialidad_id),
    }));

    // Excepción 2: no hay ninguna especialidad con quién recibir la derivación.
    if (!matriz.some((e) => e.profesionales.length > 0)) {
      return res.status(409).json({
        error: 'SIN_ESPECIALIDADES_DISPONIBLES',
        mensaje: 'No hay especialidades con profesionales disponibles para recibir derivaciones. Solicita su alta al administrador con un ticket de soporte.',
      });
    }

    return res.status(200).json({ especialidades: matriz });
  } catch (error) {
    console.error('[derivaciones.opciones]', error);
    return res.status(500).json({ error: 'No se pudieron cargar las especialidades disponibles.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /clinica/episodio/:episodio_id/derivaciones — las del episodio
// ─────────────────────────────────────────────────────────────────────────────
exports.delEpisodio = async (req, res) => {
  try {
    const [derivaciones] = await pool.query(
      `SELECT di.derivacion_interna_id, di.estado, di.justificacion, di.momento_creacion,
              di.momento_respuesta, di.comentario_respuesta, di.momento_cierre,
              CONCAT(ud.nombres, ' ', ud.apellido_paterno) AS profesional_destino,
              es.nombre AS especialidad_destino,
              CONCAT(uo.nombres, ' ', uo.apellido_paterno) AS profesional_origen
         FROM Derivacion_Interna di
         JOIN Profesional pd ON pd.profesional_id = di.profesional_destino_id
         JOIN Usuario ud ON ud.usuario_id = pd.usuario_id
         JOIN Especialidad es ON es.especialidad_id = pd.especialidad_id
         JOIN Profesional po ON po.profesional_id = di.profesional_origen_id
         JOIN Usuario uo ON uo.usuario_id = po.usuario_id
        WHERE di.episodio_clinico_id = ?
        ORDER BY di.derivacion_interna_id DESC`,
      [req.params.episodio_id]
    );
    return res.status(200).json({ derivaciones });
  } catch (error) {
    console.error('[derivaciones.delEpisodio]', error);
    return res.status(500).json({ error: 'No se pudieron cargar las derivaciones del episodio.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /clinica/episodio/:episodio_id/derivaciones
// { profesional_destino_id, justificacion }
// ─────────────────────────────────────────────────────────────────────────────
exports.crear = async (req, res) => {
  const destinoId = Number(req.body?.profesional_destino_id);
  const justificacion = String(req.body?.justificacion || '').trim();

  // Excepción 3: sin motivo no hay derivación.
  if (justificacion.length < LARGO_MINIMO_JUSTIFICACION) {
    return res.status(400).json({
      error: 'JUSTIFICACION_REQUERIDA',
      campo: 'justificacion',
      mensaje: `Escribe el motivo clínico de la derivación (al menos ${LARGO_MINIMO_JUSTIFICACION} caracteres).`,
    });
  }
  if (justificacion.length > LARGO_MAXIMO_JUSTIFICACION) {
    return res.status(400).json({
      error: 'JUSTIFICACION_MUY_LARGA',
      campo: 'justificacion',
      mensaje: `La justificación admite hasta ${LARGO_MAXIMO_JUSTIFICACION} caracteres.`,
    });
  }
  if (!Number.isInteger(destinoId) || destinoId <= 0) {
    return res.status(400).json({
      error: 'DESTINO_REQUERIDO',
      campo: 'profesional_destino_id',
      mensaje: 'Elige la especialidad y el profesional que recibirá la derivación.',
    });
  }

  let conexion;
  try {
    const contexto = await episodioDerivable(req, res);
    if (!contexto) return;
    const { episodio, propio } = contexto;

    if (destinoId === propio.profesional_id) {
      return res.status(400).json({ error: 'DESTINO_INVALIDO', mensaje: 'No puedes derivarte un episodio a ti mismo.' });
    }
    const [[destino]] = await pool.query(
      `SELECT pr.profesional_id, u.usuario_id, es.nombre AS especialidad,
              CONCAT(u.nombres, ' ', u.apellido_paterno) AS nombre
         FROM Profesional pr
         JOIN Usuario u ON u.usuario_id = pr.usuario_id
         JOIN Especialidad es ON es.especialidad_id = pr.especialidad_id
        WHERE pr.profesional_id = ? AND u.cuenta_activo = TRUE LIMIT 1`,
      [destinoId]
    );
    if (!destino) {
      return res.status(404).json({ error: 'DESTINO_NO_DISPONIBLE', mensaje: 'Ese profesional ya no está disponible para recibir derivaciones.' });
    }
    const [[repetida]] = await pool.query(
      `SELECT 1 AS si FROM Derivacion_Interna
        WHERE episodio_clinico_id = ? AND profesional_destino_id = ? AND estado IN ('PENDIENTE', 'ACEPTADA')
        LIMIT 1`,
      [episodio.episodio_clinico_id, destinoId]
    );
    if (repetida) {
      return res.status(409).json({
        error: 'DERIVACION_DUPLICADA',
        mensaje: `Este episodio ya tiene una derivación vigente a ${destino.nombre}.`,
      });
    }

    // Excepción 4: el enlace y su traza se escriben juntos o no se escribe nada.
    conexion = await pool.getConnection();
    await conexion.beginTransaction();
    const [creada] = await conexion.query(
      `INSERT INTO Derivacion_Interna
         (estado, justificacion, episodio_clinico_id, profesional_origen_id, profesional_destino_id)
       VALUES ('PENDIENTE', ?, ?, ?, ?)`,
      [justificacion, episodio.episodio_clinico_id, propio.profesional_id, destinoId]
    );
    await auditar(conexion, req, 'DERIVACION_INTERNA_REGISTRADA', {
      derivacion_interna_id: creada.insertId,
      episodio_clinico_id: episodio.episodio_clinico_id,
      paciente_id: episodio.paciente_id,
      profesional_origen_id: propio.profesional_id,
      profesional_destino_id: destinoId,
      acceso: 'LECTURA_FICHA',
    });
    await conexion.commit();

    const [[paciente]] = await pool.query(
      `SELECT CONCAT(u.nombres, ' ', u.apellido_paterno) AS nombre
         FROM Paciente p JOIN Usuario u ON u.usuario_id = p.usuario_id
        WHERE p.paciente_id = ? LIMIT 1`,
      [episodio.paciente_id]
    );
    await notificarUsuario(
      pool,
      destino.usuario_id,
      'DERIVACION_RECIBIDA',
      `${propio.nombre} te derivó a ${paciente?.nombre || 'un paciente'}: "${justificacion}". Ya puedes consultar su ficha clínica.`,
      { datos: { pantalla: 'DerivacionesRecibidas', derivacion_interna_id: creada.insertId } }
    );

    return res.status(201).json({
      mensaje: `Derivación enviada a ${destino.nombre} (${destino.especialidad}). Ya puede consultar la ficha del paciente.`,
      derivacion_interna_id: creada.insertId,
    });
  } catch (error) {
    if (conexion) await conexion.rollback().catch(() => {});
    console.error('[derivaciones.crear]', error);
    return res.status(500).json({
      error: 'DERIVACION_REVERTIDA',
      mensaje: 'No se pudo registrar la derivación y no quedó ningún acceso a medias. Repite la solicitud.',
    });
  } finally {
    if (conexion) conexion.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /clinica/derivaciones/recibidas — bandeja del profesional derivado
// ─────────────────────────────────────────────────────────────────────────────
exports.recibidas = async (req, res) => {
  try {
    const [derivaciones] = await pool.query(
      `SELECT di.derivacion_interna_id, di.estado, di.justificacion, di.momento_creacion,
              di.momento_respuesta, di.comentario_respuesta,
              ec.episodio_clinico_id, ec.motivo_consulta, ec.estado AS estado_episodio,
              ec.paciente_id,
              CONCAT(up.nombres, ' ', up.apellido_paterno) AS paciente,
              CONCAT(uo.nombres, ' ', uo.apellido_paterno) AS profesional_origen,
              eo.nombre AS especialidad_origen
         FROM Derivacion_Interna di
         JOIN Profesional pd ON pd.profesional_id = di.profesional_destino_id
         JOIN Episodio_Clinico ec ON ec.episodio_clinico_id = di.episodio_clinico_id
         JOIN Paciente pa ON pa.paciente_id = ec.paciente_id
         JOIN Usuario up ON up.usuario_id = pa.usuario_id
         JOIN Profesional po ON po.profesional_id = di.profesional_origen_id
         JOIN Usuario uo ON uo.usuario_id = po.usuario_id
         JOIN Especialidad eo ON eo.especialidad_id = po.especialidad_id
        WHERE pd.usuario_id = ?
        ORDER BY FIELD(di.estado, 'PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CERRADA'), di.derivacion_interna_id DESC
        LIMIT 100`,
      [req.user.usuario_id]
    );
    return res.status(200).json({
      derivaciones,
      pendientes: derivaciones.filter((d) => d.estado === 'PENDIENTE').length,
    });
  } catch (error) {
    console.error('[derivaciones.recibidas]', error);
    return res.status(500).json({ error: 'No se pudieron cargar tus derivaciones.' });
  }
};

/** Derivación con sus participantes (para responder o cerrar). */
async function derivacionCompleta(id) {
  const [[fila]] = await pool.query(
    `SELECT di.*, ud.usuario_id AS usuario_destino, uo.usuario_id AS usuario_origen,
            CONCAT(ud.nombres, ' ', ud.apellido_paterno) AS nombre_destino,
            CONCAT(up.nombres, ' ', up.apellido_paterno) AS paciente, ec.paciente_id
       FROM Derivacion_Interna di
       JOIN Profesional pd ON pd.profesional_id = di.profesional_destino_id
       JOIN Usuario ud ON ud.usuario_id = pd.usuario_id
       JOIN Profesional po ON po.profesional_id = di.profesional_origen_id
       JOIN Usuario uo ON uo.usuario_id = po.usuario_id
       JOIN Episodio_Clinico ec ON ec.episodio_clinico_id = di.episodio_clinico_id
       JOIN Paciente pa ON pa.paciente_id = ec.paciente_id
       JOIN Usuario up ON up.usuario_id = pa.usuario_id
      WHERE di.derivacion_interna_id = ? LIMIT 1`,
    [id]
  );
  return fila || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /clinica/derivaciones/:id/respuesta { accion: ACEPTAR|RECHAZAR, comentario? }
// ─────────────────────────────────────────────────────────────────────────────
exports.responder = async (req, res) => {
  const accion = String(req.body?.accion || '').toUpperCase();
  const comentario = String(req.body?.comentario || '').trim().slice(0, 255) || null;
  if (!['ACEPTAR', 'RECHAZAR'].includes(accion)) {
    return res.status(400).json({ error: 'ACCION_INVALIDA', mensaje: 'La respuesta debe ser ACEPTAR o RECHAZAR.' });
  }
  if (accion === 'RECHAZAR' && !comentario) {
    return res.status(400).json({
      error: 'MOTIVO_REQUERIDO',
      campo: 'comentario',
      mensaje: 'Indica por qué rechazas la derivación, para que el profesional pueda buscar otra alternativa.',
    });
  }

  try {
    const derivacion = await derivacionCompleta(req.params.id);
    if (!derivacion || Number(derivacion.usuario_destino) !== Number(req.user.usuario_id)) {
      return res.status(404).json({ error: 'DERIVACION_NO_ENCONTRADA', mensaje: 'La derivación no existe o no está dirigida a ti.' });
    }
    if (derivacion.estado !== 'PENDIENTE') {
      return res.status(409).json({ error: 'DERIVACION_YA_RESPONDIDA', mensaje: `Esta derivación ya está ${derivacion.estado.toLowerCase()}.` });
    }
    const nuevoEstado = accion === 'ACEPTAR' ? 'ACEPTADA' : 'RECHAZADA';
    const [resultado] = await pool.query(
      `UPDATE Derivacion_Interna
          SET estado = ?, momento_respuesta = NOW(), comentario_respuesta = ?
        WHERE derivacion_interna_id = ? AND estado = 'PENDIENTE'`,
      [nuevoEstado, comentario, derivacion.derivacion_interna_id]
    );
    if (resultado.affectedRows === 0) {
      return res.status(409).json({ error: 'DERIVACION_YA_RESPONDIDA', mensaje: 'Esta derivación acaba de cambiar de estado. Recarga la lista.' });
    }
    await auditar(pool, req, `DERIVACION_INTERNA_${nuevoEstado}`, {
      derivacion_interna_id: derivacion.derivacion_interna_id,
      episodio_clinico_id: derivacion.episodio_clinico_id,
      acceso: nuevoEstado === 'ACEPTADA' ? 'LECTURA_FICHA' : 'REVOCADO',
    }).catch(() => {});

    await notificarUsuario(
      pool,
      derivacion.usuario_origen,
      'DERIVACION_RESPONDIDA',
      nuevoEstado === 'ACEPTADA'
        ? `${derivacion.nombre_destino} aceptó la derivación de ${derivacion.paciente}.`
        : `${derivacion.nombre_destino} rechazó la derivación de ${derivacion.paciente}: "${comentario}".`,
      { datos: { pantalla: 'FichaClinica', pacienteId: derivacion.paciente_id, nombrePaciente: derivacion.paciente } }
    );

    return res.status(200).json({
      estado: nuevoEstado,
      mensaje: nuevoEstado === 'ACEPTADA'
        ? 'Aceptaste la derivación. La ficha del paciente queda disponible mientras el episodio siga abierto.'
        : 'Rechazaste la derivación y se le avisó al profesional que la envió.',
    });
  } catch (error) {
    console.error('[derivaciones.responder]', error);
    return res.status(500).json({ error: 'No se pudo registrar tu respuesta. Intenta nuevamente.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /clinica/derivaciones/:id/cierre — el profesional de origen la da por terminada
// ─────────────────────────────────────────────────────────────────────────────
exports.cerrar = async (req, res) => {
  try {
    const derivacion = await derivacionCompleta(req.params.id);
    if (!derivacion || Number(derivacion.usuario_origen) !== Number(req.user.usuario_id)) {
      return res.status(404).json({ error: 'DERIVACION_NO_ENCONTRADA', mensaje: 'La derivación no existe o no la enviaste tú.' });
    }
    if (!['PENDIENTE', 'ACEPTADA'].includes(derivacion.estado)) {
      return res.status(409).json({ error: 'DERIVACION_NO_VIGENTE', mensaje: `Esta derivación ya está ${derivacion.estado.toLowerCase()}.` });
    }
    await pool.query(
      `UPDATE Derivacion_Interna SET estado = 'CERRADA', momento_cierre = NOW() WHERE derivacion_interna_id = ?`,
      [derivacion.derivacion_interna_id]
    );
    await auditar(pool, req, 'DERIVACION_INTERNA_CERRADA', {
      derivacion_interna_id: derivacion.derivacion_interna_id,
      episodio_clinico_id: derivacion.episodio_clinico_id,
      acceso: 'REVOCADO',
    }).catch(() => {});
    return res.status(200).json({ estado: 'CERRADA', mensaje: 'Derivación cerrada. El acceso del profesional derivado quedó retirado.' });
  } catch (error) {
    console.error('[derivaciones.cerrar]', error);
    return res.status(500).json({ error: 'No se pudo cerrar la derivación. Intenta nuevamente.' });
  }
};
