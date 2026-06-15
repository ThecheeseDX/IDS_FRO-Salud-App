const pool = require('../config/database');

// ─────────────────────────────────────────────────────────────────────────────
//  CU14 — Buscar disponibilidad
// ─────────────────────────────────────────────────────────────────────────────

exports.obtenerEspecialidades = async (req, res) => {
  try {
    const [especialidades] = await pool.query(
      `SELECT especialidad_id, nombre, descripcion
       FROM Especialidad
       ORDER BY nombre ASC`
    );
    return res.status(200).json({ data: especialidades });
  } catch (error) {
    console.error('[obtenerEspecialidades]', error);
    return res.status(500).json({ error: 'Error interno al obtener especialidades.' });
  }
};

exports.buscarDisponibilidad = async (req, res) => {
  const { especialidad_id, tipo_sede, fecha } = req.query;

  if (!especialidad_id || !tipo_sede || !fecha) {
    return res.status(400).json({ error: 'Debe indicar especialidad, modalidad y fecha.' });
  }

  try {
    const fechaObj  = new Date(`${fecha}T00:00:00`);
    const diaSemana = fechaObj.getDay() === 0 ? 7 : fechaObj.getDay();

    const [filas] = await pool.query(
      `SELECT 
          p.profesional_id,
          u.nombres, u.apellido_paterno, u.apellido_materno,
          e.nombre AS especialidad,
          s.sede_id, s.nombre AS sede_nombre,
          pd.hora_inicio, pd.hora_fin
       FROM Profesional_Disponibilidad pd
       JOIN Profesional p  ON pd.profesional_id  = p.profesional_id
       JOIN Usuario     u  ON p.usuario_id        = u.usuario_id
       JOIN Especialidad e ON p.especialidad_id   = e.especialidad_id
       JOIN Sede         s ON s.estado_sede        = 1
       WHERE p.especialidad_id = ?
         AND pd.dia_semana     = ?
         AND u.cuenta_activo   = TRUE`,
      [especialidad_id, diaSemana]
    );

    const disponibilidad = [];

    for (const fila of filas) {
      const sedeNombre = String(fila.sede_nombre || '').toLowerCase();
      const modalidad  = sedeNombre.includes('online') ? 'ONLINE' : 'DOMICILIO';

      if (tipo_sede !== 'AMBOS' && modalidad !== tipo_sede) continue;

      const horaInicio  = String(fila.hora_inicio).slice(0, 5);
      const horaFin     = String(fila.hora_fin).slice(0, 5);
      let   horaActual  = Number(horaInicio.split(':')[0]);
      const horaLimite  = Number(horaFin.split(':')[0]);

      while (horaActual < horaLimite) {
        const bloqueInicio    = `${String(horaActual).padStart(2, '0')}:00:00`;
        const bloqueFin       = `${String(horaActual + 1).padStart(2, '0')}:00:00`;
        const fechaHoraInicio = `${fecha} ${bloqueInicio}`;
        const fechaHoraFin    = `${fecha} ${bloqueFin}`;

        const [ocupadas] = await pool.query(
          `SELECT cita_id FROM Cita
           WHERE profesional_id = ?
             AND estado NOT IN ('CANCELADA')
             AND fecha_hora_inicio < ?
             AND fecha_hora_fin    > ?`,
          [fila.profesional_id, fechaHoraFin, fechaHoraInicio]
        );

        if (ocupadas.length === 0) {
          disponibilidad.push({
            profesional_id:  fila.profesional_id,
            sede_id:         fila.sede_id,
            nombres:         fila.nombres,
            apellido_paterno: fila.apellido_paterno,
            apellido_materno: fila.apellido_materno,
            especialidad:    fila.especialidad,
            tipo_sede:       modalidad,
            fecha,
            hora_inicio:     bloqueInicio,
            hora_fin:        bloqueFin,
          });
        }
        horaActual++;
      }
    }

    return res.status(200).json({ data: disponibilidad });
  } catch (error) {
    console.error('[buscarDisponibilidad]', error);
    return res.status(500).json({ error: 'Error interno al buscar disponibilidad.' });
  }
};

