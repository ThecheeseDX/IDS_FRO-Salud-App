# Tanda 4 — Calidad del servicio: CU55, CU56, CU58.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from motor import generar_cu, chrome_path
from comun import *

# ──────────────────────────── CU55 ────────────────────────────
CU55 = dict(id='CU55', nombre='Evaluando satisfacción post-sesión', actores=['Paciente'],
  vistas={'Paciente': 'V_Mis_Citas'},
  participantes=[ACTOR, VISTA, *capa(FILT),
                 *T('Cita', 'Evaluacion_Satisfaccion', 'Palabra_Restringida', 'Profesional', 'Bitacora_Auditoria')],
  principal=[
    '! Al finalizar la atencion (CU38) el sistema envio al paciente el aviso "Califica tu atencion"',
    'A -> V: abrir_mis_citas_desde_el_aviso(evaluar_cita_id)',
    f'V -> {API}: GET /citas/evaluaciones/pendientes',
    *bloque('listar_atenciones_sin_evaluar(paciente_id)',
            [q('Cita', 'cita_id, fecha_hora_inicio, estado', 'citas REALIZADA'),
             q('Evaluacion_Satisfaccion', 'evaluacion_satisfaccion_id', 'sin evaluacion')],
            'return (atenciones por calificar)'),
    f'{API} --> V: return (HTTP 200 OK: atenciones por calificar)',
    'V ->> V: abrir_el_formulario_de_la_cita_pendiente()',
    'V --> A: mostrar_estrellas_y_resena_opcional()',
    'A -> V: calificar(puntuacion, resena)',
    f'V -> {API}: POST /citas/:id/evaluacion (puntuacion, resena)',
    f'{API} ->> {API}: validar_puntuacion_de_1_a_5()',
    *leer('leer_cita(cita_id)', 'Cita', 'cita_id, estado, profesional_id, paciente_id', '1 cita REALIZADA del paciente',
          'return (cita realizada)'),
    *leer('verificar_que_no_este_evaluada(cita_id)', 'Evaluacion_Satisfaccion', 'evaluacion_satisfaccion_id',
          '0 evaluaciones', 'return (sin evaluacion previa)'),
    f'{API} -> {FILT}: revisar(resena)',
    *leer_de(FILT, 'leer_diccionario_activo() (cache de 60 s)', 'Palabra_Restringida', 'termino, activa', 'terminos activos',
             'return (diccionario)'),
    f'{FILT} ->> {FILT}: normalizar_y_comparar_por_palabra_completa()',
    f'{FILT} --> {API}: return (permitido)',
    *begin(),
    *insertar('registrar_evaluacion(puntuacion, resena, PENDIENTE)', 'Evaluacion_Satisfaccion'),
    *leer('bloquear_fila_del_profesional(profesional_id)', 'Profesional', 'profesional_id', '1 fila bloqueada (FOR UPDATE)',
          'return (fila del profesional bloqueada)'),
    *bloque('calcular_promedio_y_total(profesional_id)',
            [q('Evaluacion_Satisfaccion', 'puntuacion', 'notas del profesional'), q('Cita', 'profesional_id', 'citas evaluadas')],
            'return (promedio y total)'),
    *actualizar('persistir_promedio(calificacion_promedio)', 'Profesional', 'calificacion_promedio'),
    *insertar('registrar_evaluacion_en_bitacora(EVALUACION_SATISFACCION)', 'Bitacora_Auditoria'),
    *commit(),
    f'{API} --> V: return (HTTP 201 Created: calificacion registrada)',
    'V --> A: mostrar_el_resultado_de_la_evaluacion()',
  ],
  excepciones={
    1: dict(cortar='verificar_que_no_este_evaluada', lineas=[
        f'{DAO} -> {SQL}: ejecutar_consulta(SELECT)',
        f'{SQL} -> Evaluacion_Satisfaccion: SELECT evaluacion_satisfaccion_id FROM Evaluacion_Satisfaccion (cita ya evaluada)',
        f'Evaluacion_Satisfaccion --> {SQL}: return (1 evaluacion existente)',
        f'{SQL} --> {DAO}: return (resultado)',
        f'{DAO} --> {API}: return (ya evaluada)',
        f'{API} --> V: return (HTTP 409 YA_EVALUADA)',
        'V --> A: informar_que_esa_atencion_ya_fue_evaluada()',
        'A -> V: elegir_otra_atencion_pendiente(puntuacion, resena)'],
        reanudar='POST /citas/:id/evaluacion'),
    2: dict(cortar=0, lineas=[
        '! El aviso no se mostro o el paciente lo descarto: la cita queda en "Califica tu atencion"',
        'A -> V: abrir_mis_citas_y_tocar_calificar()'],
        reanudar='GET /citas/evaluaciones/pendientes'),
    3: dict(cortar='normalizar_y_comparar_por_palabra_completa', lineas=[
        f'{FILT} --> {API}: return (resena bloqueada o vacia)',
        '! Sin resena, o con terminos no permitidos: se registra solo la nota y la vista muestra el aviso',
        f'{API} ->> {API}: descartar_la_resena()'],
        reanudar='abrir_transaccion'),
    4: dict(cortar='bloquear_fila_del_profesional', lineas=[
        f'{DAO} -> {SQL}: ejecutar_consulta(SELECT ... FOR UPDATE)',
        '! Otra evaluacion del mismo profesional esta recalculando el promedio: la fila espera hasta liberarse',
        f'{SQL} -> Profesional: SELECT profesional_id FROM Profesional (fila tomada por otra transaccion)',
        f'Profesional --> {SQL}: return (fila liberada: el calculo se serializa)',
        f'{SQL} --> {DAO}: return (resultado)',
        f'{DAO} --> {API}: return (fila del profesional bloqueada tras esperar)'],
        reanudar='calcular_promedio_y_total'),
  })

