# Tanda 2 — Triaje inteligente y seguimiento: CU25, CU26, CU50, CU44, CU45.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from motor import generar_cu, chrome_path
from comun import *

# ──────────────────────────── CU26 ────────────────────────────
# El paciente cierra la entrevista: el motor clinico analiza el triaje una sola
# vez, guarda el reporte pre-clinico (que lee el profesional en el CU25) y
# resuelve la especialidad contra el cuerpo profesional y la comuna.
CU26 = dict(id='CU26', nombre='Sugiriendo derivación por especialidad clínica', actores=['Paciente'],
  vistas={'Paciente': 'V_Entrevista_Previa'},
  participantes=[ACTOR, VISTA, *capa(MCL),
                 *T('Triaje', 'Ficha_Clinica', 'Parametro_Global', 'Especialidad', 'Paciente', 'Profesional',
                    'Profesional_Comuna', 'Reporte_Preclinico')],
  principal=[
    'A -> V: finalizar_la_entrevista(respuestas)',
    f'V -> {API}: POST /clinica/triaje/completar (respuestas)',
    *begin(),
    *actualizar('cerrar_triaje(COMPLETADO, respuestas)', 'Triaje', 'respuestas, estado, momento_completado, integrado'),
    *actualizar('integrar_sintomas_a_la_anamnesis(CU24)', 'Ficha_Clinica', 'anamnesis, ultima_actualizacion'),
    f'{API} -> {MCL}: generar_reporte_preclinico(triaje_id, respuestas)',
    *leer_de(MCL, 'leer_parametro(MINIMO_RESPUESTAS_PRECLINICO)', 'Parametro_Global', 'clave, valor', '4 respuestas',
             'return (minimo de respuestas)'),
    f'{MCL} ->> {MCL}: analizar_triaje(banderas_rojas, etiquetas, motivo)',
    f'{MCL} ->> {MCL}: mapear_motivo_a_especialidad()',
    *bloque_de(MCL, 'resolver_especialidad_y_cobertura(motivo, paciente_id)',
               [q('Especialidad', 'especialidad_id, nombre', '1 especialidad coincidente'),
                q('Paciente', 'comuna_id', 'comuna del paciente'),
                q('Profesional', 'tipo_sede, especialidad_id', 'profesionales a domicilio y online'),
                q('Profesional_Comuna', 'profesional_id, comuna_id', 'cubren su comuna')],
               'return (especialidad con cobertura)'),
    *insertar_de(MCL, 'registrar_reporte(resumen, banderas, etiquetas, especialidad_sugerida_id)', 'Reporte_Preclinico'),
    f'{MCL} --> {API}: return (analisis y derivacion)',
    *commit(),
    f'{API} --> V: return (HTTP 200 OK: entrevista completada y derivacion)',
    'V --> A: mostrar_sugerencia_de_derivacion()',
  ],
  excepciones={
    1: dict(cortar='mapear_motivo_a_especialidad', lineas=[
        '! Ningun motivo calza con una especialidad registrada',
        f'{MCL} ->> {MCL}: marcar_derivacion_general()',
        '! La vista mostrara "Tu entrevista no apunta a una especialidad concreta" con el boton Contactarnos'],
        reanudar='registrar_reporte'),
    2: dict(cortar='SELECT tipo_sede, especialidad_id FROM Profesional', lineas=[
        f'Profesional --> {SQL}: return (0 profesionales en su comuna ni online)',
        f'{SQL} --> {DAO}: return (resultado)',
        f'{DAO} -> {SQL}: ejecutar_consulta(SELECT)',
        f'{SQL} -> Especialidad: SELECT especialidad_id, nombre FROM Especialidad (alternativas con profesionales)',
        f'Especialidad --> {SQL}: return (otras especialidades disponibles)',
        f'{SQL} --> {DAO}: return (resultado)',
        f'{DAO} --> {MCL}: return (especialidad sin cobertura, con alternativas)',
        '! La vista informa que no hay atencion en su comuna y ofrece teleconsulta o las alternativas'],
        reanudar='registrar_reporte'),
  })

