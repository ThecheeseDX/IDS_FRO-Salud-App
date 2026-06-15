const express = require('express');
const router = express.Router();
const integracionDemoController = require('../controllers/integracionDemoController');

// ⚠️ CU68 - Ruta de REFERENCIA / DEMO  ·  DEUDA TÉCNICA (SE DEBE RETIRAR/PROTEGER).
// Solo para generar evidencia del funcionamiento de la capa adaptadora.
// Sin auth a propósito, para facilitar las pruebas; ver advertencia en el controlador.
router.post('/ejecutar', integracionDemoController.ejecutar);

module.exports = router;