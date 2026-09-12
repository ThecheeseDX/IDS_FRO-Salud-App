import sys; sys.path.insert(0, '.')
from motor import generar_cu, chrome_path

def P(id, tipo='comp', nombre=None): return {'id': id, 'nombre': nombre or id, 'tipo': tipo}
ACTOR = P('A', 'actor')
BASE = [P('C_API_REST'), P('C_Capa_de_Acceso_a_Datos'), P('C_MYSQL')]
API, DAO, SQL = 'C_API_REST', 'C_Capa_de_Acceso_a_Datos', 'C_MYSQL'

def q(tabla, sql, retorno='filas'):
    return [f'{DAO} -> {SQL}: ejecutar_consulta(SELECT)', f'{SQL} -> {tabla}: {sql}',
            f'{tabla} --> {SQL}: return ({retorno})', f'{SQL} --> {DAO}: return (resultado)']
def upd(tabla, sql):
    return [f'{DAO} -> {SQL}: ejecutar_actualizacion(SQL)', f'{SQL} -> {tabla}: {sql}',
            f'{tabla} --> {SQL}: confirmacion_update', f'{SQL} --> {DAO}: return (Filas afectadas)']
def ins(tabla, sql):
    return [f'{DAO} -> {SQL}: ejecutar_insercion(SQL)', f'{SQL} -> {tabla}: {sql}',
            f'{tabla} --> {SQL}: confirmacion_insert', f'{SQL} --> {DAO}: return (Filas afectadas)']
def fallo_bd(tabla, causa='error de escritura'):
    return [f'{tabla} --> {SQL}: {causa}', f'{SQL} --> {DAO}: throw (SQLException)', f'{DAO} --> {API}: return (Fallo_Persistencia)']

TRES = ['Paciente', 'Profesional', 'Administrador']

# ───────────────────────────── CU06 ─────────────────────────────
V = 'V_Recuperar_Contrasena'
CU06 = dict(id='CU06', nombre='Solicitando restablecimiento de credenciales', actores=TRES,
  participantes=[ACTOR, P(V, 'vista'), *BASE, P('Usuario', 'tabla'), P('S_Correo_Brevo', 'externo')],
  principal=[
    f'A -> {V}: acceder_olvide_mi_contrasena()',
    f'{V} --> A: despliega_formulario_correo()',
    f'A -> {V}: ingresar_correo(email)',
    f'{V} ->> {V}: validar_formato_correo()',
    f'{V} -> {API}: POST /auth/recuperar/solicitar (email)',
    f'{API} -> {DAO}: buscar_usuario_por_email(email)',
    *q('Usuario', 'SELECT usuario_id, email FROM Usuario WHERE email = ?', '1 coincidencia'),
    f'{DAO} --> {API}: return (usuario)',
    f'{API} ->> {API}: generar_otp(6 digitos, vigencia 10 min)',
    f'{API} -> {DAO}: guardar_otp(usuario_id, codigo, expiracion)',
    *upd('Usuario', 'UPDATE Usuario SET otp_codigo = ?, otp_expiracion = ? WHERE usuario_id = ?'),
    f'{DAO} --> {API}: return (Exito_Persistencia)',
    f'{API} -> S_Correo_Brevo: enviar_correo(email, codigo_otp)',
    f'S_Correo_Brevo --> {API}: return (HTTP 201 Aceptado)',
    f'{API} --> {V}: return (HTTP 200 OK: si el correo existe se envio un codigo)',
    f'{V} --> A: mostrar_mensaje_codigo_enviado()',
  ],
  excepciones={
    1: dict(cortar='acceder_olvide', lineas=['! Error de redireccionamiento interno del enlace de recuperacion',
        f'{V} ->> {V}: registrar_fallo_navegacion()', f'{V} --> A: mostrar_servicio_no_disponible_momentaneamente()',
        f'A -> {V}: reintentar_acceso_pasados_unos_minutos()'], reanudar='despliega_formulario'),
    2: dict(cortar='acceder_olvide', lineas=['! Sin conexion con el servidor de aplicaciones: tiempo de espera agotado',
        f'{V} --> A: mostrar_alerta_tiempo_espera_agotado()', f'A -> {V}: recargar_aplicacion()'], reanudar='despliega_formulario'),
    3: dict(cortar='validar_formato_correo', lineas=['! Dominio de correo invalido o incompleto',
        f'{V} --> A: bloquear_envio_y_resaltar_error_sintactico()', f'A -> {V}: corregir_correo(email)'], reanudar='validar_formato_correo'),
    4: dict(cortar='SELECT usuario_id, email', lineas=[f'Usuario --> {SQL}: return (0 coincidencias)', f'{SQL} --> {DAO}: return (vacio)',
        f'{DAO} --> {API}: return (null)', '! Correo no registrado: se simula el despacho para evitar enumeracion de usuarios',
        f'{API} ->> {API}: omitir_envio_de_codigo()',
        f'{API} --> {V}: return (HTTP 200 OK: si el correo existe se envio un codigo)', f'{V} --> A: mostrar_mensaje_codigo_enviado()'],
        reanudar='ingresar_correo'),
  })

