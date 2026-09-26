# Tanda 1 — Notificaciones y agenda: CU52, CU21, CU19.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from motor import generar_cu, chrome_path
from comun import *

# ──────────────────────────── CU52 ────────────────────────────
# El despachador es el protagonista: se dibuja completo (centro de
# notificaciones, preferencias, tokens push, Expo Push, Brevo y bitácora).
CU52 = dict(id='CU52', nombre='Emitiendo notificaciones multicanal', actores=TRES,
  vistas={r: 'V_Centro_Notificaciones' for r in TRES},
  participantes=[ACTOR, VISTA, *capa(DESP, ADP, EXPO, BREVO),
                 *T('Notificacion', 'Usuario', 'Preferencia_Notificacion', 'Dispositivo_Push', 'Bitacora_Auditoria')],
  principal=[
    '! Un evento del sistema (cita, cupo, mensaje, ticket, liquidacion, alerta) genera un aviso',
    f'{API} -> {DESP}: despachar(usuario_id, tipo, contenido, datos.pantalla)',
    *insertar_de(DESP, 'guardar_en_centro_de_notificaciones(titulo, contenido, datos)', 'Notificacion',
                 ' (leida = FALSE)', 'return (aviso guardado en la app)'),
    *bloque_de(DESP, 'leer_contacto_y_preferencias(usuario_id)',
               [q('Usuario', 'email, nombres', '1 usuario'), q('Preferencia_Notificacion', 'canal_push, canal_email', 'preferencias')],
               'return (email y canales habilitados)'),
    *leer_de(DESP, 'leer_tokens_activos(usuario_id)', 'Dispositivo_Push', 'token, plataforma, activo', 'tokens activos',
             'return (tokens push del usuario)'),
    *externo_de(DESP, 'enviar_push(tokens, titulo, contenido, datos)', EXPO, 'POST /--/api/v2/push/send',
                'return (tickets de entrega)', 'return (push enviado)'),
    *externo_de(DESP, 'enviar_correo(email, asunto, cuerpo)', BREVO, 'POST /v3/smtp/email',
                'return (HTTP 201 Aceptado)', 'return (correo aceptado)'),
    *insertar_de(DESP, 'registrar_despacho(DESPACHO_NOTIFICACION, canales)', 'Bitacora_Auditoria',
                 ' (canales = APP, PUSH, EMAIL)'),
    f'{DESP} --> {API}: return (canales utilizados)',
    'A -> V: abrir_centro_de_notificaciones()',
    f'V -> {API}: GET /notificaciones',
    *leer('listar_avisos(usuario_id, no_leidos_primero)', 'Notificacion',
          'notificacion_id, tipo, titulo, contenido, datos, leida', 'avisos del usuario', 'return (avisos ordenados)'),
    f'{API} --> V: return (HTTP 200 OK: avisos y contador de no leidos)',
    'V --> A: mostrar_avisos_no_leidos_arriba_y_leidos_al_final()',
    'A -> V: tocar_aviso(notificacion_id)',
    f'V -> {API}: POST /notificaciones/:id/leer',
    *actualizar('marcar_como_leido(notificacion_id)', 'Notificacion', 'leida'),
    f'{API} --> V: return (HTTP 200 OK: aviso leido)',
    'V ->> V: navegar_a_la_pantalla_del_aviso(datos.pantalla)',
    'V --> A: mostrar_pantalla_de_destino()',
  ],
  excepciones={
    1: dict(cortar='POST /v3/smtp/email', lineas=[
        f'{BREVO} --> {ADP}: return (HTTP 503 servicio no disponible)',
        f'{ADP} --> {DESP}: return (correo no entregado)',
        '! Falla el envio: la operacion que origino el aviso no se revierte y el aviso sigue en la app',
        f'{DESP} ->> {DESP}: anotar_el_canal_fallido()'],
        reanudar='registrar_despacho'),
    2: dict(cortar='return (tokens push del usuario)', lineas=[
        '! Push desactivado en las preferencias o sin dispositivo registrado (Expo Go en Android)',
        f'{DESP} ->> {DESP}: omitir_el_canal_push()'],
        reanudar='enviar_correo(email, asunto, cuerpo)'),
    3: dict(cortar='return (canales utilizados)', lineas=[
        '! El usuario descarta la alerta del telefono sin tocarla: no se abre nada',
        'A ->> A: descartar_la_alerta_del_sistema_operativo()',
        'A -> V: entrar_a_la_aplicacion_desde_el_icono()',
        'V --> A: mostrar_la_campana_con_globo_de_no_leidos()'],
        reanudar='abrir_centro_de_notificaciones'),
    4: dict(cortar='navegar_a_la_pantalla_del_aviso', lineas=[
        '! La pantalla de destino no existe para el rol del usuario',
        'V ->> V: ignorar_el_salto_y_anotar_en_consola()',
        'V --> A: mantener_al_usuario_en_el_centro_de_notificaciones()',
        'A -> V: abrir_la_pantalla_desde_su_menu()'],
        reanudar='mostrar_pantalla_de_destino'),
  })

