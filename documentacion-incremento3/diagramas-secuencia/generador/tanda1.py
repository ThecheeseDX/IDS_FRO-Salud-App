# Tanda 1 — Notificaciones y agenda: CU52, CU21, CU19.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from motor import generar_cu, chrome_path
from comun import *

# ──────────────────────────── CU52 ────────────────────────────
# Cada rol dispara el aviso con una accion propia (desde la vista de origen) y
# luego lo lee en el Centro de Notificaciones. El despachador se dibuja
# completo: centro de notificaciones, preferencias, tokens, Expo Push, Brevo y
# bitacora. Es el unico CU con dos vistas por actor: la de la accion que
# genera el aviso y la del centro donde se lee.
def despacho_completo(tipo, destinatario):
    return [
      f'{API} -> {DESP}: despachar({tipo}, {destinatario})',
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
    ]

LEER_EN_EL_CENTRO = [
    'A -> VC: abrir_centro_de_notificaciones()',
    f'VC -> {API}: GET /notificaciones',
    *leer('listar_avisos(usuario_id, no_leidos_primero)', 'Notificacion',
          'notificacion_id, tipo, titulo, contenido, datos, leida', 'avisos del usuario', 'return (avisos ordenados)'),
    f'{API} --> VC: return (HTTP 200 OK: avisos y contador de no leidos)',
    'VC --> A: mostrar_avisos_no_leidos_arriba_y_leidos_al_final()',
    'A -> VC: tocar_aviso(notificacion_id)',
    f'VC -> {API}: POST /notificaciones/:id/leer',
    *actualizar('marcar_como_leido(notificacion_id)', 'Notificacion', 'leida'),
    f'{API} --> VC: return (HTTP 200 OK: aviso leido)',
    'VC ->> VC: navegar_a_la_pantalla_del_aviso(datos.pantalla)',
    'VC --> A: mostrar_pantalla_de_destino()',
]

CU52_PRINCIPAL = {
  'Paciente': [
    '! Ejemplo de evento: el paciente cancela una cita; el aviso le llega a el y al profesional',
    'A -> VO: cancelar_cita(cita_id, motivo)',
    f'VO -> {API}: POST /citas/:id/transicionar (CANCELAR, motivo)',
    *begin(),
    *leer('bloquear_y_leer_cita(cita_id)', 'Cita', 'cita_id, estado, paciente_id', '1 cita AGENDADA', 'return (cita)'),
    *actualizar('cancelar_cita(CANCELADA_PACIENTE, motivo)', 'Cita', 'estado, motivo_cancelacion'),
    *insertar('registrar_trazabilidad(TRANSICION_CITA)', 'Bitacora_Auditoria'),
    *despacho_completo('CAMBIO_ESTADO_CITA', 'paciente y profesional'),
    *commit(),
    f'{API} --> VO: return (HTTP 200 OK: cita cancelada)',
    'VO --> A: confirmar_accion_realizada(cita cancelada)',
    *LEER_EN_EL_CENTRO,
  ],
  'Profesional': [
    '! Ejemplo de evento: el profesional confirma una hora pagada; el aviso le llega a el y al paciente',
    'A -> VO: confirmar_cita(cita_id)',
    f'VO -> {API}: POST /citas/:id/transicionar (CONFIRMAR)',
    *begin(),
    *leer('bloquear_y_leer_cita(cita_id)', 'Cita', 'cita_id, estado, profesional_id', '1 cita AGENDADA', 'return (cita)'),
    *leer('verificar_pago_integro(cita_id)', 'Transaccion', 'estado, tipo', '1 pago PAGADA', 'return (hora pagada)'),
    *actualizar('confirmar_cita(CONFIRMADA)', 'Cita', 'estado'),
    *insertar('registrar_trazabilidad(TRANSICION_CITA)', 'Bitacora_Auditoria'),
    *despacho_completo('CAMBIO_ESTADO_CITA', 'paciente y profesional'),
    *commit(),
    f'{API} --> VO: return (HTTP 200 OK: cita confirmada)',
    'VO --> A: confirmar_accion_realizada(cita confirmada)',
    *LEER_EN_EL_CENTRO,
  ],
  'Administrador': [
    '! Ejemplo de evento: el administrador declara sus areas y se le enruta un ticket que estaba sin operador',
    'A -> VO: declarar_mis_areas_de_soporte(areas)',
    f'VO -> {API}: PUT /soporte/areas (areas)',
    *begin(),
    *bloque('reemplazar_areas_del_operador(usuario_id)',
            [[f'{DAO} -> {SQL}: ejecutar_eliminacion(DELETE)', f'{SQL} -> Area_Soporte_Operador: DELETE FROM Area_Soporte_Operador',
              f'Area_Soporte_Operador --> {SQL}: confirmacion_delete', f'{SQL} --> {DAO}: return (Filas afectadas)'],
             ins('Area_Soporte_Operador')],
            'return (areas guardadas)'),
    *commit(),
    *leer('buscar_tickets_sin_operador()', 'Ticket_Soporte', 'ticket_soporte_id, categoria, asignado_a',
          'tickets sin asignar de sus areas', 'return (tickets por enrutar)'),
    *actualizar('asignar_ticket_al_operador(usuario_id)', 'Ticket_Soporte', 'asignado_a, momento_enrutamiento'),
    *despacho_completo('TICKET_ASIGNADO', 'administrador'),
    f'{API} --> VO: return (HTTP 200 OK: areas guardadas)',
    'VO --> A: confirmar_accion_realizada(areas guardadas)',
    *LEER_EN_EL_CENTRO,
  ],
}

