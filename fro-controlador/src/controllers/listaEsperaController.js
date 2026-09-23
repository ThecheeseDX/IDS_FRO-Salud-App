/**
 * CU19 — Lista de espera secuencial.
 *
 * El paciente se inscribe en un bloque que está ocupado. Cuando ese bloque se
 * libera, el cupo se ofrece a UNO SOLO: el primero de la fila por orden de
 * llegada, con un plazo para tomarlo. Si deja vencer el plazo, el turno pasa
 * automáticamente al siguiente (Excepción 4).
 */

const pool = require('../config/database');
const {
  leerParametroEntero,
  notificarUsuario,
  ofrecerCupoListaEspera,
  revisarVencimientosListaEspera,
  datosDelBloque,
  describirBloque,
} = require('../services/agenda/agendaService');

async function pacienteDe(conexion, usuario_id) {
  const [[fila]] = await conexion.execute(
    `SELECT paciente_id FROM Paciente WHERE usuario_id = ? LIMIT 1`,
    [usuario_id]
  );
  return fila?.paciente_id || null;
}

/**
 * POST /api/citas/:id/lista-espera
 *
 * Inscribe al paciente en la lista del bloque ocupado. La posición sale del
 * orden cronológico de llegada, como exige la ficha del CU.
 */
exports.inscribirse = async (req, res) => {
  const cita_id = req.params.id;
  const conexion = await pool.getConnection();

  try {
    await conexion.beginTransaction();

    const paciente_id = await pacienteDe(conexion, req.user.usuario_id);
    if (!paciente_id) {
      await conexion.rollback();
      return res.status(403).json({
        error: 'SOLO_PACIENTES',
        mensaje: 'Solo un paciente puede inscribirse en la lista de espera.',
      });
    }

    const [[cita]] = await conexion.execute(
      `SELECT cita_id, estado, fecha_hora_inicio, paciente_id
         FROM Cita WHERE cita_id = ? LIMIT 1 FOR UPDATE`,
      [cita_id]
    );

    if (!cita) {
      await conexion.rollback();
      return res.status(404).json({ error: 'CITA_NO_ENCONTRADA', mensaje: 'Ese bloque ya no existe.' });
    }

    if (String(cita.estado).startsWith('CANCELADA')) {
      await conexion.rollback();
      return res.status(409).json({
        error: 'BLOQUE_LIBRE',
        mensaje: 'Ese bloque ya está libre: puedes reservarlo directamente.',
      });
    }

    if (Number(cita.paciente_id) === Number(paciente_id)) {
      await conexion.rollback();
      return res.status(409).json({
        error: 'BLOQUE_PROPIO',
        mensaje: 'Ese bloque ya es tuyo: no necesitas esperarlo.',
      });
    }

    if (new Date(cita.fecha_hora_inicio).getTime() <= Date.now()) {
      await conexion.rollback();
      return res.status(409).json({
        error: 'BLOQUE_PASADO',
        mensaje: 'Ese bloque ya pasó. Busca una hora futura.',
      });
    }

    // Excepción 1: la lista tiene un tope, y lleno se deshabilita la inscripción.
    const maximo = await leerParametroEntero(conexion, 'MAX_PACIENTES_LISTA_ESPERA', 5);
    const [[conteo]] = await conexion.execute(
      `SELECT COUNT(*) AS activos FROM Lista_Espera
        WHERE cita_id = ? AND estado IN ('ESPERANDO', 'NOTIFICADO')`,
      [cita_id]
    );
    if (conteo.activos >= maximo) {
      await conexion.rollback();
      return res.status(409).json({
        error: 'LISTA_COMPLETA',
        mensaje: `La lista de espera de este bloque está completa (${maximo} personas). Prueba con otro horario o profesional.`,
      });
    }

    const [[yaInscrito]] = await conexion.execute(
      `SELECT lista_espera_id, estado, posicion FROM Lista_Espera
        WHERE cita_id = ? AND paciente_id = ? LIMIT 1`,
      [cita_id, paciente_id]
    );
    if (yaInscrito && ['ESPERANDO', 'NOTIFICADO'].includes(yaInscrito.estado)) {
      await conexion.rollback();
      return res.status(409).json({
        error: 'YA_INSCRITO',
        mensaje: `Ya estás en esta lista, en la posición ${yaInscrito.posicion}.`,
        posicion: yaInscrito.posicion,
      });
    }

    const [[ultimo]] = await conexion.execute(
      `SELECT COALESCE(MAX(posicion), 0) AS ultima FROM Lista_Espera WHERE cita_id = ?`,
      [cita_id]
    );
    const posicion = Number(ultimo.ultima) + 1;

    // Una inscripción anterior vencida se reutiliza: la clave (cita, paciente)
    // es única, así que no puede haber dos filas del mismo paciente.
    if (yaInscrito) {
      await conexion.execute(
        `UPDATE Lista_Espera
            SET estado = 'ESPERANDO', posicion = ?, notificado = FALSE,
                momento_inscripcion = NOW(), momento_notificacion = NULL, momento_expira = NULL
          WHERE lista_espera_id = ?`,
        [posicion, yaInscrito.lista_espera_id]
      );
    } else {
      await conexion.execute(
        `INSERT INTO Lista_Espera (posicion, paciente_id, cita_id) VALUES (?, ?, ?)`,
        [posicion, paciente_id, cita_id]
      );
    }

    const bloque = await datosDelBloque(conexion, cita_id);
    await notificarUsuario(
      conexion,
      req.user.usuario_id,
      'LISTA_ESPERA_INSCRITO',
      `Quedaste en la lista de espera de ${describirBloque(bloque)}` +
      `${bloque?.profesional ? ` con ${bloque.profesional}` : ''}, en la posición ${posicion}. ` +
      'Si el bloque se libera te avisamos, y si eres el primero tendrás un plazo para tomarlo.'
    );

    await conexion.commit();

    return res.status(201).json({
      mensaje: `Quedaste en la lista de espera, posición ${posicion}.`,
      posicion,
      total_en_espera: Number(conteo.activos) + 1,
    });
  } catch (error) {
    await conexion.rollback();
    // Excepción 2: falla de sincronización al guardar la posición.
    console.error('[listaEspera.inscribirse]', error);
    return res.status(500).json({
      error: 'NO_SE_PUDO_INSCRIBIR',
      mensaje: 'No pudimos guardar tu lugar en la lista. Vuelve a intentarlo.',
    });
  } finally {
    conexion.release();
  }
};

