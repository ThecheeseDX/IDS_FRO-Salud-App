const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const profesionalRoutes = require('./routes/profesionalRoutes');
const clinicaRoutes = require('./routes/clinicaRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Servidor operativo' });
});

app.use('/api/auth', authRoutes);
app.use('/api/profesionales', profesionalRoutes);
app.use('/api/clinica', clinicaRoutes);

module.exports = app;