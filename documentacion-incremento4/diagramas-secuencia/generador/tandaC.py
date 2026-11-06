# Tanda C — Atención y evidencia de la sesión: CU38, CU39, CU40, CU41.
# Reemplazan por completo los diagramas anteriores de estos CU: desde las
# correcciones del Incremento 4 el inicio y el término los dispara solo el
# profesional, las ubicaciones se toman solas, la sesión intenta certificarse
# sola al finalizar y la documentación puede quedar para el final de la jornada.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from motor import generar_cu, chrome_path
from comun import *

VHIST = 'V_Historial_Paciente'

# ── tramos compartidos ──
RADIO = leer('leer_parametro(RADIO_PRESENCIALIDAD_METROS)', 'Parametro_Global', 'clave, valor', '100 m', 'return (radio)')
PARAMS_PRES = ('leer_parametros(VENTANA_UBICACION_PACIENTE_MINUTOS, RADIO_PRESENCIALIDAD_METROS)',
               'Parametro_Global', 'clave, valor', '30 minutos y 100 m', 'return (ventana y radio)')

def leer_cita_validar(resultado='1 cita REALIZADA sin certificar'):
    return leer('verificar_cita_del_profesional(cita_id)', 'Cita',
                'estado, sesion_certificada_en, sesion_suspendida_en, evidencia_presencial', resultado, 'return (cita por validar)')

def analizar(resultado):
    return [f'{API} -> {PRES}: analizar_factores(cita, radio)',
            f'{PRES} ->> {PRES}: contrastar_marcas_y_ubicaciones()',
            f'{PRES} --> {API}: return ({resultado})']

# CU41: cierre manual con justificación obligatoria (vuelve al profesional).
def cierre_manual(resultado='factores con discrepancia'):
    return [
        'A -> V: cerrar_con_justificacion(justificacion)',
        f'V -> {API}: POST /citas/:id/validar-sesion (cierre_manual, confirmar, justificacion)',
        *leer_cita_validar(), *RADIO, *analizar(resultado),
        *actualizar('certificar_sesion(MANUAL)', 'Cita', 'sesion_certificada_en, certificacion_tipo'),
        *insertar('registrar_auditoria(SESION_CERTIFICADA_MANUAL, justificacion)', 'Bitacora_Auditoria'),
        f'{API} --> V: return (HTTP 200 OK: certificada por cierre manual)',
    ]

# CU41 Exc. 2: la sesión suspendida se deriva al Administrador (una sola vez).
DERIVAR = [
    *insertar('registrar_auditoria(SESION_SUSPENDIDA, factores fallidos)', 'Bitacora_Auditoria'),
    *actualizar('suspender_sesion(discrepancias)', 'Cita', 'sesion_suspendida_en, motivo_suspension'),
    *bloque('leer_contactos_de_la_cita(cita_id)',
            [q('Cita', 'cita_id, fecha_hora_inicio, modalidad', '1 cita'),
             q('Usuario', 'nombres, rut, email', 'paciente y profesional'),
             q('Usuario_Telefono', 'telefono', 'telefonos')],
            'return (contactos de ambos)'),
    *bloque('buscar_administradores_activos()',
            [q('Usuario', 'usuario_id, email, cuenta_activo', 'usuarios activos'),
             q('Rol', 'nombre_rol', 'rol Administrador')],
            'return (administradores)'),
    *despachar(API, 'SESION_SUSPENDIDA', 'cada administrador', retorno='return (avisos en la app)'),
    *externo('enviar_correo(email_admin, contactos de ambos)', BREVO, 'POST /v3/smtp/email',
             'return (HTTP 201 Aceptado)', 'return (correo aceptado)'),
]

