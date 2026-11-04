# -*- coding: utf-8 -*-
"""
Fichas de CU del Incremento 4, según el código final (commit c36a0434).

INC4: los 6 CU del incremento. PREVIOS: CU de incrementos anteriores que
cambiaron por la ronda de correcciones. Cada ficha lleva 'cambio' (la línea
que va ANTES del bloque para copiar, nunca dentro) y 'tipo' (Nuevo /
Modificación).
"""

CU65 = dict(
    id='CU65', tipo='Nuevo en el Incremento 4 (ficha del Documento 0 reescrita)',
    cambio='La ficha del Documento 0 hablaba de "privilegios de lectura" temporales. Quedó como traspaso: mientras está pendiente, el receptor solo lee la ficha; al aceptar, el episodio pasa a su cargo y quien derivó queda en solo lectura. Se agregan aceptar/rechazar, cancelar, avisos, una sola derivación pendiente por episodio y los límites de la justificación (10 a 255 caracteres).',
    nombre='Registrando y Siguiendo Derivaciones Internas',
    actores='Profesional',
    resumen='El profesional a cargo de un episodio abierto lo deriva a un profesional de otra especialidad con una justificación clínica. Mientras la derivación está pendiente, el receptor puede leer la ficha del paciente para decidir; si la acepta, el episodio pasa a su cargo y quien derivó lo conserva en solo lectura; si la rechaza, el episodio sigue con quien lo derivó.',
    frecuencia='Baja, sujeta a la complejidad del tratamiento clínico del paciente.',
    pre='El paciente tiene un episodio clínico abierto a cargo del profesional que deriva, y ese episodio no tiene otra derivación pendiente.',
    descripcion='El profesional abre la Ficha Clínica del paciente, elige el episodio y presiona "Derivar" [Excepción 1], el sistema despliega las especialidades con los profesionales activos que pueden recibir la derivación, junto con las derivaciones anteriores del episodio [Excepción 2], el profesional elige la especialidad, el profesional que recibe y escribe la justificación clínica, y presiona "Enviar derivación" [Excepción 3], el sistema registra la derivación como pendiente en una sola transacción junto con su registro en la bitácora de auditoría, avisa al receptor y le habilita la lectura de la ficha; mientras siga pendiente, quien la envió puede cancelarla [Excepción 4], el receptor abre "Derivaciones recibidas" desde su Inicio o desde el aviso, revisa la ficha en solo lectura y acepta, o rechaza indicando el motivo: al aceptar, el sistema traspasa el episodio a su cargo, desvincula del episodio las citas futuras de quien derivó y le avisa a este; al rechazar, le avisa el motivo y el receptor deja de ver la ficha [Excepción 5].',
    excepciones=[
        'El episodio está cerrado y es inalterable. El sistema no muestra la opción "Derivar" y, si la solicitud llega igual, la rechaza con el aviso "Episodio inalterable". El profesional abre un episodio clínico nuevo para derivar al paciente.',
        'Ninguna especialidad tiene profesionales activos para recibir la derivación, o la especialidad elegida no los tiene. El sistema informa el bloqueo y ofrece el botón "Crear ticket de soporte". El profesional pide al administrador el alta del profesional o de la especialidad.',
        'El profesional no elige el destino, la justificación tiene menos de 10 o más de 255 caracteres, intenta derivarse el episodio a sí mismo o el episodio ya tiene una derivación pendiente. El sistema rechaza el envío e indica el motivo. El profesional completa los datos, o espera la respuesta de la derivación pendiente o la cancela.',
        'Falla la escritura de la derivación o de su registro en la bitácora. El sistema revierte la transacción completa sin dejar accesos a medias e informa que la derivación no se registró. El profesional repite la solicitud.',
        'La derivación ya fue respondida o cancelada, o el episodio se cerró o cambió de responsable antes de aceptarla. El sistema no traspasa nada e informa el motivo. El receptor recarga la lista de derivaciones recibidas.',
    ],
    pos='Si el receptor acepta, el episodio queda a su cargo con todas sus funciones clínicas (sesiones, metas, pautas e informe de alta) y quien derivó conserva la ficha en solo lectura. Si rechaza o la derivación se cancela, el episodio sigue con quien derivó y el receptor deja de ver la ficha. Al cerrarse el episodio, sus derivaciones vigentes quedan cerradas.',
    dep='RF12, RF28, RF52, RF65.',
)

CU72 = dict(
    id='CU72', tipo='Nuevo en el Incremento 4 (ficha del Documento 0 ajustada)',
    cambio='Se agregan la detección automática por la bitácora del financiador (ventana de 30 minutos) y el modo manual del administrador, el estado "provisorio", el aviso al paciente y la regularización por el administrador. La Excepción 1 cambia: el formulario se oculta y se deriva al paciente a "Pagos y bonos", porque el profesional nunca valida bonos.',
    nombre='Ingresando Datos mediante Interfaz de Contingencia',
    actores='Profesional, Administrador',
    resumen='Cuando el financiador deja de responder, el profesional o el administrador ingresa a mano el folio, el financiador y los montos del bono electrónico de una cita. El bono queda provisorio, fija el copago del paciente y permite continuar la atención; cuando el financiador vuelve a responder, el administrador lo valida con él.',
    frecuencia='Muy baja, habilitada solo durante caídas del financiador.',
    pre='El financiador agotó los reintentos de validación dentro de la ventana de contingencia (parámetro VENTANA_CONTINGENCIA_MINUTOS, 30 minutos), o el administrador activó el modo de contingencia (parámetro MODO_CONTINGENCIA_FINANCIADOR).',
    descripcion='El actor abre "Bonos por contingencia" desde su Perfil o desde la cuadratura de coberturas del paciente, si es profesional, o "Contingencia de bonos" desde el Panel de administración, si es administrador, donde además puede forzar el modo de contingencia [Excepción 1], el sistema muestra el estado del financiador y las citas sin bono validado (el profesional ve solo las suyas); el actor elige la cita y el sistema despliega el formulario con folio, financiador, cobertura y copago [Excepción 2], el actor transcribe los datos del bono y presiona "Registrar bono provisorio" [Excepción 3], el sistema guarda el bono como provisorio con quién y cuándo lo registró, fija el copago de la cita, deja el registro en la bitácora de auditoría y avisa al paciente; cuando el financiador vuelve a responder, el administrador presiona "Validar con el financiador" y el bono queda validado o no validado [Excepción 4].',
    excepciones=[
        'El financiador está operativo y el modo de contingencia está desactivado. El sistema muestra "Financiador operativo" sin el formulario y, si un registro llega igual, lo rechaza. El actor le indica al paciente que registre su bono desde "Pagos y bonos", donde se valida en línea.',
        'El catálogo de financiadores no está disponible o el financiador no aparece en él. El sistema habilita un campo de texto libre para el nombre. El actor escribe el financiador a mano; al regularizar, el administrador lo elige del catálogo.',
        'Faltan datos obligatorios o tienen un formato inválido (folio BON-XXXXXX, montos enteros), el folio ya está registrado en otra cita o la cita ya tiene un bono validado. El sistema bloquea el registro y resalta los campos con el motivo. El actor corrige o completa los datos.',
        'Falla la persistencia al guardar el bono. El sistema informa que la operación no pudo procesarse y conserva los datos en el formulario. El actor reintenta el envío.',
    ],
    pos='La cita queda con un bono provisorio que fija el copago del paciente y permite continuar la prestación sin validación en línea del financiador, pendiente de que el administrador lo regularice.',
    dep='RF66, RF69, RF70, RF72.',
)

CU66 = dict(
    id='CU66', tipo='Modificación (Incremento 2)',
    cambio='Excepción 3: el aviso ahora ofrece que el profesional ingrese el bono por contingencia (CU72). Poscondición: un bono provisorio también fija el copago.',
    nombre='Registrando y Validando Bonos de Cobertura',
    actores='Paciente',
    resumen='Acreditación y persistencia del bono de cobertura de una cita, validado contra el Financiador a través de la capa adaptadora, determinando el copago del paciente.',
    frecuencia='Alta, requerida para aplicar la cobertura previsional a cada cita clínica.',
    pre='La cita del paciente está agendada o confirmada, y existe un Financiador con convenio activo.',
    descripcion='El Paciente selecciona el Financiador e inserta el folio del bono en el formulario de pagos de la aplicación móvil [Excepción 1], el Sistema valida el formato del folio, encapsula las variables y dispara el payload hacia el servicio de validación del Financiador a través de la capa adaptadora [Excepción 2], el Paciente aguarda la resolución observando el indicador de estado de red [Excepción 3], el Sistema procesa el retorno afirmativo y persiste el bono validado con su monto de cobertura y copago [Excepción 4].',
    excepciones=[
        'El Paciente ingresa un folio que incumple el formato exigido. El Sistema detiene el envío renderizando el aviso en la interfaz. El Paciente corrige el formato del código.',
        'El Sistema recibe del Financiador una respuesta de rechazo por discrepancia de autenticación. El Sistema registra el bono como no validado y lo informa. El Paciente verifica el folio con su institución o procede con la tarifa completa particular.',
        'El Sistema alcanza el límite de espera sin respuesta del Financiador tras los reintentos automáticos. El Sistema informa que el bono no pudo registrarse, deja la falla en la bitácora de transacciones externas y sugiere pedirle al profesional que lo ingrese en modo contingencia. El Paciente reintenta más tarde o su profesional registra el bono provisorio (CU72).',
        'El Sistema experimenta rechazo de escritura por bloqueos de tabla en la persistencia. El Sistema aplica un retardo progresivo y reintenta la escritura. El Sistema asienta el registro exitosamente.',
    ],
    pos='El bono queda validado y el copago de la cita calculado; un bono provisorio ingresado por contingencia también fija el copago hasta su regularización, y sin bono validado ni provisorio la cita mantiene el arancel completo.',
    dep='RF66, RF68, RF70, RF72, RNF14.',
)

