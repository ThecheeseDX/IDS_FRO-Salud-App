# Motor de diagramas de secuencia Punto Paz Salud (estilo Incremento 1, reglas del Incremento 2 y 3).
# Incremento 4 (pedido de Pablo, 04-11-2026): mismas reglas y mismo formato del Incremento 3,
# con letra y elementos más grandes, y separación entre líneas de vida calculada para que
# ningún mensaje se salga de su tramo.
# Entrada: definición de un CU (participantes, flujo principal, excepciones, actores).
# Salida: un .drawio multipágina por CU y un SVG/PNG por página.
import html, re, os, subprocess, glob, tempfile, shutil

PASO = 66          # separación vertical entre mensajes
ALTO_SELF = 38     # altura del bucle de auto-llamada
Y0 = 190           # y del primer mensaje
Y_LIFELINE = 40
ANCHO_ACTOR = 35
X_ACTOR = 80
X_PRIMERA_VISTA = 330
GAP = 50
FUENTE = 20        # letra de mensajes y cajas (en el Inc 3 era 12)
LETRA = 0.56 * FUENTE   # ancho medio de un carácter
ALTO_CAJA = 74
FILL_LL = "#f5f5f5"; STROKE_LL = "#666666"

def partir_nombre(nombre):
    """Los nombres largos de componentes van en dos renglones, cortados en un "_"."""
    if len(nombre) <= 16 or '_' not in nombre[1:-1]:
        return [nombre]
    cortes = [i for i, c in enumerate(nombre) if c == '_' and 0 < i < len(nombre) - 1]
    i = min(cortes, key=lambda k: abs(k - len(nombre) / 2))
    return [nombre[:i + 1], nombre[i + 1:]]

def ancho_participante(p):
    if p["tipo"] == "actor": return ANCHO_ACTOR
    return max(170, LETRA * max(len(r) for r in partir_nombre(p["nombre"])) * 1.1 + 36)

RENGLON_MENSAJE = 22   # caracteres por renglón de un mensaje
RENGLON_NOTA = 56      # caracteres por renglón de una nota
ALTO_RENGLON = 24

