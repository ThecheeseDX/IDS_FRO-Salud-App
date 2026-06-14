const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const comunaController = require('../controllers/comunaController');

const { verifyToken } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');

// ── Rutas existentes (Públicas) ──────────────────────────────────────────────
router.post('/registrar', authController.registrarPaciente);
router.post('/verificar-unicidad', authController.verificarUnicidad);
router.post('/registrar-profesional', authController.registrarProfesional);

router.get('/comunas', comunaController.obtenerComunas);
router.get('/especialidades', authController.obtenerEspecialidades);
router.get('/validar-profesional/:rut', authController.validarProfesional);

// ── CU05: Login ──────────────────────────────────────────────────────────────
router.post('/login', authController.login);

// ── CU04: Verificación OTP ───────────────────────────────────────────────────
router.post('/otp/solicitar', authController.solicitarOTP);
router.post('/otp/verificar', authController.verificarOTP);

router.get('/mi-perfil', verifyToken, (req, res) => {
    res.status(200).json({ 
        mensaje: `¡Acceso concedido! Hola, el sistema reconoce que tienes el rol de: ${req.user.nombre_rol}` 
    });
});

router.get('/panel-control-sensible', verifyToken, authorizeRoles(['Administrador', 'Supervisor']), (req, res) => {
    res.status(200).json({ 
        mensaje: '🔓 Acceso Autorizado a información confidencial del sistema.' 
    });
});

module.exports = router;

