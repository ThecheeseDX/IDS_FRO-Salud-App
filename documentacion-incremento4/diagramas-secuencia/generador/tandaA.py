# Tanda A — Alta del tratamiento, refuerzos, eventos criticos y pautas:
# CU37, CU51, CU54, CU62, CU47 y CU78 (solo el flujo nuevo: cierre del episodio).
# Mismo formato y mismas reglas de notacion del Incremento 3.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from motor import generar_cu, chrome_path
from comun import *

# ── Tramos compartidos ─────────────────────────────────────────────────────

def resumen_cierre():
    """altaService.resumenCierre: lo que el informe de alta (CU37) y el cierre
    simple (CU78) necesitan saber del episodio antes de cerrarlo."""
    return [
      f'{API} -> {ALTA}: resumir_cierre(episodio_id)',
      *bloque_de(ALTA, 'leer_episodio_metas_y_umbral(episodio_id)',
                 [q('Episodio_Clinico', 'estado, motivo_consulta, fecha_inicio, paciente_id', '1 episodio'),
                  q('Usuario', 'nombres, apellido_paterno, rut', 'paciente y profesional'),
                  q('Objetivo_Terapeutico', 'descripcion, meta_valor, valor_actual, unidad', 'metas del episodio'),
                  q('Parametro_Global', 'clave, valor', 'UMBRAL_EGRESO_CLINICO = 80')],
                 'return (episodio, metas y umbral)'),
      *bloque_de(ALTA, 'leer_evoluciones_y_citas_futuras(episodio_id)',
                 [q('Evolucion_Clinica', 'inalterable, hora_firma_digital, respuesta_fisiologica', 'evoluciones firmadas'),
                  q('Cita', 'cita_id, fecha_hora_inicio, estado', '0 citas futuras')],
                 'return (sesiones y citas pendientes)'),
      f'{ALTA} ->> {ALTA}: comparar_cumplimiento_con_el_umbral()',
      f'{ALTA} --> {API}: return (resumen del episodio)',
    ]

CERRAR_DERIVACIONES = [
    f'{API} -> {ACC}: cerrar_derivaciones_del_episodio(episodio_id)',
    *actualizar_de(ACC, 'cerrar_derivaciones(PENDIENTE o ACEPTADA)', 'Derivacion_Interna', 'estado, momento_cierre'),
    f'{ACC} --> {API}: return (derivaciones cerradas)',
]

PEDIR_EVALUACION = [
    *leer('leer_paciente_y_profesional(episodio_id)', 'Episodio_Clinico', 'paciente_id, profesional_id, motivo_consulta',
          '1 episodio', 'return (paciente y profesional)'),
    *despachar(API, 'EVALUAR_TRATAMIENTO', 'paciente', retorno='return (calificacion pedida)'),
]