exports.validarBloque = async (req, res) => {
  const { profesional_id, fecha_hora_inicio } = req.body;

  if (!profesional_id || !fecha_hora_inicio) {
    return res.status(400).json({ error: 'Debe indicar profesional y fecha/hora de inicio.' });
  }

  try {
    const inicio       = new Date(fecha_hora_inicio);
    const fin          = new Date(inicio.getTime() + 60 * 60 * 1000);
    const fechaHoraFin = fin.toISOString().slice(0, 19).replace('T', ' ');

    const [ocupadas] = await pool.query(
      `SELECT cita_id FROM Cita
       WHERE profesional_id = ?
         AND estado NOT IN ('CANCELADA')
         AND fecha_hora_inicio < ?
         AND fecha_hora_fin    > ?`,
      [profesional_id, fechaHoraFin, fecha_hora_inicio]
    );

    return res.status(200).json({ disponible: ocupadas.length === 0 });
  } catch (error) {
    console.error('[validarBloque]', error);
    return res.status(500).json({ error: 'Error interno al validar el bloque.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  CU15 — Bloquear horario
// ─────────────────────────────────────────────────────────────────────────────

exports.obtenerProfesionales = async (req, res) => {
  try {
    const [profesionales] = await pool.query(
      `SELECT p.profesional_id, u.nombres, u.apellido_paterno,
              e.nombre AS especialidad, p.calificacion_promedio
       FROM Profesional p
       JOIN Usuario     u  ON p.usuario_id       = u.usuario_id
       JOIN Especialidad e ON p.especialidad_id  = e.especialidad_id
       WHERE u.cuenta_activo = TRUE`
    );
    return res.status(200).json(profesionales);
  } catch (error) {
    console.error('[obtenerProfesionales]', error);
    return res.status(500).json({ error: 'Error interno al obtener profesionales.' });
  }
};

exports.obtenerDisponibilidad = async (req, res) => {
  const { profesional_id } = req.params;

  try {
    const [bloques] = await pool.query(
      `SELECT pd.dia_semana, pd.hora_inicio, pd.hora_fin,
              p.profesional_id,
              u.nombres, u.apellido_paterno,
              e.nombre AS especialidad
       FROM Profesional_Disponibilidad pd
       JOIN Profesional  p ON pd.profesional_id = p.profesional_id
       JOIN Usuario      u ON p.usuario_id       = u.usuario_id
       JOIN Especialidad e ON p.especialidad_id  = e.especialidad_id
       WHERE pd.profesional_id = ?`,
      [profesional_id]
    );

    if (bloques.length === 0) {
      return res.status(404).json({ error: 'No se encontró disponibilidad para este profesional.' });
    }

    return res.status(200).json(bloques);
  } catch (error) {
    console.error('[obtenerDisponibilidad]', error);
    return res.status(500).json({ error: 'Error interno al obtener disponibilidad.' });
  }
};

exports.bloquearHorario = async (req, res) => {
  const { profesional_id, sede_id, fecha_hora_inicio, fecha_hora_fin } = req.body;

  if (!profesional_id || !sede_id || !fecha_hora_inicio || !fecha_hora_fin) {
    return res.status(400).json({ error: 'Todos los campos son requeridos.' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [pacienteRows] = await connection.execute(
      `SELECT paciente_id FROM Paciente WHERE usuario_id = ?`,
      [req.user.usuario_id]
    );

    if (pacienteRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'No se encontró el perfil de paciente.' });
    }

    const paciente_id_real = pacienteRows[0].paciente_id;

    const [citasExistentes] = await connection.execute(
      `SELECT cita_id, estado FROM Cita
       WHERE profesional_id = ?
         AND estado NOT IN ('CANCELADA')
         AND (
           (fecha_hora_inicio < ? AND fecha_hora_fin  > ?)
           OR
           (fecha_hora_inicio >= ? AND fecha_hora_inicio < ?)
         )
       FOR UPDATE`,
      [profesional_id, fecha_hora_fin, fecha_hora_inicio, fecha_hora_inicio, fecha_hora_fin]
    );

    if (citasExistentes.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        error:   'BLOQUE_OCUPADO',
        mensaje: 'Este horario acaba de ser reservado por otro paciente. Por favor selecciona un bloque alternativo.',
      });
    }

    const [result] = await connection.execute(
      `INSERT INTO Cita
         (fecha_hora_inicio, fecha_hora_fin, estado, paciente_id, profesional_id, sede_id)
       VALUES (?, ?, 'AGENDADA', ?, ?, ?)`,
      [fecha_hora_inicio, fecha_hora_fin, paciente_id_real, profesional_id, sede_id]
    );

    await connection.commit();

    return res.status(201).json({
      mensaje:  'Bloque horario reservado exitosamente.',
      cita_id:  result.insertId,
      estado:   'AGENDADA',
    });
  } catch (error) {
    await connection.rollback();
    console.error('[bloquearHorario]', error);
    return res.status(500).json({ error: 'Error interno al bloquear el horario.' });
  } finally {
    connection.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  CU20 — Transicionando máquina de estados de cita
// ─────────────────────────────────────────────────────────────────────────────

// Tabla de transiciones válidas { estadoActual: { evento: estadoSiguiente } }
const TRANSICIONES = {
  AGENDADA:   { CONFIRMAR: 'CONFIRMADA', CANCELAR: 'CANCELADA' },
  CONFIRMADA: { INICIAR: 'EN_CURSO',    CANCELAR: 'CANCELADA', REGISTRAR_INASISTENCIA: 'INASISTENCIA' },
  EN_CURSO:   { FINALIZAR: 'REALIZADA' },
};

const ESTADOS_TERMINALES = new Set(['REALIZADA', 'CANCELADA', 'INASISTENCIA']);

function evaluarMaquinaEstados(estadoActual, evento) {
  // Excepción 1 — estado terminal: no permite ninguna acción
  if (ESTADOS_TERMINALES.has(estadoActual)) {
    const err = new Error(
      `Acción no permitida: la cita ya se encuentra en estado terminal "${estadoActual}".`
    );
    err.code = 'ESTADO_TERMINAL';
    throw err;
  }

  // Excepción 2 — transición inválida según reglas de negocio
  const siguiente = TRANSICIONES[estadoActual]?.[evento];
  if (!siguiente) {
    const err = new Error(
      `Transición inválida: el evento "${evento}" no está permitido desde el estado "${estadoActual}".`
    );
    err.code = 'TRANSICION_INVALIDA';
    throw err;
  }

  return siguiente;
}

/**
 * POST /citas/:id/transicionar
 * Body: { evento: 'CONFIRMAR' | 'INICIAR' | 'FINALIZAR' | 'CANCELAR' | 'REGISTRAR_INASISTENCIA' }
 */
exports.transicionarEstadoCita = async (req, res) => {
  const { id }    = req.params;
  const { evento } = req.body;
  const usuario_id = req.user?.usuario_id;

  if (!evento) {
    return res.status(400).json({ error: 'El campo "evento" es requerido.' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Leer estado actual
    const [rows] = await connection.execute(
      `SELECT cita_id, estado FROM Cita WHERE cita_id = ? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: `Cita con id "${id}" no encontrada.` });
    }

    const estado_anterior = rows[0].estado;

    // 2. Evaluar máquina de estados (lanza en Excepción 1 y 2)
    const nuevo_estado = evaluarMaquinaEstados(estado_anterior, evento);

    // 3. Persistir nuevo estado — Excepción 4: fallo de BD
    const [updateResult] = await connection.execute(
      `UPDATE Cita
          SET estado = ?, fecha_actualizacion = NOW()
        WHERE cita_id = ?`,
      [nuevo_estado, id]
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      const err  = new Error('Fallo de persistencia: no se actualizaron filas.');
      err.code   = 'PERSIST_FAIL';
      throw err;
    }

    // 4a. Auditoría
    await connection.execute(
      `INSERT INTO Bitacora_Auditoria
         (cita_id, estado_anterior, nuevo_estado, evento, usuario_id, fecha)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [id, estado_anterior, nuevo_estado, evento, usuario_id]
    );

    // 4b. Notificación
    await connection.execute(
      `INSERT INTO Notificacion
         (cita_id, mensaje, usuario_id, leida, fecha)
       VALUES (?, ?, ?, 0, NOW())`,
      [id, `El estado de su cita ha cambiado a: ${nuevo_estado}`, usuario_id]
    );

    await connection.commit();

    return res.status(200).json({
      mensaje:         'Estado de cita actualizado correctamente.',
      cita_id:         id,
      estado_anterior,
      nuevo_estado,
    });

  } catch (err) {
    await connection.rollback();

    // Excepción 1 — estado terminal
    if (err.code === 'ESTADO_TERMINAL') {
      return res.status(409).json({ error: err.message, code: err.code });
    }
    // Excepción 2 — transición inválida
    if (err.code === 'TRANSICION_INVALIDA') {
      return res.status(422).json({ error: err.message, code: err.code });
    }
    // Excepción 4 — fallo crítico de persistencia
    console.error('[transicionarEstadoCita] Error crítico:', err);
    return res.status(500).json({
      error: 'Error crítico al guardar el estado. Contacte a soporte técnico.',
      code:  'PERSIST_FAIL',
    });

  } finally {
    connection.release();
  }
};

/**
 * GET /citas/:id/estado
 * Permite al cliente re-sincronizar la vista tras latencia de red (Excepción 3).
 */
exports.obtenerEstadoCita = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT cita_id, estado, fecha_actualizacion FROM Cita WHERE cita_id = ? LIMIT 1`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: `Cita con id "${id}" no encontrada.` });
    }
    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error('[obtenerEstadoCita]', error);
    return res.status(500).json({ error: 'Error interno al consultar el estado.' });
  }
};