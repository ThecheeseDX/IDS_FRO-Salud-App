const pool = require('../../config/database');

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLADOR: Episodio Clínico
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/clinica/episodio/:episodio_id
// Lectura de un episodio clínico
exports.obtenerEpisodio = async (req, res) => {
    const { episodio_id } = req.params;

    try {
        const [rows] = await pool.query(
            `SELECT ec.*, 
                    p.usuario_id AS paciente_usuario_id,
                    pr.usuario_id AS profesional_usuario_id
               FROM Episodio_Clinico ec
               JOIN Paciente p ON ec.paciente_id = p.paciente_id
               JOIN Profesional pr ON ec.profesional_id = pr.profesional_id
              WHERE ec.episodio_clinico_id = ?`,
            [episodio_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Episodio clínico no encontrado.' });
        }

        // return(operacion_clinica_exitosa) → return(HTTP 200 OK y confirmacion_accion)
        return res.status(200).json(rows[0]);

    } catch (error) {
        console.error('[obtenerEpisodio]', error);
        return res.status(500).json({ error: 'Error interno al obtener el episodio clínico.' });
    }
};

// POST /api/clinica/episodio
// Creación de un episodio clínico
exports.crearEpisodio = async (req, res) => {
    const { motivo_consulta, paciente_id, profesional_id } = req.body;

    if (!motivo_consulta || !paciente_id || !profesional_id) {
        return res.status(400).json({ error: 'motivo_consulta, paciente_id y profesional_id son requeridos.' });
    }

    try {
        // ejecutar_actualizacion(query_episodio)
        const [result] = await pool.query(
            `INSERT INTO Episodio_Clinico (motivo_consulta, paciente_id, profesional_id)
             VALUES (?, ?, ?)`,
            [motivo_consulta, paciente_id, profesional_id]
        );

        return res.status(201).json({
            mensaje: 'Episodio clínico creado exitosamente.',
            episodio_clinico_id: result.insertId
        });

    } catch (error) {
        console.error('[crearEpisodio]', error);
        return res.status(500).json({ error: 'Error interno al crear el episodio clínico.' });
    }
};

// PUT /api/clinica/episodio/:episodio_id
// Modificación de un episodio clínico
exports.actualizarEpisodio = async (req, res) => {
    const { episodio_id } = req.params;
    const { motivo_consulta, estado, fecha_terminado } = req.body;

    try {
        // ejecutar_actualizacion(query_episodio) → UPDATE Episodio SET..
        const [result] = await pool.query(
            `UPDATE Episodio_Clinico
                SET motivo_consulta = COALESCE(?, motivo_consulta),
                    estado          = COALESCE(?, estado),
                    fecha_terminado = COALESCE(?, fecha_terminado)
              WHERE episodio_clinico_id = ?`,
            [motivo_consulta, estado, fecha_terminado, episodio_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Episodio clínico no encontrado.' });
        }

        // return(filas_afectadas) → return(confirmacion_update)
        // → return(operacion_clinica_exitosa) → return(HTTP 200 OK y confirmacion_accion)
        return res.status(200).json({ mensaje: 'Episodio clínico actualizado exitosamente.' });

    } catch (error) {
        console.error('[actualizarEpisodio]', error);
        return res.status(500).json({ error: 'Error interno al actualizar el episodio clínico.' });
    }
};