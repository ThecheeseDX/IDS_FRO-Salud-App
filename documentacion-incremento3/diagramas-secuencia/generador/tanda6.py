# Tanda 6 — Finanzas: CU73, CU74, CU75.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from motor import generar_cu, chrome_path
from comun import *

TRX = 'C_API_Transacciones'   # pasarela de pago (simulada en esta version)

# ──────────────────────────── CU73 ────────────────────────────
CU73_PACIENTE = [
    '! Viene de reservar un bloque (CU15): la cita quedo AGENDADA y sin pago, como reserva temporal',
    'A -> V: abrir_pagar_tu_hora(cita_id)',
    f'V -> {API}: GET /finanzas/citas/:id/opciones',
    *leer('leer_cita_del_paciente(cita_id)', 'Cita', 'cita_id, estado, paciente_id', '1 cita AGENDADA', 'return (cita)'),
    *leer('leer_parametros(ARANCEL_ESPECIALIDAD, DESCUENTO_PAQUETE_PORCENTAJE)', 'Parametro_Global', 'clave, valor',
          '40000 y 10%', 'return (arancel y descuento)'),
    f'{API} ->> {API}: calcular_precio_unitario_y_planes(10, 15, 20)',
    *leer('buscar_plan_activo(paciente_id)', 'Paquete_Sesiones', 'sesiones_total, sesiones_usadas, estado', 'plan con saldo',
          'return (sesiones disponibles)'),
    f'{API} --> V: return (HTTP 200 OK: montos y opciones)',
    'V --> A: mostrar_sesion_suelta_planes_y_mi_plan()',
    'A -> V: elegir_modalidad_y_pagar(UNITARIA, TARJETA_OK)',
    'V ->> V: verificar_modalidad_elegida()',
    f'V -> {API}: POST /finanzas/citas/:id/comprar (UNITARIA, TARJETA_OK)',
    f'{API} ->> {API}: validar_modalidad_y_metodo()',
    *leer('verificar_que_no_este_pagada(cita_id)', 'Transaccion', 'transaccion_id, estado, tipo', '0 pagos',
          'return (sin pago previo)'),
    *leer('buscar_pago_en_transito(cita_id)', 'Transaccion', 'transaccion_id, monto_total, tipo, estado', '0 pagos EN_TRANSITO',
          'return (sin pago en transito)'),
    *externo('cobrar(monto, metodo)', TRX, 'POST /cobros (pasarela simulada)', 'return (APROBADO)', 'return (pago aprobado)'),
    *begin(),
    *insertar('registrar_pago(PRESTACION, PAGADA)', 'Transaccion'),
    *insertar('registrar_cobro(COBRO_ANTICIPADO)', 'Bitacora_Auditoria'),
    *despachar(API, 'CAMBIO_ESTADO_CITA', 'profesional: hora pagada por confirmar', retorno='return (profesional avisado)'),
    *commit(),
    f'{API} --> V: return (HTTP 200 OK: pago recibido, esperando la confirmacion del profesional)',
    'V --> A: mostrar_pago_recibido()',
]

CU73_PROFESIONAL = [
    '! El paciente pago su hora: al profesional le llego el aviso "Hora pagada por confirmar"',
    'A -> V: abrir_la_ficha_del_paciente(paciente_id)',
    f'V -> {API}: GET /profesionales/pacientes/:id/historial',
    *bloque('leer_citas_con_su_estado_de_pago(paciente_id)',
            [q('Cita', 'cita_id, estado, fecha_hora_inicio', 'citas del paciente'),
             q('Transaccion', 'tipo, estado', 'pago de cada cita')],
            'return (citas con pago_tipo)'),
    f'{API} --> V: return (HTTP 200 OK: historial)',
    'V ->> V: mostrar_confirmar_solo_en_horas_pagadas()',
    'V --> A: mostrar_la_cita_pagada_con_confirmar()',
    'A -> V: confirmar_cita(cita_id)',
    f'V -> {API}: POST /citas/:id/transicionar (CONFIRMAR)',
    *begin(),
    *leer('bloquear_y_leer_cita(cita_id)', 'Cita', 'cita_id, estado, profesional_id', '1 cita AGENDADA', 'return (cita)'),
    f'{API} ->> {API}: evaluar_la_maquina_de_estados()',
    *leer('verificar_pago_integro(cita_id)', 'Transaccion', 'estado, tipo', '1 pago PAGADA', 'return (hora pagada)'),
    *actualizar('confirmar_cita(CONFIRMADA)', 'Cita', 'estado'),
    *insertar('registrar_trazabilidad(TRANSICION_CITA)', 'Bitacora_Auditoria'),
    *despachar(API, 'CAMBIO_ESTADO_CITA', 'paciente y profesional', retorno='return (avisos registrados)'),
    *commit(),
    f'{API} --> V: return (HTTP 200 OK: cita confirmada)',
    'V --> A: mostrar_la_cita_confirmada()',
]

