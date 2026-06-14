const express = require('express');
const router = express.Router();

const profesionalController = require('../controllers/profesionalController');

router.get(
  '/usuario/:usuarioId/pacientes',
  profesionalController.listarPacientesPorUsuarioProfesional
);

router.get(
  '/:profesionalId/pacientes',
  profesionalController.listarPacientesAsignados
);

router.get(
  '/pacientes/:pacienteId/historial',
  profesionalController.obtenerHistorialPaciente
);

module.exports = router;