# ──────────────────────────── CU38 ────────────────────────────
# El profesional presiona "Iniciar" y "Finalizar atención" en la cita, desde
# el historial del paciente. Cada marca registra sola la hora (y, en
# domicilio, las ubicaciones vía C_Validador_Presencialidad, CU39). Al
# finalizar se descuenta la sesión (C_Motor_Agendamiento), se pide la
# evaluación (CU55), se refresca la adherencia (C_Motor_Clinico, CU44), se
# intenta certificar (CU41) y, sin evolución firmada, se ofrece documentar
# ahora o al final de la jornada (CU40).
CU38_PRINCIPAL = [
    'A -> V: presionar_iniciar(cita_id)',
    'V ->> V: tomar_gps_y_direccion_si_es_domicilio() (CU39)',
    f'V -> {API}: POST /citas/marcas-temporales/:cita_id/iniciar (ubicacion, direccion_paciente)',
    *begin(),
    *leer('bloquear_cita_del_profesional(cita_id)', 'Cita', 'cita_id, estado, fecha_hora_inicio, modalidad, evidencia_presencial',
          '1 cita CONFIRMADA', 'return (cita bloqueada)'),
    f'{API} ->> {API}: verificar_inicio_dentro_del_bloque(marca_inicio)',
    *leer('buscar_episodio_abierto_mas_reciente(paciente_id, profesional_id)', 'Episodio_Clinico', 'episodio_clinico_id, estado',
          '1 episodio ABIERTO', 'return (episodio a vincular)'),
    *actualizar('registrar_inicio_y_presencia_del_paciente(EN_CURSO)', 'Cita',
                'checkin_profesional, checkin_paciente, estado, episodio_clinico_id'),
    f'{API} -> {PRES}: registrar_marca_presencial(cita, INICIO)',
    *leer_de(PRES, *PARAMS_PRES),
    f'{PRES} ->> {PRES}: calcular_distancia_entre_ambos()',
    *actualizar_de(PRES, 'guardar_evidencia_de_inicio(coordenadas, distancia)', 'Cita',
                   'evidencia_presencial, coordenadas_gps_profesional, coordenadas_gps_paciente'),
    f'{PRES} --> {API}: return (resultado de presencialidad)',
    *insertar('registrar_auditoria(INICIAR_ATENCION_CU38)', 'Bitacora_Auditoria'),
    *commit(),
    f'{API} --> V: return (HTTP 200 OK: EN_CURSO, marca_inicio, episodio_clinico_id)',
    'V --> A: mostrar_atencion_iniciada(marca_inicio, aviso_presencialidad)',
    'A -> V: presionar_finalizar_atencion(cita_id)',
    'V ->> V: tomar_gps_y_direccion_al_termino() (CU39)',
    f'V -> {API}: POST /citas/marcas-temporales/:cita_id/finalizar (ubicacion, direccion_paciente)',
    *begin(),
    *leer('bloquear_cita_del_profesional(cita_id)', 'Cita', 'cita_id, estado, checkin_profesional, modalidad, evidencia_presencial',
          '1 cita EN_CURSO', 'return (cita bloqueada)'),
    f'{API} ->> {API}: calcular_duracion(termino - inicio)',
    f'{API} -> {PRES}: registrar_marca_presencial(cita, TERMINO)',
    *leer_de(PRES, *PARAMS_PRES),
    f'{PRES} ->> {PRES}: calcular_distancia_al_termino()',
    *actualizar_de(PRES, 'guardar_evidencia_de_termino(coordenadas, distancia)', 'Cita', 'evidencia_presencial'),
    f'{PRES} --> {API}: return (resultado de presencialidad)',
    *actualizar('registrar_termino(REALIZADA)', 'Cita', 'fecha_hora_fin, estado'),
    f'{API} -> {MAG}: descontar_sesion_del_paquete(paciente_id)',
    *leer_de(MAG, 'buscar_paquete_activo(paciente_id)', 'Paquete_Sesiones', 'paquete_sesiones_id, sesiones_total, sesiones_usadas',
             '1 paquete ACTIVO', 'return (paquete vigente)'),
    *actualizar_de(MAG, 'sumar_sesion_usada()', 'Paquete_Sesiones', 'sesiones_usadas, estado'),
    f'{MAG} --> {API}: return (sesiones restantes)',
    *insertar('registrar_auditoria(FINALIZAR_ATENCION_CU38, duracion)', 'Bitacora_Auditoria'),
    *leer('buscar_evolucion_firmada_de_la_sesion(episodio_clinico_id)', 'Evolucion_Clinica', 'inalterable, hora_firma_digital',
          '0 evoluciones firmadas', 'return (sin registro firmado)'),
    *actualizar('marcar_pendiente_de_documentar()', 'Cita', 'documentacion_pendiente'),
    f'{API} -> {MAG}: pedir_evaluacion(cita_id) (CU55)',
    *leer_de(MAG, 'leer_paciente_de_la_cita(cita_id)', 'Cita', 'paciente_id, profesional_id', '1 cita', 'return (paciente a avisar)'),
    *despachar(MAG, 'EVALUAR_SESION', 'paciente', retorno='return (evaluacion pedida)'),
    f'{MAG} --> {API}: return (aviso de evaluacion enviado)',
    *commit(),
    '! Fuera de la transaccion: se refresca la adherencia (CU44) y se intenta certificar (CU41)',
    f'{API} -> {MCL}: actualizar_indicador(paciente_id) (CU44)',
    f'{MCL} ->> {MCL}: calcular_porcentaje_de_adherencia()',
    *insertar_de(MCL, 'guardar_medicion_del_dia(porcentaje)', 'Indicador_Adherencia'),
    f'{MCL} --> {API}: return (indicador actualizado)',
    *leer('leer_cita_para_certificar(cita_id)', 'Cita', 'sesion_certificada_en, checkin_profesional, evidencia_presencial',
          '1 cita sin certificar', 'return (cita realizada)'),
    *RADIO,
    f'{API} -> {PRES}: analizar_factores(cita, radio) (CU41)',
    f'{PRES} --> {API}: return (todos los factores coinciden)',
    *actualizar('certificar_sesion(MULTIFACTOR)', 'Cita', 'sesion_certificada_en, certificacion_tipo'),
    *insertar('registrar_auditoria(SESION_CERTIFICADA)', 'Bitacora_Auditoria'),
    f'{API} --> V: return (HTTP 200 OK: REALIZADA, duracion, certificacion, documentacion_pendiente)',
    'V --> A: ofrecer_documentar_ahora_o_al_final_de_la_jornada()',
    '! "Documentar ahora" abre la Sesion Clinica del episodio (CU40)',
    'A -> V: elegir_al_final_de_la_jornada()',
    'V --> A: avisar_que_queda_en_pendientes_de_documentar()',
]

