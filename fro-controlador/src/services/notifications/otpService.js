const crypto = require("crypto");
const db = require("../../config/database");

const OTP_EXPIRACION_MINUTOS = 10;

function generarCodigo() {
  return crypto.randomInt(100000, 999999).toString();
}

// ── Crear OTP y guardarlo en columnas de Usuario ───────────────────────────
async function crearOTP(usuarioId) {
  const codigo = generarCodigo();
  const expiracion = new Date(Date.now() + OTP_EXPIRACION_MINUTOS * 60 * 1000);

  await db.query(
    `UPDATE Usuario
        SET otp_codigo     = ?,
            otp_expiracion = ?
      WHERE usuario_id = ?`,
    [codigo, expiracion, usuarioId]
  );

  return { codigo, expiracion };
}

// ── Validar OTP ingresado ──────────────────────────────────────────────────
async function validarOTP(usuarioId, codigoIngresado) {
  const [rows] = await db.query(
    `SELECT otp_codigo, otp_expiracion, cuenta_activo
       FROM Usuario
      WHERE usuario_id = ?`,
    [usuarioId]
  );

  if (rows.length === 0) {
    return { valido: false, error: "USUARIO_NO_ENCONTRADO", mensaje: "Usuario no encontrado." };
  }

  const u = rows[0];

  if (u.cuenta_activo) {
    return { valido: false, error: "YA_ACTIVO", mensaje: "La cuenta ya está activa." };
  }

  if (!u.otp_codigo) {
    return { valido: false, error: "NO_OTP", mensaje: "No existe un código activo. Solicita uno nuevo." };
  }

  // Excepción 3: código expirado
  if (new Date() > new Date(u.otp_expiracion)) {
    await db.query(
      `UPDATE Usuario SET otp_codigo = NULL, otp_expiracion = NULL WHERE usuario_id = ?`,
      [usuarioId]
    );
    return { valido: false, error: "EXPIRADO", mensaje: "El código ha expirado. Solicita uno nuevo." };
  }

  // Excepción 3: código incorrecto
  if (u.otp_codigo !== codigoIngresado.toString().trim()) {
    return {
      valido: false,
      error: "CODIGO_INCORRECTO",
      mensaje: "Código incorrecto. Intenta de nuevo o solicita uno nuevo.",
    };
  }

  return { valido: true };
}

// ── Enviar OTP por Email ───────────────────────────────────────────────────
async function enviarPorEmail(destinatario, codigo) {
  const nodemailer = require("nodemailer");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_PORT === "465",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"Fro Salud" <${process.env.SMTP_USER}>`,
    to: destinatario,
    subject: "Código de verificación - Fro Salud",
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:24px;
                  border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#0f172a">Verificación de cuenta</h2>
        <p style="color:#475569">Ingresa este código en la aplicación:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;
                    color:#2563eb;text-align:center;padding:16px 0;">${codigo}</div>
        <p style="color:#94a3b8;font-size:13px">
          Expira en ${OTP_EXPIRACION_MINUTOS} minutos.<br/>
          Si no solicitaste esto, ignora este correo.
        </p>
      </div>`,
  });
}

module.exports = { crearOTP, validarOTP, enviarPorEmail };