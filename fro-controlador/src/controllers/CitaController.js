const pool = require('../config/database');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/citas/profesionales
// ─────────────────────────────────────────────────────────────────────────────
exports.obtenerProfesionales = async (req, res) => {
    try {
        const [profesionales] = await pool.query(
            `SELECT p.profesional_id, u.nombres, u.apellido_paterno,
                    e.nombre AS especialidad, p.calificacion_promedio
               FROM Profesional p
               JOIN Usuario u ON p.usuario_id = u.usuario_id
               JOIN Especialidad e ON p.especialidad_id = e.especialidad_id
              WHERE u.cuenta_activo = TRUE`
        );
        return res.status(200).json(profesionales);
    } catch (error) {
        console.error('[obtenerProfesionales]', error);
        return res.status(500).json({ error: 'Error interno al obtener profesionales.' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/citas/disponibilidad/:profesional_id
// ─────────────────────────────────────────────────────────────────────────────
exports.obtenerDisponibilidad = async (req, res) => {
    const { profesional_id } = req.params;
    try {
        const [bloques] = await pool.query(
            `SELECT pd.dia_semana, pd.hora_inicio, pd.hora_fin,
                    p.profesional_id,
                    u.nombres, u.apellido_paterno,
                    e.nombre AS especialidad
               FROM Profesional_Disponibilidad pd
               JOIN Profesional p ON pd.profesional_id = p.profesional_id
               JOIN Usuario u ON p.usuario_id = u.usuario_id
               JOIN Especialidad e ON p.especialidad_id = e.especialidad_id
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

// ─────────────────────────────────────────────────────────────────────────────
// CU15 — POST /api/citas/bloquear
// ─────────────────────────────────────────────────────────────────────────────
exports.bloquearHorario = async (req, res) => {
    const { profesional_id, sede_id, fecha_hora_inicio, fecha_hora_fin } = req.body;

    if (!profesional_id || !sede_id || !fecha_hora_inicio || !fecha_hora_fin) {
        return res.status(400).json({ error: 'Todos los campos son requeridos.' });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Obtener paciente_id real desde usuario_id del token JWT
        const [pacienteRows] = await connection.execute(
            `SELECT paciente_id FROM Paciente WHERE usuario_id = ?`,
            [req.user.usuario_id]
        );

        if (pacienteRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'No se encontró el perfil de paciente.' });
        }

        const paciente_id_real = pacienteRows[0].paciente_id;

        // BLOQUEO SÍNCRONICO: SELECT ... FOR UPDATE
        const [citasExistentes] = await connection.execute(
            `SELECT cita_id, estado
               FROM Cita
              WHERE profesional_id = ?
                AND estado NOT IN ('CANCELADA')
                AND (
                    (fecha_hora_inicio < ? AND fecha_hora_fin > ?)
                    OR
                    (fecha_hora_inicio >= ? AND fecha_hora_inicio < ?)
                )
              FOR UPDATE`,
            [profesional_id, fecha_hora_fin, fecha_hora_inicio, fecha_hora_inicio, fecha_hora_fin]
        );

        // Excepción 4: colisión de reserva simultánea
        if (citasExistentes.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                error: 'BLOQUE_OCUPADO',
                mensaje: 'Este horario acaba de ser reservado por otro paciente. Por favor selecciona un bloque alternativo.'
            });
        }

        // Bloque disponible — insertar cita
        const [result] = await connection.execute(
            `INSERT INTO Cita 
                (fecha_hora_inicio, fecha_hora_fin, estado, paciente_id, profesional_id, sede_id)
             VALUES (?, ?, 'AGENDADA', ?, ?, ?)`,
            [fecha_hora_inicio, fecha_hora_fin, paciente_id_real, profesional_id, sede_id]
        );

        await connection.commit();

        return res.status(201).json({
            mensaje: 'Bloque horario reservado exitosamente.',
            cita_id: result.insertId,
            estado: 'AGENDADA'
        });

    } catch (error) {
        await connection.rollback();

        if (error.code === 'ECONNRESET' || error.code === 'PROTOCOL_CONNECTION_LOST') {
            return res.status(503).json({
                error: 'CONEXION_PERDIDA',
                mensaje: 'Se perdió la conexión durante el proceso. La operación fue abortada.'
            });
        }

        console.error('[bloquearHorario]', error);
        return res.status(500).json({ error: 'Error interno al bloquear el horario.' });

    } finally {
        connection.release();
    }
};