CU38 = dict(id='CU38', nombre='Registrando marcas temporales de la prestación', actores=['Profesional'],
  vistas={'Profesional': VHIST},
  participantes=[ACTOR, VISTA, *capa(PRES, MAG, MCL, DESP),
                 *T('Cita', 'Episodio_Clinico', 'Parametro_Global', 'Paquete_Sesiones', 'Evolucion_Clinica',
                    'Indicador_Adherencia', 'Notificacion', 'Bitacora_Auditoria')],
  principal=CU38_PRINCIPAL,
  excepciones={
    1: dict(cortar='verificar_inicio_dentro_del_bloque', lineas=[
        '! La marca de inicio es anterior al bloque horario agendado',
        *rollback(),
        f'{API} --> V: return (HTTP 409 INICIO_ANTICIPADO, requiere_confirmacion)',
        'V --> A: mostrar_aviso_de_auditoria_temporal()',
        'A -> V: confirmar_inicio_anticipado()',
        f'V -> {API}: POST /citas/marcas-temporales/:cita_id/iniciar (confirmar_inicio_anticipado)',
        *begin(),
        *leer('bloquear_cita_del_profesional(cita_id)', 'Cita', 'cita_id, estado, fecha_hora_inicio, modalidad',
              '1 cita CONFIRMADA', 'return (cita bloqueada)'),
        f'{API} ->> {API}: aceptar_inicio_anticipado(queda auditado)'],
        reanudar='buscar_episodio_abierto_mas_reciente'),
    2: dict(cortar='presionar_iniciar', lineas=[
        '! La hora automatica no es utilizable: se exige una marca manual justificada',
        'V --> A: ofrecer_registrar_inicio_manual_justificado()',
        'A -> V: registrar_inicio_manual(fecha_hora, justificacion)',
        f'V -> {API}: POST /citas/marcas-temporales/:cita_id/iniciar (marca_manual, justificacion_manual)',
        f'{API} ->> {API}: validar_hora_manual_y_justificacion()'],
        reanudar='abrir_transaccion()'),
    3: dict(cortar='mostrar_atencion_iniciada', lineas=[
        '! El Profesional sale de la pantalla sin marcar el termino: la cita sigue EN_CURSO',
        'A -> V: volver_a_la_app_en_su_siguiente_acceso()',
        f'V -> {API}: GET /citas/atencion-en-curso',
        *leer('buscar_atencion_en_curso(usuario_id)', 'Cita', 'cita_id, checkin_profesional, paciente_id, estado',
              '1 cita EN_CURSO', 'return (atencion abierta)'),
        f'{API} --> V: return (HTTP 200 OK: atencion en curso)',
        'V --> A: mostrar_barra_persistente_de_atencion_en_curso()'],
        reanudar='presionar_finalizar_atencion'),
    4: dict(cortar='calcular_duracion', lineas=[
        '! La marca de termino (manual) es anterior al inicio: duracion negativa',
        *insertar('registrar_auditoria(BLOQUEO_DURACION_NEGATIVA_CU38)', 'Bitacora_Auditoria'),
        *commit(),
        f'{API} --> V: return (HTTP 409 DURACION_NEGATIVA)',
        'V --> A: informar_que_la_persistencia_fue_bloqueada()',
        'A -> V: corregir_la_marca_de_termino(fecha_hora, justificacion)'],
        reanudar='POST /citas/marcas-temporales/:cita_id/finalizar'),
  })

# ──────────────────────────── CU39 ────────────────────────────
# Paciente: su app envía sola la ubicación el día de la visita (no aprieta
# nada). Profesional: al iniciar y finalizar se toman su GPS y, como respaldo
# del paciente, su dirección registrada convertida a coordenadas en el
# teléfono; C_Validador_Presencialidad elige la ubicación del paciente
# (última de 30 minutos o dirección) y mide la distancia contra los 100 m.
CU39_PACIENTE = [
    '! La app repite esta pasada sola al abrirse y cada 2 minutos mientras esta abierta',
    'A -> V: abrir_la_app_el_dia_de_la_visita()',
    f'V -> {API}: GET /citas/ubicacion-pendiente',
    *leer('buscar_visitas_a_domicilio_cercanas(usuario_id)', 'Cita', 'cita_id, fecha_hora_inicio, estado, modalidad',
          '1 visita DOMICILIO de hoy', 'return (visitas por reportar)'),
    f'{API} --> V: return (HTTP 200 OK: citas)',
    'V ->> V: obtener_gps_del_telefono()',
    f'V -> {API}: POST /citas/:id/ubicacion (latitud, longitud)',
    f'{API} ->> {API}: validar_coordenadas()',
    *leer('verificar_cita_del_paciente(cita_id)', 'Cita', 'paciente_id, modalidad, estado', '1 cita DOMICILIO por realizar',
          'return (cita habilitada)'),
    *actualizar('guardar_ultima_ubicacion(lat, lng, momento_registro)', 'Cita', 'evidencia_presencial'),
    f'{API} --> V: return (HTTP 200 OK)',
    'V --> A: seguir_usando_la_app_sin_avisos()',
]

CU39_TRAS_TERMINO = [
    *actualizar('registrar_termino(REALIZADA)', 'Cita', 'fecha_hora_fin, estado'),
    '! Descuento de la sesion, pendiente de documentar y aviso de evaluacion: ver CU38',
    *commit(),
    *leer('leer_cita_para_certificar(cita_id)', 'Cita', 'sesion_certificada_en, evidencia_presencial',
          '1 cita REALIZADA sin certificar', 'return (cita por certificar)'),
    *RADIO,
    f'{API} -> {PRES}: analizar_factores(cita, radio) (CU41)',
]

CU39_CIERRE = [
    'A -> V: validar_sesion_con_cierre_manual(justificacion) (CU41)',
    f'V -> {API}: POST /citas/:id/validar-sesion (cierre_manual, confirmar, justificacion)',
    *leer_cita_validar(),
    *actualizar('certificar_sesion(MANUAL)', 'Cita', 'sesion_certificada_en, certificacion_tipo'),
    *insertar('registrar_auditoria(SESION_CERTIFICADA_MANUAL, justificacion)', 'Bitacora_Auditoria'),
    f'{API} --> V: return (HTTP 200 OK: certificada por cierre manual)',
]

