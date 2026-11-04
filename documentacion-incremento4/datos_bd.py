# -*- coding: utf-8 -*-
"""Cambios de base de datos del Incremento 4 (fuente: scripts/migrar-db.js, migraciones 47 a 63)."""

# (tabla, motivo, [(columna, tipo MySQL, restricciones / uso)])
CLASES_NUEVAS = [
 ('Evento_Critico', 'CU62 · evento escalado a supervisión por un término crítico', [
   ('evento_critico_id', 'INT', 'PK, AUTO_INCREMENT'),
   ('origen', 'VARCHAR(20)', 'NOT NULL · SINTOMAS / RESENA / TICKET'),
   ('entidad', 'VARCHAR(50)', 'NOT NULL · tabla del registro de origen'),
   ('entidad_id', 'INT', 'NULL · id del registro de origen'),
   ('termino', 'VARCHAR(80)', 'NOT NULL · primer término crítico detectado'),
   ('terminos', 'JSON', 'NULL · todos los términos que coincidieron'),
   ('extracto', 'VARCHAR(300)', 'NULL · fragmento del texto alrededor del término'),
   ('estado', 'VARCHAR(20)', "NOT NULL, DEFAULT 'PENDIENTE' · PENDIENTE / ACUSADO"),
   ('momento_creacion', 'TIMESTAMP', 'DEFAULT CURRENT_TIMESTAMP'),
   ('momento_acuse', 'TIMESTAMP', 'NULL'),
   ('usuario_origen_id', 'INT', 'NULL, FK → Usuario (quien escribió el texto)'),
   ('paciente_id', 'INT', 'NULL, FK → Paciente (paciente involucrado)'),
   ('acusado_por', 'INT', 'NULL, FK → Usuario (administrador que acusó recibo)'),
 ]),
 ('Pauta_Ejercicio_Material', 'CU47 · archivo de apoyo subido por el profesional a un ejercicio', [
   ('pauta_ejercicio_material_id', 'INT', 'PK, AUTO_INCREMENT'),
   ('pauta_ejercicio_id', 'INT', 'NOT NULL, FK → Pauta_Ejercicio'),
   ('nombre_original', 'VARCHAR(255)', 'NOT NULL'),
   ('formato', 'VARCHAR(10)', 'NOT NULL · pdf, docx, jpg, mp4…'),
   ('tipo_recurso', 'VARCHAR(10)', 'NOT NULL · image / video / raw (Cloudinary)'),
   ('url_publica', 'VARCHAR(500)', 'NOT NULL'),
   ('public_id_cloud', 'VARCHAR(255)', 'NOT NULL'),
   ('tamano_bytes', 'INT', 'NOT NULL'),
   ('paginas', 'INT', 'NULL · solo PDF'),
   ('momento_carga', 'TIMESTAMP', 'DEFAULT CURRENT_TIMESTAMP'),
   ('usuario_id', 'INT', 'NOT NULL, FK → Usuario (quien lo subió)'),
 ]),
]