CU52_EXCEPCIONES = {
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
    3: dict(cortar='confirmar_accion_realizada', lineas=[
        '! El usuario descarta la alerta del telefono sin tocarla: no se abre nada',
        'A ->> A: descartar_la_alerta_y_entrar_luego_desde_el_icono()'],
        reanudar='abrir_centro_de_notificaciones'),
    4: dict(cortar='navegar_a_la_pantalla_del_aviso', lineas=[
        '! La pantalla de destino no existe para el rol del usuario',
        'VC ->> VC: ignorar_el_salto_y_anotar_en_consola()',
        'VC --> A: mantener_al_usuario_en_el_centro_de_notificaciones()',
        'A -> VC: abrir_la_pantalla_desde_su_menu()'],
        reanudar='mostrar_pantalla_de_destino'),
}

CU52 = dict(id='CU52', nombre='Emitiendo notificaciones multicanal', actores=TRES,
  vistas={'Paciente': {'VO': 'V_Mis_Citas', 'VC': 'V_Centro_Notificaciones'},
          'Profesional': {'VO': 'V_Gestion_Agenda', 'VC': 'V_Centro_Notificaciones'},
          'Administrador': {'VO': 'V_Bandeja_Soporte', 'VC': 'V_Centro_Notificaciones'}},
  participantes=[ACTOR, P('VO', 'vista'), P('VC', 'vista'), *capa(DESP, ADP, EXPO, BREVO),
                 *T('Cita', 'Transaccion', 'Ticket_Soporte', 'Area_Soporte_Operador', 'Notificacion', 'Usuario',
                    'Preferencia_Notificacion', 'Dispositivo_Push', 'Bitacora_Auditoria')],
  principal=CU52_PRINCIPAL,
  excepciones=CU52_EXCEPCIONES)