# ──────────────────────────── CU37 ────────────────────────────
# El profesional llega desde la pestaña Episodios de la Ficha Clinica
# (EpisodioScreen -> InformeAltaScreen). El servidor vuelve a consolidar el
# episodio al emitir: las validaciones pueden haber cambiado entre medio.
CU37 = dict(id='CU37', nombre='Emitiendo informe de alta y cierre de episodio', actores=['Profesional'],
  vistas={'Profesional': 'V_Informe_Alta'},
  participantes=[ACTOR, VISTA, *capa(ALTA, ACC, DESP, ADP, CLOUD),
                 *T('Episodio_Clinico', 'Usuario', 'Profesional', 'Objetivo_Terapeutico', 'Parametro_Global',
                    'Evolucion_Clinica', 'Cita', 'Documento_Clinico', 'Derivacion_Interna', 'Paciente',
                    'Notificacion', 'Bitacora_Auditoria')],
  principal=[
    'A -> V: abrir_informe_de_alta_y_cierre(episodio_id)',
    f'V -> {API}: GET /clinica/episodio/:id/informe-alta',
    *resumen_cierre(),
    *bloque('verificar_profesional_a_cargo(episodio_id)',
            [q('Episodio_Clinico', 'episodio_clinico_id, profesional_id', '1 episodio'),
             q('Profesional', 'usuario_id', 'profesional a cargo')],
            'return (profesional a cargo)'),
    f'{API} -> {ALTA}: detectar_impedimento_de_cierre(resumen)',
    f'{ALTA} --> {API}: return (sin impedimentos)',
    f'{API} --> V: return (HTTP 200 OK: metas, evoluciones, citas y limite 1000)',
    'V --> A: mostrar_resumen_y_campo_de_pautas()',
    'A -> V: redactar_pautas_de_continuidad(pautas)',
    'V ->> V: actualizar_contador(caracteres de 1000)',
    'V --> A: mostrar_contador_de_caracteres()',
    'A -> V: emitir_informe_de_alta_y_cierre()',
    'V ->> V: pedir_confirmacion_de_la_emision()',
    'V --> A: mostrar_dialogo_de_confirmacion()',
    'A -> V: confirmar_emision()',
    f'V -> {API}: POST /clinica/episodio/:id/informe-alta (pautas_continuidad)',
    '! El servidor vuelve a consolidar el episodio: mismas lecturas del resumen',
    f'{API} -> {ALTA}: resumir_cierre(episodio_id)',
    f'{ALTA} ->> {ALTA}: releer_episodio_metas_evoluciones_y_citas()',
    f'{ALTA} --> {API}: return (resumen actualizado)',
    *bloque('verificar_profesional_a_cargo(episodio_id)',
            [q('Episodio_Clinico', 'episodio_clinico_id, profesional_id', '1 episodio'),
             q('Profesional', 'usuario_id', 'profesional a cargo')],
            'return (profesional a cargo)'),
    f'{API} -> {ALTA}: detectar_impedimento_de_cierre(resumen)',
    f'{ALTA} --> {API}: return (sin impedimentos)',
    f'{API} ->> {API}: verificar_umbral_alcanzado(80 %)',
    f'{API} ->> {API}: verificar_repositorio_configurado()',
    *leer('leer_emisor(usuario_id)', 'Usuario', 'nombres, apellido_paterno', 'emisor', 'return (emisor del informe)'),
    f'{API} -> {ALTA}: generar_pdf_informe_alta(resumen, pautas, emisor)',
    f'{ALTA} ->> {ALTA}: componer_metas_evolucion_y_pautas()',
    f'{ALTA} --> {API}: return (PDF del informe)',
    *externo('subir_informe(pdf, raw)', CLOUD, 'POST /raw/upload (fro-salud/paciente-id)',
             'return (secure_url, public_id)', 'return (url del informe)'),
    *begin(),
    *insertar('guardar_documento(INFORME_ALTA, pdf)', 'Documento_Clinico',
              ' (nombre_original, categoria, url_publica, episodio_clinico_id)'),
    *actualizar('cerrar_episodio(CERRADO, pautas, informe)', 'Episodio_Clinico',
                'estado, fecha_terminado, pautas_continuidad, informe_alta_documento_id'),
    *CERRAR_DERIVACIONES,
    *insertar('registrar_emision(INFORME_ALTA_EMITIDO)', 'Bitacora_Auditoria'),
    *leer('leer_usuario_del_paciente(paciente_id)', 'Paciente', 'usuario_id', '1 paciente', 'return (usuario del paciente)'),
    *despachar(API, 'ALTA_EMITIDA', 'paciente', retorno='return (aviso del informe registrado)'),
    *commit(),
    '! Con el episodio ya cerrado se le pide al paciente calificar su tratamiento (CU55)',
    *PEDIR_EVALUACION,
    f'{API} --> V: return (HTTP 201 Created: informe emitido y episodio cerrado)',
    'V --> A: mostrar_informe_emitido_y_volver_a_la_ficha()',
  ],
  excepciones={
    1: dict(cortar='detectar_impedimento_de_cierre', lineas=[
        f'{ALTA} --> {API}: return (EPISODIO_CERRADO)',
        f'{API} --> V: return (HTTP 200 OK: episodio cerrado y fecha de cierre)',
        'V ->> V: desactivar_pautas_y_botones_de_emision()',
        'V --> A: mostrar_episodio_cerrado_el(fecha_terminado)',
        '! El profesional vuelve a la pestaña Episodios y elige un episodio activo',
        'A -> V: abrir_informe_de_un_episodio_activo(episodio_id)'],
        reanudar='GET /clinica/episodio/:id/informe-alta'),
    2: dict(cortar='detectar_impedimento_de_cierre', lineas=[
        f'{ALTA} --> {API}: return (EVOLUCIONES_PENDIENTES o CITAS_FUTURAS)',
        f'{API} --> V: return (HTTP 200 OK: resumen con cada pendiente)',
        '! También bloquea la emisión un cumplimiento de metas bajo el umbral del 80 %',
        'V ->> V: bloquear_la_emision_y_listar_pendientes()',
        'V --> A: mostrar_cada_pendiente_y_cerrar_sin_informe()',
        '! Si el tratamiento termina sin alcanzar el umbral, usa "Cerrar sin informe de alta" (CU78)',
        'A ->> A: firmar_evoluciones_cancelar_citas_o_actualizar_metas()',
        'A -> V: volver_a_abrir_el_informe(episodio_id)'],
        reanudar='GET /clinica/episodio/:id/informe-alta'),
    3: dict(cortar='redactar_pautas_de_continuidad', lineas=[
        '! El profesional intenta escribir más de 1000 caracteres',
        'V ->> V: no_admitir_mas_texto(maxLength 1000)',
        'V --> A: mostrar_contador_en_alerta(1000 de 1000)',
        'A -> V: ajustar_la_redaccion(pautas)'],
        reanudar='actualizar_contador'),
    4: dict(cortar='POST /raw/upload', lineas=[
        f'{CLOUD} --> {ADP}: return (servicio no disponible)',
        f'{ADP} --> {API}: return (carga interrumpida)',
        '! Igual si falla la transacción de cierre: ROLLBACK y HTTP 500 NO_SE_PUDO_EMITIR',
        f'{API} --> V: return (HTTP 502 CARGA_INTERRUMPIDA: episodio sigue abierto)',
        'V --> A: informar_que_el_informe_no_pudo_guardarse()',
        'A -> V: reintentar_la_emision()'],
        reanudar='POST /clinica/episodio/:id/informe-alta'),
  })

