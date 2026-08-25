const dotenv = require('dotenv');

// Cargar variables de entorno antes que cualquier módulo que las use
dotenv.config();

const app = require('./src/app');

// Requerir la configuración de la base de datos para forzar la validación de conexión al arrancar
const pool = require('./src/config/database');
const { ejecutarMigraciones } = require('./scripts/migrar-db');

const PORT = process.env.PORT || 3000;
// En la nube el servicio corre dentro de un contenedor: hay que escuchar en
// todas las interfaces, no solo en localhost, para que el proveedor lo alcance.
const HOST = process.env.HOST || '0.0.0.0';

async function iniciar() {
  // Las migraciones pendientes se aplican solas en cada arranque (son
  // idempotentes): así ningún despliegue queda con la base desactualizada.
  try {
    await ejecutarMigraciones(pool);
  } catch (error) {
    console.error(`⚠️  No se pudieron aplicar las migraciones: ${error.message}`);
    console.error('   El servidor arranca igual, pero revisa la base de datos.');
  }

  app.listen(PORT, HOST, () => {
    console.log(`🚀 Servidor backend escuchando en ${HOST}:${PORT}`);
  });
}

iniciar();
