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
    nombre: 'Evidencia de atencion en Cita (CU39/CU42/CU43)',
    descripcion: 'Agrega modalidad, evidencia GPS y firma de conformidad a la cita',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT 1 FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Cita'
            AND COLUMN_NAME = 'evidencia_presencial'`,
        [baseDatos]
      );
      return filas.length > 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(
        `ALTER TABLE Cita
           ADD COLUMN modalidad ENUM('DOMICILIO', 'ONLINE') NULL,
           ADD COLUMN evidencia_presencial JSON NULL,
           ADD COLUMN firma_conformidad_datos JSON NULL`
      );
    },
  },
  {
    nombre: 'Parametros de evidencia de sesion (CU39/CU41)',
    descripcion: 'Radio de presencialidad y tolerancia del protocolo multi-factor',
    yaAplicada: async (conexion) => {
      const [filas] = await conexion.query(
        `SELECT 1 FROM Parametro_Global WHERE clave = 'RADIO_PRESENCIALIDAD_METROS'`
      );
      return filas.length > 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(
        `INSERT INTO Parametro_Global (clave, valor, descripcion, administrador_id) VALUES
         ('RADIO_PRESENCIALIDAD_METROS', '200', 'Distancia máxima en metros entre los check-in GPS del paciente y del profesional.', 1),
         ('TOLERANCIA_MULTIFACTOR_MINUTOS', '15', 'Diferencia máxima en minutos entre marcas de presencia para certificar una sesión.', 1)`
      );
    },
  },
  {
    nombre: 'Financiadores con convenio (CU66)',
    descripcion: 'Siembra los financiadores simulados si la tabla esta vacia',
    yaAplicada: async (conexion) => {
      const [filas] = await conexion.query(`SELECT 1 FROM Financiador LIMIT 1`);
      return filas.length > 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(
        `INSERT INTO Financiador (nombre_institucion, rut_institucion, convenio_activo) VALUES
         ('FONASA (simulado)', '61.603.000-0', TRUE),
         ('ISAPRE Salud Plena (simulada)', '96.856.780-2', TRUE)`
      );
    },
  },
  {
    nombre: 'Tabla Triaje (CU23/CU24)',
    descripcion: 'Entrevista clínica automatizada con reanudación e integración a ficha',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT 1 FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Triaje'`,
        [baseDatos]
      );
      return filas.length > 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(
        `CREATE TABLE Triaje (
            triaje_id INT PRIMARY KEY AUTO_INCREMENT,
            estado ENUM('EN_PROGRESO', 'COMPLETADO') NOT NULL DEFAULT 'EN_PROGRESO',
            respuestas JSON,
            momento_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            momento_completado TIMESTAMP NULL,
            integrado BOOLEAN NOT NULL DEFAULT FALSE,
            paciente_id INT NOT NULL,
            FOREIGN KEY (paciente_id) REFERENCES Paciente(paciente_id)
         )`
      );
    },
  },
  {
    nombre: 'Pauta_Ejercicio con parametros de carga (CU47)',
    descripcion: 'Agrega id propio, series, repeticiones, frecuencia y material a cada ejercicio',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT 1 FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Pauta_Ejercicio'
            AND COLUMN_NAME = 'pauta_ejercicio_id'`,
        [baseDatos]
      );
      return filas.length > 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(
        `ALTER TABLE Pauta_Ejercicio
           DROP PRIMARY KEY,
           ADD COLUMN pauta_ejercicio_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST,
           ADD COLUMN series INT NOT NULL DEFAULT 1,
           ADD COLUMN repeticiones INT NOT NULL DEFAULT 1,
           ADD COLUMN frecuencia VARCHAR(20) NOT NULL DEFAULT 'DIARIA',
           ADD COLUMN material_terapeutico_id INT NULL,
           ADD UNIQUE KEY uq_pauta_nombre (pauta_tratamiento_id, nombre_ejercicio),
           ADD CONSTRAINT fk_pauta_ejercicio_material
             FOREIGN KEY (material_terapeutico_id)
             REFERENCES Material_Terapeutico(material_terapeutico_id)`
      );
    },
  },
  {
    nombre: 'Tabla Pauta_Cumplimiento (CU48)',
    descripcion: 'Registro diario de cumplimiento de ejercicios, con control anti-rebote',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT 1 FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Pauta_Cumplimiento'`,
        [baseDatos]
      );
      return filas.length > 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(
        `CREATE TABLE Pauta_Cumplimiento(
            pauta_cumplimiento_id INT PRIMARY KEY AUTO_INCREMENT,
            pauta_ejercicio_id INT NOT NULL,
            fecha DATE NOT NULL,
            momento_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_ejercicio_dia (pauta_ejercicio_id, fecha),
            FOREIGN KEY (pauta_ejercicio_id) REFERENCES Pauta_Ejercicio(pauta_ejercicio_id)
         )`
      );
    },
  },
  {
    nombre: 'Catalogo inicial de Material_Terapeutico (CU46)',
    descripcion: 'Siembra la biblioteca con recursos de ejemplo si esta vacia',
    yaAplicada: async (conexion) => {
      const [filas] = await conexion.query(`SELECT 1 FROM Material_Terapeutico LIMIT 1`);
      return filas.length > 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(
        `INSERT INTO Material_Terapeutico (nombre, tipo, url_archivo, categoria, formato, disponibilidad) VALUES
         ('Elongación de isquiotibiales', 'GUIA', 'https://biblioteca.frosalud.cl/isquiotibiales', 'Kinesiología', 'PDF', TRUE),
         ('Fortalecimiento de cuádriceps', 'GUIA', 'https://biblioteca.frosalud.cl/cuadriceps', 'Kinesiología', 'PDF', TRUE),
         ('Movilidad de hombro con banda', 'VIDEO', 'https://biblioteca.frosalud.cl/hombro-banda', 'Kinesiología', 'MP4', TRUE),
         ('Respiración diafragmática guiada', 'VIDEO', 'https://biblioteca.frosalud.cl/respiracion', 'Kinesiología Respiratoria', 'MP4', TRUE),
         ('Ejercicios de expansión torácica', 'GUIA', 'https://biblioteca.frosalud.cl/expansion-toracica', 'Kinesiología Respiratoria', 'PDF', TRUE),
         ('Pauta de hidratación y colaciones', 'GUIA', 'https://biblioteca.frosalud.cl/hidratacion', 'Nutrición', 'PDF', TRUE),
         ('Plan de comidas semanal base', 'PLANTILLA', 'https://biblioteca.frosalud.cl/plan-comidas', 'Nutrición', 'PDF', TRUE),
         ('Rutina de marcha progresiva (versión 2019)', 'GUIA', 'https://biblioteca.frosalud.cl/marcha-2019', 'Kinesiología', 'PDF', FALSE)`
      );
    },
  },
  {
    nombre: 'Tabla Sesion_Usuario (CU08)',
    descripcion: 'Registro de sesiones activas por dispositivo, revocables',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT 1 FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Sesion_Usuario'`,
        [baseDatos]
      );
      return filas.length > 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(
        `CREATE TABLE Sesion_Usuario (
            sesion_usuario_id INT PRIMARY KEY AUTO_INCREMENT,
            jti CHAR(36) NOT NULL UNIQUE,
            dispositivo VARCHAR(120),
            ip_origen VARCHAR(45),
            momento_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            activa BOOLEAN DEFAULT TRUE,
            usuario_id INT NOT NULL,
            FOREIGN KEY (usuario_id) REFERENCES Usuario(usuario_id)
         )`
      );
    },
  },
  {
    nombre: 'Paciente.privacidad_contacto (CU09)',
    descripcion: 'Preferencias de visibilidad de los datos de contacto',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT 1 FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Paciente'
            AND COLUMN_NAME = 'privacidad_contacto'`,
        [baseDatos]
      );
      return filas.length > 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(
        `ALTER TABLE Paciente ADD COLUMN privacidad_contacto JSON NULL`
      );
    },
  },
  {
    nombre: 'Parametros de anticipacion de agenda (CU17/CU18)',
    descripcion: 'Agrega los plazos mínimos para reprogramar y cancelar citas',
    yaAplicada: async (conexion) => {
      const [filas] = await conexion.query(
        `SELECT 1 FROM Parametro_Global
          WHERE clave = 'ANTICIPACION_MINIMA_REPROGRAMACION_HORAS'`
      );
      return filas.length > 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(
        `INSERT INTO Parametro_Global (clave, valor, descripcion, administrador_id) VALUES
         ('ANTICIPACION_MINIMA_REPROGRAMACION_HORAS', '24', 'Horas mínimas de anticipación con que un paciente puede reprogramar su cita.', 1),
         ('ANTICIPACION_MINIMA_CANCELACION_HORAS', '2', 'Horas mínimas de anticipación con que un paciente puede cancelar su cita.', 1)`
      );
    },
  },
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
  {
    nombre: 'Sesion_Usuario.dispositivo_id (CU08)',
    descripcion: 'Identifica cada instalacion para que reingresar no acumule sesiones duplicadas',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT 1 FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Sesion_Usuario'
            AND COLUMN_NAME = 'dispositivo_id'`,
        [baseDatos]
      );
      return filas.length > 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(
        `ALTER TABLE Sesion_Usuario ADD COLUMN dispositivo_id VARCHAR(64)`
      );
    },
  },
  {
    nombre: 'Tablas de documentos y versiones (CU31/CU33)',
    descripcion: 'Crea Evolucion_Version (correcciones auditadas) y Documento_Clinico (repositorio multimedia)',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT COUNT(*) AS total FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('Evolucion_Version', 'Documento_Clinico')`,
        [baseDatos]
      );
      return filas[0].total === 2;
    },
    aplicar: async (conexion) => {
      await conexion.query(
        `CREATE TABLE IF NOT EXISTS Evolucion_Version (
            version_id INT PRIMARY KEY AUTO_INCREMENT,
            numero_version INT NOT NULL,
            texto_correccion TEXT NOT NULL,
            fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            evolucion_clinica_id INT NOT NULL,
            profesional_id INT NOT NULL,
            FOREIGN KEY (evolucion_clinica_id) REFERENCES Evolucion_Clinica(Evolucion_clinica_id),
            FOREIGN KEY (profesional_id) REFERENCES Profesional(profesional_id)
        )`
      );
      await conexion.query(
        `CREATE TABLE IF NOT EXISTS Documento_Clinico (
            documento_id INT PRIMARY KEY AUTO_INCREMENT,
            nombre_original VARCHAR(255) NOT NULL,
            categoria VARCHAR(40) NOT NULL DEFAULT 'SIN_CLASIFICAR',
            formato VARCHAR(10) NOT NULL,
            tamano_bytes INT NOT NULL,
            tipo_recurso VARCHAR(10) NOT NULL,
            url_publica VARCHAR(500) NOT NULL,
            public_id_cloud VARCHAR(255) NOT NULL,
            fecha_carga TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            paciente_id INT NOT NULL,
            episodio_clinico_id INT,
            profesional_id INT NOT NULL,
            FOREIGN KEY (paciente_id) REFERENCES Paciente(paciente_id),
            FOREIGN KEY (episodio_clinico_id) REFERENCES Episodio_Clinico(episodio_clinico_id),
            FOREIGN KEY (profesional_id) REFERENCES Profesional(profesional_id)
        )`
      );
    },
  },
  {
    nombre: 'Parametros de multimedia y versionado (CU31/CU33)',
    descripcion: 'Limite de tamaño de archivos y tope de versiones de corrección',
    yaAplicada: async (conexion) => {
      const [filas] = await conexion.query(
        `SELECT COUNT(*) AS total FROM Parametro_Global
          WHERE clave IN ('MAX_TAMANO_ARCHIVO_MB', 'MAX_VERSIONES_CORRECCION')`
      );
      return filas[0].total === 2;
    },
    aplicar: async (conexion) => {
      await conexion.query(
        `INSERT IGNORE INTO Parametro_Global (clave, valor, descripcion, administrador_id) VALUES
          ('MAX_TAMANO_ARCHIVO_MB', '10', 'Tamaño máximo en megabytes aceptado al cargar archivos al repositorio multimedia.', 1),
          ('MAX_VERSIONES_CORRECCION', '5', 'Cantidad máxima de correcciones versionadas permitidas sobre una evolución clínica cerrada.', 1)`
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