CU71 = dict(
    id='CU71', tipo='Modificación (Incremento 2)',
    cambio='La cuadratura muestra también los bonos provisorios por contingencia, y la Excepción 1 suma la salida "Ingresar bono por contingencia" (CU72).',
    nombre='Sincronizando y Validando Sesiones Bonificables',
    actores='Profesional',
    resumen='Contrastación cuantitativa entre las sesiones ejecutadas y las coberturas autorizadas del paciente (paquetes de sesiones y bonos por cita), con alertas ante discrepancias.',
    frecuencia='Media, consultada por el profesional al cerrar atenciones amparadas por esquemas de previsión.',
    pre='El Paciente posee citas realizadas con el Profesional y paquetes o bonos registrados.',
    descripcion='El Profesional solicita la cuadratura de coberturas desde el historial del paciente [Excepción 1], el Sistema calcula las sesiones realizadas por el profesional y las contrasta con las sesiones autorizadas en los paquetes del paciente y con los bonos registrados por cita, informando aparte los bonos provisorios ingresados por contingencia que siguen pendientes de validar con el financiador [Excepción 2], el Profesional revisa el resumen y las alertas en la Vista [Excepción 3], el Sistema mantiene la cuadratura disponible para la siguiente consulta [Excepción 4].',
    excepciones=[
        'El Sistema detecta sesiones realizadas sin Bono Electrónico registrado. El Sistema las lista como alerta y, si el financiador no responde, ofrece el enlace para ingresar el bono por contingencia. El Profesional solicita al Paciente el registro del bono correspondiente o lo ingresa como provisorio (CU72).',
        'El Sistema detecta que la cantidad de Sesiones Clínicas ejecutadas excede las autorizadas. El Sistema emite una alerta por discrepancia de saldo. El Profesional solicita al Paciente la adquisición de un nuevo plan o bono.',
        'El Profesional descarta la alerta de cuadratura. El Sistema la oculta hasta la próxima consulta. El Profesional continúa con la atención.',
        'El Sistema sufre una pérdida de conexión con la base de datos durante la sincronización. El Sistema informa que la sincronización quedó pendiente. El Profesional reintenta la operación.',
    ],
    pos='El Profesional conoce las discrepancias entre las atenciones ejecutadas y las coberturas autorizadas del paciente, incluidos los bonos provisorios pendientes de regularizar.',
    dep='RF66, RF71, RF72, RF76.',
)

CU28 = dict(
    id='CU28', tipo='Modificación (Incremento 1)',
    cambio='La derivación interna (CU65) da acceso a la ficha: el receptor la lee mientras la derivación está pendiente y quien derivó la conserva en solo lectura tras el traspaso. También se entra desde "Derivaciones recibidas", y los episodios a cargo de otro profesional se ven en solo lectura.',
    nombre='Consolidando historial en ficha clínica electrónica',
    actores='Profesional',
    resumen='Integración cronológica de la historia de salud del paciente en una Ficha Clínica única organizada en pestañas: historial, anamnesis, episodios, sesión clínica y pautas.',
    frecuencia='Muy Alta, ejecutada en cada revisión de paciente o sesión clínica.',
    pre='El Paciente está vinculado al Profesional mediante un episodio clínico, una cita vigente o una derivación interna (recibida y pendiente de respuesta, o enviada y aceptada).',
    descripcion='El Profesional solicita acceso a la Ficha Clínica Electrónica de un paciente desde su nómina, desde Mi Jornada o desde Derivaciones recibidas [Excepción 1], el Sistema verifica la vinculación y recupera la totalidad del historial: datos del paciente (respetando su configuración de privacidad), citas propias y de otros profesionales, episodios clínicos, evoluciones con sus correcciones versionadas y documentos multimedia, organizándolos cronológicamente [Excepción 2], el Profesional visualiza la interfaz unificada de trayectoria clínica, con las citas de otros profesionales en modo bloqueado y los episodios a cargo de otro profesional en solo lectura, y navega entre las pestañas de la ficha [Excepción 3].',
    excepciones=[
        'El Profesional intenta acceder a un paciente no vinculado. El Sistema deniega el acceso basándose en la política de permisos. El Profesional solicita la asignación al Administrador o la derivación al profesional a cargo del episodio.',
        'El Sistema detecta un error de conexión con el servicio de base de datos. El Sistema emite un código de error de persistencia y ofrece reintentar. El Profesional reintenta la consulta.',
        'El repositorio multimedia no se encuentra configurado o disponible. El Sistema carga únicamente los registros de texto. El Profesional visualiza un aviso de indisponibilidad temporal de los archivos.',
    ],
    pos='El Profesional visualiza la trayectoria clínica integral para la toma de decisiones; solo el profesional a cargo de cada episodio puede registrar en él.',
    dep='RF09, RF12, RF28, RF33, RF65, RF78.',
)

CU62 = dict(
    id='CU62', tipo='Nuevo en el Incremento 4 (ficha del Documento 0 reescrita)',
    cambio='El "Supervisor" es el Administrador (decisión D1). Los textos vigilados son los comentarios de síntomas, las reseñas y los tickets, y no el chat cifrado (decisión del 03-11-2026). En vez de un canal bidireccional, la bandeja se actualiza sola cada 15 segundos. El reintento del acuse lo hace la app (3 intentos), no una caché del servidor. Se agregan el aviso a los administradores y el acuse simultáneo.',
    nombre='Escalando Automáticamente Eventos Críticos a Supervisión',
    actores='Administrador',
    resumen='Cuando un comentario de un reporte de síntomas, una reseña o una solicitud de soporte contiene un término de la categoría crítica del diccionario, el sistema guarda el texto igual, crea un evento crítico y avisa a los administradores, que lo revisan en la bandeja "Eventos críticos" y acusan recibo. El chat clínico no se revisa porque es cifrado y privado entre el paciente y su profesional.',
    frecuencia='Baja, activada solo ante coincidencias con términos críticos.',
    pre='El diccionario de términos restringidos tiene al menos un término activo de la categoría crítica, y el administrador tiene sesión iniciada.',
    descripcion='El sistema, al guardarse un comentario de síntomas, una reseña o un ticket de soporte, lo compara con los términos críticos activos y, si coincide, registra el evento con su origen, los términos detectados y un extracto, deja el registro en la bitácora de auditoría y avisa a los administradores con sesión activa [Excepción 1], el administrador abre "Eventos críticos" desde el aviso o desde el Panel de administración, donde el contador de pendientes lo destaca, y el sistema lista los eventos pendientes con su origen, los términos, el extracto, el autor y el paciente, actualizando la bandeja cada 15 segundos [Excepción 2], el administrador revisa el caso y presiona "Acusar recibo" [Excepción 3], el sistema marca el evento como acusado con el administrador y el momento del acuse, y lo registra en la bitácora de auditoría [Excepción 4].',
    excepciones=[
        'No hay ningún administrador con sesión activa. El sistema avisa a todos los administradores activos en el centro de notificaciones y además por correo. El administrador revisa la bandeja al ingresar.',
        'La bandeja no tiene eventos pendientes, o se pierde la conexión durante la actualización periódica. El sistema muestra que la bandeja está vacía o, sin conexión, una advertencia que pausa la sincronización sin vaciar la lista y se reanuda sola al volver la señal. El administrador espera o vuelve a la bandeja más tarde.',
        'El administrador sale de la bandeja sin acusar recibo, u otro administrador ya acusó el mismo evento. El sistema mantiene el evento pendiente y en el contador del panel hasta que alguien lo acuse; si ya estaba acusado, lo informa y recarga la lista. El administrador acusa el evento en otra visita o sigue con el siguiente.',
        'Falla la escritura del acuse. El sistema reintenta el acuse automáticamente hasta tres veces y, si no lo logra, informa que el evento sigue pendiente. El administrador vuelve a intentarlo al restablecerse la conexión.',
    ],
    pos='El evento crítico queda acusado con el administrador y el momento del acuse, y tanto el escalamiento como el acuse quedan registrados en la bitácora de auditoría.',
    dep='RF52, RF57, RF62, RNF20.',
)

