const express = require('express');
const cors = require('cors');

const app = express();

const authRoutes = require('./routes/authRoutes');
const clinicaRoutes = require('./routes/clinicaRoutes'); 
const citaRoutes = require('./routes/citaRoutes');


app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Servidor operativo' });
});

app.use('/api/citas', citaRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/clinica', clinicaRoutes); 

module.exports = app;