# ──────────────────────────── CU51 ────────────────────────────
# Disparo dibujado: el paciente abre la pestaña "Prevencion y alta" de Mi
# Tratamiento (GET /clinica/mi-alta). El mismo calculo corre cuando el
# profesional registra el avance de una meta (CU32, PUT /episodio/:id/avance).
CU51 = dict(id='CU51', nombre='Habilitando Automáticamente Contenidos de Preparación para el Alta', actores=['Paciente'],
  vistas={'Paciente': 'V_Prevencion_Alta'},
  participantes=[ACTOR, VISTA, *capa(ALTA, DESP),
                 *T('Paciente', 'Episodio_Clinico', 'Especialidad', 'Documento_Clinico', 'Objetivo_Terapeutico',
                    'Parametro_Global', 'Material_Terapeutico', 'Notificacion', 'Bitacora_Auditoria')],
  principal=[
    'A -> V: abrir_prevencion_y_alta()',
    f'V -> {API}: GET /clinica/mi-alta',
    *leer('leer_paciente(usuario_id)', 'Paciente', 'paciente_id', '1 paciente', 'return (paciente_id)'),
    *bloque('leer_episodio_mas_reciente(paciente_id)',
            [q('Episodio_Clinico', 'episodio_clinico_id, estado, preparacion_alta_en', '1 episodio ABIERTO'),
             q('Especialidad', 'nombre', 'especialidad del profesional'),
             q('Documento_Clinico', 'nombre_original, fecha_carga', 'sin informe de alta')],
            'return (episodio y especialidad)'),
    f'{API} -> {ALTA}: evaluar_preparacion_alta(episodio_id)',
    *bloque_de(ALTA, 'leer_episodio_y_paciente(episodio_id)',
               [q('Episodio_Clinico', 'estado, preparacion_alta_en', 'sin preparacion marcada'),
                q('Paciente', 'usuario_id', 'usuario del paciente')],
               'return (episodio abierto sin preparacion)'),
    *leer_de(ALTA, 'leer_metas_y_promedio(episodio_id)', 'Objetivo_Terapeutico',
             'descripcion, meta_valor, valor_actual, unidad', 'metas medibles', 'return (metas y promedio de avance)'),
    *leer_de(ALTA, 'leer_parametro(UMBRAL_EGRESO_CLINICO)', 'Parametro_Global', 'clave, valor', '80',
             'return (umbral de egreso)'),
    f'{ALTA} ->> {ALTA}: revisar_metas_contradictorias()',
    f'{ALTA} ->> {ALTA}: detectar_cruce_del_umbral(promedio >= 80 %)',
    *actualizar_de(ALTA, 'marcar_preparacion_alta(una sola vez)', 'Episodio_Clinico', 'preparacion_alta_en'),
    *insertar_de(ALTA, 'registrar(PREPARACION_ALTA_HABILITADA)', 'Bitacora_Auditoria'),
    *despachar(ALTA, 'PREPARACION_ALTA', 'paciente'),
    f'{ALTA} --> {API}: return (habilitada y recien habilitada)',
    f'{API} -> {ALTA}: listar_recursos_de_prevencion(especialidad)',
    *leer_de(ALTA, 'leer_recursos(PREVENCION, especialidad)', 'Material_Terapeutico',
             'nombre, tipo, url_archivo, imagen_url, categoria', 'recursos disponibles', 'return (recursos de prevencion)'),
    f'{ALTA} --> {API}: return (recursos de la especialidad)',
    f'{API} --> V: return (HTTP 200 OK: avance, metas y recursos)',
    'V ->> V: abrir_dialogo_alcanzaste_el_umbral()',
    'V --> A: mostrar_avance_y_dialogo_del_umbral()',
    '! El aviso PREPARACION_ALTA también quedó en la campana y llegó al teléfono',
    'A -> V: tocar_el_aviso_o_cerrar_el_dialogo()',
    'V ->> V: navegar_a_la_seccion(PreparacionAlta)',
    'V ->> V: cargar_imagen_de_cada_recurso(imagen_url)',
    'V --> A: mostrar_avance_y_recursos_de_prevencion()',
    'A -> V: tocar_un_recurso(material_terapeutico_id)',
    'V ->> V: abrir_el_recurso(url_archivo)',
    'V --> A: mostrar_el_recurso()',
  ],
  excepciones={
    1: dict(cortar='detectar_cruce_del_umbral', lineas=[
        '! Sin metas medibles o con el promedio bajo el 80 %: no se habilita nada',
        f'{ALTA} --> {API}: return (no habilitada: porcentaje y umbral)',
        f'{API} --> V: return (HTTP 200 OK: avance sin recursos)',
        'V --> A: mostrar_avance_y_puntos_que_faltan()',
        'A ->> A: continuar_el_tratamiento()',
        'A -> V: volver_a_abrir_prevencion_y_alta()'],
        reanudar='GET /clinica/mi-alta'),
    2: dict(cortar='revisar_metas_contradictorias', lineas=[
        '! Una meta sin valor objetivo, sin unidad o con un avance mayor que la meta',
        f'{ALTA} --> {API}: return (contradicciones: no habilitada)',
        '! Sin bitácora aquí: el aborto se anota solo si lo dispara un avance del profesional',
        f'{API} --> V: return (HTTP 200 OK: avance y metas por revisar)',
        'V --> A: mostrar_que_el_profesional_debe_revisar_las_metas()',
        'A -> V: volver_a_abrir_tras_la_revision()'],
        reanudar='GET /clinica/mi-alta'),
    3: dict(cortar='tocar_el_aviso_o_cerrar_el_dialogo', lineas=[
        '! El destino del aviso no existe para el rol del paciente',
        'V ->> V: ignorar_el_salto()',
        'V --> A: mantener_la_pantalla_actual()',
        'A -> V: entrar_desde_mi_tratamiento(Prevencion y alta)',
        '! Al entrar, la sección vuelve a consultar al servidor: se repite el flujo principal'],
        reanudar='GET /clinica/mi-alta'),
    4: dict(cortar='cargar_imagen_de_cada_recurso', lineas=[
        '! La imagen de un recurso no carga desde el repositorio',
        'V ->> V: reemplazar_por_icono_segun_tipo(tipo)',
        'V --> A: mostrar_recursos_con_icono_en_lugar_de_imagen()',
        'A -> V: recargar_la_seccion(deslizar hacia abajo)',
        '! Al recargar, la sección vuelve a consultar al servidor: se repite el flujo principal'],
        reanudar='GET /clinica/mi-alta'),
  })

# ──────────────────────────── CU54 ────────────────────────────
# El refuerzo sale por el despachador hacia el centro de notificaciones y
# como push (sin correo). Se dibuja el despacho con push porque la
# Excepcion 3 ocurre en ese canal; la lectura de preferencias de canal y la
# bitacora del despacho son las del CU52.
def despacho_con_push(origen, tipo, destinatario):
    return [
      f'{origen} -> {DESP}: despachar({tipo}, {destinatario})',
      *insertar_de(DESP, 'guardar_en_centro_de_notificaciones(titulo, contenido, datos)', 'Notificacion',
                   ' (canal = APP)', 'return (aviso guardado en la app)'),
      *leer_de(DESP, 'leer_tokens_activos(usuario_id)', 'Dispositivo_Push', 'token, activo', 'tokens activos',
               'return (tokens push del paciente)'),
      *externo_de(DESP, 'enviar_push(tokens, titulo, contenido, datos)', EXPO, 'POST /--/api/v2/push/send',
                  'return (tickets de entrega)', 'return (push enviado)'),
      f'{DESP} --> {origen}: return (aviso despachado por APP y PUSH)',
    ]

