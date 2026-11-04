# -*- coding: utf-8 -*-
"""
Paso 2 de la documentación del Incremento 4. Genera:
  - reporte-cambios-inc4.html  (qué cambió, fichas con botón Copiar, base de datos)
  - Incremento 4 - para copiar y pegar.docx  (fichas como tablas del informe y listas MR/1FN/2FN/3FN)
Fuentes: cus_inc4.py (fichas), modelo_datos.py (MR/FN), datos_bd.py (cambios de la base).
"""
import html, os, re
import cus_inc4 as C
import modelo_datos as M
import datos_bd as B
import generar_docx as W

AQUI = os.path.dirname(os.path.abspath(__file__))
e = html.escape

# ── Claves ───────────────────────────────────────────────────────────────────
PK_COMPUESTA = {
    'Usuario_Telefono': ['usuario_id', 'telefono'], 'Area_Soporte_Operador': ['usuario_id', 'categoria'],
    'Profesional_Comuna': ['profesional_id', 'comuna_id'],
    'Profesional_Disponibilidad': ['profesional_id', 'dia_semana', 'hora_inicio'],
    'Sede_Horario': ['sede_id', 'dia_semana'], 'Ficha_Alergia': ['ficha_clinica_id', 'alergia'],
    'Ficha_Antecedente_Quirurgico': ['ficha_clinica_id', 'antecedente'],
    'Ficha_Antecedente_Patologico': ['ficha_clinica_id', 'antecedente'],
    'Pauta_Ejercicio_Dia': ['pauta_ejercicio_id', 'dia_semana'],
    'Evento_Critico_Termino': ['evento_critico_id', 'termino'],
}
FK_SIN_ID = {'acusado_por', 'asignado_a', 'emitida_por'}


def claves(linea, nivel):
    nombre, attrs = M._partir(M.limpio(linea))
    simples = [a for a in attrs if '{' not in a]
    pk = PK_COMPUESTA.get(nombre, simples[:1])
    fk = {a for a in simples if a not in pk and (a.endswith('_id') or a in FK_SIN_ID)}
    if nivel == 'FN3' and nombre == 'Evento_Critico':
        fk.add('origen')
    return nombre, pk, fk


def lista_html(lineas, nivel):
    filas = []
    for linea in lineas:
        nueva = linea.startswith('+')
        nombre, pk, fk = claves(linea, nivel)
        _, attrs = M._partir(linea.lstrip('+'))
        piezas = []
        for a in attrs:
            marcado = a.startswith('{+')
            limpio = M.limpio(a)
            if '{' in limpio:
                txt = e(limpio)
            elif limpio in pk:
                txt = f'<u class="pk">{e(limpio)}</u>'
            elif limpio in fk:
                txt = f'<u class="fk">{e(limpio)}</u>'
            else:
                txt = e(limpio)
            # marcas anidadas dentro de un grupo (Pauta_Tratamiento del MR)
            if not marcado and '{+' in a:
                txt = e(a)
                txt = re.sub(r'\{\+((?:[^{}]|\{[^{}]*\})*)\}', lambda m: f'<mark>{m.group(1)}</mark>', txt)
            piezas.append(f'<mark>{txt}</mark>' if marcado else txt)
        clase = ' class="nueva"' if nueva else ''
        filas.append(f'<li{clase}><b>{e(nombre)}</b> ({", ".join(piezas)})</li>')
    return '<ol class="mr">' + '\n'.join(filas) + '</ol>'


# ── Fichas ───────────────────────────────────────────────────────────────────
CAMPOS = [('Nombre', 'nombre'), ('Actor(es)', 'actores'), ('Resumen', 'resumen'), ('Frecuencia', 'frecuencia'),
          ('Precondiciones', 'pre'), ('Descripción', 'descripcion'), ('Excepciones', None),
          ('Poscondiciones', 'pos'), ('Dependencias', 'dep')]


def ficha_html(cu):
    filas = [f'<tr><th class="izq">{e(cu["id"])}</th><th>{e(cu["nombre"])}</th></tr>']
    for etiqueta, clave in CAMPOS:
        if clave:
            valor = e(cu[clave])
        else:
            valor = ''.join(f'<p><b>Excepción {i}:</b> {e(t)}</p>' for i, t in enumerate(cu['excepciones'], 1))
        filas.append(f'<tr><td class="izq"><b>{etiqueta}</b></td><td>{valor}</td></tr>')
    return f'<table class="ficha" id="tabla-{cu["id"]}">' + ''.join(filas) + '</table>'


