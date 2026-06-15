const db = require('../config/database');

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
        p.calle,
        p.numero_calle,
        p.departamento,
        p.comuna_id,
        COUNT(ec.episodio_clinico_id) AS total_atenciones,
        MAX(ec.fecha_inicio) AS ultima_atencion
      FROM paciente p
      LEFT JOIN usuario u ON u.usuario_id = p.usuario_id
      INNER JOIN episodio_clinico ec ON ec.paciente_id = p.paciente_id
      WHERE ec.profesional_id = ?
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
        p.sexo_clinico,
        p.calle,
        p.numero_calle,
        p.departamento,
        p.comuna_id
      ORDER BY ultima_atencion DESC
      `,
      [profesionalId, busqueda, busqueda, busqueda, busqueda, busqueda, busqueda]
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

exports.obtenerHistorialPaciente = async (req, res) => {
  try {
    const { pacienteId } = req.params;
    const usuarioId = req.query.usuarioId || req.user?.usuario_id;

    const [[asignacion]] = await db.query(
      `
      SELECT 1 AS asignado
      FROM episodio_clinico ec
      INNER JOIN profesional pr ON pr.profesional_id = ec.profesional_id
      WHERE ec.paciente_id = ?
        AND pr.usuario_id = ?
      LIMIT 1
      `,
      [pacienteId, usuarioId]
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
        p.calle,
        p.numero_calle,
        p.departamento,
        p.comuna_id
      FROM paciente p
      LEFT JOIN usuario u ON u.usuario_id = p.usuario_id
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
        COALESCE(CONCAT(u.nombres, ' ', u.apellido_paterno, ' ', u.apellido_materno), 'Profesional no registrado') AS profesional,
        COALESCE(e.nombre, 'Especialidad no registrada') AS especialidad,
        COALESCE(s.nombre, 'No informado') AS tipo_sede
      FROM cita c
      LEFT JOIN profesional pr ON pr.profesional_id = c.profesional_id
      LEFT JOIN usuario u ON u.usuario_id = pr.usuario_id
      LEFT JOIN especialidad e ON e.especialidad_id = pr.especialidad_id
      LEFT JOIN sede s ON s.sede_id = c.sede_id
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
      FROM episodio_clinico
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
        ep.fecha_inicio AS fecha_episodio
      FROM evolucion_clinica ec
      INNER JOIN episodio_clinico ep ON ep.episodio_clinico_id = ec.episodio_clinico_id
      WHERE ep.paciente_id = ?
      ORDER BY ec.evolucion_clinica_id DESC
      `,
      [pacienteId]
    );

    res.json({
      ok: true,
      paciente,
      historial,
      episodios,
      evoluciones,
      multimediaDisponible: false,
      mensajeMultimedia:
        'Archivos multimedia temporalmente no disponibles. Se muestran únicamente registros clínicos de texto.',
    });
  } catch (error) {
    console.error('Error al obtener historial consolidado:', error);
    res.status(500).json({
      ok: false,
      message: 'Error de conexión con la base de datos',
    });
  }
};

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
        p.calle,
        p.numero_calle,
        p.departamento,
        p.comuna_id,
        COUNT(ec.episodio_clinico_id) AS total_atenciones,
        MAX(ec.fecha_inicio) AS ultima_atencion
      FROM paciente p
      LEFT JOIN usuario u ON u.usuario_id = p.usuario_id
      INNER JOIN episodio_clinico ec ON ec.paciente_id = p.paciente_id
      INNER JOIN profesional pr ON pr.profesional_id = ec.profesional_id
      WHERE pr.usuario_id = ?
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
        p.sexo_clinico,
        p.calle,
        p.numero_calle,
        p.departamento,
        p.comuna_id
      ORDER BY ultima_atencion DESC
      `,
      [usuarioId, busqueda, busqueda, busqueda, busqueda, busqueda, busqueda]
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