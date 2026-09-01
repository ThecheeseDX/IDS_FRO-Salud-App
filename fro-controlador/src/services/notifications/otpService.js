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

// ─────────────────────────────────────────────────────────────────────────────
//  ENTREGA DE CORREO — dos caminos según dónde corra el servidor
// ─────────────────────────────────────────────────────────────────────────────
// Render bloquea el tráfico saliente a los puertos SMTP (25, 465 y 587) en los
// servicios gratuitos desde el 26/09/2025, así que Gmail directo NO funciona
// en la nube: la conexión muere con ETIMEDOUT o ENETUNREACH. Por eso, cuando
// hay BREVO_API_KEY el correo sale por HTTPS (puerto 443, nunca bloqueado) y
// SMTP queda solo como respaldo para desarrollo local y planes de pago.

function hayBrevo() {
  return Boolean(process.env.BREVO_API_KEY);
}

// Remitente: el correo verificado en Brevo. Si no se define uno aparte, se
// reutiliza SMTP_USER, que ya es el correo del proyecto.
function remitente() {
  return process.env.BREVO_SENDER || process.env.SMTP_USER || "";
}

// ─ Camino A: API HTTP de Brevo (funciona en Render gratuito) ─
async function enviarPorBrevo({ destinatario, asunto, html }) {
  const respuesta = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: "Fro Salud", email: remitente() },
      to: [{ email: destinatario }],
      subject: asunto,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!respuesta.ok) {
    // El cuerpo trae el motivo real (remitente no verificado, cuota agotada,
    // clave inválida). Se propaga para que explicarErrorSMTP lo traduzca.
    const detalle = await respuesta.text().catch(() => "");
    const error = new Error(`Brevo respondió ${respuesta.status}: ${detalle}`);
    error.responseCode = respuesta.status;
    error.proveedor = "BREVO";
    throw error;
  }
}

// ─ Camino B: SMTP directo (desarrollo local o instancia de pago) ─
function crearTransporter() {
  const nodemailer = require("nodemailer");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER || "",
      pass: (process.env.SMTP_PASS || "").replace(/\s+/g, ""),
    },
    // Forzar IPv4: varios hosts resuelven Gmail primero por IPv6 y, sin ruta
    // IPv6, la conexión falla con ENETUNREACH antes de siquiera intentar.
    family: 4,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
}

async function enviarPorSMTP({ destinatario, asunto, html }) {
  await crearTransporter().sendMail({
    from: `"Fro Salud" <${process.env.SMTP_USER}>`,
    to: destinatario,
    subject: asunto,
    html,
  });
}

// ─ Punto único de salida: elige el camino disponible ─
async function entregarCorreo({ destinatario, asunto, html }) {
  if (hayBrevo()) {
    return enviarPorBrevo({ destinatario, asunto, html });
  }
  return enviarPorSMTP({ destinatario, asunto, html });
}

// Envío genérico reutilizable (CU42: conformidad por correo, entre otros).
async function enviarCorreo(destinatario, asunto, html) {
  await entregarCorreo({ destinatario, asunto, html });
}

// ─ Enviar OTP por Email ─
// El mismo código sirve para dos propósitos muy distintos, y el correo debe
// decir cuál: recibir "Verificación de cuenta" cuando pediste recuperar tu
// contraseña es confuso y parece phishing.
const PLANTILLAS_OTP = {
  VERIFICACION: {
    asunto: "Código de verificación - Fro Salud",
    titulo: "Verificación de cuenta",
    bajada: "Ingresa este código en la aplicación para activar tu cuenta:",
    cierre: "Si no creaste esta cuenta, ignora este correo.",
  },
  RECUPERACION: {
    asunto: "Recuperación de contraseña - Fro Salud",
    titulo: "Recuperación de contraseña",
    bajada: "Ingresa este código en la aplicación para crear una contraseña nueva:",
    cierre:
      "Si no pediste recuperar tu contraseña, ignora este correo: tu contraseña actual sigue siendo válida.",
  },
};

