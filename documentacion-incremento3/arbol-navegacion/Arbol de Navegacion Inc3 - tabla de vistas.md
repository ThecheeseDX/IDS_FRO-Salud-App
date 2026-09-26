# Árbol de Navegación — Incremento 3

Texto y tabla listos para la sección "Árbol de Navegación" del informe. La figura es
`Arbol de Navegacion Inc3.png` (alta resolución) y su fuente editable es
`Arbol de Navegacion Inc3.drawio` (se abre en app.diagrams.net).

## Texto propuesto para la sección

A continuación se presenta el Árbol de Navegación correspondiente al Incremento 3 de Punto Paz Salud. Como se detalla en la Figura X, el diagrama extiende el árbol del Incremento 2 con las vistas incorporadas en este incremento y mantiene la organización por rol (CU79): Paciente, Profesional y Administrador. Las vistas Seguridad de la Cuenta y Centro de Notificaciones son transversales a los tres roles; Mensajes, Chat Clínico, Soporte, Evidencia de Sesión, Evaluaciones del Profesional y Visor de Documento son compartidas y se representan bajo cada flujo que las utiliza. Las dos páginas que se abren desde el correo electrónico (Confirmación por Correo y Tomar Cupo por Correo) se dibujan como interfaces con la nota "desde el correo", porque son la entrada asíncrona del paciente a los casos de uso CU21 y CU19. El Panel de Administración pasa a ser la vista de inicio del Administrador, desde la que cuelgan las herramientas de gestión.

Para examinar el diagrama con total claridad, favor consultar el archivo de alta resolución "Arbol de Navegacion Inc3.png" adjunto a esta entrega.

## Tabla de vistas y casos de uso

Estado: **Inc 1 / Inc 2** = ya existía; **Inc 3** = nueva; **→ Inc 3** = existía y ahora suma CU.

### Acceso (sin sesión)

| Vista | CUs | Funcionalidad | Estado |
|---|---|---|---|
| V_Registro | CU01, CU02, CU03 | Registrar paciente, registrar profesional, controlar unicidad | Inc 1 |
| V_Activacion_Cuenta | CU04 | Verificar identidad por OTP | Inc 1 |
| V_Inicio_Sesion | CU05, CU79 | Autenticar usuario y derivar a la pila de su rol | Inc 2 |
| V_Recuperar_Contrasena | CU06, CU07 | Solicitar restablecimiento y cambiar contraseña con código | Inc 2 |

### Transversales (todos los roles)

| Vista | CUs | Funcionalidad | Estado |
|---|---|---|---|
| V_Seguridad_Cuenta | CU07, CU08, CU09, CU58 | Sesiones activas, cambio de contraseña, privacidad de contacto y nombre o anónimo en reseñas (CU09 y CU58 solo paciente) | Inc 2 → Inc 3 |
| V_Centro_Notificaciones | CU52 | Bandeja de avisos con globo de no leídos (campana en cada inicio), salto a la pantalla del aviso y preferencias de canal push y correo | Inc 3 |
| V_Panel_Acceso_Restringido | CU12 | Control de acceso RBAC | Inc 1 |
| V_Consola_Auditoria | CU13 | Bitácora de auditoría | Inc 1 |

### Paciente

