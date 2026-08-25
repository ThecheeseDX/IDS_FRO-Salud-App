const db = require('../config/database');

// ─────────────────────────────────────────────────────────────────────────────
// LISTAR PACIENTES ASIGNADOS (Por Profesional ID)
// ─────────────────────────────────────────────────────────────────────────────
exports.listarPacientesAsignados = async (req, res) => {
  try {
    const { profesionalId } = req.params;
    const { buscar = '' } = req.query;
    const busqueda = `%${buscar}%`;

    const [pacientes] = await db.query(
      `
      SELECT
        p.paciente_id,
        u.usuario_id,
        u.rut,
        CONCAT(COALESCE(u.nombres, ''), ' ', COALESCE(u.apellido_paterno, ''), ' ', COALESCE(u.apellido_materno, '')) AS nombre_completo,
        p.sexo_clinico,
        CASE WHEN JSON_EXTRACT(p.privacidad_contacto, '$.mostrar_direccion') = false
             THEN NULL ELSE p.calle END AS calle,
        CASE WHEN JSON_EXTRACT(p.privacidad_contacto, '$.mostrar_direccion') = false
             THEN NULL ELSE p.numero_calle END AS numero_calle,
        CASE WHEN JSON_EXTRACT(p.privacidad_contacto, '$.mostrar_direccion') = false
             THEN NULL ELSE p.departamento END AS departamento,
        p.comuna_id,
        COUNT(DISTINCT ec.episodio_clinico_id) AS total_atenciones,
        MAX(ec.fecha_inicio) AS ultima_atencion
      FROM Paciente p
      LEFT JOIN Usuario u ON u.usuario_id = p.usuario_id
      LEFT JOIN Episodio_Clinico ec ON ec.paciente_id = p.paciente_id AND ec.profesional_id = ?
      WHERE (
          ec.paciente_id IS NOT NULL 
          OR p.paciente_id IN (SELECT paciente_id FROM Cita WHERE profesional_id = ? AND estado NOT IN ('CANCELADA'))
        )
        AND (
          u.nombres LIKE ?
          OR u.apellido_paterno LIKE ?
          OR u.apellido_materno LIKE ?
          OR u.rut LIKE ?
          OR CONCAT(COALESCE(u.nombres, ''), ' ', COALESCE(u.apellido_paterno, ''), ' ', COALESCE(u.apellido_materno, '')) LIKE ?
          OR p.paciente_id LIKE ?
        )
      GROUP BY
        p.paciente_id,
        u.usuario_id,
        u.rut,
        u.nombres,
        u.apellido_paterno,
        u.apellido_materno,
        p.privacidad_contacto,
        p.sexo_clinico,
        p.calle,
        p.numero_calle,
        p.departamento,
        p.comuna_id
      ORDER BY ultima_atencion DESC
      `,
      [profesionalId, profesionalId, busqueda, busqueda, busqueda, busqueda, busqueda, busqueda]
    );

    res.json({ ok: true, pacientes });
  } catch (error) {
    console.error('Error al listar pacientes asignados:', error);
    res.status(500).json({
      ok: false,
      message: 'Error de conexión con la base de datos',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// OBTENER HISTORIAL CONSOLIDADO
// ─────────────────────────────────────────────────────────────────────────────
exports.obtenerHistorialPaciente = async (req, res) => {
  try {
    const { pacienteId } = req.params;
    const usuarioId = req.query.usuarioId || req.user?.usuario_id;

    // Modificado para validar asignación tanto por episodio como por cita vigente
    const [[asignacion]] = await db.query(
      `
      SELECT 1 AS asignado
      FROM Paciente p
      WHERE p.paciente_id = ? AND (
        p.paciente_id IN (
          SELECT ec.paciente_id FROM Episodio_Clinico ec 
          INNER JOIN Profesional pr ON pr.profesional_id = ec.profesional_id WHERE pr.usuario_id = ?
        )
        OR p.paciente_id IN (
          SELECT c.paciente_id FROM Cita c 
          INNER JOIN Profesional pr ON pr.profesional_id = c.profesional_id WHERE pr.usuario_id = ? AND c.estado NOT IN ('CANCELADA')
        )
      )
      LIMIT 1
      `,
      [pacienteId, usuarioId, usuarioId]
    );

    if (!asignacion) {
      return res.status(403).json({
        ok: false,
        message: 'Paciente no asignado al profesional',
      });
    }

    const [[paciente]] = await db.query(
      `
      SELECT
        p.paciente_id,
        u.rut,
        CONCAT(COALESCE(u.nombres, ''), ' ', COALESCE(u.apellido_paterno, ''), ' ', COALESCE(u.apellido_materno, '')) AS nombre_completo,
        p.sexo_clinico,
        CASE WHEN JSON_EXTRACT(p.privacidad_contacto, '$.mostrar_direccion') = false
             THEN NULL ELSE p.calle END AS calle,
        CASE WHEN JSON_EXTRACT(p.privacidad_contacto, '$.mostrar_direccion') = false
             THEN NULL ELSE p.numero_calle END AS numero_calle,
        CASE WHEN JSON_EXTRACT(p.privacidad_contacto, '$.mostrar_direccion') = false
             THEN NULL ELSE p.departamento END AS departamento,
        p.comuna_id
      FROM Paciente p
      LEFT JOIN Usuario u ON u.usuario_id = p.usuario_id
      WHERE p.paciente_id = ?
      LIMIT 1
      `,
      [pacienteId]
    );

    const [historial] = await db.query(
      `
      SELECT
        c.cita_id,
        c.fecha_hora_inicio,
        c.fecha_hora_fin,
        c.estado,
        c.modalidad,
        COALESCE(CONCAT(u.nombres, ' ', u.apellido_paterno, ' ', u.apellido_materno), 'Profesional no registrado') AS profesional,
        COALESCE(e.nombre, 'Especialidad no registrada') AS especialidad,
        COALESCE(s.nombre, 'No informado') AS tipo_sede
      FROM Cita c
      LEFT JOIN Profesional pr ON pr.profesional_id = c.profesional_id
      LEFT JOIN Usuario u ON u.usuario_id = pr.usuario_id
      LEFT JOIN Especialidad e ON e.especialidad_id = pr.especialidad_id
      LEFT JOIN Sede s ON s.sede_id = c.sede_id
      WHERE c.paciente_id = ?
      ORDER BY c.fecha_hora_inicio DESC
      `,
      [pacienteId]
    );

    const [episodios] = await db.query(
      `
      SELECT
        episodio_clinico_id,
        motivo_consulta,
        fecha_inicio,
        fecha_terminado,
        estado,
        paciente_id,
        profesional_id
      FROM Episodio_Clinico
      WHERE paciente_id = ?
      ORDER BY fecha_inicio DESC
      `,
      [pacienteId]
    );

    const [evoluciones] = await db.query(
      `
      SELECT
        ec.evolucion_clinica_id,
        ec.inalterable,
        ec.hora_firma_digital,
        ec.firma_digital,
        ec.porcentaje_objetivo,
        ec.respuesta_fisiologica,
        ec.tecnicas_aplicadas,
        ec.episodio_clinico_id,
        ec.profesional_id,
        ep.motivo_consulta,
        ep.fecha_inicio AS fecha_episodio,
        (SELECT COUNT(*) FROM Evolucion_Version ev
          WHERE ev.evolucion_clinica_id = ec.evolucion_clinica_id) AS total_versiones
      FROM Evolucion_Clinica ec
      INNER JOIN Episodio_Clinico ep ON ep.episodio_clinico_id = ec.episodio_clinico_id
      WHERE ep.paciente_id = ?
      ORDER BY ec.evolucion_clinica_id DESC
      `,
      [pacienteId]
    );

    // CU33/CU35: el repositorio multimedia opera si Cloudinary está configurado.
    const multimediaDisponible = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    const [[conteoDocumentos]] = await db.query(
      `SELECT COUNT(*) AS total FROM Documento_Clinico WHERE paciente_id = ?`,
      [pacienteId]
    );

    res.json({
      ok: true,
      paciente,
      historial,
      episodios,
      evoluciones,
      multimediaDisponible,
      totalDocumentos: conteoDocumentos.total,
      mensajeMultimedia: multimediaDisponible
        ? ''
        : 'Archivos multimedia temporalmente no disponibles. Se muestran únicamente registros clínicos de texto.',
    });
  } catch (error) {
    console.error('Error al obtener historial consolidado:', error);
    res.status(500).json({
      ok: false,
      message: 'Error de conexión con la base de datos',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LISTAR PACIENTES POR USUARIO PROFESIONAL (Basado en la Cuenta de Usuario)
// ─────────────────────────────────────────────────────────────────────────────
exports.listarPacientesPorUsuarioProfesional = async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const { buscar = '' } = req.query;
    const busqueda = `%${buscar}%`;

    const [pacientes] = await db.query(
      `
      SELECT
        p.paciente_id,
        u.usuario_id,
        u.rut,
        CONCAT(COALESCE(u.nombres, ''), ' ', COALESCE(u.apellido_paterno, ''), ' ', COALESCE(u.apellido_materno, '')) AS nombre_completo,
        p.sexo_clinico,
        CASE WHEN JSON_EXTRACT(p.privacidad_contacto, '$.mostrar_direccion') = false
             THEN NULL ELSE p.calle END AS calle,
        CASE WHEN JSON_EXTRACT(p.privacidad_contacto, '$.mostrar_direccion') = false
             THEN NULL ELSE p.numero_calle END AS numero_calle,
        CASE WHEN JSON_EXTRACT(p.privacidad_contacto, '$.mostrar_direccion') = false
             THEN NULL ELSE p.departamento END AS departamento,
        p.comuna_id,
        COUNT(DISTINCT ec.episodio_clinico_id) AS total_atenciones,
        MAX(ec.fecha_inicio) AS ultima_atencion
      FROM Paciente p
      LEFT JOIN Usuario u ON u.usuario_id = p.usuario_id
      LEFT JOIN Episodio_Clinico ec ON ec.paciente_id = p.paciente_id
        AND ec.profesional_id IN (SELECT profesional_id FROM Profesional WHERE usuario_id = ?)
      WHERE (
          ec.paciente_id IS NOT NULL
          OR p.paciente_id IN (
            SELECT c.paciente_id 
            FROM Cita c 
            JOIN Profesional pr ON c.profesional_id = pr.profesional_id 
            WHERE pr.usuario_id = ? AND c.estado NOT IN ('CANCELADA')
          )
        )
        AND (
          u.nombres LIKE ?
          OR u.apellido_paterno LIKE ?
          OR u.apellido_materno LIKE ?
          OR u.rut LIKE ?
          OR CONCAT(COALESCE(u.nombres, ''), ' ', COALESCE(u.apellido_paterno, ''), ' ', COALESCE(u.apellido_materno, '')) LIKE ?
          OR p.paciente_id LIKE ?
        )
      GROUP BY
        p.paciente_id,
        u.usuario_id,
        u.rut,
        u.nombres,
        u.apellido_paterno,
        u.apellido_materno,
        p.privacidad_contacto,
        p.sexo_clinico,
        p.calle,
        p.numero_calle,
        p.departamento,
        p.comuna_id
      ORDER BY ultima_atencion DESC
      `,
      [usuarioId, usuarioId, busqueda, busqueda, busqueda, busqueda, busqueda, busqueda]
    );

    res.json({ ok: true, pacientes });
  } catch (error) {
    console.error('Error al listar pacientes por usuario profesional:', error);
    res.status(500).json({
      ok: false,
      message: 'Error de conexión con la base de datos',
    });
  }
};