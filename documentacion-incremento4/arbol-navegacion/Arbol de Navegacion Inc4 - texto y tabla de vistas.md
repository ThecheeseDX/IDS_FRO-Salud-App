# Árbol de Navegación: Incremento 4

Texto y tablas listos para la sección "Árbol de Navegación" del informe.

- **Figura:** `Arbol de Navegacion Inc4.png` (alta resolución). La fuente editable es `Arbol de Navegacion Inc4.drawio` y se abre en app.diagrams.net.
- **Versión coloreada por incremento:** `../arboles-por-incremento/Arbol de Navegacion Inc4 por incremento.png`. Incremento 1 en azul, 2 en morado, 3 en verde y 4 en naranjo; el tono fuerte marca una interfaz y el claro una funcionalidad.

Cifras: 75 interfaces y 168 funcionalidades (el Incremento 3 tenía 60 y 125). Hay 8 vistas nuevas; Bonos por Contingencia aparece dos veces porque se abre desde el Historial y desde el Perfil.

## Texto propuesto para la sección

A continuación se presenta el Árbol de Navegación correspondiente al Incremento 4 de Punto Paz Salud. Como se detalla en la Figura X, el diagrama extiende el árbol del Incremento 3 y mantiene la organización por rol (CU79) y las barras inferiores de navegación: cinco secciones para el paciente (Inicio, Mi Tratamiento, el botón ＋ para agendar, Mensajes y Mi Perfil) y cuatro para el profesional (Inicio, Mi Jornada, Mensajes y Perfil).

En este incremento se incorporan ocho vistas:
- Para el paciente: Prevención y Alta, como nueva pestaña de Mi Tratamiento (CU51), y Mis Datos, dentro de Mi Perfil (CU09).
- Para el profesional: Derivaciones Recibidas en su Inicio, Derivación Interna e Informe de Alta en la Ficha Clínica (CU65, CU37), y Bonos por Contingencia (CU72).
- Para el administrador: Eventos Críticos (CU62) y Contingencia de Bonos (CU72).

Además, varias vistas existentes suman funcionalidades:
- El chat permite adjuntar archivos y enviar documentos de la ficha.
- El inicio y el término de la atención registran solos la hora y la ubicación de ambos actores, y la sesión se certifica al finalizar.
- Mi Jornada ofrece vistas por día, semana y mes, junto con las sesiones pendientes de documentar.
- Las pautas incorporan días de la semana y material de apoyo.
- El paciente responde su satisfacción después de cada sesión y califica el tratamiento al terminarlo.

Para examinar el diagrama con total claridad, favor consultar el archivo de alta resolución "Arbol de Navegacion Inc4.png" adjunto a esta entrega.

## Vistas nuevas

| Vista | Rol | Se abre desde | CU | Funcionalidad |
|---|---|---|---|---|
| V_Prevencion_Alta | Paciente | Mi Tratamiento (pestaña) | CU51, CU37 | Avance hacia el alta, recursos de prevención y mantenimiento, informe de alta |
| V_Mis_Datos | Paciente | Mi Perfil | CU09 | Editar teléfono, dirección y contacto de emergencia |
| V_Derivaciones_Recibidas | Profesional | Inicio | CU65 | Leer la ficha en solo lectura, aceptar o rechazar |
| V_Derivacion_Interna | Profesional | Ficha Clínica ("Derivar") | CU65 | Derivar el episodio, cancelar la derivación pendiente |
| V_Informe_Alta | Profesional | Ficha Clínica → Episodios | CU37, CU78 | Consolidar, emitir el informe y cerrar, o cerrar sin informe |
| V_Bonos_Contingencia | Profesional | Perfil y la cuadratura del Historial | CU72 | Ingresar un bono provisorio |
| V_Contingencia_Bonos | Administrador | Panel de Administración | CU72 | Forzar el modo, ingresar y regularizar bonos |
| V_Eventos_Criticos | Administrador | Panel de Administración | CU62 | Revisar eventos escalados y acusar recibo |

## Vistas existentes que suman CU

| Vista | Rol | Qué se suma | CU |
|---|---|---|---|
| Inicio Paciente | Paciente | Envía sola la ubicación en visitas a domicilio | CU39 |
| Inicio (Mis Citas) | Paciente | Satisfacción de la sesión y calificación del tratamiento | CU55 |
| Pagos y Bonos | Paciente | Bono provisorio por contingencia | CU72 |
| Mis Ejercicios | Paciente | Días asignados, material de apoyo en el visor, mensaje de ánimo | CU48, CU47, CU54 |
| Mis Documentos | Paciente | Descargar mi ficha clínica en PDF | CU35 |
| Chat Clínico | Ambos | Adjuntar imagen o archivo, enviar un documento de la ficha, ver adjuntos | CU53, CU35 |
| Mi Perfil | Paciente | Foto de perfil | CU09 |
| Centro de Notificaciones | Paciente | Activar o desactivar los mensajes de ánimo | CU54 |
| Ficha Clínica | Profesional | Cerrar episodio, abrir el chat del paciente | CU78, CU53 |
| Historial | Profesional | GPS al iniciar y finalizar, certificación al finalizar, documentar ahora o al final de la jornada | CU39, CU41, CU40 |
| Pautas | Profesional | Días de la semana y material de apoyo | CU47 |
| Mi Jornada | Profesional | Vistas por día, semana y mes; ir a una fecha; pendientes de documentar | CU11, CU40 |
| Términos Restringidos | Administrador | Categoría de términos críticos | CU62 |

## Vistas del Incremento 3 que cambiaron

| Vista | Antes | Ahora |
|---|---|---|
| Evidencia de Sesión (Paciente) | Check-in GPS (CU39) y teleconsulta (CU43) | Solo teleconsulta (CU43); la ubicación se envía sola desde el Inicio |
| Evidencia de Sesión (Profesional) | Check-in GPS (CU39) | Solo consulta la presencialidad; las marcas se toman en el Historial |
| Inicio (Mis Citas) | Calificar la atención (CU55) | Satisfacción de la sesión y calificación del tratamiento (CU55) |
| Mi Jornada | Agenda del día (CU11) | Vistas por día, semana y mes, más los pendientes de documentar |

## Párrafo para el texto incremental

Para el Incremento 4, el árbol suma ocho vistas: Prevención y Alta y Mis Datos para el paciente; Derivaciones Recibidas, Derivación Interna, Informe de Alta y Bonos por Contingencia para el profesional; y Eventos Críticos y Contingencia de Bonos para el administrador. Con ellas, el árbol llega a 75 interfaces y 168 funcionalidades. Además, el chat, el historial del paciente, Mi Jornada y las pautas incorporan las funcionalidades surgidas de la ronda de correcciones del incremento.
