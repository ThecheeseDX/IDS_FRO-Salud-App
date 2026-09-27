# Tanda 3 — Mensajería clínica y filtro: CU53, CU57.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from motor import generar_cu, chrome_path
from comun import *

# ──────────────────────────── CU53 ────────────────────────────
# Mismo flujo para los dos roles: abre la conversacion del episodio (se
# descifra y se marca leido) y envia un mensaje (filtro, cifrado, aviso unico
# por conversacion a la otra parte).
CU53 = dict(id='CU53', nombre='Comunicando mediante mensajería clínica cifrada', actores=['Paciente', 'Profesional'],
  vistas={'Paciente': 'V_Chat_Clinico', 'Profesional': 'V_Chat_Clinico'},
  participantes=[ACTOR, VISTA, *capa(FILT, CIF, DESP),
                 *T('Episodio_Clinico', 'Usuario', 'Mensaje_Chat', 'Palabra_Restringida', 'Notificacion', 'Bitacora_Auditoria')],
  principal=[
    'A -> V: abrir_la_conversacion_del_episodio(episodio_id)',
    f'V -> {API}: GET /clinica/episodio/:id/mensajes?desde_id=0',
    *bloque('leer_contexto_de_la_conversacion(episodio_id, usuario_id)',
            [q('Episodio_Clinico', 'episodio_clinico_id, estado, paciente_id, profesional_id', '1 episodio'),
             q('Usuario', 'usuario_id, nombres, apellido_paterno', 'paciente y profesional')],
            'return (participantes del episodio)'),
    f'{API} ->> {API}: verificar_que_el_usuario_participa()',
    *leer('leer_mensajes(episodio_id, desde_id)', 'Mensaje_Chat', 'mensaje_id, contenido_cifrado, remitente_usuario_id, leido, momento_envio',
          'mensajes del episodio', 'return (mensajes cifrados)'),
    f'{API} -> {CIF}: descifrar_mensajes(contenido_cifrado)',
    f'{CIF} ->> {CIF}: verificar_la_etiqueta_de_autenticacion_AES_256_GCM()',
    f'{CIF} --> {API}: return (textos legibles)',
    *actualizar('marcar_leidos_los_mensajes_de_la_otra_parte()', 'Mensaje_Chat', 'leido'),
    *actualizar('marcar_leido_el_aviso_de_la_conversacion()', 'Notificacion', 'leida'),
    f'{API} --> V: return (HTTP 200 OK: mensajes y estado del episodio)',
    'V ->> V: agrupar_por_dia(Hoy, Ayer, fecha)',
    'V --> A: mostrar_la_conversacion()',
    '! Mientras la conversacion esta abierta, la app repite la consulta con desde_id cada 6 segundos',
    'A -> V: redactar_y_enviar(contenido)',
    f'V -> {API}: POST /clinica/episodio/:id/mensajes (contenido)',
    *leer('verificar_participante_y_estado(episodio_id)', 'Episodio_Clinico', 'estado, paciente_id, profesional_id',
          'episodio ABIERTO', 'return (episodio abierto)'),
    f'{API} ->> {API}: verificar_largo_maximo(1000 caracteres)',
    f'{API} -> {FILT}: revisar(contenido)',
    *leer_de(FILT, 'leer_diccionario_activo() (cache de 60 s)', 'Palabra_Restringida', 'termino, activa', 'terminos activos',
             'return (diccionario)'),
    f'{FILT} ->> {FILT}: normalizar_y_comparar_por_palabra_completa()',
    f'{FILT} --> {API}: return (permitido)',
    f'{API} -> {CIF}: cifrar(contenido)',
    f'{CIF} --> {API}: return (v1:iv:tag:datos)',
    *insertar('guardar_mensaje_cifrado(remitente_usuario_id, episodio_id)', 'Mensaje_Chat'),
    *leer('buscar_aviso_sin_leer_de_esta_conversacion(destinatario)', 'Notificacion', 'notificacion_id, leida, datos',
          '0 avisos sin leer', 'return (sin aviso previo)'),
    *despachar(API, 'MENSAJE_CLINICO', 'la otra parte', retorno='return (aviso a la otra parte)'),
    f'{API} --> V: return (HTTP 201 Created: mensaje enviado)',
    'V --> A: mostrar_el_mensaje_enviado()',
  ],
  excepciones={
    1: dict(cortar='normalizar_y_comparar_por_palabra_completa', lineas=[
        f'{FILT} --> {API}: return (bloqueado: terminos coincidentes)',
        '! El texto contiene terminos del diccionario: no se guarda',
        *insertar('registrar_bloqueo(BLOQUEO_CONTENIDO_RESTRINGIDO, sin el texto)', 'Bitacora_Auditoria'),
        f'{API} --> V: return (HTTP 422 CONTENIDO_RESTRINGIDO)',
        'V --> A: mostrar_la_advertencia_sin_enviar()',
        'A -> V: reescribir_el_mensaje(contenido)'],
        reanudar='POST /clinica/episodio/:id/mensajes'),
    2: dict(cortar='INSERT INTO Mensaje_Chat', lineas=[
        *fallo_bd('Mensaje_Chat', 'servidor no disponible'),
        f'{API} --> V: return (HTTP 503 ENVIO_RETENIDO)',
        'V ->> V: retener_el_mensaje_en_el_telefono_como_pendiente()',
        'V --> A: mostrar_el_mensaje_pendiente_de_envio()',
        'A -> V: volver_a_la_conversacion_con_senal()'],
        reanudar='POST /clinica/episodio/:id/mensajes'),
    3: dict(cortar='SELECT estado, paciente_id, profesional_id FROM Episodio_Clinico', lineas=[
        f'Episodio_Clinico --> {SQL}: return (episodio CERRADO)',
        f'{SQL} --> {DAO}: return (resultado)',
        f'{DAO} --> {API}: return (episodio cerrado)',
        f'{API} --> V: return (HTTP 409 EPISODIO_CERRADO)',
        'V ->> V: suprimir_la_caja_de_texto()',
        'V --> A: mostrar_historial_de_solo_lectura()',
        '! Para seguir conversando, el actor entra a la conversacion de un episodio abierto',
        'A -> V: abrir_la_conversacion_de_un_episodio_abierto(episodio_id)'],
        reanudar='GET /clinica/episodio/:id/mensajes'),
    4: dict(cortar='verificar_la_etiqueta_de_autenticacion', lineas=[
        '! La clave del servidor cambio o el registro fue alterado: la etiqueta no coincide',
        f'{CIF} ->> {CIF}: marcar_el_mensaje_como_ilegible()',
        f'{CIF} --> {API}: return (mensaje ilegible con advertencia)'],
        reanudar='marcar_leidos_los_mensajes'),
  })

