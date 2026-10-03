# -*- coding: utf-8 -*-
# Genera el Diagrama de Despliegue del Incremento 3 en dos formatos con la
# misma geometría: .drawio (editable en app.diagrams.net) y .svg (para el PNG).
#
# Reproduce el estilo del diagrama del Incremento 2 (que solo existía en PNG):
# nodos tipo clase UML con cabecera de color y dos compartimentos
# <<Requerimiento>> y <<Ejecutable>>, unidos por conexiones rotuladas.
# Cambios del Incremento 3 respecto de ese diagrama:
# - El chat usa consulta periódica: sale "SocketioWebSockets".
# - El servidor suma los componentes internos nuevos (despachador de avisos,
#   programador de agenda, motor clínico, filtro, cifrado e informes) y sirve
#   las páginas web que se abren desde los correos.
# - "PC Administrador" (interfaz web React que nunca existió: el administrador
#   usa la app móvil) pasa a ser "Navegador Web", que es donde se abren los
#   enlaces de confirmación de cita y de cupo liberado.
# - El dispositivo móvil suma el registro del token push, la consulta periódica
#   del chat, los envíos retenidos sin conexión y la descarga de informes.
import html

TITULO = "Diagrama de Despliegue – Punto Paz Salud, Incremento 3"
FILA = 26          # alto de cada línea de texto
SEP = 8            # alto del separador entre compartimentos
TXT, LINEA = "#000000", "#000000"
AZUL = ("#dae8fc", "#6c8ebf"); VERDE = ("#d5e8d4", "#82b366"); ROJO = ("#f8cecc", "#b85450")
AMARILLO = ("#fff2cc", "#d6b656"); MORADO = ("#e1d5e7", "#9673a6")


def N(nid, titulo, x, y, w, col, requerimiento, ejecutable):
    """Nodo: cabecera + <<Requerimiento>> + separador + <<Ejecutable>>."""
    h = FILA * (1 + len(requerimiento) + len(ejecutable)) + SEP
    return dict(id=nid, titulo=titulo, x=x, y=y, w=w, h=h, col=col, req=requerimiento, eje=ejecutable)


movil = N("movil", "Dispositivo Móvil", 30, 420, 285, AZUL,
          ["<<Requerimiento>>", "- conectividad de red: boolean", "- SO (Android / iOS): string",
           "- Cliente: Expo (React Native): string"],
          ["<<Ejecutable>>", "+ App_ReactNative(): void", "+ InterfazUsuario(): void", "+ SolicitarCita(): void",
           "+ VisualizarFicha(): void", "+ RegistrarTokenPush(): void", "+ ConsultarMensajesPeriodicamente(): void",
           "+ RetenerEnviosSinConexion(): void", "+ DescargarInformes(): void"])

navegador = N("navegador", "Navegador Web", 830, 40, 330, VERDE,
              ["<<Requerimiento>>", "- conectividad de red: boolean", "- Navegador Web: string",
               "- Acceso: enlace recibido por correo"],
              ["<<Ejecutable>>", "+ AbrirEnlaceConfirmacion(): void", "+ ConfirmarOCancelarCita(): void",
               "+ TomarCupoLiberado(): void"])

servidor = N("servidor", "Servidor de Aplicaciones Cloud", 420, 420, 340, ROJO,
             ["<<Requerimiento>>", "- conectividad de red: boolean", "- Infraestructura: Render.com PaaS"],
             ["<<Ejecutable>>", "+ NodeJS(): void", "+ ExpressJS(): void", "+ IniciarAPIREST(): void",
              "+ EjecutarAPIAdapter(): void", "+ ValidarSeguridadJWT(): void", "+ IniciarMotorAgendamiento(): void",
              "+ FiltrarDisponibilidadPorSede(): void", "+ ConectarCapaAccesoDatos(): void",
              "+ DespacharNotificaciones(): void", "+ ProgramarTareasAgenda(): void", "+ AnalizarTriajeClinico(): void",
              "+ FiltrarContenidoRestringido(): void", "+ CifrarMensajesChat(): void",
              "+ ServirConsultaPeriodicaChat(): void", "+ GenerarInformes(): void", "+ ServirPaginasDeCorreo(): void"])

