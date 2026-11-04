# Genera el Árbol de Navegación del Incremento 4 (extiende el del Incremento 3) en dos formatos con la misma
# geometría: .drawio (editable) y .svg (para renderizar a PNG).
import html, math

W, H = 130, 50       # interfaz
FW, FH = 130, 58     # funcionalidad
GAP_X = 22           # separación entre columnas
MARGEN = 40
CY_IFACE = "#20C4E3"; CS_IFACE = "#0E9DB8"
CY_FUNC = "#8C7BD9";  CS_FUNC = "#6B5AC2"
TXT = "#1D1D3B"

def I(label, funcs=(), hijos=(), nota=None):
    return {"t": "i", "label": label, "funcs": list(funcs), "hijos": list(hijos), "nota": nota}

arbol = I("Sistema", hijos=[
  I("Registro", ["Registrar paciente (CU01)", "Registrar profesional (CU02)", "Controlar unicidad de cuentas (CU03)", "Validar contraseña en tiempo real (CU01)", "Definir bloques horarios (CU02)"], hijos=[
    I("Activación de Cuenta", ["Verificar identidad OTP (CU04)"], hijos=[
      I("Inicio de Sesión", ["Autenticar usuario (CU05)", "Segregar interfaces por rol (CU79)"], hijos=[
        I("Recuperar Contraseña", ["Solicitar restablecimiento (CU06)", "Ejecutar cambio de contraseña (CU07)"]),
        I("Seguridad de la Cuenta", ["Gestionar sesiones y tokens (CU08)", "Ejecutar cambio de contraseña (CU07)"], nota="administrador"),
        I("Centro de Notificaciones", ["Emitir y leer avisos multicanal (CU52)", "Configurar canales push y correo (CU52)", "Activar mensajes de ánimo (CU54)"], nota="los tres roles, desde la campana"),
        I("Panel de Acceso Restringido", ["Controlar acceso RBAC (CU12)"]),
        I("Consola de Auditoría", ["Registrar bitácora de auditoría (CU13)"]),
        I("Inicio Paciente", ["Enviar ubicación en visitas a domicilio (CU39)"], nota="barra inferior de 5 secciones", hijos=[
          I("Inicio (Mis Citas)", ["Saludo al paciente", "Transicionar estados de cita (CU20)", "Cancelar cita (CU18)", "Registrar trazabilidad (CU22)", "Confirmar asistencia (CU21)", "Lista de espera y tomar cupo (CU19)", "Responder satisfacción de la sesión (CU55)", "Calificar el tratamiento (CU55)", "Cambiar sesión a plan (CU74)"], hijos=[
            I("Pagos y Bonos", ["Validar bonos de cobertura (CU66)", "Registrar copagos y paquetes (CU67)", "Intercambiar con proveedor externo (CU68)", "Registrar bitácora externa (CU69)", "Reintentar ante fallos (CU70)", "Ver devoluciones (CU74)", "Ver bono provisorio (CU72)"], nota="botón arriba a la derecha"),
            I("Evidencia de Sesión", ["Registrar evidencia de teleconsulta (CU43)"], nota="teleconsulta"),
            I("Confirmación por Correo", ["Confirmar o cancelar por enlace (CU21)"], nota="desde el correo"),
            I("Tomar Cupo por Correo", ["Tomar el cupo liberado (CU19)"], nota="desde el correo"),
          ]),
          I("Mi Tratamiento", ["Abrir la entrevista si está pendiente (CU23)"], nota="pestañas superiores", hijos=[
            I("Mi Progreso", ["Visualizar panel de progreso (CU45)", "Actualizar índice de adherencia (CU44)"]),
            I("Mis Ejercicios", ["Registrar cumplimiento diario (CU48)", "Ver días asignados (CU48)", "Controlar vigencia de pautas (CU49)", "Actualizar índice de adherencia (CU44)", "Recibir mensaje de ánimo (CU54)"], hijos=[
              I("Visor de Documento", ["Ver material de apoyo (CU47)"]),
            ]),
            I("Mi Seguimiento", ["Reportar dolor y limitación (CU50)", "Alertar deterioro clínico (CU50)"]),
            I("Entrevista Previa", ["Aceptar disclaimer legal (CU27)", "Ejecutar triaje automatizado (CU23)", "Volver a la pregunta anterior (CU23)", "Estructurar síntomas a ficha (CU24)", "Generar reporte pre-clínico (CU25)", "Sugerir especialidad (CU26)"]),
            I("Prevención y Alta", ["Habilitar contenidos de prevención (CU51)", "Ver avance hacia el alta (CU51)", "Abrir recursos de prevención (CU51)"], hijos=[
              I("Visor de Documento", ["Ver informe de alta (CU37)"]),
            ]),
          ]),
          I("Agendamiento de Cita", ["Buscar y seleccionar cita (CU14)", "Controlar concurrencia (CU15)", "Reprogramar cita (CU17)", "Inscribirse en bloque ocupado (CU19)", "Ver calificación del profesional (CU58)"], nota="botón ＋ de la barra", hijos=[
            I("Pagar tu Hora", ["Pagar sesión o plan anticipado (CU73)"]),
            I("Perfil del Profesional", ["Ver perfil público (CU10)", "Ver modalidad y comunas (CU14)"], hijos=[
              I("Evaluaciones del Profesional", ["Ver promedio y reseñas (CU58)"]),
            ]),
          ]),
          I("Mensajes", ["Listar conversaciones (CU53)"], hijos=[
            I("Mis Documentos", ["Descargar mi ficha clínica (CU35)"], hijos=[I("Visor de Documento", ["Visualizar con visor embebido (CU35)"])]),
            I("Chat Clínico", ["Mensajería cifrada (CU53)", "Filtrar contenido restringido (CU57)", "Adjuntar imagen o archivo (CU53)"], hijos=[
              I("Perfil del Profesional", ["Ver perfil público (CU10)", "Ver modalidad y comunas (CU14)"]),
              I("Mis Documentos", ["Enviar documento por el chat (CU53)"], nota="modo selección"),
              I("Visor de Documento", ["Ver adjuntos del chat (CU35)"]),
            ]),
          ]),
          I("Mi Perfil", ["Ejecutar cambio de contraseña (CU07)", "Gestionar sesiones y tokens (CU08)", "Configurar privacidad de contacto (CU09)", "Nombre o anónimo en reseñas (CU58)", "Agregar o quitar foto de perfil (CU09)"], hijos=[
            I("Mis Datos", ["Editar teléfono, dirección y contacto de emergencia (CU09)"]),
            I("Ayuda y Soporte", ["Registrar y seguir solicitudes (CU60)", "Enrutar por categoría (CU61)"]),
          ]),
        ]),
        I("Gestión Profesional", nota="barra inferior de 4 secciones", hijos=[
          I("Inicio (Fichas)", ["Visualizar panel profesional (CU11)", "Ver y revisar banderas rojas (CU50)"], hijos=[
            I("Derivaciones Recibidas", ["Leer la ficha en solo lectura (CU65)", "Aceptar o rechazar derivación (CU65)"]),
            I("Ficha Clínica", ["Consolidar ficha clínica (CU28)", "Cerrar episodio (CU78)", "Abrir el chat del paciente (CU53)"], hijos=[
              I("Historial (Gestión de Agenda)", ["Transicionar estados de cita (CU20)", "Cancelar cita (CU18)", "Registrar trazabilidad (CU22)", "Ejecutar transacciones de cita (CU76)", "Registrar marcas temporales (CU38)", "Registrar GPS al iniciar y finalizar (CU39)", "Certificar al finalizar (CU41)", "Validar sesión multi-factor (CU41)", "Documentar ahora o al final de la jornada (CU40)", "Versionar correcciones (CU31)", "Cuadrar sesiones bonificables (CU71)", "Leer reporte pre-clínico (CU25)", "Ver adherencia del paciente (CU44)", "Confirmar hora pagada (CU73)", "Solicitar evaluación al cerrar (CU55)", "Episodio y evolución recientes con historial (CU28)"], hijos=[
                I("Evidencia de Sesión", ["Consultar presencialidad GPS (CU39)", "Registrar evidencia de teleconsulta (CU43)"]),
                I("Firma de Conformidad", ["Capturar firma manuscrita (CU42)"]),
                I("Documentos del Paciente", ["Almacenar archivos multimedia (CU33)", "Categorizar documentos (CU34)"], hijos=[I("Visor de Documento", ["Visualizar con visor embebido (CU35)"])]),
                I("Bonos por Contingencia", ["Ingresar bono provisorio (CU72)"], nota="desde la cuadratura"),
              ]),
              I("Anamnesis", ["Registrar antecedentes (CU29)", "Renderizar plantillas dinámicas (CU77)"]),
              I("Episodios", ["Agrupar registros por episodio (CU78)"], hijos=[
                I("Informe de Alta", ["Consolidar estado final del episodio (CU37)", "Emitir informe de alta y cerrar (CU37)", "Cerrar sin informe de alta (CU78)"]),
              ]),
              I("Sesión Clínica (Atención Clínica)", ["Documentar intervención (CU40)", "Definir metas y objetivos (CU32)", "Asegurar inalterabilidad (CU30)", "Firmar digitalmente (CU36)"]),
              I("Pautas", ["Seleccionar material de biblioteca (CU46)", "Prescribir pautas de ejercicio (CU47)", "Asignar días de la semana (CU47)", "Subir material de apoyo (CU47)", "Controlar vigencia de pautas (CU49)"]),
              I("Derivación Interna", ["Derivar el episodio (CU65)", "Cancelar derivación pendiente (CU65)"]),
            ]),
          ]),
          I("Mi Jornada", ["Ver agenda por día, semana o mes (CU11)", "Ir a una fecha (CU11)", "Pendientes de documentar (CU40)"], hijos=[
            I("Gestión de Disponibilidad", ["Restringir disponibilidad (CU16)"], nota="botón flotante"),
          ]),
          I("Mensajes", ["Listar conversaciones (CU53)"], hijos=[
            I("Chat Clínico", ["Mensajería cifrada (CU53)", "Filtrar contenido restringido (CU57)", "Ir a la ficha clínica (CU28)", "Adjuntar imagen o archivo (CU53)"], hijos=[
              I("Documentos del Paciente", ["Enviar documento por el chat (CU53)"], nota="modo selección"),
              I("Visor de Documento", ["Ver adjuntos del chat (CU35)"]),
            ]),
          ]),
          I("Perfil (Mi Perfil Público)", ["Administrar catálogo de perfil (CU10)", "Ver mi calificación (CU58)", "Ejecutar cambio de contraseña (CU07)", "Gestionar sesiones y tokens (CU08)"], hijos=[
            I("Mis Horarios de Atención", ["Gestionar bloques horarios (CU02)"]),
            I("Evaluaciones del Profesional", ["Ver promedio y reseñas (CU58)"]),
            I("Mis Liquidaciones", ["Consultar liquidaciones (CU75)"], nota="botón arriba a la derecha"),
            I("Bonos por Contingencia", ["Ingresar bono provisorio (CU72)"]),
            I("Ayuda y Soporte", ["Registrar y seguir solicitudes (CU60)", "Enrutar por categoría (CU61)"]),
          ]),
        ]),
        I("Panel de Administración", ["Monitorear dashboard de KPIs (CU64)"], hijos=[
          I("Gestión de Parámetros", ["Gestionar parámetros globales (CU59)", "Restringir disponibilidad (CU16)"]),
          I("Sesiones Suspendidas", ["Revisar sesiones derivadas (CU41)"]),
          I("Bandeja de Soporte", ["Enrutar y resolver tickets (CU61)"]),
          I("Informes Operativos", ["Generar y exportar reportes (CU63)"]),
          I("Liquidaciones", ["Liquidar ganancias mensuales (CU75)"]),
          I("Moderar Testimonios", ["Moderar testimonios públicos (CU56)"]),
          I("Términos Restringidos", ["Administrar diccionario restringido (CU57)", "Clasificar términos críticos (CU62)"]),
          I("Eventos Críticos", ["Revisar eventos escalados (CU62)", "Acusar recibo (CU62)"]),
          I("Contingencia de Bonos", ["Forzar modo contingencia (CU72)", "Ingresar bono provisorio (CU72)", "Regularizar con el financiador (CU72)"]),
        ]),
      ]),
    ]),
  ]),
])

