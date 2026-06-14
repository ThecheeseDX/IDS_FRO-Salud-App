const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');
const citaController = require('../controllers/citaController');

// ── Rutas de agendamiento (CU15) ──────────────────────────────────────────────

// Obtener lista de profesionales disponibles
router.get('/profesionales',
    verifyToken,
    authorizeRoles(['Paciente']),
    citaController.obtenerProfesionales
);

// Obtener disponibilidad horaria de un profesional
router.get('/disponibilidad/:profesional_id',
    verifyToken,
    authorizeRoles(['Paciente']),
    citaController.obtenerDisponibilidad
);

// CU15: Bloqueo síncronico del horario seleccionado
router.post('/bloquear',
    verifyToken,
    authorizeRoles(['Paciente']),
    citaController.bloquearHorario
);

module.exports = router;