# (tabla, CU, [(columna, tipo, restricciones / uso)])
ATRIBUTOS_NUEVOS = [
 ('Episodio_Clinico', 'CU51 / CU37', [
   ('preparacion_alta_en', 'TIMESTAMP', 'NULL · momento en que las metas cruzaron el umbral de egreso'),
   ('pautas_continuidad', 'TEXT', 'NULL · indicaciones del informe de alta (máx. 1000 caracteres en la app)'),
   ('informe_alta_documento_id', 'INT', 'NULL, FK → Documento_Clinico (PDF del informe de alta)'),
   ('informe_alta_emitido_en', 'TIMESTAMP', 'NULL'),
 ]),
 ('Material_Terapeutico', 'CU51', [
   ('proposito', 'VARCHAR(20)', "NOT NULL, DEFAULT 'TRATAMIENTO' · TRATAMIENTO / PREVENCION"),
   ('imagen_url', 'VARCHAR(255)', 'NULL · portada del recurso'),
 ]),
 ('Preferencia_Notificacion', 'CU54', [
   ('refuerzos', 'BOOLEAN', 'NOT NULL, DEFAULT TRUE · switch "Mensajes de ánimo"'),
 ]),
 ('Derivacion_Interna', 'CU65', [
   ('momento_respuesta', 'TIMESTAMP', 'NULL · cuando el receptor aceptó o rechazó'),
   ('comentario_respuesta', 'VARCHAR(255)', 'NULL'),
   ('momento_cierre', 'TIMESTAMP', 'NULL · cancelación o cierre del episodio'),
 ]),
 ('Bono', 'CU72', [
   ('financiador_id', 'INT', 'CAMBIA · ahora admite NULL (bono por contingencia sin catálogo)'),
   ('financiador_manual', 'VARCHAR(100)', 'NULL · nombre escrito a mano si el catálogo no responde'),
   ('registrado_por_usuario_id', 'INT', 'NULL, FK → Usuario (profesional o administrador que lo ingresó)'),
   ('momento_registro_manual', 'TIMESTAMP', 'NULL'),
   ('regularizado_en', 'TIMESTAMP', 'NULL · cuando el administrador lo regularizó'),
 ]),
 ('Mensaje_Chat', 'CU53', [
   ('paciente_id', 'INT', 'NULL, FK → Paciente · la conversación es por pareja paciente–profesional'),
   ('profesional_id', 'INT', 'NULL, FK → Profesional'),
   ('episodio_clinico_id', 'INT', 'CAMBIA · ahora admite NULL (episodio abierto al enviar, si lo hay)'),
   ('adjunto_url', 'VARCHAR(500)', 'NULL'),
   ('adjunto_public_id', 'VARCHAR(255)', 'NULL'),
   ('adjunto_nombre', 'VARCHAR(255)', 'NULL'),
   ('adjunto_formato', 'VARCHAR(10)', 'NULL'),
   ('adjunto_tipo_recurso', 'VARCHAR(10)', 'NULL'),
   ('adjunto_bytes', 'INT', 'NULL'),
   ('adjunto_paginas', 'INT', 'NULL'),
   ('documento_id', 'INT', 'NULL, FK → Documento_Clinico (documento de la ficha enviado al chat)'),
 ]),
 ('Paciente', 'CU09 (foto de perfil opcional)', [
   ('foto_url', 'VARCHAR(500)', 'NULL · sin foto se muestran las iniciales'),
 ]),
 ('Cita', 'CU40 (documentar al final de la jornada)', [
   ('documentacion_pendiente', 'BOOLEAN', 'NOT NULL, DEFAULT FALSE'),
 ]),
 ('Pauta_Ejercicio', 'CU47', [
   ('dias_semana', 'VARCHAR(20)', 'NULL · días ISO separados por coma ("1,3,5"); NULL = todos los días'),
 ]),
 ('Evaluacion_Satisfaccion', 'CU55 / CU58', [
   ('tipo', 'VARCHAR(20)', "NOT NULL, DEFAULT 'SESION' · SESION / TRATAMIENTO"),
   ('satisfecho', 'BOOLEAN', 'NULL · respuesta de la evaluación de sesión'),
   ('episodio_clinico_id', 'INT', 'NULL, UNIQUE, FK → Episodio_Clinico (evaluación de tratamiento)'),
   ('profesional_id', 'INT', 'NULL, FK → Profesional (profesional evaluado)'),
   ('puntuacion', 'TINYINT', 'CAMBIA · ahora admite NULL (la sesión no lleva estrellas)'),
   ('cita_id', 'INT', 'CAMBIA · ahora admite NULL (el tratamiento no tiene cita)'),
 ]),
]

