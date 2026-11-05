# -*- coding: utf-8 -*-
"""Redacción de las fichas según las reglas de Pablo (04-11-2026):
poco texto y poco específico, sin nombres de parámetros ni tablas, sin
paréntesis, descripción y excepciones en rebote actor/Sistema, y los
marcadores [Excepción n] en negrita (los pone el generador).

Reemplaza resumen, frecuencia, precondiciones, descripción, excepciones y
poscondiciones de cus_inc4.py; el nombre, los actores y las dependencias
siguen saliendo de ahí. Las excepciones conservan su número y su tema para
que coincidan con los diagramas de secuencia."""

T = {}

T['CU37'] = dict(
 resumen='El Profesional emite el informe de alta con el estado final del tratamiento y las pautas de continuidad, y con ello cierra el episodio clínico.',
 frecuencia='Baja, al terminar el tratamiento del paciente.',
 pre='El episodio está abierto, a cargo del Profesional, y sus metas alcanzaron el umbral de egreso.',
 descripcion='El Profesional solicita el informe de alta desde los episodios de la ficha clínica [Excepción 1], el Sistema consolida las metas, las sesiones y las citas pendientes del episodio [Excepción 2], el Profesional redacta las pautas de continuidad y confirma la emisión [Excepción 3], el Sistema genera el informe, lo guarda en los documentos del paciente, cierra el episodio y avisa al paciente [Excepción 4].',
 excepciones=[
  'El Profesional selecciona un episodio ya cerrado. El Sistema desactiva la emisión y muestra la fecha de cierre. El Profesional selecciona un episodio activo.',
  'El Sistema detecta sesiones sin firmar, citas futuras o metas bajo el umbral y bloquea la emisión indicando cada pendiente. El Profesional regulariza los pendientes o cierra el episodio sin informe. El Sistema habilita nuevamente la emisión.',
  'El Profesional excede el largo permitido en las pautas. El Sistema impide seguir escribiendo y destaca el contador. El Profesional ajusta la redacción.',
  'El Sistema no logra guardar el informe y mantiene el episodio abierto. El Profesional reintenta la emisión. El Sistema completa el cierre.'],
 pos='El informe queda en los documentos del paciente y el episodio queda cerrado sin admitir nuevos registros.')

T['CU51'] = dict(
 resumen='Cuando el avance de las metas alcanza el umbral de egreso, el Sistema habilita al Paciente contenidos de prevención y mantenimiento para después del alta.',
 frecuencia='Baja, una vez por episodio.',
 pre='El Paciente tiene un episodio activo con metas medibles.',
 descripcion='El Paciente abre la sección de prevención y alta de su tratamiento [Excepción 1], el Sistema calcula el avance de sus metas y, al alcanzar el umbral, habilita los contenidos y le avisa [Excepción 2], el Paciente abre el aviso o la sección habilitada [Excepción 3], el Sistema muestra los recursos de prevención de su especialidad [Excepción 4].',
 excepciones=[
  'El Paciente abre la sección sin metas medibles o sin alcanzar el umbral. El Sistema muestra su avance y lo que le falta. El Paciente continúa su tratamiento.',
  'El Sistema detecta metas contradictorias, no habilita la preparación y deja registro. El Paciente ve que su profesional debe revisarlas. El Sistema habilita la preparación cuando las metas se corrigen.',
  'El Paciente abre un enlace que no existe para su rol. El Sistema ignora el salto y lo mantiene en su pantalla. El Paciente entra a la sección desde su tratamiento.',
  'El Sistema no logra cargar la imagen de un recurso y muestra un ícono en su lugar. El Paciente abre el recurso igualmente o recarga la pantalla. El Sistema muestra la imagen al recuperarla.'],
 pos='El Paciente conserva el acceso a los contenidos de prevención incluso después del alta.')

T['CU54'] = dict(
 resumen='El Sistema envía al Paciente un mensaje de ánimo cuando su cumplimiento de ejercicios mejora, con un máximo de uno al día.',
 frecuencia='Media, según el registro diario de ejercicios.',
 pre='El Paciente tiene una pauta vigente y los mensajes de ánimo activados.',
 descripcion='El Paciente marca un ejercicio como realizado [Excepción 1], el Sistema recalcula su cumplimiento y, si mejoró, le envía un mensaje según su avance [Excepción 2], el Paciente recibe el mensaje y lo abre [Excepción 3], el Sistema muestra su progreso y registra la lectura [Excepción 4].',
 excepciones=[
  'El Paciente marca dos veces el mismo ejercicio en el día. El Sistema guarda un solo registro y no envía mensaje. El Paciente continúa con sus ejercicios.',
  'El Sistema detecta que el cumplimiento no mejoró o que los mensajes están desactivados y no envía nada. El Paciente sigue registrando sus ejercicios. El Sistema evalúa nuevamente en el siguiente registro.',
  'El Paciente tiene el teléfono bloqueado o sin notificaciones. El Sistema deja el mensaje en el centro de notificaciones. El Paciente lo revisa al abrir la aplicación.',
  'El Paciente ya recibió un mensaje ese día. El Sistema no envía otro hasta el día siguiente. El Paciente ve solo el primer mensaje del día.'],
 pos='El aviso y su lectura quedan registrados sin modificar la ficha clínica.')