CU73 = dict(id='CU73', nombre='Comercializando prestaciones con restricción de cobro anticipado', actores=['Paciente', 'Profesional'],
  vistas={'Paciente': 'V_Pagar_Hora', 'Profesional': 'V_Gestion_Agenda'},
  participantes=[ACTOR, VISTA, *capa(DESP, ADP, TRX),
                 *T('Cita', 'Parametro_Global', 'Paquete_Sesiones', 'Transaccion', 'Lista_Espera', 'Notificacion', 'Bitacora_Auditoria')],
  principal={'Paciente': CU73_PACIENTE, 'Profesional': CU73_PROFESIONAL},
  excepciones={
    'Paciente': {
      1: dict(cortar='verificar_modalidad_elegida', lineas=[
          '! El paciente intenta pagar sin elegir modalidad',
          'V --> A: bloquear_el_paso_y_pedir_la_modalidad()',
          'A -> V: elegir_la_modalidad(UNITARIA, TARJETA_OK)'],
          reanudar='POST /finanzas/citas/:id/comprar'),
      2: dict(cortar='SELECT clave, valor FROM Parametro_Global', lineas=[
          f'Parametro_Global --> {SQL}: error de lectura',
          f'{SQL} --> {DAO}: throw (SQLException)',
          f'{DAO} --> {API}: return (Fallo del calculo)',
          f'{API} --> V: return (HTTP 503 CALCULO_NO_DISPONIBLE)',
          'V --> A: mostrar_el_error_tecnico_y_reintentar()',
          'A -> V: reintentar_pasados_unos_minutos(cita_id)'],
          reanudar='GET /finanzas/citas/:id/opciones'),
      3: dict(cortar='POST /cobros', lineas=[
          f'{TRX} --> {ADP}: return (RECHAZADO)',
          f'{ADP} --> {API}: return (pago rechazado)',
          '! La entidad bancaria rechaza el pago: la reserva temporal se revoca',
          *begin(),
          *insertar('registrar_intento(PRESTACION, RECHAZADA)', 'Transaccion'),
          *actualizar('revocar_la_reserva(CANCELADA_PACIENTE)', 'Cita', 'estado, motivo_cancelacion'),
          *commit(),
          *leer('ofrecer_el_bloque_a_la_lista_de_espera(cita_id) (CU19)', 'Lista_Espera', 'lista_espera_id, estado',
                'primero de la fila', 'return (cupo ofrecido)'),
          f'{API} --> V: return (HTTP 402 PAGO_RECHAZADO: reserva revocada)',
          'V --> A: informar_reserva_revocada_y_volver_al_buscador()',
          '! El paciente reserva de nuevo (CU14/CU15) y vuelve a Pagar tu hora con otro metodo',
          'A -> V: abrir_pagar_tu_hora_de_la_nueva_reserva(cita_id)'],
          reanudar='GET /finanzas/citas/:id/opciones'),
      4: dict(cortar='POST /cobros', lineas=[
          f'{TRX} --> {ADP}: return (PENDIENTE: confirmacion lenta)',
          f'{ADP} --> {API}: return (pago en transito)',
          *begin(),
          *insertar('registrar_pago(PRESTACION, EN_TRANSITO)', 'Transaccion'),
          *insertar('registrar_cobro(COBRO_ANTICIPADO)', 'Bitacora_Auditoria'),
          *commit(),
          f'{API} --> V: return (HTTP 202 EN_TRANSITO)',
          'V --> A: informar_hora_reservada_pero_no_confirmable()',
          'A -> V: reintentar_mas_tarde(UNITARIA, TARJETA_OK)',
          f'V -> {API}: POST /finanzas/citas/:id/comprar (UNITARIA, TARJETA_OK)',
          f'{API} ->> {API}: validar_modalidad_y_metodo()',
          *leer('verificar_que_no_este_pagada(cita_id)', 'Transaccion', 'transaccion_id, estado, tipo', '0 pagos',
                'return (sin pago previo)'),
          *leer('buscar_pago_en_transito(cita_id)', 'Transaccion', 'transaccion_id, monto_total, tipo, estado',
                '1 pago EN_TRANSITO', 'return (pago anterior en transito)'),
          '! Se concilia el pago anterior: no se vuelve a cobrar',
          *begin(),
          *actualizar('conciliar_pago(PAGADA)', 'Transaccion', 'estado'),
          *insertar('registrar_conciliacion(CONCILIACION_PAGO_EN_TRANSITO)', 'Bitacora_Auditoria'),
          *despachar(API, 'CAMBIO_ESTADO_CITA', 'profesional: hora pagada por confirmar', retorno='return (profesional avisado)'),
          *commit()],
          reanudar='return (HTTP 200 OK: pago recibido'),
    },
    'Profesional': {},
  })

