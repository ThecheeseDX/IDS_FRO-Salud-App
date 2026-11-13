# -*- coding: utf-8 -*-
"""
Genera el Levantamiento de Procesos Final:
  - "Levantamiento de Procesos Final.bpm"  (se abre con Bizagi Modeler)
  - figuras/NN - <proceso>.png             (una figura por proceso, para el documento)
  - cobertura-casos-de-uso.md              (en qué proceso aparece cada caso de uso)

Uso:  python3 generar.py            (todo)
      python3 generar.py --sin-png  (solo el .bpm y las revisiones)
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from motor_bpm import Diagrama, escribir_bpm          # noqa: E402
from procesos import DIAGRAMAS                        # noqa: E402
from vista_previa import svg_de_diagrama              # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.dirname(AQUI)


def main():
    diagramas = [Diagrama(nombre, procesos) for nombre, procesos in DIAGRAMAS]
    avisos = [a for d in diagramas for a in d.avisos]
    for a in avisos:
        print('AVISO:', a)

    destino = os.path.join(SALIDA, 'Levantamiento de Procesos Final.bpm')
    escribir_bpm(destino, diagramas)
    print('Escrito', destino)

    # Copia de respaldo: idéntica, pero las tareas automáticas del sistema van
    # como tarea común, usando solo figuras que ya estaban en el levantamiento
    # inicial. Es para el caso de que Bizagi no abra el archivo principal.
    import motor_bpm
    original = motor_bpm.OPCIONES['servicio']
    motor_bpm.OPCIONES['servicio'] = '<TaskUser Implementation="Unspecified" />'
    os.makedirs(os.path.join(SALIDA, 'respaldo'), exist_ok=True)
    escribir_bpm(os.path.join(SALIDA, 'respaldo', 'Levantamiento de Procesos Final (respaldo).bpm'), diagramas)
    motor_bpm.OPCIONES['servicio'] = original

    # Cobertura de los 79 casos de uso
    donde = {}
    for d in diagramas:
        for p in d.procesos:
            for n in p.nodos:
                for cu in re.findall(r'CU(\d{2})', n.doc or ''):
                    donde.setdefault(int(cu), []).append((p.nombre, n.nombre))
    faltan = [f'CU{n:02d}' for n in range(1, 80) if n not in donde]
    print('Casos de uso cubiertos:', len(donde), 'de 79', '· faltan:', faltan or 'ninguno')
    with open(os.path.join(SALIDA, 'cobertura-casos-de-uso.md'), 'w', encoding='utf-8') as f:
        f.write('# En qué proceso aparece cada caso de uso\n\n| Caso de uso | Proceso | Actividad |\n|---|---|---|\n')
        for n in range(1, 80):
            vistos = []
            for proceso, actividad in donde.get(n, []):
                if (proceso, actividad) not in vistos:
                    vistos.append((proceso, actividad))
            for i, (proceso, actividad) in enumerate(vistos):
                f.write(f'| {"CU%02d" % n if i == 0 else ""} | {proceso} | {actividad} |\n')

    total_nodos = sum(len(p.nodos) for d in diagramas for p in d.procesos)
    print('Procesos:', sum(len(d.procesos) for d in diagramas), '· figuras:', total_nodos)

    if '--sin-png' in sys.argv:
        return 1 if avisos else 0
    from a_png import svg_a_png
    figuras = os.path.join(SALIDA, 'figuras')
    os.makedirs(figuras, exist_ok=True)
    numero = 0
    for d in diagramas:
        xml = d.xml()
        for p in d.procesos:
            numero += 1
            svg, ancho, alto = svg_de_diagrama(xml, p.nombre)
            with open(os.path.join(figuras, f'{numero:02d} - {p.nombre}.svg'), 'w', encoding='utf-8') as f:
                f.write(svg)
            svg_a_png(svg, ancho, alto, os.path.join(figuras, f'{numero:02d} - {p.nombre}.png'))
            print('Figura', numero, p.nombre, f'{ancho:.0f}x{alto:.0f}')
    return 1 if avisos else 0


if __name__ == '__main__':
    sys.exit(main())