T['CU62'] = dict(
 resumen='Cuando un comentario de síntomas, una reseña o una solicitud de soporte contiene un término crítico, el Sistema lo escala a los administradores, que lo revisan y acusan recibo. El chat clínico no se revisa por ser privado.',
 frecuencia='Baja, solo ante términos críticos.',
 pre='El diccionario tiene términos críticos activos y el Administrador tiene sesión iniciada.',
 descripcion='El Sistema detecta un término crítico en un texto recibido, registra el evento y avisa a los administradores [Excepción 1], el Administrador abre la bandeja de eventos críticos, el Sistema lista los eventos pendientes y mantiene la bandeja actualizada [Excepción 2], el Administrador revisa el caso y acusa recibo [Excepción 3], el Sistema registra el acuse con su autor y el momento [Excepción 4].',
 excepciones=[
  'El Sistema no encuentra administradores conectados y envía el aviso a todos por la aplicación y por correo. El Administrador revisa la bandeja al ingresar. El Sistema muestra el evento pendiente.',
  'El Sistema no tiene eventos pendientes o pierde la conexión y lo indica sin vaciar la bandeja. El Administrador espera o vuelve más tarde. El Sistema reanuda la actualización al volver la conexión.',
  'El Administrador sale sin acusar recibo o intenta acusar un evento que otro ya acusó. El Sistema mantiene el evento pendiente o informa que ya estaba acusado. El Administrador continúa con el siguiente evento.',
  'El Sistema no logra guardar el acuse y lo reintenta automáticamente. El Administrador ve que el evento sigue pendiente si no se logró. El Sistema registra el acuse en el siguiente intento.'],
 pos='El evento queda acusado y el escalamiento y el acuse quedan registrados en la bitácora de auditoría.')

T['CU65'] = dict(
 resumen='El Profesional a cargo de un episodio lo deriva a un profesional de otra especialidad. Al aceptar, el receptor queda a cargo del episodio y quien derivó lo conserva en solo lectura.',
 frecuencia='Baja, según la complejidad del tratamiento.',
 pre='El paciente tiene un episodio abierto a cargo del Profesional, sin otra derivación pendiente.',
 descripcion='El Profesional solicita la derivación desde la ficha clínica [Excepción 1], el Sistema muestra las especialidades y los profesionales que pueden recibirla [Excepción 2], el Profesional elige el destino y escribe el motivo [Excepción 3], el Sistema registra la derivación como pendiente y avisa al receptor [Excepción 4], el Profesional receptor revisa la ficha y acepta o rechaza, el Sistema traspasa el episodio si fue aceptada o lo mantiene con quien derivó si fue rechazada [Excepción 5].',
 excepciones=[
  'El Profesional intenta derivar un episodio cerrado. El Sistema no ofrece la opción. El Profesional abre un episodio nuevo para derivar.',
  'El Sistema no encuentra profesionales disponibles en la especialidad y lo informa. El Profesional solicita su alta al administrador mediante un ticket de soporte. El Sistema registra el ticket.',
  'El Profesional envía la derivación sin destino, con un motivo inválido o con otra derivación pendiente. El Sistema rechaza el envío e indica el motivo. El Profesional corrige los datos o cancela la derivación pendiente.',
  'El Sistema no logra guardar la derivación y revierte todo el registro. El Profesional repite la solicitud. El Sistema registra la derivación.',
  'El Profesional receptor responde una derivación que ya cambió de estado. El Sistema no traspasa nada e informa el motivo. El Profesional receptor actualiza la lista.'],
 pos='Si la derivación se acepta, el episodio queda a cargo del receptor y quien derivó lo conserva en solo lectura. Si se rechaza o se cancela, el episodio sigue con quien derivó.')

T['CU72'] = dict(
 resumen='Cuando el financiador no responde, el actor ingresa a mano los datos del bono de una cita. El bono queda provisorio hasta que el Administrador lo valida con el financiador.',
 frecuencia='Muy baja, solo durante caídas del financiador.',
 pre='El financiador no responde o el Administrador activó el modo de contingencia.',
 descripcion='El actor abre el ingreso de bonos por contingencia [Excepción 1], el Sistema muestra el estado del financiador, las citas sin bono y el formulario [Excepción 2], el actor ingresa el folio, los montos y el financiador del bono [Excepción 3], el Sistema guarda el bono como provisorio y avisa al paciente [Excepción 4], el Administrador solicita validarlo cuando el financiador vuelve a responder, el Sistema lo valida con el financiador y actualiza su estado.',
 excepciones=[
  'El actor abre el ingreso con el financiador operativo. El Sistema no muestra el formulario. El actor indica al paciente que registre su bono en pagos y bonos.',
  'El Sistema no logra cargar el catálogo de financiadores y habilita un campo libre. El actor escribe el nombre del financiador. El Sistema lo acepta para el bono provisorio.',
  'El actor envía datos incompletos o un folio ya registrado. El Sistema bloquea el registro y marca los campos. El actor corrige los datos.',
  'El Sistema no logra guardar el bono y conserva los datos en el formulario. El actor reintenta el envío. El Sistema registra el bono.'],
 pos='La cita queda con un bono provisorio que permite continuar la atención hasta su validación con el financiador.')

