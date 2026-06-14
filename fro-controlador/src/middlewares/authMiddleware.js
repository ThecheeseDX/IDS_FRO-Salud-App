const jwt = require('jsonwebtoken');


const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                error: 'Acceso denegado. Se requiere un Token de Acceso válido.' 
            });
        }

        const token = authHeader.split(' ')[1];
        
        // Desencriptamos el token
        const payload = jwt.verify(token, process.env.JWT_SECRET);

       
        req.user = payload;

        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'La sesión ha expirado. Por favor, inicie sesión nuevamente.' 
            });
        }
        return res.status(401).json({ 
            error: 'Token de seguridad inválido o corrupto.' 
        });
    }
};

module.exports = {
    verifyToken
};