# ──────────────────────────── CU56 ────────────────────────────
CU56 = dict(id='CU56', nombre='Moderando testimonios públicos', actores=['Administrador'],
  vistas={'Administrador': 'V_Moderar_Testimonios'},
  participantes=[ACTOR, VISTA, *capa(), *T('Evaluacion_Satisfaccion', 'Cita', 'Usuario', 'Bitacora_Auditoria')],
  principal=[
    'A -> V: abrir_moderar_testimonios(estado = PENDIENTE)',
    f'V -> {API}: GET /evaluaciones/moderacion?estado=PENDIENTE',
    f'{API} ->> {API}: validar_el_estado_del_filtro()',
    *bloque('listar_resenas_por_estado(PENDIENTE)',
            [q('Evaluacion_Satisfaccion', 'evaluacion_satisfaccion_id, puntuacion, resena, estado_moderacion, momento_creacion',
               'resenas PENDIENTE'),
             q('Cita', 'profesional_id', 'profesional evaluado'),
             q('Usuario', 'nombres, apellido_paterno', 'nombre del profesional')],
            'return (resenas pendientes)'),
    f'{API} ->> {API}: sanear_el_texto_de_cada_resena()',
    f'{API} --> V: return (HTTP 200 OK: resenas pendientes)',
    'V --> A: mostrar_las_resenas_pendientes()',
    '! Aprobar publica la resena y avisa al profesional (TESTIMONIO_PUBLICADO); aqui se dibuja el rechazo',
    'A -> V: rechazar_resena(evaluacion_id)',
    'V ->> V: exigir_la_causal_del_rechazo()',
    'V --> A: pedir_la_causal_del_rechazo()',
    'A -> V: indicar_la_causal(motivo)',
    f'V -> {API}: POST /evaluaciones/:id/moderar (RECHAZAR, motivo)',
    f'{API} ->> {API}: validar_decision_y_motivo()',
    *begin(),
    *leer('bloquear_evaluacion(evaluacion_id)', 'Evaluacion_Satisfaccion', 'evaluacion_satisfaccion_id, estado_moderacion',
          '1 resena PENDIENTE', 'return (resena bloqueada)'),
    *actualizar('aplicar_borrado_logico(RECHAZADA, motivo, moderador_id)', 'Evaluacion_Satisfaccion',
                'estado_moderacion, motivo_rechazo, moderador_id, momento_moderacion'),
    *insertar('registrar_decision(MODERACION_TESTIMONIO)', 'Bitacora_Auditoria'),
    *commit(),
    f'{API} --> V: return (HTTP 200 OK: resena rechazada)',
    'V --> A: quitar_la_resena_de_pendientes()',
  ],
  excepciones={
    1: dict(cortar='SELECT evaluacion_satisfaccion_id, puntuacion', lineas=[
        f'Evaluacion_Satisfaccion --> {SQL}: return (0 resenas PENDIENTE)',
        f'{SQL} --> {DAO}: return (resultado)',
        f'{DAO} --> {API}: return (bandeja vacia)',
        f'{API} --> V: return (HTTP 200 OK: sin resenas)',
        'V --> A: mostrar_el_conjunto_vacio()',
        'A -> V: volver_a_la_bandeja_cuando_lleguen_resenas()'],
        reanudar='GET /evaluaciones/moderacion'),
    2: dict(cortar='sanear_el_texto_de_cada_resena', lineas=[
        '! El texto trae caracteres de control o codificacion no estandar',
        f'{API} ->> {API}: quitar_caracteres_de_control_y_espacios_repetidos()'],
        reanudar='return (HTTP 200 OK: resenas pendientes)'),
    3: dict(cortar='exigir_la_causal_del_rechazo', lineas=[
        '! El administrador intenta rechazar sin causal',
        'V --> A: bloquear_el_envio_y_pedir_la_causal()'],
        reanudar='indicar_la_causal'),
    4: dict(cortar='UPDATE Evaluacion_Satisfaccion SET estado_moderacion', lineas=[
        *fallo_bd('Evaluacion_Satisfaccion'),
        *rollback(),
        f'{API} --> V: return (HTTP 500 NO_SE_GUARDO)',
        'V --> A: mantener_la_resena_pendiente_y_avisar()',
        'A -> V: reintentar_el_rechazo(motivo)'],
        reanudar='POST /evaluaciones/:id/moderar'),
  })