T['CU66'] = dict(
 resumen='El Paciente registra el bono de cobertura de su cita, el Sistema lo valida con el financiador y calcula su copago.',
 frecuencia='Alta, en cada cita con cobertura previsional.',
 pre='La cita está agendada o confirmada y existe un financiador con convenio activo.',
 descripcion='El Paciente selecciona el financiador e ingresa el folio del bono [Excepción 1], el Sistema valida el formato y consulta al financiador [Excepción 2], el Paciente espera la respuesta [Excepción 3], el Sistema guarda el bono validado con su cobertura y copago [Excepción 4].',
 excepciones=[
  'El Paciente ingresa un folio con formato inválido. El Sistema detiene el envío y muestra el aviso. El Paciente corrige el folio.',
  'El Sistema recibe un rechazo del financiador y registra el bono como no validado. El Paciente verifica el folio con su institución o paga la tarifa completa. El Sistema actualiza el cobro de la cita.',
  'El Paciente espera y el financiador no responde tras los reintentos. El Sistema informa que el bono no se registró y sugiere el ingreso por contingencia. El Paciente reintenta más tarde o pide a su profesional el registro provisorio.',
  'El Sistema encuentra la tabla ocupada al guardar y reintenta con espera progresiva. El Paciente ve el bono registrado al terminar. El Sistema confirma el copago de la cita.'],
 pos='El bono queda validado y el copago calculado; un bono provisorio por contingencia también fija el copago hasta su validación.')

T['CU71'] = dict(
 resumen='El Profesional contrasta las sesiones realizadas con las coberturas autorizadas del paciente y revisa las diferencias.',
 frecuencia='Media, al cerrar atenciones con previsión.',
 pre='El paciente tiene citas realizadas con el Profesional y coberturas registradas.',
 descripcion='El Profesional solicita la cuadratura desde el historial del paciente [Excepción 1], el Sistema compara las sesiones realizadas con los paquetes y bonos, incluidos los provisorios [Excepción 2], el Profesional revisa el resumen y las alertas [Excepción 3], el Sistema mantiene la cuadratura disponible para la siguiente consulta [Excepción 4].',
 excepciones=[
  'El Profesional encuentra sesiones sin bono registrado. El Sistema las lista como alerta y ofrece el ingreso por contingencia. El Profesional solicita el bono al paciente o lo registra como provisorio.',
  'El Sistema detecta más sesiones realizadas que autorizadas y emite una alerta de saldo. El Profesional solicita al paciente un nuevo plan o bono. El Sistema actualiza la cuadratura al registrarse la cobertura.',
  'El Profesional descarta la alerta. El Sistema la oculta hasta la próxima consulta. El Profesional continúa con la atención.',
  'El Sistema pierde la conexión con la base de datos e informa que la sincronización quedó pendiente. El Profesional reintenta la operación. El Sistema completa la cuadratura.'],
 pos='El Profesional conoce las diferencias entre lo atendido y lo autorizado, incluidos los bonos provisorios.')

T['CU28'] = dict(
 resumen='El Profesional consulta en una sola ficha toda la historia de salud del paciente, organizada en historial, anamnesis, episodios, sesión clínica y pautas.',
 frecuencia='Muy alta, en cada revisión o sesión.',
 pre='El paciente está vinculado al Profesional por un episodio, una cita vigente o una derivación interna.',
 descripcion='El Profesional abre la ficha de un paciente desde su nómina, su jornada o sus derivaciones recibidas [Excepción 1], el Sistema verifica el vínculo y reúne citas, episodios, evoluciones y documentos [Excepción 2], el Profesional navega entre las secciones de la ficha, el Sistema muestra la información respetando la privacidad del paciente y deja en solo lectura lo que está a cargo de otro profesional [Excepción 3].',
 excepciones=[
  'El Profesional intenta abrir la ficha de un paciente no vinculado. El Sistema deniega el acceso. El Profesional solicita la asignación o la derivación al profesional a cargo.',
  'El Sistema pierde la conexión con la base de datos y ofrece reintentar. El Profesional reintenta la consulta. El Sistema muestra la ficha.',
  'El Sistema no logra acceder al repositorio de archivos y muestra solo los registros de texto. El Profesional ve el aviso de archivos no disponibles. El Sistema carga los archivos al recuperarse el servicio.'],
 pos='El Profesional visualiza la historia clínica completa y solo registra en los episodios a su cargo.')

