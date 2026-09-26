# -*- coding: utf-8 -*-
# Genera el Diagrama de Componentes del Incremento 3 en dos formatos con la
# misma geometría: .drawio (editable en app.diagrams.net) y .svg (para el PNG).
#
# Reproduce el estilo del diagrama del Incremento 2 (que solo existía en PNG):
# tres cubos —Vista, Controlador, Bases de Datos—, componentes UML con sus dos
# "jetties" a la izquierda, dependencias punteadas e interfaces (lollipop)
# "HTTP/JSON" y "Driver MySQL". Suma los seis componentes internos nuevos del
# Incremento 3 dentro del Controlador.
import html

TITULO = "Diagrama de Componentes – Punto Paz Salud, Incremento 3"
ANCHO, ALTO = 1420, 860
PROF = 16  # profundidad de los cubos

# ── Paleta (la del Inc 2) ────────────────────────────────────────────────
ROJO = ("#f8cecc", "#b85450"); AZUL = ("#dae8fc", "#6c8ebf"); NARANJA = ("#ffe6cc", "#d79b00")
MORADO = ("#e1d5e7", "#9673a6"); AMARILLO = ("#fff2cc", "#d6b656"); VERDE = ("#d5e8d4", "#82b366")
TXT = "#000000"; LINEA = "#000000"

cubos = [  # id, etiqueta, x, y, w, h, colores
  ("cubo_ctrl", "Controlador", 100, 60, 960, 760, ROJO),
  ("cubo_vista", "Vista", 1180, 415, 190, 120, AZUL),
  ("cubo_bd", "Bases de Datos", 1180, 670, 190, 120, NARANJA),
]

W_EXT, H_EXT = 100, 55
comps = []  # id, etiqueta, x, y, w, h, colores
def C(cid, etq, x, y, w, h, col): comps.append((cid, etq, x, y, w, h, col))

# APIs externas (dos columnas, como en el Inc 2)
C("api_openai",  "API\nOpenAI",             430, 110, W_EXT, H_EXT, AZUL)
C("api_trans",   "API\nTransacciones",      430, 190, W_EXT, H_EXT, AMARILLO)
C("api_bonos",   "API Bonos\nElectrónicos", 430, 270, W_EXT, H_EXT, VERDE)
C("api_cloud",   "API\nCloudinary",         630, 110, W_EXT, H_EXT, MORADO)
C("api_brevo",   "API\nBrevo",              630, 190, W_EXT, H_EXT, MORADO)
C("api_expo",    "API\nExpo Push",          630, 270, W_EXT, H_EXT, MORADO)
# Capa de entrada
C("adapter", "API Adapter", 530, 365, 100, 50, ROJO)
C("rest",    "API REST",    530, 450, 100, 50, ROJO)
# Componentes internos (una fila): los dos del Inc 1-2 y los seis nuevos del Inc 3
INTERNOS = [
  ("seguridad",   "Seguridad\nJWT/BCrypt"),
  ("motor_ag",    "Motor\nAgendamiento"),
  ("programador", "Programador\nde Agenda"),
  ("despachador", "Despachador de\nNotificaciones"),
  ("motor_cl",    "Motor\nClínico"),
  ("filtro",      "Filtro de\nContenido"),
  ("cifrado",     "Cifrado de\nMensajería"),
  ("informes",    "Generador\nde Informes"),
]
W_INT, H_INT, GAP = 105, 55, 12
x0 = 118
for k, (cid, etq) in enumerate(INTERNOS):
    C(cid, etq, x0 + k * (W_INT + GAP), 570, W_INT, H_INT, ROJO)
C("dao", "Capa de\nAcceso a\nDatos", 530, 700, 100, 58, ROJO)
# Dentro de los otros cubos
C("cliente", "Cliente\nMóvil", 1225, 450, 100, 50, AZUL)
C("mysql",   "MySQL",          1225, 705, 100, 50, NARANJA)

geo = {c[0]: c[2:6] for c in comps}
def cx(i): x, y, w, h = geo[i]; return x + w / 2
def cy(i): x, y, w, h = geo[i]; return y + h / 2
def top(i): x, y, w, h = geo[i]; return (cx(i), y)
def bottom(i): x, y, w, h = geo[i]; return (cx(i), y + h)
def left(i): x, y, w, h = geo[i]; return (x, cy(i))
def right(i): x, y, w, h = geo[i]; return (x + w, cy(i))

# ── Dependencias punteadas (lista de puntos) ─────────────────────────────
edges = []  # (id, puntos, origen, destino)
# Externas → API Adapter: canal vertical propio por API para no cruzarse entre columnas
canales = {"api_openai": 545, "api_trans": 558, "api_bonos": 571, "api_cloud": 615, "api_brevo": 602, "api_expo": 589}
for cid, xch in canales.items():
    px, py = right(cid) if cid in ("api_openai", "api_trans", "api_bonos") else left(cid)
    edges.append((f"e_{cid}", [(px, py), (xch, py), (xch, geo["adapter"][1])], cid, "adapter"))
