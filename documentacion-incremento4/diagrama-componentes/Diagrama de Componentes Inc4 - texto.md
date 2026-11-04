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

Los diagramas de secuencia legibles del Incremento 4 agrupan los componentes del Controlador en la línea de vida "Servidor (C_API_REST y controladores)". Los componentes nuevos de esta figura son los que actúan dentro de esa línea de vida en cada CU.

## Diagrama de despliegue

No cambia. El servidor, la base de datos y los servicios externos siguen en los mismos nodos. El GPS es una capacidad del teléfono que ya estaba en el nodo del cliente móvil.
