# -*- coding: utf-8 -*-
"""
Motor de diagramas de secuencia del Incremento 4: versión LEGIBLE.

Reglas del prompt de Pablo (04-11-2026), que el motor verifica antes de dibujar:
  - un diagrama = un flujo principal, con a lo más un bloque alternativo
    (alt / else), sin bloques anidados;
  - pocas líneas de vida (máximo 6): las capas internas del servidor van
    agrupadas en "Servidor" y la base en "Base de datos";
  - pocos mensajes (máximo 16 por camino);
  - etiquetas cortas (verbo + objeto, máximo 42 caracteres);
  - cada llamada vuelve por el mismo camino, nada salta una línea de vida y
    todo nace en el actor y vuelve a él (reglas de los incrementos 2 y 3).

DSL de cada página (una línea por elemento):
  A -> V: texto        llamada          V --> A: texto     retorno (punteado)
  S ->> S: texto       acción propia    ! texto            nota (antes del mensaje)
  alt [condición]      inicio del bloque alternativo
  else [condición]     segunda rama     end                 cierre del bloque
"""
import glob, html, os, re, shutil, subprocess, tempfile

FUENTE = 15          # tamaño de letra de los mensajes
PASO = 58            # separación vertical entre mensajes
ALTO_SELF = 34
Y_CAJA = 30          # y de las cajas de las líneas de vida
ALTO_CAJA = 64
ANCHO_CAJA = 200
GAP = 90             # separación horizontal entre cajas
MAX_LINEAS_VIDA, MAX_MENSAJES, MAX_ETIQUETA = 6, 16, 42
FILL, STROKE = '#f5f5f5', '#666666'
NOTA_FILL, NOTA_STROKE = '#ffff88', '#9E916F'
ALT_STROKE = '#5C5C7A'

RE_MSG = re.compile(r'^(\S+)\s*(->>|-->|->)\s*(\S+)\s*:\s*(.+)$')


def parsear(lineas):
    elementos, nota = [], None
    for ln in lineas:
        ln = ln.strip()
        if not ln:
            continue
        if ln.startswith('!'):
            nota = ln[1:].strip(); continue
        m = re.match(r'^(alt|else)\s*(\[.*\])$', ln)
        if m:
            elementos.append({'tipo': m.group(1), 'cond': m.group(2)}); continue
        if ln == 'end':
            elementos.append({'tipo': 'end'}); continue
        m = RE_MSG.match(ln)
        if not m:
            raise ValueError('línea inválida: ' + ln)
        de, op, a, texto = m.groups()
        elementos.append({'tipo': {'->': 'call', '-->': 'ret', '->>': 'self'}[op], 'de': de, 'a': a,
                          'texto': texto.strip(), 'nota': nota})
        nota = None
    return elementos


def caminos(elementos):
    """Secuencias lineales: lo anterior al alt + cada rama + lo posterior."""
    if not any(e['tipo'] == 'alt' for e in elementos):
        return [[e for e in elementos]]
    i = next(k for k, e in enumerate(elementos) if e['tipo'] == 'alt')
    j = next(k for k, e in enumerate(elementos) if e['tipo'] == 'else')
    k = next(k for k, e in enumerate(elementos) if e['tipo'] == 'end')
    antes, r1, r2, despues = elementos[:i], elementos[i + 1:j], elementos[j + 1:k], elementos[k + 1:]
    return [antes + r1 + despues, antes + r2 + despues]