CU54 = dict(id='CU54', nombre='Enviando Mensajes de Refuerzo Positivo', actores=['Paciente'],
  vistas={'Paciente': 'V_Mis_Ejercicios'},
  participantes=[ACTOR, VISTA, *capa(MCL, REF, DESP, ADP, EXPO),
                 *T('Pauta_Ejercicio', 'Pauta_Tratamiento', 'Episodio_Clinico', 'Pauta_Cumplimiento',
                    'Indicador_Adherencia', 'Preferencia_Notificacion', 'Notificacion',
                    'Dispositivo_Push', 'Bitacora_Auditoria')],
  principal=[
    'A -> V: marcar_ejercicio_realizado(pauta_ejercicio_id)',
    'V ->> V: verificar_que_corresponde_hoy(dias_semana)',
    f'V -> {API}: POST /clinica/pautas/ejercicios/:id/cumplimiento',
    *bloque('leer_ejercicio_del_paciente(pauta_ejercicio_id)',
            [q('Pauta_Ejercicio', 'pauta_ejercicio_id, dias_semana', '1 ejercicio'),
             q('Pauta_Tratamiento', 'estado, fecha_inicio, fecha_expiracion', 'pauta VIGENTE'),
             q('Episodio_Clinico', 'paciente_id', 'episodio del paciente')],
            'return (ejercicio propio y vigente)'),
    f'{API} ->> {API}: verificar_vigencia_y_dia_de_hoy()',
    *insertar('registrar_cumplimiento_de_hoy()', 'Pauta_Cumplimiento', ' (pauta_ejercicio_id, fecha)',
              retorno='return (1 registro nuevo)'),
    f'{API} -> {MCL}: leer_ultimo_indice(paciente_id)',
    *leer_de(MCL, 'leer_indice_anterior(paciente_id)', 'Indicador_Adherencia', 'porcentaje, fecha', 'ultimo indice',
             'return (indice anterior)'),
    f'{MCL} --> {API}: return (indice anterior)',
    f'{API} -> {MCL}: actualizar_indice(paciente_id)',
    *bloque_de(MCL, 'contar_tareas_programadas_y_cumplidas(paciente_id)',
               [q('Pauta_Ejercicio', 'frecuencia, dias_semana', 'ejercicios del paciente'),
                q('Pauta_Cumplimiento', 'fecha', 'marcas en la vigencia')],
               'return (tareas programadas y cumplidas)'),
    f'{MCL} ->> {MCL}: calcular_indice_de_adherencia()',
    *insertar_de(MCL, 'guardar_indice_de_hoy(porcentaje)', 'Indicador_Adherencia',
                 ' (fecha, porcentaje, tareas_programadas, tareas_cumplidas)'),
    f'{MCL} --> {API}: return (indice actual)',
    f'{API} -> {REF}: evaluar_refuerzo(anterior, actual)',
    f'{REF} ->> {REF}: comparar_con_el_indice_anterior()',
    *leer_de(REF, 'leer_preferencia_de_refuerzos(usuario_id)', 'Preferencia_Notificacion', 'refuerzos',
             'refuerzos = TRUE', 'return (refuerzos activados)'),
    *leer_de(REF, 'buscar_refuerzo_de_hoy(usuario_id)', 'Notificacion', 'tipo, momento_envio', '0 refuerzos hoy',
             'return (sin refuerzo hoy)'),
    f'{REF} ->> {REF}: armar_texto_segun_hito(25, 50, 75 o 100 %)',
    *despacho_con_push(REF, 'REFUERZO_POSITIVO', 'paciente'),
    *insertar_de(REF, 'registrar(REFUERZO_POSITIVO_ENVIADO)', 'Bitacora_Auditoria'),
    f'{REF} --> {API}: return (mensaje de refuerzo)',
    f'{API} --> V: return (HTTP 200 OK: registrado, adherencia y refuerzo)',
    'V ->> V: abrir_dialogo_sigue_asi(refuerzo)',
    'V --> A: mostrar_mensaje_de_animo()',
    '! El aviso queda en la campana y llega como push; al tocarlo se abre Mi Progreso',
    'A -> V: tocar_el_aviso(notificacion_id)',
    f'V -> {API}: POST /notificaciones/:id/leer',
    *actualizar('marcar_como_leido(notificacion_id)', 'Notificacion', 'leida'),
    *leer('leer_tipo_del_aviso(notificacion_id)', 'Notificacion', 'tipo', 'REFUERZO_POSITIVO', 'return (aviso de refuerzo)'),
    *insertar('registrar_lectura(REFUERZO_POSITIVO_LEIDO)', 'Bitacora_Auditoria'),
    f'{API} --> V: return (HTTP 200 OK: aviso leido)',
    'V ->> V: navegar_a_mi_progreso(datos.pantalla)',
    'V --> A: mostrar_mi_progreso()',
  ],
  excepciones={
    1: dict(cortar='INSERT INTO Pauta_Cumplimiento', lineas=[
        f'Pauta_Cumplimiento --> {SQL}: return (ya existe la marca de hoy)',
        f'{SQL} --> {DAO}: return (Filas afectadas = 0)',
        f'{DAO} --> {API}: return (ya estaba registrado)',
        '! Un solo registro por ejercicio y día: el índice se recalcula igual, pero no hay refuerzo',
        f'{API} --> V: return (HTTP 200 OK: ya estaba registrado hoy)',
        'V --> A: mostrar_ya_estaba_registrado_hoy()',
        'A ->> A: continuar_con_otro_ejercicio()'],
        reanudar='marcar_ejercicio_realizado'),
    2: dict(cortar='SELECT refuerzos FROM Preferencia_Notificacion', lineas=[
        f'Preferencia_Notificacion --> {SQL}: return (refuerzos = FALSE)',
        f'{SQL} --> {DAO}: return (resultado)',
        f'{DAO} --> {REF}: return (refuerzos desactivados)',
        '! Igual si el índice no subió: la rutina termina sin mensaje',
        f'{REF} --> {API}: return (sin refuerzo: PREFERENCIA)',
        f'{API} --> V: return (HTTP 200 OK: registrado sin refuerzo)',
        'V --> A: mostrar_ejercicio_registrado()',
        'A ->> A: seguir_registrando_sus_ejercicios()'],
        reanudar='marcar_ejercicio_realizado'),
    3: dict(cortar='POST /--/api/v2/push/send', lineas=[
        f'{EXPO} --> {ADP}: return (sin entrega: bloqueado o sin push)',
        f'{ADP} --> {DESP}: return (push no entregado)',
        '! El aviso sigue en el centro de notificaciones de la app',
        f'{DESP} ->> {DESP}: anotar_el_canal_fallido()'],
        reanudar='return (aviso despachado'),
    4: dict(cortar='SELECT tipo, momento_envio FROM Notificacion', lineas=[
        f'Notificacion --> {SQL}: return (1 refuerzo hoy)',
        f'{SQL} --> {DAO}: return (resultado)',
        f'{DAO} --> {REF}: return (ya hubo refuerzo hoy)',
        f'{REF} --> {API}: return (sin refuerzo: YA_ENVIADO_HOY)',
        f'{API} --> V: return (HTTP 200 OK: registrado sin refuerzo)',
        '! El diálogo solo aparece con el primer avance del día; ese aviso sigue en la campana',
        'V --> A: mostrar_ejercicio_registrado_sin_dialogo()'],
        reanudar='tocar_el_aviso'),
  })

