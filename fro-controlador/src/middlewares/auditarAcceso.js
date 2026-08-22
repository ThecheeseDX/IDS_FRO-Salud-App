const pool = require('../config/database');

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE CU13: interceptar_y_auditar_acceso()
// ─────────────────────────────────────────────────────────────────────────────

function detectarAccion(req) {
    const metodo = req.method;
    const ruta = req.path;

    if (metodo === 'GET' && ruta.includes('/ficha')) return 'LECTURA_FICHA_CLINICA';
    if (metodo === 'POST' && ruta.includes('/ficha')) return 'CREACION_FICHA_CLINICA';
    if (metodo === 'PUT' && ruta.includes('/ficha')) return 'MODIFICACION_FICHA_CLINICA';
    if (metodo === 'GET' && ruta.includes('/episodio')) return 'LECTURA_EPISODIO_CLINICO';
    if (metodo === 'POST' && ruta.includes('/episodio')) return 'CREACION_EPISODIO_CLINICO';
    if (metodo === 'PUT' && ruta.includes('/episodio')) return 'MODIFICACION_EPISODIO_CLINICO';
    if (metodo === 'GET' && ruta.includes('/evolucion')) return 'LECTURA_EVOLUCION_CLINICA';
    if (metodo === 'POST' && ruta.includes('/evolucion')) return 'CREACION_EVOLUCION_CLINICA';
    if (metodo === 'PUT' && ruta.includes('/evolucion')) return 'MODIFICACION_EVOLUCION_CLINICA';

    return null; // Excepción 1
}

function obtenerIP(req) {
    return (
        req.headers['x-forwarded-for']?.split(',')[0] ||
        req.socket?.remoteAddress ||
        'IP_DESCONOCIDA'
    );
}

async function auditarAccesoClinico(req, res, next) {
    const usuario_id = req.user?.usuario_id || null;
    const ip_origen = obtenerIP(req);
    const accion = detectarAccion(req);

    // Excepción 1: acción no reconocida
    if (!accion) {
        return res.status(403).json({
            error: 'ACCION_NO_RECONOCIDA',
            mensaje: 'La operación solicitada no es reconocida por el sistema de auditoría. Acceso bloqueado preventivamente.'
        });
    }

    // Excepción 3: metadatos no disponibles
    if (!usuario_id) {
        return res.status(401).json({
            error: 'METADATOS_INSUFICIENTES',
            mensaje: 'No se pudo identificar al usuario en la sesión activa. Inicie sesión nuevamente.'
        });
    }

    // Excepción 2: falla al clasificar el evento
    let entidad_afectada;
    try {
        if (accion.includes('FICHA')) entidad_afectada = 'Ficha_Clinica';
        else if (accion.includes('EPISODIO')) entidad_afectada = 'Episodio_Clinico';
        else if (accion.includes('EVOLUCION')) entidad_afectada = 'Evolucion_Clinica';
        else throw new Error('Entidad no clasificable');
    } catch (errorClasificacion) {
        console.error('[CU13] Error clasificando evento:', errorClasificacion);
        return res.status(500).json({
            error: 'ERROR_CLASIFICACION_EVENTO',
            mensaje: 'El sistema no pudo clasificar el tipo de evento. Recarga el módulo e intenta nuevamente.'
        });
    }

    // Excepción 4: falla de escritura en bitácora
    try {
        await pool.query(
            `INSERT INTO Bitacora_Auditoria 
                (accion, entidad_afectada, ip_origen, usuario_id, datos_adicionales)
             VALUES (?, ?, ?, ?, ?)`,
            [
                accion,
                entidad_afectada,
                ip_origen,
                usuario_id,
                JSON.stringify({
                    metodo: req.method,
                    ruta: req.originalUrl,
                    timestamp: new Date().toISOString()
                })
            ]
        );
    } catch (errorBitacora) {
        console.error('[CU13] Fallo crítico al escribir en bitácora:', errorBitacora);
        return res.status(507).json({
            error: 'FALLO_BITACORA',
            mensaje: 'No es posible auditar esta operación. La acción clínica ha sido detenida. Contacte al administrador del sistema.'
        });
    }

    next();
}

module.exports = { auditarAccesoClinico };