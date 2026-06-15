const pool = require('../config/database');

class ParametroModel {
    static async getAll() {
        const [rows] = await pool.query(`
            SELECT 
                parametro_id, 
                clave, 
                valor, 
                descripcion, 
                (UNIX_TIMESTAMP(ultima_modificacion) * 1000) AS ultima_modificacion, 
                administrador_id 
            FROM Parametro_Global
        `);
        return rows;
    }

    static async updateIfTimestampMatches(clave, nuevoValor, administradorId, timestampOriginal) {
        // Esta función la dejamos intacta por si la necesitas en el futuro
        const query = `
            UPDATE Parametro_Global 
            SET valor = ?, administrador_id = ? 
            WHERE clave = ? AND ultima_modificacion = ?
        `;
        const [result] = await pool.query(query, [nuevoValor, administradorId, clave, timestampOriginal]);
        return result.affectedRows;
    }
}

module.exports = ParametroModel;