# ──────────────────────────── CU57 ────────────────────────────
# Tres actores con dos flujos: el administrador mantiene el diccionario; el
# paciente y el profesional envian un texto que el filtro bloquea.
CU57_ADMIN = [
    'A -> V: abrir_terminos_restringidos()',
    f'V -> {API}: GET /parametros/palabras-restringidas',
    *leer('listar_diccionario()', 'Palabra_Restringida', 'palabra_restringida_id, termino, categoria, activa',
          'terminos del diccionario', 'return (diccionario)'),
    f'{API} --> V: return (HTTP 200 OK: diccionario)',
    'V --> A: mostrar_el_diccionario()',
    'A -> V: agregar_termino(termino, categoria)',
    f'V -> {API}: POST /parametros/palabras-restringidas (termino, categoria)',
    f'{API} ->> {API}: validar_largo_minimo_del_termino()',
    *insertar('guardar_termino(termino, categoria, administrador_id)', 'Palabra_Restringida', ' (si existe, se reactiva)'),
    f'{API} -> {FILT}: refrescar()',
    f'{FILT} ->> {FILT}: invalidar_el_diccionario_en_memoria()',
    f'{FILT} --> {API}: return (cache invalidada)',
    *insertar('registrar_cambio(ALTA_PALABRA_RESTRINGIDA)', 'Bitacora_Auditoria'),
    f'{API} --> V: return (HTTP 201 Created: termino agregado)',
    'V --> A: mostrar_el_termino_en_el_diccionario()',
]

