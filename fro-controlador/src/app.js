const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const profesionalRoutes = require('./routes/profesionalRoutes');
const clinicaRoutes = require('./routes/clinicaRoutes');
const citaRoutes = require('./routes/citaRoutes');
const inalterabilidadRoutes = require('./routes/inalterabilidadRoutes');
const parametroRoutes = require('./routes/parametroRoutes');

const integracionDemoRoutes = require('./routes/integracionDemoRoutes');

const app = express();

// En la nube conviene limitar quién puede llamar a la API. Si no se define
// CORS_ORIGIN se permite cualquier origen, que es lo cómodo en desarrollo.
// Se aceptan varios orígenes separados por coma.
const origenesPermitidos = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((origen) => origen.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: origenesPermitidos.includes('*') ? true : origenesPermitidos,
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Servidor operativo'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/profesionales', profesionalRoutes);
app.use('/api/clinica', clinicaRoutes);
app.use('/api/citas', citaRoutes);
app.use('/api/inalterabilidad', inalterabilidadRoutes);
app.use('/api/parametros', parametroRoutes);

app.use('/api/integracion-demo', integracionDemoRoutes);

module.exports = app;