/** DELETE /api/citas/:id/lista-espera — salir de la lista por decisión propia. */
exports.salir = async (req, res) => {
  try {
    const paciente_id = await pacienteDe(pool, req.user.usuario_id);
    if (!paciente_id) {
      return res.status(403).json({ error: 'SOLO_PACIENTES' });
    }

    const [resultado] = await pool.query(
      `UPDATE Lista_Espera SET estado = 'CANCELADO'
        WHERE cita_id = ? AND paciente_id = ? AND estado IN ('ESPERANDO', 'NOTIFICADO')`,
      [req.params.id, paciente_id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'NO_INSCRITO', mensaje: 'No estabas en esta lista.' });
    }

    // Si quien salió tenía el turno, el cupo pasa al siguiente de inmediato.
    await ofrecerCupoListaEspera(pool, req.params.id);

    return res.status(200).json({ mensaje: 'Saliste de la lista de espera.' });
  } catch (error) {
    console.error('[listaEspera.salir]', error);
    return res.status(500).json({ error: 'No se pudo salir de la lista.' });
  }
};

/** GET /api/citas/mis-listas-espera */
exports.misListas = async (req, res) => {
  try {
    // Oportunista: en Render gratuito el servidor se duerme y el temporizador
    // no corre, así que cada consulta aprovecha de vencer los turnos caducados.
    await revisarVencimientosListaEspera(pool);

    const paciente_id = await pacienteDe(pool, req.user.usuario_id);
    if (!paciente_id) return res.status(200).json({ listas: [] });

    const [listas] = await pool.query(
      `SELECT le.lista_espera_id, le.posicion, le.estado, le.momento_inscripcion,
              le.momento_expira,
              c.cita_id, c.fecha_hora_inicio, c.fecha_hora_fin, c.estado AS estado_cita,
              COALESCE(
                NULLIF(TRIM(CONCAT_WS(' ', u.nombres, u.apellido_paterno)), ''),
                CONCAT('Profesional #', c.profesional_id)
              ) AS profesional,
              COALESCE(e.nombre, 'General') AS especialidad,
              (SELECT COUNT(*) FROM Lista_Espera o
                WHERE o.cita_id = le.cita_id AND o.estado IN ('ESPERANDO','NOTIFICADO')) AS en_espera
         FROM Lista_Espera le
         JOIN Cita c ON c.cita_id = le.cita_id
         JOIN Profesional p ON p.profesional_id = c.profesional_id
         LEFT JOIN Usuario u ON u.usuario_id = p.usuario_id
         LEFT JOIN Especialidad e ON e.especialidad_id = p.especialidad_id
        WHERE le.paciente_id = ?
          AND le.estado IN ('ESPERANDO', 'NOTIFICADO')
        ORDER BY c.fecha_hora_inicio ASC`,
      [paciente_id]
    );

    return res.status(200).json({ listas });
  } catch (error) {
    console.error('[listaEspera.misListas]', error);
    return res.status(500).json({ error: 'No se pudieron cargar tus listas de espera.' });
  }
};