# ──────────────────────────── CU74 ────────────────────────────
CU74 = dict(id='CU74', nombre='Actualizando y devolviendo transacciones financieras', actores=['Paciente'],
  vistas={'Paciente': 'V_Mis_Citas'},
  participantes=[ACTOR, VISTA, *capa(ADP, TRX),
                 *T('Cita', 'Transaccion', 'Parametro_Global', 'Paquete_Sesiones', 'Lista_Espera', 'Bitacora_Auditoria')],
  principal=[
    '! La devolucion automatica al cancelar una sesion suelta con 24 h o mas registra la misma transaccion DEVOLUCION de la Excepcion 1',
    'A -> V: cambiar_a_plan(cita_id, sesiones = 10)',
    f'V -> {API}: POST /finanzas/citas/:id/actualizar-a-paquete (sesiones, TARJETA_OK)',
    *leer('leer_cita_del_paciente(cita_id)', 'Cita', 'cita_id, estado, fecha_hora_inicio, paciente_id',
          '1 cita AGENDADA o CONFIRMADA', 'return (cita)'),
    *leer('verificar_que_no_este_en_un_plan(cita_id)', 'Transaccion', 'tipo, estado', '0 pagos de plan', 'return (sesion suelta)'),
    *leer('leer_pago_previo(cita_id)', 'Transaccion', 'transaccion_id, monto_total, momento_pago', '1 PRESTACION PAGADA',
          'return (pago previo)'),
    *leer('leer_parametro(HORAS_ANTICIPACION_DEVOLUCION)', 'Parametro_Global', 'clave, valor', '24 horas', 'return (ventana)'),
    f'{API} ->> {API}: verificar_la_ventana_de_24_horas()',
    *leer('leer_precio_del_plan(ARANCEL_ESPECIALIDAD, DESCUENTO_PAQUETE_PORCENTAJE)', 'Parametro_Global', 'clave, valor',
          'arancel y descuento', 'return (precio del plan)'),
    f'{API} ->> {API}: calcular_diferencia(precio_del_plan - pagado)',
    *externo('cobrar_la_diferencia(diferencia, metodo)', TRX, 'POST /cobros (pasarela simulada)', 'return (APROBADO)',
             'return (diferencia pagada)'),
    *begin(),
    *insertar('registrar_pago_diferencial(ACTUALIZACION, PAGADA)', 'Transaccion'),
    *insertar('activar_plan(sesiones, sesiones_usadas = 1)', 'Paquete_Sesiones'),
    *insertar('registrar(ACTUALIZACION_A_PAQUETE)', 'Bitacora_Auditoria'),
    *commit(),
    f'{API} --> V: return (HTTP 200 OK: plan activado)',
    'V --> A: mostrar_el_plan_activo_y_las_sesiones_restantes()',
  ],
  excepciones={
    1: dict(cortar='verificar_la_ventana_de_24_horas', lineas=[
        '! La cita esta a mas de 24 horas: se devuelve el pago completo y se libera la hora',
        *begin(),
        *insertar('registrar_devolucion(DEVOLUCION, PAGADA)', 'Transaccion'),
        *actualizar('liberar_la_hora(CANCELADA_PACIENTE)', 'Cita', 'estado, motivo_cancelacion'),
        *commit(),
        *leer('ofrecer_el_bloque_a_la_lista_de_espera(cita_id) (CU19)', 'Lista_Espera', 'lista_espera_id, estado',
              'primero de la fila', 'return (cupo ofrecido)'),
        f'{API} --> V: return (HTTP 200 OK: devolucion total)',
        'V --> A: informar_la_devolucion_y_pedir_agendar_de_nuevo()',
        '! El paciente agenda de nuevo y cambia a plan el dia de la prestacion',
        'A -> V: cambiar_a_plan_el_dia_de_la_nueva_cita(cita_id, sesiones = 10)'],
        reanudar='POST /finanzas/citas/:id/actualizar-a-paquete'),
    2: dict(cortar='SELECT transaccion_id, monto_total, momento_pago', lineas=[
        f'Transaccion --> {SQL}: return (0 pagos PRESTACION)',
        f'{SQL} --> {DAO}: return (resultado)',
        f'{DAO} --> {API}: return (sin registro del pago previo)',
        *insertar('levantar_alerta_de_auditoria(INCONSISTENCIA_PAGO_PREVIO)', 'Bitacora_Auditoria'),
        f'{API} --> V: return (HTTP 409 PAGO_PREVIO_INCONSISTENTE)',
        'V --> A: pedir_contactar_a_soporte()',
        'A -> V: reintentar_tras_la_revision_de_soporte(cita_id, sesiones = 10)'],
        reanudar='POST /finanzas/citas/:id/actualizar-a-paquete'),
    3: dict(cortar='POST /cobros', lineas=[
        f'{TRX} --> {ADP}: return (RECHAZADO o abandonado)',
        f'{ADP} --> {API}: return (pago de la diferencia no completado)',
        *insertar('registrar_intento(ACTUALIZACION, RECHAZADA)', 'Transaccion'),
        f'{API} --> V: return (HTTP 402 PAGO_RECHAZADO)',
        'V --> A: informar_que_conserva_la_sesion_unitaria()',
        'A -> V: reintentar_con_otro_metodo(cita_id, sesiones = 10)'],
        reanudar='POST /finanzas/citas/:id/actualizar-a-paquete'),
    4: dict(cortar='INSERT INTO Paquete_Sesiones', lineas=[
        *fallo_bd('Paquete_Sesiones', 'latencia de red al registrar'),
        *rollback(),
        f'{API} --> V: return (HTTP 503 REINTENTAR)',
        'V --> A: pedir_reintentar()',
        'A -> V: reintentar_la_actualizacion(cita_id, sesiones = 10)'],
        reanudar='POST /finanzas/citas/:id/actualizar-a-paquete'),
  })

