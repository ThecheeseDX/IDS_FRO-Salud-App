# Evolución de la documentación — Incrementos 1, 2 y 3

Este documento reúne, para cada artefacto de los informes, qué cambió del Incremento 1 al 2 y del Incremento 2 al 3, con el texto listo para pegar. La idea es que cada informe muestre su propio estado y explique lo que agregó respecto del anterior, en orden correlativo:

- **Informe del Incremento 1**: queda como línea base, con sus diagramas originales.
- **Informe del Incremento 2**: muestra sus diagramas y explica los cambios del 1 al 2 (bloques "Texto para el informe del Incremento 2").
- **Informe del Incremento 3**: muestra sus diagramas y explica los cambios del 2 al 3 (bloques "Texto para el informe del Incremento 3"). Si se quiere, al final de cada sección se puede agregar la tabla de evolución, que resume los tres incrementos en una sola vista.

Nota sobre el nombre: el sistema se llamó FRO Salud en los incrementos 1 y 2 y pasa a llamarse Punto Paz Salud en el Incremento 3. Los textos del Incremento 2 usan FRO Salud y los del Incremento 3, Punto Paz Salud.

Los informes no tienen un diagrama de clases: la Vista Lógica de los tres informes se representa con el modelo de datos (MERE, MR, normalización y Modelo Físico). Por eso la sección 3 cubre esa vista.

---

## 0. Antes de empezar: el informe del Incremento 1 fue sobrescrito

Para mostrar la evolución, el Incremento 1 tiene que conservar su estado original. Hoy no lo tiene. El 11 y el 14 de septiembre se reemplazaron en `IDS_Documentacion_Grupo17/Incremento 1/` los anexos y parte del Word por las versiones del Incremento 2:

| Archivo del Incremento 1 | Estado actual | Versión original |
|---|---|---|
| `Anexos/Diagrama_de_Componentes.drawio.png` | Idéntico al del Incremento 2 | commit `87b9e15` (18-06-2026) |
| `Anexos/Diagrama_de_Despliegue.drawio.png` | Idéntico al del Incremento 2 | commit `87b9e15` |
| `Anexos/MERE.drawio.png` | Idéntico al del Incremento 2 | commit `87b9e15` |
| `Anexos/Modelo_Físico.drawio.png` | Idéntico al del Incremento 2 | commit `87b9e15` |
| `Anexos/Árbol de Navegación` | Reemplazado | commit `87b9e15` (`Árbol de Navegación.png`) |
| `Entrega del Incremento 1.docx` | MR y formas normales con las tablas del Incremento 2, y fichas de CU corregidas | commit `87b9e15` |

Recomendación: restaurar en la carpeta del Incremento 1 las versiones del commit `87b9e15` y dejar las correcciones donde corresponden, es decir, en el informe del Incremento 2 como "cambios respecto del Incremento 1". Si el equipo prefiere mantener el Incremento 1 corregido, los textos de este documento siguen sirviendo, pero el informe del Incremento 1 ya no mostraría su estado real.

Comando para recuperar un archivo original (ejemplo con el diagrama de componentes), desde la carpeta `IDS_Documentacion_Grupo17`:

```bash
git show 87b9e15:"Incremento 1/Anexos/Diagrama_de_Componentes.drawio.png" > "Incremento 1/Anexos/Diagrama_de_Componentes.drawio.png"
```

---

## 1. Alcance y casos de uso

| Incremento | CU nuevos | Total acumulado |
|---|---|---|
| 1 | 22: CU01, CU02, CU03, CU04, CU05, CU11, CU12, CU13, CU14, CU15, CU16, CU20, CU28, CU29, CU30, CU32, CU36, CU38, CU40, CU59, CU68, CU70 | 22 |
| 2 | 31: CU06, CU07, CU08, CU09, CU10, CU17, CU18, CU22, CU23, CU24, CU27, CU31, CU33, CU34, CU35, CU39, CU41, CU42, CU43, CU46, CU47, CU48, CU49, CU66, CU67, CU69, CU71, CU76, CU77, CU78, CU79 | 53 |
| 3 | 20: CU19, CU21, CU25, CU26, CU44, CU45, CU50, CU52, CU53, CU55, CU56, CU57, CU58, CU60, CU61, CU63, CU64, CU73, CU74, CU75 | 73 |

### Texto para el informe del Incremento 2