/**
 * POST /api/citas/lista-espera/:lista_espera_id/tomar
 *
 * El primero de la fila acepta el cupo dentro de su plazo: se le agenda una
 * cita nueva en ese mismo bloque y la lista se cierra para el resto.
 */
exports.tomarCupo = async (req, res) => {
  const conexion = await pool.getConnection();

  try {
    await conexion.beginTransaction();

    const paciente_id = await pacienteDe(conexion, req.user.usuario_id);
    if (!paciente_id) {
      await conexion.rollback();
      return res.status(403).json({ error: 'SOLO_PACIENTES' });
    }

    const [[turno]] = await conexion.execute(
      `SELECT le.lista_espera_id, le.estado, le.paciente_id, le.cita_id,
              (le.momento_expira <= NOW()) AS vencido
         FROM Lista_Espera le
        WHERE le.lista_espera_id = ? LIMIT 1 FOR UPDATE`,
      [req.params.lista_espera_id]
    );

    if (!turno || Number(turno.paciente_id) !== Number(paciente_id)) {
      await conexion.rollback();
      return res.status(404).json({ error: 'TURNO_NO_ENCONTRADO', mensaje: 'Esta inscripción no es tuya.' });
    }

    if (turno.estado !== 'NOTIFICADO' || Number(turno.vencido) === 1) {
      await conexion.rollback();
      return res.status(409).json({
        error: 'TURNO_NO_VIGENTE',
        mensaje:
          turno.estado === 'NOTIFICADO'
            ? 'Se venció tu plazo para tomar el cupo y pasó al siguiente de la lista.'
            : 'Todavía no es tu turno para este bloque.',
      });
    }

    const bloque = await datosDelBloque(conexion, turno.cita_id);
    if (!bloque) {
      await conexion.rollback();
      return res.status(404).json({ error: 'BLOQUE_NO_ENCONTRADO' });
    }

    // El bloque pudo ocuparse de nuevo mientras el paciente decidía.
    const [ocupadas] = await conexion.execute(
      `SELECT cita_id FROM Cita
        WHERE profesional_id = ?
          AND estado NOT LIKE 'CANCELADA%'
          AND fecha_hora_inicio < ?
          AND fecha_hora_fin > ?
        FOR UPDATE`,
      [bloque.profesional_id, bloque.fecha_hora_fin, bloque.fecha_hora_inicio]
    );
    if (ocupadas.length > 0) {
      await conexion.execute(
        `UPDATE Lista_Espera SET estado = 'VENCIDO' WHERE lista_espera_id = ?`,
        [turno.lista_espera_id]
      );
      await conexion.commit();
      return res.status(409).json({
        error: 'BLOQUE_OCUPADO',
        mensaje: 'El bloque volvió a ocuparse. Busca otro horario disponible.',
      });
    }

    const [creada] = await conexion.execute(
      `INSERT INTO Cita
         (fecha_hora_inicio, fecha_hora_fin, estado, modalidad, paciente_id, profesional_id, sede_id)
       SELECT fecha_hora_inicio, fecha_hora_fin, 'AGENDADA', modalidad, ?, profesional_id, sede_id
         FROM Cita WHERE cita_id = ?`,
      [paciente_id, turno.cita_id]
    );

    await conexion.execute(
      `UPDATE Lista_Espera SET estado = 'TOMADO' WHERE lista_espera_id = ?`,
      [turno.lista_espera_id]
    );

    // El cupo ya no existe para el resto de la fila: se cierra la lista y se
    // les avisa, en vez de dejarlos esperando un turno que no va a llegar.
    const [restantes] = await conexion.execute(
      `SELECT le.lista_espera_id, u.usuario_id
         FROM Lista_Espera le
         JOIN Paciente p ON p.paciente_id = le.paciente_id
         JOIN Usuario  u ON u.usuario_id = p.usuario_id
        WHERE le.cita_id = ? AND le.estado IN ('ESPERANDO', 'NOTIFICADO')`,
      [turno.cita_id]
    );
    for (const otro of restantes) {
      await conexion.execute(
        `UPDATE Lista_Espera SET estado = 'CERRADO' WHERE lista_espera_id = ?`,
        [otro.lista_espera_id]
      );
      await notificarUsuario(
        conexion,
        otro.usuario_id,
        'CUPO_CEDIDO',
        `El cupo de ${describirBloque(bloque)} fue tomado por otro paciente de la lista. ` +
        'Puedes buscar otro horario o inscribirte en otro bloque.'
      );
    }

    await notificarUsuario(
      conexion,
      req.user.usuario_id,
      'CAMBIO_ESTADO_CITA',
      `Tomaste el cupo de ${describirBloque(bloque)}${bloque.profesional ? ` con ${bloque.profesional}` : ''}. ` +
      'La cita quedó agendada: confírmala cuando te llegue la solicitud.',
      { datos: { pantalla: 'MisCitas', cita_id: creada.insertId } }
    );

    await conexion.execute(
      `INSERT INTO Bitacora_Auditoria
          (accion, entidad_afectada, ip_origen, datos_adicionales, usuario_id)
       VALUES ('TOMA_CUPO_LISTA_ESPERA', 'Cita', ?, ?, ?)`,
      [
        req.ip || null,
        JSON.stringify({
          cita_id: creada.insertId,
          bloque_liberado: Number(turno.cita_id),
          lista_espera_id: Number(turno.lista_espera_id),
        }),
        req.user.usuario_id,
      ]
    );

    await conexion.commit();

    return res.status(201).json({
      mensaje: 'El cupo quedó reservado a tu nombre.',
      cita_id: creada.insertId,
      estado: 'AGENDADA',
    });
  } catch (error) {
    await conexion.rollback();
    console.error('[listaEspera.tomarCupo]', error);
    return res.status(500).json({
      error: 'NO_SE_PUDO_TOMAR',
      mensaje: 'No pudimos reservar el cupo. Vuelve a intentarlo.',
    });
  } finally {
    conexion.release();
  }
};