def bloque_cu(cu, n_tabla=None):
    titulo = f'Tabla 3.{n_tabla}: “{cu["id"]} - {cu["nombre"]}”' if n_tabla else f'“{cu["id"]} - {cu["nombre"]}”'
    return f'''<section class="cu" id="{cu["id"]}">
  <header><span class="cod">{e(cu["id"])}</span><span class="nom">{e(cu["nombre"])}</span><span class="tipo">{e(cu["tipo"])}</span></header>
  <p class="cambio"><b>Qué cambió:</b> {e(cu["cambio"])}</p>
  <div class="copiable">
    <button type="button" class="copiar" data-tabla="tabla-{cu["id"]}">Copiar ficha</button>
    <p class="titulo-tabla">{e(titulo)}</p>
    {ficha_html(cu)}
  </div>
</section>'''


# ── Base de datos ────────────────────────────────────────────────────────────
def tabla_columnas(columnas):
    filas = ''.join(f'<tr><td><code>{e(c)}</code></td><td>{e(t)}</td><td>{e(r)}</td></tr>' for c, t, r in columnas)
    return f'<div class="tabla-scroll"><table><tr><th>Columna</th><th>Tipo</th><th>Restricciones y uso</th></tr>{filas}</table></div>'


def seccion_bd():
    partes = ['<h2 id="bd">Base de datos</h2>',
              '<p>Todo sale de las migraciones 47 a 63 de <code>scripts/migrar-db.js</code> (63 en total, todas aplicadas en Render). '
              'La base del MR y de las formas normales es el anexo del <b>informe del Incremento 3</b>, tal como lo entregó el equipo.</p>',
              '<h3>1 · Clases nuevas (2)</h3>']
    for tabla, motivo, cols in B.CLASES_NUEVAS:
        partes.append(f'<h4>{e(tabla)} <small>{e(motivo)}</small></h4>' + tabla_columnas(cols))
    partes.append('<h3>2 · Atributos nuevos en clases existentes (10 tablas)</h3>'
                  '<p class="leyenda">Las filas marcadas "CAMBIA" no son columnas nuevas: son columnas que pasaron a admitir NULL.</p>')
    for tabla, cu, cols in B.ATRIBUTOS_NUEVOS:
        partes.append(f'<h4>{e(tabla)} <small>{e(cu)}</small></h4>' + tabla_columnas(cols))
    filas = ''.join(f'<tr><td><code>{e(t)}</code></td><td>{e(v)}</td><td>{e(c)}</td></tr>' for t, v, c in B.VALORES_NUEVOS)
    partes.append('<h3>3 · Valores nuevos sin cambio de estructura</h3>'
                  f'<div class="tabla-scroll"><table><tr><th>Dónde</th><th>Valor</th><th>CU</th></tr>{filas}</table></div>')
    filas = ''.join(f'<tr><td>{e(a)}</td><td><b>{e(b)}</b></td><td>{e(c)}</td></tr>' for a, b, c in B.MERE)
    partes.append('<h3>4 · Cómo reflejarlo en el MERE</h3>'
                  '<p>Con la notación de Chen que ya usa el anexo: rectángulo para la entidad, óvalos para los atributos (la clave subrayada, '
                  'el multivaluado con óvalo doble) y rombo para la relación, con su cardinalidad.</p>'
                  f'<div class="tabla-scroll"><table><tr><th>Qué</th><th>Dónde</th><th>Cómo dibujarlo</th></tr>{filas}</table></div>')
    leyenda = ('<p class="leyenda">Leyenda: <span class="nuevaEj">tabla nueva</span> · <mark>atributo nuevo</mark> · '
               '<u class="pk">clave primaria</u> · <u class="fk">clave foránea</u>. En el Word para copiar las listas van sin marcas de cambio.</p>')
    partes.append('<h3>5 · Cómo reflejarlo en el MR</h3>' + leyenda +
                  f'<h4>MR <small>{len(M.MR)} tablas (Inc 3: 40)</small></h4>' + lista_html(M.MR, 'MR'))
    just = ''.join(f'<tr><td><b>{e(t)}</b></td><td>{e(n)}</td><td>{e(x)}</td></tr>' for t, n, x in M.JUSTIFICACION_3FN)
    partes.append('<h3>6 · Normalización con los cambios incorporados</h3>'
                  f'<div class="tabla-scroll"><table><tr><th>Tabla</th><th>Forma</th><th>Por qué</th></tr>{just}</table></div>'
                  + leyenda +
                  f'<h4>Primera Forma Normal <small>{len(M.FN1)} tablas (Inc 3: 53)</small></h4>' + lista_html(M.FN1, 'FN1') +
                  f'<h4>Segunda Forma Normal <small>{len(M.FN2)} tablas (Inc 3: 53)</small></h4>' + lista_html(M.FN2, 'FN2') +
                  f'<h4>Tercera Forma Normal <small>{len(M.FN3)} tablas (Inc 3: 55)</small></h4>' + lista_html(M.FN3, 'FN3'))
    return '\n'.join(partes)


