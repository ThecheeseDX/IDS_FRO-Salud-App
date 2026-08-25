/**
 * Servicios de seguridad de cuenta (Incremento 2, bloque 2).
 * CU06/CU07: recuperación y cambio de contraseña con OTP.
 * CU08: sesiones por dispositivo revocables.
 */

const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────────────────────
//  CU07 — Robustez de contraseña
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valida la política de contraseñas y devuelve la lista de requisitos
 * incumplidos, para que la interfaz pueda resaltarlos (Excepción 3 del CU07).
 */
function validarRobustezContrasena(contrasena) {
  const texto = String(contrasena || '');
  const incumplidos = [];

  if (texto.length < 8) incumplidos.push('Mínimo 8 caracteres');
  if (!/[a-zA-Z]/.test(texto)) incumplidos.push('Al menos una letra');
  if (!/[0-9]/.test(texto)) incumplidos.push('Al menos un número');

  return { valida: incumplidos.length === 0, incumplidos };
}

// ─────────────────────────────────────────────────────────────────────────────
//  CU08 — Sesiones por dispositivo
// ─────────────────────────────────────────────────────────────────────────────

/** Crea el registro de sesión y devuelve su identificador para el JWT. */
async function crearSesion(conexion, usuario_id, dispositivo, ip) {
  const jti = crypto.randomUUID();
  await conexion.execute(
    `INSERT INTO Sesion_Usuario (jti, dispositivo, ip_origen, usuario_id)
     VALUES (?, ?, ?, ?)`,
    [jti, String(dispositivo || 'Dispositivo desconocido').slice(0, 120), ip || null, usuario_id]
  );
  return jti;
}

/**
 * Indica si la sesión del token sigue vigente. Los tokens antiguos (sin jti)
 * se aceptan mientras expiran solos: evita cerrar la sesión a todo el equipo
 * en el momento del despliegue.
 */
async function sesionVigente(conexion, jti) {
  if (!jti) return true;
  const [filas] = await conexion.execute(
    `SELECT activa FROM Sesion_Usuario WHERE jti = ? LIMIT 1`,
    [jti]
  );
  if (filas.length === 0) return true; // legado: fila no registrada
  return Boolean(filas[0].activa);
}

/** Cierra todas las sesiones de un usuario (tras un cambio de contraseña). */
async function revocarTodasLasSesiones(conexion, usuario_id) {
  await conexion.execute(
    `UPDATE Sesion_Usuario SET activa = FALSE WHERE usuario_id = ?`,
    [usuario_id]
  );
}

module.exports = {
  validarRobustezContrasena,
  crearSesion,
  sesionVigente,
  revocarTodasLasSesiones,
};