def validar(nombre, participantes, elementos):
    p = []
    ids = [x['id'] for x in participantes]
    if len(participantes) > MAX_LINEAS_VIDA:
        p.append(f'{len(participantes)} líneas de vida (máximo {MAX_LINEAS_VIDA})')
    if sum(e['tipo'] == 'alt' for e in elementos) > 1:
        p.append('más de un bloque alternativo')
    profundidad = 0
    for e in elementos:
        if e['tipo'] == 'alt':
            profundidad += 1
            if profundidad > 1: p.append('bloques anidados')
        if e['tipo'] == 'end': profundidad -= 1
    for camino in caminos(elementos):
        msgs = [e for e in camino if e['tipo'] in ('call', 'ret', 'self')]
        if len(msgs) > MAX_MENSAJES:
            p.append(f'{len(msgs)} mensajes en un camino (máximo {MAX_MENSAJES})')
        pila = []
        for m in msgs:
            if len(m['texto']) > MAX_ETIQUETA:
                p.append(f'etiqueta larga ({len(m["texto"])}): "{m["texto"]}"')
            for x in (m['de'], m['a']):
                if x not in ids: p.append(f'participante no declarado: {x}')
            if not pila and m['de'] != ids[0]:
                p.append(f'"{m["texto"]}" no nace del actor')
            if m['tipo'] != 'self' and abs(ids.index(m['de']) - ids.index(m['a'])) != 1:
                p.append(f'"{m["texto"]}" salta una línea de vida')
            if m['tipo'] == 'call':
                pila.append((m['de'], m['a']))
            elif m['tipo'] == 'ret':
                if pila and pila[-1] == (m['a'], m['de']): pila.pop()
                else: p.append(f'retorno "{m["texto"]}" no responde a la última llamada')
        if pila: p.append('llamadas sin retorno: ' + ', '.join(f'{a}->{b}' for a, b in pila))
        if msgs and msgs[-1]['a'] != ids[0]: p.append('el camino no termina en el actor')
    if p:
        raise ValueError(f'{nombre}:\n  - ' + '\n  - '.join(dict.fromkeys(p)))


def _caja_nota(e, pos, ancho_pagina):
    """La nota se centra sobre su mensaje y nunca se sale de la página."""
    ancho_nota = max(240, 7.6 * len(e['nota']) + 30)
    centro = (pos[e['de']]['cx'] + pos[e['a']]['cx']) / 2 if e['tipo'] != 'self' else pos[e['de']]['cx'] + 90
    nx = min(max(centro - ancho_nota / 2, 10), ancho_pagina - ancho_nota - 10)
    return ancho_nota, nx


def _lineas_caja(nombre):
    return nombre.split('\n')


