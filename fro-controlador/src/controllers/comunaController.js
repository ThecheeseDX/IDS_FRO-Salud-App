const pool = require('../config/database');

exports.obtenerComunas = async (req, res) => {
    try {
        const [filas] = await pool.query('SELECT comuna_id, nombre FROM Comuna ORDER BY nombre ASC');
        res.status(200).json(filas);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener comunas' });
    }
};