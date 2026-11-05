# -*- coding: utf-8 -*-
"""
Genera "Incremento 4 - para copiar y pegar.docx": las fichas de CU como tablas
con el mismo formato del informe del Incremento 3 (bordes, márgenes, Arial,
título "Tabla 3.n" con estilo Título 5 y pie "Fuente: ..."), y las listas del
modelo relacional (MR, 1FN, 2FN, 3FN) con la PK subrayada y la FK con
subrayado discontinuo. Se copia una tabla o una lista y se pega en el Word.

La plantilla (plantilla/*.xml) son trozos del XML del informe del Inc 3.
"""
import os, re, zipfile
from xml.sax.saxutils import escape

AQUI = os.path.dirname(os.path.abspath(__file__))
P = lambda n: open(os.path.join(AQUI, 'plantilla', n), encoding='utf-8').read()

MAR = ('<w:tcMar><w:top w:w="120.0" w:type="dxa"/><w:left w:w="120.0" w:type="dxa"/>'
       '<w:bottom w:w="120.0" w:type="dxa"/><w:right w:w="120.0" w:type="dxa"/></w:tcMar>')


def _borde(lado, visible):
    return (f'<w:{lado} w:color="000000" w:space="0" w:sz="5" w:val="single"/>' if visible
            else f'<w:{lado} w:color="000000" w:space="0" w:sz="0" w:val="nil"/>')


def _tc(contenido, ancho, top, left):
    return ('<w:tc><w:tcPr>'
            f'<w:tcW w:w="{ancho}" w:type="dxa"/>'
            f'<w:tcBorders>{_borde("top", top)}{_borde("left", left)}{_borde("bottom", True)}{_borde("right", True)}</w:tcBorders>'
            f'{MAR}<w:vAlign w:val="top"/></w:tcPr>{contenido}</w:tc>')


def _run(texto, negrita=False, subrayado=None, tam=None, cursiva=False):
    rpr = ''
    if negrita: rpr += '<w:b w:val="1"/><w:bCs w:val="1"/>'
    if cursiva: rpr += '<w:i w:val="1"/><w:iCs w:val="1"/>'
    if subrayado: rpr += f'<w:u w:val="{subrayado}"/>'
    if tam: rpr += f'<w:sz w:val="{tam}"/><w:szCs w:val="{tam}"/>'
    return f'<w:r><w:rPr>{rpr}<w:rtl w:val="0"/></w:rPr><w:t xml:space="preserve">{escape(texto)}</w:t></w:r>'


def _p(runs, jc=None, after=None, line=276, estilo=None):
    ppr = ''
    if estilo: ppr += f'<w:pStyle w:val="{estilo}"/>'
    despues = f' w:after="{after}"' if after is not None else ''
    ppr += f'<w:spacing{despues} w:line="{line}" w:lineRule="auto"/>'
    if jc: ppr += f'<w:jc w:val="{jc}"/>'
    return f'<w:p><w:pPr>{ppr}</w:pPr>{"".join(runs)}</w:p>'


def _fila(etiqueta, valor_xml, primera=False, alto=None):
    trpr = '<w:trPr><w:cantSplit w:val="0"/>' + (f'<w:trHeight w:val="{alto}" w:hRule="atLeast"/>' if alto else '') + '<w:tblHeader w:val="0"/></w:trPr>'
    izq = _p([_run(etiqueta, negrita=True)], jc='center' if primera else None)
    return f'<w:tr>{trpr}{_tc(izq, 1995, primera, True)}{_tc(valor_xml, 7395, primera, False)}</w:tr>'


TBL_INICIO = ('<w:tbl><w:tblPr><w:tblStyle w:val="Table3"/><w:tblW w:w="9390.0" w:type="dxa"/><w:jc w:val="left"/>'
              '<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/>'
              '<w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblLayout w:type="fixed"/>'
              '<w:tblLook w:val="0600"/></w:tblPr><w:tblGrid><w:gridCol w:w="1995"/><w:gridCol w:w="7395"/></w:tblGrid>')

CAMPOS = ['Nombre', 'Actor(es)', 'Resumen', 'Frecuencia', 'Precondiciones', 'Descripción', 'Excepciones',
          'Poscondiciones', 'Dependencias']