def renglones(texto, ancho):
    """Parte un texto largo en renglones (por espacios y comas) para que el
    diagrama no se ensanche. Un texto corto queda en un renglón."""
    if len(texto) <= ancho: return [texto]
    piezas, lineas, actual = re.split(r'(?<=[ ,])', texto), [], ''
    if len(piezas) > 1 and piezas[0].strip() in ('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'return'):
        piezas = [piezas[0] + piezas[1]] + piezas[2:]   # el verbo HTTP no queda solo
    for p in piezas:
        if actual and len(actual) + len(p) > ancho:
            lineas.append(actual.rstrip()); actual = p
        else:
            actual += p
    if actual.strip(): lineas.append(actual.rstrip())
    return lineas

def br(lineas):
    """Renglones para una etiqueta html de draw.io."""
    return '&lt;br&gt;'.join(html.escape(r) for r in lineas)

ACTOR_ID = '__actor__'
VISTA_ID = '__vista__'
RE_MSG = re.compile(r'^\s*(\S+)\s*(->>|-->|->)\s*(\S+)\s*:\s*(.*)$')

def parsear(lineas, actor, vista=None):
    """Convierte líneas DSL en mensajes. Sintaxis:
       A -> V: texto      llamada (continua)
       V --> A: texto     retorno (punteada)
       V ->> V: texto     auto-llamada
       ! texto            nota amarilla (se ancla al siguiente mensaje)
       'A' se sustituye por el nombre del actor de la página."""
    msgs, nota = [], None
    for ln in lineas:
        ln = ln.strip()
        if not ln: continue
        if ln.startswith('!'):
            nota = ln[1:].strip(); continue
        m = RE_MSG.match(ln)
        if not m: raise ValueError('línea inválida: ' + ln)
        de, op, a, texto = m.groups()
        mapa = {'V': VISTA_ID} if isinstance(vista, str) else {k: f'__vista_{k}__' for k in (vista or {})}
        de = ACTOR_ID if de == 'A' else mapa.get(de, de)
        a = ACTOR_ID if a == 'A' else mapa.get(a, a)
        tipo = {'->': 'call', '-->': 'ret', '->>': 'self'}[op]
        msgs.append({'de': de, 'a': a, 'texto': texto.replace('{A_MAY}', actor.upper()).replace('{A}', actor), 'tipo': tipo, 'nota': nota})
        nota = None
    return msgs

def construir_pagina(nombre_pagina, participantes, msgs, actor, vista=None):
    """Calcula layout y devuelve (celdas_drawio, svg)."""
    parts = [dict(p) for p in participantes]
    if parts[0]['tipo'] == 'actor':
        parts[0] = {'id': ACTOR_ID, 'nombre': actor, 'tipo': 'actor'}
    if isinstance(vista, str):
        parts[1] = {'id': VISTA_ID, 'nombre': vista, 'tipo': 'vista'}
    elif vista:
        for i, p in enumerate(parts):
            if p['id'] in vista:
                parts[i] = {'id': f"__vista_{p['id']}__", 'nombre': vista[p['id']], 'tipo': 'vista'}
    ids = [p['id'] for p in parts]
    # Regla del equipo: si una tabla o componente aparece en alguna pagina del
    # CU, aparece en TODAS, aunque en esa pagina no reciba mensajes.
    # posiciones x
    x = X_ACTOR
    idx = {p['id']: i for i, p in enumerate(parts)}
    # distancia mínima entre centros para que quepa cada mensaje en su tramo
    necesita = {}
    for m in msgs:
        if m['tipo'] == 'self' or m['de'] not in idx or m['a'] not in idx: continue
        i, j = sorted((idx[m['de']], idx[m['a']]))
        largo = max(len(r) for r in renglones(m['texto'], RENGLON_MENSAJE))
        necesita[(i, j)] = max(necesita.get((i, j), 0), LETRA * largo + 34)
    for i, p in enumerate(parts):
        p['w'] = ancho_participante(p)
        if i == 0: p['x'] = max(X_ACTOR, LETRA * 1.1 * len(p['nombre']) / 2 + 12 - p['w'] / 2)
        elif i == 1: p['x'] = max(X_PRIMERA_VISTA, parts[0]['x'] + parts[0]['w'] + GAP)
        else: p['x'] = parts[i-1]['x'] + parts[i-1]['w'] + GAP
        p['cx'] = p['x'] + p['w'] / 2
        for (a, b), d in necesita.items():
            if b == i and p['cx'] - parts[a]['cx'] < d:
                p['x'] += d - (p['cx'] - parts[a]['cx']); p['cx'] = p['x'] + p['w'] / 2
    pos = {p['id']: p for p in parts}
    # y de cada mensaje
    y = Y0
    for m in msgs:
        if m['nota']: y += 96 + (len(renglones(m['nota'], RENGLON_NOTA)) - 1) * ALTO_RENGLON
        y += (len(renglones(m['texto'], RENGLON_MENSAJE)) - 1) * ALTO_RENGLON
        m['y'] = y
        y += (PASO + ALTO_SELF) if m['tipo'] == 'self' else PASO
    y_fin = y + 30
    alto_ll = y_fin - Y_LIFELINE + 60
    # activaciones (intervalos por participante)
    barras = {p['id']: [] for p in parts}
    abiertas = {}
    def abrir(pid, yy):
        if pid not in abiertas: abiertas[pid] = yy
    def cerrar(pid, yy):
        if pid in abiertas:
            barras[pid].append([abiertas.pop(pid), yy])
    for m in msgs:
        yy = m['y']
        if m['tipo'] == 'call':
            abrir(m['de'], yy); abrir(m['a'], yy)
        elif m['tipo'] == 'self':
            abrir(m['de'], yy)
        elif m['tipo'] == 'ret':
            abrir(m['de'], yy)
            cerrar(m['de'], yy + 5)
            abrir(m['a'], yy)
    for pid in list(abiertas): cerrar(pid, y_fin - 20)
    # actor: una sola barra de principio a fin
    barras[ACTOR_ID] = [[msgs[0]['y'], y_fin - 20]] if msgs else []
    # asignar barra a cada mensaje
    def barra_en(pid, yy):
        for k, (a, b) in enumerate(barras[pid]):
            if a - 1 <= yy <= b + 1: return k
        return None
    # ── drawio ──
    celdas = []; nid = [0]
    def nuevo(): nid[0] += 1; return f"c{nid[0]}"
    id_ll, id_barra = {}, {}
    for p in parts:
        lid = nuevo(); id_ll[p['id']] = lid
        if p['tipo'] == 'actor':
            estilo = "shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=1;dropTarget=0;collapsible=0;recursiveResize=0;outlineConnect=0;portConstraint=eastwest;newEdgeStyle={&quot;edgeStyle&quot;:&quot;elbowEdgeStyle&quot;,&quot;elbow&quot;:&quot;vertical&quot;,&quot;curved&quot;:0,&quot;rounded&quot;:0};participant=umlActor;fontSize=17;fontStyle=1;"
        else:
            estilo = "shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=1;dropTarget=0;collapsible=0;recursiveResize=0;outlineConnect=0;portConstraint=eastwest;newEdgeStyle={&quot;edgeStyle&quot;:&quot;elbowEdgeStyle&quot;,&quot;elbow&quot;:&quot;vertical&quot;,&quot;curved&quot;:0,&quot;rounded&quot;:0};fontSize=17;fontStyle=1;size=74;"
        celdas.append(f'<mxCell id="{lid}" value="{br(partir_nombre(p["nombre"]))}" style="{estilo}" vertex="1" parent="1"><mxGeometry x="{p["x"]}" y="{Y_LIFELINE}" width="{p["w"]}" height="{alto_ll:.0f}" as="geometry"/></mxCell>')
        for k, (a, b) in enumerate(barras[p['id']]):
            bid = nuevo(); id_barra[(p['id'], k)] = bid
            bx = (p['w'] - 10) / 2
            celdas.append(f'<mxCell id="{bid}" value="" style="html=1;points=[];perimeter=orthogonalPerimeter;outlineConnect=0;targetShapes=umlLifeline;portConstraint=eastwest;newEdgeStyle={{&quot;edgeStyle&quot;:&quot;elbowEdgeStyle&quot;,&quot;elbow&quot;:&quot;vertical&quot;,&quot;curved&quot;:0,&quot;rounded&quot;:0}};" vertex="1" parent="{lid}"><mxGeometry x="{bx}" y="{a - Y_LIFELINE:.0f}" width="10" height="{b - a:.0f}" as="geometry"/></mxCell>')
    for m in msgs:
        de, a, yy = pos[m['de']], pos[m['a']], m['y']
        if m['nota']:
            rn = renglones(m['nota'], RENGLON_NOTA)
            nw = max(330, LETRA * 0.95 * max(len(r) for r in rn) + 40)
            hn = 52 + (len(rn) - 1) * ALTO_RENGLON
            # la nota se centra en la vista (segundo participante) y queda
            # sobre todos los renglones de la etiqueta del mensaje
            extra = (len(renglones(m['texto'], RENGLON_MENSAJE)) - 1) * ALTO_RENGLON
            nx = parts[1]['cx'] - nw / 2
            celdas.append(f'<mxCell id="{nuevo()}" value="{br(rn)}" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffff88;strokeColor=#9E916F;fontColor=light-dark(#333333,#cccccc);fontSize=16;" vertex="1" parent="1"><mxGeometry x="{nx:.0f}" y="{yy - 36 - hn - extra}" width="{nw:.0f}" height="{hn}" as="geometry"/></mxCell>')
        src = id_barra.get((m['de'], barra_en(m['de'], yy))) or id_ll[m['de']]
        tgt = id_barra.get((m['a'], barra_en(m['a'], yy))) or id_ll[m['a']]
        if m['tipo'] == 'self':
            sx = de['cx'] + 55
            estilo = "html=1;curved=1;endArrow=block;rounded=0;verticalAlign=bottom;fontSize=17;"
            pts = f'<Array as="points"><mxPoint x="{sx:.0f}" y="{yy}"/><mxPoint x="{sx:.0f}" y="{yy + ALTO_SELF}"/></Array>'
        else:
            dashed = "dashed=1;dashPattern=2 3;" if m['tipo'] == 'ret' else ""
            estilo = f"html=1;verticalAlign=bottom;edgeStyle=elbowEdgeStyle;elbow=vertical;curved=0;rounded=0;endArrow=block;fontSize=17;{dashed}"
            mid = (de['cx'] + a['cx']) / 2
            pts = f'<Array as="points"><mxPoint x="{mid:.0f}" y="{yy}"/></Array>'
        celdas.append(f'<mxCell id="{nuevo()}" value="{br(renglones(m["texto"], RENGLON_MENSAJE))}" style="{estilo}" edge="1" parent="1" source="{src}" target="{tgt}"><mxGeometry relative="1" as="geometry">{pts}</mxGeometry></mxCell>')
    ancho = parts[-1]['x'] + parts[-1]['w'] + 60
    alto = Y_LIFELINE + alto_ll + 40
    # ── SVG ──
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{ancho:.0f}" height="{alto:.0f}" viewBox="0 0 {ancho:.0f} {alto:.0f}" font-family="Helvetica, Arial, sans-serif" font-size="17">',
         '<rect width="100%" height="100%" fill="white"/>',
         '<defs><marker id="flecha" markerWidth="13" markerHeight="10" refX="13" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L13,5 L0,10 z" fill="#000"/></marker></defs>']
    for p in parts:
        cx = p['cx']
        if p['tipo'] == 'actor':
            s.append(f'<g stroke="#000" fill="none" stroke-width="1.2"><circle cx="{cx}" cy="{Y_LIFELINE+8}" r="7"/><line x1="{cx}" y1="{Y_LIFELINE+15}" x2="{cx}" y2="{Y_LIFELINE+38}"/><line x1="{cx-14}" y1="{Y_LIFELINE+22}" x2="{cx+14}" y2="{Y_LIFELINE+22}"/><line x1="{cx}" y1="{Y_LIFELINE+38}" x2="{cx-12}" y2="{Y_LIFELINE+58}"/><line x1="{cx}" y1="{Y_LIFELINE+38}" x2="{cx+12}" y2="{Y_LIFELINE+58}"/></g>')
            s.append(f'<text x="{cx}" y="{Y_LIFELINE-8}" text-anchor="middle" font-weight="bold">{html.escape(p["nombre"])}</text>')
            s.append(f'<line x1="{cx}" y1="{Y_LIFELINE+60}" x2="{cx}" y2="{Y_LIFELINE+alto_ll:.0f}" stroke="#666" stroke-dasharray="6,4"/>')
        else:
            s.append(f'<rect x="{p["x"]}" y="{Y_LIFELINE}" width="{p["w"]}" height="{ALTO_CAJA}" fill="{FILL_LL}" stroke="{STROKE_LL}"/>')
            nl = partir_nombre(p["nombre"])
            for k, r in enumerate(nl):
                s.append(f'<text x="{cx}" y="{Y_LIFELINE + 43 + (k - (len(nl) - 1) / 2) * ALTO_RENGLON:.0f}" text-anchor="middle" font-weight="bold">{html.escape(r)}</text>')
            s.append(f'<line x1="{cx}" y1="{Y_LIFELINE+ALTO_CAJA}" x2="{cx}" y2="{Y_LIFELINE+alto_ll:.0f}" stroke="#666" stroke-dasharray="6,4"/>')
        for a, b in barras[p['id']]:
            s.append(f'<rect x="{cx-7}" y="{a}" width="14" height="{b-a}" fill="{FILL_LL}" stroke="{STROKE_LL}"/>')
    for m in msgs:
        de, a, yy = pos[m['de']], pos[m['a']], m['y']
        if m['nota']:
            rn = renglones(m['nota'], RENGLON_NOTA)
            nw = max(330, LETRA * 0.95 * max(len(r) for r in rn) + 40); nx = parts[1]['cx'] - nw / 2
            hn = 52 + (len(rn) - 1) * ALTO_RENGLON
            extra = (len(renglones(m['texto'], RENGLON_MENSAJE)) - 1) * ALTO_RENGLON
            s.append(f'<rect x="{nx:.0f}" y="{yy - 36 - hn - extra}" width="{nw:.0f}" height="{hn}" fill="#ffff88" stroke="#9E916F"/>')
            for k, r in enumerate(rn):
                s.append(f'<text x="{nx+nw/2:.0f}" y="{yy - 36 - hn - extra + 32 + k * ALTO_RENGLON}" text-anchor="middle" fill="#333" font-size="16">{html.escape(r)}</text>')
        if m['tipo'] == 'self':
            x1 = de['cx'] + 5
            s.append(f'<path d="M{x1},{yy} C{x1+60},{yy-10} {x1+60},{yy+ALTO_SELF+10} {x1},{yy+ALTO_SELF}" fill="none" stroke="#000" marker-end="url(#flecha)"/>')
            rm = renglones(m['texto'], RENGLON_MENSAJE)
            for k, r in enumerate(rm):
                s.append(f'<text x="{x1+6}" y="{yy - 5 - (len(rm) - 1 - k) * ALTO_RENGLON}" text-anchor="start">{html.escape(r)}</text>')
        else:
            x1 = de['cx'] + (5 if a['cx'] > de['cx'] else -5); x2 = a['cx'] - (5 if a['cx'] > de['cx'] else -5)
            dash = ' stroke-dasharray="5,4"' if m['tipo'] == 'ret' else ''
            s.append(f'<line x1="{x1}" y1="{yy}" x2="{x2}" y2="{yy}" stroke="#000" stroke-width="1.4"{dash} marker-end="url(#flecha)"/>')
            rm = renglones(m['texto'], RENGLON_MENSAJE)
            for k, r in enumerate(rm):
                s.append(f'<text x="{(x1+x2)/2:.0f}" y="{yy - 8 - (len(rm) - 1 - k) * ALTO_RENGLON}" text-anchor="middle">{html.escape(r)}</text>')
    s.append('</svg>')
    # El tamaño de letra se fija en FUENTE (los estilos se escribieron con 17).
    celdas = [c.replace('fontSize=17;', f'fontSize={FUENTE};').replace('fontSize=16;', f'fontSize={FUENTE - 1};') for c in celdas]
    svg = "\n".join(s).replace('font-size="17"', f'font-size="{FUENTE}"').replace('font-size="16"', f'font-size="{FUENTE - 1}"')
    return celdas, svg, (ancho, alto)