# ──────────────────────────── CU21 ────────────────────────────
# Nace en el servidor (programador de agenda) y termina en el paciente, que
# responde desde la pagina web del enlace del correo. La misma respuesta se
# puede dar desde Mis Citas (POST /citas/:id/transicionar).
CU21 = dict(id='CU21', nombre='Confirmando asistencia a cita de forma distribuida', actores=['Paciente'],
  vistas={'Paciente': 'V_Confirmacion_Correo'},
  participantes=[ACTOR, VISTA, *capa(PROG, DESP, ADP, BREVO),
                 *T('Cita', 'Transaccion', 'Solicitud_Confirmacion', 'Parametro_Global', 'Notificacion', 'Bitacora_Auditoria')],
  principal=[
    '! Cada 5 minutos, y cuando el paciente abre Mis Citas, el programador repasa la agenda',
    f'{PROG} ->> {PROG}: repasar_agenda()',
    *leer_de(PROG, 'leer_parametro(ANTICIPACION_SOLICITUD_CONFIRMACION_HORAS)', 'Parametro_Global', 'clave, valor',
             '24 horas', 'return (ventana de anticipacion)'),
    *bloque_de(PROG, 'buscar_citas_pagadas_en_la_ventana_sin_solicitud()',
               [q('Cita', 'cita_id, estado, fecha_hora_inicio', 'citas AGENDADA en la ventana'),
                q('Transaccion', 'estado, tipo', 'pago PAGADA'),
                q('Solicitud_Confirmacion', 'solicitud_confirmacion_id', 'sin solicitud previa')],
               'return (citas agendadas y pagadas sin solicitud)'),
    f'{PROG} ->> {PROG}: generar_token(vigencia VIGENCIA_ENLACE_CONFIRMACION_HORAS = 48)',
    *insertar_de(PROG, 'registrar_solicitud(cita_id, token, momento_expira)', 'Solicitud_Confirmacion'),
    *despachar(PROG, 'SOLICITUD_CONFIRMACION', 'paciente', correo='email, enlace_con_token',
               retorno='return (solicitud despachada)'),
    'A -> V: abrir_el_enlace_del_correo(token)',
    f'V -> {API}: GET /citas/confirmacion/:token',
    *bloque('leer_solicitud(token)',
            [q('Solicitud_Confirmacion', 'token, momento_expira, momento_respuesta', 'solicitud vigente'),
             q('Cita', 'cita_id, estado, fecha_hora_inicio', '1 cita')],
            'return (solicitud y detalle de la cita)'),
    f'{API} --> V: return (HTTP 200 OK: pagina con el detalle y los botones)',
    'V --> A: mostrar_detalle_y_botones_confirmar_o_cancelar()',
    'A -> V: confirmar_asistencia()',
    f'V -> {API}: GET /citas/confirmacion/:token?accion=CONFIRMAR',
    *begin(),
    *leer('bloquear_cita(cita_id)', 'Cita', 'cita_id, estado', 'cita AGENDADA', 'return (cita bloqueada)'),
    f'{API} ->> {API}: verificar_estado_esperado()',
    *leer('verificar_pago_integro(cita_id)', 'Transaccion', 'estado, tipo', '1 pago PAGADA', 'return (hora pagada)'),
    *actualizar('actualizar_estado(cita_id, CONFIRMADA)', 'Cita', 'estado'),
    *actualizar('cerrar_solicitud(CONFIRMADA, canal CORREO)', 'Solicitud_Confirmacion', 'momento_respuesta, respuesta, canal_respuesta'),
    *insertar('registrar_trazabilidad(CONFIRMAR, canal CORREO)', 'Bitacora_Auditoria'),
    *despachar(API, 'CITA_CONFIRMADA', 'paciente y profesional', retorno='return (avisos registrados)'),
    *commit(),
    f'{API} --> V: return (HTTP 200 OK: asistencia confirmada)',
    'V --> A: mostrar_asistencia_confirmada()',
  ],
  excepciones={
    1: dict(cortar='INSERT INTO Solicitud_Confirmacion', lineas=[
        f'Solicitud_Confirmacion --> {SQL}: error de escritura',
        f'{SQL} --> {DAO}: throw (SQLException)',
        f'{DAO} --> {PROG}: return (Fallo_Persistencia)',
        '! No se pudo emitir la solicitud: la cita queda igual y se reintenta en la proxima pasada',
        f'{PROG} ->> {PROG}: anotar_el_fallo_y_esperar_la_proxima_pasada()'],
        reanudar='repasar_agenda'),
    2: dict(cortar='SELECT token, momento_expira', lineas=[
        f'Solicitud_Confirmacion --> {SQL}: return (solicitud con momento_expira vencido)',
        f'{SQL} --> {DAO}: return (resultado)',
        f'{DAO} --> {API}: return (enlace vencido)',
        f'{API} --> V: return (HTTP 410 ENLACE_VENCIDO)',
        'V --> A: mostrar_que_el_enlace_vencio()',
        '! Desde Mis Citas el paciente pide un enlace nuevo (POST /citas/:id/solicitar-confirmacion) y recibe otro correo',
        'A -> V: abrir_el_enlace_nuevo(token_nuevo)'],
        reanudar='GET /citas/confirmacion/:token'),
    3: dict(cortar='mostrar_detalle_y_botones', lineas=[
        '! El paciente no responde: la cita sigue sin cambios mientras el enlace este vigente',
        'A ->> A: postergar_la_respuesta()'],
        reanudar='confirmar_asistencia'),
    4: dict(cortar='UPDATE Cita SET estado', lineas=[
        *fallo_bd('Cita'),
        *rollback(),
        f'{API} --> V: return (HTTP 500 NO_GUARDADO)',
        'V --> A: informar_que_el_cambio_no_se_guardo()',
        'A -> V: reintentar_tras_refrescar_la_pagina()'],
        reanudar='GET /citas/confirmacion/:token?accion=CONFIRMAR'),
  })