def tabla_cu(cu):
    """cu = {'id','nombre','actores','resumen','frecuencia','pre','descripcion','excepciones':[...],'pos','dep'}"""
    filas = [_fila(cu['id'], _p([_run(cu['nombre'], negrita=True)], jc='center'), primera=True, alto=780)]
    valores = [cu['nombre'], cu['actores'], cu['resumen'], cu['frecuencia'], cu['pre'], cu['descripcion'],
               None, cu['pos'], cu['dep']]
    for campo, valor in zip(CAMPOS, valores):
        if campo == 'Excepciones':
            pars = ''.join(_p([_run(f'Excepción {i}:', negrita=True), _run(' ' + texto)], jc='both', after=200)
                           for i, texto in enumerate(cu['excepciones'], 1))
            filas.append(_fila(campo, pars))
        elif campo == 'Descripción':
            # los marcadores [Excepción n] van en negrita
            partes = re.split(r'(\[Excepción \d+\])', valor)
            filas.append(_fila(campo, _p([_run(t, negrita=t.startswith('[Excepción')) for t in partes if t], jc='both')))
        else:
            filas.append(_fila(campo, _p([_run(valor)], jc='both')))
    return TBL_INICIO + ''.join(filas) + '</w:tbl>'


def tabla_simple(cabeza, filas):
    """Tabla con encabezado en negrita y bordes simples (modelo físico)."""
    n = len(cabeza)
    ancho = int(9390 / n)
    grid = ''.join(f'<w:gridCol w:w="{ancho}"/>' for _ in range(n))
    def celda(txt, negrita=False):
        return _tc(_p([_run(str(txt), negrita=negrita, tam=18)], line=240), ancho, True, True)
    filas_xml = '<w:tr>' + ''.join(celda(c, True) for c in cabeza) + '</w:tr>'
    filas_xml += ''.join('<w:tr>' + ''.join(celda(c) for c in f) + '</w:tr>' for f in filas)
    return (f'<w:tbl><w:tblPr><w:tblW w:w="9390" w:type="dxa"/><w:tblLayout w:type="fixed"/></w:tblPr>'
            f'<w:tblGrid>{grid}</w:tblGrid>{filas_xml}</w:tbl>' + _p([_run('')]))


def titulo_tabla(texto):
    return _p([_run(texto, cursiva=True, tam=18)], jc='center', estilo='Heading5')


def fuente():
    return (_p([_run('')], line=360) +
            _p([_run('Fuente: Elaborado por el estudiante de acuerdo al proyecto.', tam=18)], jc='center', line=360))


def encabezado(texto, nivel=2):
    return _p([_run(texto, negrita=True, tam=28 if nivel == 1 else 24)], line=276, after=120)


def nota(texto):
    return _p([_run(texto, cursiva=True, tam=18)], line=276, after=120)


def linea_relacional(linea, pk, fk):
    """Tabla (a, b, c) con PK subrayada y FK con subrayado discontinuo."""
    nombre, cuerpo = linea.split(' (', 1)
    cuerpo = cuerpo.rsplit(')', 1)[0]
    partes, nivel, actual = [], 0, ''
    for c in cuerpo:
        if c == '{': nivel += 1
        if c == '}': nivel -= 1
        if c == ',' and nivel == 0:
            partes.append(actual.strip()); actual = ''
        else:
            actual += c
    if actual.strip(): partes.append(actual.strip())
    runs = [_run(nombre + ' (')]
    for i, a in enumerate(partes):
        if i: runs.append(_run(', '))
        if '{' in a: runs.append(_run(a))
        elif a.lower() in pk: runs.append(_run(a, subrayado='single'))
        elif a in fk: runs.append(_run(a, subrayado='dash'))
        else: runs.append(_run(a))
    runs.append(_run(')'))
    return _p(runs, jc='both', after=120)


def escribir(ruta, cuerpo_xml):
    inicio = P('document_inicio.xml')
    seccion = ('<w:sectPr><w:pgSz w:h="15840" w:w="12240" w:orient="portrait"/>'
               '<w:pgMar w:bottom="1440" w:top="1440" w:left="1440" w:right="1440" w:header="720" w:footer="720"/></w:sectPr>')
    documento = inicio + cuerpo_xml + seccion + '</w:body></w:document>'
    tipos = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
             '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
             '<Default ContentType="application/xml" Extension="xml"/>'
             '<Default ContentType="application/vnd.openxmlformats-package.relationships+xml" Extension="rels"/>'
             '<Override ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml" PartName="/word/document.xml"/>'
             '<Override ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml" PartName="/word/styles.xml"/>'
             '<Override ContentType="application/vnd.openxmlformats-officedocument.theme+xml" PartName="/word/theme/theme1.xml"/>'
             '</Types>')
    rels_doc = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
                '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>'
                '</Relationships>')
    with zipfile.ZipFile(ruta, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', tipos)
        z.writestr('_rels/.rels', P('.rels'))
        z.writestr('word/_rels/document.xml.rels', rels_doc)
        z.writestr('word/document.xml', documento)
        z.writestr('word/styles.xml', P('styles.xml'))
        z.writestr('word/theme/theme1.xml', P('theme1.xml'))
