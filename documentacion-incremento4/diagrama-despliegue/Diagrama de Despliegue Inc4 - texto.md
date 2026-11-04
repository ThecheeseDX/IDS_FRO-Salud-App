# Diagrama de Despliegue: Incremento 4

- **Figura:** `Diagrama de Despliegue Inc4.png` (alta resolución).
- **Fuente editable:** `Diagrama de Despliegue Inc4.drawio` (se abre en app.diagrams.net).
- **Generador:** `python3 generar_despliegue.py`.

## Texto propuesto para la Vista Física

El Diagrama de Despliegue del Incremento 4 mantiene la topología y los nueve nodos del incremento anterior. La aplicación móvil (Expo / React Native) se comunica por JSON vía HTTPS con el servidor de aplicaciones desplegado en Render.com. Ese servidor persiste en la base de datos MySQL gestionada por Aiven.io y se integra:
- por API REST, con la pasarela de pago, el servidor de notificaciones (Brevo y Expo Push) y el servidor IMED;
- por SDK, con OpenAI y Cloudinary.

En este incremento:
- **El dispositivo móvil** usa el GPS del teléfono para enviar la ubicación del paciente en las visitas a domicilio y para tomar la del profesional al iniciar y finalizar cada atención. Además, adjunta archivos en el chat y descarga la ficha clínica en PDF.
- **El servidor** incorpora el control de acceso clínico por derivación, la validación de presencialidad, los mensajes de refuerzo, el escalamiento de eventos críticos, la gestión del alta clínica con su informe en PDF y la contingencia de bonos.
- **La base de datos** guarda además los eventos críticos, las derivaciones y los bonos provisorios.
- **Cloudinary** recibe los adjuntos del chat, el material de apoyo de las pautas y los informes de alta.
- **El servidor de notificaciones** envía los avisos de eventos críticos y los mensajes de ánimo.

Para examinar el diagrama con total claridad, favor consultar el archivo de alta resolución "Diagrama de Despliegue Inc4.png" adjunto a esta entrega.

## Cambios respecto del diagrama del Incremento 3

| Nodo | Cambio |
|---|---|
| Dispositivo Móvil | + GPS del dispositivo (requerimiento); + ReportarUbicacionVisita, TomarUbicacionEnMarcas, AdjuntarArchivosChat, DescargarFichaClinicaPDF |
| Servidor de Aplicaciones Cloud | + ControlarAccesoClinico, ValidarPresencialidad, EnviarRefuerzosPositivos, EscalarEventosCriticos, GestionarAltaClinica, GenerarFichaClinicaPDF, GestionarContingenciaBonos |
| Servidor de Base de Datos | + AlmacenarEventosCriticos, AlmacenarDerivaciones, AlmacenarBonosProvisorios |
| Servidor de Notificación | + EnviarAvisoEventoCritico, EnviarMensajeDeAnimo |
| Servidor Cloud Storage | + AlmacenarAdjuntoChat, AlmacenarMaterialApoyo, AlmacenarInformeAlta |
| Navegador Web, Pasarela de Pago, IMED, OpenAI | Sin cambios. La regularización de bonos provisorios usa la misma validación de IMED |

## Párrafo para el texto incremental

Para el Incremento 4, el despliegue conserva sus nueve nodos y sus conexiones. Cambian las capacidades de cada nodo: el dispositivo móvil usa el GPS del teléfono, el servidor suma los seis componentes internos nuevos, la base guarda eventos críticos, derivaciones y bonos provisorios, y Cloudinary almacena también los adjuntos del chat, el material de apoyo y los informes de alta.