CU53 = dict(
    id='CU53', tipo='Modificación (Incremento 3)',
    cambio='Ahora hay una conversación por paciente y profesional, no una por episodio. Se puede escribir mientras haya un episodio abierto o una cita vigente; si no, queda en solo lectura. Se suman adjuntos (imagen o archivo) y "Desde Documentos". El mensaje pendiente se reenvía al reabrir el chat. El chat no escala eventos críticos.',
    nombre='Comunicando mediante mensajería clínica cifrada',
    actores='Paciente, Profesional',
    resumen='Chat entre un paciente y un profesional que lo atiende, con una sola conversación por pareja. Los mensajes se guardan cifrados con AES-256-GCM y se descifran solo al servirlos a los dos participantes; se pueden adjuntar imágenes y archivos o enviar un documento de la ficha clínica, y la aplicación consulta novedades cada pocos segundos mientras la conversación está abierta. Los mensajes no se revisan para el escalamiento de eventos críticos.',
    frecuencia='Alta, bajo demanda durante el tratamiento.',
    pre='El paciente y el profesional están vinculados por un episodio clínico, una cita no cancelada o mensajes anteriores entre ellos.',
    descripcion='El actor abre Mensajes, elige la conversación con la otra parte, o el profesional entra desde la Ficha Clínica del paciente, y redacta un mensaje o presiona el clip para adjuntar una imagen, un archivo o un documento de la ficha clínica [Excepción 1], el sistema pasa el texto por el filtro de contenido, lo cifra y lo guarda con su remitente y, si hay adjunto, lo sube al repositorio en la nube o enlaza el documento de la ficha; luego avisa a la otra parte con un único aviso por conversación que se actualiza con la cantidad de mensajes pendientes [Excepción 2], la otra parte abre la conversación, agrupada por día, y abre los adjuntos en el visor de documentos [Excepción 3], el sistema descifra los mensajes, los marca como leídos y sigue entregando los nuevos cada seis segundos [Excepción 4].',
    excepciones=[
        'El mensaje contiene términos bloqueantes del diccionario de palabras restringidas, supera los 1000 caracteres, o el adjunto tiene un formato no permitido o supera el tamaño máximo. El sistema bloquea el envío sin guardar el texto ni el archivo y muestra la advertencia. El actor reescribe el mensaje o elige otro archivo.',
        'Falla el envío por pérdida de red o error del servidor. La aplicación conserva el mensaje de texto en el dispositivo marcado como pendiente de envío y lo reenvía al volver a abrir la conversación; un adjunto no se retiene. El actor reabre la conversación o vuelve a adjuntar el archivo.',
        'No hay un episodio abierto ni una cita vigente entre el paciente y el profesional. El sistema reemplaza la caja de texto por un aviso y deja la conversación en solo lectura. El actor lee el historial; la conversación se reabre al agendar una nueva hora.',
        'Un mensaje no puede descifrarse porque la clave del servidor cambió o el registro está alterado. El sistema no muestra basura ni falla: entrega ese mensaje como ilegible con una advertencia. El administrador revisa la clave de cifrado configurada en el servidor.',
    ],
    pos='Los mensajes quedan almacenados y cifrados en la base de datos, ilegibles para cualquiera que no sea uno de los dos participantes, y los adjuntos quedan disponibles solo para ellos dentro de la conversación.',
    dep='RF33, RF35, RF53, RF57.',
)

CU57 = dict(
    id='CU57', tipo='Modificación (Incremento 3)',
    cambio='Nueva categoría "crítico": no bloquea el texto, lo deja pasar y alimenta el escalamiento (CU62) en síntomas, reseñas y tickets; en el chat no hace nada. Las reseñas incluyen ahora los comentarios de sesión y las reseñas de tratamiento.',
    nombre='Filtrando automáticamente contenido restringido',
    actores='Paciente, Profesional, Administrador',
    resumen='Cada texto que un paciente o profesional envía al chat clínico, o que el paciente deja como comentario de sesión o reseña de tratamiento, se contrasta contra el diccionario de términos restringidos que administra el Administrador; si coincide con un término bloqueante, no se guarda. Los términos de la categoría crítica no bloquean: el texto se guarda y el caso se escala a supervisión (CU62), salvo en el chat.',
    frecuencia='Alta, en cada envío de texto a los módulos cualitativos.',
    pre='El diccionario de términos restringidos está poblado con al menos un término activo.',
    descripcion='El administrador gestiona el diccionario desde Términos restringidos: agrega términos con categoría (general, ofensa, descalificación, datos sensibles o crítico), los activa o desactiva y los elimina; cada cambio refresca la caché del filtro [Excepción 1], el actor envía un mensaje del chat, un comentario de sesión o una reseña de tratamiento [Excepción 2], el sistema normaliza el texto y lo compara por palabra completa contra los términos activos [Excepción 3], el sistema bloquea la escritura si coincide un término bloqueante, registra el bloqueo en la bitácora sin guardar el texto y muestra la advertencia; en el chat el mensaje no se envía y en la evaluación se registra solo la respuesta o la nota [Excepción 4].',
    excepciones=[
        'El administrador intenta agregar un término de menos de dos caracteres o uno que ya existe. El sistema rechaza el término corto, o reactiva el existente con la categoría elegida. El administrador corrige el término.',
        'El actor envía un texto sin caracteres imprimibles. El sistema lo rechaza antes de pasar por el filtro. El actor escribe un mensaje válido.',
        'No hay coincidencias con términos bloqueantes, o solo coinciden términos críticos. El sistema autoriza el envío y guarda el texto; si hubo términos críticos y el texto no es del chat, crea el evento crítico (CU62). El actor ve la confirmación de envío.',
        'Se pierde la conexión durante la validación. En el chat la aplicación conserva el mensaje en el dispositivo y lo reenvía al reabrir la conversación; en la evaluación el actor reintenta. El texto no se pierde localmente.',
    ],
    pos='El texto con términos bloqueantes no se almacena ni puede leerse por terceros; solo queda en la bitácora el registro del bloqueo. Los textos con términos críticos quedan guardados y, fuera del chat, escalados a supervisión.',
    dep='RF53, RF55, RF57, RF59, RF62.',
)

CU55 = dict(
    id='CU55', tipo='Modificación (Incremento 3)',
    cambio='La evaluación se divide en dos. Después de cada sesión: solo "¿Quedaste satisfecho con la atención?" (Sí/No) más un comentario opcional, sin estrellas. Al cerrar el episodio: la calificación en estrellas (1 a 5) del tratamiento más una reseña opcional, que es lo único que entra al promedio.',
    nombre='Evaluando satisfacción post-sesión',
    actores='Paciente',
    resumen='Después de cada sesión el paciente responde si quedó satisfecho con la atención y puede dejar un comentario. Al terminar el tratamiento, cuando se cierra el episodio clínico, califica al profesional con una nota de 1 a 5 estrellas y una reseña opcional; esa nota entra al promedio del profesional. Los comentarios y reseñas quedan pendientes de moderación.',
    frecuencia='Alta, una vez por cada cita realizada y una vez por cada tratamiento terminado.',
    pre='La cita del paciente está en estado Realizada y no tiene evaluación, o el episodio clínico está cerrado y el tratamiento no fue calificado.',
    descripcion='El sistema, al finalizar la sesión, envía al paciente el aviso "¿Cómo fue tu sesión?" y, al cerrarse el episodio por el alta o por el cierre del profesional, el aviso "Califica tu tratamiento" [Excepción 1], el paciente toca el aviso y la aplicación abre Mis Citas con el formulario correspondiente desplegado [Excepción 2], el paciente responde Sí o No a "¿Quedaste satisfecho con la atención?" o marca la nota en estrellas del tratamiento y, si quiere, escribe un comentario [Excepción 3], el sistema registra la evaluación y pasa el comentario por el filtro de contenido; en la del tratamiento además recalcula el promedio del profesional bloqueando su fila y lo persiste en su perfil [Excepción 4].',
    excepciones=[
        'El paciente intenta evaluar una cita que no está Realizada o que ya evaluó, o calificar un tratamiento que sigue abierto o que ya calificó. El sistema rechaza el registro e informa el motivo. El paciente espera el cierre de la sesión o del tratamiento, o revisa su evaluación anterior.',
        'El aviso no se muestra o el paciente lo descarta. El sistema mantiene la cita en el bloque "¿Cómo fue tu sesión?" y el tratamiento en el bloque "Califica tu tratamiento" de Mis Citas. El paciente responde desde ahí.',
        'El paciente envía la respuesta o la nota sin comentario, o el comentario contiene términos no permitidos. El sistema registra únicamente la respuesta o la nota; en el segundo caso avisa que el comentario no quedó registrado porque incluye términos no permitidos. El paciente vuelve a Mis Citas.',
        'Dos calificaciones de tratamiento del mismo profesional se registran al mismo tiempo. El sistema aplica un bloqueo temporal de la fila del profesional, serializa el cálculo y asienta el promedio final. Ninguna calificación se pierde.',
    ],
    pos='La respuesta de la sesión queda registrada y alimenta el indicador de satisfacción del panel administrativo; la nota del tratamiento modifica el promedio del profesional. El comentario o la reseña, si los hubo, quedan pendientes de moderación.',
    dep='RF41, RF55, RF58, RF64, RF78.',
)