T['CU53'] = dict(
 resumen='El Paciente y su Profesional conversan en un chat cifrado, con una conversación por pareja, y pueden adjuntar archivos o documentos de la ficha. Solo ellos pueden leerlo.',
 frecuencia='Alta, durante el tratamiento.',
 pre='El Paciente y el Profesional están vinculados por un episodio, una cita o mensajes anteriores.',
 descripcion='El actor abre la conversación y escribe un mensaje o adjunta un archivo [Excepción 1], el Sistema revisa el contenido, cifra el mensaje, lo guarda y avisa a la otra parte [Excepción 2], la otra parte abre la conversación [Excepción 3], el Sistema descifra los mensajes, los marca como leídos y entrega los nuevos mientras siga abierta [Excepción 4].',
 excepciones=[
  'El actor escribe términos no permitidos, excede el largo o adjunta un archivo no permitido. El Sistema bloquea el envío y muestra la advertencia. El actor corrige el mensaje o elige otro archivo.',
  'El Sistema no logra enviar por falta de red y guarda el mensaje como pendiente. El actor reabre la conversación. El Sistema reenvía el mensaje pendiente.',
  'La otra parte abre la conversación sin episodio abierto ni cita vigente. El Sistema la muestra en solo lectura. La otra parte lee el historial o agenda una nueva hora.',
  'El Sistema no logra descifrar un mensaje y lo muestra como ilegible con una advertencia. El actor informa al administrador. El Sistema vuelve a mostrarlo al corregirse la clave.'],
 pos='Los mensajes quedan cifrados y solo los dos participantes pueden leerlos.')

T['CU57'] = dict(
 resumen='El Sistema compara cada texto del chat y de las evaluaciones con el diccionario de términos restringidos que mantiene el Administrador. Los términos bloqueantes impiden guardar el texto y los críticos lo escalan a supervisión.',
 frecuencia='Alta, en cada envío de texto.',
 pre='El diccionario tiene al menos un término activo.',
 descripcion='El Administrador mantiene el diccionario agregando, activando o eliminando términos [Excepción 1], el Sistema actualiza el filtro con cada cambio, el actor envía un mensaje del chat o un comentario de evaluación [Excepción 2], el Sistema compara el texto con los términos activos [Excepción 3] y, si encuentra uno bloqueante, impide guardarlo, registra el bloqueo y avisa al actor [Excepción 4].',
 excepciones=[
  'El Administrador agrega un término muy corto o repetido. El Sistema lo rechaza o reactiva el existente. El Administrador corrige el término.',
  'El actor envía un texto vacío. El Sistema lo rechaza antes de filtrarlo. El actor escribe un mensaje válido.',
  'El actor envía un texto sin términos bloqueantes. El Sistema lo guarda y, si tiene términos críticos fuera del chat, lo escala a supervisión. El actor ve la confirmación del envío.',
  'El actor pierde la conexión durante el envío. El Sistema conserva el mensaje del chat en el teléfono. El actor lo reenvía al reabrir la conversación.'],
 pos='Los textos con términos bloqueantes no se guardan y los textos con términos críticos quedan escalados a supervisión.')

T['CU55'] = dict(
 resumen='Después de cada sesión el Paciente indica si quedó satisfecho y puede comentar. Al terminar el tratamiento lo califica con estrellas, y esa nota entra al promedio del profesional.',
 frecuencia='Alta, por cada sesión y por cada tratamiento terminado.',
 pre='La cita está realizada y sin evaluar, o el tratamiento terminó y no fue calificado.',
 descripcion='El Sistema avisa al Paciente que evalúe su sesión o, al cerrarse el episodio, su tratamiento [Excepción 1], el Paciente abre el aviso [Excepción 2], el Sistema muestra el formulario que corresponde, el Paciente responde si quedó satisfecho o marca las estrellas y escribe un comentario [Excepción 3], el Sistema registra la evaluación, revisa el comentario y actualiza el promedio del profesional [Excepción 4].',
 excepciones=[
  'El Paciente intenta evaluar una sesión no realizada o un tratamiento abierto o ya evaluado. El Sistema rechaza el registro e informa el motivo. El Paciente espera el cierre o revisa su evaluación anterior.',
  'El Paciente descarta el aviso. El Sistema mantiene la evaluación pendiente en sus citas. El Paciente la responde desde ahí.',
  'El Paciente envía sin comentario o con términos no permitidos. El Sistema registra solo la respuesta o la nota y avisa si descartó el comentario. El Paciente vuelve a sus citas.',
  'El Sistema recibe dos calificaciones del mismo profesional a la vez y las procesa en orden. El Paciente ve su calificación registrada. El Sistema asienta el promedio final sin perder ninguna.'],
 pos='La respuesta de la sesión alimenta el indicador de satisfacción y la nota del tratamiento el promedio del profesional; los comentarios quedan pendientes de moderación.')

T['CU56'] = dict(
 resumen='El Administrador revisa los comentarios de sesión y las reseñas de tratamiento antes de publicarlos en el perfil del profesional.',
 frecuencia='Media, según el volumen de comentarios.',
 pre='Existe al menos un comentario o reseña pendiente.',
 descripcion='El Administrador abre la moderación de testimonios y filtra por estado [Excepción 1], el Sistema lista los textos con su tipo, su autor y el profesional evaluado [Excepción 2], el Administrador publica el texto o lo rechaza indicando la causal [Excepción 3], el Sistema guarda la decisión y avisa al profesional cuando se publica [Excepción 4].',
 excepciones=[
  'El Administrador filtra un estado sin textos. El Sistema muestra la lista vacía. El Administrador vuelve al panel.',
  'El Sistema detecta caracteres no válidos en un texto y los corrige. El Administrador lee la versión corregida. El Sistema aplica la decisión sobre ese texto.',
  'El Administrador intenta rechazar sin causal. El Sistema no aplica la decisión. El Administrador escribe la causal.',
  'El Sistema no logra guardar la decisión y mantiene el estado anterior. El Administrador reintenta. El Sistema registra la decisión.'],
 pos='El texto queda publicado o rechazado.')