# ───────────────────────────── CU07 ─────────────────────────────
CU07 = dict(id='CU07', nombre='Ejecutando cambio de contraseña', actores=TRES,
  participantes=[ACTOR, P(V, 'vista'), *BASE, P('Usuario', 'tabla'), P('Sesion_Usuario', 'tabla'), P('Bitacora_Auditoria', 'tabla')],
  principal=[
    f'A -> {V}: ingresar_codigo_otp(codigo)',
    f'{V} ->> {V}: validar_mascara_numerica(codigo)',
    f'{V} ->> {V}: comprobar_vigencia_local(10 min)',
    f'{V} --> A: habilitar_formulario_nueva_contrasena()',
    f'A -> {V}: escribir_nueva_contrasena(nueva_contrasena, confirmacion)',
    f'{V} ->> {V}: validar_robustez_contrasena(8+, letra, numero, simbolo)',
    f'{V} -> {API}: POST /auth/recuperar/confirmar (email, codigo, nueva_contrasena)',
    f'{API} -> {DAO}: obtener_usuario_y_otp(email)',
    *q('Usuario', 'SELECT usuario_id, otp_codigo, otp_expiracion FROM Usuario WHERE email = ?', '1 registro'),
    f'{DAO} --> {API}: return (usuario)',
    f'{API} ->> {API}: comparar_codigo_y_vigencia(codigo)',
    f'{API} ->> {API}: validar_robustez_contrasena()',
    f'{API} ->> {API}: cifrar_contrasena_hash(bcrypt)',
    f'{API} -> {DAO}: actualizar_contrasena(usuario_id, hash)',
    *upd('Usuario', 'UPDATE Usuario SET contrasena_hash = ?, otp_codigo = NULL, otp_expiracion = NULL WHERE usuario_id = ?'),
    f'{DAO} --> {API}: return (Exito_Persistencia)',
    f'{API} -> {DAO}: revocar_todas_las_sesiones(usuario_id)',
    *upd('Sesion_Usuario', 'UPDATE Sesion_Usuario SET activa = FALSE WHERE usuario_id = ?'),
    f'{DAO} --> {API}: return (Sesiones revocadas)',
    f'{API} -> {DAO}: registrar_auditoria(CONTRASENA_CAMBIADA, usuario_id, ip)',
    *ins('Bitacora_Auditoria', 'INSERT INTO Bitacora_Auditoria VALUES (...)'),
    f'{DAO} --> {API}: return (Exito_Persistencia)',
    f'{API} --> {V}: return (HTTP 200 OK: contrasena actualizada)',
    f'{V} --> A: mostrar_exito_y_redirigir_a_inicio_sesion()',
  ],
  excepciones={
    1: dict(cortar='validar_mascara_numerica', lineas=['! Caracteres alfabeticos en un campo que solo admite digitos',
        f'{V} --> A: bloquear_entrada_con_mascara_de_validacion()', f'A -> {V}: corregir_codigo_solo_digitos(codigo)'], reanudar='validar_mascara_numerica'),
    2: dict(cortar='comparar_codigo_y_vigencia', lineas=['! El codigo no coincide con el registro activo o expiro',
        f'{API} --> {V}: return (HTTP 400 CODIGO_INVALIDO)', f'{V} --> A: mostrar_alerta_codigo_invalido()',
        f'A -> {V}: solicitar_reenvio_codigo()', f'{V} -> {API}: POST /auth/recuperar/solicitar (email)',
        f'{API} --> {V}: return (HTTP 200 OK: nuevo codigo enviado)', f'{V} --> A: mostrar_mensaje_codigo_enviado()'],
        reanudar='ingresar_codigo_otp'),
    3: dict(cortar='validar_robustez_contrasena(8+', lineas=['! Contrasena sin la robustez exigida (8+ caracteres, letras, numeros y un simbolo)',
        f'{V} --> A: resaltar_requisitos_incumplidos_y_deshabilitar_confirmar()', f'A -> {V}: modificar_contrasena(nueva_contrasena)'], reanudar='validar_robustez_contrasena(8+'),
    4: dict(cortar='UPDATE Usuario SET contrasena_hash', lineas=[*fallo_bd('Usuario', 'interrupcion de conexion'),
        '! Interrupcion de la comunicacion con el servidor de datos durante el guardado',
        f'{API} ->> {API}: registrar_fallo_de_persistencia()', f'{API} --> {V}: return (HTTP 500: operacion no completada)',
        f'{V} --> A: notificar_operacion_no_completada()', f'A -> {V}: reintentar_envio_formulario()'], reanudar='POST /auth/recuperar/confirmar'),
  })