CU39_PROFESIONAL = [
    'A -> V: presionar_iniciar(cita_id)',
    'V ->> V: obtener_gps_del_telefono()',
    'V ->> V: geocodificar_direccion_registrada(paciente)',
    f'V -> {API}: POST /citas/marcas-temporales/:cita_id/iniciar (ubicacion, direccion_paciente)',
    *begin(),
    *leer('bloquear_cita_del_profesional(cita_id)', 'Cita', 'cita_id, estado, modalidad, evidencia_presencial',
          '1 cita DOMICILIO CONFIRMADA', 'return (cita bloqueada)'),
    *actualizar('registrar_inicio(EN_CURSO)', 'Cita', 'checkin_profesional, checkin_paciente, estado'),
    f'{API} -> {PRES}: registrar_marca_presencial(cita, INICIO, ubicacion, direccion_paciente)',
    *leer_de(PRES, *PARAMS_PRES),
    f'{PRES} ->> {PRES}: tomar_ultima_ubicacion_del_paciente(menos de 30 min)',
    f'{PRES} ->> {PRES}: calcular_distancia(menor o igual a 100 m)',
    *actualizar_de(PRES, 'guardar_evidencia_de_inicio(coordenadas, fuente, distancia)', 'Cita',
                   'evidencia_presencial, coordenadas_gps_profesional, coordenadas_gps_paciente'),
    f'{PRES} --> {API}: return (dentro_del_radio, distancia_metros)',
    *insertar('registrar_auditoria(INICIAR_ATENCION_CU38, presencialidad)', 'Bitacora_Auditoria'),
    *commit(),
    f'{API} --> V: return (HTTP 200 OK: EN_CURSO, aviso_presencialidad)',
    'V --> A: mostrar_presencialidad_validada(distancia)',
    'A -> V: presionar_finalizar_atencion(cita_id)',
    'V ->> V: obtener_gps_al_termino()',
    'V ->> V: geocodificar_la_direccion_otra_vez()',
    f'V -> {API}: POST /citas/marcas-temporales/:cita_id/finalizar (ubicacion, direccion_paciente)',
    *begin(),
    *leer('bloquear_cita_del_profesional(cita_id)', 'Cita', 'cita_id, estado, modalidad, evidencia_presencial',
          '1 cita EN_CURSO', 'return (cita bloqueada)'),
    f'{API} -> {PRES}: registrar_marca_presencial(cita, TERMINO, ubicacion, direccion_paciente)',
    *leer_de(PRES, *PARAMS_PRES),
    f'{PRES} ->> {PRES}: tomar_ultima_ubicacion_reciente_del_paciente()',
    f'{PRES} ->> {PRES}: calcular_distancia_al_termino()',
    *actualizar_de(PRES, 'guardar_evidencia_de_termino(coordenadas, distancia)', 'Cita', 'evidencia_presencial'),
    f'{PRES} --> {API}: return (dentro_del_radio al termino)',
    *CU39_TRAS_TERMINO,
    f'{PRES} ->> {PRES}: comparar_ubicaciones_de_inicio_y_termino()',
    f'{PRES} --> {API}: return (todos los factores coinciden)',
    *actualizar('certificar_permanencia(MULTIFACTOR)', 'Cita', 'sesion_certificada_en, certificacion_tipo'),
    *insertar('registrar_auditoria(SESION_CERTIFICADA, factores)', 'Bitacora_Auditoria'),
    f'{API} --> V: return (HTTP 200 OK: REALIZADA, certificacion)',
    'V --> A: mostrar_resumen_de_la_atencion()',
]

CU39 = dict(id='CU39', nombre='Validando presencialidad mediante coordenadas GPS', actores=['Paciente', 'Profesional'],
  vistas={'Paciente': 'V_Inicio_Paciente', 'Profesional': VHIST},
  participantes=[ACTOR, VISTA, *capa(PRES, DESP, ADP, BREVO),
                 *T('Cita', 'Parametro_Global', 'Usuario', 'Usuario_Telefono', 'Rol', 'Notificacion', 'Bitacora_Auditoria')],
  principal={'Paciente': CU39_PACIENTE, 'Profesional': CU39_PROFESIONAL},
  excepciones={
    # Paciente: su app nunca le muestra avisos; cada excepcion se ve desde lo
    # que la app envia (o deja de enviar) y lo que el servidor guarda.
    'Paciente': {
      1: dict(cortar='obtener_gps_del_telefono', lineas=[
          '! Sin permiso de ubicacion, con el GPS apagado o sin senal, el telefono no entrega coordenadas',
          'V ->> V: omitir_el_envio_de_la_ubicacion()',
          '! Si la app esta cerrada no envia nada. Al iniciar y finalizar, el Profesional usa la direccion registrada del paciente (sin ella si la oculto, CU09)',
          'V ->> V: reintentar_en_la_proxima_pasada(2 minutos)',
          '! Con la ubicacion ya disponible, la siguiente pasada repite el flujo principal y la envia'],
          reanudar='GET /citas/ubicacion-pendiente'),
      2: dict(cortar='SELECT cita_id, fecha_hora_inicio, estado, modalidad FROM Cita', lineas=[
          '! El Profesional inicio con su GPS apagado o a mas de 100 m: la marca no se bloqueo y la cita sigue EN_CURSO',
          *vacio('Cita', '1 visita DOMICILIO EN_CURSO', 'visita en curso por reportar')],
          reanudar='return (HTTP 200 OK: citas)'),
      3: dict(cortar='SELECT cita_id, fecha_hora_inicio, estado, modalidad FROM Cita', lineas=[
          '! La app estuvo cerrada o sin senal al termino: la atencion ya finalizo (REALIZADA)',
          *vacio('Cita', '0 visitas por reportar', 'sin visitas pendientes'),
          f'{API} --> V: return (HTTP 200 OK: citas = [])',
          '! La marca de termino quedo sin la ubicacion del paciente: el Profesional cierra con justificacion (CU41)',
          'V ->> V: no_pedir_ubicacion_ni_permisos()',
          'V ->> V: repetir_la_pasada_en_la_proxima_visita()',
          '! En su proxima visita a domicilio la app vuelve a encontrarla y envia su ubicacion'],
          reanudar='GET /citas/ubicacion-pendiente'),
      4: dict(cortar='obtener_gps_del_telefono', lineas=[
          '! El telefono ubica al paciente lejos del domicilio de la visita: la app envia igual su ubicacion',
          f'V -> {API}: POST /citas/:id/ubicacion (latitud, longitud)',
          f'{API} ->> {API}: validar_coordenadas()',
          *leer('verificar_cita_del_paciente(cita_id)', 'Cita', 'paciente_id, modalidad, estado', '1 cita DOMICILIO EN_CURSO',
                'return (cita habilitada)'),
          '! El servidor no mide la distancia al recibirla: la guarda tal cual',
          *actualizar('guardar_ultima_ubicacion(lat, lng, momento_registro)', 'Cita', 'evidencia_presencial'),
          '! Al termino la distancia supera los 100 m: la sesion se suspende y se deriva al Administrador (CU41), que puede contactar al paciente',
          f'{API} --> V: return (HTTP 200 OK)'],
          reanudar='seguir_usando_la_app_sin_avisos'),
    },
    'Profesional': {
      1: dict(cortar='tomar_ultima_ubicacion_del_paciente', lineas=[
          '! La app del paciente no envio su ubicacion (cerrada, sin permiso o sin senal)',
          f'{PRES} ->> {PRES}: usar_direccion_registrada_del_paciente()',
          '! Si la oculto por privacidad (CU09), la marca queda sin su ubicacion',
          f'{PRES} ->> {PRES}: calcular_distancia_con_la_direccion()'],
          reanudar='guardar_evidencia_de_inicio'),
      2: dict(cortar='calcular_distancia(menor', lineas=[
          '! GPS del Profesional apagado o distancia mayor a 100 m: la marca no se bloquea',
          f'{PRES} ->> {PRES}: marcar_sin_ubicacion_o_fuera_del_radio()',
          *actualizar_de(PRES, 'guardar_evidencia_de_inicio(sin_ubicacion o distancia)', 'Cita',
                         'evidencia_presencial, coordenadas_gps_profesional, coordenadas_gps_paciente'),
          f'{PRES} --> {API}: return (fuera del radio o sin ubicacion)',
          *insertar('registrar_auditoria(INICIAR_ATENCION_CU38, presencialidad)', 'Bitacora_Auditoria'),
          *commit(),
          f'{API} --> V: return (HTTP 200 OK: EN_CURSO, aviso_presencialidad)',
          'V --> A: avisar_que_al_finalizar_debera_justificar_el_cierre()',
          'A ->> A: continuar_la_atencion()'],
          reanudar='presionar_finalizar_atencion'),
      3: dict(cortar='calcular_distancia_al_termino', lineas=[
          '! Falta la ubicacion de uno de los dos al termino: la marca se registra sin ella',
          f'{PRES} ->> {PRES}: dejar_la_distancia_sin_calcular()',
          *actualizar_de(PRES, 'guardar_evidencia_de_termino(sin_ubicacion)', 'Cita', 'evidencia_presencial'),
          f'{PRES} --> {API}: return (sin_ubicacion al termino)',
          *CU39_TRAS_TERMINO,
          f'{PRES} --> {API}: return (factor SIN_UBICACION)',
          f'{API} --> V: return (HTTP 200 OK: REALIZADA, requiere_cierre_manual)',
          'V --> A: pedir_cierre_justificado_desde_validar_sesion()',
          *CU39_CIERRE],
          reanudar='mostrar_resumen_de_la_atencion'),
      4: dict(cortar='comparar_ubicaciones_de_inicio_y_termino', lineas=[
          '! La distancia al termino supera los 100 m',
          f'{PRES} --> {API}: return (factor DISTANCIA fallido)',
          *DERIVAR,
          f'{API} --> V: return (HTTP 200 OK: REALIZADA, requiere_cierre_manual, administradores_avisados)',
          'V --> A: avisar_suspension_y_pedir_justificacion()',
          *CU39_CIERRE],
          reanudar='mostrar_resumen_de_la_atencion'),
    },
  })