# ──────────────────────────── CU58 ────────────────────────────
# El CU cruza dos pantallas: donde se ve la calificacion (buscador del
# paciente, perfil del profesional) y la de Evaluaciones del Profesional.
LEER_RESENAS = [
    'A -> VE: tocar_las_estrellas_y_abrir_evaluaciones(profesional_id)',
    'VE ->> VE: mostrar_esqueleto_de_carga()',
    f'VE -> {API}: GET /profesionales/:id/resenas',
    *bloque('calcular_promedio_y_total(profesional_id)',
            [q('Evaluacion_Satisfaccion', 'puntuacion', 'notas del profesional'), q('Cita', 'profesional_id', 'citas evaluadas')],
            'return (promedio y total)'),
    *bloque('leer_resenas_aprobadas_con_autor(profesional_id)',
            [q('Evaluacion_Satisfaccion', 'resena, momento_creacion, estado_moderacion', 'resenas APROBADA'),
             q('Paciente', 'resena_anonima', 'preferencia de anonimato'),
             q('Usuario', 'nombres, apellido_paterno', 'nombre del autor')],
            'return (resenas aprobadas)'),
    f'{API} ->> {API}: sanear_y_armar_el_autor(Nombre A. o Anonimo)',
    f'{API} --> VE: return (HTTP 200 OK: promedio, total y resenas)',
    'VE --> A: mostrar_promedio_total_y_resenas_con_autor()',
]

CU58_PACIENTE = [
    'A -> VB: buscar_horas(especialidad, modalidad, fecha)',
    f'VB -> {API}: GET /citas/disponibilidad (especialidad, modalidad, fecha)',
    *bloque('buscar_bloques_con_calificacion(especialidad, modalidad, fecha)',
            [q('Profesional_Disponibilidad', 'dia_semana, hora_inicio, hora_fin, modalidad', 'jornadas del dia'),
             q('Profesional', 'profesional_id, calificacion_promedio, foto_url', 'profesionales de la especialidad'),
             q('Evaluacion_Satisfaccion', 'evaluacion_satisfaccion_id', 'cantidad de evaluaciones'),
             q('Cita', 'fecha_hora_inicio, estado', 'bloques ocupados')],
            'return (bloques libres con calificacion)'),
    f'{API} --> VB: return (HTTP 200 OK: bloques disponibles)',
    'VB --> A: mostrar_calificacion_en_las_tarjetas()',
    *LEER_RESENAS,
]