# ──────────────────────────── CU25 ────────────────────────────
CU25 = dict(id='CU25', nombre='Sintetizando reporte de hallazgos pre-clínicos', actores=['Profesional'],
  vistas={'Profesional': 'V_Gestion_Agenda'},
  participantes=[ACTOR, VISTA, *capa(),
                 *T('Episodio_Clinico', 'Cita', 'Triaje', 'Reporte_Preclinico', 'Especialidad', 'Parametro_Global',
                    'Bitacora_Auditoria')],
  principal=[
    '! El reporte se genero cuando el paciente completo la entrevista (ver CU26)',
    'A -> V: abrir_reporte_preclinico(paciente_id)',
    f'V -> {API}: GET /clinica/pacientes/:id/reporte-preclinico',
    f'{API} ->> {API}: iniciar_medicion_de_latencia()',
    *bloque('verificar_vinculo_clinico(usuario_id, paciente_id)',
            [q('Episodio_Clinico', 'paciente_id, profesional_id', 'episodio con el profesional'),
             q('Cita', 'paciente_id, profesional_id', 'cita con el profesional')],
            'return (profesional tratante)'),
    *leer('leer_ultimo_triaje_completado(paciente_id)', 'Triaje', 'triaje_id, respuestas, momento_completado',
          '1 triaje COMPLETADO', 'return (triaje)'),
    *bloque('leer_reporte(triaje_id)',
            [q('Reporte_Preclinico', 'resumen, banderas, etiquetas, suficiente', '1 reporte suficiente'),
             q('Especialidad', 'nombre', 'especialidad sugerida')],
            'return (reporte con banderas rojas)'),
    *leer('leer_parametro(LATENCIA_MAXIMA_REPORTE_MS)', 'Parametro_Global', 'clave, valor', '2000 ms', 'return (tope de latencia)'),
    f'{API} ->> {API}: comparar_la_duracion_con_el_tope()',
    f'{API} --> V: return (HTTP 200 OK: reporte pre-clinico)',
    'V --> A: mostrar_reporte_preclinico()',
  ],
  excepciones={
    1: dict(cortar='SELECT resumen, banderas, etiquetas, suficiente', lineas=[
        f'Reporte_Preclinico --> {SQL}: return (reporte con suficiente = FALSE)',
        f'{SQL} --> {DAO}: return (resultado)',
        f'{DAO} --> {API}: return (reporte Informacion Insuficiente)',
        f'{API} --> V: return (HTTP 200 OK: reporte con la etiqueta Informacion Insuficiente)',
        '! Muy pocas respuestas en la entrevista: el profesional hara el triaje manual en la sesion'],
        reanudar='mostrar_reporte_preclinico'),
    2: dict(cortar='comparar_la_duracion_con_el_tope', lineas=[
        '! La carga supero los 2000 ms',
        *insertar('registrar_latencia(LATENCIA_REPORTE_PRECLINICO)', 'Bitacora_Auditoria')],
        reanudar='return (HTTP 200 OK: reporte pre-clinico)'),
  })

# ──────────────────────────── CU50 ────────────────────────────
# Dos roles con flujos distintos: el paciente reporta (y el motor clinico
# levanta la bandera roja), el profesional la revisa en su panel.
PARTES_CU50 = [ACTOR, VISTA, *capa(MCL, DESP, ADP, BREVO),
               *T('Reporte_Sintoma', 'Episodio_Clinico', 'Cita', 'Parametro_Global', 'Alerta_Clinica', 'Notificacion')]