# ──────────────────────────── CU40 ────────────────────────────
# Se documenta con la cita EN_CURSO o ya REALIZADA y pendiente de documentar.
# Se llega durante la atención, desde "Documentar ahora" (CU38) o desde
# "Pendientes de documentar" en Mi Jornada (GET /citas/documentacion-pendiente).
CONTEXTO = [q('Episodio_Clinico', 'episodio_clinico_id, motivo_consulta, estado, paciente_id', '1 episodio propio'),
            q('Especialidad', 'nombre', 'especialidad del profesional'),
            q('Cita', 'cita_id, estado, documentacion_pendiente', 'cita EN_CURSO o REALIZADA pendiente')]

CU40 = dict(id='CU40', nombre='Documentando intervención y respuesta fisiológica', actores=['Profesional'],
  vistas={'Profesional': 'V_Sesion_Clinica'},
  participantes=[ACTOR, VISTA, *capa(MCL),
                 *T('Episodio_Clinico', 'Especialidad', 'Cita', 'Evolucion_Clinica', 'Objetivo_Terapeutico', 'Bitacora_Auditoria')],
  principal=[
    '! Se entra durante la atencion, desde "Documentar ahora" (CU38) o desde "Pendientes de documentar" en Mi Jornada',
    'A -> V: abrir_sesion_clinica(episodio_id)',
    f'V -> {API}: GET /clinica/intervenciones/:episodio_id',
    *bloque('leer_contexto_de_la_sesion(episodio_id, usuario_id)', CONTEXTO, 'return (contexto de la sesion)'),
    *leer('leer_ultima_evolucion(episodio_id)', 'Evolucion_Clinica', 'tecnicas_aplicadas, respuesta_fisiologica, inalterable',
          'evolucion sin firmar', 'return (registro en curso)'),
    f'{API} ->> {API}: habilitar_edicion(cita documentable)',
    f'{API} --> V: return (HTTP 200 OK: contexto, editable, evolucion)',
    'V ->> V: recuperar_borrador_local_si_existe()',
    'V --> A: mostrar_paciente_especialidad_cita_y_paso_1()',
    'A -> V: documentar_tecnicas_y_respuesta(tecnicas, respuesta)',
    'V ->> V: revisar_indicadores_de_deterioro()',
    f'V -> {API}: PUT /clinica/intervenciones/:episodio_id (tecnicas_aplicadas, respuesta_fisiologica)',
    *begin(),
    *bloque('bloquear_contexto(episodio_id, usuario_id)', CONTEXTO, 'return (cita documentable)'),
    *leer('bloquear_ultima_evolucion(episodio_id)', 'Evolucion_Clinica', 'evolucion_clinica_id, inalterable',
          'evolucion abierta', 'return (evolucion editable)'),
    f'{API} -> {MCL}: calcular_avance_de_metas(episodio_id)',
    *leer_de(MCL, 'leer_objetivos(episodio_id)', 'Objetivo_Terapeutico', 'meta_valor, valor_actual', 'metas del episodio',
             'return (metas)'),
    f'{MCL} --> {API}: return (porcentaje_objetivo)',
    *actualizar('guardar_nota_tecnica(tecnicas, respuesta, porcentaje)', 'Evolucion_Clinica',
                'tecnicas_aplicadas, respuesta_fisiologica, porcentaje_objetivo'),
    f'{API} ->> {API}: detectar_alerta_prioritaria(texto)',
    *insertar('registrar_auditoria(DOCUMENTAR_INTERVENCION_FISIOLOGICA)', 'Bitacora_Auditoria'),
    *commit(),
    f'{API} --> V: return (HTTP 200 OK: evolucion_clinica_id, alerta_prioritaria)',
    'V ->> V: borrar_borrador_local()',
    '! Siguen el avance de metas (CU32) y el cierre firmado (CU30 / CU36), que retira la cita de pendientes',
    'V --> A: habilitar_avance_de_metas_y_cierre_firmado()',
  ],
  excepciones={
    1: dict(cortar='SELECT cita_id, estado, documentacion_pendiente', lineas=[
        f'Cita --> {SQL}: return (sin cita EN_CURSO ni pendiente)',
        f'{SQL} --> {DAO}: return (resultado)',
        f'{DAO} --> {API}: return (contexto sin cita documentable)',
        f'{API} --> V: return (HTTP 200 OK: editable = false, mensaje_estado)',
        'V --> A: mostrar_campos_en_solo_lectura_y_como_iniciar()',
        '! El Profesional inicia la atencion desde el historial del paciente (CU38)',
        'A -> V: volver_a_la_sesion_tras_iniciar(episodio_id)'],
        reanudar='GET /clinica/intervenciones/:episodio_id'),
    2: dict(cortar='SELECT nombre FROM Especialidad', lineas=[
        '! La especialidad no se logra recuperar',
        f'Especialidad --> {SQL}: return (sin especialidad)',
        f'{SQL} --> {DAO}: return (especialidad = General)',
        *q('Cita', 'cita_id, estado, documentacion_pendiente', 'cita EN_CURSO o REALIZADA pendiente'),
        f'{DAO} --> {API}: return (contexto con especialidad General)'],
        reanudar='leer_ultima_evolucion'),
    3: dict(cortar='detectar_alerta_prioritaria', lineas=[
        '! El texto trae senales de deterioro grave (la app ya pidio confirmarlo antes de guardar)',
        *insertar('registrar_auditoria(DOCUMENTAR_INTERVENCION_FISIOLOGICA, alerta_prioritaria)', 'Bitacora_Auditoria'),
        *commit(),
        f'{API} --> V: return (HTTP 200 OK: alerta_prioritaria = true)',
        'V --> A: mostrar_guardado_con_alerta_prioritaria()',
        'A ->> A: activar_el_flujo_de_atencion_prioritaria()',
        'A -> V: continuar_con_la_sesion()'],
        reanudar='borrar_borrador_local'),
    4: dict(cortar='revisar_indicadores_de_deterioro', lineas=[
        '! Perdida momentanea de red: el envio no llega al servidor',
        'V ->> V: guardar_borrador_local(tecnicas, respuesta)',
        'V --> A: avisar_que_quedo_guardado_en_el_dispositivo()',
        'A -> V: guardar_de_nuevo_al_recuperar_la_senal()'],
        reanudar='PUT /clinica/intervenciones/:episodio_id'),
  })

