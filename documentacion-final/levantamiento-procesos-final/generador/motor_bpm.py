# -*- coding: utf-8 -*-
"""
Motor que escribe un archivo .bpm de Bizagi Modeler (versión 4.3) a partir de
una descripción simple de los procesos (ver procesos.py).

Un .bpm es un ZIP con un .diag por diagrama; cada .diag es otro ZIP cuyo
Diagram.xml está en XPDL 2.2. La estructura que se escribe aquí copia, etiqueta
por etiqueta, la del levantamiento inicial del Documento 0
("Levantamiento de Procesos.bpm"), para que Bizagi lo abra igual.

También dibuja cada proceso en SVG (vista previa), leyendo las mismas
coordenadas que quedan en el archivo.
"""
import html
import io
import uuid
import zipfile

NS = uuid.UUID('6f1d6c2e-8f0b-4d1f-9d53-3a2c7b1e0f17')
FECHA = '2026-11-12T21:30:00.0000000-03:00'
FECHA_Z = '2026-11-13T00:30:00.0000000Z'
AUTOR = 'Grupo 17'
VERSION = '4.3.0.008'

# ── Medidas de la grilla ─────────────────────────────────────────────────────
POOL_X = 30
CABECERA = 50            # franja con el nombre del pool, a la izquierda
MARGEN_IZQ = 70          # del borde de la calle al centro de la columna 0
ANCHO_COL = 172
ALTO_FILA = 118
MARGEN_SUP = 62          # primera calle: espacio para el título de la fase
MARGEN_CALLE = 26
SEPARACION_POOLS = 60

TAM = {
    'start': (30, 30), 'end': (30, 30), 'gw': (40, 40), 'gwi': (40, 40),
    'user': (128, 78), 'send': (128, 78), 'receive': (128, 78), 'manual': (128, 78),
    'service': (128, 78), 'rule': (128, 78), 'sub': (128, 78),
}
COLOR = {  # (borde, relleno) en ARGB con signo, iguales a los del original
    'start': (-10311914, -1638505), 'end': (-6750208, -1135958),
    'gw': (-5855715, -52), 'gwi': (-5855715, -52), 'tarea': (-16553830, -1249281),
    'dato': (-10066330, -986896),
}


def uid(*partes):
    return str(uuid.uuid5(NS, '/'.join(str(p) for p in partes)))


def esc(texto):
    return html.escape(texto, quote=True)


def doc_html(texto):
    """La descripción de una tarea, con el mismo formato que usa Bizagi."""
    if not texto:
        return ''
    cuerpo = html.escape(texto, quote=False).encode('ascii', 'xmlcharrefreplace').decode()
    marcado = ('<p style="text-align:left;text-indent:0pt;margin:0pt 0pt 0pt 0pt;">'
               '<span style="color:#000000;background-color:transparent;font-family:Calibri;'
               'font-size:11pt;font-weight:normal;font-style:normal;">%s</span></p>' % cuerpo)
    return esc(marcado)


def formato(tam=11, negrita=False, sangria='          ', fondo=True):
    s = sangria
    lineas = [
        f'{s}<Formatting>', f'{s}  <Alignment>Center</Alignment>', f'{s}  <FontName>Segoe UI</FontName>',
        f'{s}  <SizeFont>{tam}</SizeFont>', f'{s}  <Bold>{"true" if negrita else "false"}</Bold>',
        f'{s}  <Italic>false</Italic>', f'{s}  <Strikeout>false</Strikeout>', f'{s}  <Underline>false</Underline>',
        f'{s}  <ColorFont>-16777216</ColorFont>', f'{s}</Formatting>', f'{s}<TextDirection xsi:nil="true" />',
    ]
    if fondo:
        lineas.append(f'{s}<TextBackgroundColor>16777215</TextBackgroundColor>')
    return '\n'.join(lineas)


# ── Modelo ───────────────────────────────────────────────────────────────────
class Nodo:
    def __init__(self, clave, tipo, nombre, calle, col, fila=0, doc='', sub=None, dx=0, dy=0):
        self.clave, self.tipo, self.nombre = clave, tipo, nombre
        self.calle, self.col, self.fila, self.doc, self.sub = calle, col, fila, doc, sub
        self.dx, self.dy = dx, dy
        self.w, self.h = TAM[tipo]
        self.x = self.y = 0
        self.id = None

    @property
    def cx(self):
        return self.x + self.w / 2

    @property
    def cy(self):
        return self.y + self.h / 2

    def puerto(self, lado):
        return {
            't': (self.cx, self.y), 'b': (self.cx, self.y + self.h),
            'l': (self.x, self.cy), 'r': (self.x + self.w, self.cy),
        }[lado]


NUM_PUERTO = {'t': 1, 'b': 2, 'l': 3, 'r': 4}