El Incremento 2 incorpora 31 casos de uso a los 22 implementados en el Incremento 1, con lo que el sistema alcanza 53 casos de uso operativos. Los nuevos casos de uso amplían la gestión de la cuenta (restablecimiento y cambio de contraseña, sesiones por dispositivo y privacidad de datos, CU06 a CU09), el perfil público del profesional (CU10), la agenda (reprogramación, cancelación y trazabilidad, CU17, CU18 y CU22), la entrevista previa automatizada y su integración a la ficha (CU23, CU24 y CU27), el versionado de correcciones clínicas (CU31), el repositorio de documentos (CU33 a CU35), la evidencia de la atención (CU39, CU41, CU42 y CU43), las pautas de ejercicio (CU46 a CU49), los pagos y la integración con proveedores externos (CU66, CU67, CU69 y CU71), la máquina de estados de la cita (CU76), las plantillas de evaluación (CU77), el episodio clínico (CU78) y la segregación de interfaces por rol (CU79).

Además, al implementar el incremento se revisaron las fichas de los 22 casos de uso del Incremento 1 contra el comportamiento real del sistema y se actualizaron sus pasos, excepciones y actores según las decisiones de diseño D1 a D13. Las fichas corregidas reemplazan a las del Incremento 1.

### Texto para el informe del Incremento 3

El Incremento 3 incorpora 20 casos de uso a los 53 de los incrementos anteriores, con lo que el sistema alcanza 73 casos de uso operativos. Los nuevos casos de uso cubren las notificaciones multicanal y la agenda distribuida (confirmación de asistencia y lista de espera secuencial, CU52, CU21 y CU19), el triaje inteligente y las banderas rojas (reporte pre-clínico, sugerencia de especialidad y alerta por deterioro clínico, CU25, CU26 y CU50), la adherencia y el progreso del paciente (CU44 y CU45), la mensajería clínica cifrada con filtro de contenido (CU53 y CU57), la calidad del servicio (evaluación post-sesión, moderación de testimonios y calificación del profesional, CU55, CU56 y CU58), el soporte y el panel de gestión (CU60, CU61, CU63 y CU64) y las finanzas (cobro anticipado, actualización y devolución de transacciones y liquidación de ganancias, CU73, CU74 y CU75).

La implementación de este incremento también ajustó fichas de incrementos anteriores: el registro y el perfil del profesional suman las comunas de atención a domicilio y la gestión de sus bloques horarios (CU02 y CU10); la búsqueda de horas filtra por la comuna del paciente y ya no ofrece horas pasadas (CU14); la privacidad del paciente suma la opción de calificar como anónimo (CU09); la máquina de estados exige el pago para confirmar una cita, devuelve el pago al cancelar con anticipación y, al cerrar la sesión, recalcula la adherencia y solicita la evaluación (CU20, CU38 y CU76); el episodio clínico nace sin fecha de término (CU78), y los parámetros globales suman un buscador y 17 parámetros nuevos (CU59). Por decisión de diseño D1, la solicitud de confirmación de asistencia se emite solo para citas pagadas.

---

## 2. Diagramas de casos de uso

| Incremento | Diagramas nuevos | Diagramas anteriores actualizados |
|---|---|---|
| 1 | 22 | — |
| 2 | 31 | Los 22 del Incremento 1 (según las fichas corregidas) |
| 3 | 20 | Los de las fichas ajustadas (CU02, CU09, CU10, CU14, CU20, CU38, CU59, CU76, CU78) |

### Texto para el informe del Incremento 2

Se incorporan los diagramas de casos de uso de los 31 casos del incremento, construidos con la misma regla del Incremento 1: la burbuja central representa el caso de uso, cada paso de la descripción es una relación «include» y cada excepción es una relación «extend» que cuelga del paso donde ocurre. Los diagramas del Incremento 1 se actualizaron para reflejar sus fichas corregidas: en 11 de ellos cambian los actores, en 13 cambia la estructura de includes y extends, y en el resto solo cambia el texto de las burbujas.

### Texto para el informe del Incremento 3

Se incorporan los diagramas de casos de uso de los 20 casos del incremento, con la misma regla de construcción de los incrementos anteriores. Respecto de las fichas originales del Documento 0, en 7 diagramas cambian los actores (por ejemplo, la evaluación post-sesión pasa a ser responsabilidad del Paciente y la emisión de notificaciones suma al Administrador), en 16 cambia la estructura de includes y extends, y en los 20 se actualiza el texto de las burbujas. El detalle de cada cambio está en `Diagramas-CU-cambios-Inc3.md`.