# Valores nuevos sin cambio de estructura
VALORES_NUEVOS = [
 ('Parametro_Global', 'UMBRAL_EGRESO_CLINICO = 80', 'CU51 / CU37'),
 ('Parametro_Global', 'MODO_CONTINGENCIA_FINANCIADOR = 0', 'CU72'),
 ('Parametro_Global', 'VENTANA_CONTINGENCIA_MINUTOS = 30', 'CU72'),
 ('Parametro_Global', 'VENTANA_UBICACION_PACIENTE_MINUTOS = 30', 'CU39'),
 ('Parametro_Global', 'RADIO_PRESENCIALIDAD_METROS pasa a 100', 'CU39'),
 ('Parametro_Global', 'CHAT_FUERA_DE_ESCALAMIENTO = 1 (marca de la decisión, sin pantalla)', 'CU53 / CU62'),
 ('Palabra_Restringida.categoria', 'nueva categoría CRITICO (no bloquea: escala); 10 términos sembrados', 'CU57 / CU62'),
 ('Material_Terapeutico', '7 recursos con proposito = PREVENCION', 'CU51'),
 ('Documento_Clinico.categoria', 'nueva categoría INFORME_ALTA', 'CU37'),
 ('Bono.estado_validacion', 'nuevo estado PROVISORIO (y REGULARIZADO al regularizar)', 'CU72'),
 ('Derivacion_Interna.estado', 'PENDIENTE / ACEPTADA / RECHAZADA / CERRADA (la tabla existía sin uso)', 'CU65'),
 ('Evento_Critico (borrado)', 'se eliminaron los eventos con origen CHAT: el chat cifrado ya no escala', 'CU53 / CU62'),
]

# Cómo dibujarlo en el MERE (notación de Chen del anexo: rectángulo, óvalos, rombo)
MERE = [
 ('Entidad nueva', 'Evento_Critico', 'Rectángulo con sus óvalos (evento_critico_id subrayado). "terminos" va como atributo multivaluado (óvalo doble). Relaciones: Usuario —origina→ Evento_Critico (1:N, participación parcial); Usuario (administrador) —acusa→ Evento_Critico (1:N, parcial); Paciente —involucra→ Evento_Critico (1:N, parcial).'),
 ('Entidad nueva', 'Pauta_Ejercicio_Material', 'Rectángulo con sus óvalos. Relación con el ejercicio: Pauta_Ejercicio —tiene material→ Pauta_Ejercicio_Material (1:N; un ejercicio puede no tener material). Relación Usuario —sube→ Pauta_Ejercicio_Material (1:N). Si en el MERE el ejercicio sigue como atributo compuesto de Pauta_Tratamiento, el material va como atributo multivaluado compuesto dentro de "ejercicios".'),
 ('Atributo multivaluado', 'Pauta_Ejercicio.dias_semana', 'Óvalo doble "dias_semana" colgando del ejercicio.'),
 ('Atributos nuevos', 'Episodio_Clinico', 'Óvalos preparacion_alta_en, pautas_continuidad, informe_alta_emitido_en. Relación nueva Episodio_Clinico —tiene informe de alta→ Documento_Clinico (1:1, parcial en ambos lados).'),
 ('Atributos nuevos', 'Material_Terapeutico', 'Óvalos proposito e imagen_url.'),
 ('Atributo nuevo', 'Preferencia_Notificacion', 'Óvalo refuerzos.'),
 ('Atributos nuevos', 'Derivacion_Interna', 'Óvalos momento_respuesta, comentario_respuesta y momento_cierre. Las dos relaciones con Profesional (origen y destino) ya estaban.'),
 ('Atributos y relación', 'Bono', 'Óvalos financiador_manual, momento_registro_manual y regularizado_en. Relación nueva Usuario —registra manualmente→ Bono (1:N, parcial). La relación Bono–Financiador pasa a ser parcial del lado del bono (puede no tener financiador del catálogo).'),
 ('Atributos y relaciones', 'Mensaje_Chat', 'Atributo compuesto "adjunto" (url, public_id, nombre, formato, tipo_recurso, bytes, paginas), opcional. Relaciones nuevas: Paciente —conversa en→ Mensaje_Chat (1:N) y Profesional —conversa en→ Mensaje_Chat (1:N); Mensaje_Chat —comparte→ Documento_Clinico (N:1, parcial). La relación con Episodio_Clinico pasa a ser parcial.'),
 ('Atributo nuevo', 'Paciente', 'Óvalo foto_url.'),
 ('Atributo nuevo', 'Cita', 'Óvalo documentacion_pendiente.'),
 ('Especialización', 'Evaluacion_Satisfaccion', 'Se vuelve superclase con dos subclases disjuntas y totales (misma notación que Sede → Sede_Online / Sede_Presencial). La discriminante es "tipo". Evaluacion_Sesion lleva satisfecho y se relaciona con Cita (1:0..1). Evaluacion_Tratamiento se relaciona con Episodio_Clinico (1:0..1) y con Profesional (N:1, el profesional evaluado). puntuacion, reseña y los datos de moderación quedan en la superclase.'),
]