class Proceso:
    """Un pool con sus calles, sus fases (hitos) y su flujo."""

    def __init__(self, nombre, calles, fases, nodos, flujos, datos=()):
        self.nombre = nombre
        self.calles = calles        # [(nombre, filas)]
        self.fases = fases          # [(nombre, columnas)]
        self.nodos = []
        for n in nodos:      # (clave, tipo, nombre, calle, col, fila, descripción, {extras})
            extras = dict(n[7]) if len(n) > 7 else {}
            self.nodos.append(Nodo(*n[:6], doc=n[6] if len(n) > 6 else '', **extras))
        self.flujos = flujos        # [(desde, hasta, etiqueta, opciones)]
        self.datos = datos          # [(nombre_almacen, calle, col, fila, tarea, lados)]
        self.avisos = []

    def acomodar(self, diagrama, y_pool):
        self.diagrama = diagrama
        self.id = uid(diagrama, self.nombre, 'proceso')
        self.pool_id = uid(diagrama, self.nombre, 'pool')
        self.x, self.y = POOL_X, y_pool
        columnas = sum(c for _, c in self.fases)
        self.ancho_calle = MARGEN_IZQ + (columnas - 1) * ANCHO_COL + MARGEN_IZQ + 20
        self.w = CABECERA + self.ancho_calle
        self.calle_y, self.calle_h = {}, {}
        y = 0
        for i, (nombre, filas) in enumerate(self.calles):
            alto = filas * ALTO_FILA + 2 * MARGEN_CALLE + (MARGEN_SUP - MARGEN_CALLE if i == 0 else 0)
            self.calle_y[nombre], self.calle_h[nombre] = y, alto
            y += alto
        self.h = y
        self.por_clave = {}
        for n in self.nodos:
            n.id = uid(diagrama, self.nombre, 'nodo', n.clave)
            primera = self.calles[0][0] == n.calle
            cx = self.x + CABECERA + MARGEN_IZQ + n.col * ANCHO_COL + n.dx
            cy = (self.y + self.calle_y[n.calle] + (MARGEN_SUP if primera else MARGEN_CALLE)
                  + n.fila * ALTO_FILA + ALTO_FILA / 2 + n.dy)
            n.x, n.y = round(cx - n.w / 2), round(cy - n.h / 2)
            if n.clave in self.por_clave:
                raise ValueError(f'{self.nombre}: clave repetida {n.clave}')
            self.por_clave[n.clave] = n
        self.rutas = [self._ruta(f) for f in self.flujos]
        for n in self.nodos:
            n.lados = set()
        lado = {1: 't', 2: 'b', 3: 'l', 4: 'r'}
        for r in self.rutas:
            r['desde'].lados.add(lado[r['pa']])
            r['hasta'].lados.add(lado[r['pb']])
        self._revisar()
        return self.y + self.h

    # ── Recorrido de cada flecha ────────────────────────────────────────────
    def _ruta(self, flujo):
        desde, hasta = self.por_clave[flujo[0]], self.por_clave[flujo[1]]
        etiqueta = flujo[2] if len(flujo) > 2 else ''
        op = dict(flujo[3]) if len(flujo) > 3 else {}
        puertos = op.get('p')
        if not puertos:
            if abs(desde.cy - hasta.cy) < 2:
                puertos = 'r>l' if hasta.cx > desde.cx else 'l>r'
            elif abs(desde.cx - hasta.cx) < 2:
                puertos = 'b>t' if hasta.cy > desde.cy else 't>b'
            elif hasta.cx > desde.cx:
                puertos = 'r>l'
            else:
                puertos = ('t>t' if hasta.cy <= desde.cy else 'b>b')
        a, b = puertos.split('>')
        (x1, y1), (x2, y2) = desde.puerto(a), hasta.puerto(b)
        horizontal = {'l', 'r'}
        if a in horizontal and a == b:   # sale y entra por el mismo lado: rodea
            d = op.get('d', 22)
            mx = (min(x1, x2) - d) if a == 'l' else (max(x1, x2) + d)
            pts = [(x1, y1), (mx, y1), (mx, y2), (x2, y2)]
        elif a in horizontal and b in horizontal:
            if abs(y1 - y2) < 2:
                pts = [(x1, y1), (x2, y2)]
            else:
                mx = op.get('mx')
                mx = (x1 + x2) / 2 if mx is None else (x1 + mx if a == 'r' else x1 - mx)
                pts = [(x1, y1), (mx, y1), (mx, y2), (x2, y2)]
        elif a not in horizontal and b not in horizontal:
            if a != b:
                if abs(x1 - x2) < 2:
                    pts = [(x1, y1), (x2, y2)]
                else:
                    my = op.get('my')
                    my = (y1 + y2) / 2 if my is None else (y1 + my if a == 'b' else y1 - my)
                    pts = [(x1, y1), (x1, my), (x2, my), (x2, y2)]
            else:  # arco por arriba (t>t) o por abajo (b>b)
                d = op.get('d', 26)
                yy = (min(y1, y2) - d) if a == 't' else (max(y1, y2) + d)
                pts = [(x1, y1), (x1, yy), (x2, yy), (x2, y2)]
        elif a in horizontal:      # sale horizontal, entra vertical
            pts = [(x1, y1), (x2, y1), (x2, y2)]
        else:                      # sale vertical, entra horizontal
            pts = [(x1, y1), (x1, y2), (x2, y2)]
        pts = [(round(x), round(y)) for x, y in pts]
        return {'desde': desde, 'hasta': hasta, 'etiqueta': etiqueta, 'pts': pts,
                'pa': NUM_PUERTO[a], 'pb': NUM_PUERTO[b], 'op': op,
                'id': uid(self.diagrama, self.nombre, 'flujo', flujo[0], flujo[1], etiqueta)}

    def _revisar(self):
        """Avisa si una flecha atraviesa una figura que no es su origen ni su destino."""
        for r in self.rutas:
            for (xa, ya), (xb, yb) in zip(r['pts'], r['pts'][1:]):
                for n in self.nodos:
                    if n is r['desde'] or n is r['hasta']:
                        continue
                    if (min(xa, xb) < n.x + n.w - 2 and max(xa, xb) > n.x + 2
                            and min(ya, yb) < n.y + n.h - 2 and max(ya, yb) > n.y + 2):
                        self.avisos.append(f"{self.nombre}: {r['desde'].clave}→{r['hasta'].clave} cruza {n.clave}")
        usados = {}
        for n in self.nodos:
            k = (n.x, n.y)
            if k in usados:
                self.avisos.append(f'{self.nombre}: {n.clave} encima de {usados[k]}')
            usados[k] = n.clave
        entran = {r['hasta'].clave for r in self.rutas}
        salen = {r['desde'].clave for r in self.rutas}
        for n in self.nodos:
            if n.tipo != 'start' and n.clave not in entran:
                self.avisos.append(f'{self.nombre}: a {n.clave} no le llega ninguna flecha')
            if n.tipo != 'end' and n.clave not in salen:
                self.avisos.append(f'{self.nombre}: de {n.clave} no sale ninguna flecha')