# ──────────────────────────── CU41 ────────────────────────────
# Profesional: la validación corre sola al presionar "Finalizar atención" y,
# si todo coincide, certifica sin pasos extra. Si no, el profesional cierra a
# mano con justificación desde "Validar sesión". Administrador: revisa en su
# bandeja las sesiones suspendidas por distancia y coordina la resolución.
CU41_PROFESIONAL = [
    'A -> V: presionar_finalizar_atencion(cita_id)',
    f'V -> {API}: POST /citas/marcas-temporales/:cita_id/finalizar (ubicacion, direccion_paciente)',
    '! Marcas de termino, ubicaciones, descuento y pendiente de documentar: ver CU38 y CU39',
    *begin(),
    *leer('bloquear_cita_del_profesional(cita_id)', 'Cita', 'cita_id, estado, checkin_profesional, modalidad',
          '1 cita EN_CURSO', 'return (cita bloqueada)'),
    *actualizar('registrar_termino(REALIZADA)', 'Cita', 'fecha_hora_fin, estado, evidencia_presencial'),
    *commit(),
    '! Validacion automatica: corre sola al finalizar, sin pasos extra',
    *leer('leer_cita_para_certificar(cita_id)', 'Cita', 'checkin_profesional, estado, modalidad, evidencia_presencial, sesion_certificada_en',
          '1 cita REALIZADA sin certificar', 'return (cita por certificar)'),
    *RADIO,
    f'{API} -> {PRES}: analizar_factores(cita, radio)',
    f'{PRES} ->> {PRES}: verificar_marcas_y_ubicaciones_en_el_radio()',
    f'{PRES} --> {API}: return (todos los factores coinciden)',
    *actualizar('certificar_sesion(MULTIFACTOR)', 'Cita', 'sesion_certificada_en, certificacion_tipo'),
    *insertar('registrar_auditoria(SESION_CERTIFICADA, factores)', 'Bitacora_Auditoria'),
    f'{API} --> V: return (HTTP 200 OK: REALIZADA, certificacion)',
    'V --> A: mostrar_sesion_certificada(factores)',
]

PEDIR_VALIDACION = [
    'A -> V: validar_sesion(cita_id)',
    f'V -> {API}: POST /citas/:id/validar-sesion',
]