---

## 3. Vista lógica: base de datos

### Evolución en cifras

| Artefacto | Incremento 1 | Incremento 2 | Incremento 3 |
|---|---|---|---|
| MR (tablas antes de normalizar) | 29 | 32 | 40 |
| Primera y segunda forma normal | 37 | 42 | 53 |
| Tercera forma normal (= tablas del modelo físico) | 39 | 44 | 55 |

### 3.1 MERE

#### Texto para el informe del Incremento 2

El Modelo Entidad-Relación Extendido conserva la estructura del Incremento 1 y se amplía con las entidades que requieren los nuevos casos de uso:

- **Sesion_Usuario**, relacionada con Usuario por "Abre" (1 : N), para gestionar sesiones por dispositivo y revocarlas (CU05 y CU08).
- **Triaje**, relacionada con Paciente por "Responde" (1 : N), que guarda la entrevista previa reanudable (CU23 y CU24).
- **Evolucion_Version**, relacionada con Evolucion_Clinica por "Corrige" y con Profesional por "Redacta" (1 : N en ambos casos), para las correcciones auditadas de registros cerrados (CU31).
- **Documento_Clinico**, relacionada con Paciente ("Adjunta"), Profesional ("Carga") y, opcionalmente, Episodio_Clinico ("Contiene"), para el repositorio multimedia (CU33 a CU35).
- **Pauta_Ejercicio**, que deja de ser un atributo multivaluado de Pauta_Tratamiento y pasa a entidad, relacionada con Pauta_Tratamiento por "Compone" y con Material_Terapeutico por "Ilustra".
- **Pauta_Cumplimiento**, relacionada con Pauta_Ejercicio por "Registra" (1 : N), para la marca diaria de cumplimiento (CU48).
- **Bloqueo_Agenda**, relacionada con Profesional, que respalda la restricción de disponibilidad (CU16).

Se elimina la relación "Usa" entre Pauta_Tratamiento y Material_Terapeutico: el material queda asociado a cada ejercicio. Las entidades existentes suman atributos: Paciente agrega privacidad_contacto; Profesional agrega areas_experticia y la modalidad en cada bloque de su disponibilidad horaria; Cita agrega modalidad, evidencia_presencial, firma_conformidad_datos, sesion_certificada_en, certificacion_tipo, sesion_suspendida_en y motivo_suspension, renombra metadatos_consulta como metadatos_teleconsulta y se relaciona con Episodio_Clinico; el estado de la Cita admite siete valores y el del Episodio_Clinico, ABIERTO y CERRADO.

#### Texto para el informe del Incremento 3

El MERE del Incremento 3 conserva el modelo anterior y suma las entidades de los nuevos casos de uso:

- **Preferencia_Notificacion**, relacionada con Usuario por "Configura" (1 : 1), y **Dispositivo_Push**, relacionada con Usuario por "Registra" (1 : N), para las notificaciones multicanal (CU52).
- **Solicitud_Confirmacion**, relacionada con Cita por "Solicita" (1 : 1), para la confirmación de asistencia (CU21).
- **Reporte_Preclinico**, relacionada con Triaje ("Sintetiza", 1 : 1), Paciente ("Posee", 1 : N) y Especialidad ("Sugiere", 1 : N) (CU25 y CU26).
- **Reporte_Sintoma** y **Alerta_Clinica**: el Paciente reporta síntomas (1 : N), el reporte genera alertas (1 : N) y el Profesional las revisa (1 : N) (CU50).
- **Indicador_Adherencia**, relacionada con Paciente por "Mide" (1 : N, una medición por día) (CU44 y CU45).
- **Palabra_Restringida**, administrada por el Usuario administrador (1 : N) (CU57).
- **Liquidacion**, relacionada con Profesional ("Recibe") y con el administrador que la emite ("Emite") (CU75).

Además se agregan dos atributos multivaluados que la normalización convierte en tablas: las áreas de soporte que atiende cada administrador (CU61) y las comunas en que atiende cada profesional, como relación "Atiende en" entre Profesional y Comuna (N : M). Las entidades existentes suman atributos: Notificacion (titulo, datos), Lista_Espera (estado, momento_notificacion, momento_expira, token_cupo), Mensaje_Chat (leido y la relación "Envía" con su remitente), Evaluacion_Satisfaccion (motivo_rechazo, momento_moderacion y la relación "Modera" con el administrador), Ticket_Soporte (momento_enrutamiento, adjunto_url, resolucion y la relación "Atiende" con el operador asignado) y Paciente (resena_anonima).