# ── Layout ────────────────────────────────────────────────────────────────
LADO = 34   # separación entre tronco y funcionalidades laterales
def ancho(n):
    if n["hijos"]:
        a = sum(ancho(h) for h in n["hijos"]) + GAP_X * (len(n["hijos"]) - 1)
        if n["funcs"]:
            a = max(a, 2 * (LADO + FW + 16))
        n["_w"] = a
    else:
        n["_w"] = max(W, FW) + GAP_X
    return n["_w"]
ancho(arbol)

nodos, aristas = [], []   # nodos: dict(x,y,w,h,label,tipo,nota) ; aristas: [(puntos), estilo]
def colocar(n, x0, y):
    cx = x0 + n["_w"] / 2
    n["_cx"], n["_y"] = cx, y
    nodos.append({"x": cx - W/2, "y": y, "w": W, "h": H, "label": n["label"], "tipo": "i", "nota": n["nota"]})
    if not n["hijos"]:
        # funcionalidades en columna bajo la interfaz
        fy = y + H + 28
        prev = (cx, y + H)
        for f in n["funcs"]:
            nodos.append({"x": cx - FW/2, "y": fy, "w": FW, "h": FH, "label": f, "tipo": "f"})
            aristas.append([prev, (cx, fy)])
            prev = (cx, fy + FH)
            fy += FH + 14
        n["_bottom"] = fy
        return
    # funcionalidades laterales alternando izquierda/derecha del tronco
    filas = math.ceil(len(n["funcs"]) / 2)
    fy = y + H + 26
    for k, f in enumerate(n["funcs"]):
        fila, lado = divmod(k, 2)
        yy = fy + fila * (FH + 12)
        fx = cx - LADO - FW if lado == 0 else cx + LADO
        nodos.append({"x": fx, "y": yy, "w": FW, "h": FH, "label": f, "tipo": "f"})
        ax = fx + FW if lado == 0 else fx
        aristas.append([(cx, yy + FH/2), (ax, yy + FH/2)])
    bus_y = (fy + filas * (FH + 12) + 12) if n["funcs"] else (y + H + 44)
    cy = bus_y + 30
    total = sum(h["_w"] for h in n["hijos"]) + GAP_X * (len(n["hijos"]) - 1)
    x = x0 + (n["_w"] - total) / 2
    for h in n["hijos"]:
        colocar(h, x, cy)
        hx = h["_cx"]
        aristas.append([(cx, y + H), (hx, cy)] if len(n["hijos"]) == 1 and abs(hx - cx) < 1 else [(cx, y + H), (cx, bus_y), (hx, bus_y), (hx, cy)])
        x += h["_w"] + GAP_X
