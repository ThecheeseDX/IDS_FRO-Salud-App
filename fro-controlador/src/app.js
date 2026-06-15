const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const profesionalRoutes = require('./routes/profesionalRoutes');
const clinicaRoutes = require('./routes/clinicaRoutes');
const citaRoutes = require('./routes/citaRoutes');
const inalterabilidadRoutes = require('./routes/InalterabilidadRoutes');
const parametroRoutes = require('./routes/parametroRoutes');
// ⚠️ CU68 DEMO (deuda técnica — retirar antes de producción)
const integracionDemoRoutes = require('./routes/integracionDemoRoutes');

const app = express();

app.use(cors());
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
// ⚠️ CU68 DEMO (deuda técnica — retirar antes de producción)
app.use('/api/integracion-demo', integracionDemoRoutes);

module.exports = app;