# ──────────────────────────── CU19 ────────────────────────────
# Inscripcion desde el buscador de Mis Citas, oferta secuencial al liberarse
# el bloque (la cancelacion la dispara el CU18) y toma del cupo.
CU19 = dict(id='CU19', nombre='Gestionando lista de espera secuencial', actores=['Paciente'],
  vistas={'Paciente': 'V_Mis_Citas'},
  participantes=[ACTOR, VISTA, *capa(PROG, DESP, ADP, BREVO),
                 *T('Cita', 'Lista_Espera', 'Parametro_Global', 'Notificacion', 'Bitacora_Auditoria')],
  principal=[
    'A -> V: elegir_bloque_ocupado_y_avisarme_si_se_libera(cita_id)',
    f'V -> {API}: POST /citas/:id/lista-espera',
    *begin(),
    *leer('verificar_bloque_ocupado_ajeno_y_futuro(cita_id)', 'Cita', 'cita_id, estado, fecha_hora_inicio, paciente_id',
          '1 cita ajena vigente', 'return (bloque ocupado)'),
    *leer('leer_parametro(MAX_PACIENTES_LISTA_ESPERA)', 'Parametro_Global', 'clave, valor', '5 pacientes', 'return (maximo de la lista)'),
    *leer('contar_inscritos_y_ultima_posicion(cita_id)', 'Lista_Espera', 'lista_espera_id, posicion, estado',
          'inscritos bajo el maximo', 'return (hay cupo en la lista)'),
    f'{API} ->> {API}: asignar_posicion_por_orden_de_llegada()',
    *insertar('inscribir_paciente(posicion, ESPERANDO)', 'Lista_Espera'),
    *despachar(API, 'LISTA_ESPERA_INSCRITO', 'paciente', retorno='return (aviso de inscripcion registrado)'),
    *commit(),
    f'{API} --> V: return (HTTP 201 Created: posicion asignada)',
    'V --> A: mostrar_posicion_en_la_lista()',
    '! La cita que ocupaba el bloque se cancela (CU18) y el bloque queda libre',
    f'{API} ->> {API}: ofrecer_cupo_liberado(cita_id)',
    *leer('buscar_al_primero_de_la_fila(cita_id)', 'Lista_Espera', 'lista_espera_id, posicion, estado, paciente_id',
          '1 inscrito ESPERANDO', 'return (primero de la fila)'),
    *leer('leer_parametro(PLAZO_RESPUESTA_LISTA_ESPERA_MINUTOS)', 'Parametro_Global', 'clave, valor', '30 minutos', 'return (plazo del turno)'),
    f'{API} ->> {API}: generar_token_del_cupo()',
    *actualizar('marcar_notificado(plazo, token_cupo)', 'Lista_Espera', 'estado, momento_notificacion, momento_expira, token_cupo'),
    *despachar(API, 'CUPO_DISPONIBLE', 'primero de la fila', correo='email, enlace_tomar_cupo',
               retorno='return (aviso de cupo despachado)', ret_centro='return (aviso en el centro de notificaciones del paciente)'),
    'A -> V: tomar_el_cupo(lista_espera_id)',
    f'V -> {API}: POST /citas/lista-espera/:id/tomar',
    *begin(),
    *leer('bloquear_turno(lista_espera_id)', 'Lista_Espera', 'estado, momento_expira, paciente_id', '1 turno NOTIFICADO vigente',
          'return (turno vigente)'),
    *leer('verificar_que_el_bloque_siga_libre()', 'Cita', 'cita_id, estado', '0 citas activas en el bloque', 'return (bloque libre)'),
    *insertar('agendar_cita_nueva(AGENDADA, pendiente de pago)', 'Cita'),
    *actualizar('marcar_tomado_y_anular_token(TOMADO)', 'Lista_Espera', 'estado, token_cupo'),
    *actualizar('cerrar_la_lista_para_el_resto(CERRADO)', 'Lista_Espera', 'estado'),
    *despachar(API, 'CUPO_CEDIDO y CAMBIO_ESTADO_CITA', 'resto de la fila y paciente', retorno='return (avisos registrados)'),
    *insertar('registrar_trazabilidad(TOMA_CUPO_LISTA_ESPERA)', 'Bitacora_Auditoria'),
    *commit(),
    f'{API} --> V: return (HTTP 201 Created: cita agendada, pendiente de pago)',
    'V --> A: mostrar_cita_agendada_y_pedir_el_pago()',
  ],
  excepciones={
    1: dict(cortar='SELECT lista_espera_id, posicion, estado FROM Lista_Espera', lineas=[
        f'Lista_Espera --> {SQL}: return (5 inscritos: lista completa)',
        f'{SQL} --> {DAO}: return (resultado)',
        f'{DAO} --> {API}: return (lista completa)',
        *rollback(),
        f'{API} --> V: return (HTTP 409 LISTA_COMPLETA)',
        'V --> A: deshabilitar_la_inscripcion_y_avisar_lista_completa()',
        'A -> V: elegir_otro_bloque_ocupado(cita_id)'],
        reanudar='POST /citas/:id/lista-espera'),
    2: dict(cortar='INSERT INTO Lista_Espera', lineas=[
        *fallo_bd('Lista_Espera'),
        *rollback(),
        f'{API} --> V: return (HTTP 500 NO_SE_PUDO_INSCRIBIR)',
        'V --> A: informar_que_no_se_completo_y_sugerir_reintento()',
        'A -> V: reintentar_la_inscripcion()'],
        reanudar='POST /citas/:id/lista-espera'),
    3: dict(cortar='return (aviso en el centro de notificaciones del paciente)', lineas=[
        '! El telefono no recibe push (sin red, sin permiso o Expo Go): el aviso queda en la app y sale por correo',
        f'{DESP} ->> {DESP}: omitir_el_push_y_registrar_los_canales_en_bitacora()'],
        reanudar='enviar_correo(email, enlace_tomar_cupo)'),
    4: dict(cortar='return (aviso de cupo despachado)', lineas=[
        '! El primero de la fila no toma el cupo dentro de los 30 minutos',
        f'{PROG} ->> {PROG}: repasar_agenda()',
        *actualizar_de(PROG, 'vencer_turnos_expirados(VENCIDO)', 'Lista_Espera', 'estado'),
        *leer_de(PROG, 'buscar_al_siguiente_de_la_fila(cita_id)', 'Lista_Espera', 'lista_espera_id, posicion, paciente_id',
                 '1 inscrito ESPERANDO', 'return (siguiente de la fila)'),
        *actualizar_de(PROG, 'marcar_notificado_al_siguiente(plazo, token_cupo)', 'Lista_Espera',
                       'estado, momento_notificacion, momento_expira, token_cupo'),
        *despachar(PROG, 'CUPO_DISPONIBLE', 'siguiente de la fila', correo='email, enlace_tomar_cupo',
                   retorno='return (cupo ofrecido al siguiente)'),
        '! El siguiente paciente de la fila recibe el aviso y toma el cupo'],
        reanudar='tomar_el_cupo'),
    5: dict(cortar='SELECT cita_id, estado FROM Cita', lineas=[
        f'Cita --> {SQL}: return (1 cita activa en el bloque)',
        f'{SQL} --> {DAO}: return (resultado)',
        f'{DAO} --> {API}: return (bloque ocupado de nuevo)',
        *actualizar('marcar_turno_vencido(VENCIDO)', 'Lista_Espera', 'estado'),
        *commit(),
        f'{API} --> V: return (HTTP 409 BLOQUE_OCUPADO)',
        'V --> A: informar_que_el_bloque_ya_no_esta_disponible()',
        'A -> V: elegir_otro_bloque_ocupado_y_avisarme(cita_id)'],
        reanudar='POST /citas/:id/lista-espera'),
  })

if __name__ == '__main__':
    salida = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    chrome = chrome_path()
    total = 0
    for cu in (CU52, CU21, CU19):
        verificar_participantes(cu)
        ruta, n = generar_cu(cu, os.path.join(salida, cu['id']), chrome, png='--sin-png' not in sys.argv)
        total += n
        print(f"{cu['id']}: {n} paginas -> {os.path.relpath(ruta, salida)}")
    print('total:', total)
