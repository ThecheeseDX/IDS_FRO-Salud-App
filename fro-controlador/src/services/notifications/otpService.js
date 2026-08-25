const crypto = require("crypto");
const db = require("../../config/database");

const OTP_EXPIRACION_MINUTOS = 10;

function generarCodigo() {
  return crypto.randomInt(100000, 999999).toString();
}

// ─ Crear OTP y guardarlo en columnas de Usuario 
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

// ─ Validar OTP ingresado 
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

// ─ Enviar OTP por Email 
async function enviarPorEmail(destinatario, codigo) {
  const nodemailer = require("nodemailer");

  // Diagnóstico sin exponer secretos: del usuario solo se muestra lo justo
  // para reconocerlo, y de la contraseña únicamente su largo. Si alguna vez
  // se pegó la clave dentro de SMTP_USER, esto lo delata sin publicarla.
  const usuarioSMTP = process.env.SMTP_USER || "";
  const claveSMTP = (process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const enmascarar = (texto) =>
    texto.length <= 4 ? "****" : `${texto.slice(0, 2)}***${texto.slice(-2)}`;

  console.log(
    `[SMTP] host=${process.env.SMTP_HOST} port=${process.env.SMTP_PORT} ` +
      `user=${enmascarar(usuarioSMTP)} (${usuarioSMTP.includes("@") ? "parece un correo" : "NO parece un correo"}) ` +
      `pass=${claveSMTP ? `definida, ${claveSMTP.length} caracteres` : "NO DEFINIDA"}`
  );

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: usuarioSMTP,
      pass: claveSMTP, // Google la muestra con espacios; ya vienen quitados
    },
    // Sin límites de tiempo, un SMTP caído deja la petición colgada para
    // siempre y la app queda esperando. Mejor fallar rápido y avisar.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
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

/**
 * Traduce un fallo de envío de correo a una explicación accionable.
 * No incluye credenciales: es seguro mostrarla o registrarla.
 */
function explicarErrorSMTP(error) {
  const texto = `${error?.code || ""} ${error?.responseCode || ""} ${error?.message || ""}`;
  const usuario = process.env.SMTP_USER || "";
  const clave = (process.env.SMTP_PASS || "").replace(/\s+/g, "");

  if (!usuario || !clave) {
    return "Faltan credenciales de correo en el servidor (SMTP_USER y/o SMTP_PASS).";
  }
  if (!usuario.includes("@")) {
    return "SMTP_USER no es una dirección de correo. Debe ser el correo completo del remitente.";
  }
  if (/Invalid login|535|BadCredentials|Username and Password not accepted/i.test(texto)) {
    return clave.length !== 16
      ? `Gmail rechazó las credenciales. La contraseña configurada tiene ${clave.length} caracteres; una contraseña de aplicación tiene 16.`
      : "Gmail rechazó las credenciales. Verifica que la contraseña de aplicación siga vigente.";
  }
  if (/ETIMEDOUT|ECONNECTION|ECONNREFUSED|timeout/i.test(texto)) {
    return "No se pudo contactar al servidor de correo. Revisa SMTP_HOST y SMTP_PORT.";
  }
  if (/EENVELOPE|no recipients|Invalid recipient/i.test(texto)) {
    return "La dirección de destino fue rechazada por el servidor de correo.";
  }
  return "El servidor de correo rechazó el envío.";
}

module.exports = { crearOTP, validarOTP, enviarPorEmail, explicarErrorSMTP };