async function enviarPorEmail(destinatario, codigo, proposito = "VERIFICACION") {
  const plantilla = PLANTILLAS_OTP[proposito] || PLANTILLAS_OTP.VERIFICACION;

  // Diagnóstico sin exponer secretos: del usuario solo se muestra lo justo
  // para reconocerlo, y de la contraseña únicamente su largo. Si alguna vez
  // se pegó la clave dentro de SMTP_USER, esto lo delata sin publicarla.
  const usuarioSMTP = process.env.SMTP_USER || "";
  const claveSMTP = (process.env.SMTP_PASS || "").replace(/\s+/g, "");
  const enmascarar = (texto) =>
    texto.length <= 4 ? "****" : `${texto.slice(0, 2)}***${texto.slice(-2)}`;

  if (hayBrevo()) {
    console.log(
      `[CORREO] ${proposito} via Brevo (HTTPS) remitente=${enmascarar(remitente())} ` +
        `(${remitente().includes("@") ? "parece un correo" : "NO parece un correo"})`
    );
  } else {
    console.log(
      `[CORREO] ${proposito} via SMTP directo host=${process.env.SMTP_HOST} port=${process.env.SMTP_PORT} ` +
        `user=${enmascarar(usuarioSMTP)} (${usuarioSMTP.includes("@") ? "parece un correo" : "NO parece un correo"}) ` +
        `pass=${claveSMTP ? `definida, ${claveSMTP.length} caracteres` : "NO DEFINIDA"}`
    );
  }

  await entregarCorreo({
    destinatario,
    asunto: plantilla.asunto,
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:24px;
                  border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#0f172a">${plantilla.titulo}</h2>
        <p style="color:#475569">${plantilla.bajada}</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;
                    color:#2563eb;text-align:center;padding:16px 0;">${codigo}</div>
        <p style="color:#94a3b8;font-size:13px">
          Expira en ${OTP_EXPIRACION_MINUTOS} minutos.<br/>
          ${plantilla.cierre}
        </p>
      </div>`,
  });
}

function explicarErrorSMTP(error) {
  const texto = `${error?.code || ""} ${error?.responseCode || ""} ${error?.message || ""}`;

  // ── Camino Brevo (HTTPS) ──
  if (hayBrevo()) {
    if (/401|unauthorized|invalid.?api.?key/i.test(texto)) {
      return "Brevo rechazó la clave de API. Revisa BREVO_API_KEY en el servidor.";
    }
    if (/sender|not valid|unrecognised|unrecognized/i.test(texto)) {
      return `Brevo no reconoce el remitente ${remitente() || "(sin definir)"}. Verifica ese correo en Brevo → Senders.`;
    }
    if (/402|429|quota|limit|credits/i.test(texto)) {
      return "Se agotó la cuota diaria de correos de Brevo (300 por día en el plan gratuito). Reintenta mañana.";
    }
    if (/aborted|timeout|fetch failed|ENOTFOUND/i.test(texto)) {
      return "No se pudo contactar a Brevo. Puede ser un corte momentáneo de red del servidor.";
    }
    return "Brevo rechazó el envío del correo.";
  }

  // ── Camino SMTP directo ──
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
  // Render bloquea los puertos SMTP (25/465/587) en los servicios gratuitos:
  // el síntoma es siempre este, y ninguna credencial lo arregla.
  if (/ENETUNREACH|ETIMEDOUT|ECONNECTION|ECONNREFUSED|timeout/i.test(texto)) {
    return "El servidor no puede abrir conexiones SMTP salientes (típico de Render en plan gratuito, que bloquea los puertos 25, 465 y 587). Configura BREVO_API_KEY para enviar por HTTPS, o usa una instancia de pago.";
  }
  if (/EENVELOPE|no recipients|Invalid recipient/i.test(texto)) {
    return "La dirección de destino fue rechazada por el servidor de correo.";
  }
  return "El servidor de correo rechazó el envío.";
}

module.exports = { crearOTP, validarOTP, enviarPorEmail, enviarCorreo, entregarCorreo, explicarErrorSMTP };