NIVEL = {'actor': 0, 'vista': 1, 'api': 2, 'controlador': 2.5, 'dao': 3, 'motor_sql': 4, 'externo': 2.6, 'tabla': 5}

def nivel_de(part):
    if part['tipo'] == 'actor': return NIVEL['actor']
    if part['tipo'] == 'vista': return NIVEL['vista']
    if part['tipo'] == 'tabla': return NIVEL['tabla']
    if part['tipo'] == 'externo': return NIVEL['externo']
    nombre = part['nombre']
    if nombre == 'C_API_REST': return NIVEL['api']
    if nombre == 'C_Capa_de_Acceso_a_Datos': return NIVEL['dao']
    if nombre == 'C_MYSQL': return NIVEL['motor_sql']
    return NIVEL['controlador']

def validar_pagina(nombre_pagina, parts, msgs, problemas):
    """Reglas del equipo: orden de lifelines, sin saltos, y toda llamada vuelve
    por el mismo camino (disciplina de pila, como en CU20/CU40)."""
    pos = {p['id']: nivel_de(p) for p in parts}
    niveles = [nivel_de(p) for p in parts]
    if niveles != sorted(niveles):
        problemas.append(f"{nombre_pagina}: orden de lifelines incorrecto (actor, vistas, controladores, capa de datos, MySQL, tablas)")
    pila = []
    # Regla del Incremento 3 (Pablo, 26-09-2026): en un CU con actor, todo
    # tramo nace en el actor y vuelve a el. Con la pila vacia, lo unico valido
    # es una llamada del actor (o una accion propia del actor).
    con_actor = parts[0]['tipo'] == 'actor'
    for m in msgs:
        de, a = m['de'], m['a']
        if con_actor and not pila and de != ACTOR_ID:
            problemas.append(f"{nombre_pagina}: \"{m['texto'][:50]}\" no nace del actor (el tramo anterior ya volvio al actor)")
        if de not in pos or a not in pos:
            problemas.append(f"{nombre_pagina}: participante no declarado ({de} -> {a})"); continue
        if de == a: continue
        na, nb = pos[de], pos[a]
        nombres = {p['id']: p['nombre'] for p in parts}
        if NIVEL['externo'] in (na, nb):
            otro = nombres[de] if nb == NIVEL['externo'] else nombres[a]
            if otro != 'C_API_Adapter':
                problemas.append(f"{nombre_pagina}: {de} -> {a} no pasa por C_API_Adapter")
        elif abs(na - nb) > 1.01:
            problemas.append(f"{nombre_pagina}: salto de {de} a {a} · \"{m['texto'][:45]}\"")
        if m['tipo'] == 'call':
            pila.append((de, a))
        elif m['tipo'] == 'ret':
            if pila and pila[-1] == (a, de):
                pila.pop()
            else:
                esperado = f"{pila[-1][1]} --> {pila[-1][0]}" if pila else "ninguno (pila vacia)"
                problemas.append(f"{nombre_pagina}: retorno {de} --> {a} \"{m['texto'][:40]}\" no responde a la ultima llamada; se esperaba {esperado}")
    if con_actor and msgs and msgs[-1]['a'] != ACTOR_ID:
        problemas.append(f"{nombre_pagina}: el diagrama no termina de vuelta en el actor")
    if pila:
        problemas.append(f"{nombre_pagina}: quedan llamadas sin retorno: " + ", ".join(f"{x} -> {y}" for x, y in pila))