# ── Escritura del XPDL ───────────────────────────────────────────────────────
def _grafico(n_x, n_y, w, h, borde, relleno, tam=11, tx=None, ty=None, tw=None, th=None, s='            ', extra=''):
    tx, ty = (n_x if tx is None else tx), (n_y if ty is None else ty)
    tw, th = (w if tw is None else tw), (h if th is None else th)
    return (f'{s}<NodeGraphicsInfos>\n'
            f'{s}  <NodeGraphicsInfo ToolId="BizAgi_Process_Modeler" Height="{h}" Width="{w}" BorderColor="{borde}" '
            f'FillColor="{relleno}" BorderVisible="false"{extra} TextX="{tx}" TextY="{ty}" TextWidth="{tw}" TextHeight="{th}">\n'
            f'{s}    <Coordinates XCoordinate="{n_x}" YCoordinate="{n_y}" />\n'
            f'{formato(tam, False, s + "    ")}\n'
            f'{s}  </NodeGraphicsInfo>\n'
            f'{s}</NodeGraphicsInfos>')


def texto_decision(n):
    """Dónde va el nombre de una decisión para que no lo tape una flecha."""
    lados = getattr(n, 'lados', set())
    if 'b' not in lados:
        return round(n.cx - 62), n.y + n.h + 4
    if 't' not in lados:
        return round(n.cx - 62), n.y - 36
    return round(n.x - 126), n.y + n.h + 2


PROP_TAREA = esc('{"cost":0,"priority":0,"notifyOnMobile":false,"isSingleton":false,"isConditional":false}')
PROP_SUB = esc('{"priority":0,"asynchronousBehavior":{},"subProcessType":"None","inputMappingType":"None",'
               '"outputMappingType":"None","exitMode":"AllTokens"}')
# La tarea de servicio (engranaje) es la única figura que no aparece en el
# levantamiento inicial. Si alguna versión de Bizagi no la aceptara, la copia
# de respaldo la escribe como tarea común (ver generar.py).
OPCIONES = {'servicio': '<TaskService Implementation="Unspecified" />'}
IMPLEMENTACION = {
    'user': '<TaskUser Implementation="Unspecified" />',
    'send': '<TaskSend />',
    'receive': '<TaskReceive Instantiate="false" />',
    'manual': '<TaskManual />',
    'service': '<TaskService Implementation="Unspecified" />',
    'rule': '<TaskBusinessRule BusinessRuleTaskImplementation="Unspecified" />',
}