# ──────────────────────────── CU62 ────────────────────────────
# Dos roles: el Paciente dispara el escalamiento con el comentario de su
# reporte de sintomas (CU50; tambien lo disparan reseñas y tickets), y el
# Administrador (D1: cumple el papel de supervisor) lo revisa y acusa recibo.
# Cada excepcion tiene su pagina para ambos actores (regla de Pablo): la del
# Paciente muestra lo que ocurre en el envio de su reporte y la del
# Administrador lo que ocurre en la bandeja.
CU62_PACIENTE = [
    'A -> V: enviar_reporte_de_sintomas(dolor, limitacion, comentario)',
    f'V -> {API}: POST /clinica/sintomas (dolor, limitacion, comentario, clave)',
    *leer('leer_paciente(usuario_id)', 'Paciente', 'paciente_id', '1 paciente', 'return (paciente_id)'),
    *leer('verificar_clave_de_envio(clave_envio)', 'Reporte_Sintoma', 'reporte_sintoma_id, clave_envio',
          'sin envio previo', 'return (envio nuevo)'),
    *begin(),
    *bloque('leer_reporte_anterior_y_episodio_abierto(paciente_id)',
            [q('Reporte_Sintoma', 'nivel_dolor, limitacion_funcional, momento_registro', 'reporte anterior'),
             q('Episodio_Clinico', 'episodio_clinico_id, estado', 'episodio ABIERTO')],
            'return (reporte anterior y episodio)'),
    *insertar('registrar_reporte(comentario)', 'Reporte_Sintoma',
              ' (nivel_dolor, limitacion_funcional, comentario)'),
    '! La evaluación de deterioro y la bandera roja al profesional se dibujan en el CU50',
    f'{API} ->> {API}: evaluar_deterioro_del_reporte()',
    *commit(),
    '! El comentario queda guardado igual: el escalamiento corre aparte y no frena la respuesta',
    f'{API} -> {ESC}: escalar(comentario, SINTOMAS, reporte_sintoma_id)',
    f'{ESC} -> {FILT}: detectar_criticos(comentario)',
    *leer_de(FILT, 'leer_diccionario_activo() (cache de 60 s)', 'Palabra_Restringida', 'termino, categoria, activa',
             'terminos activos', 'return (diccionario)'),
    f'{FILT} ->> {FILT}: normalizar_y_comparar_por_palabra_completa()',
    f'{FILT} --> {ESC}: return (terminos CRITICO detectados)',
    f'{ESC} ->> {ESC}: armar_extracto_del_texto()',
    *insertar_de(ESC, 'registrar_evento(origen, terminos, extracto, paciente)', 'Evento_Critico',
                 ' (origen, terminos, extracto, paciente_id)'),
    *insertar_de(ESC, 'registrar(EVENTO_CRITICO_ESCALADO)', 'Bitacora_Auditoria'),
    *bloque_de(ESC, 'buscar_administradores_con_sesion_activa()',
               [q('Usuario', 'usuario_id, cuenta_activo', 'administradores activos'),
                q('Rol', 'nombre_rol', 'rol Administrador'),
                q('Sesion_Usuario', 'usuario_id, activa', 'sesiones activas')],
               'return (administradores con sesion)'),
    *despachar(ESC, 'EVENTO_CRITICO', 'cada administrador con sesion', retorno='return (administradores avisados)'),
    f'{ESC} --> {API}: return (evento critico escalado)',
    f'{API} --> V: return (HTTP 201 Created: reporte registrado)',
    'V --> A: confirmar_reporte_registrado()',
]

CU62_ADMINISTRADOR = [
    '! Llega el aviso EVENTO_CRITICO; el Panel de administración destaca el contador de pendientes',
    'A -> V: abrir_eventos_criticos()',
    f'V -> {API}: GET /gestion/eventos-criticos?estado=PENDIENTE',
    *bloque('listar_eventos(PENDIENTE)',
            [q('Evento_Critico', 'evento_critico_id, origen, terminos, extracto, estado', 'eventos PENDIENTE'),
             q('Usuario', 'nombres, apellido_paterno', 'autor y paciente'),
             q('Rol', 'nombre_rol', 'rol del autor')],
            'return (eventos pendientes)'),
    *leer('contar_pendientes()', 'Evento_Critico', 'estado', 'eventos PENDIENTE', 'return (contador de pendientes)'),
    f'{API} --> V: return (HTTP 200 OK: eventos y contador)',
    'V ->> V: programar_actualizacion_cada_15_s()',
    'V --> A: mostrar_origen_terminos_extracto_autor_y_paciente()',
    'A -> V: acusar_recibo(evento_critico_id)',
    f'V -> {API}: POST /gestion/eventos-criticos/:id/acuse',
    *actualizar('marcar_acusado(ACUSADO, administrador, momento)', 'Evento_Critico', 'estado, acusado_por, momento_acuse',
                retorno='return (1 fila afectada)'),
    *insertar('registrar_acuse(EVENTO_CRITICO_ACUSADO)', 'Bitacora_Auditoria'),
    f'{API} --> V: return (HTTP 200 OK: acuse registrado)',
    f'V -> {API}: GET /gestion/eventos-criticos (recarga silenciosa)',
    *leer('listar_eventos_restantes(PENDIENTE)', 'Evento_Critico', 'evento_critico_id, estado, momento_acuse',
          'eventos restantes', 'return (bandeja al dia)'),
    f'{API} --> V: return (HTTP 200 OK: bandeja actualizada)',
    'V --> A: mostrar_el_evento_fuera_de_pendientes()',
]