# ──────────────────────────── CU21 ────────────────────────────
# Nace en el paciente al abrir Mis Citas: esa visita dispara (ademas del
# programador cada 5 minutos) la emision de solicitudes pendientes, y el
# paciente responde desde la misma pantalla.
CU21 = dict(id='CU21', nombre='Confirmando asistencia a cita de forma distribuida', actores=['Paciente'],
  vistas={'Paciente': 'V_Mis_Citas'},
  participantes=[ACTOR, VISTA, *capa(PROG, DESP, ADP, BREVO),
                 *T('Cita', 'Transaccion', 'Solicitud_Confirmacion', 'Parametro_Global', 'Notificacion', 'Bitacora_Auditoria')],
  principal=[
    '! El programador hace esta misma pasada cada 5 minutos; aqui se muestra la que dispara el paciente al abrir Mis Citas',
    'A -> V: abrir_mis_citas()',
    f'V -> {API}: GET /citas/confirmaciones/pendientes',
    f'{API} -> {PROG}: despachar_solicitudes_pendientes()',
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
    f'{PROG} --> {API}: return (solicitudes emitidas)',
    *bloque('listar_solicitudes_abiertas(paciente_id)',
            [q('Solicitud_Confirmacion', 'cita_id, momento_expira, momento_respuesta', 'solicitud vigente'),
             q('Cita', 'cita_id, estado, fecha_hora_inicio', 'cita AGENDADA')],
            'return (citas por confirmar)'),
    f'{API} --> V: return (HTTP 200 OK: citas por confirmar)',
    'V --> A: destacar_la_cita_con_confirmar_y_cancelar()',
    '! La misma respuesta puede darse desde el enlace del correo (GET /citas/confirmacion/:token?accion=CONFIRMAR)',
    'A -> V: confirmar_asistencia(cita_id)',
    f'V -> {API}: POST /citas/:id/transicionar (CONFIRMAR)',
    *begin(),
    *leer('bloquear_y_leer_cita(cita_id)', 'Cita', 'cita_id, estado, paciente_id', 'cita AGENDADA', 'return (cita bloqueada)'),
    f'{API} ->> {API}: verificar_titularidad_y_estado()',
    *leer('verificar_pago_integro(cita_id)', 'Transaccion', 'estado, tipo', '1 pago PAGADA', 'return (hora pagada)'),
    *actualizar('actualizar_estado(cita_id, CONFIRMADA)', 'Cita', 'estado'),
    *actualizar('cerrar_solicitud(CONFIRMADA, canal APP)', 'Solicitud_Confirmacion', 'momento_respuesta, respuesta, canal_respuesta'),
    *insertar('registrar_trazabilidad(CONFIRMAR)', 'Bitacora_Auditoria'),
    *despachar(API, 'CAMBIO_ESTADO_CITA', 'paciente y profesional', retorno='return (avisos registrados)'),
    *commit(),
    f'{API} --> V: return (HTTP 200 OK: asistencia confirmada)',
    'V --> A: mostrar_asistencia_confirmada()',
  ],
  excepciones={
    1: dict(cortar='POST /v3/smtp/email', lineas=[
        f'{BREVO} --> {ADP}: return (tiempo de espera agotado)',
        f'{ADP} --> {DESP}: return (correo no entregado)',
        '! El correo no llega: la solicitud queda creada y visible en Mis Citas',
        *insertar_de(DESP, 'registrar_resultado_del_despacho(DESPACHO_NOTIFICACION, canal fallido)', 'Bitacora_Auditoria'),
        f'{DESP} --> {PROG}: return (solicitud visible en la app)'],
        reanudar='return (solicitudes emitidas)'),
    2: dict(cortar='SELECT cita_id, momento_expira, momento_respuesta', lineas=[
        f'Solicitud_Confirmacion --> {SQL}: return (solicitud con el enlace vencido)',
        f'{SQL} --> {DAO}: return (resultado)',
        f'{DAO} --> {API}: return (solicitud vencida)',
        f'{API} --> V: return (HTTP 200 OK: solicitud vencida)',
        'V --> A: mostrar_solicitud_vencida_y_enviarme_un_enlace_nuevo()',
        'A -> V: pedir_un_enlace_nuevo(cita_id)',
        f'V -> {API}: POST /citas/:id/solicitar-confirmacion',
        *leer('verificar_pago_integro(cita_id)', 'Transaccion', 'estado, tipo', '1 pago PAGADA', 'return (hora pagada)'),
        f'{API} -> {PROG}: emitir_solicitud(cita_id)',
        *actualizar_de(PROG, 'renovar_token(token, momento_expira)', 'Solicitud_Confirmacion', 'token, momento_expira'),
        *despachar(PROG, 'SOLICITUD_CONFIRMACION', 'paciente', correo='email, enlace_nuevo',
                   retorno='return (enlace nuevo despachado)'),
        f'{PROG} --> {API}: return (solicitud renovada)',
        f'{API} --> V: return (HTTP 200 OK: enlace nuevo enviado)',
        'V --> A: mostrar_la_solicitud_renovada()'],
        reanudar='confirmar_asistencia'),
    3: dict(cortar='destacar_la_cita_con_confirmar', lineas=[
        '! El paciente no responde: la cita sigue sin cambios mientras la solicitud este vigente',
        'A ->> A: postergar_la_respuesta()'],
        reanudar='confirmar_asistencia'),
    4: dict(cortar='UPDATE Cita SET estado', lineas=[
        *fallo_bd('Cita'),
        *rollback(),
        f'{API} --> V: return (HTTP 500 PERSIST_FAIL)',
        'V --> A: informar_que_el_cambio_no_se_guardo()',
        'A -> V: reintentar_tras_refrescar_mis_citas()'],
        reanudar='POST /citas/:id/transicionar'),
  })

