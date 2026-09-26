"""Participantes y atajos compartidos por todas las tandas.

Convenciones acordadas con el equipo (ejemplos CU20 y CU40):
- Orden de lifelines: actor, vistas, C_API_REST y demas controladores,
  C_Capa_de_Acceso_a_Datos, C_MYSQL y, al final, las tablas.
- Toda llamada baja peldaño a peldaño y vuelve por el mismo camino.
- SQL sin marcadores «?» ni WHERE: operacion, tabla y columnas.
"""

def P(id, tipo='comp', nombre=None):
    return {'id': id, 'nombre': nombre or id, 'tipo': tipo}

ACTOR = P('A', 'actor')
VISTA = P('V', 'vista')
API, DAO, SQL = 'C_API_REST', 'C_Capa_de_Acceso_a_Datos', 'C_MYSQL'
SEG, ADP = 'C_Seguridad_JWT_BCrypt', 'C_API_Adapter'
BREVO, CLOUD = 'C_API_Brevo', 'C_API_Cloudinary'
TRES = ['Paciente', 'Profesional', 'Administrador']

EXTERNOS = {BREVO, CLOUD, 'C_API_Transacciones', 'C_API_Bonos_Electronicos', 'Proveedor_Externo'}

def capa(*controladores):
    """C_API_REST, los controladores y las APIs externas, la capa de datos y MySQL.

    El orden del equipo es: actor, vistas, controladores (incluidas las APIs
    externas, que cuelgan del adaptador), capa de acceso a datos, MySQL y, al
    final, las tablas."""
    return [P(API), *[P(c, 'externo' if c in EXTERNOS else 'comp') for c in controladores], P(DAO), P(SQL)]

def T(*tablas): return [P(t, 'tabla') for t in tablas]

# ── tramos de la capa de datos (DAO -> MySQL -> tabla -> MySQL -> DAO) ──
def q(tabla, columnas, resultado='resultado'):
    return [f'{DAO} -> {SQL}: ejecutar_consulta(SELECT)', f'{SQL} -> {tabla}: SELECT {columnas} FROM {tabla}',
            f'{tabla} --> {SQL}: return ({resultado})', f'{SQL} --> {DAO}: return (resultado)']
def upd(tabla, columnas):
    return [f'{DAO} -> {SQL}: ejecutar_actualizacion(UPDATE)', f'{SQL} -> {tabla}: UPDATE {tabla} SET {columnas}',
            f'{tabla} --> {SQL}: confirmacion_update', f'{SQL} --> {DAO}: return (Filas afectadas)']
def ins(tabla, detalle=''):
    return [f'{DAO} -> {SQL}: ejecutar_insercion(INSERT)', f'{SQL} -> {tabla}: INSERT INTO {tabla}{detalle} VALUES (...)',
            f'{tabla} --> {SQL}: confirmacion_insert', f'{SQL} --> {DAO}: return (Filas afectadas)']

# ── viajes completos desde C_API_REST (ida y vuelta) ──
def bloque(llamada, tramos, retorno):
    return [f'{API} -> {DAO}: {llamada}', *[l for t in tramos for l in t], f'{DAO} --> {API}: {retorno}']
def leer(llamada, tabla, columnas, resultado, retorno):
    return bloque(llamada, [q(tabla, columnas, resultado)], retorno)
def actualizar(llamada, tabla, columnas, retorno='return (Exito_Persistencia)'):
    return bloque(llamada, [upd(tabla, columnas)], retorno)
def insertar(llamada, tabla, detalle='', retorno='return (Exito_Persistencia)'):
    return bloque(llamada, [ins(tabla, detalle)], retorno)
def begin():
    return bloque('abrir_transaccion()', [[f'{DAO} -> {SQL}: ejecutar(BEGIN)', f'{SQL} --> {DAO}: return (transaccion iniciada)']], 'return (transaccion abierta)')
def commit():
    return bloque('confirmar_transaccion()', [[f'{DAO} -> {SQL}: ejecutar(COMMIT)', f'{SQL} --> {DAO}: return (commit exitoso)']], 'return (cambios confirmados)')
def rollback():
    return bloque('revertir_transaccion()', [[f'{DAO} -> {SQL}: ejecutar(ROLLBACK)', f'{SQL} --> {DAO}: return (transaccion revertida)']], 'return (cambios revertidos)')
def externo(llamada, servicio, peticion, respuesta, retorno):
    return [f'{API} -> {ADP}: {llamada}', f'{ADP} -> {servicio}: {peticion}', f'{servicio} --> {ADP}: {respuesta}', f'{ADP} --> {API}: {retorno}']

