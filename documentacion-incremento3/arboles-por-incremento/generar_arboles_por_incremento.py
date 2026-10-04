# -*- coding: utf-8 -*-
# Árboles de navegación de los incrementos 1, 2 y 3 coloreados según el
# incremento en que se incorporó cada interfaz y cada funcionalidad:
#   Incremento 1 = azul · Incremento 2 = morado · Incremento 3 = verde
# Tono fuerte = interfaz; tono claro = funcionalidad.
#
# - Inc 1: transcrito del árbol original del informe (commit 87b9e15 del repo
#   de documentación), con su misma estructura.
# - Inc 2 e Inc 3: se leen de los generadores de cada incremento
#   (documentacion-incremento2/… y documentacion-incremento3/arbol-navegacion/).
# Salida: .drawio (editable) + .svg + .png (Chromium headless) por incremento.
import html, math, os, re, subprocess, glob

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, '..', '..'))

def I(label, funcs=(), hijos=(), nota=None):
    return {"t": "i", "label": label, "funcs": list(funcs), "hijos": list(hijos), "nota": nota}

def leer_arbol(ruta):
    """Ejecuta el generador hasta su definición del árbol y devuelve `arbol`."""
    codigo = open(ruta, encoding='utf-8').read().split('# ── Layout')[0]
    ns = {}
    exec(codigo, ns)
    return ns['arbol']

# ── Incremento 1 (árbol original) ───────────────────────────────────────
ARBOL_INC1 = I("Sistema", hijos=[
  I("Registro", ["Registrar paciente (CU01)", "Registrar profesional (CU02)", "Controlar unicidad de cuentas (CU03)"], hijos=[
    I("Activación de Cuenta", ["Verificar identidad OTP (CU04)"], hijos=[
      I("Inicio de Sesión", ["Autenticar usuario (CU05)"], hijos=[
        I("Gestión Profesional", ["Visualizar panel profesional (CU11)"]),
        I("Panel de Acceso Restringido", ["Controlar acceso RBAC (CU12)"]),
        I("Consola de Auditoría", ["Registrar bitácora de auditoría (CU13)"]),
        I("Agendamiento de Cita", ["Buscar y seleccionar cita (CU14)", "Controlar concurrencia (CU15)"], hijos=[
          I("Atención Clínica", ["Consolidar ficha clínica (CU28)"]),
          I("Ficha Clínica", ["Registrar antecedentes (CU29)", "Asegurar inalterabilidad (CU30)", "Definir metas y objetivos (CU32)",
                              "Documentar intervención (CU40)", "Firmar digitalmente (CU36)", "Registrar marcas temporales (CU38)"]),
        ]),
        I("Gestión de Disponibilidad", ["Restringir disponibilidad (CU16)"]),
        I("Gestión de Agenda", ["Transicionar estados de cita (CU20)"]),
        I("Gestión de Parámetros", ["Gestionar parámetros globales (CU59)"]),
      ]),
    ]),
  ]),
])

# ── En qué incremento apareció cada cosa ────────────────────────────────
CU_INC = {}
for n in (1, 2, 3, 4, 5, 11, 12, 13, 14, 15, 16, 20, 28, 29, 30, 32, 36, 38, 40, 59, 68, 70): CU_INC[n] = 1
for n in (6, 7, 8, 9, 10, 17, 18, 22, 23, 24, 27, 31, 33, 34, 35, 39, 41, 42, 43, 46, 47, 48, 49, 66, 67, 69, 71, 76, 77, 78, 79): CU_INC[n] = 2
for n in (19, 21, 25, 26, 44, 45, 50, 52, 53, 55, 56, 57, 58, 60, 61, 63, 64, 73, 74, 75): CU_INC[n] = 3

INTERFAZ_INC1 = {"Sistema", "Registro", "Activación de Cuenta", "Inicio de Sesión", "Panel de Acceso Restringido",
                 "Consola de Auditoría", "Gestión Profesional", "Agendamiento de Cita", "Gestión de Disponibilidad",
                 "Gestión de Parámetros", "Ficha Clínica", "Historial (Gestión de Agenda)", "Gestión de Agenda",
                 "Sesión Clínica (Atención Clínica)", "Atención Clínica",
                 "Inicio (Fichas)"}  # en el Inc 3 es la nómina del antiguo panel del profesional
INTERFAZ_INC2 = {"Recuperar Contraseña", "Seguridad de la Cuenta", "Inicio Paciente", "Mis Citas", "Inicio (Mis Citas)",
                 "Evidencia de Sesión", "Entrevista Previa", "Mis Ejercicios", "Pagos y Bonos", "Mis Documentos",
                 "Visor de Documento", "Mi Jornada", "Mi Perfil Público", "Perfil (Mi Perfil Público)", "Anamnesis",
                 "Episodios", "Pautas", "Firma de Conformidad", "Documentos del Paciente", "Sesiones Suspendidas"}