# ───────────────────────────── CU08 ─────────────────────────────
V = 'V_Seguridad_Cuenta'
CU08 = dict(id='CU08', nombre='Gestionando sesiones y tokens de acceso', actores=TRES,
  participantes=[ACTOR, P(V, 'vista'), *BASE, P('Sesion_Usuario', 'tabla')],
  principal=[
    f'A -> {V}: acceder_seguridad_de_la_cuenta()',
    f'{V} -> {API}: GET /auth/sesiones',
    f'{API} -> {DAO}: listar_sesiones_activas(usuario_id)',
    *q('Sesion_Usuario', 'SELECT sesion_id, jti, dispositivo, ip, creada_en FROM Sesion_Usuario WHERE usuario_id = ? AND activa = TRUE', 'N sesiones'),
    f'{DAO} --> {API}: return (sesiones)',
    f'{API} ->> {API}: marcar_sesion_actual(jti del token)',
    f'{API} --> {V}: return (HTTP 200 OK: lista de sesiones)',
    f'{V} --> A: desplegar_sesiones_activas(dispositivo, ip, fecha_inicio)',
    f'A -> {V}: revocar_sesion(sesion_id)',
    f'{V} -> {API}: POST /auth/sesiones/:id/cerrar',
    f'{API} -> {DAO}: desactivar_sesion(sesion_id, usuario_id)',
    *upd('Sesion_Usuario', 'UPDATE Sesion_Usuario SET activa = FALSE WHERE sesion_id = ? AND usuario_id = ?'),
    f'{DAO} --> {API}: return (Exito_Persistencia)',
    f'{API} --> {V}: return (HTTP 200 OK: sesion cerrada)',
    f'{V} --> A: actualizar_lista_sin_el_dispositivo()',
  ],
  excepciones={
    1: dict(cortar='acceder_seguridad', lineas=['! Error de ruteo en la aplicacion al abrir los ajustes de seguridad',
        f'{V} --> A: mostrar_error_de_navegacion()', f'A -> {V}: recargar_aplicacion()'], reanudar='acceder_seguridad'),
    2: dict(cortar='SELECT sesion_id', lineas=[f'Sesion_Usuario --> {SQL}: tiempo de espera agotado', f'{SQL} --> {DAO}: throw (SQLException)',
        f'{DAO} --> {API}: return (Fallo_Consulta)', '! El servicio de identidades no logra recuperar las sesiones',
        f'{API} --> {V}: return (HTTP 500: sesiones no disponibles)', f'{V} --> A: mostrar_advertencia_dispositivos_no_disponibles()',
        f'A -> {V}: presionar_actualizar_manualmente()'], reanudar='GET /auth/sesiones'),
    3: dict(cortar='UPDATE Sesion_Usuario SET activa = FALSE WHERE sesion_id', lineas=[f'Sesion_Usuario --> {SQL}: confirmacion_update (0 filas)',
        f'{SQL} --> {DAO}: return (0 filas afectadas)', f'{DAO} --> {API}: return (Sesion_No_Activa)',
        '! La sesion ya habia expirado o fue cerrada mientras se veia la lista',
        f'{API} --> {V}: return (HTTP 404 SESION_NO_ACTIVA)', f'{V} --> A: notificar_sesion_ya_no_activa()',
        f'{V} -> {API}: GET /auth/sesiones', f'{API} --> {V}: return (HTTP 200 OK: lista actualizada)',
        f'{V} --> A: refrescar_vista_removiendo_dispositivo()'],
        reanudar='revocar_sesion'),
    4: dict(cortar='UPDATE Sesion_Usuario SET activa = FALSE WHERE sesion_id', lineas=[*fallo_bd('Sesion_Usuario'),
        '! Falla de persistencia al desactivar el registro de sesion',
        f'{API} ->> {API}: registrar_excepcion()', f'{API} --> {V}: return (HTTP 500: reintente la operacion)',
        f'{V} --> A: solicitar_reintento()', f'A -> {V}: revocar_sesion(sesion_id)'], reanudar='POST /auth/sesiones/:id/cerrar'),
  })