T['CU58'] = dict(
 resumen='El Sistema muestra el promedio de estrellas de cada profesional en el buscador de horas y en su perfil, junto con los testimonios publicados.',
 frecuencia='Alta, en cada búsqueda de horas.',
 pre='El profesional tiene un perfil activo.',
 descripcion='El Paciente busca horas o abre el perfil de un profesional [Excepción 1], el Sistema muestra cada profesional con su promedio y su cantidad de calificaciones [Excepción 2], el Paciente toca las estrellas para ver las valoraciones [Excepción 3], el Sistema muestra el promedio y los testimonios publicados con su autor [Excepción 4].',
 excepciones=[
  'El Paciente aplica filtros sin resultados. El Sistema informa que no hay coincidencias. El Paciente amplía los filtros.',
  'El Sistema encuentra un profesional sin calificaciones y lo muestra como perfil nuevo, sin acceso a valoraciones. El Paciente elige otro profesional o agenda igualmente. El Sistema mantiene el perfil disponible.',
  'El Paciente sale antes de que carguen las valoraciones. El Sistema descarta la carga. El Paciente vuelve a abrirlas cuando quiera.',
  'El Sistema tarda o falla al responder y muestra un indicador de carga o la opción de reintentar. El Paciente espera o reintenta. El Sistema muestra las valoraciones.'],
 pos='El Paciente ve el historial real de calificaciones y el profesional ve la misma información en su perfil.')

T['CU78'] = dict(
 resumen='Todo registro clínico se agrupa bajo un episodio que identifica el motivo de consulta; solo su profesional a cargo registra en él y lo cierra al terminar el tratamiento.',
 frecuencia='Continua, en cada registro clínico.',
 pre='El paciente tiene un episodio abierto a cargo del Profesional.',
 descripcion='El Profesional guarda una sesión, una pauta o un documento [Excepción 1], el Sistema exige asociarlo a un episodio [Excepción 2], el Profesional elige el episodio del motivo de consulta [Excepción 3], el Sistema valida que esté abierto y a su cargo y guarda el registro, el Profesional cierra el episodio al terminar el tratamiento, el Sistema verifica que no queden pendientes, lo cierra y pide al paciente calificar el tratamiento [Excepción 4].',
 excepciones=[
  'El Profesional adjunta un archivo con formato no soportado. El Sistema rechaza el archivo. El Profesional lo convierte a un formato permitido.',
  'El Sistema detecta que el paciente no tiene episodio y guía su creación. El Profesional crea el episodio con el motivo de consulta. El Sistema asocia el registro al episodio nuevo.',
  'El Profesional elige un episodio cerrado o a cargo de otro profesional. El Sistema lo muestra en solo lectura y bloquea el registro. El Profesional elige un episodio propio abierto o crea uno nuevo.',
  'El Sistema detecta sesiones sin firmar o citas futuras al cerrar, o falla al guardar, e informa el motivo. El Profesional regulariza los pendientes y reintenta. El Sistema completa la operación.'],
 pos='Cada registro queda en un único episodio y un episodio cerrado no admite nuevos registros.')

T['CU47'] = dict(
 resumen='El Profesional prescribe una pauta de ejercicios con sus series, repeticiones, frecuencia o días fijos, su vigencia y su material de apoyo.',
 frecuencia='Alta, al asignar o ajustar el tratamiento.',
 pre='El paciente tiene un episodio abierto a cargo del Profesional.',
 descripcion='El Profesional crea una pauta y selecciona el episodio [Excepción 1], el Sistema habilita los datos de la pauta y de cada ejercicio [Excepción 2], el Profesional define los ejercicios, sus días, la vigencia y adjunta el material [Excepción 3], el Sistema guarda la pauta y sube el material de apoyo [Excepción 4].',
 excepciones=[
  'El Profesional intenta guardar sin nombre, sin ejercicios, con ejercicios repetidos o con fechas invertidas. El Sistema bloquea el guardado e indica el problema. El Profesional completa los datos.',
  'El Sistema no recibe una frecuencia válida ni días fijos y asigna frecuencia diaria. El Profesional ajusta la frecuencia o los días. El Sistema guarda la configuración.',
  'El Profesional ingresa valores no numéricos o adjunta un archivo no permitido. El Sistema rechaza el dato o el archivo. El Profesional corrige el valor o elige otro archivo.',
  'El Sistema detecta que el episodio no corresponde o no logra subir un archivo, e informa el problema. El Profesional crea el episodio o vuelve a adjuntar el material. El Sistema completa la pauta.'],
 pos='El paciente tiene la pauta con sus días y su material disponible en la aplicación.')

