const pool = require('../config/database');

const registrarAuditoria = async (connection, req, accion, entidad, datos) => {
  const usuarioId = req.user?.usuario_id || null;
  const ip = req.ip || req.connection?.remoteAddress || 'IP_NO_DETECTADA';

  await connection.execute(
    `INSERT INTO bitacora_auditoria
      (accion, entidad_afectada, ip_origen, datos_adicionales, usuario_id)
     VALUES (?, ?, ?, ?, ?)`,
    [accion, entidad, ip, JSON.stringify(datos), usuarioId]
  );
};

exports.finalizarEvolucion = async (req, res) => {
  const { evolucionId } = req.params;
  const { firma_digital } = req.body;

  if (!firma_digital || firma_digital.trim().length < 4) {
    return res.status(400).json({
      error: 'FIRMA_INVALIDA',
      mensaje: 'La firma digital ingresada no es válida.'
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT evolucion_clinica_id, inalterable
       FROM evolucion_clinica
       WHERE evolucion_clinica_id = ?
       FOR UPDATE`,
      [evolucionId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: 'EVOLUCION_NO_ENCONTRADA',
        mensaje: 'No se encontró la evolución clínica.'
      });
    }

    if (rows[0].inalterable === 1) {
      await registrarAuditoria(connection, req, 'INTENTO_FINALIZAR_REGISTRO_INALTERABLE', 'evolucion_clinica', {
        evolucion_clinica_id: evolucionId
      });

      await connection.rollback();

      return res.status(409).json({
        error: 'REGISTRO_YA_INALTERABLE',
        mensaje: 'La evolución clínica ya se encuentra finalizada e inalterable.'
      });
    }

    await connection.execute(
      `UPDATE evolucion_clinica
       SET inalterable = 1,
           firma_digital = ?,
           hora_firma_digital = CURRENT_TIMESTAMP
       WHERE evolucion_clinica_id = ?`,
      [firma_digital, evolucionId]
    );

    await registrarAuditoria(connection, req, 'FINALIZAR_EVOLUCION_CLINICA', 'evolucion_clinica', {
      evolucion_clinica_id: evolucionId,
      resultado: 'Registro clínico finalizado e inalterable'
    });

    await connection.commit();

    return res.status(200).json({
      mensaje: 'Registro clínico finalizado correctamente. Ahora es inalterable.'
    });
  } catch (error) {
    await connection.rollback();
    console.error('[finalizarEvolucion]', error);

    return res.status(500).json({
      error: 'ERROR_FINALIZAR_EVOLUCION',
      mensaje: 'Error interno al finalizar la evolución clínica.'
    });
  } finally {
    connection.release();
  }
};

exports.editarEvolucion = async (req, res) => {
  const { evolucionId } = req.params;
  const {
    porcentaje_objetivo,
    respuesta_fisiologica,
    tecnicas_aplicadas
  } = req.body;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT evolucion_clinica_id, inalterable
       FROM evolucion_clinica
       WHERE evolucion_clinica_id = ?
       FOR UPDATE`,
      [evolucionId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: 'EVOLUCION_NO_ENCONTRADA',
        mensaje: 'No se encontró la evolución clínica.'
      });
    }

    if (rows[0].inalterable === 1) {
      await registrarAuditoria(connection, req, 'INTENTO_EDICION_REGISTRO_INALTERABLE', 'evolucion_clinica', {
        evolucion_clinica_id: evolucionId,
        intento: req.body
      });

      await connection.rollback();

      return res.status(403).json({
        error: 'REGISTRO_INALTERABLE',
        mensaje: 'No se puede editar una evolución clínica finalizada.'
      });
    }

    await connection.execute(
      `UPDATE evolucion_clinica
       SET porcentaje_objetivo = ?,
           respuesta_fisiologica = ?,
           tecnicas_aplicadas = ?
       WHERE evolucion_clinica_id = ?`,
      [
        porcentaje_objetivo || null,
        respuesta_fisiologica || null,
        tecnicas_aplicadas || null,
        evolucionId
      ]
    );

    await registrarAuditoria(connection, req, 'EDITAR_EVOLUCION_CLINICA', 'evolucion_clinica', {
      evolucion_clinica_id: evolucionId
    });

    await connection.commit();

    return res.status(200).json({
      mensaje: 'Evolución clínica editada correctamente.'
    });
  } catch (error) {
    await connection.rollback();
    console.error('[editarEvolucion]', error);

    return res.status(500).json({
      error: 'ERROR_EDITAR_EVOLUCION',
      mensaje: 'Error interno al editar la evolución clínica.'
    });
  } finally {
    connection.release();
  }
};

exports.eliminarEvolucion = async (req, res) => {
  const { evolucionId } = req.params;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT evolucion_clinica_id, inalterable
       FROM evolucion_clinica
       WHERE evolucion_clinica_id = ?
       FOR UPDATE`,
      [evolucionId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: 'EVOLUCION_NO_ENCONTRADA',
        mensaje: 'No se encontró la evolución clínica.'
      });
    }

    if (rows[0].inalterable === 1) {
      await registrarAuditoria(connection, req, 'INTENTO_ELIMINACION_REGISTRO_INALTERABLE', 'evolucion_clinica', {
        evolucion_clinica_id: evolucionId
      });

      await connection.rollback();

      return res.status(403).json({
        error: 'REGISTRO_INALTERABLE',
        mensaje: 'No se puede eliminar una evolución clínica finalizada.'
      });
    }

    await connection.execute(
      `DELETE FROM evolucion_clinica
       WHERE evolucion_clinica_id = ?`,
      [evolucionId]
    );

    await registrarAuditoria(connection, req, 'ELIMINAR_EVOLUCION_CLINICA', 'evolucion_clinica', {
      evolucion_clinica_id: evolucionId
    });

    await connection.commit();

    return res.status(200).json({
      mensaje: 'Evolución clínica eliminada correctamente.'
    });
  } catch (error) {
    await connection.rollback();
    console.error('[eliminarEvolucion]', error);

    return res.status(500).json({
      error: 'ERROR_ELIMINAR_EVOLUCION',
      mensaje: 'Error interno al eliminar la evolución clínica.'
    });
  } finally {
    connection.release();
  }
};