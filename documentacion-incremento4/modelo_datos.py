# -*- coding: utf-8 -*-
"""
Modelo relacional del Incremento 4 = lo documentado en el Word del Incremento 3
(base-modelo-inc3.json, extraído de su anexo) + los cambios del Incremento 4.

Marcas en las listas resultantes:
  +Tabla (...)   tabla nueva del Incremento 4
  {+atributo}    atributo nuevo en una tabla existente
Los atributos que salen en 3FN se explican en JUSTIFICACION_3FN.
"""
import json, os, re

AQUI = os.path.dirname(os.path.abspath(__file__))
BASE = json.load(open(os.path.join(AQUI, 'base-modelo-inc3.json'), encoding='utf-8'))


def _partir(linea):
    nombre, cuerpo = linea.split(' (', 1)
    cuerpo = cuerpo.rsplit(')', 1)[0]
    partes, nivel, actual = [], 0, ''
    for c in cuerpo:
        if c == '{': nivel += 1
        if c == '}': nivel -= 1
        if c == ',' and nivel == 0:
            partes.append(actual.strip()); actual = ''
        else:
            actual += c
    if actual.strip(): partes.append(actual.strip())
    return nombre, partes


def _armar(nombre, attrs):
    return f'{nombre} ({", ".join(attrs)})'


def _es_fk(a):
    return a.endswith('_id') or a in ('administrador_id', 'acusado_por', 'asignado_a', 'emitida_por')


# Atributos nuevos por tabla: (atributo, es_clave_foranea)
NUEVOS_COMUNES = {
    'Paciente': [('foto_url', False)],
    'Episodio_Clinico': [('preparacion_alta_en', False), ('pautas_continuidad', False),
                         ('informe_alta_emitido_en', False), ('informe_alta_documento_id', True)],
    'Material_Terapeutico': [('proposito', False), ('imagen_url', False)],
    'Preferencia_Notificacion': [('refuerzos', False)],
    'Derivacion_Interna': [('momento_respuesta', False), ('comentario_respuesta', False), ('momento_cierre', False)],
    'Bono': [('financiador_manual', False), ('momento_registro_manual', False), ('regularizado_en', False),
             ('registrado_por_usuario_id', True)],
    'Cita': [('documentacion_pendiente', False)],
    'Mensaje_Chat': [('adjunto_url', False), ('adjunto_public_id', False), ('adjunto_nombre', False),
                     ('adjunto_formato', False), ('adjunto_tipo_recurso', False), ('adjunto_bytes', False),
                     ('adjunto_paginas', False), ('paciente_id', True), ('profesional_id', True), ('documento_id', True)],
    'Evaluacion_Satisfaccion': [('tipo', False), ('satisfecho', False), ('episodio_clinico_id', True), ('profesional_id', True)],
}

TABLAS_NUEVAS = {
    # MR (sin normalizar): los días van como grupo repetitivo dentro del ejercicio
    'MR': [
        'Evento_Critico (evento_critico_id, origen, entidad, entidad_id, termino, terminos {termino}, extracto, estado, momento_creacion, momento_acuse, usuario_origen_id, paciente_id, acusado_por)',
    ],
    'FN1': [
        'Pauta_Ejercicio_Dia (pauta_ejercicio_id, dia_semana)',
        'Pauta_Ejercicio_Material (pauta_ejercicio_material_id, nombre_original, formato, tipo_recurso, url_publica, public_id_cloud, tamano_bytes, paginas, momento_carga, pauta_ejercicio_id, usuario_id)',
        'Evento_Critico (evento_critico_id, origen, entidad, entidad_id, termino, extracto, estado, momento_creacion, momento_acuse, usuario_origen_id, paciente_id, acusado_por)',
        'Evento_Critico_Termino (evento_critico_id, termino)',
    ],
    'FN3': [
        'Pauta_Ejercicio_Dia (pauta_ejercicio_id, dia_semana)',
        'Pauta_Ejercicio_Material (pauta_ejercicio_material_id, nombre_original, formato, tipo_recurso, url_publica, public_id_cloud, tamano_bytes, paginas, momento_carga, pauta_ejercicio_id, usuario_id)',
        'Origen_Evento_Critico (origen, entidad)',
        'Evento_Critico (evento_critico_id, entidad_id, termino, extracto, estado, momento_creacion, momento_acuse, origen, usuario_origen_id, paciente_id, acusado_por)',
        'Evento_Critico_Termino (evento_critico_id, termino)',
        'Evaluacion_Sesion (evaluacion_satisfaccion_id, satisfecho, cita_id)',
        'Evaluacion_Tratamiento (evaluacion_satisfaccion_id, episodio_clinico_id, profesional_id)',
    ],
}