### 3.2 Modelo Relacional

#### Texto para el informe del Incremento 2

El Modelo Relacional pasa de 29 a 32 tablas. Se agregan Sesion_Usuario, Triaje, Documento_Clinico y Bloqueo_Agenda, y se elimina Pauta_Material, cuyo vínculo con el material terapéutico pasa a cada ejercicio. En las tablas existentes, Paciente suma privacidad_contacto; Profesional suma areas_experticia y la modalidad dentro del grupo repetitivo disponibilidad_horaria {dia, inicio, fin, modalidad}; Evolucion_Clinica suma el grupo repetitivo correcciones {numero, texto, fecha, profesional}; Pauta_Tratamiento detalla su grupo repetitivo ejercicios {nombre, series, repeticiones, frecuencia, material, fechas_cumplidas}; y Cita suma modalidad, evidencia_presencial, firma_conformidad_datos, sesion_certificada_en, certificacion_tipo, sesion_suspendida_en, motivo_suspension, metadatos_teleconsulta y la clave foránea episodio_clinico_id.

#### Texto para el informe del Incremento 3

El Modelo Relacional pasa de 32 a 40 tablas con la incorporación de Preferencia_Notificacion, Solicitud_Confirmacion, Reporte_Preclinico, Indicador_Adherencia, Reporte_Sintoma, Alerta_Clinica, Liquidacion y Palabra_Restringida. Usuario suma los grupos repetitivos dispositivos_push {token, plataforma, activo, momento_registro} y areas_soporte {categoria}, y Profesional suma comunas_atencion {comuna}. Se agregan atributos en Paciente (resena_anonima), Lista_Espera (estado, momento_notificacion, momento_expira, token_cupo), Evaluacion_Satisfaccion (motivo_rechazo, momento_moderacion, moderador_id), Notificacion (titulo, datos), Ticket_Soporte (momento_enrutamiento, adjunto_url, resolucion, asignado_a) y Mensaje_Chat (leido, remitente_usuario_id). Las claves primarias se marcan con subrayado continuo y las foráneas con subrayado discontinuo.

### 3.3 Normalización

#### Texto para el informe del Incremento 2

La normalización aplica los mismos criterios del Incremento 1 a las tablas nuevas. En la primera forma normal, los grupos repetitivos agregados se separan en tablas propias: las correcciones de una evolución dan origen a Evolucion_Version y las fechas de cumplimiento de cada ejercicio, a Pauta_Cumplimiento; Pauta_Ejercicio adopta una clave propia (pauta_ejercicio_id) y referencia al material terapéutico. Las columnas que guardan estructuras (evidencia presencial, firma de conformidad, respuestas del triaje y privacidad) se tratan como un único valor de tipo JSON. En la segunda forma normal no aparecen dependencias parciales nuevas, y en la tercera se mantienen las separaciones del Incremento 1 (Rol, Contacto_Emergencia, el financiador en Bono y el monto diferencial en Transaccion). Con ello, la primera y la segunda forma normal pasan de 37 a 42 tablas y la tercera, de 39 a 44, que coincide con el esquema físico implementado.

#### Texto para el informe del Incremento 3

En la primera forma normal, los tres grupos repetitivos nuevos se separan en tablas: dispositivos_push de Usuario da origen a Dispositivo_Push; areas_soporte de Usuario, a Area_Soporte_Operador; y comunas_atencion de Profesional, a Profesional_Comuna. Las demás tablas nuevas ya llegan atómicas. En la segunda forma normal, las tablas con clave compuesta (Area_Soporte_Operador y Profesional_Comuna) no tienen atributos fuera de la clave, por lo que no hay dependencias parciales que separar. En la tercera forma normal, Reporte_Preclinico guarda la clave de la especialidad sugerida y no su nombre, y Alerta_Clinica referencia el reporte de síntomas en lugar de repetir sus valores; Liquidacion conserva su monto total de forma deliberada, porque una liquidación emitida es una fotografía inalterable del cálculo. La primera y la segunda forma normal pasan de 42 a 53 tablas y la tercera, de 44 a 55.