# ───────────────────────────── CU09 ─────────────────────────────
CU09 = dict(id='CU09', nombre='Configurando privacidad de datos de contacto', actores=['Paciente'],
  participantes=[ACTOR, P(V, 'vista'), *BASE, P('Paciente', 'tabla'), P('Bitacora_Auditoria', 'tabla')],
  principal=[
    f'A -> {V}: abrir_modulo_privacidad()',
    f'{V} -> {API}: GET /auth/privacidad',
    f'{API} -> {DAO}: obtener_privacidad(usuario_id)',
    *q('Paciente', 'SELECT privacidad_contacto FROM Paciente WHERE usuario_id = ?', '1 registro'),
    f'{DAO} --> {API}: return (privacidad_contacto)',
    f'{API} --> {V}: return (HTTP 200 OK: mostrar_direccion, mostrar_telefono)',
    f'{V} --> A: desplegar_matriz_de_visibilidad()',
    f'A -> {V}: ajustar_interruptores(mostrar_direccion, mostrar_telefono)',
    f'A -> {V}: guardar_preferencias()',
    f'{V} -> {API}: PUT /auth/privacidad (mostrar_direccion, mostrar_telefono)',
    f'{API} ->> {API}: validar_valores_booleanos()',
    f'{API} -> {DAO}: actualizar_privacidad(usuario_id, preferencias)',
    *upd('Paciente', 'UPDATE Paciente SET privacidad_contacto = ? WHERE usuario_id = ?'),
    f'{DAO} --> {API}: return (Exito_Persistencia)',
    f'{API} -> {DAO}: registrar_auditoria(PRIVACIDAD_ACTUALIZADA, usuario_id, ip)',
    *ins('Bitacora_Auditoria', 'INSERT INTO Bitacora_Auditoria VALUES (...)'),
    f'{DAO} --> {API}: return (Exito_Persistencia)',
    f'{API} --> {V}: return (HTTP 200 OK: preferencias guardadas)',
    f'{V} --> A: mostrar_preferencias_guardadas()',
  ],
  excepciones={
    1: dict(cortar='abrir_modulo_privacidad', lineas=['! Modulo de privacidad no disponible por falla del servidor de aplicaciones',
        f'{V} --> A: mostrar_error_de_carga_de_componente()', f'A -> {V}: recargar_aplicacion()'], reanudar='abrir_modulo_privacidad'),
    2: dict(cortar='return (HTTP 200 OK: mostrar_direccion', lineas=['! Fallo de interfaz: los interruptores no se despliegan',
        f'{V} ->> {V}: registrar_error_de_ejecucion()', f'{V} --> A: mostrar_pantalla_incompleta()',
        f'A -> {V}: reiniciar_aplicacion()'], reanudar='abrir_modulo_privacidad'),
    3: dict(cortar='validar_valores_booleanos', lineas=['! Valores invalidos (no booleanos) en las opciones de privacidad',
        f'{API} --> {V}: return (HTTP 400: campo incorrecto)', f'{V} --> A: indicar_campo_incorrecto()',
        f'A -> {V}: ajustar_interruptores(mostrar_direccion, mostrar_telefono)'], reanudar='guardar_preferencias'),
    4: dict(cortar='UPDATE Paciente SET privacidad_contacto', lineas=[*fallo_bd('Paciente'),
        '! Falla critica de persistencia al escribir los cambios',
        f'{API} --> {V}: return (HTTP 500: cambios no guardados)', f'{V} --> A: notificar_no_guardado_y_restaurar_valores_previos()',
        f'A -> {V}: guardar_preferencias()'], reanudar='PUT /auth/privacidad'),
  })

