const pool = require('../config/database');

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE CU13: interceptar_y_auditar_acceso()
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Entidades clínicas que este middleware sabe auditar.
 *
 * IMPORTANTE: si agregas una ruta nueva con auditarAccesoClinico, REGISTRA su
 * entidad acá. El middleware bloquea preventivamente todo lo que no reconoce
 * (Excepción 1 del CU13), así que olvidarlo deja la pantalla con un 403 y un
 * mensaje genérico de "servicio no disponible". Le pasó justamente a
 * /pautas/paciente/:id, que quedó inaccesible para el profesional.
 *
 * El orden importa: se evalúa de arriba abajo y gana la primera coincidencia.
 */
const ENTIDADES_AUDITABLES = [
    { fragmento: '/ficha',     sufijo: 'FICHA_CLINICA' },
    { fragmento: '/episodio',  sufijo: 'EPISODIO_CLINICO' },
    { fragmento: '/evolucion', sufijo: 'EVOLUCION_CLINICA' },
    { fragmento: '/pautas',    sufijo: 'PAUTA_EJERCICIO' },
];

const VERBOS = {
    GET: 'LECTURA',
    POST: 'CREACION',
    PUT: 'MODIFICACION',
    DELETE: 'ELIMINACION',
};

function detectarAccion(req) {
    const verbo = VERBOS[req.method];
    if (!verbo) return null;

    const entidad = ENTIDADES_AUDITABLES.find((e) => req.path.includes(e.fragmento));
    if (!entidad) return null; // Excepción 1

    return `${verbo}_${entidad.sufijo}`;
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
        console.warn(
            `[auditoria] Ruta sin entidad registrada: ${req.method} ${req.path}. ` +
            'Se bloquea el acceso. Registra su entidad en ENTIDADES_AUDITABLES.'
        );
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