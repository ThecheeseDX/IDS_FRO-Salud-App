const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');
const citaController = require('../controllers/CitaController');

// CU14
router.get('/especialidades', verifyToken, authorizeRoles(['Paciente']), citaController.obtenerEspecialidades);
router.get('/disponibilidad', verifyToken, authorizeRoles(['Paciente']), citaController.buscarDisponibilidad);
router.post('/validar-bloque', verifyToken, authorizeRoles(['Paciente']), citaController.validarBloque);

// CU15
router.get('/profesionales', verifyToken, authorizeRoles(['Paciente']), citaController.obtenerProfesionales);
router.get('/disponibilidad/:profesional_id', verifyToken, authorizeRoles(['Paciente']), citaController.obtenerDisponibilidad);
router.post('/bloquear', verifyToken, authorizeRoles(['Paciente']), citaController.bloquearHorario);

module.exports = router;