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
    // Antes esto era un unico ALTER TABLE gigante. Si cualquier parte fallaba
    // (por ejemplo, no habia PRIMARY KEY que borrar) se perdia el ALTER
    // completo, la tabla quedaba sin ninguna columna nueva y las consultas de
    // pautas reventaban en produccion con un 500. Ahora cada columna se agrega
    // por separado y un paso que falle no arrastra a los demas.
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT COUNT(*) AS total FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Pauta_Ejercicio'
            AND COLUMN_NAME IN ('pauta_ejercicio_id', 'series', 'repeticiones',
                                'frecuencia', 'material_terapeutico_id')`,
        [baseDatos]
      );
      return filas[0].total === 5;
    },
    aplicar: async (conexion, baseDatos) => {
      const existeColumna = async (columna) => {
        const [filas] = await conexion.query(
          `SELECT 1 FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Pauta_Ejercicio'
              AND COLUMN_NAME = ?`,
          [baseDatos, columna]
        );
        return filas.length > 0;
      };

      // 1. La clave primaria propia. Tiene que ir en una sola sentencia porque
      //    MySQL exige que una columna AUTO_INCREMENT sea clave de inmediato.
      if (!(await existeColumna('pauta_ejercicio_id'))) {
        try {
          await conexion.query(
            `ALTER TABLE Pauta_Ejercicio
               DROP PRIMARY KEY,
               ADD COLUMN pauta_ejercicio_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST`
          );
        } catch (error) {
          // La tabla puede no tener clave primaria previa que borrar.
          await conexion.query(
            `ALTER TABLE Pauta_Ejercicio
               ADD COLUMN pauta_ejercicio_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST`
          );
        }
      }

      // 2. Parametros de carga, uno por uno.
      const columnas = [
        ['series', `INT NOT NULL DEFAULT 1`],
        ['repeticiones', `INT NOT NULL DEFAULT 1`],
        ['frecuencia', `VARCHAR(20) NOT NULL DEFAULT 'DIARIA'`],
        ['material_terapeutico_id', `INT NULL`],
      ];
      for (const [columna, definicion] of columnas) {
        if (!(await existeColumna(columna))) {
          await conexion.query(
            `ALTER TABLE Pauta_Ejercicio ADD COLUMN ${columna} ${definicion}`
          );
        }
      }

      // 3. Indice y llave foranea: son mejoras de integridad, no requisitos
      //    para que la pantalla funcione, asi que un fallo aca no detiene nada.
      try {
        await conexion.query(
          `ALTER TABLE Pauta_Ejercicio
             ADD UNIQUE KEY uq_pauta_nombre (pauta_tratamiento_id, nombre_ejercicio)`
        );
      } catch (error) {
        console.warn(`   (indice uq_pauta_nombre omitido: ${error.code || error.message})`);
      }
      try {
        await conexion.query(
          `ALTER TABLE Pauta_Ejercicio
             ADD CONSTRAINT fk_pauta_ejercicio_material
               FOREIGN KEY (material_terapeutico_id)
               REFERENCES Material_Terapeutico(material_terapeutico_id)`
        );
      } catch (error) {
        console.warn(`   (llave foranea de material omitida: ${error.code || error.message})`);
      }
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
  {
    nombre: 'Cita.sesion_certificada_en (CU41)',
    descripcion: 'Persiste en la cita cuando y como se certifico la sesion',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT 1 FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Cita'
            AND COLUMN_NAME = 'sesion_certificada_en'`,
        [baseDatos]
      );
      return filas.length > 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(
        `ALTER TABLE Cita
           ADD COLUMN sesion_certificada_en DATETIME NULL,
           ADD COLUMN certificacion_tipo VARCHAR(20) NULL`
      );
    },
  },
  {
    nombre: 'Documento_Clinico.paginas (CU35)',
    descripcion: 'Cantidad de paginas de los PDF para el visor pagina a pagina',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT 1 FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Documento_Clinico' AND COLUMN_NAME = 'paginas'`,
        [baseDatos]
      );
      return filas.length > 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(`ALTER TABLE Documento_Clinico ADD COLUMN paginas INT NULL`);
    },
  },
  {
    nombre: 'Cita.episodio_clinico_id (vinculo cita-episodio)',
    descripcion: 'Conecta cada cita con el episodio clinico que genero',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT 1 FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Cita'
            AND COLUMN_NAME = 'episodio_clinico_id'`,
        [baseDatos]
      );
      return filas.length > 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(`ALTER TABLE Cita ADD COLUMN episodio_clinico_id INT NULL`);
      // La llave foranea es deseable pero no imprescindible: si falla por
      // datos historicos, la columna igual queda utilizable.
      try {
        await conexion.query(
          `ALTER TABLE Cita ADD CONSTRAINT fk_cita_episodio
             FOREIGN KEY (episodio_clinico_id) REFERENCES Episodio_Clinico(episodio_clinico_id)`
        );
      } catch (error) {
        console.warn(`   (llave foranea cita-episodio omitida: ${error.code || error.message})`);
      }
    },
  },
  {
    nombre: 'Cita.estado con cancelacion por actor (D2)',
    descripcion: 'Amplia la columna y separa CANCELADA en CANCELADA_PACIENTE / CANCELADA_PROFESIONAL',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT COLUMN_TYPE AS tipo FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Cita' AND COLUMN_NAME = 'estado'`,
        [baseDatos]
      );
      return String(filas[0]?.tipo || '').toLowerCase() === 'varchar(30)';
    },
    aplicar: async (conexion) => {
      // 'CANCELADA_PROFESIONAL' tiene 21 caracteres: no cabía en VARCHAR(20).
      await conexion.query(
        `ALTER TABLE Cita MODIFY COLUMN estado VARCHAR(30) NOT NULL DEFAULT 'AGENDADA'`
      );
      // Las cancelaciones antiguas se reclasifican con el rol que quedó en la
      // trazabilidad (CU22); sin rastro, se asume cancelada por el paciente.
      await conexion.query(
        `UPDATE Cita c
            SET c.estado = CASE
              WHEN EXISTS (
                SELECT 1 FROM Bitacora_Auditoria b
                 WHERE b.entidad_afectada = 'Cita'
                   AND JSON_EXTRACT(b.datos_adicionales, '$.cita_id') = c.cita_id
                   AND JSON_UNQUOTE(JSON_EXTRACT(b.datos_adicionales, '$.nuevo_estado')) = 'CANCELADA'
                   AND JSON_UNQUOTE(JSON_EXTRACT(b.datos_adicionales, '$.rol_actor')) IN ('Profesional', 'Administrador')
              ) THEN 'CANCELADA_PROFESIONAL'
              ELSE 'CANCELADA_PACIENTE'
            END
          WHERE c.estado = 'CANCELADA'`
      );
    },
  },
  {
    nombre: 'Cita: suspension de validacion multi-factor (D11)',
    descripcion: 'Guarda cuando y por que se suspendio la certificacion, para derivarla al Administrador',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT 1 FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Cita' AND COLUMN_NAME = 'sesion_suspendida_en'`,
        [baseDatos]
      );
      return filas.length > 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(
        `ALTER TABLE Cita
           ADD COLUMN sesion_suspendida_en DATETIME NULL,
           ADD COLUMN motivo_suspension JSON NULL`
      );
    },
  },
  {
    nombre: 'Profesional.areas_experticia (CU10)',
    descripcion: 'Areas de experticia del catalogo publico del profesional',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT 1 FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Profesional' AND COLUMN_NAME = 'areas_experticia'`,
        [baseDatos]
      );
      return filas.length > 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(`ALTER TABLE Profesional ADD COLUMN areas_experticia VARCHAR(255) NULL`);
    },
  },
  {
    nombre: 'Episodio_Clinico.estado ABIERTO por defecto (D12)',
    descripcion: 'Los episodios sin estado pasan a ABIERTO; los cerrados dejan de admitir registros',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT COLUMN_DEFAULT AS valor FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Episodio_Clinico' AND COLUMN_NAME = 'estado'`,
        [baseDatos]
      );
      return String(filas[0]?.valor || '').toUpperCase() === 'ABIERTO';
    },
    aplicar: async (conexion) => {
      await conexion.query(
        `ALTER TABLE Episodio_Clinico ALTER COLUMN estado SET DEFAULT 'ABIERTO'`
      );
      await conexion.query(
        `UPDATE Episodio_Clinico SET estado = 'ABIERTO'
          WHERE estado IS NULL OR TRIM(estado) = ''`
      );
    },
  },
  {
    nombre: 'Episodio_Clinico.fecha_terminado sin valor por defecto (CU78)',
    descripcion: 'El episodio abierto no tiene fecha de termino: antes nacia terminado en el mismo instante',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT IS_NULLABLE AS nulos FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Episodio_Clinico' AND COLUMN_NAME = 'fecha_terminado'`,
        [baseDatos]
      );
      return String(filas[0]?.nulos || '').toUpperCase() === 'YES';
    },
    aplicar: async (conexion) => {
      await conexion.query(
        `ALTER TABLE Episodio_Clinico
           MODIFY COLUMN fecha_terminado TIMESTAMP NULL DEFAULT NULL`
      );
      // Los episodios ya creados arrastran una fecha de termino falsa (la de su
      // creacion). Solo los cerrados tienen un termino real.
      await conexion.query(
        `UPDATE Episodio_Clinico
            SET fecha_terminado = NULL
          WHERE UPPER(TRIM(COALESCE(estado, ''))) <> 'CERRADO'`
      );
    },
  },
  {
    nombre: 'Tabla Profesional_Comuna (CU10/CU14)',
    descripcion: 'Comunas en las que atiende cada profesional, para filtrar la busqueda del paciente',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT 1 FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Profesional_Comuna'`,
        [baseDatos]
      );
      return filas.length > 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(
        `CREATE TABLE Profesional_Comuna (
            profesional_id INT NOT NULL,
            comuna_id INT NOT NULL,
            PRIMARY KEY (profesional_id, comuna_id),
            FOREIGN KEY (profesional_id) REFERENCES Profesional(profesional_id),
            FOREIGN KEY (comuna_id) REFERENCES Comuna(comuna_id)
         )`
      );
    },
  },
  {
    nombre: 'Notificacion con titulo y datos (CU52)',
    descripcion: 'Titulo del aviso y carga util para abrir la pantalla correcta al tocarlo',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT 1 FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Notificacion' AND COLUMN_NAME = 'datos'`,
        [baseDatos]
      );
      return filas.length > 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(`ALTER TABLE Notificacion ADD COLUMN titulo VARCHAR(120) NULL AFTER tipo`);
      await conexion.query(`ALTER TABLE Notificacion ADD COLUMN datos JSON NULL AFTER contenido`);
    },
  },
  {
    nombre: 'Tabla Preferencia_Notificacion (CU52)',
    descripcion: 'Canales de salida que acepta cada usuario: push y correo',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT 1 FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Preferencia_Notificacion'`,
        [baseDatos]
      );
      return filas.length > 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(
        `CREATE TABLE Preferencia_Notificacion (
            usuario_id INT PRIMARY KEY,
            canal_push BOOLEAN NOT NULL DEFAULT TRUE,
            canal_email BOOLEAN NOT NULL DEFAULT TRUE,
            ultima_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES Usuario(usuario_id)
         )`
      );
    },
  },
  {
    nombre: 'Tabla Dispositivo_Push (CU52)',
    descripcion: 'Tokens de notificacion push por dispositivo, listos para cuando exista build propia',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT 1 FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Dispositivo_Push'`,
        [baseDatos]
      );
      return filas.length > 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(
        `CREATE TABLE Dispositivo_Push (
            dispositivo_push_id INT PRIMARY KEY AUTO_INCREMENT,
            token VARCHAR(255) NOT NULL UNIQUE,
            plataforma VARCHAR(20) NOT NULL DEFAULT 'DESCONOCIDA',
            activo BOOLEAN NOT NULL DEFAULT TRUE,
            momento_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            usuario_id INT NOT NULL,
            FOREIGN KEY (usuario_id) REFERENCES Usuario(usuario_id)
         )`
      );
    },
  },
  {
    nombre: 'Tabla Solicitud_Confirmacion (CU21)',
    descripcion: 'Solicitud de confirmacion de asistencia con token de un solo uso y vencimiento',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT 1 FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Solicitud_Confirmacion'`,
        [baseDatos]
      );
      return filas.length > 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(
        `CREATE TABLE Solicitud_Confirmacion (
            solicitud_confirmacion_id INT PRIMARY KEY AUTO_INCREMENT,
            token VARCHAR(64) NOT NULL UNIQUE,
            momento_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            momento_expira TIMESTAMP NOT NULL,
            momento_respuesta TIMESTAMP NULL,
            respuesta VARCHAR(20) NULL,
            canal_respuesta VARCHAR(20) NULL,
            cita_id INT NOT NULL UNIQUE,
            FOREIGN KEY (cita_id) REFERENCES Cita(cita_id)
         )`
      );
    },
  },
  {
    nombre: 'Lista_Espera secuencial con plazo (CU19)',
    descripcion: 'Estado del turno, momento de aviso y vencimiento para ofrecer el cupo de a uno',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT 1 FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Lista_Espera' AND COLUMN_NAME = 'estado'`,
        [baseDatos]
      );
      return filas.length > 0;
    },
    aplicar: async (conexion, baseDatos) => {
      await conexion.query(
        `ALTER TABLE Lista_Espera
           ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'ESPERANDO' AFTER notificado,
           ADD COLUMN momento_notificacion TIMESTAMP NULL AFTER estado,
           ADD COLUMN momento_expira TIMESTAMP NULL AFTER momento_notificacion`
      );
      // Las inscripciones anteriores ya avisadas se dan por atendidas: con la
      // regla nueva habrian quedado esperando un turno que nadie les ofrece.
      await conexion.query(
        `UPDATE Lista_Espera SET estado = 'VENCIDO' WHERE notificado = TRUE`
      );
      // Un paciente no puede estar dos veces en la misma lista.
      const [duplicados] = await conexion.query(
        `SELECT 1 FROM information_schema.STATISTICS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Lista_Espera'
            AND INDEX_NAME = 'uq_espera_cita_paciente' LIMIT 1`,
        [baseDatos]
      );
      if (duplicados.length === 0) {
        await conexion.query(
          `DELETE le FROM Lista_Espera le
             JOIN Lista_Espera otra
               ON otra.cita_id = le.cita_id
              AND otra.paciente_id = le.paciente_id
              AND otra.lista_espera_id < le.lista_espera_id`
        );
        await conexion.query(
          `ALTER TABLE Lista_Espera
             ADD UNIQUE KEY uq_espera_cita_paciente (cita_id, paciente_id)`
        );
      }
    },
  },
  {
    nombre: 'Parametros de avisos, confirmacion y lista de espera (CU19/CU21/CU52)',
    descripcion: 'Plazos del bloque de notificaciones y agenda del Incremento 3',
    yaAplicada: async (conexion) => {
      const [filas] = await conexion.query(
        `SELECT 1 FROM Parametro_Global WHERE clave = 'MAX_PACIENTES_LISTA_ESPERA' LIMIT 1`
      );
      return filas.length > 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(
        `INSERT INTO Parametro_Global (clave, valor, descripcion, administrador_id) VALUES
         ('ANTICIPACION_SOLICITUD_CONFIRMACION_HORAS', '24', 'Horas antes de la cita en que se pide al paciente confirmar su asistencia.', 1),
         ('VIGENCIA_ENLACE_CONFIRMACION_HORAS', '48', 'Horas que dura el enlace de confirmacion enviado por correo.', 1),
         ('MAX_PACIENTES_LISTA_ESPERA', '5', 'Cantidad maxima de pacientes inscritos en la lista de espera de un mismo bloque.', 1),
         ('PLAZO_RESPUESTA_LISTA_ESPERA_MINUTOS', '30', 'Minutos que tiene el primero de la lista para tomar el cupo antes de cederlo al siguiente.', 1)`
      );
    },
  },
  {
    nombre: 'Eliminar Pauta_Material (D8)',
    descripcion: 'La tabla no la usa ningun flujo: el material se asocia por ejercicio',
    yaAplicada: async (conexion, baseDatos) => {
      const [filas] = await conexion.query(
        `SELECT 1 FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'Pauta_Material'`,
        [baseDatos]
      );
      return filas.length === 0;
    },
    aplicar: async (conexion) => {
      await conexion.query(`DROP TABLE IF EXISTS Pauta_Material`);
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
    // El nombre de la base va como segundo argumento: algunas migraciones lo
    // necesitan para consultar information_schema y decidir qué falta.
    try {
      await migracion.aplicar(conexion, baseDatos);
      aplicadas++;
      console.log('  ✅ Lista.');
    } catch (error) {
      // Una migración que falla NO puede dejar sin aplicar a las siguientes:
      // antes, un error acá abortaba el resto y la base quedaba a medias sin
      // que nada lo dijera. Se informa fuerte y se continúa con las demás.
      console.error(
        `  ❌ Falló "${migracion.nombre}": ${error.sqlMessage || error.message}\n` +
        `     La base quedó incompleta para esa función. Revisa /api/diagnostico.`
      );
    }
  }

  if (aplicadas > 0) {
    console.log(`✅ ${aplicadas} migración(es) aplicada(s). Base de datos al día.`);
  }
  return aplicadas;
}

module.exports = { ejecutarMigraciones, MIGRACIONES };

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
