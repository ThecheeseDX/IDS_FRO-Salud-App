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