CU41_ADMINISTRADOR = [
    '! Llegan aqui las sesiones suspendidas por distancia (Excepcion 2 del Profesional), con aviso en la app y por correo',
    'A -> V: abrir_sesiones_suspendidas()',
    f'V -> {API}: GET /citas/sesiones-suspendidas',
    *bloque('listar_sesiones_suspendidas()',
            [q('Cita', 'cita_id, fecha_hora_inicio, sesion_suspendida_en, motivo_suspension, sesion_certificada_en', 'sesiones suspendidas'),
             q('Usuario', 'nombres, rut, email', 'paciente y profesional'),
             q('Usuario_Telefono', 'telefono', 'telefonos'),
             q('Especialidad', 'nombre', 'especialidad')],
            'return (sesiones con contactos)'),
    f'{API} ->> {API}: marcar_resuelta_si_ya_se_certifico()',
    f'{API} --> V: return (HTTP 200 OK: sesiones, pendientes primero)',
    'V --> A: mostrar_discrepancias_y_contactos_de_ambos()',
    'A -> V: contactar_al_paciente_o_al_profesional(email o telefono)',
    'V ->> V: abrir_el_correo_o_el_marcador_del_telefono()',
    'V --> A: coordinar_la_resolucion_fuera_del_sistema()',
    '! El Profesional certifica luego con cierre manual justificado',
    'A -> V: refrescar_la_bandeja()',
    f'V -> {API}: GET /citas/sesiones-suspendidas',
    *bloque('listar_sesiones_suspendidas()',
            [q('Cita', 'cita_id, sesion_suspendida_en, sesion_certificada_en, certificacion_tipo', 'sesion ya certificada'),
             q('Usuario', 'nombres, rut, email', 'paciente y profesional'),
             q('Usuario_Telefono', 'telefono', 'telefonos'),
             q('Especialidad', 'nombre', 'especialidad')],
            'return (sesiones con contactos)'),
    f'{API} --> V: return (HTTP 200 OK: sesion resuelta)',
    'V --> A: mostrar_la_sesion_como_resuelta()',
]