bd = N("bd", "Servidor de Base de Datos", 1000, 420, 345, AMARILLO,
       ["<<DBaaS Aiven.io>>", "<<Requerimiento>>", "- conectividad de red: boolean", "- Almacenamiento SSD: string",
        "- Modelo de servicio: Gestionado en nube"],
       ["<<Ejecutable>>", "+ Controlador_MySQL(): void", "+ AlmacenarTransaccion(): void", "+ AlmacenarFichaClinica(): void",
        "+ AlmacenarMensajesCifrados(): void", "+ AlmacenarNotificaciones(): void", "+ AlmacenarLiquidaciones(): void",
        "+ EjecutarRutinaRespaldo(): void"])

Y1 = servidor["y"] + servidor["h"] + 110   # fila de servicios por API REST
pasarela = N("pasarela", "Servidor Pasarela Pago", 850, Y1, 270, MORADO,
             ["<<Requerimiento>>", "- conectividad de red: boolean", "- Modo: simulado (sin cobro real)"],
             ["<<Ejecutable>>", "+ AutenticarComercio(): void", "+ ProcesarTransaccion(): void",
              "+ RetornarComprobante(): void"])
notif = N("notif", "Servidor de Notificación", 1160, Y1, 330, MORADO,
          ["<<Requerimiento>>", "- conectividad de red: boolean", "- Proveedor de correos: Brevo API",
           "- Proveedor de alertas: Expo Push"],
          ["<<Ejecutable>>", "+ EnviarAlertaPushExpo(): void", "+ DespacharCorreoRecordatorio(): void",
           "+ EnviarEnlaceConfirmacionYCupo(): void"])
imed = N("imed", "Servidor IMED", 1530, Y1, 250, MORADO,
         ["<<Requerimiento>>", "- conectividad de red: boolean"],
         ["<<Ejecutable>>", "+ ValidarIdentidad(): void", "+ CalcularCopago(): void", "+ EmitirBonoElectronico(): void"])

Y2 = max(n["y"] + n["h"] for n in (pasarela, notif, imed)) + 110   # fila de servicios por SDK
openai = N("openai", "Servidor OpenAI", 830, Y2, 260, MORADO,
           ["<<Requerimiento>>", "- conectividad de red: boolean"],
           ["<<Ejecutable>>", "+ RecibirPromptClinico(): void", "+ ProcesarTexto(): void", "+ RetornarAnalisis(): void"])
nube = N("nube", "Servidor Cloud Storage", 1150, Y2, 400, MORADO,
         ["<<SaaS Cloudinary>>", "<<Requerimiento>>", "- conectividad de red: boolean",
          "- Gestor de almacenamiento: CDN de contenido"],
         ["<<Ejecutable>>", "+ RecibirArchivoMultimedia(): void", "+ AlmacenarPDFFirma(): void",
          "+ AlmacenarFotoPerfil(): void", "+ AlmacenarAdjuntoTicket(): void", "+ GenerarURLLectura(): void"])

nodos = [movil, navegador, servidor, bd, pasarela, notif, imed, openai, nube]
cx = lambda n: n["x"] + n["w"] / 2
S = servidor

