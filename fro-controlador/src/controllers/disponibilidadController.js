const pool = require('../config/database');

// Convierte DD/MM/AAAA a formato MySQL YYYY-MM-DD
const convertirFecha = (fechaStr) => {
    const [d, m, y] = fechaStr.split('/');
    return `${y}-${m}-${d} 00:00:00`;
};

exports.restringirDisponibilidad = async (req, res) => {
    const { profesional_id, fecha_inicio, fecha_fin, motivo } = req.body;
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. SOLUCIÓN AL ID: Buscamos el profesional_id real usando el ID que envió el Frontend
        // (Sirve tanto si el Admin ingresa el profesional_id directo, como si el Profesional envía su usuario_id)
        const [profesionales] = await connection.execute(
            'SELECT profesional_id FROM Profesional WHERE usuario_id = ? OR profesional_id = ? LIMIT 1',
            [profesional_id, profesional_id]
        );

        if (profesionales.length === 0) {
            await connection.rollback();
            return res.status(404).json({ mensaje: 'Error: Esta cuenta no tiene un perfil de profesional asociado en la base de datos.' });
        }

        const idRealProfesional = profesionales[0].profesional_id;
        const inicioSQL = convertirFecha(fecha_inicio);
        const finSQL = convertirFecha(fecha_fin);

        // 2. SOLUCIÓN A LA TABLA CITA: Usamos las columnas exactas de tu schema.sql
        const [citas] = await connection.execute(
            `SELECT cita_id FROM Cita 
             WHERE profesional_id = ? 
             AND fecha_hora_inicio >= ? 
             AND fecha_hora_inicio <= ? 
             AND estado = 'AGENDADA'`,
            [idRealProfesional, inicioSQL, finSQL]
        );

        if (citas.length > 0) {
            await connection.rollback();
            return res.status(409).json({ mensaje: 'Existen citas agendadas en este rango. Reprográmelas primero.' });
        }

        // 3. INSERCIÓN FINAL: Guardamos en Bloqueo_Agenda con el ID correcto
        await connection.execute(
            'INSERT INTO Bloqueo_Agenda (profesional_id, fecha_inicio, fecha_fin, motivo) VALUES (?, ?, ?, ?)',
            [idRealProfesional, inicioSQL, finSQL, motivo]
        );

        await connection.commit();
        res.status(200).json({ mensaje: 'Rango inhabilitado correctamente.' });

    } catch (error) {
        await connection.rollback();
        console.error("🚨 ERROR SQL RECHAZADO:", error);
        res.status(500).json({ mensaje: 'Error al persistir datos en la base de datos.' });
    } finally {
        connection.release();
    }
};