CU50_PACIENTE = [
    'A -> V: marcar_dolor_y_limitacion(nivel_dolor, limitacion_funcional, comentario)',
    'V ->> V: generar_clave_de_envio()',
    f'V -> {API}: POST /clinica/sintomas (nivel_dolor, limitacion_funcional, comentario, clave_envio)',
    f'{API} ->> {API}: validar_escalas_de_0_a_10()',
    *leer('verificar_clave_de_envio(clave_envio)', 'Reporte_Sintoma', 'reporte_sintoma_id', '0 coincidencias', 'return (envio nuevo)'),
    *begin(),
    *leer('leer_reporte_anterior(paciente_id)', 'Reporte_Sintoma', 'nivel_dolor, limitacion_funcional, momento_registro',
          '1 reporte previo', 'return (reporte anterior)'),
    *leer('buscar_episodio_abierto(paciente_id)', 'Episodio_Clinico', 'episodio_clinico_id, estado', '1 episodio ABIERTO',
          'return (episodio abierto)'),
    *insertar('registrar_reporte(nivel_dolor, limitacion_funcional, clave_envio)', 'Reporte_Sintoma'),
    f'{API} -> {MCL}: evaluar_deterioro(reporte_actual, reporte_anterior)',
    *leer_de(MCL, 'leer_umbrales(UMBRAL_DOLOR_CRITICO, UMBRAL_ALZA_DOLOR)', 'Parametro_Global', 'clave, valor', '8 y 3 puntos',
             'return (umbrales vigentes)'),
    f'{MCL} ->> {MCL}: calcular_desviacion_y_etiquetar_riesgo_critico()',
    *insertar_de(MCL, 'persistir_alerta(DETERIORO_SINTOMAS, severidad, motivo)', 'Alerta_Clinica'),
    *bloque_de(MCL, 'buscar_profesionales_tratantes(paciente_id)',
               [q('Episodio_Clinico', 'profesional_id', 'tratantes por episodio'), q('Cita', 'profesional_id', 'tratantes por cita')],
               'return (profesionales tratantes)'),
    *despachar(MCL, 'ALERTA_DETERIORO', 'profesionales tratantes', correo='email, aviso de bandera roja',
               retorno='return (tratantes avisados)'),
    f'{MCL} --> {API}: return (alerta creada)',
    *commit(),
    f'{API} --> V: return (HTTP 201 Created: reporte registrado y profesional avisado)',
    'V --> A: mostrar_confirmacion_de_envio()',
]

CU50_PROFESIONAL = [
    'A -> V: abrir_panel_de_banderas_rojas()',
    f'V -> {API}: GET /clinica/alertas',
    *bloque('listar_alertas_abiertas_de_sus_pacientes(usuario_id)',
            [q('Alerta_Clinica', 'alerta_clinica_id, tipo, severidad, motivo, datos, estado', 'alertas ABIERTA'),
             q('Episodio_Clinico', 'paciente_id, profesional_id', 'pacientes por episodio'),
             q('Cita', 'paciente_id, profesional_id', 'pacientes por cita')],
            'return (alertas de sus pacientes)'),
    f'{API} --> V: return (HTTP 200 OK: banderas rojas)',
    'V --> A: mostrar_banderas_rojas_por_severidad()',
    'A -> V: marcar_alerta_revisada(alerta_clinica_id)',
    f'V -> {API}: POST /clinica/alertas/:id/revisar',
    *leer('leer_alerta(alerta_clinica_id)', 'Alerta_Clinica', 'alerta_clinica_id, paciente_id, estado', '1 alerta ABIERTA',
          'return (alerta)'),
    *bloque('verificar_vinculo_con_el_paciente(usuario_id, paciente_id)',
            [q('Episodio_Clinico', 'paciente_id, profesional_id', 'episodio con el profesional')],
            'return (profesional tratante)'),
    *actualizar('marcar_revisada(REVISADA, profesional_id)', 'Alerta_Clinica', 'estado, momento_revision, profesional_id'),
    f'{API} --> V: return (HTTP 200 OK: alerta revisada)',
    'V --> A: quitar_la_alerta_del_panel()',
]

