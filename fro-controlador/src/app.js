const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares globales obligatorios
app.use(cors()); // Permite que la aplicación móvil hable con el controlador
app.use(express.json()); // Habilita la lectura de payloads en formato JSON

// Ruta de diagnóstico inicial (Prueba de disponibilidad)
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Servidor operativo' });
});

module.exports = app;