CU56 = dict(
    id='CU56', tipo='Modificación (Incremento 3)',
    cambio='Se moderan los comentarios de sesión y las reseñas de tratamiento. La tarjeta muestra "Sesión" con "Satisfecho/No satisfecho", o "Tratamiento" con estrellas, en vez de la nota. Los botones se llaman "Publicar" y "Rechazar", y la causal exige al menos 4 caracteres.',
    nombre='Moderando testimonios públicos',
    actores='Administrador',
    resumen='El administrador revisa los comentarios de sesión y las reseñas de tratamiento que escriben los pacientes antes de que se publiquen en el perfil del profesional: los publica o los rechaza con una causal. La respuesta de satisfacción y la nota en estrellas nunca pasan por moderación.',
    frecuencia='Media, según el volumen de comentarios escritos.',
    pre='Existe al menos una evaluación con comentario o reseña en estado Pendiente.',
    descripcion='El administrador abre Moderar testimonios y filtra por Pendientes, Publicadas o Rechazadas [Excepción 1], el sistema lista los textos saneados con su tipo (sesión, con la respuesta de satisfacción, o tratamiento, con su nota en estrellas), la fecha, el paciente y el profesional evaluado [Excepción 2], el administrador presiona "Publicar", o "Rechazar" indicando la causal en el diálogo [Excepción 3], el sistema guarda la decisión con el moderador y el momento: la publicación muestra el texto en el perfil y avisa al profesional; el rechazo aplica un borrado lógico que lo conserva con su causal pero lo excluye de las lecturas públicas [Excepción 4].',
    excepciones=[
        'No hay textos en el estado filtrado. El sistema muestra el conjunto vacío. El administrador vuelve al panel.',
        'El texto contiene caracteres de control o codificación no estándar. El sistema lo sanea antes de mostrarlo. El administrador lee la versión corregida.',
        'El administrador intenta rechazar sin causal o con una causal de menos de cuatro caracteres. El sistema no aplica la decisión hasta que la escriba. El administrador especifica la causal.',
        'Falla la escritura de la decisión. El sistema revierte la transacción y el texto conserva su estado anterior. El administrador reintenta.',
    ],
    pos='El comentario o la reseña quedan en estado Publicado o Rechazado.',
    dep='RF56, RF57.',
)

CU58 = dict(
    id='CU58', tipo='Modificación (Incremento 3)',
    cambio='El promedio y el total cuentan solo las notas en estrellas (las de tratamiento y las de sesión anteriores al cambio). La lista de testimonios incluye también los comentarios de sesión. Se suma la entrada desde el perfil del profesional. La carga se muestra con un indicador y no con un esqueleto.',
    nombre='Calculando y visualizando calificación profesional',
    actores='Paciente, Profesional',
    resumen='El promedio de las notas en estrellas que los pacientes dieron a cada profesional al terminar su tratamiento se persiste en su perfil y se muestra en el buscador de horas y en el perfil del profesional; al tocarlo, el paciente ve la cantidad de calificaciones y los testimonios publicados, de sesión y de tratamiento, con el nombre de su autor o "Anónimo".',
    frecuencia='Alta, en cada búsqueda de horas.',
    pre='El profesional tiene un perfil activo visible para los pacientes.',
    descripcion='El paciente busca horas por especialidad, modalidad y fecha, o abre el perfil de un profesional [Excepción 1], el sistema devuelve, junto con cada bloque, el promedio persistido del profesional y la cantidad de calificaciones en estrellas [Excepción 2], el paciente toca las estrellas o "Ver valoraciones" [Excepción 3], el sistema abre la pantalla de evaluaciones con el promedio, el total y los testimonios publicados, cada uno con su tipo, la fecha y el autor [Excepción 4].',
    excepciones=[
        'Los filtros no arrojan profesionales. El sistema muestra que no hay coincidencias y explica el motivo. El paciente amplía los filtros.',
        'El profesional no tiene calificaciones en estrellas. El sistema no inventa un promedio: muestra "Perfil nuevo · sin evaluaciones aún" en lugar de las estrellas y no habilita el acceso a los testimonios.',
        'El paciente sale de la pantalla antes de que carguen los testimonios. El sistema descarta la carga sin mostrar errores. El paciente vuelve a abrirla cuando quiera.',
        'El servidor tarda en responder o falla. El sistema muestra un indicador de carga hasta recibir los datos y, si falla, la opción de reintentar. El paciente espera o reintenta.',
    ],
    pos='El paciente ve métricas exactas del historial de calificaciones; el profesional ve la misma calificación en Mi perfil con acceso a sus evaluaciones.',
    dep='RF55, RF58.',
)

CU37 = dict(
    id='CU37', tipo='Nuevo en el Incremento 4 (ficha del Documento 0 ajustada)',
    cambio='El informe se emite como PDF en los documentos del paciente y cierra el episodio. Se agregan la exigencia del umbral de egreso (80 %), la opción "Cerrar sin informe de alta", los avisos al paciente y el cierre de las derivaciones. La Excepción 3 ya no trunca en pantalla: la app no deja escribir más de 1000 caracteres.',
    nombre='Emitiendo informe de alta y cierre de episodio',
    actores='Profesional',
    resumen='Generación de un informe de egreso consolidado en PDF, con el estado final de las metas, el resumen de la evolución y las pautas de continuidad, que queda en los documentos del paciente y ejecuta el cierre formal del Episodio Clínico.',
    frecuencia='Baja, ejecutada al finalizar el ciclo de tratamiento del paciente.',
    pre='El Episodio Clínico está abierto y a cargo del Profesional, y el promedio de cumplimiento de sus metas alcanzó el umbral de egreso (parámetro UMBRAL_EGRESO_CLINICO, 80 %).',
    descripcion='El Profesional abre la pestaña Episodios de la Ficha Clínica, consulta el episodio y presiona "Informe de alta y cierre del episodio" [Excepción 1], el Sistema consolida el historial del episodio: cumplimiento de cada meta frente al umbral, sesiones registradas y firmadas, y citas futuras pendientes [Excepción 2], el Profesional redacta las pautas de continuidad terapéutica y presiona "Emitir informe de alta y cierre del episodio" [Excepción 3], el Sistema genera el informe en PDF, lo guarda en el repositorio de documentos del paciente y, en una sola transacción, cambia el Episodio Clínico a estado Cerrado, cierra sus derivaciones vigentes y registra la emisión en la bitácora de auditoría; luego avisa al paciente que su informe está listo y le pide calificar su tratamiento [Excepción 4].',
    excepciones=[
        'El Profesional selecciona un Episodio Clínico ya cerrado. El Sistema no ofrece la emisión, muestra la fecha de cierre y desactiva los controles. El Profesional selecciona un episodio activo.',
        'El Sistema detecta evoluciones sin cerrar ni firmar, citas futuras agendadas para el episodio o un cumplimiento de metas bajo el umbral. El Sistema bloquea la emisión indicando cada pendiente. El Profesional firma las evoluciones, cancela las citas remanentes o actualiza las metas; si el tratamiento termina sin alcanzar el umbral, cierra el episodio con "Cerrar sin informe de alta".',
        'El Profesional intenta exceder el límite de 1000 caracteres en las pautas de continuidad. El Sistema no admite más texto y muestra el contador en alerta. El Profesional ajusta la redacción.',
        'El repositorio de documentos no está disponible o falla la transacción de cierre. El Sistema no cierra el episodio e informa que el informe no pudo guardarse. El Profesional reintenta la emisión.',
    ],
    pos='El informe de alta queda disponible en los documentos del paciente y en su sección de preparación para el alta, el Episodio Clínico transita a estado Cerrado sin admitir nuevos registros, y el paciente queda invitado a calificar su tratamiento.',
    dep='RF28, RF32, RF33, RF37, RF51, RF55, RF78.',
)

CU51 = dict(
    id='CU51', tipo='Nuevo en el Incremento 4 (ficha del Documento 0 reescrita)',
    cambio='La métrica es el promedio de avance de las metas terapéuticas del episodio (umbral 80 %), no el término de la última pauta, y se evalúa cuando el profesional registra un avance o cuando el paciente abre la sección. La Excepción 1 (marca fuera de plazo) pasa a CU44/CU48. Ya no hay Amazon S3: las imágenes vienen del repositorio en la nube y, si fallan, se reemplazan por un ícono. Se suma el aviso "Preparación para el alta".',
    nombre='Habilitando Automáticamente Contenidos de Preparación para el Alta',
    actores='Paciente',
    resumen='Cuando el promedio de avance de las metas terapéuticas del episodio alcanza el umbral de egreso, el sistema habilita al paciente, una única vez y de forma persistente, la sección "Prevención y alta" de Mi Tratamiento con recursos multimedia de prevención y mantenimiento.',
    frecuencia='Baja, ejecutada una única vez por episodio al alcanzar el umbral de egreso.',
    pre='El Paciente mantiene un Episodio Clínico activo con metas terapéuticas medibles.',
    descripcion='El Profesional registra el avance de una meta del episodio en la Sesión Clínica, o el Paciente abre la pestaña "Prevención y alta" de Mi Tratamiento [Excepción 1], el Sistema calcula el promedio de avance de las metas e identifica el cruce del umbral de egreso (parámetro UMBRAL_EGRESO_CLINICO, 80 %); al cruzarlo marca la preparación para el alta en el episodio, lo registra en la bitácora de auditoría y avisa al paciente [Excepción 2], el Paciente toca el aviso o entra a la pestaña "Prevención y alta" [Excepción 3], el Sistema muestra su avance hacia el alta y los recursos de prevención y mantenimiento de su especialidad, cada uno con su imagen, que se abren al tocarlos [Excepción 4].',
    excepciones=[
        'El episodio no tiene metas medibles o el promedio aún no alcanza el umbral. El Sistema muestra el avance y cuántos puntos faltan, sin habilitar los recursos. El Paciente continúa su tratamiento.',
        'El Sistema detecta metas contradictorias (sin valor objetivo, sin unidad o con un avance mayor que la meta). El Sistema no habilita la preparación y registra el evento en la bitácora de auditoría. El Paciente ve que su profesional debe revisar las metas.',
        'El Paciente intenta abrir un destino de navegación que no existe para su rol. El Sistema ignora el salto y lo deja en la pantalla actual. El Paciente entra a la sección desde Mi Tratamiento.',
        'La imagen de un recurso no carga desde el repositorio. El Sistema la reemplaza por un ícono según el tipo de recurso. El Paciente abre el recurso igual o desliza hacia abajo para recargar.',
    ],
    pos='El Paciente conserva el acceso a los recursos de prevención y mantenimiento aun después del cierre del episodio.',
    dep='RF32, RF46, RF51.',
)

