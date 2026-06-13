const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { crearOTP, validarOTP, enviarPorEmail } = require('../services/notifications/otpService');

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRO PACIENTE (sin cambios)
// ─────────────────────────────────────────────────────────────────────────────
exports.registrarPaciente = async (req, res) => {
    const {
        rut, nombres, apellido_paterno, apellido_materno, email, telefono,
        contrasena, confirmar_contrasena,
        sexo_clinico, calle, numero_calle, departamento, comuna_id,
        emergencia_nombre, emergencia_parentesco, emergencia_telefono
    } = req.body;

    if (contrasena !== confirmar_contrasena) {
        return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const saltRounds = 10;
        const contrasena_hash = await bcrypt.hash(contrasena, saltRounds);
        const rolPacienteId = 1;

        const [userResult] = await connection.execute(
            `INSERT INTO Usuario (rut, nombres, apellido_paterno, apellido_materno, email, contrasena_hash, rol_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [rut, nombres, apellido_paterno, apellido_materno, email, contrasena_hash, rolPacienteId]
        );
        const usuario_id = userResult.insertId;

        await connection.execute(
            `INSERT INTO Usuario_Telefono (usuario_id, telefono) VALUES (?, ?)`,
            [usuario_id, telefono]
        );

        const [contactoResult] = await connection.execute(
            `INSERT INTO Contacto_Emergencia (nombre, telefono, parentesco) VALUES (?, ?, ?)`,
            [emergencia_nombre, emergencia_telefono, emergencia_parentesco]
        );
        const contacto_emergencia_id = contactoResult.insertId;

        await connection.execute(
            `INSERT INTO Paciente (sexo_clinico, calle, numero_calle, departamento, contacto_emergencia_id, usuario_id, comuna_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [sexo_clinico, calle, numero_calle, departamento || null, contacto_emergencia_id, usuario_id, comuna_id]
        );

        await connection.commit();

        // ── CAMBIO CU04: devolvemos usuario_id y email para que el frontend
        //    navegue a OTPScreen en vez de ir directo al Login ──────────────
        const { codigo } = await crearOTP(usuario_id);
        try {
            await enviarPorEmail(email, codigo);
        } catch (errorSMTP) {
            console.error("Error SMTP en registro:", errorSMTP);
            // No bloqueamos el registro si falla el correo,
            // el usuario puede reenviar desde OTPScreen
        }
        res.status(201).json({
            mensaje: 'Paciente registrado. Verifica tu cuenta con el código enviado a tu correo.',
            usuario_id,
            email
        });

    } catch (error) {
        await connection.rollback();
        console.error("Error en registro:", error);
        res.status(500).json({
            error: 'Servicio no disponible temporalmente. Ocurrió un error interno.'
        });
    } finally {
        connection.release();
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// OBTENER ESPECIALIDADES (sin cambios)
// ─────────────────────────────────────────────────────────────────────────────
exports.obtenerEspecialidades = async (req, res) => {
    try {
        const [filas] = await pool.query('SELECT especialidad_id, nombre FROM Especialidad');
        res.status(200).json(filas);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener especialidades' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// VALIDAR PROFESIONAL (sin cambios)
// ─────────────────────────────────────────────────────────────────────────────
exports.validarProfesional = async (req, res) => {
    const { rut } = req.params;
    try {
        const [rows] = await pool.query(
            'SELECT habilitado FROM Profesional_Autorizado WHERE rut_autorizado = ?',
            [rut]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'El RUT ingresado no figura en la nómina de profesionales autorizados.' });
        }
        if (!rows[0].habilitado) {
            return res.status(403).json({ error: 'El profesional se encuentra inhabilitado en el sistema.' });
        }
        res.status(200).json({ mensaje: 'Profesional validado correctamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error interno de validación.' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRAR PROFESIONAL (sin cambios)
// ─────────────────────────────────────────────────────────────────────────────
exports.registrarProfesional = async (req, res) => {
    const {
        rut, nombres, apellido_paterno, apellido_materno, email, telefono, contrasena,
        num_registro_salud, especialidad_id, tipo_sede, resena_curricular, disponibilidad
    } = req.body;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const saltRounds = 10;
        const contrasena_hash = await require('bcrypt').hash(contrasena, saltRounds);
        const rolProfesionalId = 2;

        const [userResult] = await connection.execute(
            `INSERT INTO Usuario (rut, nombres, apellido_paterno, apellido_materno, email, contrasena_hash, rol_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [rut, nombres, apellido_paterno, apellido_materno, email, contrasena_hash, rolProfesionalId]
        );
        const usuario_id = userResult.insertId;

        await connection.execute(
            `INSERT INTO Usuario_Telefono (usuario_id, telefono) VALUES (?, ?)`,
            [usuario_id, telefono]
        );

        const [profResult] = await connection.execute(
            `INSERT INTO Profesional (num_registro_salud, reseña_curricular, calificacion_promedio, foto_url, tipo_sede, usuario_id, especialidad_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [num_registro_salud, resena_curricular, 0.00, 'default.jpg', tipo_sede, usuario_id, especialidad_id]
        );
        const profesional_id = profResult.insertId;

        if (disponibilidad && disponibilidad.length > 0) {
            for (let bloque of disponibilidad) {
                await connection.execute(
                    `INSERT INTO Profesional_Disponibilidad (profesional_id, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)`,
                    [profesional_id, bloque.dia_semana, bloque.hora_inicio, bloque.hora_fin]
                );
            }
        }

        await connection.commit();

        // ── CAMBIO CU04: igual que paciente, devolvemos usuario_id y email ─
        const { codigo } = await crearOTP(usuario_id);
        try {
            await enviarPorEmail(email, codigo);
        } catch (errorSMTP) {
            console.error("Error SMTP en registro:", errorSMTP);
            // No bloqueamos el registro si falla el correo,
            // el usuario puede reenviar desde OTPScreen
        }

        res.status(201).json({
            mensaje: 'Paciente registrado. Verifica tu cuenta con el código enviado a tu correo.',
            usuario_id,
            email
        });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ error: 'Ocurrió un error al registrar el perfil. Verifique datos duplicados (Email/RUT/Registro).' });
    } finally {
        connection.release();
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICAR UNICIDAD (sin cambios)
// ─────────────────────────────────────────────────────────────────────────────
exports.verificarUnicidad = async (req, res) => {
    const { rut, email } = req.body;
    try {
        const [rutExistente] = await pool.query('SELECT usuario_id FROM Usuario WHERE rut = ?', [rut]);
        if (rutExistente.length > 0) {
            return res.status(409).json({ error: 'El RUT ingresado ya se encuentra registrado en el sistema.', campo: 'rut' });
        }

        const [emailExistente] = await pool.query('SELECT usuario_id FROM Usuario WHERE email = ?', [email]);
        if (emailExistente.length > 0) {
            return res.status(409).json({ error: 'El correo electrónico ya está vinculado a otra cuenta.', campo: 'email' });
        }

        res.status(200).json({ mensaje: 'Datos únicos, puede continuar.' });
    } catch (error) {
        res.status(500).json({ error: 'Error interno al consultar el modelo de datos.' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CU04 — SOLICITAR OTP
// POST /api/auth/otp/solicitar
// Body: { usuario_id }
// ─────────────────────────────────────────────────────────────────────────────
exports.solicitarOTP = async (req, res) => {
    const { usuario_id } = req.body;

    if (!usuario_id) {
        return res.status(400).json({ error: 'usuario_id es requerido.' });
    }

    try {
        const [usuarios] = await pool.query(
            `SELECT usuario_id, email, cuenta_activo FROM Usuario WHERE usuario_id = ?`,
            [usuario_id]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        if (usuarios[0].cuenta_activo) {
            return res.status(409).json({ error: 'La cuenta ya está activa.' });
        }

        // Genera el código y lo persiste en las columnas otp_codigo / otp_expiracion
        const { codigo } = await crearOTP(usuario_id);

        // Envío por SMTP — Excepción 1 del CU04
        try {
            await enviarPorEmail(usuarios[0].email, codigo);
        } catch (errorSMTP) {
            console.error("Error SMTP detalle:", errorSMTP);
            await pool.query(
                `INSERT INTO Bitacora_Auditoria (accion, entidad_afectada, usuario_id, datos_adicionales)
                 VALUES ('OTP_ENVIO_FALLIDO', 'Usuario', ?, ?)`,
                [usuario_id, JSON.stringify({ error: errorSMTP.message })]
            );
            return res.status(502).json({
                error: 'ENVIO_FALLIDO',
                mensaje: 'No se pudo enviar el código. Verifica tu señal e intenta de nuevo.'
            });
        }

        return res.status(200).json({ mensaje: 'Código enviado al correo registrado.' });

    } catch (error) {
        console.error('[solicitarOTP]', error);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CU04 — VERIFICAR OTP
// POST /api/auth/otp/verificar
// Body: { usuario_id, codigo }
// ─────────────────────────────────────────────────────────────────────────────
exports.verificarOTP = async (req, res) => {
    const { usuario_id, codigo } = req.body;
    console.log("verificarOTP recibido:", { usuario_id, codigo });

    if (!usuario_id || !codigo) {
        return res.status(400).json({ error: 'usuario_id y codigo son requeridos.' });
    }

    try {
        // comprobar_exactitud_vigencia() — Excepción 3 del CU04
        const resultado = await validarOTP(usuario_id, codigo);
        console.log("resultado validarOTP:", resultado);

        if (!resultado.valido) {
            return res.status(400).json({ error: resultado.error, mensaje: resultado.mensaje });
        }

        // UPDATE Usuario SET cuenta_activo = TRUE — Excepción 4 del CU04
        try {
            await pool.query(
                `UPDATE Usuario
                    SET cuenta_activo  = TRUE,
                        otp_codigo     = NULL,
                        otp_expiracion = NULL
                  WHERE usuario_id = ?`,
                [usuario_id]
            );
        } catch (errorBD) {
            await pool.query(
                `INSERT INTO Bitacora_Auditoria (accion, entidad_afectada, usuario_id, datos_adicionales)
                 VALUES ('OTP_ACTIVACION_FALLIDA', 'Usuario', ?, ?)`,
                [usuario_id, JSON.stringify({ error: errorBD.message })]
            );
            return res.status(500).json({
                error: 'PERSISTENCIA_FALLIDA',
                mensaje: 'No se pudo activar la cuenta. Intenta nuevamente.'
            });
        }

        return res.status(200).json({ mensaje: 'Cuenta activada exitosamente. Ya puedes iniciar sesión.' });

    } catch (error) {
        console.error('[verificarOTP]', error);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
};