T['CU48'] = dict(
 resumen='El Paciente marca cada día los ejercicios que realizó, respetando los días asignados a cada uno.',
 frecuencia='Muy alta, diaria.',
 pre='El Paciente tiene una pauta vigente.',
 descripcion='El Paciente abre sus ejercicios [Excepción 1], el Sistema muestra las pautas con los ejercicios del día y su material [Excepción 2], el Paciente marca o desmarca cada ejercicio realizado [Excepción 3], el Sistema guarda la marca del día y actualiza su cumplimiento [Excepción 4].',
 excepciones=[
  'El Paciente abre una pauta que aún no comienza o que ya terminó. El Sistema la muestra sin opción de marcar. El Paciente revisa las fechas de la pauta.',
  'El Sistema no logra cargar las pautas y muestra la última versión guardada sin opción de marcar. El Paciente reintenta al recuperar la conexión. El Sistema muestra las pautas actualizadas.',
  'El Paciente intenta marcar un ejercicio que no corresponde a ese día. El Sistema indica que hoy no corresponde. El Paciente marca solo los ejercicios del día.',
  'El Sistema recibe marcas repetidas por un error de red y guarda una sola por día. El Paciente ve la marca registrada. El Sistema mantiene el cumplimiento correcto.'],
 pos='Las marcas del día quedan registradas para el cálculo de la adherencia.')

T['CU44'] = dict(
 resumen='El Sistema calcula el índice de adherencia del Paciente con las tareas programadas y cumplidas, lo muestra en su progreso y alerta al profesional cuando cae bajo el umbral.',
 frecuencia='Muy alta, con cada registro y cada consulta del progreso.',
 pre='El Paciente tiene una pauta vigente con cumplimientos o una sesión cerrada.',
 descripcion='El Paciente registra o retira el cumplimiento de un ejercicio [Excepción 1], el Sistema cuenta las tareas programadas en los días asignados y las cumplidas [Excepción 2], el Paciente abre su progreso [Excepción 3], el Sistema calcula el porcentaje, lo guarda como medición del día y actualiza el panel [Excepción 4].',
 excepciones=[
  'El Paciente registra un ejercicio fuera de la vigencia o en un día no asignado. El Sistema rechaza el registro y no lo considera. El Paciente revisa sus tareas vigentes.',
  'El Sistema no logra leer las tareas y entrega el último porcentaje guardado. El Paciente visualiza el valor previo. El Sistema recalcula en la siguiente consulta.',
  'El Paciente pierde la conexión al abrir su progreso. El Sistema mantiene el cálculo en el servidor. El Paciente ve el dato al recuperar la señal.',
  'El Sistema detecta un porcentaje bajo el umbral y alerta al profesional tratante, sin repetir la alerta mientras siga abierta. El Profesional revisa el caso en sus banderas rojas. El Sistema cierra la alerta al revisarse.'],
 pos='Los indicadores reflejan el compromiso terapéutico y quedan disponibles para el Paciente y su profesional.')

T['CU49'] = dict(
 resumen='El Sistema cierra el acceso a las pautas vencidas, a su material y a sus marcas de cumplimiento.',
 frecuencia='En cada consulta de pautas.',
 pre='Existen pautas con vigencia definida.',
 descripcion='El Paciente abre sus pautas [Excepción 1], el Sistema calcula si cada pauta está programada, vigente o vencida [Excepción 2], el Paciente ve el contenido según ese estado [Excepción 3], el Sistema bloquea el material y las marcas de las pautas vencidas [Excepción 4].',
 excepciones=[
  'El Paciente intenta marcar un ejercicio o abrir el material de una pauta vencida. El Sistema rechaza la acción e indica que la pauta terminó. El Paciente consulta a su profesional por una nueva pauta.',
  'El Sistema tarda en calcular la vigencia y muestra la última carga. El Paciente visualiza el contenido. El Sistema actualiza el estado al responder.',
  'El Paciente intenta marcar un ejercicio de una pauta que aún no comienza. El Sistema rechaza la marca e indica la fecha de inicio. El Paciente espera el inicio.',
  'El Sistema no logra guardar el vencimiento y mantiene el estado calculado. El Paciente ve la pauta como vencida igualmente. El Sistema reintenta el guardado en la próxima consulta.'],
 pos='El material y las marcas quedan protegidos según la vigencia del tratamiento.')

T['CU38'] = dict(
 resumen='El Sistema registra la hora de inicio y de término de cada atención, calcula su duración, descuenta la sesión del paquete y, en domicilio, registra la ubicación de ambos.',
 frecuencia='Muy alta, en cada sesión.',
 pre='La cita del Profesional está confirmada.',
 descripcion='El Profesional inicia la atención desde el historial del paciente [Excepción 1], el Sistema registra el inicio, la presencia del paciente y las ubicaciones, y deja la cita en curso [Excepción 2], el Profesional finaliza la atención [Excepción 3], el Sistema registra el término, calcula la duración, descuenta la sesión, intenta certificarla y ofrece documentarla ahora o al final de la jornada [Excepción 4].',
 excepciones=[
  'El Profesional inicia antes del horario agendado. El Sistema advierte que el inicio quedará auditado. El Profesional confirma el inicio.',
  'El Sistema no puede usar la hora automática y exige una marca manual justificada. El Profesional registra la hora con su justificación. El Sistema guarda la marca.',
  'El Profesional sale sin finalizar la atención. El Sistema mantiene la cita en curso y muestra un aviso permanente. El Profesional finaliza en su siguiente acceso.',
  'El Sistema detecta una hora de término anterior al inicio y bloquea el registro. El Profesional corrige la marca. El Sistema guarda el término.'],
 pos='Las marcas y la duración quedan registradas y la cita queda vinculada a su episodio.')