CU54 = dict(
    id='CU54', tipo='Nuevo en el Incremento 4 (ficha del Documento 0 ajustada)',
    cambio='El mensaje se envía solo si el índice de adherencia sube, con textos según el hito cruzado (25, 50, 75 o 100 %), y como máximo uno al día. La preferencia es el switch "Mensajes de ánimo" del centro de notificaciones. La lectura queda en la bitácora de auditoría. Se elimina la Excepción 4 original (reloj de AWS) porque la hora la pone la base de datos, y se reemplaza por el tope diario.',
    nombre='Enviando Mensajes de Refuerzo Positivo',
    actores='Paciente',
    resumen='Emisión automática de un mensaje de ánimo cuando el Índice de Adherencia del paciente sube tras registrar un ejercicio, con un texto según el hito alcanzado (25, 50, 75 o 100 %), como máximo uno al día.',
    frecuencia='Media, dependiente del registro diario de ejercicios.',
    pre='El Paciente tiene una pauta vigente y mantiene activado el switch "Mensajes de ánimo" en las preferencias del centro de notificaciones (activado por defecto).',
    descripcion='El Paciente marca un ejercicio como realizado en Mis Ejercicios [Excepción 1], el Sistema recalcula el Índice de Adherencia, lo compara con el anterior, consulta la preferencia de refuerzos del paciente y arma el mensaje según el avance [Excepción 2], el Sistema muestra el mensaje en un diálogo dentro de la aplicación y lo envía al centro de notificaciones y como notificación push [Excepción 3], el Paciente toca el aviso, la aplicación abre Mi Progreso y el Sistema registra la lectura en la bitácora de auditoría [Excepción 4].',
    excepciones=[
        'El Paciente marca el mismo ejercicio dos veces en el día. El Sistema guarda un solo registro por ejercicio y día y no emite refuerzo. El Paciente continúa su navegación.',
        'La preferencia de refuerzos está desactivada o el índice no subió. El Sistema finaliza la rutina sin enviar mensaje. El Paciente sigue registrando sus ejercicios.',
        'El dispositivo está bloqueado, en modo no molestar o no recibe notificaciones push. El Sistema deja el aviso en el centro de notificaciones de la aplicación. El Paciente lo revisa al abrir la campana.',
        'El Paciente ya recibió un refuerzo durante el día. El Sistema no envía otro hasta el día siguiente. El Paciente ve el diálogo solo con el primer avance del día.',
    ],
    pos='El aviso y su lectura quedan registrados sin modificar la Ficha Clínica Electrónica.',
    dep='RF09, RF44, RF48, RF52, RF54, RNF11.',
)

CU78 = dict(
    id='CU78', tipo='Modificación (Incremento 2)',
    cambio='El cierre del episodio ahora se bloquea si hay evoluciones sin firmar o citas futuras, se puede hacer con o sin informe de alta (CU37), cierra las derivaciones del episodio (CU65) y pide al paciente calificar su tratamiento (CU55). Un episodio traspasado por derivación pasa a estar a cargo del receptor.',
    nombre='Agrupando registros bajo entidad episodio clínico',
    actores='Profesional',
    resumen='El Sistema asigna un identificador maestro a todas las prestaciones de salud (citas, evoluciones, pautas y documentos) impidiendo la mezcla de datos entre motivos de consulta; el episodio nace abierto, solo su profesional a cargo registra en él y lo cierra al terminar el tratamiento, con o sin informe de alta.',
    frecuencia='Ejecución continua ante cada inserción de datos clínicos',
    pre='El Paciente posee un Episodio Clínico abierto, instanciado por el Profesional o traspasado a él por una derivación interna.',
    descripcion='El Profesional genera la petición de guardado para una nueva sesión, pauta o documento multimedia en la plataforma [Excepción 1], el Sistema exige la asociación obligatoria del registro con un identificador de Episodio Clínico [Excepción 2], el Profesional selecciona el Episodio Clínico correspondiente al motivo de consulta actual en el selector de la ficha, y la cita en curso queda vinculada a él [Excepción 3], el Sistema valida que el episodio esté a cargo del profesional y abierto, y persiste el evento en el repositorio digital centralizado; al terminar el tratamiento, el Profesional cierra el episodio desde la ficha o desde el informe de alta, y el Sistema verifica que no queden evoluciones sin firmar ni citas futuras, lo cierra, cierra sus derivaciones vigentes y pide al paciente calificar el tratamiento [Excepción 4].',
    excepciones=[
        'El Profesional adjunta un formato de archivo no soportado. El Sistema rechaza la petición en la Vista. El Profesional convierte el archivo a un formato permitido.',
        'El Sistema detecta que el paciente carece de un Episodio Clínico. El Sistema guía a la creación del episodio desde la pestaña correspondiente. El Profesional instancia una nueva entidad agrupadora indicando el motivo de consulta.',
        'El Profesional selecciona un Episodio Clínico cerrado o a cargo de otro profesional. El Sistema lo muestra en solo lectura y bloquea la vinculación de nuevos registros. El Profesional asocia el evento a un episodio propio abierto o crea uno nuevo.',
        'El Sistema experimenta un fallo de persistencia al vincular el registro, o al cerrar el episodio detecta evoluciones sin firmar o citas futuras. El Sistema deniega la escritura o el cierre indicando el motivo. El Profesional regulariza los pendientes y reintenta la operación.',
    ],
    pos='El registro clínico queda vinculado de forma inalterable a un único tratamiento evitando la fragmentación de la historia de salud; un episodio cerrado no admite nuevos registros.',
    dep='RF28, RF37, RF65, RF78',
)

CU47 = dict(
    id='CU47', tipo='Modificación (Incremento 2)',
    cambio='Cada ejercicio puede llevar días fijos de la semana (L a D), que reemplazan la frecuencia. Además, el profesional puede subir material de apoyo propio por ejercicio (fotos, videos, PDF o Word), aparte del material de la biblioteca. Se agregan las validaciones de fechas y de episodio cerrado.',
    nombre='Prescribiendo pautas de ejercicio técnico',
    actores='Profesional',
    resumen='Configuración de los ejercicios, sus parámetros (series, repeticiones, frecuencia o días fijos de la semana), su material de apoyo y la vigencia de la pauta para la rehabilitación autónoma.',
    frecuencia='Alta, al asignar o ajustar el tratamiento físico del paciente.',
    pre='Profesional con sesión iniciada y un episodio clínico abierto del paciente bajo su cartera.',
    descripcion='El Profesional ingresa a la pestaña Pautas de la ficha del paciente, presiona "Nueva pauta" y selecciona el episodio clínico [Excepción 1], el Sistema habilita los campos de nombre y vigencia de la pauta y, por cada ejercicio, nombre, series, repeticiones, frecuencia (diaria o semanal) o días fijos de la semana, material opcional de la biblioteca y material de apoyo propio para adjuntar [Excepción 2], el Profesional define los parámetros técnicos, los días, el periodo de vigencia de la rutina y adjunta el material [Excepción 3], el Sistema empaqueta la configuración vinculándola al Episodio Clínico del paciente y sube cada archivo de apoyo al repositorio en la nube asociándolo a su ejercicio [Excepción 4].',
    excepciones=[
        'El Profesional intenta guardar una pauta sin nombre, sin ejercicios, con ejercicios repetidos o con una fecha de término anterior al inicio. El Sistema bloquea el formulario e indica el problema. El Profesional completa los datos.',
        'El Profesional no indica una frecuencia válida ni días fijos. El Sistema asigna frecuencia diaria por defecto; si marca los siete días, la registra como diaria. El Profesional ajusta la frecuencia o los días si corresponde.',
        'El Profesional ingresa valores no numéricos o menores a uno en series o repeticiones, o adjunta un archivo de formato no permitido o mayor al tamaño máximo. El Sistema rechaza el guardado o el archivo indicando el ejercicio en conflicto. El Profesional ingresa dígitos válidos o elige otro archivo.',
        'El Sistema detecta que el episodio indicado no existe, no pertenece al profesional o está cerrado, o falla la subida de un archivo de apoyo. El Sistema deniega la vinculación o informa qué archivos no se subieron. El Profesional instancia el Episodio Clínico base o vuelve a adjuntar el material desde la pauta.',
    ],
    pos='El paciente dispone de una Pauta de Ejercicios estructurada, con sus días y su material de apoyo, accesible desde su aplicación.',
    dep='RF33, RF46, RF47, RF78.',
)