# Tras qué tabla se inserta cada tabla nueva (para que queden junto a su familia)
UBICACION = {
    'Pauta_Ejercicio_Dia': 'Pauta_Ejercicio',
    'Pauta_Ejercicio_Material': 'Pauta_Ejercicio_Dia',
    'Origen_Evento_Critico': 'Palabra_Restringida',
    'Evento_Critico': 'Origen_Evento_Critico',
    'Evento_Critico_Termino': 'Evento_Critico',
    'Evaluacion_Sesion': 'Evaluacion_Satisfaccion',
    'Evaluacion_Tratamiento': 'Evaluacion_Sesion',
}

# 3FN: atributos que se retiran (dependencias transitivas) o que pasan a una subclase
SALEN_EN_3FN = {
    'Episodio_Clinico': ['informe_alta_emitido_en'],
    'Evaluacion_Satisfaccion': ['satisfecho', 'cita_id', 'episodio_clinico_id', 'profesional_id'],
}

JUSTIFICACION_3FN = [
    ('Pauta_Ejercicio_Dia', '1FN', 'dias_semana guarda varios días en una sola columna ("1,3,5"): es un grupo repetitivo. Cada día programado pasa a ser una fila (pauta_ejercicio_id, dia_semana); un ejercicio sin filas se hace todos los días.'),
    ('Pauta_Ejercicio_Material', '1FN', 'Un ejercicio puede tener varios archivos de apoyo: el grupo repetitivo sale a su propia tabla, con su clave y la FK al ejercicio.'),
    ('Evento_Critico_Termino', '1FN', 'terminos es una lista (JSON) de todas las palabras críticas que coincidieron: cada término pasa a ser una fila. termino conserva la primera coincidencia, que es la que se muestra en la bandeja.'),
    ('Pauta_Ejercicio_Dia · Evento_Critico_Termino', '2FN', 'Tienen clave compuesta y ningún atributo fuera de la clave, así que no puede haber dependencias parciales. El resto de las tablas nuevas tiene clave simple. La 2FN queda igual a la 1FN, el mismo criterio de los incrementos anteriores.'),
    ('Origen_Evento_Critico', '3FN', 'En Evento_Critico, origen determina entidad (SINTOMAS → Reporte_Sintoma, RESENA → Evaluacion_Satisfaccion, TICKET → Ticket_Soporte): es una dependencia transitiva. Se crea el catálogo Origen_Evento_Critico (origen, entidad) y Evento_Critico conserva solo origen como FK. Es el mismo tratamiento que tuvo rol_acceso con la tabla Rol.'),
    ('Episodio_Clinico', '3FN', 'informe_alta_emitido_en es la fecha de carga del PDF del informe (informe_alta_documento_id → Documento_Clinico.fecha_carga): sale en 3FN y se lee desde Documento_Clinico.'),
    ('Evaluacion_Sesion · Evaluacion_Tratamiento', '3FN', 'Una evaluación es de sesión (satisfecho sí/no + comentario, ligada a una cita) o de tratamiento (estrellas + reseña, ligada al episodio cerrado). En la evaluación de sesión, el profesional se deduce de la cita (cita_id → Cita.profesional_id): guardarlo otra vez sería una dependencia transitiva. En la de tratamiento sí se guarda, porque el profesional del episodio puede cambiar por una derivación (CU65) y la nota debe quedar con quien atendió. Se separa en dos subclases que comparten la clave de Evaluacion_Satisfaccion, igual que Sede con Sede_Online y Sede_Presencial; tipo indica la subclase. puntuacion se queda en la superclase porque las evaluaciones de sesión anteriores al cambio la conservan y siguen contando en el promedio.'),
    ('Mensaje_Chat', '3FN', 'Se mantiene en una tabla. La conversación queda identificada por paciente_id y profesional_id. episodio_clinico_id es opcional: guarda el episodio abierto al momento del envío, como contexto. Los datos del adjunto (adjunto_*) dependen de adjunto_public_id, que es único por mensaje (cada archivo pertenece a un solo mensaje); por eso es clave candidata y no genera dependencia transitiva. documento_id apunta a un documento de la ficha compartido en el chat.'),
    ('Bono', '3FN', 'financiador_manual (texto libre) se usa solo cuando el catálogo de financiadores no responde, y financiador_id queda vacío. Son excluyentes, así que no hay dependencia entre ellos. registrado_por_usuario_id, momento_registro_manual y regularizado_en describen el registro por contingencia del propio bono.'),
]