HALLAZGOS = [
    ('Arreglado · CU41', 'Si la distancia superaba los 100 m, "Validar sesión" dejaba la sesión suspendida sin ofrecer el cierre manual justificado, y cada intento volvía a avisar a los administradores. Ahora la app ofrece "Cierre manual" y la derivación al administrador se hace una sola vez.'),
    ('Arreglado · CU30', 'El intento de editar o borrar un registro sellado se anotaba dentro de la transacción revertida y se perdía. Ahora queda en la bitácora.'),
    ('Arreglado · seguridad', '(1) La nómina del profesional solo se entrega a su dueño (o al administrador). (2) Solo el autor firma, edita o elimina su evolución. (3) Las derivaciones de un episodio solo se listan a quien tiene acceso al paciente. (4) Iniciar y finalizar la atención solo pasan por las marcas temporales (con GPS y certificación), y el paciente solo confirma o cancela sus citas.'),
    ('Arreglado · CU46', 'La biblioteca de las pautas ya no muestra los recursos de prevención del CU51: esos se habilitan solos al acercarse el alta, y el profesional suma su propio material a cada ejercicio (CU47). La ficha del CU46 no cambia.'),
    ('Decidido', 'La descarga de la ficha en PDF queda en el CU35 (visor de archivos) y la foto de perfil en el CU09 (datos y privacidad).'),
    ('Sin cambio de ficha', 'CU12 (RBAC), CU20/CU76 (máquina de estados), CU42 (firma, sigue opcional), CU43 (teleconsulta) y CU46 (biblioteca) no cambian de texto con estos ajustes.'),
]