# ──────────────────────────── CU19 ────────────────────────────
# Todo tramo nace en el paciente: se inscribe, luego abre Mis Citas (esa
# consulta vence los turnos caducados) y toma el cupo. La oferta al primero
# ocurre dentro de la cancelacion de otro paciente (CU18) y se indica en nota;
# la oferta al siguiente (Exc. 4) se dibuja completa porque la dispara la
# consulta del propio paciente.
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
    '! Otro paciente cancela la cita del bloque (CU18): en esa transaccion el sistema ofrece el cupo al primero de la fila, lo marca NOTIFICADO por 30 minutos y le despacha el aviso con el enlace "Tomar el cupo"',
    'A -> V: abrir_mis_citas()',
    f'V -> {API}: GET /citas/mis-listas-espera',
    f'{API} -> {PROG}: vencer_turnos_caducados()',
    *leer_de(PROG, 'buscar_turnos_notificados_vencidos()', 'Lista_Espera', 'lista_espera_id, estado, momento_expira',
             '0 turnos vencidos', 'return (sin turnos vencidos)'),
    f'{PROG} --> {API}: return (0 turnos vencidos)',
    *leer('listar_mis_listas(paciente_id)', 'Lista_Espera', 'lista_espera_id, posicion, estado, momento_expira',
          'turno NOTIFICADO', 'return (es su turno)'),
    f'{API} --> V: return (HTTP 200 OK: listas de espera)',
    'V --> A: mostrar_es_tu_turno_con_tomar_el_cupo()',
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
    3: dict(cortar='mostrar_posicion_en_la_lista', lineas=[
        '! El telefono no recibe push (sin red, sin permiso o Expo Go): el aviso del cupo queda en la campana y llega por correo',
        'A ->> A: leer_el_aviso_en_el_correo_o_en_la_campana()'],
        reanudar='abrir_mis_citas'),
    4: dict(cortar='SELECT lista_espera_id, estado, momento_expira', lineas=[
        f'Lista_Espera --> {SQL}: return (1 turno NOTIFICADO vencido)',
        f'{SQL} --> {DAO}: return (resultado)',
        f'{DAO} --> {PROG}: return (turno del primero vencido)',
        '! El primero no tomo el cupo en 30 minutos: el turno pasa a este paciente, siguiente de la fila',
        *actualizar_de(PROG, 'vencer_el_turno(VENCIDO)', 'Lista_Espera', 'estado'),
        *despachar(PROG, 'CUPO_CEDIDO', 'primero de la fila', retorno='return (aviso de turno vencido)'),
        *leer_de(PROG, 'buscar_al_siguiente_de_la_fila(cita_id)', 'Lista_Espera', 'lista_espera_id, posicion, paciente_id',
                 '1 inscrito ESPERANDO', 'return (siguiente de la fila)'),
        *actualizar_de(PROG, 'marcar_notificado_al_siguiente(plazo, token_cupo)', 'Lista_Espera',
                       'estado, momento_notificacion, momento_expira, token_cupo'),
        *despachar(PROG, 'CUPO_DISPONIBLE', 'siguiente de la fila', correo='email, enlace_tomar_cupo',
                   retorno='return (cupo ofrecido al siguiente)'),
        f'{PROG} --> {API}: return (1 turno vencido, cupo ofrecido)'],
        reanudar='listar_mis_listas'),
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