def _actividad(p, n, entradas):
    s = '        '
    nombre = esc(n.nombre)
    if n.tipo in ('start', 'end'):
        evento = '<StartEvent Trigger="None" />' if n.tipo == 'start' else '<EndEvent Result="None" />'
        borde, relleno = COLOR[n.tipo]
        ancho_texto = 120 if n.nombre else n.w
        return (f'{s}<Activity Id="{n.id}" Name="{nombre}">\n{s}  <Description />\n{s}  <Event>\n{s}    {evento}\n{s}  </Event>\n'
                f'{s}  <Documentation />\n'
                + _grafico(n.x, n.y, n.w, n.h, borde, relleno,
                           tx=round(n.cx - ancho_texto / 2) if n.nombre else n.x,
                           ty=n.y + n.h + 4 if n.nombre else n.y, tw=ancho_texto, th=34 if n.nombre else n.h, s=s + '  ')
                + f'\n{s}  <ExtendedAttributes />\n{s}</Activity>')
    if n.tipo in ('gw', 'gwi'):
        ruta = '<Route />' if n.tipo == 'gw' else '<Route GatewayType="Inclusive" />'
        borde, relleno = COLOR[n.tipo]
        return (f'{s}<Activity Id="{n.id}" Name="{nombre}">\n{s}  <Description />\n{s}  {ruta}\n{s}  <Documentation />\n'
                + _grafico(n.x, n.y, n.w, n.h, borde, relleno, tx=texto_decision(n)[0], ty=texto_decision(n)[1], tw=124, th=34, s=s + '  ')
                + f'\n{s}  <ExtendedAttributes />\n{s}</Activity>')
    borde, relleno = COLOR['tarea']
    doc = doc_html(n.doc)
    if n.tipo == 'sub':
        impl = f'{s}  <Implementation>\n{s}    <SubFlow Id="{n.sub}" />\n{s}  </Implementation>'
    else:
        etiqueta = OPCIONES['servicio'] if n.tipo == 'service' else IMPLEMENTACION[n.tipo]
        impl = f'{s}  <Implementation>\n{s}    <Task>\n{s}      {etiqueta}\n{s}    </Task>\n{s}  </Implementation>'
    conjuntos = ''
    if entradas:
        conjuntos = (f'{s}  <InputSets>\n{s}    <InputSet>\n'
                     + ''.join(f'{s}      <Input ArtifactId="{e}" />\n' for e in entradas)
                     + f'{s}    </InputSet>\n{s}  </InputSets>\n{s}  <OutputSets />\n')
    return (f'{s}<Activity Id="{n.id}" Name="{nombre}">\n'
            + (f'{s}  <Description>{doc}</Description>\n' if doc else f'{s}  <Description />\n')
            + impl + f'\n{s}  <Performers />\n'
            + (f'{s}  <Documentation>{doc}</Documentation>\n' if doc else f'{s}  <Documentation />\n')
            + conjuntos + f'{s}  <Loop LoopType="None" />\n'
            + _grafico(n.x, n.y, n.w, n.h, borde, relleno, s=s + '  ',
                       extra=' Expanded="false" ExpandedWidth="270" ExpandedHeight="180"' if n.tipo == 'sub' else '')
            + f'\n{s}  <ExtendedAttributes>\n{s}    <ExtendedAttribute Name="RuntimeProperties" Value="{PROP_SUB if n.tipo == "sub" else PROP_TAREA}" />\n'
              f'{s}  </ExtendedAttributes>\n{s}</Activity>')


def _conector(pts, pa, pb, tx, ty, tw=None, th=None, tam=11, s='            '):
    texto = f' TextX="{tx}" TextY="{ty}"' + (f' TextWidth="{tw}" TextHeight="{th}"' if tw else '')
    return (f'{s}<ConnectorGraphicsInfos>\n'
            f'{s}  <ConnectorGraphicsInfo FromPort="{pa}" ToPort="{pb}" ToolId="BizAgi_Process_Modeler" BorderColor="-16777216"{texto}>\n'
            f'{formato(tam, False, s + "    ")}\n'
            + ''.join(f'{s}    <Coordinates XCoordinate="{x}" YCoordinate="{y}" />\n' for x, y in pts)
            + f'{s}  </ConnectorGraphicsInfo>\n{s}</ConnectorGraphicsInfos>')