CU58_PROFESIONAL = [
    'A -> VB: abrir_mi_perfil_publico()',
    f'VB -> {API}: GET /profesionales/mi-perfil',
    *bloque('leer_mi_perfil_y_calificacion(usuario_id)',
            [q('Profesional', 'profesional_id, calificacion_promedio, foto_url', 'perfil del profesional'),
             q('Evaluacion_Satisfaccion', 'evaluacion_satisfaccion_id', 'cantidad de evaluaciones')],
            'return (perfil con calificacion)'),
    f'{API} --> VB: return (HTTP 200 OK: perfil publico)',
    'VB --> A: mostrar_calificacion_en_mi_perfil()',
    *LEER_RESENAS,
]

def exc_comunes(cortar_respuesta, reanudar_sin_evaluaciones):
    return {
      2: dict(cortar=cortar_respuesta, lineas=[
          '! El profesional no tiene evaluaciones: no se inventa un promedio (valor neutro cero)',
          'VB ->> VB: reemplazar_las_estrellas_por_perfil_nuevo()',
          'VB --> A: mostrar_perfil_nuevo_sin_evaluaciones_aun()',
          '! Con su primera evaluacion (CU55) aparecen las estrellas y el acceso a las resenas',
          'A -> VB: volver_a_consultar_mas_adelante()'],
          reanudar=reanudar_sin_evaluaciones),
      3: dict(cortar='mostrar_esqueleto_de_carga', lineas=[
          '! El actor sale de la pantalla antes de que carguen las resenas',
          'VE ->> VE: cancelar_la_carga()',
          'VE --> A: volver_a_la_pantalla_anterior()',
          'A -> VE: volver_a_abrir_las_evaluaciones(profesional_id)'],
          reanudar='mostrar_esqueleto_de_carga'),
      4: dict(cortar='GET /profesionales/:id/resenas', lineas=[
          '! El servidor tarda en responder',
          'VE ->> VE: mantener_el_esqueleto_de_carga_temporal()'],
          reanudar='calcular_promedio_y_total'),
    }

EXC_PACIENTE = {
    1: dict(cortar='SELECT dia_semana, hora_inicio, hora_fin, modalidad', lineas=[
        f'Profesional_Disponibilidad --> {SQL}: return (0 jornadas con los filtros)',
        f'{SQL} --> {DAO}: return (resultado)',
        f'{DAO} --> {API}: return (sin coincidencias)',
        f'{API} --> VB: return (HTTP 200 OK: sin bloques y el motivo)',
        'VB --> A: mostrar_sin_coincidencias_y_el_motivo()',
        'A -> VB: ampliar_los_filtros(especialidad, modalidad, fecha)'],
        reanudar='GET /citas/disponibilidad'),
    **exc_comunes('return (HTTP 200 OK: bloques disponibles)', 'GET /citas/disponibilidad'),
}

CU58 = dict(id='CU58', nombre='Calculando y visualizando calificación profesional', actores=['Paciente', 'Profesional'],
  vistas={'Paciente': {'VB': 'V_Agendamiento_Cita', 'VE': 'V_Evaluaciones_Profesional'},
          'Profesional': {'VB': 'V_Mi_Perfil_Publico', 'VE': 'V_Evaluaciones_Profesional'}},
  participantes=[ACTOR, P('VB', 'vista'), P('VE', 'vista'), *capa(),
                 *T('Profesional_Disponibilidad', 'Profesional', 'Evaluacion_Satisfaccion', 'Cita', 'Paciente', 'Usuario')],
  principal={'Paciente': CU58_PACIENTE, 'Profesional': CU58_PROFESIONAL},
  excepciones={'Paciente': EXC_PACIENTE, 'Profesional': exc_comunes('return (HTTP 200 OK: perfil publico)', 'GET /profesionales/mi-perfil')})

if __name__ == '__main__':
    salida = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    chrome = chrome_path()
    total = 0
    for cu in (CU55, CU56, CU58):
        verificar_participantes(cu)
        ruta, n = generar_cu(cu, os.path.join(salida, cu['id']), chrome, png='--sin-png' not in sys.argv)
        total += n
        print(f"{cu['id']}: {n} paginas -> {os.path.relpath(ruta, salida)}")
    print('total:', total)