# ───────────────────────────── CU10 ─────────────────────────────
V = 'V_Mi_Perfil_Publico'
CU10 = dict(id='CU10', nombre='Administrando catálogo de perfil profesional', actores=['Profesional'],
  participantes=[ACTOR, P(V, 'vista'), *BASE, P('Profesional', 'tabla'), P('Bitacora_Auditoria', 'tabla'), P('S_Cloudinary', 'externo')],
  principal=[
    f'A -> {V}: abrir_mi_perfil_publico()',
    f'{V} -> {API}: GET /profesionales/mi-perfil',
    f'{API} -> {DAO}: obtener_perfil(usuario_id)',
    *q('Profesional', 'SELECT foto_url, resena_curricular, areas_experticia, tipo_sede FROM Profesional WHERE usuario_id = ?', '1 registro'),
    f'{DAO} --> {API}: return (perfil)',
    f'{API} --> {V}: return (HTTP 200 OK: perfil y limites de formato)',
    f'{V} --> A: mostrar_foto_resena_areas_y_modalidad()',
    f'A -> {V}: seleccionar_fotografia(archivo)',
    f'{V} -> {API}: POST /profesionales/mi-perfil/foto (multipart)',
    f'{API} ->> {API}: validar_extension_y_peso(jpg|png|webp|heic, 5 MB)',
    f'{API} -> S_Cloudinary: subir_imagen(buffer, recorte 600x600)',
    f'S_Cloudinary --> {API}: return (secure_url)',
    f'{API} -> {DAO}: actualizar_foto(usuario_id, url)',
    *upd('Profesional', 'UPDATE Profesional SET foto_url = ? WHERE usuario_id = ?'),
    f'{DAO} --> {API}: return (Exito_Persistencia)',
    f'{API} --> {V}: return (HTTP 200 OK: foto_url)',
    f'{V} --> A: mostrar_nueva_fotografia()',
    f'A -> {V}: redactar_resena_y_areas(resena, areas_experticia)',
    f'{V} ->> {V}: validar_largo_textos(1000 / 255)',
    f'A -> {V}: seleccionar_modalidad(DOMICILIO | ONLINE | AMBOS)',
    f'A -> {V}: guardar_cambios()',
    f'{V} ->> {V}: verificar_modalidad_seleccionada()',
    f'{V} -> {API}: PUT /profesionales/mi-perfil (resena, areas, tipo_sede)',
    f'{API} ->> {API}: validar_limites_y_modalidad()',
    f'{API} -> {DAO}: actualizar_perfil(usuario_id, datos)',
    *upd('Profesional', 'UPDATE Profesional SET resena_curricular = ?, areas_experticia = ?, tipo_sede = ? WHERE usuario_id = ?'),
    f'{DAO} --> {API}: return (Exito_Persistencia)',
    f'{API} -> {DAO}: registrar_auditoria(ACTUALIZACION_PERFIL_PROFESIONAL, usuario_id, ip)',
    *ins('Bitacora_Auditoria', 'INSERT INTO Bitacora_Auditoria VALUES (...)'),
    f'{DAO} --> {API}: return (Exito_Persistencia)',
    f'{API} --> {V}: return (HTTP 200 OK: perfil actualizado)',
    f'{V} --> A: mostrar_perfil_publicado_en_buscador()',
  ],
  excepciones={
    1: dict(cortar='abrir_mi_perfil', lineas=['! Error de comunicacion con el servidor al cargar el modulo',
        f'{V} --> A: mostrar_error_con_opcion_reintentar()', f'A -> {V}: reintentar()'], reanudar='abrir_mi_perfil'),
    2: dict(cortar='SELECT foto_url', lineas=[f'Profesional --> {SQL}: return (0 registros)', f'{SQL} --> {DAO}: return (vacio)',
        f'{DAO} --> {API}: return (null)', '! El perfil profesional no existe en la base de datos',
        f'{API} --> {V}: return (HTTP 404 PERFIL_NO_ENCONTRADO)', f'{V} --> A: informar_perfil_inexistente()',
        f'A ->> A: contactar_al_administrador()',
        f'A -> {V}: reintentar_tras_regularizar_el_perfil()'],
        reanudar='abrir_mi_perfil_publico'),
    3: dict(cortar='validar_extension_y_peso', lineas=['! Formato no permitido o peso superior al maximo definido',
        f'{API} --> {V}: return (HTTP 400 FORMATO_NO_PERMITIDO | 413 FOTO_MUY_PESADA)',
        f'{V} --> A: mostrar_especificaciones_tecnicas_requeridas()', f'A -> {V}: seleccionar_fotografia(archivo_compatible)'], reanudar='POST /profesionales/mi-perfil/foto'),
    4: dict(cortar='validar_largo_textos', lineas=['! La resena o las areas superan el limite de caracteres',
        f'{V} --> A: bloquear_guardado_y_resaltar_campo(limite)', f'A -> {V}: ajustar_longitud_texto(resena, areas_experticia)'], reanudar='validar_largo_textos'),
    5: dict(cortar='verificar_modalidad_seleccionada', lineas=['! Modalidad de atencion obligatoria omitida',
        f'{V} --> A: impedir_guardado_y_senalar_campo_requerido()', f'A -> {V}: seleccionar_modalidad(DOMICILIO | ONLINE | AMBOS)'], reanudar='guardar_cambios'),
    6: dict(cortar='UPDATE Profesional SET resena_curricular', lineas=[*fallo_bd('Profesional'),
        '! Falla de persistencia en la base de datos o en el repositorio de imagenes',
        f'{API} --> {V}: return (HTTP 500: cambios no grabados)', f'{V} --> A: notificar_cambios_no_grabados()',
        f'A -> {V}: guardar_cambios()'], reanudar='PUT /profesionales/mi-perfil'),
  })