T['CU39'] = dict(
 resumen='El Sistema valida en las visitas a domicilio que el Profesional y el Paciente estén en el mismo lugar al iniciar y al terminar la atención.',
 frecuencia='Alta, en las visitas a domicilio.',
 pre='Existe una cita a domicilio confirmada o en curso.',
 descripcion='El Paciente mantiene abierta la aplicación el día de la visita [Excepción 1], el Sistema recibe su ubicación periódicamente, el Profesional inicia la atención [Excepción 2], el Sistema compara su ubicación con la del paciente o con su dirección registrada, el Profesional finaliza la atención [Excepción 3], el Sistema vuelve a comparar ambas ubicaciones y guarda la distancia [Excepción 4].',
 excepciones=[
  'El Paciente tiene la aplicación cerrada o sin permiso de ubicación. El Sistema usa su dirección registrada. El Profesional continúa la atención.',
  'El Profesional inicia con el GPS apagado o lejos del paciente. El Sistema registra la marca y advierte que deberá justificar el cierre. El Profesional continúa la atención.',
  'El Profesional finaliza sin una de las ubicaciones. El Sistema registra la marca sin ella. El Profesional cierra la sesión con justificación.',
  'El Sistema detecta al término una distancia mayor a la permitida y deriva la sesión al administrador. El Profesional justifica el cierre al validar la sesión. El Sistema registra el cierre justificado.'],
 pos='La ubicación de la atención queda registrada en la evidencia de la cita.')

T['CU41'] = dict(
 resumen='El Sistema certifica cada sesión al finalizarla si las marcas y, en domicilio, las ubicaciones coinciden; si no, el Profesional la cierra con justificación y las discrepancias se derivan al Administrador.',
 frecuencia='Muy alta, al finalizar cada sesión.',
 pre='La cita está realizada y sin certificar.',
 descripcion='El Profesional finaliza la atención o valida una sesión pendiente [Excepción 1], el Sistema analiza las marcas y las ubicaciones [Excepción 2], el Profesional revisa el resultado y confirma el cierre [Excepción 3], el Sistema certifica la sesión y registra el detalle en la bitácora [Excepción 4].',
 excepciones=[
  'El Profesional finaliza sin una de las ubicaciones. El Sistema detiene la certificación automática. El Profesional cierra la sesión con justificación.',
  'El Sistema detecta que estaban lejos, suspende la sesión y la deriva al Administrador por aviso y por correo. El Administrador revisa el caso en las sesiones suspendidas. El Sistema permite al Profesional cerrarla con justificación.',
  'El Profesional rechaza el resumen o pierde la conexión antes de confirmar. El Sistema no certifica la sesión. El Profesional la valida más tarde.',
  'El Sistema no logra guardar la certificación y pide reintentar. El Profesional reintenta en unos minutos. El Sistema certifica la sesión.'],
 pos='La sesión queda certificada una sola vez; si fue suspendida, el Administrador la ve hasta que se certifique.')

T['CU40'] = dict(
 resumen='El Profesional documenta las técnicas aplicadas y la respuesta del paciente durante la atención o al final de su jornada.',
 frecuencia='Muy alta, en cada sesión.',
 pre='La cita está en curso, o realizada y pendiente de documentar.',
 descripcion='El Profesional abre la sesión clínica durante la atención o desde sus pendientes de documentar [Excepción 1], el Sistema muestra el contexto de la sesión y habilita el registro [Excepción 2], el Profesional escribe las técnicas y la respuesta del paciente y guarda [Excepción 3], el Sistema guarda la evolución y habilita las metas y la firma [Excepción 4].',
 excepciones=[
  'El Profesional abre una sesión sin atención en curso ni pendiente. El Sistema la muestra en solo lectura e indica cómo iniciar la atención. El Profesional inicia la atención desde el historial.',
  'El Sistema no logra obtener la especialidad y muestra los campos generales. El Profesional continúa con esos campos. El Sistema guarda el registro igualmente.',
  'El Profesional describe señales de deterioro grave. El Sistema marca el registro con alerta prioritaria. El Profesional activa la atención prioritaria.',
  'El Sistema pierde la conexión y guarda un borrador en el teléfono. El Profesional sincroniza al recuperar la red. El Sistema guarda la evolución.'],
 pos='La intervención queda documentada en la historia de salud.')