### 3.4 Modelo Físico

#### Texto para el informe del Incremento 2

El Modelo Físico refleja las tablas creadas en MySQL. Respecto del Incremento 1 se agregan Sesion_Usuario, Triaje, Evolucion_Version, Documento_Clinico, Pauta_Cumplimiento y Bloqueo_Agenda, y se elimina Pauta_Material. En las tablas existentes: Paciente suma privacidad_contacto (JSON); Profesional suma areas_experticia; Profesional_Disponibilidad suma modalidad (DOMICILIO, ONLINE o AMBOS); Pauta_Ejercicio cambia su clave compuesta por pauta_ejercicio_id y suma series, repeticiones, frecuencia y material_terapeutico_id; Cita suma modalidad, evidencia_presencial y firma_conformidad_datos (JSON), sesion_certificada_en, certificacion_tipo, sesion_suspendida_en, motivo_suspension y la clave foránea episodio_clinico_id, y su estado admite los valores de cancelación por paciente y por profesional; Episodio_Clinico toma ABIERTO como estado por defecto. Las tablas se crean y actualizan con migraciones automáticas sobre la base gestionada en la nube.

#### Texto para el informe del Incremento 3

El Modelo Físico suma once tablas: Preferencia_Notificacion, Dispositivo_Push, Solicitud_Confirmacion, Reporte_Preclinico, Reporte_Sintoma, Alerta_Clinica, Indicador_Adherencia, Palabra_Restringida, Area_Soporte_Operador, Liquidacion y Profesional_Comuna. Se modifican siete tablas existentes: Notificacion (titulo y datos JSON), Lista_Espera (estado, momento_notificacion, momento_expira, token_cupo y unicidad por cita y paciente), Mensaje_Chat (remitente_usuario_id y leido), Evaluacion_Satisfaccion (estado_moderacion pasa de booleano a PENDIENTE, APROBADA o RECHAZADA, y suma motivo_rechazo, moderador_id y momento_moderacion), Ticket_Soporte (asignado_a, momento_enrutamiento, adjunto_url y resolucion), Paciente (resena_anonima) y Episodio_Clinico (fecha_terminado queda vacía hasta el cierre). Parametro_Global incorpora 17 parámetros nuevos sin cambiar su estructura. En total, la base cuenta con 55 tablas.

---

## 4. Vista de proceso: diagramas de secuencia

| Incremento | CU con diagramas | Diagramas (principal + excepciones, por rol) |
|---|---|---|
| 1 | 22 | 163 |
| 2 | 31 | 239 |
| 3 | 20 | 129 |

### Texto para el informe del Incremento 2

La Vista de Proceso incorpora los diagramas de secuencia de los 31 casos de uso del incremento, con la convención del Incremento 1: un diagrama por flujo principal y uno por cada excepción, repetidos por rol cuando el caso de uso tiene varios actores, en total 239 diagramas. Se mantienen las líneas de vida del Incremento 1 (actor, vista, API REST, API Adapter, Seguridad JWT/BCrypt, Motor de Agendamiento, Capa de Acceso a Datos, MySQL y las tablas). Lo que cambia es que el "Proveedor Externo" genérico que el Incremento 1 conectaba al API Adapter se concreta en los servicios que ahora participan de los flujos: Brevo para el correo, Cloudinary para los archivos, y las APIs de transacciones y de bonos electrónicos para los pagos.

### Texto para el informe del Incremento 3

La Vista de Proceso incorpora los diagramas de secuencia de los 20 casos de uso del incremento, en total 129 diagramas, con la misma convención de los incrementos anteriores. Aparecen como líneas de vida los seis componentes internos nuevos del Controlador (Despachador de Notificaciones, Programador de Agenda, Motor Clínico, Filtro de Contenido, Cifrado de Mensajería y Generador de Informes) y el servicio externo Expo Push. Todos los diagramas parten del actor y vuelven a él: los procesos que el servidor ejecuta por temporizador se representan a partir de la acción del usuario que también los dispara, y los que ocurren dentro de la acción de otro usuario se indican con una nota.

---

## 5. Vista de desarrollo: diagrama de componentes

### Texto para el informe del Incremento 2

