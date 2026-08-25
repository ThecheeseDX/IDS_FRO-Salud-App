const pool = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const { comparePassword } = require('../utils/encriptar_bcrypt');
const { crearOTP, validarOTP, enviarPorEmail } = require('../services/notifications/otpService');

// ─────────────────────────────────────────────────────────────────────────────
// Cuentas fantasma: un registro que nunca completó la verificación OTP deja
// un Usuario inactivo que bloquea el RUT y el correo para siempre (la app no
// tiene función de borrado). Antes de registrar, se eliminan esas cuentas
// a medio crear para que la persona pueda volver a intentarlo.
// Las cuentas ACTIVAS jamás se tocan.
// ─────────────────────────────────────────────────────────────────────────────
async function eliminarCuentasInactivas(connection, rut, email) {
    const [existentes] = await connection.execute(
        `SELECT usuario_id, cuenta_activo FROM Usuario WHERE rut = ? OR email = ?`,
        [rut, email]
    );

    for (const usuario of existentes) {
        if (usuario.cuenta_activo) {
            // Una cuenta verificada nunca se reemplaza.
            return { bloqueadoPorCuentaActiva: true };
        }
    }

    for (const usuario of existentes) {
        const id = usuario.usuario_id;

        // Rama profesional (la disponibilidad depende de Profesional)
        const [profesionales] = await connection.execute(
            `SELECT profesional_id FROM Profesional WHERE usuario_id = ?`, [id]
        );
        for (const profesional of profesionales) {
            await connection.execute(
                `DELETE FROM Profesional_Disponibilidad WHERE profesional_id = ?`,
                [profesional.profesional_id]
            );
        }
        await connection.execute(`DELETE FROM Profesional WHERE usuario_id = ?`, [id]);

        // Rama paciente (el contacto de emergencia se borra después que Paciente)
        const [pacientes] = await connection.execute(
            `SELECT contacto_emergencia_id FROM Paciente WHERE usuario_id = ?`, [id]
        );
        await connection.execute(`DELETE FROM Paciente WHERE usuario_id = ?`, [id]);
        for (const paciente of pacientes) {
            if (paciente.contacto_emergencia_id) {
                await connection.execute(
                    `DELETE FROM Contacto_Emergencia WHERE contacto_emergencia_id = ?`,
                    [paciente.contacto_emergencia_id]
                );
            }
        }

        // Resto de tablas que apuntan a Usuario
        await connection.execute(`DELETE FROM Usuario_Telefono WHERE usuario_id = ?`, [id]);
        await connection.execute(`DELETE FROM Notificacion WHERE usuario_id = ?`, [id]);
        await connection.execute(`DELETE FROM Ticket_Soporte WHERE usuario_id = ?`, [id]);
        await connection.execute(`DELETE FROM Bitacora_Auditoria WHERE usuario_id = ?`, [id]);

        await connection.execute(`DELETE FROM Usuario WHERE usuario_id = ?`, [id]);
        console.log(`[registro] Cuenta inactiva ${id} reemplazada (rut/email reutilizados).`);
    }

    return { eliminadas: existentes.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRO PACIENTE
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

        // Si el RUT/correo quedó tomado por una cuenta que nunca se verificó,
        // se limpia aquí; si pertenece a una cuenta activa, se rechaza.
        const limpieza = await eliminarCuentasInactivas(connection, rut, email);
        if (limpieza.bloqueadoPorCuentaActiva) {
            await connection.rollback();
            return res.status(409).json({
                error: 'El RUT o correo ya pertenece a una cuenta verificada.'
            });
        }

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

        // CU04: Generar OTP y responder de inmediato. El correo se envía en
        // segundo plano: si el SMTP está lento o caído, el usuario no debe
        // quedar esperando — puede reenviar el código desde OTPScreen.
        const { codigo } = await crearOTP(usuario_id);
        enviarPorEmail(email, codigo).catch((errorSMTP) => {
            console.error("Error SMTP en registro paciente:", errorSMTP.message);
        });

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
// OBTENER ESPECIALIDADES
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
// VALIDAR PROFESIONAL
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
// REGISTRAR PROFESIONAL
// ─────────────────────────────────────────────────────────────────────────────
exports.registrarProfesional = async (req, res) => {
    const {
        rut, nombres, apellido_paterno, apellido_materno, email, telefono, contrasena,
        num_registro_salud, especialidad_id, tipo_sede, resena_curricular, disponibilidad
    } = req.body;

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Misma limpieza de cuentas fantasma que en el registro de paciente.
        const limpieza = await eliminarCuentasInactivas(connection, rut, email);
        if (limpieza.bloqueadoPorCuentaActiva) {
            await connection.rollback();
            return res.status(409).json({
                error: 'El RUT o correo ya pertenece a una cuenta verificada.'
            });
        }

        const saltRounds = 10;
        const contrasena_hash = await bcrypt.hash(contrasena, saltRounds);
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
            const MODALIDADES_VALIDAS = ['DOMICILIO', 'ONLINE', 'AMBOS'];
            for (let bloque of disponibilidad) {
                // Cada bloque trae su propia modalidad; si no viene (app
                // antigua), hereda la modalidad general del profesional.
                const modalidadBloque = MODALIDADES_VALIDAS.includes(bloque.modalidad)
                    ? bloque.modalidad
                    : tipo_sede;

                await connection.execute(
                    `INSERT INTO Profesional_Disponibilidad (profesional_id, dia_semana, hora_inicio, hora_fin, modalidad) VALUES (?, ?, ?, ?, ?)`,
                    [profesional_id, bloque.dia_semana, bloque.hora_inicio, bloque.hora_fin, modalidadBloque]
                );
            }
        }

        await connection.commit();

        // CU04: igual que en el registro de paciente, el correo no bloquea la
        // respuesta; se envía en segundo plano.
        const { codigo } = await crearOTP(usuario_id);
        enviarPorEmail(email, codigo).catch((errorSMTP) => {
            console.error("Error SMTP en registro profesional:", errorSMTP.message);
        });

        res.status(201).json({
            mensaje: 'Profesional registrado. Verifica tu cuenta con el código enviado a tu correo.',
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
// VERIFICAR UNICIDAD
// ─────────────────────────────────────────────────────────────────────────────
exports.verificarUnicidad = async (req, res) => {
    const { rut, email } = req.body;
    try {
        // Solo las cuentas VERIFICADAS bloquean el registro. Una cuenta que
        // nunca completó su OTP es un registro a medias: se informa y el
        // proceso de registro la reemplazará.
        const [rutExistente] = await pool.query(
            'SELECT usuario_id, cuenta_activo FROM Usuario WHERE rut = ?', [rut]
        );
        if (rutExistente.length > 0 && rutExistente[0].cuenta_activo) {
            return res.status(409).json({ error: 'El RUT ingresado ya se encuentra registrado en el sistema.', campo: 'rut' });
        }

        const [emailExistente] = await pool.query(
            'SELECT usuario_id, cuenta_activo FROM Usuario WHERE email = ?', [email]
        );
        if (emailExistente.length > 0 && emailExistente[0].cuenta_activo) {
            return res.status(409).json({ error: 'El correo electrónico ya está vinculado a otra cuenta.', campo: 'email' });
        }

        const reemplazo = rutExistente.length > 0 || emailExistente.length > 0;

        res.status(200).json({
            mensaje: reemplazo
                ? 'Existía un registro anterior sin verificar con estos datos; será reemplazado.'
                : 'Datos únicos, puede continuar.',
            reemplazo
        });
    } catch (error) {
        res.status(500).json({ error: 'Error interno al consultar el modelo de datos.' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CU04 — SOLICITAR OTP
// POST /api/auth/otp/solicitar
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

        const { codigo } = await crearOTP(usuario_id);

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
// ─────────────────────────────────────────────────────────────────────────────
exports.verificarOTP = async (req, res) => {
    const { usuario_id, codigo } = req.body;
    console.log("verificarOTP recibido:", { usuario_id, codigo });

    if (!usuario_id || !codigo) {
        return res.status(400).json({ error: 'usuario_id y codigo son requeridos.' });
    }

    try {
        const resultado = await validarOTP(usuario_id, codigo);
        console.log("resultado validarOTP:", resultado);

        if (!resultado.valido) {
            return res.status(400).json({ error: resultado.error, mensaje: resultado.mensaje });
        }

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

// ─────────────────────────────────────────────────────────────────────────────
// CU05 — LOGIN
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
    const { rut, contrasena } = req.body;

    if (!rut || !contrasena) {
        return res.status(400).json({ error: 'El RUT y la contraseña son obligatorios.' });
    }

    try {
        const usuario = await UserModel.findByRutActive(rut);

        if (!usuario) {
            return res.status(401).json({ error: 'Credenciales inválidas. Verifique su RUT y contraseña.' });
        }

        const contrasenaCorrecta = await comparePassword(contrasena, usuario.contrasena_hash);

        if (!contrasenaCorrecta) {
            return res.status(401).json({ error: 'Credenciales inválidas. Verifique su RUT y contraseña.' });
        }

        const payload = {
            usuario_id: usuario.usuario_id,
            nombre_rol: usuario.nombre_rol
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

        res.status(200).json({
            mensaje: 'Autenticación exitosa.',
            token,
            usuario: {
                usuario_id: usuario.usuario_id,
                nombres: usuario.nombres,
                apellido_paterno: usuario.apellido_paterno,
                rol: usuario.nombre_rol
            }
        });

    } catch (error) {
        console.error(" Error crítico en Login:", error);
        res.status(500).json({
            error: 'Servicio de autenticación no disponible temporalmente. Intente nuevamente en unos segundos.'
        });
    }
};