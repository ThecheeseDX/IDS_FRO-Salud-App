# -*- coding: utf-8 -*-
"""Líneas de vida comunes de los diagramas legibles del Incremento 4."""

def P(id, nombre, tipo='comp'):
    return {'id': id, 'nombre': nombre, 'tipo': tipo}

def ACTOR(nombre):
    return P('A', nombre, 'actor')

def VISTA(nombre):
    return P('V', nombre, 'vista')

# Las capas internas del servidor (C_API_REST, controladores, despachador de
# avisos, capa de acceso a datos) se agrupan en una sola línea de vida.
SERVIDOR = P('S', 'Servidor\nC_API_REST y controladores')
BD = P('BD', 'Base de datos\nC_MYSQL')
CLOUD = P('N', 'S_Cloudinary\nrepositorio de archivos', 'externo')
FINANCIADOR = P('F', 'S_Financiador\nbonos electrónicos', 'externo')