# ─────────────────────────────────────────────────────────────────────────────
#  Modelo físico (MySQL): lo que cambia en el diagrama Modelo_Físico del anexo
# ─────────────────────────────────────────────────────────────────────────────

# Claves foráneas nuevas: (tabla, columna, referencia, restricción en la base, cardinalidad)
FK_NUEVAS = [
 ('Evento_Critico', 'usuario_origen_id', 'Usuario(usuario_id)', 'FK sin nombre', 'N:1, opcional'),
 ('Evento_Critico', 'paciente_id', 'Paciente(paciente_id)', 'FK sin nombre', 'N:1, opcional'),
 ('Evento_Critico', 'acusado_por', 'Usuario(usuario_id)', 'FK sin nombre', 'N:1, opcional'),
 ('Pauta_Ejercicio_Material', 'pauta_ejercicio_id', 'Pauta_Ejercicio(pauta_ejercicio_id)', 'FK sin nombre', 'N:1, obligatoria'),
 ('Pauta_Ejercicio_Material', 'usuario_id', 'Usuario(usuario_id)', 'FK sin nombre', 'N:1, obligatoria'),
 ('Episodio_Clinico', 'informe_alta_documento_id', 'Documento_Clinico(documento_id)', 'fk_episodio_informe_alta', '1:0..1, opcional'),
 ('Bono', 'registrado_por_usuario_id', 'Usuario(usuario_id)', 'fk_bono_registrado_por', 'N:1, opcional'),
 ('Mensaje_Chat', 'paciente_id', 'Paciente(paciente_id)', 'fk_chat_paciente', 'N:1'),
 ('Mensaje_Chat', 'profesional_id', 'Profesional(profesional_id)', 'fk_chat_profesional', 'N:1'),
 ('Mensaje_Chat', 'documento_id', 'Documento_Clinico(documento_id)', 'fk_chat_documento', 'N:1, opcional'),
 ('Evaluacion_Satisfaccion', 'episodio_clinico_id', 'Episodio_Clinico(episodio_clinico_id)', 'fk_eval_episodio', '1:0..1 (UNIQUE), opcional'),
 ('Evaluacion_Satisfaccion', 'profesional_id', 'Profesional(profesional_id)', 'fk_eval_profesional', 'N:1, opcional'),
]

# Índices y restricciones únicas nuevas
INDICES_NUEVOS = [
 ('Evento_Critico', 'idx_evento_critico_estado (estado, momento_creacion)', 'INDEX', 'La bandeja lista primero los pendientes y los más recientes'),
 ('Mensaje_Chat', 'idx_chat_pareja (paciente_id, profesional_id, mensaje_id)', 'INDEX', 'Lee la conversación de una pareja en orden'),
 ('Evaluacion_Satisfaccion', 'uq_eval_episodio (episodio_clinico_id)', 'UNIQUE', 'Un tratamiento se califica una sola vez'),
]

# Columnas existentes que cambian de definición
COLUMNAS_QUE_CAMBIAN = [
 ('Bono', 'financiador_id', 'INT NOT NULL', 'INT NULL', 'El bono por contingencia puede no tener financiador del catálogo'),
 ('Mensaje_Chat', 'episodio_clinico_id', 'INT NOT NULL', 'INT NULL', 'La conversación es por pareja; el episodio queda como contexto'),
 ('Evaluacion_Satisfaccion', 'puntuacion', 'TINYINT NOT NULL', 'TINYINT NULL', 'La evaluación de sesión no lleva estrellas'),
 ('Evaluacion_Satisfaccion', 'cita_id', 'INT NOT NULL', 'INT NULL', 'La evaluación de tratamiento no tiene cita'),
]