# ── fallos que desandan el camino ──
def fallo_bd(tabla, causa='error de escritura'):
    return [f'{tabla} --> {SQL}: {causa}', f'{SQL} --> {DAO}: throw (SQLException)', f'{DAO} --> {API}: return (Fallo_Persistencia)']
def vacio(tabla, texto, retorno_dao):
    """La tabla responde sin filas: desanda hasta C_API_REST."""
    return [f'{tabla} --> {SQL}: return ({texto})', f'{SQL} --> {DAO}: return (resultado)', f'{DAO} --> {API}: return ({retorno_dao})']

# ═════════════════════════ Incremento 3 ═════════════════════════════════════
# Componentes internos nuevos del Diagrama de Componentes del Incremento 3.
MAG  = 'C_Motor_Agendamiento'
PROG = 'C_Programador_Agenda'
DESP = 'C_Despachador_Notificaciones'
MCL  = 'C_Motor_Clinico'
FILT = 'C_Filtro_Contenido'
CIF  = 'C_Cifrado_Mensajeria'
INF  = 'C_Generador_Informes'
EXPO = 'C_API_Expo_Push'
EXTERNOS.add(EXPO)

# Regla 5: solo componentes que existen en el Diagrama de Componentes.
PERMITIDOS = {API, DAO, SQL, SEG, ADP, MAG, PROG, DESP, MCL, FILT, CIF, INF, *EXTERNOS}

def _tablas_del_esquema():
    import os, re
    raiz = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'fro-controlador'))
    txt = open(os.path.join(raiz, 'src', 'database', 'mysql', 'schema.sql'), encoding='utf-8').read()
    txt += open(os.path.join(raiz, 'scripts', 'migrar-db.js'), encoding='utf-8').read()
    return set(re.findall(r'CREATE TABLE(?: IF NOT EXISTS)?\s+`?(\w+)`?', txt))
TABLAS_REALES = _tablas_del_esquema()

def verificar_participantes(cu):
    """Aborta si un CU usa un componente fuera del diagrama o una tabla inexistente."""
    malos = []
    for p in cu['participantes']:
        if p['tipo'] in ('comp', 'externo') and p['nombre'] not in PERMITIDOS:
            malos.append(f"componente fuera del diagrama: {p['nombre']}")
        if p['tipo'] == 'tabla' and p['nombre'] not in TABLAS_REALES:
            malos.append(f"tabla inexistente: {p['nombre']}")
    if malos:
        raise ValueError(f"{cu['id']}: " + '; '.join(malos))

# ── Viajes a la capa de datos desde cualquier controlador (no solo C_API_REST) ──
def bloque_de(origen, llamada, tramos, retorno):
    return [f'{origen} -> {DAO}: {llamada}', *[l for t in tramos for l in t], f'{DAO} --> {origen}: {retorno}']
def leer_de(origen, llamada, tabla, columnas, resultado, retorno):
    return bloque_de(origen, llamada, [q(tabla, columnas, resultado)], retorno)
def actualizar_de(origen, llamada, tabla, columnas, retorno='return (Exito_Persistencia)'):
    return bloque_de(origen, llamada, [upd(tabla, columnas)], retorno)
def insertar_de(origen, llamada, tabla, detalle='', retorno='return (Exito_Persistencia)'):
    return bloque_de(origen, llamada, [ins(tabla, detalle)], retorno)
def externo_de(origen, llamada, servicio, peticion, respuesta, retorno):
    return [f'{origen} -> {ADP}: {llamada}', f'{ADP} -> {servicio}: {peticion}', f'{servicio} --> {ADP}: {respuesta}', f'{ADP} --> {origen}: {retorno}']

def despachar(origen, tipo, destinatario, correo=None, retorno='return (aviso despachado)',
              ret_centro='return (aviso guardado en la app)'):
    """CU52: todo aviso pasa por el despachador. Siempre queda en el centro de
    notificaciones (Notificacion); si el aviso lo pide, además sale por correo
    (Brevo) a través del adaptador. El detalle de preferencias y push se
    dibuja completo en el CU52; aquí va la forma corta."""
    lineas = [f'{origen} -> {DESP}: despachar({tipo}, {destinatario})',
              *insertar_de(DESP, f'guardar_en_centro_de_notificaciones({tipo})', 'Notificacion', f' ({tipo})', ret_centro)]
    if correo:
        lineas += externo_de(DESP, f'enviar_correo({correo})', BREVO, 'POST /v3/smtp/email',
                             'return (HTTP 201 Aceptado)', 'return (correo aceptado)')
    return lineas + [f'{DESP} --> {origen}: {retorno}']