| Vista | CUs | Funcionalidad | Estado |
|---|---|---|---|
| V_Inicio_Paciente | — | Panel de entrada del paciente (accesos a citas, entrevista, seguimiento, progreso, ejercicios, pagos, mensajes, soporte, documentos y seguridad) | Inc 2 → Inc 3 |
| V_Mis_Citas | CU18, CU19, CU20, CU21, CU22, CU55, CU74 | Listado de citas e historial; confirmar asistencia; cancelar; lista de espera y tomar cupo; calificar la atención; cambiar sesión a plan; ver trazabilidad | Inc 2 → Inc 3 |
| V_Agendamiento_Cita | CU14, CU15, CU17, CU19, CU58 | Buscar/seleccionar cita con la calificación del profesional, controlar concurrencia, reprogramar, inscribirse en un bloque ocupado | Inc 1 → Inc 3 |
| V_Pagar_Hora | CU73 | Pagar la sesión suelta, comprar un plan de 10/15/20 o usar una sesión del plan tras reservar | Inc 3 |
| V_Evaluaciones_Profesional | CU58 | Promedio, cantidad de evaluaciones y reseñas aprobadas con autor o anónimo | Inc 3 |
| V_Confirmacion_Correo | CU21 | Página web del enlace del correo: detalle de la cita y botones confirmar / cancelar | Inc 3 (desde el correo) |
| V_Tomar_Cupo_Correo | CU19 | Página web del enlace del correo: cupo liberado, tiempo restante y botón "Tomar el cupo" | Inc 3 (desde el correo) |
| V_Evidencia_Sesion | CU39, CU43 | Marca GPS de presencialidad y evidencia de teleconsulta | Inc 2 |
| V_Entrevista_Previa | CU23, CU24, CU25, CU26, CU27 | Disclaimer, triaje automatizado, traspaso a la ficha; al cerrar genera el reporte pre-clínico y muestra la sugerencia de especialidad | Inc 2 → Inc 3 |
| V_Mi_Seguimiento | CU50 | Reporte de dolor y limitación funcional entre sesiones; alerta por deterioro clínico | Inc 3 |
| V_Mi_Progreso | CU44, CU45 | Panel de progreso: adherencia, curva de síntomas y asistencia, con rango de fechas; recalcula el índice de adherencia | Inc 3 |
| V_Mis_Ejercicios | CU44, CU48, CU49 | Cumplimiento diario de la pauta, control de vigencia y actualización del índice de adherencia | Inc 2 → Inc 3 |
| V_Pagos_Bonos | CU66, CU67, CU68, CU69, CU70, CU74 | Bonos, copagos, planes, historial de pagos y devoluciones | Inc 2 → Inc 3 |
| V_Mensajes | CU53 | Bandeja de conversaciones por episodio, con foto del profesional y no leídos | Inc 3 |
| V_Chat_Clinico | CU53, CU57 | Mensajería cifrada con filtro de contenido restringido | Inc 3 |
| V_Soporte | CU60, CU61 | Registrar y seguir solicitudes de soporte con captura opcional; el ticket se enruta al crearse | Inc 3 |
| V_Mis_Documentos | CU35 | Repositorio del paciente | Inc 2 |
| V_Visor_Documento | CU35 | Visor embebido (imagen, PDF, DOCX, video) | Inc 2 |

### Profesional