CU48 = dict(
    id='CU48', tipo='Modificación (Incremento 2)',
    cambio='Los ejercicios con días fijos solo se marcan esos días; el resto muestran "Hoy no corresponde". El paciente puede retirar la marca de hoy y abrir el material de apoyo del ejercicio. Cada marca recalcula la adherencia (CU44) y puede generar un refuerzo (CU54).',
    nombre='Registrando cumplimiento diario de tareas',
    actores='Paciente',
    resumen='Confirmación asíncrona de la ejecución física de los ejercicios pautados, un registro por ejercicio y día, respetando los días de la semana asignados a cada ejercicio.',
    frecuencia='Muy Alta, ingresada de forma diaria por el beneficiario del tratamiento.',
    pre='El Paciente posee una Pauta de Ejercicios vigente y no expirada.',
    descripcion='El Paciente accede a Mis Ejercicios desde la sección Tratamiento [Excepción 1], el Sistema consulta la base de datos desplegando sus pautas con los ejercicios programados, sus días, su material de apoyo y su estado de cumplimiento del día [Excepción 2], el Paciente interactúa con los botones de verificación tras ejecutar cada tarea física, o retira la marca de hoy si se equivocó [Excepción 3], el Sistema persiste la marca del día en el registro de cumplimiento de la pauta y recalcula el índice de adherencia (CU44) [Excepción 4].',
    excepciones=[
        'El Paciente accede a una pauta fuera de su rango de vigencia. El Sistema muestra la pauta como programada o expirada sin controles de marcado. El Paciente revisa las fechas de la pauta.',
        'El Sistema detecta una falla de comunicación impidiendo la carga de la pauta. El Sistema activa la caché local, mostrando la última carga en modo de solo lectura. El Paciente reintenta la carga al recuperar conexión.',
        'El Paciente intenta marcar tareas de días distintos al actual, o un ejercicio que no corresponde al día de la semana. El Sistema solo admite marcas para el día de hoy según la fecha del servidor y, en los días no asignados, muestra "Hoy no corresponde" sin control de marcado. El Paciente se limita a los ejercicios del día.',
        'El Sistema recibe múltiples marcas de verificación del mismo ejercicio por error de red. El Sistema aplica control anti-rebote guardando un solo registro por ejercicio y día. El Paciente confirma el guardado visual.',
    ],
    pos='El servidor acumula los datos crudos para la posterior resolución algorítmica de la adherencia.',
    dep='RF44, RF47, RF48.',
)

CU44 = dict(
    id='CU44', tipo='Modificación (Incremento 3)',
    cambio='Las tareas programadas respetan los días fijos de cada ejercicio (solo cuentan esos días), las semanales cuentan una por semana iniciada, y las diarias, una por día. El índice también se recalcula al retirar una marca. La alerta solo se repite si el paciente empeora o se recupera y vuelve a caer.',
    nombre='Actualizando indicadores de adherencia y síntomas',
    actores='Paciente',
    resumen='Cálculo automático del índice de adherencia, guardado como una medición diaria que alimenta la curva de progreso y levanta una bandera roja cuando cae bajo el umbral.',
    frecuencia='Muy alta: tras cada registro o retiro de cumplimiento, cada cierre de sesión y cada apertura del panel de progreso.',
    pre='El paciente tiene una pauta de ejercicios vigente y registró cumplimientos, o una sesión clínica quedó cerrada.',
    descripcion='El paciente registra o retira el cumplimiento de un ejercicio en Mis Ejercicios [Excepción 1], el sistema recupera las pautas del paciente y cuenta las tareas programadas hasta hoy (en los días fijos asignados a cada ejercicio, una por semana iniciada en los semanales y una por día en los diarios) y las cumplidas [Excepción 2], el paciente navega a Mi Progreso [Excepción 3], el sistema recalcula el porcentaje con tope de 100%, lo guarda como la medición del día y actualiza la curva de síntomas y el panel [Excepción 4].',
    excepciones=[
        'El paciente registra un cumplimiento fuera del periodo de vigencia de la pauta o en un día no asignado. El sistema rechaza el registro y no lo considera en el cálculo. El paciente revisa sus tareas vigentes.',
        'Falla la lectura de las tareas programadas. El sistema suspende el cálculo y entrega el último porcentaje guardado marcado como suspendido. El paciente visualiza el valor previo.',
        'El paciente pierde la conexión al navegar. El sistema mantiene la actualización en el servidor. El paciente ve el nuevo dato al recuperar señal.',
        'El porcentaje cae bajo el umbral de seguridad habiendo al menos el mínimo de tareas programadas. El sistema emite una alerta clínica de adherencia baja al profesional tratante, una sola abierta por paciente; tras ser revisada, solo emite otra si el porcentaje empeora o si el paciente se recupera y vuelve a caer. El profesional revisa el caso desde su panel de banderas rojas.',
    ],
    pos='Los indicadores del paciente reflejan su compromiso terapéutico y quedan disponibles para él y para el profesional.',
    dep='RF38, RF44, RF48',
)

CU49 = dict(
    id='CU49', tipo='Modificación (Incremento 2)',
    cambio='Al expirar la pauta también se cierra el material de apoyo propio de cada ejercicio, y ya no se le puede agregar material nuevo.',
    nombre='Controlando vigencia y ciclo de vida de pautas',
    actores='Paciente',
    resumen='Revocación automatizada del acceso al material terapéutico, al material de apoyo de los ejercicios y a las marcas de cumplimiento tras alcanzar el límite temporal de la pauta.',
    frecuencia='En cada consulta de pautas, calculada a partir de las fechas de vigencia.',
    pre='Existencia de Pautas de Ejercicio con periodos de vigencia definidos.',
    descripcion='El Paciente ingresa a sus pautas solicitando la carga del contenido [Excepción 1], el Sistema evalúa la fecha de inicio y de expiración de cada pauta y determina su estado (programada, vigente o expirada) [Excepción 2], el Paciente recibe un renderizado condicional del contenido según ese estado [Excepción 3], el Sistema bloquea el acceso al material de la biblioteca, al material de apoyo y a las marcas de cumplimiento de las pautas vencidas, impide agregarles material nuevo y las marca como expiradas en la base de datos [Excepción 4].',
    excepciones=[
        'El Paciente intenta marcar un ejercicio o abrir el material de una pauta expirada. El Sistema rechaza la acción indicando que la pauta terminó. El Paciente consulta al Profesional por una nueva pauta.',
        'El Sistema detecta lentitud en el servidor al calcular la vigencia. El Sistema muestra la última carga disponible. El Paciente visualiza el contenido.',
        'El Paciente intenta marcar un ejercicio de una pauta aún no iniciada. El Sistema rechaza la marca indicando la fecha de inicio. El Paciente espera al inicio de la pauta.',
        'El Sistema falla al actualizar el estado de expiración en la base de datos. El Sistema mantiene el estado calculado en la respuesta y reintenta la persistencia en la próxima consulta. El Administrador revisa el log.',
    ],
    pos='Los recursos multimedia y el flujo clínico quedan resguardados bajo la política de temporalidad del tratamiento.',
    dep='RF47, RF49.',
)

CU38 = dict(
    id='CU38', tipo='Modificación (Incremento 1)',
    cambio='La marca de presencia del paciente se registra sola, cuando el profesional presiona "Iniciar". En domicilio, cada marca captura además las ubicaciones (CU39). Al finalizar, la sesión intenta certificarse sola (CU41) y, si no hay evolución firmada, pregunta si documentar ahora o al final de la jornada (CU40). La hora de término reemplaza el fin agendado.',
    nombre='Registrando marcas temporales de la prestación',
    actores='Profesional',
    resumen='Captura del Timestamp de inicio y término para calcular la duración total de la atención, vinculando la cita al episodio clínico, descontando la sesión del paquete del paciente y, en visitas a domicilio, registrando la ubicación de ambos actores en cada marca.',
    frecuencia='Muy Alta, ejecutada en cada sesión clínica.',
    pre='La cita del Profesional se encuentra en estado CONFIRMADA.',
    descripcion='El Profesional presiona "Iniciar" en la cita desde el historial del paciente [Excepción 1], el Sistema registra automáticamente el Timestamp de inicio del profesional y la presencia del paciente, captura las ubicaciones en visitas a domicilio (CU39), cambia la cita a EN_CURSO y la vincula al episodio clínico abierto más reciente del paciente con ese profesional [Excepción 2], el Profesional presiona "Finalizar atención" tras concluir la intervención [Excepción 3], el Sistema registra el Timestamp de término y las ubicaciones, cambia la cita a REALIZADA, calcula la duración total de la prestación, descuenta la sesión del paquete del paciente, intenta certificar la sesión (CU41), le pide al paciente evaluar la atención y, si la sesión no tiene una evolución firmada, ofrece documentarla ahora o al final de la jornada [Excepción 4].',
    excepciones=[
        'El Profesional inicia la atención antes del Bloque Horario agendado. El Sistema despliega un aviso de auditoría temporal. El Profesional confirma el inicio anticipado.',
        'La hora automática del servidor no es utilizable. El Sistema exige una marca manual con justificación de trazabilidad. El Profesional registra la hora de forma manual justificada.',
        'El Profesional abandona la interfaz sin marcar el término. El Sistema mantiene la cita EN_CURSO y muestra una barra persistente de atención en curso en toda la aplicación. El Profesional marca el cierre en su siguiente acceso.',
        'El Sistema calcula una duración negativa por una marca de término anterior al inicio. El Sistema bloquea la persistencia temporal y registra el evento. El Profesional corrige la marca o contacta a soporte.',
    ],
    pos='La duración de la sesión y sus marcas quedan almacenadas de forma inmutable, y la cita queda vinculada al episodio clínico, certificada o pendiente de validación, y marcada como pendiente de documentar si corresponde.',
    dep='RF20, RF38, RF39, RF40, RF41, RF76, RF78.',
)