# Adapter → REST
edges.append(("e_adapter_rest", [bottom("adapter"), top("rest")], "adapter", "rest"))
# REST → cada componente interno, por un bus
BUS1 = 540
for cid, _ in INTERNOS:
    edges.append((f"e_rest_{cid}", [bottom("rest"), (cx("rest"), BUS1), (cx(cid), BUS1), top(cid)], "rest", cid))
# Internos → Capa de Acceso a Datos (el cifrado no toca la base)
BUS2 = 665
for cid, _ in INTERNOS:
    if cid == "cifrado":
        continue
    edges.append((f"e_{cid}_dao", [bottom(cid), (cx(cid), BUS2), (cx("dao"), BUS2), top("dao")], cid, "dao"))
# Despachador → API Adapter (push y correo salen por el adaptador)
xd = cx("despachador") - 35
edges.append(("e_desp_adapter", [(xd, geo["despachador"][1]), (xd, cy("adapter")), left("adapter")], "despachador", "adapter"))
# Programador → Despachador y Motor Clínico → Despachador (vecinos)
edges.append(("e_prog_desp", [right("programador"), left("despachador")], "programador", "despachador"))
edges.append(("e_mcl_desp", [left("motor_cl"), right("despachador")], "motor_cl", "despachador"))
# Filtro y Cifrado los usa el REST (ya cubierto); Motor Clínico → Filtro no aplica.

# ── Interfaces (lollipop) ────────────────────────────────────────────────
lollis = [  # id, etiqueta, desde, circulo(x,y), hasta
  ("i_http", "HTTP/JSON", right("rest"), (1130, cy("rest")), (1180, cy("rest"))),
  ("i_mysql", "Driver\nMySQL", right("dao"), (1130, cy("dao")), (1180, cy("dao"))),
]