# Funcionalidades cuyo incremento no es el de su CU: se incorporaron después,
# o el CU es anterior pero la funcionalidad aparece en otra interfaz.
FUNC_INC = {
    "Saludo al paciente": 3,
    "Abrir la entrevista si está pendiente (CU23)": 3,
    "Volver a la pregunta anterior (CU23)": 3,
    "Validar contraseña en tiempo real (CU01)": 3,
    "Ver modalidad y comunas (CU14)": 3,
    "Episodio y evolución recientes con historial (CU28)": 3,
    "Ir a la ficha clínica (CU28)": 3,
    "Gestionar bloques horarios (CU02)": 3,
    "Ver perfil público (CU10)": 3,
    "Definir bloques horarios (CU02)": 1,
    "Consultar agenda del día (CU11)": 2,
}
FUNC_INC_EN = {("Gestión de Parámetros", "Restringir disponibilidad (CU16)"): 2}

def inc_interfaz(label):
    return 1 if label in INTERFAZ_INC1 else 2 if label in INTERFAZ_INC2 else 3

def inc_funcion(label, interfaz):
    if (interfaz, label) in FUNC_INC_EN: return FUNC_INC_EN[(interfaz, label)]
    if label in FUNC_INC: return FUNC_INC[label]
    m = re.search(r'\(CU(\d+)\)', label)
    return CU_INC.get(int(m.group(1)), 3) if m else 3

# ── Colores ──────────────────────────────────────────────────────────────
COLOR = {  # nombre, interfaz (relleno, borde), funcionalidad (relleno, borde)
    1: ("Azul",   ("#2563B8", "#1B4F8F"), ("#D6E4F7", "#2563B8")),
    2: ("Morado", ("#7E4BB3", "#5E3388"), ("#EADFF6", "#7E4BB3")),
    3: ("Verde",  ("#1F8A5B", "#166845"), ("#D5EFE2", "#1F8A5B")),
}
TXT_I, TXT_F = "#FFFFFF", "#1D1D3B"
W, H, FW, FH, GAP_X, MARGEN, LADO = 130, 50, 130, 58, 22, 40, 34

def envolver(txt, maxc):
    palabras, lineas, actual = txt.split(), [], ""
    for p in palabras:
        if len(actual) + len(p) + 1 > maxc and actual:
            lineas.append(actual); actual = p
        else:
            actual = (actual + " " + p).strip()
    if actual: lineas.append(actual)
    return lineas

