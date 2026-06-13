const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const comunaController = require('../controllers/comunaController');

// POST
router.post('/registrar', authController.registrarPaciente);
router.post('/verificar-unicidad', authController.verificarUnicidad);
router.post('/login', authController.login);

// GET
router.get('/comunas', comunaController.obtenerComunas);
router.get('/especialidades', authController.obtenerEspecialidades);
router.get('/validar-profesional/:rut', authController.validarProfesional);
router.post('/registrar-profesional', authController.registrarProfesional);


module.exports = router;