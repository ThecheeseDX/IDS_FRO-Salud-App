/**
 * Foto de perfil del paciente (opcional).
 *
 * Mientras no suba una, la app muestra sus iniciales. Se guarda en Cloudinary
 * con la misma receta que la foto del profesional (CU10): un archivo por
 * persona que se sobreescribe, recortado a cuadrado centrado en la cara.
 */

const pool = require('../config/database');
const { cloudinary, cloudinaryConfigurado, subirBuffer } = require('../config/cloudinary');

const EXTENSIONES_FOTO = ['jpg', 'jpeg', 'png', 'webp', 'heic'];
const MAX_FOTO_BYTES = 5 * 1024 * 1024;

async function auditar(req, accion) {
  pool.query(
    `INSERT INTO Bitacora_Auditoria (accion, entidad_afectada, ip_origen, datos_adicionales, usuario_id)
     VALUES (?, 'Paciente', ?, NULL, ?)`,
    [accion, req.ip || null, req.user.usuario_id]
  ).catch(() => {});
}

// GET /api/auth/mi-foto — nombre y foto (o null) para el encabezado de "Mi perfil".
exports.obtener = async (req, res) => {
  try {
    const [[fila]] = await pool.query(
      `SELECT p.foto_url, u.nombres, u.apellido_paterno, u.apellido_materno
         FROM Paciente p JOIN Usuario u ON u.usuario_id = p.usuario_id
        WHERE p.usuario_id = ? LIMIT 1`,
      [req.user.usuario_id]
    );
    if (!fila) return res.status(404).json({ error: 'PACIENTE_NO_ENCONTRADO' });
    return res.json({
      foto_url: fila.foto_url || null,
      nombre: [fila.nombres, fila.apellido_paterno, fila.apellido_materno].filter(Boolean).join(' '),
    });
  } catch (error) {
    console.error('[perfilPaciente.obtener]', error);
    return res.status(500).json({ error: 'No se pudo cargar tu perfil.' });
  }
};

// POST /api/auth/mi-foto  (multipart: foto)
exports.subir = async (req, res) => {
  if (!cloudinaryConfigurado()) {
    return res.status(503).json({ error: 'REPOSITORIO_NO_CONFIGURADO', mensaje: 'El repositorio de imágenes no está configurado en el servidor.' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'ARCHIVO_FALTANTE', mensaje: 'No se recibió ninguna imagen.' });
  }
  const extension = (req.file.originalname?.split('.').pop() || '').toLowerCase();
  if (!EXTENSIONES_FOTO.includes(extension)) {
    return res.status(400).json({ error: 'FORMATO_NO_PERMITIDO', mensaje: `La fotografía debe ser JPG, PNG, WEBP o HEIC (recibido: .${extension || '?'}).` });
  }
  if (req.file.size > MAX_FOTO_BYTES) {
    return res.status(413).json({ error: 'FOTO_MUY_PESADA', mensaje: `La fotografía pesa ${(req.file.size / 1024 / 1024).toFixed(1)} MB; el máximo es 5 MB.` });
  }
  try {
    const subida = await subirBuffer(req.file.buffer, {
      folder: 'fro-salud/perfiles',
      public_id: `paciente-${req.user.usuario_id}`,
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
      transformation: [{ width: 600, height: 600, crop: 'fill', gravity: 'face' }],
    });
    const [resultado] = await pool.query(`UPDATE Paciente SET foto_url = ? WHERE usuario_id = ?`, [subida.secure_url, req.user.usuario_id]);
    if (resultado.affectedRows === 0) return res.status(404).json({ error: 'PACIENTE_NO_ENCONTRADO' });
    auditar(req, 'ACTUALIZACION_FOTO_PACIENTE');
    return res.json({ mensaje: 'Fotografía actualizada.', foto_url: subida.secure_url });
  } catch (error) {
    console.error('[perfilPaciente.subir]', error);
    return res.status(502).json({ error: 'CARGA_INTERRUMPIDA', mensaje: 'No se pudo subir la fotografía. Intenta nuevamente.' });
  }
};

// DELETE /api/auth/mi-foto — vuelve a las iniciales.
exports.quitar = async (req, res) => {
  try {
    await pool.query(`UPDATE Paciente SET foto_url = NULL WHERE usuario_id = ?`, [req.user.usuario_id]);
    if (cloudinaryConfigurado()) {
      cloudinary.uploader.destroy(`fro-salud/perfiles/paciente-${req.user.usuario_id}`, { invalidate: true }).catch(() => {});
    }
    auditar(req, 'ELIMINACION_FOTO_PACIENTE');
    return res.json({ mensaje: 'Fotografía eliminada. Se mostrarán tus iniciales.', foto_url: null });
  } catch (error) {
    console.error('[perfilPaciente.quitar]', error);
    return res.status(500).json({ error: 'No se pudo quitar la fotografía. Intenta nuevamente.' });
  }
};