def dibujar(arbol, titulo, nombre, incrementos):
    def ancho(n):
        if n["hijos"]:
            a = sum(ancho(h) for h in n["hijos"]) + GAP_X * (len(n["hijos"]) - 1)
            if n["funcs"]: a = max(a, 2 * (LADO + FW + 16))
            n["_w"] = a
        else:
            n["_w"] = max(W, FW) + GAP_X
        return n["_w"]
    ancho(arbol)
    nodos, aristas = [], []
    def colocar(n, x0, y):
        cx = x0 + n["_w"] / 2
        n["_cx"] = cx
        nodos.append({"x": cx - W/2, "y": y, "w": W, "h": H, "label": n["label"], "tipo": "i", "nota": n["nota"],
                      "inc": inc_interfaz(n["label"])})
        if not n["hijos"]:
            fy, prev = y + H + 28, (cx, y + H)
            for f in n["funcs"]:
                nodos.append({"x": cx - FW/2, "y": fy, "w": FW, "h": FH, "label": f, "tipo": "f", "inc": inc_funcion(f, n["label"])})
                aristas.append([prev, (cx, fy)]); prev = (cx, fy + FH); fy += FH + 14
            return
        filas = math.ceil(len(n["funcs"]) / 2)
        fy = y + H + 26
        for k, f in enumerate(n["funcs"]):
            fila, lado = divmod(k, 2)
            yy = fy + fila * (FH + 12)
            fx = cx - LADO - FW if lado == 0 else cx + LADO
            nodos.append({"x": fx, "y": yy, "w": FW, "h": FH, "label": f, "tipo": "f", "inc": inc_funcion(f, n["label"])})
            ax = fx + FW if lado == 0 else fx
            aristas.append([(cx, yy + FH/2), (ax, yy + FH/2)])
        bus_y = (fy + filas * (FH + 12) + 12) if n["funcs"] else (y + H + 44)
        cy = bus_y + 30
        total = sum(h["_w"] for h in n["hijos"]) + GAP_X * (len(n["hijos"]) - 1)
        x = x0 + (n["_w"] - total) / 2
        for h in n["hijos"]:
            colocar(h, x, cy)
            hx = h["_cx"]
            aristas.append([(cx, y + H), (hx, cy)] if len(n["hijos"]) == 1 and abs(hx - cx) < 1
                           else [(cx, y + H), (cx, bus_y), (hx, bus_y), (hx, cy)])
            x += h["_w"] + GAP_X
    colocar(arbol, MARGEN, MARGEN + 70 + 40 * len(incrementos))
    ANCHO = max(max(nd["x"] + nd["w"] for nd in nodos) + MARGEN, 900)
    ALTO = max(nd["y"] + nd["h"] for nd in nodos) + MARGEN

    def estilo(nd):
        _, ci, cf = COLOR[nd["inc"]]
        return (ci if nd["tipo"] == "i" else cf), (TXT_I if nd["tipo"] == "i" else TXT_F)

    # Leyenda: una fila por incremento mostrado (interfaz + funcionalidad).
    leyenda = []
    for k, inc in enumerate(incrementos):
        nom, ci, cf = COLOR[inc]
        leyenda.append((MARGEN, MARGEN + 46 + 36 * k, inc, nom, ci, cf))

    # drawio
    cells = []
    cells.append(f'<mxCell id="titulo" value="{html.escape(titulo)}" style="text;html=1;align=left;fontStyle=1;fontSize=20;fontFamily=Helvetica;fontColor={TXT_F};" vertex="1" parent="1"><mxGeometry x="{MARGEN}" y="{MARGEN}" width="900" height="30" as="geometry"/></mxCell>')
    for x, y, inc, nom, ci, cf in leyenda:
        cells.append(f'<mxCell id="li{inc}" value="Interfaz" style="rounded=1;whiteSpace=wrap;html=1;fillColor={ci[0]};strokeColor={ci[1]};fontColor={TXT_I};fontSize=10;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="80" height="26" as="geometry"/></mxCell>')
        cells.append(f'<mxCell id="lf{inc}" value="Funcionalidad" style="rounded=1;whiteSpace=wrap;html=1;fillColor={cf[0]};strokeColor={cf[1]};fontColor={TXT_F};fontSize=10;" vertex="1" parent="1"><mxGeometry x="{x + 88}" y="{y}" width="96" height="26" as="geometry"/></mxCell>')
        cells.append(f'<mxCell id="lt{inc}" value="Incremento {inc} ({nom})" style="text;html=1;align=left;verticalAlign=middle;fontStyle=1;fontSize=14;fontColor={TXT_F};" vertex="1" parent="1"><mxGeometry x="{x + 196}" y="{y}" width="220" height="26" as="geometry"/></mxCell>')
    for k, nd in enumerate(nodos):
        (fill, stroke), txt = estilo(nd)
        label = html.escape(nd["label"])
        if nd.get("nota"):
            label += f'&lt;br&gt;&lt;font style=&quot;font-size:9px&quot;&gt;({html.escape(nd["nota"])})&lt;/font&gt;'
        fs, bold = (11, 1) if nd["tipo"] == "i" else (10, 0)
        cells.append(f'<mxCell id="n{k}" value="{label}" style="rounded=1;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};fontColor={txt};fontSize={fs};fontStyle={bold};fontFamily=Helvetica;arcSize=18;" vertex="1" parent="1"><mxGeometry x="{nd["x"]:.0f}" y="{nd["y"]:.0f}" width="{nd["w"]}" height="{nd["h"]}" as="geometry"/></mxCell>')
    for k, pts in enumerate(aristas):
        (x1, y1), (x2, y2) = pts[0], pts[-1]
        medios = "".join(f'<mxPoint x="{px:.0f}" y="{py:.0f}"/>' for px, py in pts[1:-1])
        cells.append(f'<mxCell id="e{k}" style="endArrow=none;html=1;strokeColor=#5C5C7A;strokeWidth=1;" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="{x1:.0f}" y="{y1:.0f}" as="sourcePoint"/><mxPoint x="{x2:.0f}" y="{y2:.0f}" as="targetPoint"/><Array as="points">{medios}</Array></mxGeometry></mxCell>')
    drawio = (f'<mxfile host="app.diagrams.net"><diagram name="{html.escape(titulo)}" id="{nombre}">'
              f'<mxGraphModel dx="1400" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{int(ANCHO)}" pageHeight="{int(ALTO)}" math="0" shadow="0">'
              '<root><mxCell id="0"/><mxCell id="1" parent="0"/>' + "".join(cells) + '</root></mxGraphModel></diagram></mxfile>')
    open(os.path.join(AQUI, f"{nombre}.drawio"), "w", encoding="utf-8").write(drawio)

    # svg
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{ANCHO:.0f}" height="{ALTO:.0f}" viewBox="0 0 {ANCHO:.0f} {ALTO:.0f}" font-family="Helvetica, Arial, sans-serif">',
           '<rect width="100%" height="100%" fill="white"/>',
           f'<text x="{MARGEN}" y="{MARGEN + 22}" font-size="20" font-weight="bold" fill="{TXT_F}">{html.escape(titulo)}</text>']
    for x, y, inc, nom, ci, cf in leyenda:
        svg.append(f'<rect x="{x}" y="{y}" width="80" height="26" rx="6" fill="{ci[0]}" stroke="{ci[1]}"/><text x="{x + 40}" y="{y + 17}" font-size="10" font-weight="bold" text-anchor="middle" fill="{TXT_I}">Interfaz</text>')
        svg.append(f'<rect x="{x + 88}" y="{y}" width="96" height="26" rx="6" fill="{cf[0]}" stroke="{cf[1]}"/><text x="{x + 136}" y="{y + 17}" font-size="10" text-anchor="middle" fill="{TXT_F}">Funcionalidad</text>')
        svg.append(f'<text x="{x + 196}" y="{y + 18}" font-size="14" font-weight="bold" fill="{TXT_F}">Incremento {inc} ({nom})</text>')
    for pts in aristas:
        svg.append('<polyline fill="none" stroke="#5C5C7A" stroke-width="1.2" points="' + " ".join(f"{x:.0f},{y:.0f}" for x, y in pts) + '"/>')
    for nd in nodos:
        (fill, stroke), txt = estilo(nd)
        fs = 11 if nd["tipo"] == "i" else 10
        lineas = envolver(nd["label"], 20 if nd["tipo"] == "i" else 22)
        if nd.get("nota"): lineas.append(f'({nd["nota"]})')
        svg.append(f'<rect x="{nd["x"]:.0f}" y="{nd["y"]:.0f}" width="{nd["w"]}" height="{nd["h"]}" rx="8" fill="{fill}" stroke="{stroke}"/>')
        lh = fs + 3
        y0 = nd["y"] + nd["h"]/2 - (len(lineas)-1) * lh/2 + fs*0.35
        for j, ln in enumerate(lineas):
            es_nota = nd.get("nota") and j == len(lineas) - 1
            peso = ' font-weight="bold"' if nd["tipo"] == "i" and not es_nota else ''
            svg.append(f'<text x="{nd["x"]+nd["w"]/2:.0f}" y="{y0 + j*lh:.0f}" font-size="{9 if es_nota else fs}" text-anchor="middle" fill="{txt}"{peso}>{html.escape(ln)}</text>')
    svg.append('</svg>')
    open(os.path.join(AQUI, f"{nombre}.svg"), "w", encoding="utf-8").write("\n".join(svg))

    # png
    pagina = os.path.join(AQUI, f"_{nombre}.html")
    open(pagina, "w", encoding="utf-8").write(f'<html><body style="margin:0">{"".join(svg)}</body></html>')
    chrome = sorted(glob.glob(os.path.expanduser('~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac*/chrome-headless-shell')))
    if chrome:
        subprocess.run([chrome[-1], '--headless', '--disable-gpu', '--hide-scrollbars', f'--window-size={int(ANCHO)},{int(ALTO)}',
                        f'--screenshot={os.path.join(AQUI, nombre + ".png")}', f'file://{pagina}'], capture_output=True)
    os.remove(pagina)

    cuenta = {inc: [0, 0] for inc in incrementos}
    for nd in nodos:
        cuenta[nd["inc"]][0 if nd["tipo"] == "i" else 1] += 1
    print(f"{nombre}: {ANCHO:.0f}x{ALTO:.0f} · " + " · ".join(f"Inc {k}: {v[0]} interfaces, {v[1]} funcionalidades" for k, v in cuenta.items()))
    return cuenta


if __name__ == "__main__":
    dibujar(ARBOL_INC1, "Árbol de Navegación – FRO Salud, Incremento 1", "Arbol de Navegacion Inc1 por incremento", [1])
    dibujar(leer_arbol(os.path.join(RAIZ, 'documentacion-incremento2/arbol-navegacion/generar_arbol.py')),
            "Árbol de Navegación – FRO Salud, Incremento 2", "Arbol de Navegacion Inc2 por incremento", [1, 2])
    dibujar(leer_arbol(os.path.join(RAIZ, 'documentacion-incremento3/arbol-navegacion/generar_arbol.py')),
            "Árbol de Navegación – Punto Paz Salud, Incremento 3", "Arbol de Navegacion Inc3 por incremento", [1, 2, 3])
