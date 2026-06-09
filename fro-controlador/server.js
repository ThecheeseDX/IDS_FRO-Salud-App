const app = require('./src/app');
const dotenv = require('dotenv');

// Cargar variables de entorno al inicio
dotenv.config();

// Requerir la configuración de la base de datos para forzar la validación de conexión al arrancar
require('./src/config/database');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});