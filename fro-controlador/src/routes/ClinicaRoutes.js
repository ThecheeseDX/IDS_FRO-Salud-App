const express = require('express');
const router = express.Router();

// Usamos el authMiddleware de tu compañero (verifyToken) en vez de verificarJWT
const { verifyToken } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');
const { auditarAccesoClinico } = require('../middlewares/auditarAcceso');
const episodioController = require('../controllers/episodioController');

// ─────────────────────────────────────────────────────────────────────────────
// Cadena de middlewares para rutas clínicas (CU13):
//
//   verifyToken          → valida JWT y pone usuario en req.user
//       ↓
//   authorizeRoles       → verifica que sea Profesional o Administrador
//       ↓
//   auditarAccesoClinico → registra en Bitacora_Auditoria
//       ↓
//   controlador          → procesa la acción clínica
//
// ─────────────────────────────────────────────────────────────────────────────

router.get('/episodio/:episodio_id',
    verifyToken,
    authorizeRoles(['Profesional', 'Administrador']),
    auditarAccesoClinico,
    episodioController.obtenerEpisodio
);

router.post('/episodio',
    verifyToken,
    authorizeRoles(['Profesional', 'Administrador']),
    auditarAccesoClinico,
    episodioController.crearEpisodio
);

router.put('/episodio/:episodio_id',
    verifyToken,
    authorizeRoles(['Profesional', 'Administrador']),
    auditarAccesoClinico,
    episodioController.actualizarEpisodio
);

module.exports = router;