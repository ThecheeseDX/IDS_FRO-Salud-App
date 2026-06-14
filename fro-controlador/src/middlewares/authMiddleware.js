const jwt = require('jsonwebtoken');

// =========================================================
// GUARDIA 1: VERIFICADOR DE TOKEN (Identidad)
// =========================================================
const verifyToken = (req, res, next) => {
    // El frontend envía el token en la cabecera 'Authorization' con el formato "Bearer <token>"
    const bearerHeader = req.headers['authorization'];
    
    if (!bearerHeader) {
        return res.status(401).json({ error: 'Acceso denegado. Se requiere un Token de Acceso activo.' });
    }

    const token = bearerHeader.split(' ')[1];

    try {
        // Intentamos desencriptar el pase usando nuestro secreto
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Si es exitoso, adjuntamos los datos del usuario a la petición para el siguiente guardia
        req.usuario = decoded; 
        next(); // El token es real y vigente. ¡Pasa al siguiente nivel!

    } catch (error) {
        // EXCEPCIÓN 1: El token caducó (pasaron las 8 horas) o fue manipulado
        const isExpired = error.name === 'TokenExpiredError';
        return res.status(401).json({ 
            error: isExpired 
                ? 'Su sesión ha expirado. Por favor, ingrese sus credenciales nuevamente.' 
                : 'Token de Acceso inválido.',
            expired: isExpired
        });
    }
};

// =========================================================
// GUARDIA 2: VERIFICADOR DE ROLES RBAC (Permisos)
// =========================================================
// Esta es una función "fábrica" que recibe qué roles pueden entrar a una puerta específica
const checkRole = (rolesPermitidos) => {
    return (req, res, next) => {
        // EXCEPCIÓN 2: Inconsistencia estructural (El pase no tiene un rol válido)
        if (!req.usuario || !req.usuario.nombre_rol) {
            return res.status(500).json({ 
                error: 'Error de configuración de perfil. No se pudo validar su nivel de acceso.' 
            });
        }

        // EXCEPCIÓN 4: Validación contra las políticas de autorización
        // Verificamos si el rol del usuario está dentro del arreglo de roles permitidos
        if (rolesPermitidos.includes(req.usuario.nombre_rol)) {
            next(); // Tiene los permisos necesarios. Visualización permitida.
        } else {
            // El rol no coincide. Se bloquea el acceso de forma definitiva.
            // Opcional a futuro: Aquí podrías llamar a una función para escribir en la bitácora de auditoría.
            return res.status(403).json({ 
                error: 'Acceso restringido. Su rol actual no cuenta con los privilegios necesarios para acceder a este módulo.' 
            });
        }
    };
};

module.exports = {
    verifyToken,
    checkRole
};