CU50 = dict(id='CU50', nombre='Generando y notificando alerta por deterioro clínico', actores=['Paciente', 'Profesional'],
  vistas={'Paciente': 'V_Mi_Seguimiento', 'Profesional': 'V_Gestion_Profesional'},
  participantes=PARTES_CU50,
  principal={'Paciente': CU50_PACIENTE, 'Profesional': CU50_PROFESIONAL},
  excepciones={
    'Paciente': {
      1: dict(cortar='validar_escalas_de_0_a_10', lineas=[
          '! Falta el nivel de dolor o de limitacion',
          f'{API} --> V: return (HTTP 400 CAMPOS_INCOMPLETOS: campos faltantes)',
          'V --> A: resaltar_los_campos_faltantes()',
          'A -> V: completar_los_valores(nivel_dolor, limitacion_funcional)'],
          reanudar='POST /clinica/sintomas'),
      2: dict(cortar='calcular_desviacion_y_etiquetar', lineas=[
          '! La desviacion no supera los umbrales: la evolucion es normal y no se genera alerta',
          f'{MCL} --> {API}: return (evolucion normal, sin alerta)'],
          reanudar='confirmar_transaccion'),
      3: dict(cortar='return (cambios confirmados)', lineas=[
          f'{API} --> V: return (HTTP 201 Created: la app ya se habia cerrado)',
          '! El paciente cerro la app antes del acuse: el reporte ya quedo guardado',
          'V ->> V: reenviar_el_envio_pendiente_al_reabrir()',
          f'V -> {API}: POST /clinica/sintomas (misma clave_envio)',
          *leer('verificar_clave_de_envio(clave_envio)', 'Reporte_Sintoma', 'reporte_sintoma_id, momento_registro',
                '1 coincidencia', 'return (reporte ya registrado)'),
          f'{API} --> V: return (HTTP 200 OK: este reporte ya habia quedado registrado)'],
          reanudar='mostrar_confirmacion_de_envio'),
      4: dict(cortar='INSERT INTO Alerta_Clinica', lineas=[
          f'Alerta_Clinica --> {SQL}: error de escritura',
          f'{SQL} --> {DAO}: throw (SQLException)',
          f'{DAO} --> {MCL}: return (Fallo_Persistencia)',
          '! La alerta no se pudo escribir: el reporte del paciente no se pierde y el fallo queda anotado',
          f'{MCL} ->> {MCL}: anotar_el_fallo_de_la_alerta()',
          f'{MCL} --> {API}: return (alerta no guardada)'],
          reanudar='confirmar_transaccion'),
    },
    'Profesional': {},
  })