# DDL equivalente a las migraciones 47 a 63 (sin los INSERT de datos sembrados)
DDL = """CREATE TABLE Evento_Critico (
  evento_critico_id INT PRIMARY KEY AUTO_INCREMENT,
  origen VARCHAR(20) NOT NULL,
  entidad VARCHAR(50) NOT NULL,
  entidad_id INT NULL,
  termino VARCHAR(80) NOT NULL,
  terminos JSON NULL,
  extracto VARCHAR(300) NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  momento_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  momento_acuse TIMESTAMP NULL DEFAULT NULL,
  usuario_origen_id INT NULL,
  paciente_id INT NULL,
  acusado_por INT NULL,
  FOREIGN KEY (usuario_origen_id) REFERENCES Usuario(usuario_id),
  FOREIGN KEY (paciente_id) REFERENCES Paciente(paciente_id),
  FOREIGN KEY (acusado_por) REFERENCES Usuario(usuario_id),
  INDEX idx_evento_critico_estado (estado, momento_creacion)
);

CREATE TABLE Pauta_Ejercicio_Material (
  pauta_ejercicio_material_id INT PRIMARY KEY AUTO_INCREMENT,
  pauta_ejercicio_id INT NOT NULL,
  nombre_original VARCHAR(255) NOT NULL,
  formato VARCHAR(10) NOT NULL,
  tipo_recurso VARCHAR(10) NOT NULL,
  url_publica VARCHAR(500) NOT NULL,
  public_id_cloud VARCHAR(255) NOT NULL,
  tamano_bytes INT NOT NULL,
  paginas INT NULL,
  momento_carga TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usuario_id INT NOT NULL,
  FOREIGN KEY (pauta_ejercicio_id) REFERENCES Pauta_Ejercicio(pauta_ejercicio_id),
  FOREIGN KEY (usuario_id) REFERENCES Usuario(usuario_id)
);

ALTER TABLE Episodio_Clinico
  ADD COLUMN preparacion_alta_en TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN pautas_continuidad TEXT NULL,
  ADD COLUMN informe_alta_documento_id INT NULL,
  ADD COLUMN informe_alta_emitido_en TIMESTAMP NULL DEFAULT NULL,
  ADD CONSTRAINT fk_episodio_informe_alta FOREIGN KEY (informe_alta_documento_id) REFERENCES Documento_Clinico(documento_id);

ALTER TABLE Material_Terapeutico
  ADD COLUMN proposito VARCHAR(20) NOT NULL DEFAULT 'TRATAMIENTO',
  ADD COLUMN imagen_url VARCHAR(255) NULL;

ALTER TABLE Preferencia_Notificacion
  ADD COLUMN refuerzos BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE Derivacion_Interna
  ADD COLUMN momento_respuesta TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN comentario_respuesta VARCHAR(255) NULL,
  ADD COLUMN momento_cierre TIMESTAMP NULL DEFAULT NULL;

ALTER TABLE Bono
  MODIFY COLUMN financiador_id INT NULL,
  ADD COLUMN financiador_manual VARCHAR(100) NULL,
  ADD COLUMN registrado_por_usuario_id INT NULL,
  ADD COLUMN momento_registro_manual TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN regularizado_en TIMESTAMP NULL DEFAULT NULL,
  ADD CONSTRAINT fk_bono_registrado_por FOREIGN KEY (registrado_por_usuario_id) REFERENCES Usuario(usuario_id);

ALTER TABLE Mensaje_Chat
  MODIFY COLUMN episodio_clinico_id INT NULL,
  ADD COLUMN paciente_id INT NULL,
  ADD COLUMN profesional_id INT NULL,
  ADD COLUMN adjunto_url VARCHAR(500) NULL,
  ADD COLUMN adjunto_public_id VARCHAR(255) NULL,
  ADD COLUMN adjunto_nombre VARCHAR(255) NULL,
  ADD COLUMN adjunto_formato VARCHAR(10) NULL,
  ADD COLUMN adjunto_tipo_recurso VARCHAR(10) NULL,
  ADD COLUMN adjunto_bytes INT NULL,
  ADD COLUMN adjunto_paginas INT NULL,
  ADD COLUMN documento_id INT NULL,
  ADD KEY idx_chat_pareja (paciente_id, profesional_id, mensaje_id),
  ADD CONSTRAINT fk_chat_paciente FOREIGN KEY (paciente_id) REFERENCES Paciente(paciente_id),
  ADD CONSTRAINT fk_chat_profesional FOREIGN KEY (profesional_id) REFERENCES Profesional(profesional_id),
  ADD CONSTRAINT fk_chat_documento FOREIGN KEY (documento_id) REFERENCES Documento_Clinico(documento_id);

ALTER TABLE Paciente ADD COLUMN foto_url VARCHAR(500) NULL;

ALTER TABLE Cita ADD COLUMN documentacion_pendiente BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE Pauta_Ejercicio ADD COLUMN dias_semana VARCHAR(20) NULL;

ALTER TABLE Evaluacion_Satisfaccion
  MODIFY COLUMN puntuacion TINYINT NULL,
  MODIFY COLUMN cita_id INT NULL,
  ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'SESION',
  ADD COLUMN satisfecho BOOLEAN NULL,
  ADD COLUMN episodio_clinico_id INT NULL,
  ADD COLUMN profesional_id INT NULL,
  ADD UNIQUE KEY uq_eval_episodio (episodio_clinico_id),
  ADD CONSTRAINT fk_eval_episodio FOREIGN KEY (episodio_clinico_id) REFERENCES Episodio_Clinico(episodio_clinico_id),
  ADD CONSTRAINT fk_eval_profesional FOREIGN KEY (profesional_id) REFERENCES Profesional(profesional_id);"""

