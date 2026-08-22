const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');
const { auditarAccesoClinico } = require('../middlewares/auditarAcceso');
const episodioController = require('../controllers/clinico/episodioController');
const fichaClinicaController = require('../controllers/clinico/fichaClinicaController');
//  CU32: Objetivos terapéuticos y avance 
const objetivoController = require('../controllers/clinico/objetivoController');
const evolucionController = require('../controllers/clinico/evolucionController');
const intervencionController = require('../controllers/clinico/intervencionController');

// CU16
const disponibilidadController = require('../controllers/disponibilidadController');

// ─────────────────────────────────────────────────────────────────────────────
// CU29 — Anamnesis / Ficha Clínica
// ─────────────────────────────────────────────────────────────────────────────
router.get('/ficha/:paciente_id',
    verifyToken, authorizeRoles(['Profesional', 'Administrador']), auditarAccesoClinico,
    fichaClinicaController.obtenerFicha
);
router.post('/ficha',
    verifyToken, authorizeRoles(['Profesional', 'Administrador']), auditarAccesoClinico,
    fichaClinicaController.guardarAnamnesis
);
router.get('/episodio/:episodio_id',
    verifyToken, authorizeRoles(['Profesional', 'Administrador']), auditarAccesoClinico,
    episodioController.obtenerEpisodio
);
router.post('/episodio',
    verifyToken, authorizeRoles(['Profesional', 'Administrador']), auditarAccesoClinico,
    episodioController.crearEpisodio
);
router.put('/episodio/:episodio_id',
    verifyToken, authorizeRoles(['Profesional', 'Administrador']), auditarAccesoClinico,
    episodioController.actualizarEpisodio
);

// ─────────────────────────────────────────────────────────────────────────────
// CU32 — Objetivos terapéuticos y avance
// ─────────────────────────────────────────────────────────────────────────────
router.get('/episodio/:episodio_id/objetivos',
    verifyToken, authorizeRoles(['Profesional', 'Administrador']), auditarAccesoClinico,
    objetivoController.obtenerObjetivos
);
router.post('/episodio/:episodio_id/objetivos',
    verifyToken, authorizeRoles(['Profesional', 'Administrador']), auditarAccesoClinico,
    objetivoController.crearObjetivo
);

// El avance: el controlador ya audita internamente (valor anterior/nuevo),
// por eso no se le añade auditarAccesoClinico (evita auditoría duplicada).
router.put('/episodio/:episodio_id/avance',
    verifyToken, authorizeRoles(['Profesional', 'Administrador']),
    evolucionController.actualizarAvance
);

// ─────────────────────────────────────────────────────────────────────────────
// CU36, CU32 — Inalterabilidad de la Ficha Clínica
// ─────────────────────────────────────────────────────────────────────────────

router.post('/episodio/:episodio_id/evolucion',
    verifyToken, authorizeRoles(['Profesional']),
    evolucionController.crearEvolucionEnBlanco
);

// CU40 - Documentar intervención y respuesta fisiológica
router.get('/intervenciones/sesiones',
    verifyToken, authorizeRoles(['Profesional']),
    intervencionController.listarSesiones
);
router.get('/intervenciones/:episodio_id',
    verifyToken, authorizeRoles(['Profesional']),
    intervencionController.obtenerIntervencion
);
router.put('/intervenciones/:episodio_id',
    verifyToken, authorizeRoles(['Profesional']),
    intervencionController.guardarIntervencion
);

// CU16
router.post('/disponibilidad/restringir', 
    verifyToken, authorizeRoles(['Profesional', 'Administrador']), 
    disponibilidadController.restringirDisponibilidad
);

module.exports = router;