CU62_EXC_PACIENTE = {
    1: dict(cortar='SELECT usuario_id, activa FROM Sesion_Usuario', lineas=[
        f'Sesion_Usuario --> {SQL}: return (0 sesiones activas)',
        f'{SQL} --> {DAO}: return (resultado)',
        f'{DAO} --> {ESC}: return (ningun administrador con sesion)',
        *bloque_de(ESC, 'buscar_todos_los_administradores_activos()',
                   [q('Usuario', 'usuario_id, cuenta_activo', 'administradores activos'),
                    q('Rol', 'nombre_rol', 'rol Administrador')],
                   'return (todos los administradores)'),
        '! Sin nadie conectado: aviso en la app y por correo; se revisa al ingresar',
        *despachar(ESC, 'EVENTO_CRITICO', 'todos los administradores', correo='email, asunto evento critico',
                   retorno='return (administradores avisados por correo)')],
        reanudar='return (evento critico escalado)'),
    # Exc. 2, 3 y 4 ocurren en la bandeja del Administrador; del lado del
    # Paciente se dibuja su equivalente en el envio del reporte que origina el
    # evento (MiSeguimientoScreen guarda el reporte en el telefono con una
    # clave propia y lo reenvia solo al volver; la clave evita duplicarlo).
    2: dict(cortar='enviar_reporte_de_sintomas', lineas=[
        'V ->> V: guardar_reporte_en_el_telefono(clave_envio)',
        '! Sin conexion el envio no llega al servidor: todavia no hay evento que escalar',
        'V --> A: avisar_que_quedo_guardado_y_se_enviara_solo()',
        'A -> V: volver_a_mi_seguimiento_con_conexion()',
        'V ->> V: leer_reporte_pendiente_del_telefono()'],
        reanudar='POST /clinica/sintomas'),
    3: dict(cortar='return (evento critico escalado)', lineas=[
        '! La red se corta antes de la respuesta: el reporte y el evento ya quedaron registrados',
        f'{API} --> V: return (sin respuesta: se corto la conexion)',
        'V --> A: avisar_que_quedo_guardado_y_se_enviara_solo()',
        'A -> V: volver_a_mi_seguimiento()',
        'V ->> V: leer_reporte_pendiente_del_telefono()',
        f'V -> {API}: POST /clinica/sintomas (misma clave_envio)',
        *leer('leer_paciente(usuario_id)', 'Paciente', 'paciente_id', '1 paciente', 'return (paciente_id)'),
        *leer('verificar_clave_de_envio(clave_envio)', 'Reporte_Sintoma', 'reporte_sintoma_id, clave_envio',
              '1 envio previo', 'return (reporte ya registrado)'),
        *insertar('registrar(REENVIO_REPORTE_SINTOMA)', 'Bitacora_Auditoria'),
        '! No se duplica el reporte ni se vuelve a escalar: el evento sigue en la bandeja',
        f'{API} --> V: return (HTTP 200 OK: el reporte ya habia quedado registrado)'],
        reanudar='confirmar_reporte_registrado'),
    4: dict(cortar='INSERT INTO Reporte_Sintoma', lineas=[
        *fallo_bd('Reporte_Sintoma'),
        *rollback(),
        '! No se guarda el reporte ni se escala nada: el reporte sigue guardado en el telefono',
        f'{API} --> V: return (HTTP 500 NO_SE_PUDO_REGISTRAR)',
        'V --> A: avisar_que_quedo_guardado_y_se_enviara_solo()',
        'A -> V: volver_a_mi_seguimiento()',
        'V ->> V: leer_reporte_pendiente_del_telefono()'],
        reanudar='POST /clinica/sintomas'),
}

CU62_EXC_ADMINISTRADOR = {
    # Exc. 1 vista por el Administrador: sin nadie conectado, el escalamiento
    # (escalamientoService.supervisores) avisa a todos los administradores
    # activos en la app y por correo; la bandeja se revisa al ingresar.
    1: dict(cortar=0, lineas=[
        '! Ningun administrador tenia sesion activa: el aviso EVENTO_CRITICO llego a todos los administradores activos, en la app y por correo',
        'A ->> A: leer_el_correo_del_evento_critico()',
        '! Al ingresar, el Panel de administración destaca el contador de pendientes',
        'A -> V: abrir_eventos_criticos_al_ingresar()'],
        reanudar='GET /gestion/eventos-criticos?estado=PENDIENTE'),
    2: dict(cortar='SELECT evento_critico_id, origen', lineas=[
        f'Evento_Critico --> {SQL}: return (0 eventos PENDIENTE)',
        f'{SQL} --> {DAO}: return (resultado)',
        f'{DAO} --> {API}: return (bandeja vacia)',
        f'{API} --> V: return (HTTP 200 OK: sin eventos)',
        '! Sin señal en la actualización periódica: advierte, pausa sin vaciar la lista y se reanuda sola',
        'V ->> V: pausar_o_mantener_la_sincronizacion()',
        'V --> A: mostrar_bandeja_vacia_o_aviso_sin_conexion()',
        'A -> V: volver_a_la_bandeja_mas_tarde()'],
        reanudar='GET /gestion/eventos-criticos?estado=PENDIENTE'),
    3: dict(cortar='UPDATE Evento_Critico SET estado', lineas=[
        f'Evento_Critico --> {SQL}: return (0 filas: ya estaba ACUSADO)',
        f'{SQL} --> {DAO}: return (Filas afectadas = 0)',
        f'{DAO} --> {API}: return (sin cambios)',
        *leer('verificar_estado_del_evento(evento_critico_id)', 'Evento_Critico', 'estado, acusado_por',
              '1 evento ACUSADO', 'return (acusado por otro administrador)'),
        f'{API} --> V: return (HTTP 409 YA_ACUSADO)',
        '! Si el administrador sale sin acusar, el evento sigue pendiente y en el contador del panel',
        'V ->> V: avisar_que_ya_estaba_acusado()'],
        reanudar='GET /gestion/eventos-criticos (recarga'),
    4: dict(cortar='UPDATE Evento_Critico SET estado', lineas=[
        *fallo_bd('Evento_Critico'),
        f'{API} --> V: return (HTTP 500 NO_SE_PUDO_ACUSAR)',
        '! La app reintenta sola hasta 3 veces; si no lo logra, avisa que el evento sigue pendiente',
        'V ->> V: esperar_y_reintentar(intento 2 de 3)',
        f'V -> {API}: POST /gestion/eventos-criticos/:id/acuse (reintento)'],
        reanudar='marcar_acusado'),
}