colocar(arbol, MARGEN, MARGEN + 70)

ANCHO = max(nd["x"] + nd["w"] for nd in nodos) + MARGEN
ALTO = max(nd["y"] + nd["h"] for nd in nodos) + MARGEN

# ── Texto: ajuste de líneas ──────────────────────────────────────────────
def envolver(txt, maxc=18):
    palabras, lineas, actual = txt.split(), [], ""
    for p in palabras:
        if len(actual) + len(p) + 1 > maxc and actual:
            lineas.append(actual); actual = p
        else:
            actual = (actual + " " + p).strip()
    if actual: lineas.append(actual)
    return lineas

# ── drawio ───────────────────────────────────────────────────────────────
cells = []
cid = 2
def add_cell(s):
    global cid
    cells.append(s); cid += 1
# leyenda
cells.append(f'<mxCell id="leg1" value="" style="rounded=1;whiteSpace=wrap;html=1;fillColor={CY_IFACE};strokeColor={CS_IFACE};" vertex="1" parent="1"><mxGeometry x="{ANCHO-330}" y="{MARGEN}" width="26" height="26" as="geometry"/></mxCell>')
cells.append(f'<mxCell id="leg1t" value="Interfaces" style="text;html=1;align=left;verticalAlign=middle;fontStyle=1;fontSize=14;fontFamily=Helvetica;fontColor={TXT};" vertex="1" parent="1"><mxGeometry x="{ANCHO-296}" y="{MARGEN}" width="120" height="26" as="geometry"/></mxCell>')
cells.append(f'<mxCell id="leg2" value="" style="rounded=1;whiteSpace=wrap;html=1;fillColor={CY_FUNC};strokeColor={CS_FUNC};" vertex="1" parent="1"><mxGeometry x="{ANCHO-330}" y="{MARGEN+36}" width="26" height="26" as="geometry"/></mxCell>')
cells.append(f'<mxCell id="leg2t" value="Funcionalidades" style="text;html=1;align=left;verticalAlign=middle;fontStyle=1;fontSize=14;fontFamily=Helvetica;fontColor={TXT};" vertex="1" parent="1"><mxGeometry x="{ANCHO-296}" y="{MARGEN+36}" width="140" height="26" as="geometry"/></mxCell>')
cells.append(f'<mxCell id="titulo" value="Árbol de Navegación – Punto Paz Salud, Incremento 4" style="text;html=1;align=left;verticalAlign=middle;fontStyle=1;fontSize=20;fontFamily=Helvetica;fontColor={TXT};" vertex="1" parent="1"><mxGeometry x="{MARGEN}" y="{MARGEN}" width="600" height="30" as="geometry"/></mxCell>')
for k, nd in enumerate(nodos):
    fill, stroke = (CY_IFACE, CS_IFACE) if nd["tipo"] == "i" else (CY_FUNC, CS_FUNC)
    label = html.escape(nd["label"])
    if nd.get("nota"):
        label += f'&lt;br&gt;&lt;font style=&quot;font-size:9px&quot;&gt;({html.escape(nd["nota"])})&lt;/font&gt;'
    fs = 11 if nd["tipo"] == "i" else 10
    cells.append(f'<mxCell id="n{k}" value="{label}" style="rounded=1;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};fontColor={TXT};fontSize={fs};fontFamily=Helvetica;arcSize=18;" vertex="1" parent="1"><mxGeometry x="{nd["x"]:.0f}" y="{nd["y"]:.0f}" width="{nd["w"]}" height="{nd["h"]}" as="geometry"/></mxCell>')