T['CU30'] = dict(
 resumen='El Sistema impide editar o eliminar los registros clínicos firmados; las correcciones se agregan como versiones.',
 frecuencia='Muy alta, al finalizar cada atención.',
 pre='La evolución tiene la intervención registrada, con la atención en curso o pendiente de documentar.',
 descripcion='El Profesional cierra y firma el registro desde la sesión clínica [Excepción 1], el Sistema lo sella como inalterable y lo retira de los pendientes [Excepción 2], el Profesional intenta modificar o eliminar el registro sellado [Excepción 3], el Sistema deniega la acción, la registra en la bitácora y ofrece agregar una corrección [Excepción 4].',
 excepciones=[
  'El Profesional intenta firmar sin registro profesional en su perfil. El Sistema bloquea el sellado. El Profesional actualiza su perfil.',
  'El Sistema falla al sellar el registro y lo mantiene abierto. El Profesional reporta la incidencia. El Sistema sella el registro al reintentar.',
  'El Profesional intenta editar el registro con la sesión expirada. El Sistema le pide ingresar nuevamente y luego bloquea la edición. El Profesional agrega una corrección versionada.',
  'El Sistema detecta un intento de borrar la bitácora y guarda una alerta crítica. El Administrador revisa la alerta. El Sistema mantiene la bitácora intacta.'],
 pos='El registro original queda protegido contra modificaciones.')

T['CU11'] = dict(
 resumen='El Profesional accede a su panel con cuatro secciones: inicio con su nómina de pacientes, jornada, mensajes y perfil.',
 frecuencia='Muy alta.',
 pre='El Profesional está autenticado.',
 descripcion='El Profesional inicia sesión y entra a su panel [Excepción 1], el Sistema verifica su rol y muestra las banderas rojas, las derivaciones recibidas, su nómina y su jornada por día, semana o mes [Excepción 2], el Profesional busca un paciente o toca una cita de su jornada [Excepción 3], el Sistema abre la ficha clínica del paciente respetando su privacidad [Excepción 4].',
 excepciones=[
  'El Profesional entra con la sesión expirada. El Sistema lo lleva al inicio de sesión. El Profesional ingresa nuevamente.',
  'El Sistema detecta que el usuario no tiene rol de profesional, deniega el acceso y lo registra. El usuario solicita el rol al administrador. El Sistema habilita el panel al asignarse el rol.',
  'El Profesional busca un paciente que no está en su nómina. El Sistema informa que no hay resultados. El Profesional limpia la búsqueda.',
  'El Sistema no logra recuperar la información o el paciente no está vinculado, e informa el problema. El Profesional actualiza o vuelve a la nómina. El Sistema muestra la información disponible.'],
 pos='El Profesional ve la información de sus pacientes y su agenda.')

T['CU09'] = dict(
 resumen='El Paciente mantiene sus datos de contacto y su foto de perfil, y decide qué datos ve su profesional.',
 frecuencia='Baja.',
 pre='El Paciente está autenticado.',
 descripcion='El Paciente abre su perfil para editar sus datos, su foto o su privacidad [Excepción 1], el Sistema muestra sus datos y las opciones de visibilidad [Excepción 2], el Paciente modifica sus datos o activa y desactiva las opciones [Excepción 3], el Sistema valida y guarda los cambios y deja registro en la bitácora [Excepción 4].',
 excepciones=[
  'El Paciente abre su perfil con el servidor fuera de servicio. El Sistema muestra un error de carga. El Paciente reintenta tras recargar la aplicación.',
  'El Sistema falla al mostrar las opciones y registra el error. El Paciente reinicia la aplicación. El Sistema muestra las opciones.',
  'El Paciente ingresa un dato con formato incorrecto o una foto no permitida. El Sistema rechaza el cambio e indica el campo. El Paciente corrige el dato o elige otra imagen.',
  'El Sistema no logra guardar los cambios y revierte la opción. El Paciente vuelve a intentarlo. El Sistema guarda el cambio.'],
 pos='Los datos quedan actualizados y la visibilidad se aplica a lo que ve el profesional; el contacto de emergencia siempre es visible.')

T['CU35'] = dict(
 resumen='El actor visualiza documentos clínicos, adjuntos del chat y material de apoyo sin descargarlos, y el Paciente puede descargar su ficha clínica completa.',
 frecuencia='Alta, en cada consulta de un documento.',
 pre='El actor tiene permiso sobre el documento según su rol.',
 descripcion='El actor selecciona un documento, un adjunto o, siendo Paciente, la descarga de su ficha [Excepción 1], el Sistema valida sus permisos [Excepción 2], el actor solicita abrir el documento [Excepción 3], el Sistema lo muestra según su tipo o entrega la ficha para guardarla, y registra la consulta [Excepción 4].',
 excepciones=[
  'El actor selecciona un archivo que no puede procesarse. El Sistema informa el error de carga. El actor selecciona otro archivo.',
  'El Sistema detecta un acceso sin permiso, lo deniega y lo registra. El actor vuelve al menú. El Sistema mantiene el documento protegido.',
  'El actor cancela antes de que cargue el documento. El Sistema detiene la carga. El actor navega a otra sección.',
  'El Sistema falla al mostrar el documento o al generar la ficha e informa el error. El actor recarga o reintenta la descarga. El Sistema muestra el documento.'],
 pos='La información se consulta sin quedar guardada en el teléfono, salvo la ficha que descarga el Paciente, cuya descarga queda registrada.')
