/**
 * Aplica a la base de datos los cambios de estructura pendientes SIN borrar
 * datos. Sirve para poner al día una base ya desplegada (por ejemplo la de
 * la nube) cuando el esquema cambió después de haberla creado.
 *
 * Uso:
 *   npm run db:migrar
 *
 * Es seguro ejecutarlo más de una vez: cada migración revisa primero si ya
 * fue aplicada y no repite nada.
 */

const mysql = require('mysql2/promise');

const { opcionesSSL, urlConexion, datosSueltos } = require('../src/config/dbOptions');

// ── Lista de migraciones ─────────────────────────────────────────────────────
// Cada entrada dice cómo saber si ya está aplicada y qué ejecutar si no.
const MIGRACIONES = [
  {
    nombre: 'Profesional_Disponibilidad.modalidad',
    descripcion: 'Agrega la modalidad (DOMICILIO/ONLINE/AMBOS) a cada bloque horario',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT 1 FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Profesional_Disponibilidad'
            AND COLUMN_NAME = 'modalidad'`,
        [baseDatos]
      );
      return filas.length > 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(
        `ALTER TABLE Profesional_Disponibilidad
           ADD COLUMN modalidad ENUM('DOMICILIO', 'ONLINE', 'AMBOS')
             NOT NULL DEFAULT 'DOMICILIO'`
      );
      // Los bloques ya existentes heredan la modalidad que el profesional
      // declaró al registrarse, para no dejarlos todos como DOMICILIO.
      await conexion.query(
        `UPDATE Profesional_Disponibilidad pd
           JOIN Profesional p ON p.profesional_id = pd.profesional_id
            SET pd.modalidad = p.tipo_sede`
      );
    },
  },
];

/**
 * Ejecuta las migraciones pendientes sobre una conexión o pool ya abiertos.
 * La usa tanto este script como el servidor al arrancar (server.js), así la
 * base queda al día automáticamente en cada despliegue sin pasos manuales.
 */
async function ejecutarMigraciones(conexion) {
  const [[{ baseDatos }]] = await conexion.query('SELECT DATABASE() AS baseDatos');
  let aplicadas = 0;

  for (const migracion of MIGRACIONES) {
    if (await migracion.yaAplicada(conexion, baseDatos)) {
      continue;
    }

    console.log(`• Migración "${migracion.nombre}" — aplicando… (${migracion.descripcion})`);
    await migracion.aplicar(conexion);
    aplicadas++;
    console.log('  ✅ Lista.');
  }

  if (aplicadas > 0) {
    console.log(`✅ ${aplicadas} migración(es) aplicada(s). Base de datos al día.`);
  }
  return aplicadas;
}

module.exports = { ejecutarMigraciones };

// ── Uso directo por consola: npm run db:migrar ──────────────────────────────
async function main() {
  const url = urlConexion();
  const base = { multipleStatements: false, ...opcionesSSL() };

  const conexion = url
    ? await mysql.createConnection({ uri: url, ...base })
    : await mysql.createConnection({ ...datosSueltos(), ...base });

  try {
    const aplicadas = await ejecutarMigraciones(conexion);
    if (aplicadas === 0) {
      console.log('La base de datos ya estaba al día.');
    }
  } finally {
    await conexion.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`\n❌ No se pudo migrar: ${error.message}`);
    console.error('   Revisa los datos de conexión en tu archivo .env');
    process.exit(1);
  });
}