def _aplicar(lista_base, nivel):
    lineas = list(lista_base)
    salida = []
    for linea in lineas:
        nombre, attrs = _partir(linea)
        attrs = list(attrs)
        # Pauta_Tratamiento del MR: los días y el material viajan dentro del grupo ejercicios
        if nivel == 'MR' and nombre == 'Pauta_Tratamiento':
            attrs = [a if not a.startswith('ejercicios') else
                     'ejercicios {nombre, series, repeticiones, frecuencia, {+dias_semana {dia}}, material, '
                     '{+materiales_apoyo {nombre_original, formato, tipo_recurso, url_publica, public_id_cloud, tamano_bytes, paginas, momento_carga, usuario_id}}, fechas_cumplidas}'
                     for a in attrs]
        nuevos = NUEVOS_COMUNES.get(nombre, [])
        if nuevos:
            simples = [(a, f) for a, f in nuevos]
            # los atributos comunes van antes del primer FK final; las FK nuevas, al final
            corte = len(attrs)
            while corte > 0 and _es_fk(attrs[corte - 1]):
                corte -= 1
            normales = [f'{{+{a}}}' for a, f in simples if not f]
            fks = [f'{{+{a}}}' for a, f in simples if f]
            attrs = attrs[:corte] + normales + attrs[corte:] + fks
        if nivel == 'FN3' and nombre in SALEN_EN_3FN:
            attrs = [a for a in attrs if a.strip('{}+') not in SALEN_EN_3FN[nombre]]
        salida.append(_armar(nombre, attrs))
    # tablas nuevas
    clave = 'FN1' if nivel == 'FN2' else nivel
    for nueva in TABLAS_NUEVAS.get(clave, []):
        nombre = nueva.split(' (')[0]
        ancla = UBICACION.get(nombre, 'Palabra_Restringida' if nivel == 'MR' else None)
        idx = next((i for i, l in enumerate(salida) if l.lstrip('+').split(' (')[0] == ancla), len(salida) - 1)
        salida.insert(idx + 1, '+' + nueva)
    return salida


MR = _aplicar(BASE['MR'], 'MR')
FN1 = _aplicar(BASE['FN1'], 'FN1')
FN2 = _aplicar(BASE['FN2'], 'FN2')
FN3 = _aplicar(BASE['FN3'], 'FN3')


def limpio(linea):
    """La línea tal como va en el informe, sin marcas de cambio."""
    linea = linea.lstrip('+')
    while '{+' in linea:
        linea = re.sub(r'\{\+((?:[^{}]|\{[^{}]*\})*)\}', r'\1', linea)
    return linea


if __name__ == '__main__':
    for n, l in (('MR', MR), ('1FN', FN1), ('2FN', FN2), ('3FN', FN3)):
        print(f'== {n}: {len(l)} tablas')
        for x in l:
            if x.startswith('+') or '{+' in x:
                print('  ', x)
