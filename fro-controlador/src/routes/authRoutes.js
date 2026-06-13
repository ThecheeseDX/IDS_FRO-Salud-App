const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const comunaController = require('../controllers/comunaController');

// ── Rutas existentes (sin cambios) ───────────────────────────────────────────
router.post('/registrar', authController.registrarPaciente);
router.post('/verificar-unicidad', authController.verificarUnicidad);
router.post('/registrar-profesional', authController.registrarProfesional);

router.get('/comunas', comunaController.obtenerComunas);
router.get('/especialidades', authController.obtenerEspecialidades);
router.get('/validar-profesional/:rut', authController.validarProfesional);

// ── CU04: Verificación de identidad mediante OTP ─────────────────────────────
router.post('/otp/solicitar', authController.solicitarOTP);
router.post('/otp/verificar', authController.verificarOTP);

module.exports = router;