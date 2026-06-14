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
        CONCAT(u.nombres, ' ', u.apellido_paterno, ' ', u.apellido_materno) AS nombre_completo,
        p.sexo_clinico,
        p.calle,
        p.numero_calle,
        p.departamento,
        p.comuna_id,
        COUNT(c.cita_id) AS total_atenciones,
        MAX(c.fecha_hora_inicio) AS ultima_atencion
      FROM paciente p
      INNER JOIN usuario u ON u.usuario_id = p.usuario_id
      INNER JOIN cita c ON c.paciente_id = p.paciente_id
      WHERE c.profesional_id = ?
        AND (
          u.nombres LIKE ?
          OR u.apellido_paterno LIKE ?
          OR u.apellido_materno LIKE ?
          OR u.rut LIKE ?
          OR CONCAT(u.nombres, ' ', u.apellido_paterno, ' ', u.apellido_materno) LIKE ?
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
      ORDER BY u.apellido_paterno ASC, u.apellido_materno ASC, u.nombres ASC
      `,
      [profesionalId, busqueda, busqueda, busqueda, busqueda, busqueda]
    );

    res.json({
      ok: true,
      pacientes,
    });
  } catch (error) {
    console.error('Error al listar pacientes asignados:', error);
    res.status(500).json({
      ok: false,
      message: 'Error al recuperar registros clínicos',
    });
  }
};

exports.obtenerHistorialPaciente = async (req, res) => {
  try {
    const { pacienteId } = req.params;

    const [historial] = await db.query(
      `
      SELECT
        c.cita_id,
        c.fecha_hora_inicio,
        c.fecha_hora_fin,
        c.estado,
        COALESCE(
          CONCAT(u.nombres, ' ', u.apellido_paterno, ' ', u.apellido_materno),
          'Profesional no registrado'
        ) AS profesional,
        COALESCE(e.nombre, 'Especialidad no registrada') AS especialidad,
        COALESCE(p.tipo_sede, 'No informado') AS tipo_sede
      FROM cita c
      LEFT JOIN profesional p ON p.profesional_id = c.profesional_id
      LEFT JOIN usuario u ON u.usuario_id = p.usuario_id
      LEFT JOIN especialidad e ON e.especialidad_id = p.especialidad_id
      WHERE c.paciente_id = ?
      ORDER BY c.fecha_hora_inicio DESC
      `,
      [pacienteId]
    );

    res.json({
      ok: true,
      historial,
    });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({
      ok: false,
      message: 'Error al recuperar historial del paciente',
    });
  }
};
exports.listarPacientesPorUsuarioProfesional = async (req, res) => {
  try {
    const { usuarioId } = req.params;
    const { buscar = '' } = req.query;

    const [[profesional]] = await db.query(
      `SELECT profesional_id FROM profesional WHERE usuario_id = ? LIMIT 1`,
      [usuarioId]
    );

    if (!profesional) {
      return res.status(404).json({
        ok: false,
        message: 'No se encontró profesional asociado al usuario',
      });
    }

    req.params.profesionalId = profesional.profesional_id;
    return exports.listarPacientesAsignados(req, res);
  } catch (error) {
    console.error('Error al buscar profesional por usuario:', error);
    res.status(500).json({
      ok: false,
      message: 'Error al recuperar registros clínicos',
    });
  }
};