# ───────────────────────────── CU79 ─────────────────────────────
V = 'V_Inicio_Sesion'; NAV = 'C_Navegador_App'
CU79 = dict(id='CU79', nombre='Segregando interfaces según rol de acceso', actores=TRES,
  participantes=[ACTOR, P(V, 'vista'), P(NAV), *BASE, P('Usuario', 'tabla'), P('Sesion_Usuario', 'tabla'), P('Bitacora_Auditoria', 'tabla')],
  principal=[
    f'A -> {V}: ingresar_credenciales(rut, contrasena)',
    f'{V} -> {API}: POST /auth/login (rut, contrasena)',
    f'{API} -> {DAO}: obtener_usuario_y_rol(rut)',
    *q('Usuario', 'SELECT u.usuario_id, u.contrasena_hash, r.nombre_rol FROM Usuario u JOIN Rol r ON r.rol_id = u.rol_id WHERE u.rut = ?', '1 registro'),
    f'{DAO} --> {API}: return (usuario, rol)',
    f'{API} ->> {API}: comparar_hashes(contrasena, contrasena_hash)',
    f'{API} ->> {API}: generar_jwt(usuario_id, rol, jti)',
    f'{API} -> {DAO}: registrar_sesion(jti, dispositivo, ip)',
    *ins('Sesion_Usuario', 'INSERT INTO Sesion_Usuario VALUES (...)'),
    f'{DAO} --> {API}: return (Exito_Persistencia)',
    f'{API} --> {V}: return (HTTP 200 OK: token, rol = {{A}})',
    f'{V} -> {NAV}: almacenar_token_y_rol()',
    f'{NAV} ->> {NAV}: decodificar_payload_jwt(rol)',
    f'{NAV} ->> {NAV}: seleccionar_pila_de_pantallas({{A}})',
    f'{NAV} --> A: renderizar_panel_{{A}}()',
    f'A -> {NAV}: navegar_a_modulo(ruta habilitada)',
    f'{NAV} -> {API}: GET /recurso (Authorization: Bearer token)',
    f'{API} ->> {API}: verifyToken() y authorizeRoles([{{A}}])',
    f'{API} -> {DAO}: verificar_sesion_activa(jti)',
    *q('Sesion_Usuario', 'SELECT activa FROM Sesion_Usuario WHERE jti = ?', 'activa = TRUE'),
    f'{DAO} --> {API}: return (sesion vigente)',
    f'{API} --> {NAV}: return (HTTP 200 OK: datos del modulo)',
    f'{NAV} --> A: mostrar_modulo_habilitado()',
  ],
  excepciones={
    1: dict(cortar='comparar_hashes', lineas=['! Credenciales incorrectas',
        f'{API} -> {DAO}: registrar_login_fallido(rut, ip)', *ins('Bitacora_Auditoria', "INSERT INTO Bitacora_Auditoria (accion = 'LOGIN_FALLIDO') VALUES (...)"),
        f'{DAO} --> {API}: return (Exito_Persistencia)',
        f'{API} --> {V}: return (HTTP 401: credenciales invalidas)', f'{V} --> A: mostrar_error_de_credenciales()',
        f'A -> {V}: reintentar_ingreso(rut, contrasena)'], reanudar='POST /auth/login'),
    2: dict(cortar='GET /recurso', lineas=[f'{API} ->> {API}: verificar_firma_jwt(token)', '! Token JWT adulterado: la firma no coincide',
        f'{API} -> {DAO}: revocar_sesion(jti)', *upd('Sesion_Usuario', 'UPDATE Sesion_Usuario SET activa = FALSE WHERE jti = ?'),
        f'{DAO} --> {API}: return (Sesion revocada)',
        f'{API} --> {NAV}: return (HTTP 401 TOKEN_INVALIDO)', f'{NAV} ->> {NAV}: limpiar_credenciales_locales()',
        f'{NAV} --> A: forzar_cierre_de_sesion()', f'A ->> A: contactar_soporte_tecnico()'],
        reanudar='ingresar_credenciales'),
    3: dict(cortar='verifyToken() y authorizeRoles', lineas=['! Recurso reservado a otro rol',
        f'{API} -> {DAO}: registrar_bloqueo_rbac(usuario_id, ruta)', *ins('Bitacora_Auditoria', "INSERT INTO Bitacora_Auditoria (accion = 'BLOQUEO_ACCESO_RBAC') VALUES (...)"),
        f'{DAO} --> {API}: return (Exito_Persistencia)',
        f'{API} --> {NAV}: return (HTTP 403: privilegios insuficientes)', f'{NAV} --> A: redirigir_al_panel_de_inicio()'],
        reanudar='navegar_a_modulo'),
    4: dict(cortar='SELECT activa FROM Sesion_Usuario', lineas=[f'Sesion_Usuario --> {SQL}: return (activa = FALSE o token expirado)',
        f'{SQL} --> {DAO}: return (resultado)', f'{DAO} --> {API}: return (sesion revocada)',
        '! Token expirado o sesion cerrada desde otro dispositivo',
        f'{API} --> {NAV}: return (HTTP 401 SESION_REVOCADA)', f'{NAV} ->> {NAV}: eliminar_token_local()',
        f'{NAV} --> A: cerrar_sesion_con_aviso()', f'A -> {V}: ingresar_credenciales(rut, contrasena)'], reanudar='POST /auth/login'),
  })

if __name__ == '__main__':
    import os
    chrome = chrome_path()
    salida = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'salida')
    total = 0
    for cu in [CU06, CU07, CU08, CU09, CU10, CU79]:
        ruta, n = generar_cu(cu, os.path.join(salida, cu['id']), chrome=chrome, png=True)
        total += n; print(f"{cu['id']}: {n} paginas -> {ruta}")
    print('total paginas', total)