# ── drawio ───────────────────────────────────────────────────────────────
cells = ['<mxCell id="0"/><mxCell id="1" parent="0"/>']
cells.append(f'<mxCell id="titulo" value="{html.escape(TITULO)}" style="text;html=1;align=left;verticalAlign=middle;fontStyle=1;fontSize=16;fontFamily=Helvetica;" vertex="1" parent="1"><mxGeometry x="20" y="14" width="700" height="30" as="geometry"/></mxCell>')
for cid, etq, x, y, w, h, (fill, stroke) in cubos:
    cells.append(f'<mxCell id="{cid}" value="{html.escape(etq)}" style="shape=cube;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;darkOpacity=0.05;darkOpacity2=0.1;size={PROF};fillColor={fill};strokeColor={stroke};verticalAlign=top;align=left;spacingLeft=6;spacingTop=2;fontStyle=4;fontFamily=Helvetica;fontSize=12;" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
for cid, etq, x, y, w, h, (fill, stroke) in comps:
    v = html.escape(etq).replace("\n", "&lt;br&gt;")
    cells.append(f'<mxCell id="{cid}" value="{v}" style="shape=component;jettyWidth=8;jettyHeight=4;html=1;whiteSpace=wrap;align=center;verticalAlign=middle;fillColor={fill};strokeColor={stroke};gradientColor=#ffffff;gradientDirection=north;fontFamily=Helvetica;fontSize=11;" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
for eid, pts, src, dst in edges:
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    medios = "".join(f'<mxPoint x="{px:.0f}" y="{py:.0f}"/>' for px, py in pts[1:-1])
    cells.append(f'<mxCell id="{eid}" style="endArrow=none;dashed=1;html=1;strokeColor={LINEA};rounded=0;" edge="1" parent="1" source="{src}" target="{dst}"><mxGeometry relative="1" as="geometry"><mxPoint x="{x1:.0f}" y="{y1:.0f}" as="sourcePoint"/><mxPoint x="{x2:.0f}" y="{y2:.0f}" as="targetPoint"/><Array as="points">{medios}</Array></mxGeometry></mxCell>')
for lid, etq, (x1, y1), (cxl, cyl), (x2, y2) in lollis:
    v = html.escape(etq).replace("\n", "&lt;br&gt;")
    cells.append(f'<mxCell id="{lid}_l1" style="endArrow=none;html=1;strokeColor={LINEA};" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="{x1:.0f}" y="{y1:.0f}" as="sourcePoint"/><mxPoint x="{cxl-8:.0f}" y="{cyl:.0f}" as="targetPoint"/></mxGeometry></mxCell>')
    cells.append(f'<mxCell id="{lid}_c" value="" style="ellipse;html=1;fillColor=#ffffff;strokeColor={LINEA};" vertex="1" parent="1"><mxGeometry x="{cxl-8:.0f}" y="{cyl-8:.0f}" width="16" height="16" as="geometry"/></mxCell>')
    cells.append(f'<mxCell id="{lid}_l2" style="endArrow=none;html=1;strokeColor={LINEA};" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="{cxl+8:.0f}" y="{cyl:.0f}" as="sourcePoint"/><mxPoint x="{x2:.0f}" y="{y2:.0f}" as="targetPoint"/></mxGeometry></mxCell>')
    cells.append(f'<mxCell id="{lid}_t" value="{v}" style="text;html=1;align=center;verticalAlign=bottom;fontFamily=Helvetica;fontSize=11;" vertex="1" parent="1"><mxGeometry x="{(x1+cxl)/2-50:.0f}" y="{cyl-42:.0f}" width="100" height="36" as="geometry"/></mxCell>')
drawio = ('<mxfile host="app.diagrams.net"><diagram name="Diagrama de Componentes Inc 3" id="componentes-inc3">'
          f'<mxGraphModel dx="1400" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{ANCHO}" pageHeight="{ALTO}" math="0" shadow="0"><root>'
          + "".join(cells) + '</root></mxGraphModel></diagram></mxfile>')
open("Diagrama de Componentes Inc3.drawio", "w", encoding="utf-8").write(drawio)

# ── SVG ──────────────────────────────────────────────────────────────────
def oscurecer(hexcolor, f):
    r, g, b = (int(hexcolor[i:i+2], 16) for i in (1, 3, 5))
    return "#%02x%02x%02x" % (int(r*f), int(g*f), int(b*f))
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{ANCHO}" height="{ALTO}" viewBox="0 0 {ANCHO} {ALTO}" font-family="Helvetica, Arial, sans-serif">',
       '<rect width="100%" height="100%" fill="white"/>',
       f'<text x="20" y="34" font-size="16" font-weight="bold">{html.escape(TITULO)}</text>']
for cid, etq, x, y, w, h, (fill, stroke) in cubos:
    d = PROF
    svg.append(f'<polygon points="{x},{y+d} {x+d},{y} {x+w},{y} {x+w-d},{y+d}" fill="{oscurecer(fill,0.96)}" stroke="{stroke}"/>')
    svg.append(f'<polygon points="{x+w-d},{y+d} {x+w},{y} {x+w},{y+h-d} {x+w-d},{y+h}" fill="{oscurecer(fill,0.9)}" stroke="{stroke}"/>')
    svg.append(f'<rect x="{x}" y="{y+d}" width="{w-d}" height="{h-d}" fill="{fill}" stroke="{stroke}"/>')
    svg.append(f'<text x="{x+7}" y="{y+d+15}" font-size="12" text-decoration="underline">{html.escape(etq)}</text>')
for eid, pts, src, dst in edges:
    svg.append(f'<polyline fill="none" stroke="{LINEA}" stroke-width="1" stroke-dasharray="4 3" points="' + " ".join(f"{px:.0f},{py:.0f}" for px, py in pts) + '"/>')
for lid, etq, (x1, y1), (cxl, cyl), (x2, y2) in lollis:
    svg.append(f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{cxl-8:.0f}" y2="{cyl:.0f}" stroke="{LINEA}"/>')
    svg.append(f'<circle cx="{cxl:.0f}" cy="{cyl:.0f}" r="8" fill="white" stroke="{LINEA}"/>')
    svg.append(f'<line x1="{cxl+8:.0f}" y1="{cyl:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{LINEA}"/>')
    lineas = etq.split("\n")
    for j, ln in enumerate(lineas):
        svg.append(f'<text x="{(x1+cxl)/2:.0f}" y="{cyl-10-(len(lineas)-1-j)*13:.0f}" font-size="11" text-anchor="middle">{html.escape(ln)}</text>')
for cid, etq, x, y, w, h, (fill, stroke) in comps:
    gid = f"g_{cid}"
    svg.append(f'<defs><linearGradient id="{gid}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="{fill}"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>')
    svg.append(f'<rect x="{x+8}" y="{y}" width="{w-8}" height="{h}" fill="url(#{gid})" stroke="{stroke}"/>')
    for yy in (y + h*0.28, y + h*0.55):
        svg.append(f'<rect x="{x}" y="{yy:.0f}" width="16" height="6" fill="{fill}" stroke="{stroke}"/>')
    lineas = etq.split("\n")
    y0 = y + h/2 - (len(lineas)-1)*6.5 + 4
    for j, ln in enumerate(lineas):
        svg.append(f'<text x="{x+8+(w-8)/2:.0f}" y="{y0+j*13:.0f}" font-size="11" text-anchor="middle">{html.escape(ln)}</text>')
svg.append('</svg>')
open("componentes.svg", "w", encoding="utf-8").write("\n".join(svg))
open("componentes.html", "w", encoding="utf-8").write(f'<html><body style="margin:0">{"".join(svg)}</body></html>')
print(f"componentes: {len(comps)} · dependencias: {len(edges)} · tamaño {ANCHO}x{ALTO}")