CU57_EMISOR = [
    'A -> V: enviar_texto(contenido)',
    'V ->> V: mostrar_indicador_de_carga()',
    f'V -> {API}: POST /clinica/episodio/:id/mensajes (contenido)',
    *leer('verificar_participante_y_estado(episodio_id)', 'Episodio_Clinico', 'estado, paciente_id, profesional_id',
          'episodio ABIERTO', 'return (episodio abierto)'),
    f'{API} -> {FILT}: revisar(contenido)',
    f'{FILT} ->> {FILT}: verificar_caracteres_imprimibles()',
    *leer_de(FILT, 'leer_diccionario_activo() (cache de 60 s)', 'Palabra_Restringida', 'termino, activa', 'terminos activos',
             'return (diccionario)'),
    f'{FILT} ->> {FILT}: normalizar(minusculas, sin acentos, sin letras repetidas)',
    f'{FILT} ->> {FILT}: comparar_por_palabra_completa()',
    f'{FILT} --> {API}: return (bloqueado: terminos coincidentes)',
    *insertar('registrar_bloqueo(BLOQUEO_CONTENIDO_RESTRINGIDO, sin el texto)', 'Bitacora_Auditoria'),
    f'{API} --> V: return (HTTP 422 CONTENIDO_RESTRINGIDO)',
    'V --> A: mostrar_la_advertencia_sin_guardar_el_texto()',
]

EXC_EMISOR = {
    2: dict(cortar='verificar_caracteres_imprimibles', lineas=[
        '! El texto no tiene caracteres imprimibles',
        f'{FILT} --> {API}: return (VACIO)',
        f'{API} --> V: return (HTTP 400 VACIO)',
        'V --> A: pedir_un_texto_valido()',
        'A -> V: escribir_un_texto_alfanumerico(contenido)'],
        reanudar='POST /clinica/episodio/:id/mensajes'),
    3: dict(cortar='comparar_por_palabra_completa', lineas=[
        '! Sin coincidencias: el filtro autoriza el envio',
        f'{FILT} --> {API}: return (permitido)',
        f'{API} -> {CIF}: cifrar(contenido)',
        f'{CIF} --> {API}: return (texto cifrado)',
        *insertar('guardar_mensaje_cifrado(remitente_usuario_id, episodio_id)', 'Mensaje_Chat'),
        f'{API} --> V: return (HTTP 201 Created: mensaje enviado)',
        'V --> A: mostrar_la_confirmacion_de_envio()',
        '! En un envio posterior con un termino restringido, el filtro vuelve a actuar',
        'A -> V: enviar_otro_texto(contenido)'],
        reanudar='POST /clinica/episodio/:id/mensajes'),
    4: dict(cortar='POST /clinica/episodio/:id/mensajes', lineas=[
        '! Se pierde la conexion mientras se evalua el texto',
        f'{API} --> V: return (tiempo de espera agotado)',
        'V ->> V: retener_el_texto_en_el_telefono()',
        'V --> A: mostrar_el_texto_pendiente_de_envio()',
        'A -> V: volver_con_senal()'],
        reanudar='POST /clinica/episodio/:id/mensajes'),
}

CU57 = dict(id='CU57', nombre='Filtrando automáticamente contenido restringido', actores=TRES,
  vistas={'Paciente': 'V_Chat_Clinico', 'Profesional': 'V_Chat_Clinico', 'Administrador': 'V_Terminos_Restringidos'},
  participantes=[ACTOR, VISTA, *capa(FILT, CIF),
                 *T('Episodio_Clinico', 'Palabra_Restringida', 'Mensaje_Chat', 'Bitacora_Auditoria')],
  principal={'Paciente': CU57_EMISOR, 'Profesional': CU57_EMISOR, 'Administrador': CU57_ADMIN},
  excepciones={
    'Administrador': {
      1: dict(cortar='validar_largo_minimo_del_termino', lineas=[
          '! El termino esta vacio o tiene menos de dos caracteres',
          f'{API} --> V: return (HTTP 400 TERMINO_INVALIDO)',
          'V --> A: pedir_un_termino_valido()',
          'A -> V: corregir_el_termino(termino, categoria)'],
          reanudar='POST /parametros/palabras-restringidas'),
    },
    'Paciente': EXC_EMISOR,
    'Profesional': EXC_EMISOR,
  })

if __name__ == '__main__':
    salida = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    chrome = chrome_path()
    total = 0
    for cu in (CU53, CU57):
        verificar_participantes(cu)
        ruta, n = generar_cu(cu, os.path.join(salida, cu['id']), chrome, png='--sin-png' not in sys.argv)
        total += n
        print(f"{cu['id']}: {n} paginas -> {os.path.relpath(ruta, salida)}")
    print('total:', total)