def construir(nombre, titulo, participantes, elementos):
    validar(nombre, participantes, elementos)
    parts = [dict(x) for x in participantes]
    x = 110            # deja lugar a la izquierda para el marco del bloque alternativo
    for q in parts:
        q['w'] = 90 if q['tipo'] == 'actor' else ANCHO_CAJA
        q['x'] = x
        q['cx'] = x + q['w'] / 2
        x += q['w'] + GAP
    pos = {q['id']: q for q in parts}
    ancho = x - GAP + 40

    # y de cada elemento
    y = Y_CAJA + ALTO_CAJA + 60 + 40   # deja espacio para el título
    for e in elementos:
        if e['tipo'] in ('alt', 'else'):
            y += 14; e['y'] = y; y += 40; continue
        if e['tipo'] == 'end':
            e['y'] = y - 18; y += 26; continue
        if e.get('nota'): y += 76
        e['y'] = y
        y += (PASO + ALTO_SELF) if e['tipo'] == 'self' else PASO
    y_fin = y + 20
    alto = y_fin + 50

    # barras de activación: el actor, de principio a fin; el resto, por tramo de llamada
    barras = {q['id']: [] for q in parts}
    msgs = [e for e in elementos if e['tipo'] in ('call', 'ret', 'self')]
    abiertas, al_abrir_alt = {}, {}
    for m in elementos:
        if m['tipo'] == 'alt':
            al_abrir_alt = dict(abiertas); continue
        if m['tipo'] == 'else':
            # la segunda rama parte del mismo estado que la primera
            for pid, y0 in list(abiertas.items()):
                barras[pid].append((y0, m['y'] - 10))
            abiertas = {pid: m['y'] + 10 for pid in al_abrir_alt}; continue
        if m['tipo'] == 'end':
            continue
        if m['tipo'] == 'call':
            abiertas.setdefault(m['a'], m['y'])
        elif m['tipo'] == 'ret' and m['de'] in abiertas:
            barras[m['de']].append((abiertas.pop(m['de']), m['y']))
        elif m['tipo'] == 'self':
            abiertas.setdefault(m['de'], m['y'])
    for pid, y0 in abiertas.items(): barras[pid].append((y0, y_fin - 30))
    barras[parts[0]['id']] = [(msgs[0]['y'], y_fin - 30)] if msgs else []

    # marco del bloque alternativo
    marco = None
    if any(e['tipo'] == 'alt' for e in elementos):
        i = next(k for k, e in enumerate(elementos) if e['tipo'] == 'alt')
        k = next(k for k, e in enumerate(elementos) if e['tipo'] == 'end')
        dentro = [e for e in elementos[i:k] if e['tipo'] in ('call', 'ret', 'self')]
        xs = [pos[e['de']]['cx'] for e in dentro] + [pos[e['a']]['cx'] for e in dentro]
        marco = dict(x0=min(xs) - 70, x1=max(xs) + 70, y0=elementos[i]['y'] - 8, y1=elementos[k]['y'],
                     cond=elementos[i]['cond'], otros=[(e['y'], e['cond']) for e in elementos[i:k] if e['tipo'] == 'else'])

    # ── SVG ──
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{ancho:.0f}" height="{alto:.0f}" viewBox="0 0 {ancho:.0f} {alto:.0f}" font-family="Helvetica, Arial, sans-serif" font-size="{FUENTE}">',
         '<rect width="100%" height="100%" fill="white"/>',
         '<defs><marker id="f" markerWidth="11" markerHeight="9" refX="11" refY="4.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L11,4.5 L0,9 z" fill="#000"/></marker>'
         '<marker id="fa" markerWidth="11" markerHeight="9" refX="11" refY="4.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L11,4.5 L0,9" fill="none" stroke="#000"/></marker></defs>',
         f'<text x="30" y="{Y_CAJA + 6}" font-size="18" font-weight="bold" fill="#1D1D3B">{html.escape(titulo)}</text>']
    ytop = Y_CAJA + 40
    for q in parts:
        cx = q['cx']
        if q['tipo'] == 'actor':
            s.append(f'<g stroke="#000" fill="none" stroke-width="1.4"><circle cx="{cx}" cy="{ytop + 9}" r="8"/>'
                     f'<line x1="{cx}" y1="{ytop + 17}" x2="{cx}" y2="{ytop + 40}"/><line x1="{cx - 16}" y1="{ytop + 25}" x2="{cx + 16}" y2="{ytop + 25}"/>'
                     f'<line x1="{cx}" y1="{ytop + 40}" x2="{cx - 13}" y2="{ytop + 58}"/><line x1="{cx}" y1="{ytop + 40}" x2="{cx + 13}" y2="{ytop + 58}"/></g>'
                     f'<text x="{cx}" y="{ytop + 78}" text-anchor="middle" font-weight="bold">{html.escape(q["nombre"])}</text>')
            linea0 = ytop + 86
        else:
            s.append(f'<rect x="{q["x"]}" y="{ytop}" width="{q["w"]}" height="{ALTO_CAJA}" fill="{FILL}" stroke="{STROKE}"/>')
            ls = _lineas_caja(q['nombre'])
            for j, ln in enumerate(ls):
                yy = ytop + ALTO_CAJA / 2 + (j - (len(ls) - 1) / 2) * 19 + 5
                s.append(f'<text x="{cx}" y="{yy:.0f}" text-anchor="middle" font-weight="{"bold" if j == 0 else "normal"}" font-size="{FUENTE if j == 0 else 12}" fill="{"#000" if j == 0 else "#555"}">{html.escape(ln)}</text>')
            linea0 = ytop + ALTO_CAJA
        s.append(f'<line x1="{cx}" y1="{linea0}" x2="{cx}" y2="{y_fin}" stroke="#888" stroke-dasharray="7,5"/>')
        for a, b in barras[q['id']]:
            s.append(f'<rect x="{cx - 6}" y="{a - 4}" width="12" height="{b - a + 8}" fill="{FILL}" stroke="{STROKE}"/>')
    if marco:
        m = marco
        s.append(f'<rect x="{m["x0"]}" y="{m["y0"]}" width="{m["x1"] - m["x0"]}" height="{m["y1"] - m["y0"]}" fill="none" stroke="{ALT_STROKE}" stroke-width="1.4"/>')
        s.append(f'<path d="M{m["x0"]},{m["y0"]} h46 v18 l-8,8 h-38 z" fill="#ECECF4" stroke="{ALT_STROKE}"/><text x="{m["x0"] + 8}" y="{m["y0"] + 18}" font-weight="bold" font-size="13">alt</text>')
        s.append(f'<text x="{m["x0"] + 56}" y="{m["y0"] + 19}" font-size="13" font-style="italic">{html.escape(m["cond"])}</text>')
        for yy, cond in m['otros']:
            s.append(f'<line x1="{m["x0"]}" y1="{yy - 6}" x2="{m["x1"]}" y2="{yy - 6}" stroke="{ALT_STROKE}" stroke-dasharray="8,5"/>')
            s.append(f'<text x="{m["x0"] + 10}" y="{yy + 14}" font-size="13" font-style="italic">{html.escape(cond)}</text>')
    for e in elementos:
        if e['tipo'] not in ('call', 'ret', 'self'):
            continue
        yy = e['y']
        if e.get('nota'):
            ancho_nota, nx = _caja_nota(e, pos, ancho)
            s.append(f'<rect x="{nx:.0f}" y="{yy - 74}" width="{ancho_nota}" height="38" fill="{NOTA_FILL}" stroke="{NOTA_STROKE}"/>'
                     f'<text x="{nx + ancho_nota / 2:.0f}" y="{yy - 50}" text-anchor="middle" font-size="13" fill="#333">{html.escape(e["nota"])}</text>')
        x1 = pos[e['de']]['cx']
        if e['tipo'] == 'self':
            s.append(f'<path d="M{x1 + 6},{yy} h46 v{ALTO_SELF} h-46" fill="none" stroke="#000" marker-end="url(#f)"/>'
                     f'<text x="{x1 + 60}" y="{yy + ALTO_SELF / 2 + 5}">{html.escape(e["texto"])}</text>')
            continue
        x2 = pos[e['a']]['cx']
        d = 6 if x2 > x1 else -6
        punt = ' stroke-dasharray="5,4"' if e['tipo'] == 'ret' else ''
        marca = 'fa' if e['tipo'] == 'ret' else 'f'
        s.append(f'<line x1="{x1 + d}" y1="{yy}" x2="{x2 - d}" y2="{yy}" stroke="#000" stroke-width="1.2"{punt} marker-end="url(#{marca})"/>'
                 f'<text x="{(x1 + x2) / 2:.0f}" y="{yy - 8}" text-anchor="middle">{html.escape(e["texto"])}</text>')
    s.append('</svg>')
    svg = '\n'.join(s)

    # ── draw.io (misma geometría, editable) ──
    c, n = [], [0]
    def nid():
        n[0] += 1; return f'c{n[0]}'
    c.append(f'<mxCell id="{nid()}" value="{html.escape(titulo)}" style="text;html=1;fontStyle=1;fontSize=18;align=left;" vertex="1" parent="1"><mxGeometry x="30" y="{Y_CAJA - 12}" width="900" height="28" as="geometry"/></mxCell>')
    idll = {}
    for q in parts:
        i = nid(); idll[q['id']] = i
        etiqueta = html.escape(q['nombre']).replace('\n', '&lt;br&gt;')
        base = (f'shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=1;collapsible=0;recursiveResize=0;'
                f'outlineConnect=0;fontSize={FUENTE};fillColor={FILL};strokeColor={STROKE};size={ALTO_CAJA if q["tipo"] != "actor" else 86};')
        if q['tipo'] == 'actor': base += 'participant=umlActor;verticalAlign=top;labelPosition=center;verticalLabelPosition=bottom;fontStyle=1;'
        else: base += 'fontStyle=1;'
        c.append(f'<mxCell id="{i}" value="{etiqueta}" style="{base}" vertex="1" parent="1"><mxGeometry x="{q["x"]}" y="{ytop}" width="{q["w"]}" height="{y_fin - ytop:.0f}" as="geometry"/></mxCell>')
        for a, b in barras[q['id']]:
            c.append(f'<mxCell id="{nid()}" value="" style="html=1;points=[];perimeter=orthogonalPerimeter;fillColor={FILL};strokeColor={STROKE};" vertex="1" parent="{i}"><mxGeometry x="{q["w"] / 2 - 6:.0f}" y="{a - 4 - ytop:.0f}" width="12" height="{b - a + 8:.0f}" as="geometry"/></mxCell>')
    if marco:
        m = marco
        c.append(f'<mxCell id="{nid()}" value="alt" style="shape=umlFrame;whiteSpace=wrap;html=1;fontStyle=1;fontSize=13;width=46;height=26;strokeColor={ALT_STROKE};" vertex="1" parent="1"><mxGeometry x="{m["x0"]}" y="{m["y0"]}" width="{m["x1"] - m["x0"]}" height="{m["y1"] - m["y0"]}" as="geometry"/></mxCell>')
        c.append(f'<mxCell id="{nid()}" value="{html.escape(m["cond"])}" style="text;html=1;fontStyle=2;fontSize=13;align=left;" vertex="1" parent="1"><mxGeometry x="{m["x0"] + 54}" y="{m["y0"] + 2}" width="420" height="24" as="geometry"/></mxCell>')
        for yy, cond in m['otros']:
            c.append(f'<mxCell id="{nid()}" value="" style="endArrow=none;dashed=1;html=1;strokeColor={ALT_STROKE};" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="{m["x0"]}" y="{yy - 6}" as="sourcePoint"/><mxPoint x="{m["x1"]}" y="{yy - 6}" as="targetPoint"/></mxGeometry></mxCell>')
            c.append(f'<mxCell id="{nid()}" value="{html.escape(cond)}" style="text;html=1;fontStyle=2;fontSize=13;align=left;" vertex="1" parent="1"><mxGeometry x="{m["x0"] + 8}" y="{yy - 2}" width="420" height="24" as="geometry"/></mxCell>')
    for e in elementos:
        if e['tipo'] not in ('call', 'ret', 'self'):
            continue
        yy = e['y']
        if e.get('nota'):
            ancho_nota, nx = _caja_nota(e, pos, ancho)
            c.append(f'<mxCell id="{nid()}" value="{html.escape(e["nota"])}" style="rounded=0;whiteSpace=wrap;html=1;fillColor={NOTA_FILL};strokeColor={NOTA_STROKE};fontSize=13;" vertex="1" parent="1"><mxGeometry x="{nx:.0f}" y="{yy - 74}" width="{ancho_nota}" height="38" as="geometry"/></mxCell>')
        x1 = pos[e['de']]['cx']
        if e['tipo'] == 'self':
            c.append(f'<mxCell id="{nid()}" value="{html.escape(e["texto"])}" style="html=1;align=left;spacingLeft=4;endArrow=block;endFill=1;fontSize={FUENTE};rounded=0;" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="{x1 + 6}" y="{yy}" as="sourcePoint"/><mxPoint x="{x1 + 6}" y="{yy + ALTO_SELF}" as="targetPoint"/><Array as="points"><mxPoint x="{x1 + 52}" y="{yy}"/><mxPoint x="{x1 + 52}" y="{yy + ALTO_SELF}"/></Array></mxGeometry></mxCell>')
            continue
        x2 = pos[e['a']]['cx']
        d = 6 if x2 > x1 else -6
        estilo = (f'html=1;verticalAlign=bottom;fontSize={FUENTE};' +
                  ('endArrow=open;endSize=8;dashed=1;' if e['tipo'] == 'ret' else 'endArrow=block;endFill=1;'))
        c.append(f'<mxCell id="{nid()}" value="{html.escape(e["texto"])}" style="{estilo}" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="{x1 + d}" y="{yy}" as="sourcePoint"/><mxPoint x="{x2 - d}" y="{yy}" as="targetPoint"/></mxGeometry></mxCell>')
    diagrama = (f'<diagram name="{html.escape(nombre)}" id="{re.sub(r"[^A-Za-z0-9]", "_", nombre)}"><mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{ancho:.0f}" pageHeight="{alto:.0f}" math="0" shadow="0">'
                f'<root><mxCell id="0"/><mxCell id="1" parent="0"/>{"".join(c)}</root></mxGraphModel></diagram>')
    return svg, diagrama, (ancho, alto)


