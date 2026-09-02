const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const profesionalRoutes = require('./routes/profesionalRoutes');
const clinicaRoutes = require('./routes/clinicaRoutes');
const citaRoutes = require('./routes/citaRoutes');
const inalterabilidadRoutes = require('./routes/inalterabilidadRoutes');
const parametroRoutes = require('./routes/parametroRoutes');

const integracionDemoRoutes = require('./routes/integracionDemoRoutes');
const pagoRoutes = require('./routes/pagoRoutes');
const pagoController = require('./controllers/pagoController');

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

/**
 * Diagnóstico de configuración. Dice qué integraciones quedaron bien cargadas
 * en el servidor SIN revelar ningún secreto: solo si cada variable existe y,
 * cuando ayuda a detectar un error de pegado, su largo.
 *
 * Sirve para no adivinar cuando algo "no conecta": basta abrir
 *   https://<tu-servidor>/api/diagnostico
 * en el navegador y mirar qué aparece en false.
 */
app.get('/api/diagnostico', (req, res) => {
    const definida = (clave) => Boolean(process.env[clave]);

    res.status(200).json({
        zona_horaria: process.env.TZ || '(no definida)',
        hora_servidor: new Date().toLocaleString('es-CL'),
        base_de_datos: {
            // Una u otra forma de configuración basta.
            configurada: definida('DATABASE_URL') || definida('DB_HOST'),
        },
        correo: {
            // Con Brevo el correo sale por HTTPS; SMTP directo no funciona en
            // el plan gratuito de Render (bloquea los puertos 25, 465 y 587).
            brevo_configurado: definida('BREVO_API_KEY'),
            remitente_definido: definida('BREVO_SENDER') || definida('SMTP_USER'),
            smtp_configurado: definida('SMTP_USER') && definida('SMTP_PASS'),
            via_efectiva: definida('BREVO_API_KEY') ? 'Brevo (HTTPS)' : 'SMTP directo',
        },
        repositorio_multimedia: {
            // Los tres nombres deben ser EXACTOS, con el prefijo CLOUDINARY_.
            CLOUDINARY_CLOUD_NAME: definida('CLOUDINARY_CLOUD_NAME'),
            CLOUDINARY_API_KEY: definida('CLOUDINARY_API_KEY'),
            CLOUDINARY_API_SECRET: definida('CLOUDINARY_API_SECRET'),
            operativo:
                definida('CLOUDINARY_CLOUD_NAME') &&
                definida('CLOUDINARY_API_KEY') &&
                definida('CLOUDINARY_API_SECRET'),
        },
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/profesionales', profesionalRoutes);
app.use('/api/clinica', clinicaRoutes);
app.use('/api/citas', citaRoutes);
app.use('/api/inalterabilidad', inalterabilidadRoutes);
app.use('/api/parametros', parametroRoutes);

app.use('/api/integracion-demo', integracionDemoRoutes);
app.use('/api/pagos', pagoRoutes);

// Simulador del financiador externo (CU66/CU69). Sin autenticación de la app:
// representa al proveedor foráneo; exige su propia credencial X-Api-Key.
app.post('/api/financiador-simulado/validar-bono', express.json(), pagoController.financiadorSimulado);

module.exports = app;