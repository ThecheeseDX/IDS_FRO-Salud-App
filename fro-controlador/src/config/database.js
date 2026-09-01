const mysql = require('mysql2/promise');

const { opcionesSSL, urlConexion, datosSueltos } = require('./dbOptions');

// En la nube el proveedor suele entregar una sola cadena de conexión
// (mysql://usuario:clave@host:puerto/base). Si existe, tiene prioridad;
// si no, se arman los datos por variables sueltas como en local.
const url = urlConexion();

const opcionesComunes = {
  // Las columnas DATETIME guardan hora de pared chilena, sin huso. Si mysql2
  // las convierte a objetos Date, Express las serializa como UTC y la app las
  // vuelve a desplazar al mostrarlas: una cita de 08:00 terminaba en 05:00.
  // Devolviéndolas como texto, la hora viaja intacta de la base a la pantalla.
  dateStrings: true,
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

    // Pistas concretas según el tipo de fallo, para no tener que adivinar.
    const detalle = `${error.code || ''} ${error.message || ''}`;

    if (/self.?signed|SELF_SIGNED|unable to verify|certificate/i.test(detalle)) {
      console.error(
        '\n   → Es el certificado de la base de datos, no la contraseña.\n' +
          '     Proveedores como Aiven firman con su propia autoridad, que no\n' +
          '     viene incluida en el sistema. Agrega esta variable de entorno:\n\n' +
          '        DB_SSL_REJECT_UNAUTHORIZED=false\n\n' +
          '     Y si definiste DB_SSL_CA sin pegarle un certificado, bórrala.'
      );
    } else if (/ACCESS_DENIED/i.test(detalle)) {
      console.error('\n   → Usuario o contraseña incorrectos en DATABASE_URL.');
    } else if (/ENOTFOUND|EAI_AGAIN/i.test(detalle)) {
      console.error('\n   → No se encontró el servidor. Revisa la dirección en DATABASE_URL.');
    } else if (/ETIMEDOUT|ECONNREFUSED/i.test(detalle)) {
      console.error('\n   → La base no responde. ¿Está encendida? ¿El puerto es el correcto?');
    }

    process.exit(1); // Detiene el servidor para evitar comportamientos erráticos
  }
}

checkConnection();

module.exports = pool;
