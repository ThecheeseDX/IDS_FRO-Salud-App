# -*- coding: utf-8 -*-
"""
Dibuja en SVG un Diagram.xml de Bizagi (XPDL 2.2), leyendo las coordenadas tal
como quedaron en el archivo. Sirve para revisar el resultado sin abrir Bizagi.
"""
import html
import textwrap
import xml.etree.ElementTree as ET

X = '{http://www.wfmc.org/2009/XPDL2.2}'


def _g(e):
    g = e.find(f'{X}NodeGraphicsInfos/{X}NodeGraphicsInfo')
    c = g.find(f'{X}Coordinates')
    return float(c.get('XCoordinate')), float(c.get('YCoordinate')), float(g.get('Width')), float(g.get('Height')), g


def _texto(x, y, w, texto, tam=11, negrita=False, ancho_car=None, alto=None):
    car = max(6, int(w / (tam * 0.56)))
    lineas = textwrap.wrap(texto, car) or ['']
    y0 = y - (len(lineas) - 1) * (tam + 2) / 2
    peso = ' font-weight="600"' if negrita else ''
    return ''.join(f'<text x="{x:.0f}" y="{y0 + i * (tam + 2) + tam * 0.35:.0f}" font-size="{tam}" text-anchor="middle"{peso}>{html.escape(l)}</text>'
                   for i, l in enumerate(lineas))


MARCA = {'TaskUser': '👤', 'TaskSend': '✉', 'TaskReceive': '✉', 'TaskManual': '✋', 'TaskService': '⚙', 'TaskBusinessRule': '▦'}