def pagina():
    css = open(os.path.join(AQUI, 'plantilla', 'estilo.css'), encoding='utf-8').read()
    css = css.replace('</style>', '''
.tipo { font-size:12px; color:var(--suave); margin-left:auto }
section.cu { background:var(--superficie); border:1px solid var(--borde); border-radius:10px; padding:16px 18px; margin:16px 0 }
section.cu header { display:flex; flex-wrap:wrap; gap:10px; align-items:baseline; margin-bottom:6px }
.cambio { color:var(--suave); margin:6px 0 12px }
.copiable { position:relative; border-top:1px dashed var(--borde); padding-top:12px }
.titulo-tabla { text-align:center; font-style:italic; font-size:13px; color:var(--suave); margin:0 0 6px }
table.ficha { font:14px/1.5 Arial, sans-serif; color:var(--texto); background:var(--superficie) }
table.ficha th, table.ficha td { border:1px solid var(--texto); padding:8px; text-transform:none; letter-spacing:0; font-size:14px; color:var(--texto); background:var(--superficie) }
table.ficha th { text-align:center; font-weight:700 }
table.ficha td.izq { width:20%; }
table.ficha p { margin:0 0 8px; max-width:none }
button.copiar { position:absolute; right:0; top:10px; font:600 13px "Source Sans 3", sans-serif; color:var(--marca); background:var(--marcaSuave); border:1px solid var(--marca); border-radius:6px; padding:5px 12px; cursor:pointer }
button.copiar:focus-visible { outline:2px solid var(--acento); outline-offset:2px }
.hallazgo { display:grid; grid-template-columns:200px 1fr; gap:12px; padding:10px 0; border-top:1px solid var(--borde) }
.hallazgo b { color:var(--alerta) }
@media (max-width:640px) { .hallazgo { grid-template-columns:1fr } button.copiar { position:static; margin-bottom:8px } }
</style>''')
    inc4 = '\n'.join(bloque_cu(cu, i) for i, cu in enumerate(C.INC4, 2))
    previos = '\n'.join(bloque_cu(cu) for cu in C.PREVIOS)
    hall = ''.join(f'<div class="hallazgo"><b>{e(t)}</b><div>{e(x)}</div></div>' for t, x in HALLAZGOS)
    indice = ' '.join(f'<a href="#{cu["id"]}">{cu["id"]}</a>' for cu in C.INC4 + C.PREVIOS)
    return f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cambios Incremento 4</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&family=Source+Sans+3:wght@400;600&family=JetBrains+Mono:wght@400&display=swap">
{css}
</head>
<body>
<main>
<p class="eyebrow">Punto Paz Salud · Documentación del Incremento 4 · Paso 2</p>
<h1>Cambios en casos de uso y base de datos</h1>
<p class="sub">Comparado contra el código final (commit c36a0434, 63 migraciones), incluida la ronda de correcciones del 03-11-2026.</p>
<div class="caja"><b>Cómo copiar.</b> Cada ficha trae un botón <b>Copiar ficha</b> que copia la tabla para pegarla en Word. La forma más fiel es el archivo
<b>Incremento 4 - para copiar y pegar.docx</b>: trae las 27 fichas con el formato de las tablas del informe del Incremento 3, y las listas MR/1FN/2FN/3FN completas con las claves subrayadas.
La línea "Qué cambió" va fuera de la tabla: no se copia.</div>
<nav class="indice"><a href="#hallazgos">Hallazgos</a> <a href="#inc4">CU del Inc 4</a> <a href="#previos">CU anteriores</a> <a href="#bd">Base de datos</a><br>{indice}</nav>
<h2 id="hallazgos">Hallazgos al revisar el código (ya resueltos)</h2>
{hall}
<h2 id="inc4">Casos de uso del Incremento 4 (6)</h2>
{inc4}
<h2 id="previos">Casos de uso de incrementos anteriores afectados (21)</h2>
<p>Cambiaron por la ronda de correcciones: traspaso en la derivación, chat general, descarga de la ficha, Mi Jornada, foto de perfil, inicio y término automáticos con GPS, documentar al final de la jornada, días y material en las pautas, y la evaluación por sesión o tratamiento.</p>
{previos}
{seccion_bd()}
</main>
<script>
document.querySelectorAll('button.copiar').forEach(function (b) {{
  b.addEventListener('click', async function () {{
    var t = document.getElementById(b.dataset.tabla);
    var estilo = 'border-collapse:collapse;font-family:Arial;font-size:11pt';
    var copia = t.cloneNode(true);
    copia.setAttribute('style', estilo);
    copia.querySelectorAll('th,td').forEach(function (c) {{ c.setAttribute('style', 'border:1px solid #000;padding:6px;vertical-align:top;text-align:' + (c.tagName === 'TH' ? 'center' : 'justify')); }});
    var htmlTxt = copia.outerHTML, plano = t.innerText;
    try {{
      await navigator.clipboard.write([new ClipboardItem({{ 'text/html': new Blob([htmlTxt], {{ type: 'text/html' }}), 'text/plain': new Blob([plano], {{ type: 'text/plain' }}) }})]);
    }} catch (err) {{
      var r = document.createRange(); r.selectNode(t); var s = getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy'); s.removeAllRanges();
    }}
    var antes = b.textContent; b.textContent = 'Copiada'; setTimeout(function () {{ b.textContent = antes; }}, 1600);
  }});
}});
</script>
</body>
</html>'''


def documento():
    x = [W.encabezado('Incremento 4 · Casos de uso (Tablas 3.2 a 3.7)', 1),
         W.nota('Cada tabla va con su título "Tabla 3.n" y su pie "Fuente". Se copian juntos y se pegan en el informe; ajusta el número si cambia el orden.')]
    for i, cu in enumerate(C.INC4, 2):
        x += [W.titulo_tabla(f'Tabla 3.{i}: “{cu["id"]} - {cu["nombre"]}”'), W.tabla_cu(cu), W.fuente()]
    x += [W.encabezado('Casos de uso de incrementos anteriores actualizados', 1),
          W.nota('Reemplazan la tabla del mismo CU en el informe del incremento donde se documentó. El número de tabla se mantiene el original.')]
    for cu in C.PREVIOS:
        x += [W.titulo_tabla(f'“{cu["id"]} - {cu["nombre"]}” ({cu["tipo"].split("(")[-1].rstrip(")")})'), W.tabla_cu(cu), W.fuente()]
    for titulo, lista, nivel in (('MR', M.MR, 'MR'), ('Primera Forma Normal:', M.FN1, 'FN1'),
                                 ('Segunda Forma Normal:', M.FN2, 'FN2'), ('Tercera Forma Normal:', M.FN3, 'FN3')):
        x.append(W.encabezado(titulo, 1 if titulo == 'MR' else 2))
        for linea in lista:
            nombre, pk, fk = claves(linea, nivel)
            x.append(W.linea_relacional(M.limpio(linea), pk, fk))
    W.escribir(os.path.join(AQUI, 'Incremento 4 - para copiar y pegar.docx'), ''.join(x))


if __name__ == '__main__':
    open(os.path.join(AQUI, 'reporte-cambios-inc4.html'), 'w', encoding='utf-8').write(pagina())
    documento()
    print('listo:', len(C.INC4) + len(C.PREVIOS), 'fichas,', len(M.FN3), 'tablas en 3FN')