def pos_etiqueta(r):
    """Dónde va el texto de una flecha: junto al primer tramo."""
    (x1, y1), (x2, y2) = r['pts'][0], r['pts'][1]
    ancho = max(34, 7 * len(r['etiqueta']) + 10)
    dx, dy = r['op'].get('ex', 0), r['op'].get('ey', 0)
    if y1 == y2:   # tramo horizontal: sobre la línea
        x = (x1 + 6) if x2 > x1 else (x1 - 6 - ancho)
        return round(x + dx), round(y1 - 22 + dy), ancho, 20
    y = (y1 + 6) if y2 > y1 else (y1 - 26)
    return round(x1 + 8 + dx), round(y + dy), ancho, 20


def _transicion(r):
    s = '        '
    nombre = f' Name="{esc(r["etiqueta"])}"' if r['etiqueta'] else ''
    condicion = (f'{s}  <Condition Type="CONDITION">\n{s}    <Expression />\n{s}  </Condition>'
                 if r['etiqueta'] else f'{s}  <Condition />')
    if r['etiqueta']:
        tx, ty, tw, th = pos_etiqueta(r)
    else:
        (tx, ty), tw, th = r['pts'][0], None, None
    return (f'{s}<Transition Id="{r["id"]}" From="{r["desde"].id}" To="{r["hasta"].id}"{nombre}>\n{condicion}\n'
            f'{s}  <Description />\n' + _conector(r['pts'], r['pa'], r['pb'], tx, ty, tw, th, s=s + '  ')
            + f'\n{s}  <ExtendedAttributes />\n{s}</Transition>')


def _prop_proceso(nombre):
    return esc('{"processClassProperties":{"displayName":"%s","accessType":"Process","order":1,'
               '"useParentCaseNumber":true,"enableAlarms":true,"enableNotifications":true,"creationDate":"%s"},'
               '"processProperties":{"version":{"numberVersion":"1.0","isActive":true},"versionCreationDate":"%s",'
               '"supportsScopes":true,"caseAccessType":"Public","renderVersion":2,"formsVersion":0}}'
               % (nombre.replace('"', ''), FECHA, FECHA))