# Cómo dibujarlo en el diagrama del modelo físico (Modelo_Físico_Inc3.drawio.png)
MF_DIBUJO = [
 'Agregar 2 tablas nuevas: Evento_Critico (13 columnas) y Pauta_Ejercicio_Material (11 columnas), con sus tipos, la PK marcada y las FK de la tabla siguiente.',
 'Sumar 31 columnas nuevas en 10 tablas existentes, con su tipo y si admiten NULL (tabla "Columnas nuevas").',
 'Cambiar a NULL las 4 columnas de la tabla "Columnas que cambian" (Bono.financiador_id, Mensaje_Chat.episodio_clinico_id, Evaluacion_Satisfaccion.puntuacion y .cita_id).',
 'Dibujar las 12 relaciones nuevas de la tabla "Claves foráneas nuevas", con la misma notación de patas de gallo del anexo. Las que salen de Evento_Critico y de Pauta_Ejercicio_Material conectan las tablas nuevas; las demás unen tablas que ya estaban.',
 'Marcar los 3 índices nuevos (idx_evento_critico_estado, idx_chat_pareja, uq_eval_episodio) si el diagrama del anexo muestra índices.',
 'El modelo físico no lleva las tablas que la 3FN separa solo en el modelo lógico (Pauta_Ejercicio_Dia, Evento_Critico_Termino, Origen_Evento_Critico, Evaluacion_Sesion y Evaluacion_Tratamiento): en MySQL esos datos viven en Pauta_Ejercicio.dias_semana, Evento_Critico.terminos (JSON), Evento_Critico.origen/entidad y Evaluacion_Satisfaccion.tipo.',
]

PARRAFO_VISTA_LOGICA = (
 'Para el Incremento 4, el modelo físico suma dos tablas y amplía diez. Evento_Critico guarda los textos que el filtro escala a '
 'supervisión, con su estado y el acuse del administrador. Pauta_Ejercicio_Material guarda los archivos de apoyo que el profesional '
 'sube a cada ejercicio. Episodio_Clinico incorpora la preparación y el informe de alta. Material_Terapeutico distingue los recursos de '
 'prevención. Derivacion_Interna registra la respuesta y el cierre. Bono admite el registro manual por contingencia. Mensaje_Chat pasa a '
 'agruparse por paciente y profesional y acepta adjuntos. Evaluacion_Satisfaccion separa la evaluación de cada sesión de la calificación '
 'del tratamiento. Paciente, Cita, Pauta_Ejercicio y Preferencia_Notificacion suman la foto de perfil, la documentación pendiente, los '
 'días de la semana y la preferencia de los mensajes de ánimo.'
)
