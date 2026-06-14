const fs = require('fs');
const path = require('path');

/**
 * Middleware de Autorización RBAC (Control de Acceso Basado en Roles)
 * @param {Array<string>} allowedRoles - Lista de roles permitidos (ej: ['Administrador', 'Profesional'])
 */
const authorizeRoles = (allowedRoles) => {
    return (req, res, next) => {
        try {
            const userRole = req.user?.nombre_rol;
            const userId = req.user?.usuario_id;

            // EXCEPCIÓN 2: Inconsistencia Estructural
            if (!userRole || typeof userRole !== 'string') {
                return res.status(500).json({
                    error: 'Error de configuración de perfil. Inconsistencia estructural detectada. Contacte al administrador del sistema.'
                });
            }

            // EXCEPCIÓN 4: Privilegios insuficientes
            if (!allowedRoles.includes(userRole)) {
                // 1. Preparamos el mensaje de la bitácora
                const timestamp = new Date().toISOString();
                const logMessage = `[${timestamp}] ⚠️ BLOQUEO DE ACCESO | Usuario ID: ${userId} | Rol: ${userRole} | Intentó acceder a: ${req.originalUrl}\n`;
                
                const logPath = path.join(__dirname, '../../logs/security_audit.log');
                const logsDir = path.dirname(logPath);

                if (!fs.existsSync(logsDir)) {
                    fs.mkdirSync(logsDir, { recursive: true });
                }

                fs.appendFileSync(logPath, logMessage, 'utf8');

                return res.status(403).json({
                    error: 'Acceso restringido. Su rol no cuenta con los privilegios necesarios para visualizar o modificar este recurso.'
                });
            }

            // FLUJO NORMAL
            next();

        } catch (error) {
            console.error("❌ Error en el motor de políticas (RBAC):", error);
            // EXCEPCIÓN 3: Falla en el servicio de autorización
            res.status(500).json({ 
                error: 'El servicio de validación de políticas no está disponible momentáneamente. Intente recargar.' 
            });
        }
    };
};

module.exports = {
    authorizeRoles
};