def _inicio_de_tramo(msgs, k):
    """k si el mensaje k abre un tramo con la pila vacía (todo lo anterior volvió al actor)."""
    pila = 0
    for m in msgs[:k]:
        if m['tipo'] == 'call': pila += 1
        elif m['tipo'] == 'ret': pila -= 1
    return k if pila == 0 else -1


def generar_cu(cu, carpeta, chrome=None, png=True):
    """cu: dict(id, nombre, actores:[...], participantes:[...], principal:[líneas], excepciones:{n: dict(cortar, lineas, reanudar)})"""
    os.makedirs(carpeta, exist_ok=True)
    paginas = []   # (nombre_pagina, nombre_archivo, msgs, actor)
    multi = len(cu['actores']) > 1
    for actor in cu['actores']:
        suf = f" {actor}" if multi else ""
        vista = cu.get('vistas', {}).get(actor)
        # Incremento 3: el flujo principal (y sus excepciones) puede definirse
        # por rol, cuando cada rol dispara el CU con una accion distinta.
        fuente = cu['principal'][actor] if isinstance(cu['principal'], dict) else cu['principal']
        excepciones = cu['excepciones']
        if excepciones and all(isinstance(k, str) for k in excepciones):
            excepciones = excepciones[actor]
        principal = parsear(fuente, actor, vista)
        paginas.append((f"{cu['id']} - Principal{suf}", f"{cu['id']}-Principal{suf}", principal, actor, vista))
        for n, ex in sorted(excepciones.items()):
            base = parsear(fuente, actor, vista)
            def indice(ref, desde_fin=False):
                if isinstance(ref, int): return ref
                for k, m in enumerate(base):
                    if m['texto'].startswith(ref): return k + 1 if desde_fin else k
                raise ValueError(f"{cu['id']} exc {n}: no encuentro '{ref}'")
            corte = indice(ex['cortar'], True)
            # Incremento 4 (resumen): la página de la excepción parte en la
            # última acción del actor antes de la excepción; lo anterior es
            # idéntico al flujo principal y se indica con una nota.
            inicio = max([k for k in range(corte) if base[k]['de'] == ACTOR_ID and base[k]['tipo'] == 'call'
                          and k == _inicio_de_tramo(base, k)] or [0])
            previos = [dict(m) for m in base[inicio:corte]]
            if inicio > 0:
                aviso = 'Los pasos anteriores son los del flujo principal'
                previos[0]['nota'] = f"{aviso} · {previos[0]['nota']}" if previos[0]['nota'] else aviso
            msgs = previos + parsear(ex['lineas'], actor, vista)
            if ex.get('reanudar') is not None:
                msgs += [dict(m) for m in base[indice(ex['reanudar']):]]
            paginas.append((f"{cu['id']} - Excepción {n}{suf}", f"{cu['id']}-Excepción {n}{suf}", msgs, actor, vista))
    diagramas = []
    problemas = []
    from resumen import resumir
    for nombre_pag, archivo, msgs, actor, vista in paginas:
        # Incremento 4: resumen pedido por Pablo (tablas en el mensaje a
        # C_MYSQL, un viaje por ida a la base, transacciones en nota, rutas
        # con nombre legible). Ver resumen.py.
        msgs, participantes = resumir(msgs, cu['participantes'])
        celdas, svg, (w, h) = construir_pagina(nombre_pag, participantes, msgs, actor, vista)
        parts = [dict(p) for p in participantes]
        if parts[0]['tipo'] == 'actor':
            parts[0] = {'id': '__actor__', 'nombre': actor, 'tipo': 'actor'}
        if isinstance(vista, str): parts[1] = {'id': VISTA_ID, 'nombre': vista, 'tipo': 'vista'}
        elif vista:
            for i, p in enumerate(parts):
                if p['id'] in vista: parts[i] = {'id': f"__vista_{p['id']}__", 'nombre': vista[p['id']], 'tipo': 'vista'}
        validar_pagina(nombre_pag, parts, msgs, problemas)
        diagramas.append(f'<diagram name="{html.escape(nombre_pag)}" id="{re.sub(r"[^A-Za-z0-9]", "_", nombre_pag)}"><mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{w:.0f}" pageHeight="{h:.0f}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>{"".join(celdas)}</root></mxGraphModel></diagram>')
        ruta_svg = os.path.join(carpeta, archivo + ".svg")
        open(ruta_svg, "w").write(svg)
        if png and chrome:
            ruta_html = ruta_svg[:-4] + ".html"
            open(ruta_html, "w").write(f'<html><body style="margin:0">{svg}</body></html>')
            # Perfil temporal propio por captura: sin esto Chrome reutiliza una
            # instancia viva y devuelve imagenes repetidas o en blanco.
            perfil = tempfile.mkdtemp(prefix="chrome-captura-")
            subprocess.run([chrome, "--headless", "--disable-gpu", "--hide-scrollbars", f"--force-device-scale-factor={2 if h < 7000 else 1}",
                            f"--user-data-dir={perfil}", "--virtual-time-budget=4000", "--run-all-compositor-stages-before-draw",
                            f"--window-size={w:.0f},{h:.0f}", f"--screenshot={ruta_svg[:-4]}.png", f"file://{ruta_html}"],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            shutil.rmtree(perfil, ignore_errors=True)
            os.remove(ruta_html); os.remove(ruta_svg)
    if problemas:
        raise ValueError(f"{cu['id']}: reglas de notacion incumplidas\n  - " + "\n  - ".join(dict.fromkeys(problemas)))
    ruta_drawio = os.path.join(carpeta, f"{cu['id']}.drawio")
    open(ruta_drawio, "w").write('<mxfile host="app.diagrams.net">' + "".join(diagramas) + '</mxfile>')
    return ruta_drawio, len(paginas)

def chrome_path():
    c = glob.glob(os.path.expanduser("~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-*/chrome-headless-shell"))
    return c[0] if c else None