El Diagrama de Componentes mantiene la arquitectura de tres bloques del Incremento 1 (Vista, Controlador y Bases de Datos) y sus componentes internos (API REST, API Adapter, Seguridad JWT/BCrypt, Motor de Agendamiento y Capa de Acceso a Datos). El cambio está en los servicios externos, que pasan de componentes genéricos a los proveedores efectivamente integrados: el Bucket S3 se reemplaza por la API de Cloudinary, el Servicio SMTP por la API de Brevo, el Servidor Push por la API de Expo Push y el Modelo GPT-4o-mini por la API de OpenAI. Las APIs de Transacciones y de Bonos Electrónicos se mantienen, y todos los servicios externos se siguen consumiendo exclusivamente a través del API Adapter.

### Texto para el informe del Incremento 3

El Diagrama de Componentes conserva la arquitectura de tres bloques y las integraciones externas del Incremento 2, y suma seis componentes internos al Controlador, todos invocados por la API REST y apoyados en la Capa de Acceso a Datos:

- **Despachador de Notificaciones**: punto único de salida de los avisos. Los guarda en el centro de notificaciones y los envía por push y correo (CU52 y todos los casos que notifican).
- **Programador de Agenda**: temporizador que emite las solicitudes de confirmación y vence los turnos de la lista de espera (CU21 y CU19).
- **Motor Clínico**: análisis del triaje, banderas rojas, sugerencia de especialidad, índice de adherencia y deterioro clínico (CU25, CU26, CU44 y CU50).
- **Filtro de Contenido**: contrasta los textos del chat y de las reseñas con el diccionario de términos restringidos (CU57, CU53 y CU55).
- **Cifrado de Mensajería**: cifra y descifra los mensajes del chat clínico con AES-256-GCM (CU53).
- **Generador de Informes**: compila los informes operativos en XLSX, PDF y CSV (CU63).

---

## 6. Vista física: diagrama de despliegue

### Texto para el informe del Incremento 2

El Diagrama de Despliegue mantiene los nodos del Incremento 1 y precisa la infraestructura en que efectivamente opera el sistema. El Servidor de Aplicaciones, antes previsto sobre AWS EC2 o un VPS con 2 vCPU, 2 GB de RAM y 40 GB de disco, pasa a la plataforma como servicio Render.com. El Servidor de Base de Datos se identifica como el servicio gestionado Aiven.io. El Servidor de Notificación declara sus proveedores (Brevo para el correo y Expo Push para las alertas), y el Servidor de Cloud Storage, el servicio Cloudinary con distribución por red de contenidos.

### Texto para el informe del Incremento 3

El Diagrama de Despliegue mantiene la topología del Incremento 2 y la actualiza con lo incorporado en este incremento:

- **Servidor de Aplicaciones**: suma la ejecución de los componentes nuevos (despacho de notificaciones, tareas programadas de agenda, análisis del triaje, filtro de contenido, cifrado de mensajería, generación de informes) y sirve las páginas web que se abren desde los correos. Deja de ejecutar WebSockets, porque la mensajería clínica funciona por consulta periódica.
- **Navegador Web** reemplaza al nodo "PC Administrador": el administrador opera desde la aplicación móvil, y el navegador es donde el paciente abre los enlaces del correo para confirmar una cita o tomar un cupo liberado.
- **Dispositivo Móvil**: suma el registro del token de notificaciones push, la consulta periódica de mensajes, la retención de envíos sin conexión y la descarga de informes.
- **Servidor de Base de Datos**: suma el almacenamiento de mensajes cifrados, notificaciones y liquidaciones.
- **Servidor de Notificación**: suma el envío de los enlaces de confirmación y de cupo.
- **Servidor de Cloud Storage**: suma las fotografías de perfil y los adjuntos de los tickets.
- **Servidor Pasarela de Pago**: se declara simulada en esta versión.

---

## 7. Árbol de navegación

| Incremento | Interfaces | Funcionalidades |
|---|---|---|
| 1 | 13 | 20 |
| 2 | 33 | 64 |
| 3 | 60 | 125 |

### Texto para el informe del Incremento 2