def chrome():
    c = sorted(glob.glob(os.path.expanduser('~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac*/chrome-headless-shell')))
    return c[-1] if c else None


def generar_cu(cu, carpeta_base, png=True):
    """cu = dict(id, nombre, paginas=[dict(nombre, titulo, participantes, lineas)])"""
    carpeta = os.path.join(carpeta_base, cu['id'])
    os.makedirs(carpeta, exist_ok=True)
    diagramas = []
    for pag in cu['paginas']:
        svg, diag, (w, h) = construir(pag['nombre'], pag['titulo'], pag['participantes'], parsear(pag['lineas']))
        diagramas.append(diag)
        if png and chrome():
            ruta_html = os.path.join(carpeta, '_tmp.html')
            open(ruta_html, 'w', encoding='utf-8').write(f'<html><body style="margin:0">{svg}</body></html>')
            perfil = tempfile.mkdtemp(prefix='chrome-captura-')
            subprocess.run([chrome(), '--headless', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2',
                            f'--user-data-dir={perfil}', f'--window-size={w:.0f},{h:.0f}',
                            f'--screenshot={os.path.join(carpeta, pag["nombre"] + ".png")}', f'file://{ruta_html}'],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            shutil.rmtree(perfil, ignore_errors=True)
            os.remove(ruta_html)
    open(os.path.join(carpeta, f'{cu["id"]}.drawio'), 'w', encoding='utf-8').write(
        '<mxfile host="app.diagrams.net">' + ''.join(diagramas) + '</mxfile>')
    return len(cu['paginas'])
