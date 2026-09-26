# Diagrama de Componentes — Incremento 3

Figura: `Diagrama de Componentes Inc3.png` (alta resolución). Fuente editable: `Diagrama de Componentes Inc3.drawio` (app.diagrams.net). Generador: `generar_componentes.py`.

## Texto propuesto para la Vista de Desarrollo

La Vista de Desarrollo detalla cómo está estructurado el código de Punto Paz Salud en su entorno de construcción. La Figura X expone el Diagrama de Componentes actualizado al Incremento 3, que conserva la arquitectura de tres bloques —Vista (cliente móvil React Native), Controlador (servidor Node.js/Express) y Bases de Datos (MySQL)— y separa los módulos desarrollados internamente de los servicios externos que se consumen a través del API Adapter.

Respecto del Incremento 2, el Controlador incorpora seis componentes internos nuevos, todos invocados por la API REST y apoyados en la Capa de Acceso a Datos:

| Componente | Responsabilidad | Casos de uso |
|---|---|---|
| Despachador de Notificaciones | Punto único de salida de los avisos: los persiste en el centro de notificaciones y, según las preferencias del usuario, los envía por notificación push (API Expo Push) y correo (API Brevo) a través del API Adapter. | CU52 y todos los CU que avisan |
| Programador de Agenda | Temporizador del servidor que emite las solicitudes de confirmación de asistencia y vence los turnos de la lista de espera, ofreciendo el cupo al siguiente. | CU21, CU19 |
| Motor Clínico | Análisis del triaje (reporte pre-clínico, banderas rojas y sugerencia de especialidad), cálculo del índice de adherencia y evaluación de deterioro clínico; genera las alertas que llegan al Despachador. | CU25, CU26, CU44, CU50 |
| Filtro de Contenido | Contrasta los textos del chat y de las reseñas contra el diccionario de términos restringidos antes de que se guarden. | CU57, CU53, CU55 |
| Cifrado de Mensajería | Cifra y descifra los mensajes del chat clínico con AES-256-GCM; es el único componente que no accede a la base de datos. | CU53 |
| Generador de Informes | Compila los informes operativos en XLSX, PDF y CSV, dividiéndolos en tomos cuando superan el máximo de filas. | CU63 |

Las APIs externas (OpenAI, Cloudinary, Brevo, Expo Push, Transacciones y Bonos Electrónicos) no cambian: siguen conectadas exclusivamente a través del API Adapter. La interfaz HTTP/JSON entre la API REST y el Cliente Móvil y el Driver MySQL entre la Capa de Acceso a Datos y la base se mantienen.

Para examinar en detalle las interfaces, los módulos internos y las conexiones con las APIs externas, favor consultar el archivo en alta resolución "Diagrama de Componentes Inc3.png" disponible en los anexos digitales de esta entrega.

## Nombres de los componentes en los diagramas de secuencia

Los diagramas de secuencia del Incremento 3 usan estos identificadores, además de los ya existentes (V_*, C_API_REST, C_API_Adapter, C_Seguridad_JWT_BCrypt, C_Motor_Agendamiento, C_Capa_de_Acceso_a_Datos, C_MYSQL, S_Brevo, S_Cloudinary, S_Expo_Push):

`C_Despachador_Notificaciones`, `C_Programador_Agenda`, `C_Motor_Clinico`, `C_Filtro_Contenido`, `C_Cifrado_Mensajeria`, `C_Generador_Informes`.