CU41 = dict(id='CU41', nombre='Validando sesión mediante protocolo multi-factor', actores=['Profesional', 'Administrador'],
  vistas={'Profesional': VHIST, 'Administrador': 'V_Sesiones_Suspendidas'},
  participantes=[ACTOR, VISTA, *capa(PRES, DESP, ADP, BREVO),
                 *T('Cita', 'Parametro_Global', 'Usuario', 'Usuario_Telefono', 'Rol', 'Especialidad', 'Notificacion',
                    'Bitacora_Auditoria')],
  principal={'Profesional': CU41_PROFESIONAL, 'Administrador': CU41_ADMINISTRADOR},
  excepciones={
    'Profesional': {
      1: dict(cortar='verificar_marcas_y_ubicaciones_en_el_radio', lineas=[
          '! Falta la ubicacion del profesional o del paciente en alguna marca',
          f'{PRES} --> {API}: return (factor SIN_UBICACION)',
          f'{API} --> V: return (HTTP 200 OK: REALIZADA, requiere_cierre_manual)',
          'V --> A: avisar_que_debe_cerrar_con_justificacion()',
          *PEDIR_VALIDACION,
          *leer_cita_validar(), *RADIO, *analizar('falta una ubicacion'),
          f'{API} --> V: return (HTTP 200 OK: requiere_cierre_manual, factores)',
          'V --> A: habilitar_cierre_manual_con_justificacion_obligatoria()',
          *cierre_manual('falta una ubicacion')],
          reanudar='mostrar_sesion_certificada'),
      2: dict(cortar='verificar_marcas_y_ubicaciones_en_el_radio', lineas=[
          '! La distancia entre ambos supera los 100 m: discrepancia critica',
          f'{PRES} --> {API}: return (factor DISTANCIA fallido)',
          *DERIVAR,
          f'{API} --> V: return (HTTP 200 OK: REALIZADA, requiere_cierre_manual, administradores_avisados)',
          'V --> A: informar_suspension_y_derivacion_al_administrador()',
          *PEDIR_VALIDACION,
          *leer_cita_validar('1 cita ya suspendida'), *RADIO, *analizar('factor DISTANCIA fallido'),
          '! La derivacion se hace una sola vez: el reintento no vuelve a avisar a los administradores',
          f'{API} ->> {API}: omitir_nueva_derivacion(ya_derivada)',
          f'{API} --> V: return (HTTP 409 VALIDACION_SUSPENDIDA, requiere_cierre_manual)',
          'V --> A: ofrecer_cierre_manual_justificado()',
          *cierre_manual('factor DISTANCIA fallido')],
          reanudar='mostrar_sesion_certificada'),
      3: dict(cortar='verificar_marcas_y_ubicaciones_en_el_radio', lineas=[
          '! Un factor no coincide: la sesion no se certifica sola',
          f'{PRES} --> {API}: return (factor SIN_UBICACION)',
          f'{API} --> V: return (HTTP 200 OK: REALIZADA, requiere_cierre_manual)',
          'V --> A: avisar_que_debe_cerrar_con_justificacion()',
          *PEDIR_VALIDACION,
          *leer_cita_validar(), *RADIO, *analizar('falta una ubicacion'),
          f'{API} --> V: return (HTTP 200 OK: requiere_cierre_manual, factores)',
          'V --> A: mostrar_resumen_de_factores()',
          '! El Profesional rechaza el resumen o pierde la red: no se persiste ninguna certificacion',
          'A -> V: volver_sin_confirmar()',
          'V --> A: dejar_la_sesion_pendiente_de_validacion()',
          'A ->> A: retomar_la_validacion_mas_tarde()',
          *cierre_manual('falta una ubicacion')],
          reanudar='mostrar_sesion_certificada'),
      4: dict(cortar='UPDATE Cita SET sesion_certificada_en, certificacion_tipo', lineas=[
          *fallo_bd('Cita', 'error de escritura al certificar'),
          '! La atencion queda REALIZADA y la certificacion pendiente',
          f'{API} --> V: return (HTTP 200 OK: REALIZADA, sin certificar)',
          'V --> A: informar_que_el_cierre_quedo_pendiente()',
          'A ->> A: reintentar_en_unos_minutos()',
          *PEDIR_VALIDACION,
          *leer_cita_validar(), *RADIO, *analizar('todos los factores coinciden'),
          f'{API} --> V: return (HTTP 200 OK: resumen_pendiente, factores)',
          'V --> A: mostrar_resumen_de_factores()',
          'A -> V: confirmar_la_certificacion()',
          f'V -> {API}: POST /citas/:id/validar-sesion (confirmar)',
          *leer_cita_validar(), *RADIO, *analizar('todos los factores coinciden'),
          *actualizar('certificar_sesion(MULTIFACTOR)', 'Cita', 'sesion_certificada_en, certificacion_tipo'),
          *insertar('registrar_auditoria(SESION_CERTIFICADA, factores)', 'Bitacora_Auditoria'),
          f'{API} --> V: return (HTTP 200 OK: sesion certificada)'],
          reanudar='mostrar_sesion_certificada'),
    },
    # Administrador: cada excepcion se ve desde su bandeja de sesiones
    # suspendidas (derivarAAdministracion, sesionesSuspendidas, validarSesion).
    'Administrador': {
      1: dict(cortar='SELECT cita_id, fecha_hora_inicio, sesion_suspendida_en', lineas=[
          '! Si solo falta una ubicacion, la sesion no se suspende ni se deriva: el Administrador no recibe aviso',
          *vacio('Cita', '0 sesiones suspendidas', 'bandeja vacia'),
          f'{API} --> V: return (HTTP 200 OK: sesiones = [])',
          'V --> A: mostrar_no_hay_sesiones_suspendidas()',
          '! El Profesional cierra esa sesion con justificacion obligatoria, sin pasar por la bandeja',
          'A ->> A: esperar_un_aviso_SESION_SUSPENDIDA()',
          'A -> V: abrir_sesiones_suspendidas()'],
          reanudar='GET /citas/sesiones-suspendidas'),
      2: dict(cortar='SELECT cita_id, fecha_hora_inicio, sesion_suspendida_en', lineas=[
          '! Distancia sobre el radio: cada administrador recibio una sola vez el aviso SESION_SUSPENDIDA y un correo con los contactos de ambos',
          f'Cita --> {SQL}: return (1 sesion suspendida por DISTANCIA, sin certificar)',
          f'{SQL} --> {DAO}: return (resultado)',
          *q('Usuario', 'nombres, rut, email', 'paciente y profesional'),
          *q('Usuario_Telefono', 'telefono', 'telefonos'),
          *q('Especialidad', 'nombre', 'especialidad'),
          f'{DAO} --> {API}: return (sesion suspendida con contactos)',
          f'{API} ->> {API}: marcar_resuelta_si_ya_se_certifico()',
          f'{API} --> V: return (HTTP 200 OK: sesion Pendiente)',
          '! El correo es de mejor esfuerzo: si no sale, queda el aviso en la app. Un reintento del Profesional no vuelve a avisar',
          'V --> A: mostrar_distancia_sobre_el_radio_y_contactos_de_ambos()'],
          reanudar='contactar_al_paciente_o_al_profesional'),
      3: dict(cortar='coordinar_la_resolucion_fuera_del_sistema', lineas=[
          '! El Profesional rechaza el resumen o pierde la red antes de confirmar: no se persiste ninguna certificacion',
          'A -> V: refrescar_la_bandeja()',
          f'V -> {API}: GET /citas/sesiones-suspendidas',
          *bloque('listar_sesiones_suspendidas()',
                  [q('Cita', 'cita_id, sesion_suspendida_en, sesion_certificada_en', 'sesion aun sin certificar'),
                   q('Usuario', 'nombres, rut, email', 'paciente y profesional'),
                   q('Usuario_Telefono', 'telefono', 'telefonos'),
                   q('Especialidad', 'nombre', 'especialidad')],
                  'return (sesiones con contactos)'),
          f'{API} ->> {API}: marcar_resuelta_si_ya_se_certifico()',
          f'{API} --> V: return (HTTP 200 OK: sesion Pendiente)',
          'V --> A: mantener_la_sesion_como_pendiente()',
          'A ->> A: volver_a_revisar_mas_tarde()'],
          reanudar='refrescar_la_bandeja'),
      4: dict(cortar='coordinar_la_resolucion_fuera_del_sistema', lineas=[
          '! Falla la escritura del cierre del Profesional (HTTP 500 CIERRE_ENCOLADO): la sesion sigue sin certificar',
          'A -> V: refrescar_la_bandeja()',
          f'V -> {API}: GET /citas/sesiones-suspendidas',
          *bloque('listar_sesiones_suspendidas()',
                  [q('Cita', 'cita_id, sesion_suspendida_en, sesion_certificada_en', 'sesion aun sin certificar'),
                   q('Usuario', 'nombres, rut, email', 'paciente y profesional'),
                   q('Usuario_Telefono', 'telefono', 'telefonos'),
                   q('Especialidad', 'nombre', 'especialidad')],
                  'return (sesiones con contactos)'),
          f'{API} ->> {API}: marcar_resuelta_si_ya_se_certifico()',
          f'{API} --> V: return (HTTP 200 OK: sesion Pendiente)',
          'V --> A: mantener_la_sesion_como_pendiente()',
          '! El Profesional reintenta en unos minutos; al certificarse, la sesion aparece Resuelta',
          'A ->> A: refrescar_en_unos_minutos()'],
          reanudar='refrescar_la_bandeja'),
    },
  })

if __name__ == '__main__':
    salida = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    chrome = chrome_path()
    total = 0
    for cu in (CU38, CU39, CU40, CU41):
        verificar_participantes(cu)
        ruta, n = generar_cu(cu, os.path.join(salida, cu['id']), chrome, png='--sin-png' not in sys.argv)
        total += n
        print(f"{cu['id']}: {n} paginas -> {os.path.relpath(ruta, salida)}")
    print('total:', total)
