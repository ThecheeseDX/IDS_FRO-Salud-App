# Diagrama de Componentes: Incremento 4

- **Figura:** `Diagrama de Componentes Inc4.png` (alta resolución).
- **Fuente editable:** `Diagrama de Componentes Inc4.drawio` (se abre en app.diagrams.net).
- **Generador:** `generar_componentes.py`.

## Texto propuesto para la Vista de Desarrollo

La Figura X presenta el Diagrama de Componentes actualizado al Incremento 4. Conserva la arquitectura de tres bloques: Vista (cliente móvil React Native), Controlador (servidor Node.js/Express) y Bases de Datos (MySQL). Los servicios externos se siguen consumiendo exclusivamente a través del API Adapter.

Respecto del Incremento 3, el Controlador incorpora seis componentes internos nuevos. Todos son invocados por la API REST y se apoyan en la Capa de Acceso a Datos. Los que emiten avisos lo hacen a través del Despachador de Notificaciones:

| Componente | Responsabilidad | Casos de uso |
|---|---|---|
| Control de Acceso Clínico | Decide qué profesional puede leer o registrar en la ficha de un paciente: por episodio a cargo, cita vigente o derivación interna (pendiente o traspasada en solo lectura). Complementa el control por rol de Seguridad JWT/BCrypt. | CU65, CU28, CU12 |
| Validador de Presencialidad | Registra en cada marca de inicio y término la ubicación del profesional y la del paciente (la que envía su app o, como respaldo, su dirección), mide la distancia contra el radio y evalúa los factores para certificar la sesión. Trabaja junto al Motor de Agendamiento. | CU38, CU39, CU41 |
| Motor de Refuerzos | Tras cada marca de ejercicio compara el índice de adherencia (Motor Clínico) con el anterior y emite como máximo un mensaje de ánimo al día. | CU54 |
| Escalador de Eventos Críticos | Detecta los términos críticos del diccionario (Filtro de Contenido) en síntomas, reseñas y tickets, registra el evento y avisa a los administradores. El chat cifrado queda fuera. | CU62 |
| Gestor de Alta Clínica | Calcula el avance de las metas frente al umbral de egreso, habilita los contenidos de prevención y genera el informe de alta en PDF, que guarda en Cloudinary a través del API Adapter, antes de cerrar el episodio. | CU51, CU37, CU78 |
| Gestor de Contingencia | Determina si el financiador está caído (leyendo la bitácora de integraciones) o si el administrador forzó el modo manual, registra los bonos provisorios y los regulariza con el financiador a través del API Adapter. | CU72, CU66, CU71 |

En la Vista se suma el **GPS del Dispositivo**, que el Cliente Móvil usa para enviar la ubicación del paciente en las visitas a domicilio y para tomar la del profesional en cada marca.

Las APIs externas no cambian. Cloudinary amplía su uso: además de los documentos clínicos, ahora recibe los adjuntos del chat, el material de apoyo de las pautas, la foto de perfil del paciente y el informe de alta. Las interfaces HTTP/JSON y Driver MySQL se mantienen.

Para examinar el detalle, favor consultar el archivo en alta resolución "Diagrama de Componentes Inc4.png" disponible en los anexos digitales de esta entrega.

## Párrafo para el texto incremental

Para el Incremento 4, el Controlador suma seis componentes internos: Control de Acceso Clínico, Validador de Presencialidad, Motor de Refuerzos, Escalador de Eventos Críticos, Gestor de Alta Clínica y Gestor de Contingencia. Con ellos son 17 los componentes internos, contando la API REST, el API Adapter y la Capa de Acceso a Datos (en el Incremento 3 eran 11). La Vista incorpora el GPS del dispositivo. Las APIs externas se mantienen.

## Relación con los diagramas de secuencia

Los diagramas de secuencia del Incremento 4 dibujan cada componente con su propia línea de vida y con el mismo nombre de esta figura. Por ejemplo, C_API_REST, C_Control_Acceso_Clinico y C_Capa_de_Acceso_a_Datos.

## Correspondencia con el código

Cada componente del Controlador tiene en el servidor un archivo con su mismo nombre, en `fro-controlador/src/componentes/`. El resto del código llama a cada componente por ese nombre, igual que en las flechas de los diagramas de secuencia. Por ejemplo: `C_Gestor_Alta_Clinica.generarPdfInformeAlta(...)`.

| Componente | Archivo de entrada | Dónde vive la lógica |
|---|---|---|
| API REST | `C_API_REST.js` | `src/routes/` y `src/controllers/` |
| Seguridad JWT/BCrypt | `C_Seguridad_JWT_BCrypt.js` | `middlewares/`, `services/auth/`, `utils/encriptar_bcrypt.js`, parte OTP de `otpService.js` |
| API Adapter | `C_API_Adapter.js` | `services/external/providerAdapter.js`, `services/audit/`, `config/cloudinary.js`, parte de correo de `otpService.js` |
| Capa de Acceso a Datos | `C_Capa_de_Acceso_a_Datos.js` | `config/database.js` y `models/` |
| Motor Agendamiento | `C_Motor_Agendamiento.js` | `services/agenda/agendaService.js` y `confirmacionService.js` |
| Programador de Agenda | `C_Programador_Agenda.js` | `services/agenda/programador.js` |
| Validador de Presencialidad | `C_Validador_Presencialidad.js` | `services/agenda/presencialidadService.js` |
| Despachador de Notificaciones | `C_Despachador_Notificaciones.js` | `services/notifications/despachador.js` |
| Motor Clínico | `C_Motor_Clinico.js` | `services/clinico/` triaje, preclínico, adherencia, alertas y episodio |
| Motor de Refuerzos | `C_Motor_Refuerzos.js` | `services/clinico/refuerzoService.js` |
| Escalador de Eventos Críticos | `C_Escalador_Eventos_Criticos.js` | `services/clinico/escalamientoService.js` |
| Filtro de Contenido | `C_Filtro_Contenido.js` | `services/clinico/filtroContenidoService.js` |
| Cifrado de Mensajería | `C_Cifrado_Mensajeria.js` | `services/clinico/cifradoService.js` |
| Generador de Informes | `C_Generador_Informes.js` | `services/informes/exportadorInformes.js` y `services/clinico/fichaPdfService.js` |
| Gestor de Alta Clínica | `C_Gestor_Alta_Clinica.js` | `services/clinico/altaService.js` |
| Control de Acceso Clínico | `C_Control_Acceso_Clinico.js` | `services/clinico/accesoClinicoService.js` |
| Gestor de Contingencia | `C_Gestor_Contingencia.js` | `services/external/contingenciaService.js` |

En la Vista, todo `fro-vista/src` es el Cliente Móvil. El GPS del Dispositivo está en `src/utils/ubicacion.js` y `src/utils/useReporteUbicacion.js`. Cada archivo del código indica al inicio su componente y sus casos de uso, y cada función lleva el CU al que pertenece.

## Diagrama de despliegue

Se actualizó en `../diagrama-despliegue/`. Conserva los nueve nodos, y el servidor, el dispositivo móvil, la base de datos, Cloudinary y el servidor de notificaciones suman sus capacidades nuevas.