class Diagrama:
    def __init__(self, nombre, procesos):
        self.nombre, self.procesos = nombre, procesos
        self.id = uid('diagrama', nombre)
        y = 28
        for p in procesos:
            y = p.acomodar(nombre, y) + SEPARACION_POOLS
        # Almacenes de datos: uno por nombre en el diagrama, una referencia por uso
        self.almacenes = {}
        for p in procesos:
            p.refs = []
            for (almacen, calle, col, fila, tarea, lados) in p.datos:
                self.almacenes.setdefault(almacen, uid(nombre, 'almacen', almacen))
                primera = p.calles[0][0] == calle
                cx = p.x + CABECERA + MARGEN_IZQ + col * ANCHO_COL
                cy = p.y + p.calle_y[calle] + (MARGEN_SUP if primera else MARGEN_CALLE) + fila * ALTO_FILA + ALTO_FILA / 2
                destino = p.por_clave[tarea]
                ref = {'almacen': almacen, 'x': round(cx - 25), 'y': round(cy - 34), 'destino': destino,
                       'id': uid(nombre, p.nombre, 'ref', almacen, tarea),
                       'entrada': uid(nombre, p.nombre, 'entrada', almacen, tarea),
                       'asoc': uid(nombre, p.nombre, 'asoc', almacen, tarea),
                       'dasoc': uid(nombre, p.nombre, 'dasoc', almacen, tarea)}
                a, b = lados.split('>')
                origen = {'t': (ref['x'] + 25, ref['y']), 'b': (ref['x'] + 25, ref['y'] + 50),
                          'l': (ref['x'], ref['y'] + 25), 'r': (ref['x'] + 50, ref['y'] + 25)}[a]
                fin = destino.puerto(b)
                if a in 'lr' and b in 'lr':
                    pts = [origen, fin] if abs(origen[1] - fin[1]) < 2 else [origen, ((origen[0] + fin[0]) / 2, origen[1]), ((origen[0] + fin[0]) / 2, fin[1]), fin]
                elif a in 'tb' and b in 'tb':
                    pts = [origen, fin] if abs(origen[0] - fin[0]) < 2 else [origen, (origen[0], (origen[1] + fin[1]) / 2), (fin[0], (origen[1] + fin[1]) / 2), fin]
                elif a in 'lr':
                    pts = [origen, (fin[0], origen[1]), fin]
                else:
                    pts = [origen, (origen[0], fin[1]), fin]
                ref['pts'] = [(round(x), round(y)) for x, y in pts]
                ref['pa'], ref['pb'] = NUM_PUERTO[a], NUM_PUERTO[b]
                p.refs.append(ref)

    @property
    def avisos(self):
        return [a for p in self.procesos for a in p.avisos]

    def xml(self):
        o = []
        o.append('<?xml version="1.0"?>')
        o.append(f'<Package xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
                 f'OnlyOneProcess="false" Id="{self.id}" Name="{esc(self.nombre)}" xmlns="http://www.wfmc.org/2009/XPDL2.2">')
        o.append(f'  <PackageHeader>\n    <XPDLVersion>2.2</XPDLVersion>\n    <Vendor>Bizagi Process Modeler.</Vendor>\n'
                 f'    <Created>{FECHA}</Created>\n    <ModificationDate>{FECHA}</ModificationDate>\n'
                 f'    <Description>{esc(self.nombre)}</Description>\n    <Documentation />\n'
                 f'    <CreationVersion>{VERSION}</CreationVersion>\n    <Version>{VERSION}</Version>\n'
                 f'    <Modifications>\n      <Modification Date="{FECHA_Z}" UserName="grupo17" />\n    </Modifications>\n  </PackageHeader>')
        o.append(f'  <RedefinableHeader>\n    <Author>{AUTOR}</Author>\n    <Version>1.0</Version>\n    <Countrykey>CO</Countrykey>\n  </RedefinableHeader>')
        o.append('  <ExternalPackages />')
        if self.almacenes:
            o.append('  <DataStores>')
            for nombre, ident in self.almacenes.items():
                o.append(f'    <DataStore Id="{ident}" Name="{esc(nombre)}" IsUnlimited="true">\n      <Object>\n        <Documentation />\n      </Object>\n    </DataStore>')
            o.append('  </DataStores>')
        else:
            o.append('  <DataStores />')
        # Pools
        principal = uid(self.nombre, 'principal', 'proceso')
        o.append('  <Pools>')
        o.append(f'    <Pool Id="{uid(self.nombre, "principal", "pool")}" Name="Proceso principal" Process="{principal}" BoundaryVisible="false">\n'
                 f'      <Lanes />\n      <NodeGraphicsInfos>\n'
                 f'        <NodeGraphicsInfo ToolId="BizAgi_Process_Modeler" Height="350" Width="700" BorderColor="-16777216" FillColor="-1">\n'
                 f'          <Coordinates XCoordinate="30" YCoordinate="30" />\n{formato(10, True, "          ", False)}\n'
                 f'        </NodeGraphicsInfo>\n      </NodeGraphicsInfos>\n    </Pool>')
        for p in self.procesos:
            o.append(f'    <Pool Id="{p.pool_id}" Name="{esc(p.nombre)}" Process="{p.id}" BoundaryVisible="true">')
            o.append('      <Lanes>')
            for nombre, _ in p.calles:
                ly, lh = p.calle_y[nombre], p.calle_h[nombre]
                o.append(f'        <Lane Id="{uid(self.nombre, p.nombre, "calle", nombre)}" Name="{esc(nombre)}" ParentPool="{p.pool_id}">\n'
                         f'          <NodeGraphicsInfos>\n'
                         f'            <NodeGraphicsInfo ToolId="BizAgi_Process_Modeler" Height="{lh}" Width="{p.ancho_calle}" BorderColor="-11513776" FillColor="-1" '
                         f'BorderVisible="false" TextX="{p.x + CABECERA}" TextY="{p.y + ly}" TextWidth="{p.ancho_calle}" TextHeight="{lh}">\n'
                         f'              <Coordinates XCoordinate="{CABECERA}" YCoordinate="{ly}" />\n{formato(11, True, "              ")}\n'
                         f'            </NodeGraphicsInfo>\n          </NodeGraphicsInfos>\n          <Documentation />\n          <ExtendedAttributes />\n        </Lane>')
            o.append('      </Lanes>')
            o.append(f'      <NodeGraphicsInfos>\n        <NodeGraphicsInfo ToolId="BizAgi_Process_Modeler" Height="{p.h}" Width="{p.w}" BorderColor="-16777216" FillColor="-1">\n'
                     f'          <Coordinates XCoordinate="{p.x}" YCoordinate="{p.y}" />\n{formato(11, True, "          ", False)}\n'
                     f'        </NodeGraphicsInfo>\n      </NodeGraphicsInfos>')
            o.append('      <Milestones>')
            x = CABECERA
            total = sum(c for _, c in p.fases)
            for i, (nombre, cols) in enumerate(p.fases):
                ancho = cols * ANCHO_COL + (MARGEN_IZQ - ANCHO_COL // 2 if i == 0 else 0)
                if i == len(p.fases) - 1:
                    ancho = CABECERA + p.ancho_calle - x
                o.append(f'        <Milestone Id="{uid(self.nombre, p.nombre, "fase", nombre)}" Name="{esc(nombre)}" ParentPool="{p.pool_id}">\n'
                         f'          <NodeGraphicsInfos>\n'
                         f'            <NodeGraphicsInfo ToolId="BizAgi_Process_Modeler" Height="{p.h}" Width="{ancho}" BorderColor="-11513776" FillColor="-1" '
                         f'BorderVisible="false" TextX="{p.x + x}" TextY="{p.y}" TextWidth="{ancho}" TextHeight="{p.h}">\n'
                         f'              <Coordinates XCoordinate="{x}" YCoordinate="0" />\n{formato(11, True, "              ")}\n'
                         f'            </NodeGraphicsInfo>\n          </NodeGraphicsInfos>\n          <Documentation />\n          <ExtendedAttributes>\n'
                         f'            <ExtendedAttribute Name="RuntimeProperties" Value="{esc(chr(123) + chr(34) + "milestoneType" + chr(34) + ":" + chr(34) + "Process" + chr(34) + chr(125))}" />\n'
                         f'          </ExtendedAttributes>\n        </Milestone>')
                x += ancho
            o.append('      </Milestones>')
            o.append('    </Pool>')
        o.append('  </Pools>')
        # Asociaciones (almacén de datos → tarea)
        refs = [r for p in self.procesos for r in p.refs]
        if refs:
            o.append('  <Associations>')
            for r in refs:
                o.append(f'    <Association Id="{r["asoc"]}" Source="{r["id"]}" Target="{r["destino"].id}">\n'
                         + _conector(r['pts'], r['pa'], r['pb'], r['pts'][0][0], r['pts'][0][1], s='      ')
                         + '\n      <ExtendedAttributes />\n    </Association>')
            o.append('  </Associations>')
        else:
            o.append('  <Associations />')
        # Procesos
        o.append('  <WorkflowProcesses>')
        o.append(f'    <WorkflowProcess Id="{principal}" Name="Proceso principal">\n      <ProcessHeader>\n        <Created>{FECHA}</Created>\n        <Description />\n      </ProcessHeader>\n'
                 f'      <RedefinableHeader>\n        <Author />\n        <Version />\n        <Countrykey>CO</Countrykey>\n      </RedefinableHeader>\n'
                 f'      <ActivitySets />\n      <DataInputOutputs />\n      <ExtendedAttributes>\n'
                 f'        <ExtendedAttribute Name="RuntimeProperties" Value="{_prop_proceso("Proceso principal")}" />\n      </ExtendedAttributes>\n    </WorkflowProcess>')
        for p in self.procesos:
            o.append(f'    <WorkflowProcess Id="{p.id}" Name="{esc(p.nombre)}">\n      <ProcessHeader>\n        <Created>{FECHA}</Created>\n        <Description />\n      </ProcessHeader>\n'
                     f'      <RedefinableHeader>\n        <Author />\n        <Version />\n        <Countrykey>CO</Countrykey>\n      </RedefinableHeader>\n      <ActivitySets />')
            if p.refs:
                o.append('      <DataInputOutputs>')
                for r in p.refs:
                    o.append(f'        <DataInput Id="{r["entrada"]}" IsCollection="false">\n          <NodeGraphicsInfos>\n'
                             f'            <NodeGraphicsInfo ToolId="BizAgi_Process_Modeler" Height="50" Width="40" BorderColor="-10066330" FillColor="-986896" BorderVisible="false">\n'
                             f'              <Coordinates XCoordinate="0" YCoordinate="0" />\n{formato(8, False, "              ")}\n'
                             f'            </NodeGraphicsInfo>\n          </NodeGraphicsInfos>\n          <Documentation />\n        </DataInput>')
                o.append('      </DataInputOutputs>')
            else:
                o.append('      <DataInputOutputs />')
            o.append('      <Activities>')
            for n in p.nodos:
                o.append(_actividad(p, n, [r['entrada'] for r in p.refs if r['destino'] is n]))
            o.append('      </Activities>')
            if p.refs:
                o.append('      <DataStoreReferences>')
                for r in p.refs:
                    borde, relleno = COLOR['dato']
                    o.append(f'        <DataStoreReference DataStoreRef="{self.almacenes[r["almacen"]]}" Id="{r["id"]}" State="">\n'
                             + _grafico(r['x'], r['y'], 50, 50, borde, relleno, tx=r['x'] - 40, ty=r['y'] + 54, tw=130, th=34, s='          ')
                             + '\n          <ExtendedAttributes />\n        </DataStoreReference>')
                o.append('      </DataStoreReferences>')
            o.append('      <Transitions>')
            for r in p.rutas:
                o.append(_transicion(r))
            o.append('      </Transitions>')
            if p.refs:
                o.append('      <DataAssociations>')
                for r in p.refs:
                    o.append(f'        <DataAssociation Id="{r["dasoc"]}" From="{r["id"]}" To="{r["entrada"]}">\n          <Description />\n          <ConnectorGraphicsInfos>\n'
                             f'            <ConnectorGraphicsInfo ToolId="BizAgi_Process_Modeler" BorderColor="-16777216">\n{formato(8, False, "              ")}\n'
                             f'            </ConnectorGraphicsInfo>\n          </ConnectorGraphicsInfos>\n          <ExtendedAttributes />\n        </DataAssociation>')
                o.append('      </DataAssociations>')
            o.append(f'      <ExtendedAttributes>\n        <ExtendedAttribute Name="RuntimeProperties" Value="{_prop_proceso(p.nombre)}" />\n      </ExtendedAttributes>\n    </WorkflowProcess>')
        o.append('  </WorkflowProcesses>')
        o.append('  <ExtendedAttributes />')
        o.append('</Package>')
        return '\n'.join(o)

    def valores_extendidos(self):
        filas = ['<?xml version="1.0"?>',
                 '<DiagramAttributeValues xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">']
        for p in self.procesos:
            for n in p.nodos:
                filas.append(f'  <ElementAttributeValues ElementId="{n.id}">\n    <Values />\n  </ElementAttributeValues>')
        filas.append('</DiagramAttributeValues>')
        return '\n'.join(filas)

    def diag(self):
        mem = io.BytesIO()
        with zipfile.ZipFile(mem, 'w', zipfile.ZIP_DEFLATED) as z:
            z.writestr('Actions.xml', '<?xml version="1.0"?>\n<DiagramActions xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" />')
            z.writestr('BPSimData.xml', '<?xml version="1.0"?>\n<ns1:BPSimData simulationLevel="LevelOne" xmlns:ns1="http://www.bpsim.org/schemas/1.0">\n'
                       f'  <ns1:Scenario id="Scenario_{uid(self.nombre, "escenario")}" name="Escenario 1" author="{AUTOR}" version="1.0">\n'
                       '    <ns1:ScenarioParameters>\n      <ns1:PropertyParameters />\n    </ns1:ScenarioParameters>\n  </ns1:Scenario>\n</ns1:BPSimData>')
            z.writestr('BPSimDataResult.xml', '﻿<?xml version="1.0" encoding="utf-8"?>\n<ScenarioResults />'.encode('utf-8'))
            z.writestr('Diagram.xml', self.xml().encode('utf-8'))
            z.writestr('ExtendedAttributeValues.xml', self.valores_extendidos().encode('utf-8'))
        return mem.getvalue()


def escribir_bpm(ruta, diagramas):
    xsd = 'xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
    with zipfile.ZipFile(ruta, 'w', zipfile.ZIP_DEFLATED) as z:
        for d in diagramas:
            z.writestr(f'{d.id}.diag', d.diag())
        z.writestr('ModelInfo.xml', f'<?xml version="1.0"?>\n<BizAgiModelInfo {xsd} CreationVersion="{VERSION}" FilePersistenceVersion="5" '
                   f'ModifiedVersion="{VERSION}" ModifiedDate="{FECHA}" IsInCollaboration="false" />')
        z.writestr('Participants.xml', f'<?xml version="1.0"?>\n<Participants {xsd} xmlns="http://www.wfmc.org/2009/XPDL2.2" />')
        z.writestr('Preferences.bpp', '<?xml version="1.0" encoding="utf-8"?><ProjectPreferences><VersionFile version="3" /></ProjectPreferences>')
        z.writestr('Users/Default/DocumentationSettings.xml', f'<?xml version="1.0"?>\n<DocumentationSettings {xsd}>\n  <SourceType>User</SourceType>\n'
                   '  <ExportBPMNAttachments>false</ExportBPMNAttachments>\n  <ShapeFilters />\n  <RoleFiltersString>{}</RoleFiltersString>\n'
                   '  <SelectedDiagrams />\n  <htmlFolderHierarchy xsi:nil="true" />\n  <Settings />\n</DocumentationSettings>')
        z.writestr('Users/Default/PrintingPreferences.xml', f'<?xml version="1.0"?>\n<PrintingPreferences {xsd} AutoFitToPagesWidth="0" ScaleFactor="1">\n'
                   '  <Margins Bottom="0" Top="0" Left="0" Right="0" />\n'
                   '  <Watermark ImageTiling="false" ImageTransparency="0" TextTransparency="0" ShowBehind="false" />\n</PrintingPreferences>')
        abiertos = ''.join(f'    <ModelItem ItemType="Diagram" DiagramId="{d.id}" IsSelected="{"true" if i == 0 else "false"}" />\n'
                           for i, d in enumerate(diagramas))
        z.writestr('Users/Default/UserPreferences.xml', f'<?xml version="1.0"?>\n<UserPreferences {xsd}>\n  <OpenedItems>\n{abiertos}  </OpenedItems>\n</UserPreferences>')
