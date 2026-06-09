const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Creamos un pool de conexiones reutilizable
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Función autoejecutable para validar la conexión al arrancar el servidor
async function checkConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Conectado a MySQL exitosamente");
    connection.release(); // Liberamos la conexión de vuelta al pool
  } catch (error) {
    console.error("Error crítico: No se pudo conectar a la base de datos.");
    console.error(`Detalle del error: ${error.message}`);
    process.exit(1); // Detiene el servidor por completo para evitar comportamientos erráticos
  }
}

checkConnection();

module.exports = pool;