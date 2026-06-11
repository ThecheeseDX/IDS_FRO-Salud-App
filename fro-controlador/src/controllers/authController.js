const pool = require('../config/database');
const bcrypt = require('bcrypt'); // Asegúrate de tener npm install bcrypt

exports.registrarPaciente = async (req, res) => {
    const {
        rut, nombres, apellido_paterno, apellido_materno, email, telefono,
        contrasena, confirmar_contrasena,
        sexo_clinico, calle, numero_calle, departamento, comuna_id,
        emergencia_nombre, emergencia_parentesco, emergencia_telefono
    } = req.body;

    // Validación Backend (Excepción 4: Contraseñas no coinciden)
    if (contrasena !== confirmar_contrasena) {
        return res.status(400).json({ error: 'Las contraseñas no coinciden.' });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Cifrar contraseña hash
        const saltRounds = 10;
        const contrasena_hash = await bcrypt.hash(contrasena, saltRounds);

        // OJO: Asumimos que el ROL "Paciente" tiene el ID 1 en tu tabla Rol.
        const rolPacienteId = 1; 

        // 2. Insertar Usuario
        const [userResult] = await connection.execute(
            `INSERT INTO Usuario (rut, nombres, apellido_paterno, apellido_materno, email, contrasena_hash, rol_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [rut, nombres, apellido_paterno, apellido_materno, email, contrasena_hash, rolPacienteId]
        );
        const usuario_id = userResult.insertId;

        // 3. Insertar Teléfono
        await connection.execute(
            `INSERT INTO Usuario_Telefono (usuario_id, telefono) VALUES (?, ?)`,
            [usuario_id, telefono]
        );

        // 4. Insertar Contacto de Emergencia
        const [contactoResult] = await connection.execute(
            `INSERT INTO Contacto_Emergencia (nombre, telefono, parentesco) VALUES (?, ?, ?)`,
            [emergencia_nombre, emergencia_telefono, emergencia_parentesco]
        );
        const contacto_emergencia_id = contactoResult.insertId;

        // 5. Insertar Paciente
        await connection.execute(
            `INSERT INTO Paciente (sexo_clinico, calle, numero_calle, departamento, contacto_emergencia_id, usuario_id, comuna_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [sexo_clinico, calle, numero_calle, departamento || null, contacto_emergencia_id, usuario_id, comuna_id]
        );

        await connection.commit();
        
        // Flujo Normal: HTTP 201 Created
        res.status(201).json({ mensaje: 'Paciente registrado exitosamente.' });

    } catch (error) {
        await connection.rollback(); // Deshace todo si hay un error
        console.error("Error en registro:", error);
        
        // Excepción 6: Falla de escritura o pérdida de conexión BD (HTTP 503 o 500)
        res.status(500).json({ 
            error: 'Servicio no disponible temporalmente. Ocurrió un error interno.' 
        });
    } finally {
        connection.release(); // Siempre liberar la conexión
    }
};

// Obtener lista de especialidades
exports.obtenerEspecialidades = async (req, res) => {
    try {
        const [filas] = await pool.query('SELECT especialidad_id, nombre FROM Especialidad');
        res.status(200).json(filas);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener especialidades' });
    }
};

// Validación síncrona contra la nómina (Excepción 2)
exports.validarProfesional = async (req, res) => {
    const { rut } = req.params;
    try {
        const [rows] = await pool.query('SELECT habilitado FROM Profesional_Autorizado WHERE rut_autorizado = ?', [rut]);
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

// Persistencia del Profesional y su Disponibilidad
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
        const rolProfesionalId = 2; // Asumiendo que 2 es el ID de Profesional

        // 1. Crear Usuario
        const [userResult] = await connection.execute(
            `INSERT INTO Usuario (rut, nombres, apellido_paterno, apellido_materno, email, contrasena_hash, rol_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [rut, nombres, apellido_paterno, apellido_materno, email, contrasena_hash, rolProfesionalId]
        );
        const usuario_id = userResult.insertId;

        // 2. Insertar Teléfono
        await connection.execute(`INSERT INTO Usuario_Telefono (usuario_id, telefono) VALUES (?, ?)`, [usuario_id, telefono]);

        // 3. Crear Perfil Profesional
        // Nota: Agregué calificacion_promedio en 0.00 y foto_url por defecto temporalmente.
        const [profResult] = await connection.execute(
            `INSERT INTO Profesional (num_registro_salud, reseña_curricular, calificacion_promedio, foto_url, tipo_sede, usuario_id, especialidad_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [num_registro_salud, resena_curricular, 0.00, 'default.jpg', tipo_sede, usuario_id, especialidad_id]
        );
        const profesional_id = profResult.insertId;

        // 4. Insertar la Matriz de Disponibilidad
        if (disponibilidad && disponibilidad.length > 0) {
            for (let bloque of disponibilidad) {
                await connection.execute(
                    `INSERT INTO Profesional_Disponibilidad (profesional_id, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)`,
                    [profesional_id, bloque.dia_semana, bloque.hora_inicio, bloque.hora_fin]
                );
            }
        }

        await connection.commit();
        res.status(201).json({ mensaje: 'Profesional registrado exitosamente.' });

    } catch (error) {
        await connection.rollback();
        console.error(error);
        // Excepción 8: Falla de escritura / Unicidad
        res.status(500).json({ error: 'Ocurrió un error al registrar el perfil. Verifique datos duplicados (Email/RUT/Registro).' });
    } finally {
        connection.release();
    }
};

exports.verificarUnicidad = async (req, res) => {
    const { rut, email } = req.body;
    try {
        // 1. Verificar si el RUT ya existe en el Modelo de Usuario
        const [rutExistente] = await pool.query('SELECT usuario_id FROM Usuario WHERE rut = ?', [rut]);
        if (rutExistente.length > 0) {
            return res.status(409).json({ error: 'El RUT ingresado ya se encuentra registrado en el sistema.', campo: 'rut' });
        }

        // 2. Verificar si el Email ya existe
        const [emailExistente] = await pool.query('SELECT usuario_id FROM Usuario WHERE email = ?', [email]);
        if (emailExistente.length > 0) {
            return res.status(409).json({ error: 'El correo electrónico ya está vinculado a otra cuenta.', campo: 'email' });
        }

        // Si pasa ambas pruebas, el Controlador da luz verde
        res.status(200).json({ mensaje: 'Datos únicos, puede continuar.' });
    } catch (error) {
        res.status(500).json({ error: 'Error interno al consultar el modelo de datos.' });
    }
};