for k, pts in enumerate(aristas):
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    medios = "".join(f'<mxPoint x="{px:.0f}" y="{py:.0f}"/>' for px, py in pts[1:-1])
    cells.append(f'<mxCell id="e{k}" style="endArrow=none;html=1;strokeColor=#5C5C7A;strokeWidth=1;" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="{x1:.0f}" y="{y1:.0f}" as="sourcePoint"/><mxPoint x="{x2:.0f}" y="{y2:.0f}" as="targetPoint"/><Array as="points">{medios}</Array></mxGeometry></mxCell>')
drawio = ('<mxfile host="app.diagrams.net"><diagram name="Árbol de Navegación Inc 4" id="arbol-inc4">'
          f'<mxGraphModel dx="1400" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{int(ANCHO)}" pageHeight="{int(ALTO)}" math="0" shadow="0">'
          '<root><mxCell id="0"/><mxCell id="1" parent="0"/>' + "".join(cells) + '</root></mxGraphModel></diagram></mxfile>')
open("Arbol de Navegacion Inc4.drawio", "w").write(drawio)

# ── SVG ──────────────────────────────────────────────────────────────────
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{ANCHO:.0f}" height="{ALTO:.0f}" viewBox="0 0 {ANCHO:.0f} {ALTO:.0f}" font-family="Helvetica, Arial, sans-serif">',
       f'<rect width="100%" height="100%" fill="white"/>',
       f'<text x="{MARGEN}" y="{MARGEN+22}" font-size="20" font-weight="bold" fill="{TXT}">Árbol de Navegación – Punto Paz Salud, Incremento 4</text>',
       f'<rect x="{ANCHO-330}" y="{MARGEN}" width="26" height="26" rx="6" fill="{CY_IFACE}" stroke="{CS_IFACE}"/><text x="{ANCHO-296}" y="{MARGEN+18}" font-size="14" font-weight="bold" fill="{TXT}">Interfaces</text>',
       f'<rect x="{ANCHO-330}" y="{MARGEN+36}" width="26" height="26" rx="6" fill="{CY_FUNC}" stroke="{CS_FUNC}"/><text x="{ANCHO-296}" y="{MARGEN+54}" font-size="14" font-weight="bold" fill="{TXT}">Funcionalidades</text>']