CU39 = dict(
    id='CU39', tipo='Modificación (Incremento 2)',
    cambio='Ya no hay "Check-in" en la pantalla de evidencia ni se espera la marca del paciente. Las ubicaciones se toman solas al presionar "Iniciar" y "Finalizar atención". La del paciente es la última que su app envió (hasta 30 minutos) o, en su defecto, su dirección registrada. El radio es de 100 m. Un GPS apagado o una distancia mayor ya no bloquean la marca: obligan a justificar el cierre (CU41).',
    nombre='Validando presencialidad mediante coordenadas GPS',
    actores='Profesional, Paciente',
    resumen='Captura y validación automática de la geolocalización de ambos actores al inicio y término de las sesiones domiciliarias: la del profesional desde su teléfono y la del paciente desde la última ubicación que envía su aplicación o, como respaldo, su dirección registrada.',
    frecuencia='Alta, requerida en sesiones de modalidad domiciliaria.',
    pre='Una cita confirmada o en curso en modalidad a domicilio.',
    descripcion='La aplicación del Paciente, abierta en el horario de la visita, envía sola su ubicación al servidor cada pocos minutos [Excepción 1], el Profesional presiona "Iniciar" en la cita y el Sistema captura las coordenadas de su teléfono y las contrasta con la última ubicación del paciente de los últimos 30 minutos (parámetro VENTANA_UBICACION_PACIENTE_MINUTOS) o, si no la hay, con su dirección registrada, validando que la distancia no supere el radio parametrizado (parámetro RADIO_PRESENCIALIDAD_METROS, 100 m) [Excepción 2], el Profesional presiona "Finalizar atención" tras la atención [Excepción 3], el Sistema registra nuevamente ambas ubicaciones y la distancia en la evidencia de la cita, certificando la permanencia durante el Bloque Horario [Excepción 4].',
    excepciones=[
        'La aplicación del Paciente no envía su ubicación porque está cerrada, sin permiso o sin señal. El Sistema usa la dirección registrada del paciente; si la ocultó por privacidad (CU09), la marca queda sin su ubicación. El Profesional continúa la atención.',
        'El teléfono del Profesional tiene el GPS desactivado o la distancia supera el radio. El Sistema registra la marca igual, sin bloquear la atención, y avisa que al finalizar deberá justificar el cierre. El Profesional continúa la atención.',
        'Falta la ubicación de uno de los dos al término. El Sistema registra la marca sin esa ubicación. El Profesional ejecuta un cierre manual justificado en la validación de la sesión (CU41).',
        'El Sistema detecta que la distancia al término supera el radio. El Sistema registra la marca y suspende la certificación de la sesión, derivándola al Administrador (CU41). El Profesional redacta una justificación operativa al validar la sesión.',
    ],
    pos='La ubicación de la prestación queda registrada y respaldada en la evidencia de la cita.',
    dep='RF09, RF38, RF39, RF41.',
)

CU41 = dict(
    id='CU41', tipo='Modificación (Incremento 2)',
    cambio='La validación corre sola al presionar "Finalizar atención". Los factores son las marcas del profesional y, en domicilio, que existan ambas ubicaciones y estén dentro del radio. La tolerancia entre las marcas de ambos actores desaparece, porque la del paciente es automática. La Excepción 1 pasa a ser "falta una ubicación".',
    nombre='Validando sesión mediante protocolo multi-factor',
    actores='Profesional, Administrador',
    resumen='Certificación de la sesión basada en la coincidencia de las marcas temporales y, en visitas a domicilio, de las ubicaciones de ambos participantes al inicio y al término; la validación corre sola al finalizar la atención y las discrepancias se derivan al Administrador.',
    frecuencia='Muy Alta, ejecutada al finalizar cada sesión clínica.',
    pre='La cita se encuentra en estado REALIZADA con sus marcas temporales registradas y aún no certificada.',
    descripcion='El Profesional presiona "Finalizar atención" o, si la sesión quedó pendiente, "Validar sesión" desde el historial del paciente [Excepción 1]. El Sistema analiza los factores: marca de inicio del profesional, cita realizada y, en sesiones domiciliarias, ubicaciones de ambos actores al inicio y al término dentro del radio parametrizado [Excepción 2]. Si todos coinciden, el Sistema certifica la sesión automáticamente; al validarla a mano, el Profesional visualiza el resumen de factores y emite la confirmación final de cierre [Excepción 3]. El Sistema registra la certificación de la sesión en la cita (fecha y tipo: multifactor o manual) y persiste el detalle de los factores en la bitácora de auditoría [Excepción 4].',
    excepciones=[
        'Falta la ubicación del profesional o del paciente en alguna de las marcas. El Sistema detiene la validación automática y habilita al Profesional para ejecutar un cierre manual con justificación obligatoria.',
        'El Sistema identifica que la distancia entre ambos supera el radio. El Sistema suspende la validación, marca la sesión como suspendida con el detalle de las discrepancias y la deriva al Administrador, avisándole en la aplicación y por correo con los datos de contacto del paciente y del profesional. El Administrador revisa el caso en la bandeja de sesiones suspendidas y coordina la resolución; el Profesional puede luego certificar mediante cierre manual justificado.',
        'El Profesional rechaza el resumen o pierde conexión de red antes de confirmar. El Sistema no persiste ninguna certificación; la sesión queda pendiente de validación.',
        'El Sistema experimenta una falla de escritura al intentar guardar la certificación. El Sistema informa que el cierre quedó pendiente y solicita reintentar en unos minutos.',
    ],
    pos='La sesión queda certificada una única vez y lista para procesos de reembolso financiero; si fue suspendida, queda visible para el Administrador hasta que se certifique.',
    dep='RF38, RF39, RF41.',
)

CU40 = dict(
    id='CU40', tipo='Modificación (Incremento 1)',
    cambio='Se puede documentar con la cita EN_CURSO o ya realizada y pendiente de documentar. Al finalizar la atención, el profesional elige "Documentar ahora" o "Al final de la jornada", y las pendientes aparecen en Mi Jornada como "Pendientes de documentar".',
    nombre='Documentando intervención y respuesta fisiológica',
    actores='Profesional',
    resumen='Registro detallado de técnicas aplicadas y respuesta fisiológica en el primer paso de la Sesión Clínica, que integra en una sola interfaz la intervención, el avance de metas y el cierre firmado; el registro puede hacerse durante la atención o después, al final de la jornada.',
    frecuencia='Muy Alta, durante el transcurso de cada sesión clínica o al cierre de la jornada.',
    pre='La cita está vinculada al episodio clínico y se encuentra EN_CURSO, o REALIZADA y pendiente de documentar.',
    descripcion='El Profesional accede a la pestaña Sesión Clínica del episodio del paciente, durante la atención, desde "Documentar ahora" al finalizarla o desde "Pendientes de documentar" en Mi Jornada [Excepción 1], el Sistema muestra el contexto de la sesión (paciente, especialidad y cita) y habilita el primer paso de registro [Excepción 2], el Profesional documenta las técnicas clínicas y la respuesta fisiológica observada en el Paciente y guarda el registro [Excepción 3], el Sistema integra estos datos en la nota técnica de la Evolución Clínica y habilita los pasos siguientes: avance de metas (CU32) y cierre con firma (CU30 / CU36), que retira la cita de los pendientes de documentar [Excepción 4].',
    excepciones=[
        'El Profesional accede a una sesión sin una cita EN CURSO ni pendiente de documentar vinculada. El Sistema carga los campos en modo de solo lectura e indica cómo iniciar la atención. El Profesional inicia la atención desde el historial del paciente.',
        'El Sistema no logra recuperar la Especialidad del servidor. El Sistema muestra la especialidad como General. El Profesional continúa con los campos estándar.',
        'El Profesional redacta un reporte con señales de deterioro clínico grave. El Sistema lo detecta y marca el registro con alerta prioritaria en la bitácora. El Profesional activa el flujo de atención prioritaria.',
        'El Sistema detecta pérdida momentánea de red. El Sistema guarda un borrador local. El Profesional sincroniza al recuperar la conexión.',
    ],
    pos='La intervención queda documentada de forma estructurada en la historia de salud.',
    dep='RF30, RF32, RF36, RF38, RF40, RF78, RNF07, RNF16',
)

CU30 = dict(
    id='CU30', tipo='Modificación (Incremento 1)',
    cambio='La precondición ya no exige una atención en curso: también se firma una sesión realizada y pendiente de documentar. Al firmar, la cita sale de los pendientes de documentar.',
    nombre='Asegurando inalterabilidad de registros clínicos',
    actores='Profesional',
    resumen='Aplicación de restricciones técnicas que impiden la edición o eliminación de notas clínicas finalizadas; las correcciones posteriores solo pueden anexarse como versiones.',
    frecuencia='Muy Alta, al finalizar cada prestación de salud.',
    pre='Evolución Clínica con la intervención registrada, para una atención en curso o realizada y pendiente de documentar.',
    descripcion='El Profesional finaliza el registro clínico desde el paso de cierre de la Sesión Clínica y confirma el aviso de inalterabilidad, aplicándose la Firma Digital Simple generada desde su perfil [Excepción 1], el Sistema cambia el estado del registro a Finalizado aplicando la propiedad técnica de Inalterabilidad y retira la cita de los pendientes de documentar [Excepción 2], el Profesional intenta realizar una modificación o eliminación sobre el registro sellado [Excepción 3], el Sistema deniega la petición, registra el intento en el log inmutable y ofrece anexar una corrección versionada (CU31) [Excepción 4].',
    excepciones=[
        'El Profesional no cuenta con número de registro de la Superintendencia de Salud en su perfil. El Sistema bloquea el sellado del documento. El Profesional actualiza su perfil.',
        'El Sistema falla al asignar el estado Finalizado por error del Controlador. El Sistema mantiene el registro abierto. El Profesional reporta la incidencia técnica.',
        'El Profesional intenta editar el registro tras un periodo de inactividad. El Sistema detecta que el token de sesión ha expirado y deniega el acceso a la ruta. El Profesional renueva sus credenciales y reintenta la edición, siendo finalmente bloqueado por la inalterabilidad del registro y auditado por el Sistema.',
        'El Sistema detecta un intento de vulneración de la base de datos para borrar el log. El Sistema activa el protocolo de seguridad y guarda una alerta crítica.',
    ],
    pos='El registro clínico original queda protegido contra manipulaciones posteriores.',
    dep='RF30, RF31, RF36, RF40, RNF07.',
)