# ──────────────────────────── CU75 ────────────────────────────
CU75_ADMIN = [
    'A -> V: abrir_liquidaciones(anio, mes)',
    f'V -> {API}: GET /finanzas/liquidaciones?anio=&mes=',
    f'{API} ->> {API}: validar_el_periodo()',
    *leer('leer_parametros(PORCENTAJE_HONORARIO_PROFESIONAL, ARANCEL_ESPECIALIDAD)', 'Parametro_Global', 'clave, valor',
          '70% y 40000', 'return (honorario por sesion)'),
    *bloque('sumar_prestaciones_validadas_del_mes(anio, mes)',
            [q('Profesional', 'profesional_id', 'profesionales activos'),
             q('Cita', 'profesional_id, sesion_certificada_en', 'sesiones validadas del mes'),
             q('Liquidacion', 'liquidacion_id, bonificacion, monto_total, momento_emision', 'emitidas del periodo'),
             q('Usuario', 'nombres, apellido_paterno', 'nombre de cada profesional')],
            'return (monto por profesional)'),
    f'{API} ->> {API}: medir_la_latencia_del_calculo()',
    f'{API} --> V: return (HTTP 200 OK: liquidaciones del mes)',
    'V --> A: mostrar_el_monto_de_cada_profesional()',
    'A -> V: ingresar_bonificacion_y_observacion(profesional_id, bonificacion, observacion)',
    'V ->> V: aceptar_solo_digitos()',
    'V --> A: mostrar_el_total_y_pedir_confirmacion()',
    'A -> V: emitir_la_liquidacion()',
    f'V -> {API}: POST /finanzas/liquidaciones (profesional_id, anio, mes, bonificacion, observacion)',
    f'{API} ->> {API}: validar_datos_y_bonificacion()',
    *leer('verificar_que_no_este_emitida(profesional_id, anio, mes)', 'Liquidacion', 'liquidacion_id', '0 emitidas',
          'return (periodo sin emitir)'),
    *leer('contar_sesiones_validadas(profesional_id, anio, mes)', 'Cita', 'sesion_certificada_en', 'sesiones del mes',
          'return (sesiones validadas)'),
    *begin(),
    *insertar('emitir(sesiones, monto_prestaciones, bonificacion, monto_total, emitida_por)', 'Liquidacion'),
    *insertar('registrar(EMISION_LIQUIDACION)', 'Bitacora_Auditoria'),
    *despachar(API, 'LIQUIDACION_EMITIDA', 'profesional', retorno='return (profesional avisado)'),
    *commit(),
    f'{API} --> V: return (HTTP 201 Created: liquidacion emitida)',
    'V --> A: mostrar_la_liquidacion_inalterable()',
]