El Árbol de Navegación del Incremento 2 extiende el del Incremento 1 y organiza las interfaces autenticadas según el rol (CU79): desde Inicio de Sesión se deriva a Inicio Paciente, Gestión Profesional o Gestión de Parámetros (inicio del Administrador). Se agregan Recuperar Contraseña y Seguridad de la Cuenta (común a los tres roles); para el paciente, Mis Citas, Entrevista Previa, Mis Ejercicios, Pagos y Bonos, Mis Documentos con su Visor y Evidencia de Sesión; para el profesional, Mi Jornada, Mi Perfil Público, Firma de Conformidad y Documentos del Paciente; y para el administrador, Sesiones Suspendidas. La Ficha Clínica se descompone en cinco pestañas (Historial, Anamnesis, Episodios, Sesión Clínica y Pautas): Gestión de Agenda pasa a ser la pestaña Historial y Atención Clínica, la pestaña Sesión Clínica. El árbol pasa de 13 a 33 interfaces y de 20 a 64 funcionalidades.

### Texto para el informe del Incremento 3

El Árbol de Navegación del Incremento 3 conserva la organización por rol y cambia la forma de navegar: el paciente y el profesional pasan a una barra de navegación inferior. La barra del paciente tiene cinco secciones: Inicio (Mis Citas), Mi Tratamiento (con las pestañas Mi Progreso, Mis Ejercicios, Mi Seguimiento y Entrevista Previa), el botón ＋ para agendar, Mensajes (con Mis Documentos) y Mi Perfil, que reúne la seguridad, la privacidad, la ayuda y soporte y el cierre de sesión. La del profesional tiene cuatro: Inicio (fichas y banderas rojas), Mi Jornada, Mensajes y Perfil, que parte del perfil público y suma la seguridad, Mis Liquidaciones, la ayuda y soporte y el cierre de sesión. El Panel de Administración reemplaza a Gestión de Parámetros como inicio del Administrador.

Se agregan las interfaces de los nuevos casos de uso: Centro de Notificaciones (común a los tres roles), Mi Tratamiento, Mi Seguimiento, Mi Progreso, Mensajes y Chat Clínico, Ayuda y Soporte, Pagar tu Hora, Perfil del Profesional y Evaluaciones del Profesional, Mis Horarios de Atención y Mis Liquidaciones, y, para el administrador, Bandeja de Soporte, Informes Operativos, Liquidaciones, Moderar Testimonios y Términos Restringidos. Las dos páginas que se abren desde el correo (Confirmación por Correo y Tomar Cupo por Correo) se representan como interfaces con la nota "desde el correo". El árbol pasa de 33 a 60 interfaces y de 64 a 125 funcionalidades.

---

## 8. Vistas del sistema (pantallas)

### Texto para el informe del Incremento 2

Las pantallas del Incremento 2 suman las interfaces de los nuevos casos de uso. La Ficha Clínica pasa a ser una pantalla única con cinco pestañas, la Sesión Clínica concentra en tres pasos el registro de la intervención, y cada rol cuenta con su propia pantalla de inicio.

### Texto para el informe del Incremento 3

En el Incremento 3 la aplicación adopta la identidad de Punto Paz Salud: nuevo nombre, logotipo y paleta (azul verdoso #003B4D como color principal y café #8B7140 como acento, sobre base blanca), aplicados de forma centralizada a todas las pantallas. La navegación de paciente y profesional se reorganiza en barras inferiores, los perfiles reúnen seguridad, ayuda y cierre de sesión, y se agregan las pantallas de notificaciones, mensajería, progreso, seguimiento, soporte, pagos, liquidaciones y administración del incremento.

---

## 9. Resumen de la evolución

| Artefacto | Incremento 1 | Incremento 2 | Incremento 3 |
|---|---|---|---|
| Casos de uso (acumulado) | 22 | 53 | 73 |
| Diagramas de casos de uso nuevos | 22 | 31 | 20 |
| Tablas MR | 29 | 32 | 40 |
| Tablas en 1FN y 2FN | 37 | 42 | 53 |
| Tablas en 3FN y modelo físico | 39 | 44 | 55 |
| Diagramas de secuencia | 163 | 239 | 129 |
| Componentes internos del Controlador | 5 | 5 | 11 |
| Servicios externos en componentes | Genéricos (S3, SMTP, Push, GPT-4o-mini) | Proveedores reales (Cloudinary, Brevo, Expo Push, OpenAI) | Sin cambios |
| Infraestructura del servidor | AWS EC2 / VPS | Render.com | Render.com |
| Árbol de navegación (interfaces / funcionalidades) | 13 / 20 | 33 / 64 | 60 / 125 |
| Navegación | Árbol único | Organizada por rol | Barras inferiores por rol |
| Nombre del sistema | FRO Salud | FRO Salud | Punto Paz Salud |