# Conexiones: puntos + rótulo (texto, x, y)
y_movil = movil["y"] + FILA * 4.5
y_bd = bd["y"] + FILA * 5.5
y_rest = S["y"] + S["h"] - 30
y_sdk = Y2 - 60
y_nav = navegador["y"] + navegador["h"] / 2
aristas = [
    ([(movil["x"] + movil["w"], y_movil), (S["x"], y_movil)], ("JSON vía\nHTTPS", (movil["x"] + movil["w"] + S["x"]) / 2, y_movil - 30)),
    ([(cx(S), S["y"]), (cx(S), y_nav), (navegador["x"], y_nav)], ("HTML vía HTTPS\n(enlaces del correo)", cx(S) + 125, y_nav - 34)),
    ([(S["x"] + S["w"], y_bd), (bd["x"], y_bd)], ("Conexión MySQL", (S["x"] + S["w"] + bd["x"]) / 2, y_bd - 26)),
    ([(S["x"] + S["w"], y_rest), (cx(imed), y_rest), (cx(imed), imed["y"])], ("API REST / HTTPS", S["x"] + S["w"] + 115, y_rest - 22)),
    ([(cx(pasarela), y_rest), (cx(pasarela), pasarela["y"])], None),
    ([(cx(notif), y_rest), (cx(notif), notif["y"])], None),
    ([(cx(S), S["y"] + S["h"]), (cx(S), y_sdk), (cx(nube), y_sdk), (cx(nube), nube["y"])], ("SDK / HTTPS", cx(S) + 90, y_sdk - 22)),
    ([(cx(openai), y_sdk), (cx(openai), openai["y"])], None),
]

ANCHO = max(n["x"] + n["w"] for n in nodos) + 30
ALTO = max(n["y"] + n["h"] for n in nodos) + 40


def filas(n):
    """(texto, y, es_separador) de cada línea del nodo, bajo la cabecera."""
    out, y = [], n["y"] + FILA
    for t in n["req"]:
        out.append((t, y)); y += FILA
    sep = y; y += SEP
    for t in n["eje"]:
        out.append((t, y)); y += FILA
    return out, sep


# ── drawio ───────────────────────────────────────────────────────────────
celdas = ['<mxCell id="0"/><mxCell id="1" parent="0"/>']
celdas.append(f'<mxCell id="marco" value="" style="rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor={LINEA};" vertex="1" parent="1"><mxGeometry x="0" y="0" width="{ANCHO:.0f}" height="{ALTO:.0f}" as="geometry"/></mxCell>')
for n in nodos:
    fill, stroke = n["col"]
    celdas.append(
        f'<mxCell id="{n["id"]}" value="{html.escape(n["titulo"])}" style="swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=stackLayout;horizontal=1;startSize={FILA};horizontalStack=0;resizeParent=1;resizeLast=0;collapsible=0;marginBottom=0;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};fontSize=14;" vertex="1" parent="1">'
        f'<mxGeometry x="{n["x"]}" y="{n["y"]}" width="{n["w"]}" height="{n["h"]}" as="geometry"/></mxCell>')
    k = 0
    for t in n["req"]:
        celdas.append(f'<mxCell id="{n["id"]}_r{k}" value="{html.escape(t)}" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;whiteSpace=wrap;html=1;fontSize=14;" vertex="1" parent="{n["id"]}"><mxGeometry y="{FILA * (k + 1)}" width="{n["w"]}" height="{FILA}" as="geometry"/></mxCell>')
        k += 1
    celdas.append(f'<mxCell id="{n["id"]}_sep" value="" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=3;rotatable=0;labelPosition=right;points=[];portConstraint=eastwest;strokeColor={stroke};" vertex="1" parent="{n["id"]}"><mxGeometry y="{FILA * (k + 1)}" width="{n["w"]}" height="{SEP}" as="geometry"/></mxCell>')
    for j, t in enumerate(n["eje"]):
        celdas.append(f'<mxCell id="{n["id"]}_e{j}" value="{html.escape(t)}" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;whiteSpace=wrap;html=1;fontSize=14;" vertex="1" parent="{n["id"]}"><mxGeometry y="{FILA * (k + 1) + SEP + FILA * j}" width="{n["w"]}" height="{FILA}" as="geometry"/></mxCell>')
