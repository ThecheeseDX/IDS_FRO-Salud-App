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