| Vista | CUs | Funcionalidad | Estado |
|---|---|---|---|
| V_Gestion_Profesional | CU11, CU50 | Panel del profesional: nómina de pacientes y panel de banderas rojas | Inc 1 → Inc 3 |
| V_Mi_Jornada | CU11 | Agenda del día con acceso directo a la ficha | Inc 2 |
| V_Gestion_Disponibilidad | CU16 | Restringir disponibilidad | Inc 1 |
| V_Mi_Perfil_Publico | CU10, CU58 | Catálogo de perfil profesional, comunas de atención y su calificación | Inc 2 → Inc 3 |
| V_Mis_Horarios_Atencion | CU02 | Agregar, editar y eliminar los bloques horarios semanales | Inc 3 |
| V_Evaluaciones_Profesional | CU58 | Sus evaluaciones publicadas | Inc 3 |
| V_Mis_Liquidaciones | CU75 | Historial de liquidaciones emitidas, solo lectura | Inc 3 |
| V_Mensajes / V_Chat_Clinico | CU53, CU57 | Conversaciones con sus pacientes | Inc 3 |
| V_Soporte | CU60, CU61 | Solicitudes de soporte del profesional | Inc 3 |
| V_Ficha_Clinica | CU28 | Consolidar ficha clínica (contenedor de pestañas) | Inc 1 |
| V_Gestion_Agenda (pestaña Historial) | CU18, CU20, CU22, CU25, CU31, CU38, CU41, CU44, CU55, CU71, CU73, CU76 | Transiciones de la cita (confirmar solo con pago), marcas temporales, validación multi-factor, correcciones, cuadratura de coberturas, reporte pre-clínico, adherencia del paciente; el cierre de la sesión dispara la evaluación al paciente | Inc 1 → Inc 3 |
| V_Anamnesis (pestaña) | CU29, CU77 | Antecedentes con plantilla dinámica | Inc 2 |
| V_Episodios (pestaña) | CU78 | Episodios clínicos | Inc 2 |
| V_Atencion_Clinica (pestaña Sesión Clínica) | CU30, CU32, CU36, CU40 | Intervención, objetivos, inalterabilidad y firma digital | Inc 1 |
| V_Pautas (pestaña) | CU46, CU47, CU49 | Prescripción de pautas | Inc 2 |
| V_Evidencia_Sesion | CU39, CU43 | Marca GPS y evidencia de teleconsulta | Inc 2 |
| V_Firma_Conformidad | CU42 | Firma manuscrita del paciente | Inc 2 |
| V_Documentos_Paciente | CU33, CU34, CU35 | Subir, categorizar y abrir documentos | Inc 2 |
| V_Visor_Documento | CU35 | Visor embebido | Inc 2 |

### Administrador

| Vista | CUs | Funcionalidad | Estado |
|---|---|---|---|
| V_Panel_Administracion | CU64 | Inicio del administrador: KPIs con rango de fechas, pendientes de gestión y accesos a las herramientas | Inc 3 |
| V_Gestion_Parametros | CU16, CU59 | Parámetros globales (con buscador) y restricción administrativa de disponibilidad | Inc 1 → Inc 2 |
| V_Sesiones_Suspendidas | CU41 | Bandeja de sesiones derivadas por discrepancias multi-factor | Inc 2 |
| V_Bandeja_Soporte | CU61 | Tickets enrutados por área, contacto del solicitante, tomar y resolver | Inc 3 |
| V_Informes_Operativos | CU63 | Informes de asistencia, recaudación y adherencia en XLSX, PDF o CSV | Inc 3 |
| V_Liquidaciones | CU75 | Liquidación mensual por profesional, con bonificación; emisión inalterable | Inc 3 |
| V_Moderar_Testimonios | CU56 | Aprobar o rechazar con causal las reseñas de los pacientes | Inc 3 |
| V_Terminos_Restringidos | CU57 | Diccionario de términos no permitidos | Inc 3 |

## Diferencias respecto al árbol del Incremento 2

- **Panel de Administración** reemplaza a Gestión de Parámetros como vista de inicio del Administrador; Gestión de Parámetros y Sesiones Suspendidas pasan a colgar del panel.
- **Centro de Notificaciones** se representa una sola vez, bajo Inicio de Sesión, con la nota "los tres roles, desde la campana", igual que Seguridad de la Cuenta.
- **Mensajes → Chat Clínico** y **Soporte** son compartidas por Paciente y Profesional y se dibujan bajo cada uno, como ya se hacía con Evidencia de Sesión.
- **Confirmación por Correo** y **Tomar Cupo por Correo** son páginas web que se abren desde el correo electrónico (no pantallas de la aplicación); se dibujan bajo Mis Citas con la nota "desde el correo".
- Sin vista propia (corren en el servidor): CU25 se genera al cerrar la entrevista, CU44 se recalcula solo, CU52 despacha los avisos, CU61 enruta al crear el ticket. Se muestran como funcionalidades de la vista que los dispara, igual que en los incrementos anteriores.
- Los demás cambios son CU que se suman a vistas existentes (Mis Citas, Agendamiento, Entrevista Previa, Mis Ejercicios, Pagos y Bonos, Gestión Profesional, Mi Perfil Público, Historial de la ficha y Seguridad de la Cuenta).
