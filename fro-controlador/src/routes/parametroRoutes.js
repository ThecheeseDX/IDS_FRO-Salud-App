const express = require('express');
const router = express.Router();

// Importe del controlador
const parametroController = require('../controllers/parametroController');

// Importamos a los "guardias" (Middlewares)
const { verifyToken } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');


// BLINDAJE RBAC (Manejo automático de la Excepción 1)

// GET / -> Lectura del panel (Solo Administradores)
router.get('/', verifyToken, authorizeRoles(['Administrador']), parametroController.obtenerParametros);

// PUT /update -> Mutación arancelaria (Solo Administradores)
router.put('/update', verifyToken, authorizeRoles(['Administrador']), parametroController.actualizarParametro);

module.exports = router;