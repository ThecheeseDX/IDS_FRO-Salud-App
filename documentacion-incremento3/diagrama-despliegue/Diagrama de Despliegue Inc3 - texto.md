# Diagrama de Despliegue — Incremento 3

Figura: `Diagrama de Despliegue Inc3.png` (alta resolución). Fuente editable:
`Diagrama de Despliegue Inc3.drawio` (app.diagrams.net). Se regenera con
`python3 generar_despliegue.py`.

## Texto propuesto para la sección

El Diagrama de Despliegue del Incremento 3 mantiene la topología del incremento anterior: la aplicación móvil (Expo / React Native) se comunica por JSON vía HTTPS con el servidor de aplicaciones desplegado en Render.com, que persiste en la base de datos MySQL gestionada por Aiven.io y se integra por API REST con la pasarela de pago, el servidor de notificaciones (Brevo para correo y Expo Push para alertas) y el servidor IMED, y por SDK con OpenAI y Cloudinary. En este incremento el servidor incorpora el despachador de notificaciones, el programador de tareas de agenda, el análisis clínico del triaje, el filtro de contenido restringido, el cifrado de la mensajería y el generador de informes. La mensajería clínica funciona por consulta periódica, por lo que el servidor ya no requiere WebSockets. Se agrega como nodo el Navegador Web, donde el paciente abre los enlaces recibidos por correo para confirmar o cancelar una cita y para tomar un cupo liberado; el administrador opera desde la misma aplicación móvil.

## Cambios respecto del diagrama del Incremento 2

| Nodo | Cambio |
|---|---|
| Dispositivo Móvil | + Cliente Expo (React Native); + RegistrarTokenPush, ConsultarMensajesPeriodicamente, RetenerEnviosSinConexion, DescargarInformes |
| PC Administrador → **Navegador Web** | La interfaz web React del administrador no existe: el administrador usa la app móvil. El navegador queda para las páginas que se abren desde el correo (CU21 y CU19) |
| Servidor de Aplicaciones Cloud | − SocketioWebSockets (el chat usa consulta periódica); + DespacharNotificaciones, ProgramarTareasAgenda, AnalizarTriajeClinico, FiltrarContenidoRestringido, CifrarMensajesChat, ServirConsultaPeriodicaChat, GenerarInformes, ServirPaginasDeCorreo |
| Servidor de Base de Datos | + AlmacenarMensajesCifrados, AlmacenarNotificaciones, AlmacenarLiquidaciones |
| Servidor Pasarela Pago | + Modo: simulado (sin cobro real) en esta versión |
| Servidor de Notificación | + EnviarEnlaceConfirmacionYCupo |
| Servidor Cloud Storage | + AlmacenarFotoPerfil, AlmacenarAdjuntoTicket |
| Servidor IMED, Servidor OpenAI | Sin cambios |
