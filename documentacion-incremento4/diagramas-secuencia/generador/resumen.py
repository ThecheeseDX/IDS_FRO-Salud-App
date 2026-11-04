# -*- coding: utf-8 -*-
"""
Resumen de los diagramas del Incremento 4 (pedido de Pablo, 04-11-2026: que se
lean bien al verlos completos, resumiendo lo menos importante).

Se aplica sobre cada página antes de dibujarla, sin tocar las definiciones de
las tandas:
  1. Las tablas dejan de ser líneas de vida: el mensaje a C_MYSQL nombra la
     operación y las tablas (p. ej. "SELECT Episodio_Clinico, Profesional").
  2. Cada ida a la base queda en un solo viaje: llamada a la capa de datos,
     consulta a C_MYSQL, respuesta y retorno (antes, un viaje por tabla).
  3. BEGIN / COMMIT / ROLLBACK pasan a una nota amarilla.
  4. Las rutas HTTP se escriben con un nombre que se entiende solo:
     "GET /clinica/episodio/:id/derivaciones/opciones" -> "GET opciones_de_derivacion(episodio_id)".
"""
import re

RUTAS = {
    ('GET', '/auth/comunas'): 'listar_comunas()',
    ('GET', '/auth/mi-foto'): 'consultar_mi_foto()',
    ('POST', '/auth/mi-foto'): 'subir_mi_foto(archivo)',
    ('GET', '/auth/mi-perfil-paciente'): 'consultar_mis_datos()',
    ('PUT', '/auth/mi-perfil-paciente'): 'actualizar_mis_datos(datos)',
    ('POST', '/citas/:id/evaluacion'): 'evaluar_sesion(cita_id)',
    ('POST', '/citas/:id/ubicacion'): 'enviar_ubicacion(cita_id)',
    ('POST', '/citas/:id/validar-sesion'): 'validar_sesion(cita_id)',
    ('GET', '/citas/atencion-en-curso'): 'consultar_atencion_en_curso()',
    ('GET', '/citas/evaluaciones/pendientes'): 'sesiones_por_evaluar()',
    ('POST', '/citas/marcas-temporales/:cita_id/finalizar'): 'finalizar_atencion(cita_id)',
    ('POST', '/citas/marcas-temporales/:cita_id/iniciar'): 'iniciar_atencion(cita_id)',
    ('GET', '/citas/sesiones-suspendidas'): 'sesiones_suspendidas()',
    ('GET', '/citas/ubicacion-pendiente'): 'visitas_a_domicilio_de_hoy()',
    ('POST', '/clinica/chat/:paciente_id/:profesional_id/adjuntos'): 'enviar_adjunto(paciente_id, profesional_id)',
    ('POST', '/clinica/chat/:paciente_id/:profesional_id/documento'): 'enviar_documento(paciente_id, profesional_id)',
    ('POST', '/clinica/chat/:paciente_id/:profesional_id/mensajes'): 'enviar_mensaje(paciente_id, profesional_id)',
    ('GET', '/clinica/chat/:paciente_id/:profesional_id/mensajes'): 'mensajes_de_la_conversacion(paciente_id, profesional_id)',
    ('POST', '/clinica/derivaciones/:id/cierre'): 'cancelar_derivacion(derivacion_id)',
    ('POST', '/clinica/derivaciones/:id/respuesta'): 'responder_derivacion(derivacion_id)',
    ('GET', '/clinica/derivaciones/recibidas'): 'derivaciones_recibidas()',
    ('POST', '/clinica/episodio/:episodio_id/derivaciones'): 'registrar_derivacion(episodio_id)',
    ('GET', '/clinica/episodio/:episodio_id/derivaciones'): 'derivaciones_del_episodio(episodio_id)',
    ('GET', '/clinica/episodio/:episodio_id/derivaciones/opciones'): 'opciones_de_derivacion(episodio_id)',
    ('POST', '/clinica/episodio/:episodio_id/evaluacion'): 'calificar_tratamiento(episodio_id)',
    ('PUT', '/clinica/episodio/:id'): 'cerrar_episodio(episodio_id)',
    ('POST', '/clinica/episodio/:id/informe-alta'): 'emitir_informe_de_alta(episodio_id)',
    ('GET', '/clinica/episodio/:id/informe-alta'): 'resumen_para_el_alta(episodio_id)',
    ('PUT', '/clinica/intervenciones/:episodio_id'): 'guardar_intervencion(episodio_id)',
    ('GET', '/clinica/intervenciones/:episodio_id'): 'intervencion_de_la_sesion(episodio_id)',
    ('GET', '/clinica/materiales'): 'buscar_material(texto)',
    ('GET', '/clinica/mi-alta'): 'mi_preparacion_para_el_alta()',
    ('GET', '/clinica/mi-ficha/pdf'): 'descargar_mi_ficha_pdf()',
    ('POST', '/clinica/pautas'): 'prescribir_pauta(datos)',
    ('POST', '/clinica/pautas/ejercicios/:id/cumplimiento'): 'marcar_ejercicio(ejercicio_id)',
    ('POST', '/clinica/pautas/ejercicios/:id/material'): 'subir_material_de_apoyo(ejercicio_id)',
    ('GET', '/clinica/pautas/paciente/:id'): 'pautas_del_paciente(paciente_id)',
    ('POST', '/clinica/sintomas'): 'reportar_sintomas(datos)',
    ('GET', '/clinica/tratamientos/por-evaluar'): 'tratamientos_por_evaluar()',
    ('GET', '/gestion/eventos-criticos'): 'eventos_criticos(estado)',
    ('POST', '/gestion/eventos-criticos/:id/acuse'): 'acusar_recibo(evento_id)',
    ('POST', '/notificaciones/:id/leer'): 'marcar_aviso_leido(notificacion_id)',
    ('POST', '/pagos/bonos/:id/regularizar'): 'regularizar_bono(bono_id)',
    ('POST', '/pagos/citas/:id/bono-contingencia'): 'registrar_bono_provisorio(cita_id)',
    ('GET', '/pagos/contingencia'): 'estado_de_contingencia()',
    ('PUT', '/pagos/contingencia/modo'): 'cambiar_modo_contingencia(activo)',
    ('GET', '/profesionales/pacientes/:id/historial'): 'historial_del_paciente(paciente_id)',
    ('GET', '/profesionales/pacientes/:pacienteId/historial'): 'historial_del_paciente(paciente_id)',
    # Pedidos del adaptador a los servicios externos
    ('POST', '/auto/upload'): 'subir_archivo()',
    ('POST', '/image/upload'): 'subir_imagen()',
    ('POST', '/raw/upload'): 'subir_documento()',
    ('POST', '/upload'): 'subir_archivo()',
    ('POST', '/v3/smtp/email'): 'enviar_correo()',
    ('POST', '/--/api/v2/push/send'): 'enviar_push()',
    ('POST', '/validar-bono'): 'validar_bono()',
}
def _clave(metodo, ruta):
    return (metodo, re.sub(r':\w+', ':_', ruta))


