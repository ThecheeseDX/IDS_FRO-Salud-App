const express = require('express');
const router  = express.Router();

const { verifyToken }    = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');
const citaController     = require('../controllers/citaController');
const marcasTemporalesController = require('../controllers/marcasTemporalesController');

// CU38 - Marcas temporales de la prestacion
router.get('/marcas-temporales',
  verifyToken, authorizeRoles(['Profesional']),
  marcasTemporalesController.listarCitasProfesional);

router.post('/marcas-temporales/:cita_id/iniciar',
  verifyToken, authorizeRoles(['Profesional']),
  marcasTemporalesController.iniciarAtencion);

router.post('/marcas-temporales/:cita_id/finalizar',
  verifyToken, authorizeRoles(['Profesional']),
  marcasTemporalesController.finalizarAtencion);

// ─ CU14 — Buscar disponibilidad 
router.get('/especialidades',
  verifyToken, authorizeRoles(['Paciente']),
  citaController.obtenerEspecialidades);

router.get('/disponibilidad',
  verifyToken, authorizeRoles(['Paciente']),
  citaController.buscarDisponibilidad);

router.post('/validar-bloque',
  verifyToken, authorizeRoles(['Paciente']),
  citaController.validarBloque);

// ─ CU15 — Bloquear horario 
router.get('/profesionales',
  verifyToken, authorizeRoles(['Paciente']),
  citaController.obtenerProfesionales);

router.get('/disponibilidad/:profesional_id',
  verifyToken, authorizeRoles(['Paciente']),
  citaController.obtenerDisponibilidad);

router.post('/bloquear',
  verifyToken, authorizeRoles(['Paciente']),
  citaController.bloquearHorario);

// ── CU20 — Listado de citas por rol
router.get('/mis-citas',
  verifyToken, authorizeRoles(['Paciente']),
  citaController.obtenerCitasPaciente);

router.get('/mis-citas-profesional',
  verifyToken, authorizeRoles(['Profesional']),
  citaController.obtenerCitasProfesional);

// ── CU20 — Máquina de estados de cita
// Roles permitidos: Paciente puede cancelar; Profesional gestiona el flujo clínico; Admin tiene acceso total
router.post('/:id/transicionar',
  verifyToken, authorizeRoles(['Paciente', 'Profesional', 'Administrador']),
  citaController.transicionarEstadoCita);

// Re-sincronizar estado tras latencia de red (Excepción 3 del CU20)
router.get('/:id/estado',
  verifyToken, authorizeRoles(['Paciente', 'Profesional', 'Administrador']),
  citaController.obtenerEstadoCita);

module.exports = router;
