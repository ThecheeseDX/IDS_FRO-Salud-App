# -*- coding: utf-8 -*-
"""Líneas de vida de los diagramas del Incremento 4: los componentes del
diagrama de componentes (sin agruparlos) y los servicios externos.

Orden en cada diagrama: actor, vista, C_API_REST, componentes internos que
participan, C_API_Adapter, capa de datos, MySQL y, al final, los externos."""

def P(id, nombre, tipo):
    return {'id': id, 'nombre': nombre, 'tipo': tipo}

def ACTOR(nombre): return P('A', nombre, 'actor')
def VISTA(nombre): return P('V', nombre, 'vista')

API = P('API', 'C_API_REST', 'api')
DAO = P('DAO', 'C_Capa_de_Acceso_a_Datos', 'dao')
SQL = P('SQL', 'C_MYSQL', 'sql')
ADP = P('ADP', 'C_API_Adapter', 'adapter')

# Componentes internos (Diagrama de Componentes del Incremento 4)
DESP = P('DESP', 'C_Despachador_Notificaciones', 'comp')
ACC = P('ACC', 'C_Control_Acceso_Clinico', 'comp')
PRES = P('PRES', 'C_Validador_Presencialidad', 'comp')
AGE = P('AGE', 'C_Motor_Agendamiento', 'comp')
MCL = P('MCL', 'C_Motor_Clinico', 'comp')
REF = P('REF', 'C_Motor_Refuerzos', 'comp')
ESC = P('ESC', 'C_Escalador_Eventos_Criticos', 'comp')
FILT = P('FILT', 'C_Filtro_Contenido', 'comp')
CIF = P('CIF', 'C_Cifrado_Mensajeria', 'comp')
ALTA = P('ALTA', 'C_Gestor_Alta_Clinica', 'comp')
CONT = P('CONT', 'C_Gestor_Contingencia', 'comp')
INF = P('INF', 'C_Generador_Informes', 'comp')

# Servicios externos (solo hablan con C_API_Adapter)
CLOUD = P('CLOUD', 'S_Cloudinary', 'externo')
BONOS = P('BONOS', 'S_Bonos_Electronicos', 'externo')


def db(de, accion, sql, resultado, vuelta):
    """Ida y vuelta por la capa de datos: de -> DAO -> MySQL -> DAO -> de."""
    return [f'{de} -> DAO: {accion}', f'DAO -> SQL: {sql}', f'SQL --> DAO: {resultado}', f'DAO --> {de}: {vuelta}']

def aviso(de, texto):
    """Los avisos se dibujan como referencia al CU52 sobre el despachador."""
    return [f'ref {de}..DESP: {texto}']