CU62 = dict(id='CU62', nombre='Escalando Automáticamente Eventos Críticos a Supervisión',
  actores=['Paciente', 'Administrador'],
  vistas={'Paciente': 'V_Mi_Seguimiento', 'Administrador': 'V_Eventos_Criticos'},
  participantes=[ACTOR, VISTA, *capa(ESC, FILT, DESP, ADP, BREVO),
                 *T('Paciente', 'Reporte_Sintoma', 'Episodio_Clinico', 'Palabra_Restringida', 'Evento_Critico',
                    'Usuario', 'Rol', 'Sesion_Usuario', 'Notificacion', 'Bitacora_Auditoria')],
  principal={'Paciente': CU62_PACIENTE, 'Administrador': CU62_ADMINISTRADOR},
  excepciones={'Paciente': CU62_EXC_PACIENTE, 'Administrador': CU62_EXC_ADMINISTRADOR})

# ──────────────────────────── CU47 ────────────────────────────
# Primero se crea la pauta; con los ids de los ejercicios creados, la app
# sube cada archivo de apoyo por separado (uno por llamada) a Cloudinary.
CU47 = dict(id='CU47', nombre='Prescribiendo pautas de ejercicio técnico', actores=['Profesional'],
  vistas={'Profesional': 'V_Pautas'},
  participantes=[ACTOR, VISTA, *capa(ADP, CLOUD),
                 *T('Episodio_Clinico', 'Pauta_Tratamiento', 'Material_Terapeutico', 'Profesional', 'Pauta_Ejercicio',
                    'Parametro_Global', 'Pauta_Ejercicio_Material', 'Bitacora_Auditoria')],
  principal=[
    'A -> V: abrir_pautas_y_nueva_pauta(paciente_id)',
    f'V -> {API}: GET /clinica/pautas/paciente/:id',
    *bloque('listar_episodios_y_pautas(paciente_id)',
            [q('Episodio_Clinico', 'episodio_clinico_id, motivo_consulta, estado', 'episodios propios'),
             q('Pauta_Tratamiento', 'nombre, estado, fecha_inicio, fecha_expiracion', 'pautas previas')],
            'return (episodios y pautas)'),
    f'{API} --> V: return (HTTP 200 OK: episodios y pautas)',
    f'V -> {API}: GET /clinica/materiales',
    *leer('listar_biblioteca()', 'Material_Terapeutico', 'material_terapeutico_id, nombre, tipo, disponibilidad',
          'materiales disponibles', 'return (biblioteca)'),
    f'{API} --> V: return (HTTP 200 OK: biblioteca)',
    'V --> A: mostrar_formulario_con_episodio_y_ejercicios()',
    'A -> V: definir_pauta(nombre, vigencia, ejercicios, dias, archivos)',
    'V ->> V: validar_nombre_ejercicios_y_series()',
    f'V -> {API}: POST /clinica/pautas (episodio, nombre, fechas, ejercicios)',
    f'{API} ->> {API}: validar_fechas_nombres_y_series()',
    f'{API} ->> {API}: normalizar_dias_y_frecuencia()',
    *begin(),
    *bloque('verificar_episodio_propio(episodio_clinico_id)',
            [q('Episodio_Clinico', 'episodio_clinico_id, estado', '1 episodio ABIERTO'),
             q('Profesional', 'usuario_id', 'profesional a cargo')],
            'return (episodio propio y abierto)'),
    *leer('verificar_material_de_biblioteca(ids)', 'Material_Terapeutico', 'material_terapeutico_id, disponibilidad',
          'materiales vigentes', 'return (material disponible)'),
    *insertar('registrar_pauta(VIGENTE)', 'Pauta_Tratamiento',
              ' (nombre, estado, fecha_inicio, fecha_expiracion)'),
    *insertar('registrar_ejercicios(series, repeticiones, frecuencia, dias)', 'Pauta_Ejercicio',
              ' (series, repeticiones, frecuencia, dias_semana)'),
    *insertar('registrar_creacion(CREACION_PAUTA)', 'Bitacora_Auditoria'),
    *commit(),
    f'{API} --> V: return (HTTP 201 Created: pauta e ids de ejercicios)',
    '! Con la pauta creada, la app sube cada archivo de apoyo a su ejercicio, uno por uno',
    f'V -> {API}: POST /clinica/pautas/ejercicios/:id/material (archivo)',
    *bloque('leer_ejercicio_con_permisos(pauta_ejercicio_id)',
            [q('Pauta_Ejercicio', 'pauta_ejercicio_id, pauta_tratamiento_id', '1 ejercicio'),
             q('Pauta_Tratamiento', 'estado, fecha_expiracion', 'pauta VIGENTE'),
             q('Episodio_Clinico', 'estado, profesional_id', 'episodio ABIERTO propio')],
            'return (ejercicio del profesional)'),
    f'{API} ->> {API}: verificar_formato_permitido(extension)',
    *leer('leer_parametro(MAX_TAMANO_ARCHIVO_MB)', 'Parametro_Global', 'clave, valor', '10 MB', 'return (tamano maximo)'),
    f'{API} ->> {API}: verificar_tamano_del_archivo()',
    *externo('subir_material(archivo, carpeta del ejercicio)', CLOUD, 'POST /auto/upload (fro-salud/pautas)',
             'return (secure_url, public_id)', 'return (url del material)'),
    *insertar('asociar_material_al_ejercicio(url_publica)', 'Pauta_Ejercicio_Material',
              ' (pauta_ejercicio_id, nombre_original, url_publica)'),
    *insertar('registrar_carga(CARGA_MATERIAL_EJERCICIO)', 'Bitacora_Auditoria'),
    f'{API} --> V: return (HTTP 201 Created: material asociado)',
    'V --> A: mostrar_pauta_prescrita_con_su_material()',
  ],
  excepciones={
    1: dict(cortar='validar_fechas_nombres_y_series', lineas=[
        '! Término anterior al inicio, sin nombre, sin ejercicios o con ejercicios repetidos',
        f'{API} --> V: return (HTTP 400 con el problema)',
        'V --> A: indicar_el_problema_en_el_formulario()',
        'A -> V: corregir_los_datos(nombre, vigencia, ejercicios)'],
        reanudar='validar_nombre_ejercicios_y_series'),
    2: dict(cortar='normalizar_dias_y_frecuencia', lineas=[
        '! Sin frecuencia válida ni días: queda DIARIA; con los siete días marcados también',
        f'{API} ->> {API}: asignar_frecuencia_diaria()'],
        reanudar='abrir_transaccion'),
    3: dict(cortar='verificar_formato_permitido', lineas=[
        '! Formato no permitido, o archivo mayor al máximo (HTTP 413)',
        f'{API} --> V: return (HTTP 400 FORMATO_NO_PERMITIDO)',
        'V ->> V: anotar_el_archivo_fallido(ejercicio, motivo)',
        'V --> A: informar_que_archivo_y_ejercicio_fallaron()',
        '! Series o repeticiones no numéricas ya se bloquean antes, en la vista',
        'A -> V: adjuntar_otro_archivo(pauta_ejercicio_id, archivo)',
        f'V -> {API}: POST /clinica/pautas/ejercicios/:id/material (otro archivo)'],
        reanudar='leer_ejercicio_con_permisos'),
    4: dict(cortar='SELECT episodio_clinico_id, estado FROM', lineas=[
        f'Episodio_Clinico --> {SQL}: return (0 episodios propios o episodio CERRADO)',
        f'{SQL} --> {DAO}: return (resultado)',
        f'{DAO} --> {API}: return (episodio no valido)',
        *rollback(),
        f'{API} --> V: return (HTTP 404 EPISODIO_NO_ENCONTRADO o 409 EPISODIO_CERRADO)',
        '! Si falla la subida de un archivo (HTTP 502), la pauta queda y se listan los faltantes',
        'V --> A: pedir_crear_o_elegir_un_episodio_abierto()',
        'A -> V: elegir_el_episodio_base(episodio_clinico_id)'],
        reanudar='POST /clinica/pautas ('),
  })