RE_HTTP = re.compile(r'^(GET|POST|PUT|DELETE|PATCH) (/[^\s?]+)(\?\S*)?\s*(\((.*)\))?\s*$')


def nombrar_ruta(texto):
    m = RE_HTTP.match(texto.strip())
    if not m:
        return texto
    metodo, ruta, _, _, params = m.groups()
    nombre = _RUTAS.get(_clave(metodo, ruta))
    if not nombre:
        raise ValueError(f'ruta sin nombre legible: {metodo} {ruta}')
    if params:  # los datos que mandaba la tanda reemplazan los de por defecto
        nombre = nombre.split('(')[0] + f'({params})'
    return f'{metodo} {nombre}'


_RUTAS = {_clave(m, r): n for (m, r), n in RUTAS.items()}


def _operacion(texto):
    m = re.match(r'^(SELECT|UPDATE|INSERT|DELETE)\b', texto.strip())
    return m.group(1) if m else None


def resumir(msgs, participantes):
    """Devuelve (mensajes, participantes) resumidos. msgs = salida de motor.parsear."""
    tablas = {p['id'] for p in participantes if p['tipo'] == 'tabla'}
    dao = next((p['id'] for p in participantes if p['nombre'] == 'C_Capa_de_Acceso_a_Datos'), None)
    sql = next((p['id'] for p in participantes if p['nombre'] == 'C_MYSQL'), None)
    salida, nota_pendiente, i = [], None, 0

    def agregar(m):
        nonlocal nota_pendiente
        m = dict(m)
        if nota_pendiente:
            m['nota'] = f"{nota_pendiente} · {m['nota']}" if m.get('nota') else nota_pendiente
            nota_pendiente = None
        salida.append(m)

    while i < len(msgs):
        m = msgs[i]
        # Un viaje a la base: X -> DAO ... DAO --> X (con disciplina de pila)
        if m['tipo'] == 'call' and m['a'] == dao and m['de'] != dao:
            origen, prof, j = m['de'], 0, i + 1
            while j < len(msgs):
                x = msgs[j]
                if x['tipo'] == 'call' and x['a'] == dao: prof += 1
                if x['tipo'] == 'ret' and x['de'] == dao and x['a'] == origen:
                    if prof == 0: break
                    prof -= 1
                j += 1
            bloque = msgs[i + 1:j]
            ret_final = msgs[j]
            ops, crudos, ret_sql, notas = {}, [], None, [m.get('nota')] + [x.get('nota') for x in bloque]
            for x in bloque:
                if x['tipo'] == 'call' and x['de'] == sql and x['a'] in tablas:
                    op = _operacion(x['texto']) or x['texto'].split()[0]
                    tabla = next(p['nombre'] for p in participantes if p['id'] == x['a'])
                    ops.setdefault(op, [])
                    if tabla not in ops[op]: ops[op].append(tabla)
                elif x['tipo'] == 'call' and x['de'] == dao and x['a'] == sql:
                    crudos.append(x['texto'])
                if x['tipo'] == 'ret' and x['de'] == sql and x['a'] == dao:
                    ret_sql = x['texto']
            nota = ' · '.join(n for n in notas if n)
            if not ops:
                control = ' '.join(crudos)
                if 'BEGIN' in control:
                    nota_pendiente = ((nota + ' · ') if nota else '') + 'Se abre una transacción (BEGIN … COMMIT)'
                elif 'COMMIT' in control:
                    if nota: nota_pendiente = nota
                elif 'ROLLBACK' in control:
                    nota_pendiente = ((nota + ' · ') if nota else '') + 'Se revierte la transacción (ROLLBACK)'
                else:  # otra consulta sin tabla: se deja tal cual, en un viaje
                    agregar(dict(m, nota=nota or None))
                    agregar(dict(tipo='call', de=dao, a=sql, texto=crudos[0] if crudos else 'ejecutar()', nota=None))
                    agregar(dict(tipo='ret', de=sql, a=dao, texto=ret_sql or 'return (resultado)', nota=None))
                    agregar(dict(ret_final, nota=None))
                i = j + 1
                continue
            consulta = '; '.join(f"{op} {', '.join(t)}" for op, t in ops.items())
            agregar(dict(m, nota=nota or None))
            agregar(dict(tipo='call', de=dao, a=sql, texto=consulta, nota=None))
            agregar(dict(tipo='ret', de=sql, a=dao, texto=ret_sql or 'return (resultado)', nota=None))
            agregar(dict(ret_final, nota=None))
            i = j + 1
            continue
        if m['de'] in tablas or m['a'] in tablas:
            raise ValueError(f'mensaje a una tabla fuera de un viaje a la base: {m["texto"]}')
        texto = m['texto']
        if m['tipo'] == 'call':
            texto = nombrar_ruta(texto)
        agregar(dict(m, texto=texto))
        i += 1
    if nota_pendiente and salida:
        salida[-1]['nota'] = salida[-1].get('nota') or nota_pendiente
    return _juntar_viajes(salida, dao, sql), [p for p in participantes if p['tipo'] != 'tabla']