# ──────────────────────────── CU44 ────────────────────────────
CU44 = dict(id='CU44', nombre='Actualizando indicadores de adherencia y síntomas', actores=['Paciente'],
  vistas={'Paciente': 'V_Mis_Ejercicios'},
  participantes=[ACTOR, VISTA, *capa(MCL, DESP, ADP, BREVO),
                 *T('Pauta_Ejercicio', 'Pauta_Tratamiento', 'Pauta_Cumplimiento', 'Indicador_Adherencia', 'Parametro_Global',
                    'Alerta_Clinica', 'Notificacion')],
  principal=[
    'A -> V: marcar_ejercicio_cumplido(pauta_ejercicio_id)',
    f'V -> {API}: POST /clinica/pautas/ejercicios/:id/cumplimiento',
    *bloque('verificar_ejercicio_del_paciente(pauta_ejercicio_id)',
            [q('Pauta_Ejercicio', 'pauta_ejercicio_id, pauta_tratamiento_id', '1 ejercicio del paciente'),
             q('Pauta_Tratamiento', 'estado, fecha_inicio, fecha_expiracion', 'pauta del ejercicio')],
            'return (ejercicio y vigencia)'),
    f'{API} ->> {API}: verificar_vigencia_de_la_pauta()',
    *insertar('registrar_cumplimiento_de_hoy(pauta_ejercicio_id)', 'Pauta_Cumplimiento', ' (una marca por dia)'),
    f'{API} -> {MCL}: actualizar_indicador(paciente_id)',
    *bloque_de(MCL, 'contar_tareas_programadas_y_cumplidas(paciente_id)',
               [q('Pauta_Ejercicio', 'pauta_ejercicio_id, frecuencia', 'ejercicios de sus pautas'),
                q('Pauta_Tratamiento', 'fecha_inicio, fecha_expiracion', 'dias de vigencia transcurridos'),
                q('Pauta_Cumplimiento', 'fecha', 'marcas registradas')],
               'return (programadas y cumplidas)'),
    f'{MCL} ->> {MCL}: calcular_porcentaje_con_tope_de_100()',
    *insertar_de(MCL, 'guardar_medicion_del_dia(fecha, porcentaje)', 'Indicador_Adherencia', ' (una fila por paciente y dia)'),
    *leer_de(MCL, 'leer_umbrales(UMBRAL_ADHERENCIA_CRITICA, MINIMO_TAREAS_PARA_ALERTA_ADHERENCIA)', 'Parametro_Global',
             'clave, valor', '50% y 5 tareas', 'return (umbrales vigentes)'),
    f'{MCL} ->> {MCL}: comparar_con_el_umbral()',
    f'{MCL} --> {API}: return (porcentaje actualizado)',
    f'{API} --> V: return (HTTP 200 OK: ejercicio registrado y adherencia)',
    'V --> A: mostrar_ejercicio_registrado_y_adherencia()',
  ],
  excepciones={
    1: dict(cortar='verificar_vigencia_de_la_pauta', lineas=[
        '! La pauta ya expiro o aun no comienza: la marca no entra al calculo',
        f'{API} --> V: return (HTTP 409 PAUTA_EXPIRADA)',
        'V --> A: mostrar_pauta_cerrada()',
        'A -> V: elegir_un_ejercicio_vigente(pauta_ejercicio_id)'],
        reanudar='POST /clinica/pautas/ejercicios/:id/cumplimiento'),
    2: dict(cortar='SELECT pauta_ejercicio_id, frecuencia FROM Pauta_Ejercicio', lineas=[
        f'Pauta_Ejercicio --> {SQL}: error de lectura',
        f'{SQL} --> {DAO}: throw (SQLException)',
        f'{DAO} --> {MCL}: return (Fallo_Persistencia)',
        '! No se pudo leer las tareas programadas: se suspende el calculo',
        *leer_de(MCL, 'leer_ultimo_indicador(paciente_id)', 'Indicador_Adherencia', 'porcentaje, tareas_programadas, tareas_cumplidas',
                 'medicion previa', 'return (porcentaje previo)'),
        f'{MCL} --> {API}: return (porcentaje previo, calculo suspendido)'],
        reanudar='return (HTTP 200 OK: ejercicio registrado'),
    3: dict(cortar='return (porcentaje actualizado)', lineas=[
        f'{API} --> V: return (respuesta perdida por falta de senal)',
        '! El telefono pierde la senal: la actualizacion ya quedo en el servidor',
        'V --> A: mostrar_sin_conexion()',
        '! Al reintentar, la marca de hoy no se duplica (una por dia) y el indice se recalcula igual',
        'A -> V: reintentar_con_senal(pauta_ejercicio_id)'],
        reanudar='POST /clinica/pautas/ejercicios/:id/cumplimiento'),
    4: dict(cortar='comparar_con_el_umbral', lineas=[
        '! La adherencia cae bajo el 50% con al menos 5 tareas programadas',
        *leer_de(MCL, 'buscar_alerta_de_adherencia_abierta(paciente_id)', 'Alerta_Clinica', 'alerta_clinica_id, tipo, estado',
                 '0 alertas abiertas', 'return (sin alerta abierta)'),
        *insertar_de(MCL, 'crear_alerta(ADHERENCIA_BAJA)', 'Alerta_Clinica'),
        *despachar(MCL, 'ALERTA_DETERIORO', 'profesionales tratantes', correo='email, aviso de bandera roja',
                   retorno='return (profesional avisado)')],
        reanudar='return (porcentaje actualizado)'),
  })