CU75_PROFESIONAL = [
    'A -> V: abrir_mis_liquidaciones()',
    f'V -> {API}: GET /finanzas/mis-liquidaciones',
    *leer('listar_mis_liquidaciones(usuario_id)', 'Liquidacion',
          'anio, mes, sesiones_validadas, monto_prestaciones, bonificacion, monto_total, momento_emision',
          'liquidaciones emitidas', 'return (historial de liquidaciones)'),
    f'{API} --> V: return (HTTP 200 OK: mis liquidaciones)',
    'V --> A: mostrar_el_historial_de_solo_lectura()',
]

CU75 = dict(id='CU75', nombre='Liquidando ganancias en panel financiero', actores=['Administrador', 'Profesional'],
  vistas={'Administrador': 'V_Liquidaciones', 'Profesional': 'V_Mis_Liquidaciones'},
  participantes=[ACTOR, VISTA, *capa(DESP),
                 *T('Parametro_Global', 'Profesional', 'Cita', 'Liquidacion', 'Usuario', 'Notificacion', 'Bitacora_Auditoria')],
  principal={'Administrador': CU75_ADMIN, 'Profesional': CU75_PROFESIONAL},
  excepciones={
    'Administrador': {
      1: dict(cortar='SELECT profesional_id, sesion_certificada_en FROM Cita', lineas=[
          f'Cita --> {SQL}: return (sin registros: periodo futuro)',
          f'{SQL} --> {DAO}: return (resultado)',
          f'{DAO} --> {API}: return (lista vacia)',
          f'{API} --> V: return (HTTP 200 OK: sin prestaciones que liquidar)',
          'V --> A: informar_que_no_hay_prestaciones_que_liquidar()',
          'A -> V: elegir_un_mes_finalizado(anio, mes)'],
          reanudar='GET /finanzas/liquidaciones'),
      2: dict(cortar='SELECT profesional_id, sesion_certificada_en FROM Cita', lineas=[
          f'Cita --> {SQL}: return (0 sesiones validadas del profesional)',
          f'{SQL} --> {DAO}: return (resultado)',
          f'{DAO} --> {API}: return (monto de cero pesos)',
          '! El profesional aparece con monto cero: el administrador audita sus citas'],
          reanudar='medir_la_latencia_del_calculo'),
      3: dict(cortar='aceptar_solo_digitos', lineas=[
          '! El administrador escribe letras en la bonificacion',
          'V ->> V: descartar_los_caracteres_no_numericos()'],
          reanudar='mostrar_el_total_y_pedir_confirmacion'),
      4: dict(cortar='medir_la_latencia_del_calculo', lineas=[
          '! El calculo supero los 2000 ms',
          *insertar('registrar_latencia(LATENCIA_LIQUIDACION)', 'Bitacora_Auditoria')],
          reanudar='return (HTTP 200 OK: liquidaciones del mes)'),
    },
    'Profesional': {},
  })

if __name__ == '__main__':
    salida = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    chrome = chrome_path()
    total = 0
    for cu in (CU73, CU74, CU75):
        verificar_participantes(cu)
        ruta, n = generar_cu(cu, os.path.join(salida, cu['id']), chrome, png='--sin-png' not in sys.argv)
        total += n
        print(f"{cu['id']}: {n} paginas -> {os.path.relpath(ruta, salida)}")
    print('total:', total)