def _nombre(texto):
    return texto.split('(')[0].strip()


def _juntar_viajes(msgs, dao, sql):
    """Varias idas seguidas a la base desde el mismo componente quedan en una
    sola: X -> DAO (a + b), DAO -> SQL (tablas), SQL --> DAO, DAO --> X."""
    out, i = [], 0
    def es_viaje(k):
        return (k + 3 < len(msgs) and msgs[k]['tipo'] == 'call' and msgs[k]['a'] == dao
                and msgs[k + 1]['de'] == dao and msgs[k + 1]['a'] == sql and msgs[k + 2]['de'] == sql
                and msgs[k + 3]['de'] == dao and msgs[k + 3]['a'] == msgs[k]['de']
                and not any(msgs[k + n].get('nota') for n in (1, 2, 3)))
    while i < len(msgs):
        if not es_viaje(i):
            out.append(msgs[i]); i += 1; continue
        grupo = [i]
        while es_viaje(grupo[-1] + 4) and msgs[grupo[-1] + 4]['de'] == msgs[i]['de'] and not msgs[grupo[-1] + 4].get('nota'):
            grupo.append(grupo[-1] + 4)
        if len(grupo) == 1:
            out.extend(msgs[i:i + 4]); i += 4; continue
        llamadas = [msgs[k]['texto'] for k in grupo]
        consultas, ops = [], {}
        for k in grupo:
            for parte in msgs[k + 1]['texto'].split('; '):
                op, _, tablas = parte.partition(' ')
                for t in tablas.split(', '):
                    if t and t not in ops.setdefault(op, []): ops[op].append(t)
        retornos = [re.sub(r'^return \((.*)\)$', r'\1', msgs[k + 3]['texto']) for k in grupo]
        out.append(dict(msgs[i], texto=' + '.join(_nombre(t) + '()' for t in llamadas)))
        out.append(dict(msgs[i + 1], texto='; '.join(f"{op} {', '.join(t)}" for op, t in ops.items())))
        out.append(dict(msgs[i + 2]))
        out.append(dict(msgs[grupo[-1] + 3], texto=f"return ({', '.join(retornos)})"))
        i = grupo[-1] + 4
    return out
