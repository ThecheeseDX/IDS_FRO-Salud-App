const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');
const { auditarAccesoClinico } = require('../middlewares/auditarAcceso');
const episodioController = require('../controllers/episodioController');
const fichaClinicaController = require('../controllers/fichaClinicaController');

// ... rutas de episodio existentes ...

// ─────────────────────────────────────────────────────────────────────────────
// CU29 — Anamnesis / Ficha Clínica
// ─────────────────────────────────────────────────────────────────────────────

router.get('/ficha/:paciente_id',
    verifyToken,
    authorizeRoles(['Profesional', 'Administrador']),
    auditarAccesoClinico,
    fichaClinicaController.obtenerFicha
);

router.post('/ficha',
    verifyToken,
    authorizeRoles(['Profesional', 'Administrador']),
    auditarAccesoClinico,
    fichaClinicaController.guardarAnamnesis
);

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