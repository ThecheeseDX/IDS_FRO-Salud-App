const express = require('express');
const router = express.Router();

const profesionalController = require('../controllers/profesionalController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');

// Estas rutas exponen datos clínicos: exigen sesión y rol. Antes estaban
// abiertas y la identidad del profesional viajaba en la URL, así que bastaba
// cambiar el número para leer la ficha de otro paciente.
router.get(
  '/usuario/:usuarioId/pacientes',
  verifyToken, authorizeRoles(['Profesional', 'Administrador']),
  profesionalController.listarPacientesPorUsuarioProfesional
);

router.get(
  '/:profesionalId/pacientes',
  verifyToken, authorizeRoles(['Profesional', 'Administrador']),
  profesionalController.listarPacientesAsignados
);

router.get(
  '/pacientes/:pacienteId/historial',
  verifyToken, authorizeRoles(['Profesional', 'Administrador']),
  profesionalController.obtenerHistorialPaciente
);

module.exports = router;