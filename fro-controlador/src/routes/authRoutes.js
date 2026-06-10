const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST registrar_paciente()
router.post('/registrar', authController.registrarPaciente);

module.exports = router;