for pts in aristas:
    svg.append('<polyline fill="none" stroke="#5C5C7A" stroke-width="1.2" points="' + " ".join(f"{x:.0f},{y:.0f}" for x, y in pts) + '"/>')
for nd in nodos:
    fill, stroke = (CY_IFACE, CS_IFACE) if nd["tipo"] == "i" else (CY_FUNC, CS_FUNC)
    fs = 11 if nd["tipo"] == "i" else 10
    lineas = envolver(nd["label"], 20 if nd["tipo"] == "i" else 22)
    if nd.get("nota"): lineas.append(f'({nd["nota"]})')
    svg.append(f'<rect x="{nd["x"]:.0f}" y="{nd["y"]:.0f}" width="{nd["w"]}" height="{nd["h"]}" rx="8" fill="{fill}" stroke="{stroke}"/>')
    lh = fs + 3
    y0 = nd["y"] + nd["h"]/2 - (len(lineas)-1) * lh/2 + fs*0.35
    for j, ln in enumerate(lineas):
        peso = ' font-weight="bold"' if nd["tipo"] == "i" and j < len(lineas) - (1 if nd.get("nota") else 0) else ''
        tam = 9 if (nd.get("nota") and j == len(lineas)-1) else fs
        svg.append(f'<text x="{nd["x"]+nd["w"]/2:.0f}" y="{y0 + j*lh:.0f}" font-size="{tam}" text-anchor="middle" fill="{TXT}"{peso}>{html.escape(ln)}</text>')
svg.append('</svg>')
open("arbol.svg", "w").write("\n".join(svg))
open("arbol.html", "w").write(f'<html><body style="margin:0">{"".join(svg)}</body></html>')
print(f"tamaño {ANCHO:.0f} x {ALTO:.0f}  · interfaces {sum(1 for n in nodos if n['tipo']=='i')} · funcionalidades {sum(1 for n in nodos if n['tipo']=='f')}")

# PNG en alta resolución con el Chromium headless de Playwright
import glob, os, subprocess
chrome = sorted(glob.glob(os.path.expanduser('~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac*/chrome-headless-shell')))
if chrome:
    subprocess.run([chrome[-1], '--headless', '--disable-gpu', '--hide-scrollbars', f'--window-size={int(ANCHO)},{int(ALTO)}',
                    '--screenshot=Arbol de Navegacion Inc4.png', 'file://' + os.path.abspath('arbol.html')], capture_output=True)
    os.remove('arbol.html')
