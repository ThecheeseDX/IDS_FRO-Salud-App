const mysql = require('mysql2/promise');

const { opcionesSSL, urlConexion, datosSueltos } = require('./dbOptions');

// En la nube el proveedor suele entregar una sola cadena de conexión
// (mysql://usuario:clave@host:puerto/base). Si existe, tiene prioridad;
// si no, se arman los datos por variables sueltas como en local.
const url = urlConexion();

const opcionesComunes = {
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_LIMIT || 10),
  queueLimit: 0,
  // Evita que una conexión ociosa quede colgada si el proveedor la corta.
  enableKeepAlive: true,
  ...opcionesSSL(),
};

const pool = url
  ? mysql.createPool({ uri: url, ...opcionesComunes })
  : mysql.createPool({ ...datosSueltos(), ...opcionesComunes });

// Valida la conexión al arrancar. En la nube la base de datos puede tardar unos
// segundos en aceptar conexiones, así que se reintenta antes de rendirse.
async function checkConnection(intentosRestantes = Number(process.env.DB_RETRIES || 5)) {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conectado a MySQL exitosamente');
    connection.release();
  } catch (error) {
    if (intentosRestantes > 1) {
      console.warn(
        `⏳ Base de datos no disponible (${error.code || error.message}). ` +
          `Reintentando… quedan ${intentosRestantes - 1} intentos.`
      );
      await new Promise((resolve) => setTimeout(resolve, 3000));
      return checkConnection(intentosRestantes - 1);
    }

    console.error('Error crítico: No se pudo conectar a la base de datos.');
    console.error(`Detalle del error: ${error.message || error.code}`);
    process.exit(1); // Detiene el servidor para evitar comportamientos erráticos
  }
}

checkConnection();

module.exports = pool;
