const pool = require('../config/database');

// ─────────────────────────────────────────────────────────────────────────────
// CU68 - Paso 1: acceso a datos sobre la bitácora EXISTENTE Bitacora_Auditoria.
// No requiere cambios de esquema: el detalle de la transacción externa viaja en
// la columna JSON datos_adicionales.
// ─────────────────────────────────────────────────────────────────────────────
class TransactionAuditModel {
  // Inserta una entrada de auditoría. `datos` se serializa en datos_adicionales.
  static async registrar({ accion, entidad_afectada = null, ip_origen = null, usuario_id = null, datos = {} }) {
    const [result] = await pool.query(
      `INSERT INTO Bitacora_Auditoria
         (accion, entidad_afectada, ip_origen, usuario_id, datos_adicionales)
       VALUES (?, ?, ?, ?, ?)`,
      [accion, entidad_afectada, ip_origen, usuario_id, JSON.stringify(datos)]
    );
    return result.insertId;
  }
}

module.exports = TransactionAuditModel;