def svg_de_diagrama(xml_texto, solo_pool=None):
    r = ET.fromstring(xml_texto)
    o, cajas = [], {}
    xmax = ymax = 0
    xmin = ymin = 10 ** 9
    for pool in r.iter(f'{X}Pool'):
        if pool.get('BoundaryVisible') != 'true':
            continue
        if solo_pool and pool.get('Name') != solo_pool:
            continue
        px, py, pw, ph, _ = _g(pool)
        xmin, ymin, xmax, ymax = min(xmin, px), min(ymin, py), max(xmax, px + pw), max(ymax, py + ph)
        o.append(f'<rect x="{px}" y="{py}" width="{pw}" height="{ph}" fill="#fff" stroke="#000" stroke-width="1.4"/>')
        o.append(f'<line x1="{px + 25}" y1="{py}" x2="{px + 25}" y2="{py + ph}" stroke="#000"/>')
        o.append(f'<text transform="translate({px + 17},{py + ph / 2}) rotate(-90)" font-size="12" font-weight="600" text-anchor="middle">{html.escape(pool.get("Name"))}</text>')
        for lane in pool.iter(f'{X}Lane'):
            lx, ly, lw, lh, _ = _g(lane)
            o.append(f'<rect x="{px + 25}" y="{py + ly}" width="{pw - 25}" height="{lh}" fill="none" stroke="#505050"/>')
            o.append(f'<line x1="{px + 50}" y1="{py + ly}" x2="{px + 50}" y2="{py + ly + lh}" stroke="#505050"/>')
            o.append(f'<text transform="translate({px + 42},{py + ly + lh / 2}) rotate(-90)" font-size="11" font-weight="600" text-anchor="middle">{html.escape(lane.get("Name"))}</text>')
        for m in pool.iter(f'{X}Milestone'):
            mx, my, mw, mh, _ = _g(m)
            o.append(f'<line x1="{px + mx + mw}" y1="{py}" x2="{px + mx + mw}" y2="{py + ph}" stroke="#909090" stroke-dasharray="6 4"/>')
            o.append(f'<text x="{px + mx + mw / 2}" y="{py + 18}" font-size="11" font-weight="600" text-anchor="middle" fill="#333">{html.escape(m.get("Name"))}</text>')
    procesos_visibles = None
    if solo_pool:
        procesos_visibles = {p.get('Process') for p in r.iter(f'{X}Pool') if p.get('Name') == solo_pool}
    lineas = []
    for wp in r.iter(f'{X}WorkflowProcess'):
        if procesos_visibles is not None and wp.get('Id') not in procesos_visibles:
            continue
        for a in wp.iter(f'{X}Activity'):
            x, y, w, h, g = _g(a)
            cajas[a.get('Id')] = (x, y, w, h)
            nombre = a.get('Name') or ''
            if a.find(f'{X}Event') is not None:
                fin = a.find(f'{X}Event/{X}EndEvent') is not None
                o.append(f'<circle cx="{x + w / 2}" cy="{y + h / 2}" r="{w / 2}" fill="{"#eeaaaa" if fin else "#e6ffd7"}" stroke="{"#990000" if fin else "#62a716"}" stroke-width="{3 if fin else 1.5}"/>')
                if nombre:
                    o.append(_texto(float(g.get('TextX')) + float(g.get('TextWidth')) / 2, float(g.get('TextY')) + 12, float(g.get('TextWidth')), nombre, 10))
            elif a.find(f'{X}Route') is not None:
                cx, cy = x + w / 2, y + h / 2
                o.append(f'<polygon points="{cx},{y} {x + w},{cy} {cx},{y + h} {x},{cy}" fill="#ffffcc" stroke="#a6a61d" stroke-width="1.5"/>')
                marca = '○' if a.find(f'{X}Route').get('GatewayType') == 'Inclusive' else '✕'
                o.append(f'<text x="{cx}" y="{cy + 5}" font-size="14" text-anchor="middle">{marca}</text>')
                if nombre:
                    o.append(_texto(float(g.get('TextX')) + float(g.get('TextWidth')) / 2, float(g.get('TextY')) + 12, float(g.get('TextWidth')), nombre, 10))
            else:
                sub = a.find(f'{X}Implementation/{X}SubFlow') is not None
                o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="#ecefff" stroke="#03689a" stroke-width="{2.2 if sub else 1.4}"/>')
                tarea = a.find(f'{X}Implementation/{X}Task')
                if tarea is not None and len(tarea):
                    o.append(f'<text x="{x + 6}" y="{y + 15}" font-size="12">{MARCA.get(tarea[0].tag.replace(X, ""), "")}</text>')
                if sub:
                    o.append(f'<rect x="{x + w / 2 - 7}" y="{y + h - 15}" width="14" height="12" fill="#fff" stroke="#03689a"/><text x="{x + w / 2}" y="{y + h - 5}" font-size="11" text-anchor="middle">+</text>')
                o.append(_texto(x + w / 2, y + h / 2 + 3, w - 14, nombre, 11))
        for d in wp.iter(f'{X}DataStoreReference'):
            x, y, w, h, g = _g(d)
            cajas[d.get('Id')] = (x, y, w, h)
            nombre = next((s.get('Name') for s in r.iter(f'{X}DataStore') if s.get('Id') == d.get('DataStoreRef')), '')
            o.append(f'<path d="M{x},{y + 8} a{w / 2},8 0 0 1 {w},0 v{h - 16} a{w / 2},8 0 0 1 -{w},0 z M{x},{y + 8} a{w / 2},8 0 0 0 {w},0" fill="#f0f0f0" stroke="#666"/>')
            o.append(_texto(float(g.get('TextX')) + float(g.get('TextWidth')) / 2, float(g.get('TextY')) + 12, float(g.get('TextWidth')), nombre, 10))
        for t in wp.iter(f'{X}Transition'):
            g = t.find(f'{X}ConnectorGraphicsInfos/{X}ConnectorGraphicsInfo')
            pts = [(float(c.get('XCoordinate')), float(c.get('YCoordinate'))) for c in g.findall(f'{X}Coordinates')]
            lineas.append(f'<polyline points="{" ".join(f"{x},{y}" for x, y in pts)}" fill="none" stroke="#000" stroke-width="1.3" marker-end="url(#f)"/>')
            if t.get('Name'):
                tx, ty, tw = float(g.get('TextX')), float(g.get('TextY')), float(g.get('TextWidth') or 40)
                lineas.append(f'<rect x="{tx}" y="{ty}" width="{tw}" height="18" fill="#fff" opacity="0.85"/>')
                lineas.append(f'<text x="{tx + tw / 2}" y="{ty + 13}" font-size="10.5" text-anchor="middle">{html.escape(t.get("Name"))}</text>')
    for a in r.iter(f'{X}Association'):
        if a.get('Source') not in cajas:
            continue
        g = a.find(f'{X}ConnectorGraphicsInfos/{X}ConnectorGraphicsInfo')
        pts = [(float(c.get('XCoordinate')), float(c.get('YCoordinate'))) for c in g.findall(f'{X}Coordinates')]
        lineas.append(f'<polyline points="{" ".join(f"{x},{y}" for x, y in pts)}" fill="none" stroke="#555" stroke-dasharray="3 3" marker-end="url(#f)"/>')
    m = 14
    ancho, alto = xmax - xmin + 2 * m, ymax - ymin + 2 * m
    cab = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{ancho:.0f}" height="{alto:.0f}" viewBox="{xmin - m} {ymin - m} {ancho} {alto}" '
           f'font-family="Segoe UI, Helvetica, Arial, sans-serif"><defs><marker id="f" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">'
           f'<path d="M0,0 L10,5 L0,10 z"/></marker></defs><rect x="{xmin - m}" y="{ymin - m}" width="{ancho}" height="{alto}" fill="#fff"/>')
    return cab + ''.join(o) + ''.join(lineas) + '</svg>', ancho, alto