CU11 = dict(
    id='CU11', tipo='Modificación (Incremento 1)',
    cambio='La navegación es una barra inferior de 4 secciones (Inicio, Mi Jornada, Mensajes, Perfil), no tarjetas de acceso. Mi Jornada tiene vistas Día, Semana y Mes, un selector "Ir a fecha" y la lista "Pendientes de documentar". La nómina incluye a los pacientes derivados (CU65) y el Inicio muestra banderas rojas y derivaciones recibidas.',
    nombre='Visualizando panel interno de gestión profesional',
    actores='Profesional',
    resumen='El profesional accede a una vista segura y restringida organizada en cuatro secciones (Inicio, Mi Jornada, Mensajes y Perfil): el Inicio presenta la nómina de sus pacientes asignados, desde la cual abre la ficha clínica de cada uno, y Mi Jornada muestra su agenda por día, semana o mes.',
    frecuencia='Muy Alta',
    pre='El actor debe tener rol profesional y estar autenticado.',
    descripcion='El profesional inicia sesión y accede al panel interno de gestión profesional [Excepción 1], el Sistema verifica los permisos del actor mediante el control de acceso basado en roles RBAC y despliega en el Inicio las banderas rojas, las derivaciones recibidas y la nómina de pacientes vinculados (aquellos con un episodio clínico suyo, una cita vigente con él o una derivación interna), y en la barra inferior las secciones Mi Jornada, Mensajes y Perfil; Mi Jornada muestra sus citas en vista Día, Semana o Mes, con un selector de fecha y la lista de sesiones pendientes de documentar [Excepción 2], el profesional filtra la nómina por nombre, RUT o identificador, o toca una cita de su jornada, y selecciona un paciente para solicitar su historial de atenciones [Excepción 3], el Sistema abre la Ficha Clínica del paciente con sus pestañas de historial, anamnesis, episodios, sesión clínica y pautas, aplicando las preferencias de privacidad de contacto del paciente [Excepción 4].',
    excepciones=[
        'El enlace al panel de gestión presenta un error de redireccionamiento por sesión expirada. El Sistema redirige al actor a la pantalla de login con un mensaje de tiempo de espera agotado. El actor ingresa sus credenciales nuevamente para acceder al panel.',
        'El actor autenticado no cuenta con el rol de Profesional habilitado en su perfil de seguridad. El Sistema deniega el acceso al panel interno y registra el bloqueo en la bitácora de auditoría. El actor contacta al administrador del sistema para solicitar la asignación del rol correspondiente.',
        'El profesional aplica un filtro de búsqueda que no coincide con ningún paciente en su nómina asignada. El Sistema muestra una notificación de "Sin resultados encontrados" en la grilla de datos. El actor limpia los filtros de búsqueda para visualizar la lista completa.',
        'Ocurre un fallo en el servicio de recuperación de registros clínicos históricos o de la jornada, o el paciente seleccionado no está vinculado al profesional. El Sistema informa que la información clínica no puede mostrarse o deniega el acceso. El actor presiona el botón de actualizar o vuelve a la nómina.',
    ],
    pos='El profesional visualiza la información clínica y administrativa de sus pacientes y su agenda.',
    dep='RF09, RF11, RF12, RF28, RF38, RF40',
)

CU09 = dict(
    id='CU09', tipo='Modificación (Incremento 2)',
    cambio='La sección Perfil del paciente suma "Editar mis datos" (teléfono, dirección y contacto de emergencia) y una foto de perfil opcional (sin foto se ven las iniciales). La privacidad incluye "Mostrar mi nombre en mis calificaciones" (CU58). Cada interruptor se guarda al tocarlo, sin botón Guardar.',
    nombre='Configurando privacidad de datos de contacto',
    actores='Paciente',
    resumen='El paciente mantiene sus datos de contacto (teléfono, dirección y contacto de emergencia) y una foto de perfil opcional, y ajusta qué datos serán visibles para el profesional que lo atiende y si su nombre aparece en sus calificaciones.',
    frecuencia='Baja',
    pre='El paciente debe estar autenticado en el sistema.',
    descripcion='El Paciente abre la sección Perfil de la barra inferior, donde puede agregar, cambiar o quitar su foto y entrar a "Editar mis datos" para actualizar su teléfono, su dirección y su contacto de emergencia [Excepción 1], el Sistema presenta en "Privacidad de mis datos" la matriz de opciones de visibilidad: mostrar dirección, mostrar teléfono y mostrar mi nombre en mis calificaciones [Excepción 2], el Paciente ajusta los parámetros de privacidad activando o desactivando cada interruptor, o guarda sus datos editados [Excepción 3], el Sistema valida los datos y las nuevas preferencias, actualiza el registro del paciente y deja constancia del cambio en la bitácora de auditoría [Excepción 4].',
    excepciones=[
        'El módulo de privacidad no se encuentra disponible por una falla en el servidor de aplicaciones, o la foto no puede subirse al repositorio. El Sistema muestra un mensaje de error de carga. El Paciente intenta acceder nuevamente tras recargar la aplicación.',
        'Las opciones de configuración no se despliegan correctamente debido a un fallo en la interfaz. El Sistema registra un error de ejecución. El Paciente reinicia la aplicación.',
        'El Paciente envía valores inválidos para las opciones de privacidad, datos de contacto con formato incorrecto o una foto de formato no permitido o mayor a 5 MB. El Sistema rechaza el cambio e indica el campo incorrecto. El Paciente corrige el dato o elige otra imagen.',
        'Se produce una falla crítica de persistencia al intentar escribir los cambios en el repositorio de datos. El Sistema notifica al paciente que los cambios no pudieron ser guardados y revierte el interruptor. El Paciente vuelve a intentarlo.',
    ],
    pos='Los datos de contacto y la foto quedan actualizados y las preferencias de visibilidad se aplican a los datos del paciente: la dirección oculta se muestra al profesional como reservada; el contacto de emergencia permanece siempre visible.',
    dep='RF09, RF11, RF12, RF58',
)

CU35 = dict(
    id='CU35', tipo='Modificación (Incremento 2)',
    cambio='El visor también abre los adjuntos del chat y el material de apoyo de los ejercicios (las imágenes HEIC se convierten a JPG). Además, el paciente puede descargar su ficha clínica completa en PDF desde Mis documentos.',
    nombre='Visualizando archivos con visor embebido',
    actores='Paciente, Profesional, Administrador',
    resumen='Permite previsualizar documentos clínicos, adjuntos del chat y material de apoyo sin requerir la descarga persistente en el hardware local; el paciente puede además descargar su ficha clínica completa en PDF.',
    frecuencia='Alta, cada vez que se requiere consultar un examen o registro.',
    pre='El actor cuenta con los permisos de acceso definidos por el RBAC: el paciente sobre sus propios documentos, el profesional sobre los de sus pacientes vinculados, el administrador sobre todos; los adjuntos del chat, solo los dos participantes de la conversación.',
    descripcion='El actor selecciona el archivo que desea consultar en Mis documentos, en la Ficha Clínica, en el chat o en la pauta de ejercicios, o el paciente presiona "Descargar mi ficha clínica (PDF)" [Excepción 1], el Sistema valida los permisos de visualización del perfil solicitante en la base de datos [Excepción 2], el actor solicita la apertura gráfica del documento [Excepción 3], el Sistema renderiza el contenido según su tipo (imagen en visor nativo, PDF página a página, documento Word y video en visor web embebido) y registra la visualización en la bitácora de auditoría; en la descarga de la ficha, genera el PDF con los datos, la anamnesis, los episodios, las sesiones firmadas, las pautas y la lista de documentos, y lo entrega al menú del teléfono para guardarlo o compartirlo [Excepción 4].',
    excepciones=[
        'El actor selecciona un archivo cuyo contenido no puede procesarse. El Sistema informa el error de carga. El actor selecciona un archivo válido.',
        'El Sistema detecta un intento de acceso sin autorización. El Sistema deniega la visualización y registra el evento en el log de seguridad. El actor retorna al menú.',
        'El actor cancela la petición antes del renderizado. El Sistema aborta la carga en memoria. El actor navega hacia otra sección.',
        'El Sistema experimenta falla en el renderizador embebido o al generar la ficha en PDF. El Sistema emite un código de error de carga. El actor recarga la página o reintenta la descarga.',
    ],
    pos='Se accede a la información clínica sin comprometer la seguridad de los datos en el hardware local; la descarga de la ficha queda registrada en la bitácora de auditoría.',
    dep='RF12, RF28, RF33, RF35, RF53, RNF19.',
)

INC4 = [CU37, CU51, CU54, CU62, CU65, CU72]
PREVIOS = [CU09, CU11, CU28, CU30, CU35, CU38, CU39, CU40, CU41, CU44, CU47, CU48, CU49,
           CU53, CU55, CU56, CU57, CU58, CU66, CU71, CU78]