# ──────────────────────────── CU78 (cierre) ────────────────────────────
# Solo el flujo nuevo del Incremento 4: el profesional cierra el episodio
# desde la cabecera de la Ficha Clinica, sin informe de alta (con informe es
# el CU37). Excepciones de la ficha que aplican al cierre: la 3 (episodio
# cerrado o a cargo de otro profesional: solo lectura) y la 4 (evoluciones
# sin firmar, citas futuras o fallo de escritura). La 1 (formato de archivo)
# y la 2 (paciente sin episodio) son del guardado de registros, no del cierre.
CU78 = dict(id='CU78 (cierre)', nombre='Agrupando registros bajo entidad episodio clínico: cierre del episodio',
  actores=['Profesional'],
  vistas={'Profesional': 'V_Ficha_Clinica'},
  participantes=[ACTOR, VISTA, *capa(ALTA, ACC, DESP),
                 *T('Episodio_Clinico', 'Profesional', 'Usuario', 'Objetivo_Terapeutico', 'Parametro_Global',
                    'Evolucion_Clinica', 'Cita', 'Derivacion_Interna', 'Notificacion')],
  principal=[
    'A -> V: presionar_cerrar_episodio(episodio_clinico_id)',
    'V ->> V: pedir_confirmacion_del_cierre()',
    'V --> A: mostrar_dialogo_cerrar_el_episodio()',
    'A -> V: confirmar_cierre()',
    f'V -> {API}: PUT /clinica/episodio/:id (estado CERRADO)',
    f'{API} ->> {API}: validar_estado(ABIERTO o CERRADO)',
    *bloque('verificar_profesional_a_cargo(episodio_id, usuario_id)',
            [q('Episodio_Clinico', 'episodio_clinico_id, profesional_id', '1 episodio'),
             q('Profesional', 'usuario_id', 'profesional a cargo')],
            'return (profesional a cargo)'),
    *resumen_cierre(),
    f'{API} -> {ALTA}: detectar_impedimento_de_cierre(resumen)',
    f'{ALTA} --> {API}: return (sin impedimentos)',
    *actualizar('cerrar_episodio(CERRADO, fecha_terminado)', 'Episodio_Clinico', 'motivo_consulta, estado, fecha_terminado'),
    *CERRAR_DERIVACIONES,
    '! Al terminar el tratamiento se le pide al paciente calificarlo (CU55)',
    *PEDIR_EVALUACION,
    f'{API} --> V: return (HTTP 200 OK: episodio cerrado)',
    f'V -> {API}: GET /profesionales/pacientes/:id/historial',
    *leer('listar_episodios_del_paciente(paciente_id)', 'Episodio_Clinico', 'episodio_clinico_id, estado, fecha_terminado',
          'episodio CERRADO', 'return (episodios del paciente)'),
    f'{API} --> V: return (HTTP 200 OK: historial)',
    'V --> A: mostrar_episodio_cerrado_sin_nuevos_registros()',
  ],
  excepciones={
    3: dict(cortar='SELECT episodio_clinico_id, profesional_id', lineas=[
        f'Episodio_Clinico --> {SQL}: return (episodio de otro profesional)',
        f'{SQL} --> {DAO}: return (resultado)',
        f'{DAO} --> {API}: return (no es el profesional a cargo)',
        f'{API} --> V: return (HTTP 403 EPISODIO_AJENO)',
        '! Un episodio cerrado o ajeno se muestra en solo lectura y sin el botón de cierre',
        'V ->> V: mostrar_en_solo_lectura()',
        'V --> A: bloquear_el_cierre_y_explicar_el_motivo()',
        'A ->> A: elegir_un_episodio_propio_abierto()'],
        reanudar='presionar_cerrar_episodio'),
    4: dict(cortar='detectar_impedimento_de_cierre', lineas=[
        f'{ALTA} --> {API}: return (EVOLUCIONES_PENDIENTES o CITAS_FUTURAS)',
        f'{API} --> V: return (HTTP 409 con el motivo y el detalle)',
        '! Un fallo de escritura al cerrar responde HTTP 500 y el episodio sigue abierto',
        'V --> A: indicar_el_motivo_y_los_pendientes()',
        'A ->> A: firmar_evoluciones_o_cancelar_citas_futuras()'],
        reanudar='presionar_cerrar_episodio'),
  })

if __name__ == '__main__':
    salida = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    chrome = chrome_path()
    total = 0
    for cu in (CU37, CU51, CU54, CU62, CU47, CU78):
        verificar_participantes(cu)
        ruta, n = generar_cu(cu, os.path.join(salida, cu['id']), chrome, png='--sin-png' not in sys.argv)
        total += n
        print(f"{cu['id']}: {n} paginas -> {os.path.relpath(ruta, salida)}")
    print('total:', total)