# ──────────────────────────── CU45 ────────────────────────────
CU45 = dict(id='CU45', nombre='Visualizando progreso en dashboard gráfico', actores=['Paciente'],
  vistas={'Paciente': 'V_Mi_Progreso'},
  participantes=[ACTOR, VISTA, *capa(MCL),
                 *T('Pauta_Cumplimiento', 'Indicador_Adherencia', 'Reporte_Sintoma', 'Cita')],
  principal=[
    'A -> V: abrir_mi_progreso()',
    'V --> A: mostrar_atajos_30_y_90_dias_y_fechas()',
    'A -> V: elegir_rango(desde, hasta)',
    'V ->> V: validar_que_el_inicio_no_supere_al_fin()',
    f'V -> {API}: GET /clinica/mi-progreso?desde=&hasta=',
    f'{API} ->> {API}: validar_rango_de_fechas()',
    f'{API} -> {MCL}: actualizar_indicador(paciente_id) (CU44)',
    *bloque_de(MCL, 'recalcular_la_medicion_de_hoy(paciente_id)',
               [q('Pauta_Cumplimiento', 'fecha', 'marcas del periodo'), ins('Indicador_Adherencia', ' (medicion de hoy)')],
               'return (indice actualizado)'),
    f'{MCL} --> {API}: return (adherencia vigente)',
    *leer('leer_serie_de_adherencia(desde, hasta)', 'Indicador_Adherencia', 'fecha, porcentaje', 'serie diaria',
          'return (serie de adherencia)'),
    *leer('leer_curva_de_sintomas(desde, hasta)', 'Reporte_Sintoma', 'nivel_dolor, limitacion_funcional, momento_registro',
          'reportes del rango', 'return (curva de dolor y limitacion)'),
    *leer('contar_asistencia(desde, hasta)', 'Cita', 'estado, fecha_hora_inicio', 'realizadas, inasistencias, canceladas, proximas',
          'return (recuento de sesiones)'),
    f'{API} --> V: return (HTTP 200 OK: adherencia, sintomas y asistencia)',
    'V ->> V: dibujar_graficos_lineales()',
    'V --> A: mostrar_panel_de_progreso()',
  ],
  excepciones={
    1: dict(cortar='SELECT estado, fecha_hora_inicio FROM Cita', lineas=[
        f'Cita --> {SQL}: return (0 citas)',
        f'{SQL} --> {DAO}: return (resultado)',
        f'{DAO} --> {API}: return (sin historial)',
        f'{API} --> V: return (HTTP 200 OK: hay_historial = FALSE)',
        '! Sin sesiones ni reportes: el panel se muestra como vista introductoria, sin metricas, con el acceso a agendar'],
        reanudar='mostrar_panel_de_progreso'),
    2: dict(cortar='dibujar_graficos_lineales', lineas=[
        '! Falla el dibujo de un grafico en el dispositivo',
        'V ->> V: capturar_el_error_y_mostrar_los_valores_en_texto()'],
        reanudar='mostrar_panel_de_progreso'),
    3: dict(cortar='validar_que_el_inicio_no_supere_al_fin', lineas=[
        '! La fecha de inicio es posterior a la de fin (el servidor tambien la rechaza: RANGO_INVALIDO)',
        'V --> A: bloquear_la_seleccion_y_pedir_corregir()',
        'A -> V: corregir_el_rango(desde, hasta)'],
        reanudar='GET /clinica/mi-progreso'),
    4: dict(cortar='GET /clinica/mi-progreso', lineas=[
        '! El servidor tarda en calcular la serie',
        'V ->> V: mostrar_indicador_de_carga_circular()'],
        reanudar='validar_rango_de_fechas'),
  })

if __name__ == '__main__':
    salida = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    chrome = chrome_path()
    total = 0
    for cu in (CU25, CU26, CU50, CU44, CU45):
        verificar_participantes(cu)
        ruta, n = generar_cu(cu, os.path.join(salida, cu['id']), chrome, png='--sin-png' not in sys.argv)
        total += n
        print(f"{cu['id']}: {n} paginas -> {os.path.relpath(ruta, salida)}")
    print('total:', total)