for i, (pts, rotulo) in enumerate(aristas):
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    medios = "".join(f'<mxPoint x="{px:.0f}" y="{py:.0f}"/>' for px, py in pts[1:-1])
    celdas.append(f'<mxCell id="a{i}" style="endArrow=none;html=1;rounded=0;strokeColor={LINEA};" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="{x1:.0f}" y="{y1:.0f}" as="sourcePoint"/><mxPoint x="{x2:.0f}" y="{y2:.0f}" as="targetPoint"/><Array as="points">{medios}</Array></mxGeometry></mxCell>')
    if rotulo:
        texto, lx, ly = rotulo
        celdas.append(f'<mxCell id="r{i}" value="{html.escape(texto).replace(chr(10), "&lt;br&gt;")}" style="text;html=1;align=center;verticalAlign=middle;fontSize=14;" vertex="1" parent="1"><mxGeometry x="{lx - 90:.0f}" y="{ly - 20:.0f}" width="180" height="40" as="geometry"/></mxCell>')
celdas.append(f'<mxCell id="titulo" value="{html.escape(TITULO)}" style="text;html=1;align=left;fontStyle=1;fontSize=18;" vertex="1" parent="1"><mxGeometry x="30" y="10" width="560" height="30" as="geometry"/></mxCell>')
drawio = ('<mxfile host="app.diagrams.net"><diagram name="Despliegue Inc 3" id="despliegue-inc3">'
          f'<mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{ANCHO:.0f}" pageHeight="{ALTO:.0f}" math="0" shadow="0"><root>'
          + "".join(celdas) + '</root></mxGraphModel></diagram></mxfile>')
open("Diagrama de Despliegue Inc3.drawio", "w", encoding="utf-8").write(drawio)

# ── SVG (misma geometría) ────────────────────────────────────────────────
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{ANCHO:.0f}" height="{ALTO:.0f}" viewBox="0 0 {ANCHO:.0f} {ALTO:.0f}" font-family="Helvetica, Arial, sans-serif">',
       '<rect width="100%" height="100%" fill="white"/>',
       f'<rect x="0.5" y="0.5" width="{ANCHO - 1:.0f}" height="{ALTO - 1:.0f}" fill="none" stroke="{LINEA}"/>',
       f'<text x="30" y="32" font-size="18" font-weight="bold" fill="{TXT}">{html.escape(TITULO)}</text>']
for pts, rotulo in aristas:
    svg.append('<polyline fill="none" stroke="#000" stroke-width="1" points="' + " ".join(f"{x:.0f},{y:.0f}" for x, y in pts) + '"/>')
    if rotulo:
        texto, lx, ly = rotulo
        lineas = texto.split("\n")
        for j, ln in enumerate(lineas):
            yy = ly + (j - (len(lineas) - 1) / 2) * 18 + 5
            svg.append(f'<text x="{lx:.0f}" y="{yy:.0f}" font-size="14" text-anchor="middle" fill="{TXT}">{html.escape(ln)}</text>')
for n in nodos:
    fill, stroke = n["col"]
    svg.append(f'<rect x="{n["x"]}" y="{n["y"]}" width="{n["w"]}" height="{n["h"]}" fill="white" stroke="{stroke}"/>')
    svg.append(f'<rect x="{n["x"]}" y="{n["y"]}" width="{n["w"]}" height="{FILA}" fill="{fill}" stroke="{stroke}"/>')
    svg.append(f'<text x="{cx(n):.0f}" y="{n["y"] + 18}" font-size="14" font-weight="bold" text-anchor="middle" fill="{TXT}">{html.escape(n["titulo"])}</text>')
    lineas, sep = filas(n)
    svg.append(f'<line x1="{n["x"]}" y1="{sep + SEP / 2}" x2="{n["x"] + n["w"]}" y2="{sep + SEP / 2}" stroke="{stroke}"/>')
    for t, y in lineas:
        svg.append(f'<text x="{n["x"] + 6}" y="{y + 18}" font-size="14" fill="{TXT}">{html.escape(t)}</text>')
svg.append('</svg>')
open("despliegue.svg", "w", encoding="utf-8").write("\n".join(svg))
open("despliegue.html", "w", encoding="utf-8").write(f'<html><body style="margin:0">{"".join(svg)}</body></html>')
print(f"tamaño {ANCHO:.0f} x {ALTO:.0f} · nodos {len(nodos)}")
