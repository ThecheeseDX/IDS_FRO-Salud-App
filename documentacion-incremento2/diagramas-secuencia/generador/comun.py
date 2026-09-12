"""Participantes y atajos SQL compartidos por las tandas de diagramas.

Formato de SQL acordado con el equipo (desde la tanda 2): se muestran la
operación, la tabla y las columnas, sin marcadores de parámetro «?» y sin
la cláusula WHERE.
"""

def P(id, tipo='comp', nombre=None):
    return {'id': id, 'nombre': nombre or id, 'tipo': tipo}

ACTOR = P('A', 'actor')
VISTA = P('V', 'vista')          # se reemplaza por la vista de cada actor
API = 'C_API_REST'
DAO = 'C_Capa_de_Acceso_a_Datos'
SQL = 'C_MYSQL'
BASE = [P(API), P(DAO), P(SQL)]
TRES = ['Paciente', 'Profesional', 'Administrador']

def q(tabla, columnas, retorno='resultado'):
    """Consulta: DAO → MySQL → tabla → vuelta."""
    return [f'{DAO} -> {SQL}: ejecutar_consulta(SELECT)',
            f'{SQL} -> {tabla}: SELECT {columnas} FROM {tabla}',
            f'{tabla} --> {SQL}: return ({retorno})',
            f'{SQL} --> {DAO}: return (resultado)']

def upd(tabla, columnas):
    return [f'{DAO} -> {SQL}: ejecutar_actualizacion(UPDATE)',
            f'{SQL} -> {tabla}: UPDATE {tabla} SET {columnas}',
            f'{tabla} --> {SQL}: confirmacion_update',
            f'{SQL} --> {DAO}: return (Filas afectadas)']

def ins(tabla, detalle=''):
    etiqueta = f'INSERT INTO {tabla}{detalle} VALUES (...)'
    return [f'{DAO} -> {SQL}: ejecutar_insercion(INSERT)',
            f'{SQL} -> {tabla}: {etiqueta}',
            f'{tabla} --> {SQL}: confirmacion_insert',
            f'{SQL} --> {DAO}: return (Filas afectadas)']

def fallo_bd(tabla, causa='error de escritura'):
    return [f'{tabla} --> {SQL}: {causa}',
            f'{SQL} --> {DAO}: throw (SQLException)',
            f'{DAO} --> {API}: return (Fallo_Persistencia)']
