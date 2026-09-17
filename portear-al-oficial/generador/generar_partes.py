#!/usr/bin/env python3
"""Genera los scripts para traspasar un incremento del fork al repositorio oficial.

Uso, desde la raiz del fork:

    python3 portear-al-oficial/generador/generar_partes.py \\
        --config portear-al-oficial/generador/partes_incremento3.py \\
        --base upstream/main --destino main \\
        --salida portear-al-oficial/incremento3

- base:    estado actual del oficial (lo que ya tiene).
- destino: estado del fork que se quiere llevar.
- config:  define las partes (una por estudiante) y que rutas le tocan a cada una.

Cada script crea su rama, prepara los archivos y NO hace el commit.

Correccion respecto del Incremento 2: los renombres que solo cambian
mayusculas (CitaRoutes.js -> citaRoutes.js) se aplican en dos pasos con
`git mv` a traves de un nombre temporal. En Windows y macOS, que no distinguen
mayusculas, el metodo anterior (borrar el nombre viejo y traer el nuevo)
eliminaba tambien el archivo nuevo de la carpeta.
"""
import argparse, importlib.util, os, shlex, subprocess, sys


def cargar_config(ruta):
    spec = importlib.util.spec_from_file_location('config_partes', ruta)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def leer_delta(base, destino):
    salida = subprocess.run(['git', 'diff', '-z', '--name-status', '-M', base, destino],
                            capture_output=True, check=True).stdout.split(b'\0')
    cambios, i = [], 0
    while i < len(salida) and salida[i]:
        estado = salida[i].decode(); i += 1
        if estado.startswith('R'):
            cambios.append(('R', salida[i + 1].decode(), salida[i].decode())); i += 2
        else:
            cambios.append((estado[0], salida[i].decode(), None)); i += 1
    return cambios


def normalizar(cambios):
    """Separa los renombres que solo cambian mayusculas (tipo 'C').

    git a veces los informa como renombre (R) y otras como borrado + alta (D + A).
    """
    resultado, borrados = [], {}
    for estado, ruta, origen in cambios:
        if estado == 'R' and origen.lower() == ruta.lower():
            resultado.append(('C', ruta, origen))
        elif estado == 'D':
            borrados[ruta.lower()] = ruta
        else:
            resultado.append((estado, ruta, origen))
    finales = []
    for estado, ruta, origen in resultado:
        if estado == 'A' and ruta.lower() in borrados and borrados[ruta.lower()] != ruta:
            finales.append(('C', ruta, borrados.pop(ruta.lower())))
        else:
            finales.append((estado, ruta, origen))
    finales += [('D', r, None) for r in borrados.values()]
    return finales


def parte_de(ruta, partes):
    for p in partes:
        if ruta in p.get('rutas', ()) or any(ruta.startswith(x) for x in p.get('prefijos', ())):
            return p['n']
    for p in partes:
        if p.get('por_defecto'):
            return p['n']
    return None


def generar_script(parte, anterior, fork_url, traer, borrar, mayusculas):
    q = shlex.quote
    rama = f"parte-{parte['n']}-{parte['slug']}"
    base = f"origin/parte-{anterior['n']}-{anterior['slug']}" if anterior else 'origin/main'
    l = [
        '#!/bin/bash',
        f"# Parte {parte['n']} — {parte['titulo']}",
        '#',
        '# Ejecutar dentro de un clon del repositorio OFICIAL.',
        '# Prepara los archivos y NO hace el commit: ese lo haces tu, con tu cuenta.',
        'set -e',
        '',
        f'RAMA="{rama}"',
        f'BASE_SUGERIDA="{base}"',
        f'FORK="{fork_url}"',
        '',
        '# Si bajaste este script dentro del repositorio, que no aparezca como archivo suelto.',
        'NOMBRE_SCRIPT="$(basename "$0")"',
        'mkdir -p .git/info',
        'grep -qxF "$NOMBRE_SCRIPT" .git/info/exclude 2>/dev/null || echo "$NOMBRE_SCRIPT" >> .git/info/exclude',
        '',
        '# gc.auto=0: evita que git reorganice sus paquetes (en Windows se bloquea si',
        '# GitHub Desktop, VS Code u OneDrive tienen la carpeta abierta).',
        'git -c gc.auto=0 fetch origin --quiet',
        'git remote get-url fork >/dev/null 2>&1 || git remote add fork "$FORK"',
        'git -c gc.auto=0 fetch fork --quiet',
        '',
        'if ! git rev-parse --verify --quiet "$BASE_SUGERIDA" >/dev/null; then BASE_SUGERIDA="origin/main"; fi',
        'BASE="${1:-$BASE_SUGERIDA}"',
        'echo "Creando la rama $RAMA a partir de $BASE"',
        'git switch -c "$RAMA" "$BASE"',
        '',
    ]
    if mayusculas:
        l += [
            '# 1) Renombres que solo cambian mayusculas: en dos pasos, por un nombre',
            '#    temporal. Asi Windows y macOS no borran el archivo nuevo.',
            'renombrar_mayusculas() {',
            '  if git ls-files --error-unmatch "$1" >/dev/null 2>&1; then',
            '    git mv -f "$1" "$2.renombre-tmp"',
            '    git mv -f "$2.renombre-tmp" "$2"',
            '  fi',
            '}',
        ]
        l += [f'renombrar_mayusculas {q(viejo)} {q(nuevo)}' for nuevo, viejo in mayusculas]
        l += ['']
    l += ['# 2) Traer los archivos nuevos y modificados desde el fork.', 'TRAER=(']
    l += [f'  {q(p)}' for p in traer]
    l += [')', 'git checkout fork/main -- "${TRAER[@]}"', '']
    if borrar:
        l += ['# 3) Quitar lo que ya no existe en el fork.', 'BORRAR=(']
        l += [f'  {q(p)}' for p in borrar]
        l += [')', 'git rm -q -f --ignore-unmatch -- "${BORRAR[@]}"', '']
    l += [
        '# 4) Verificacion: todo lo preparado debe existir tambien en la carpeta.',
        'for f in "${TRAER[@]}"; do [ -e "$f" ] || git checkout -- "$f"; done',
        'FALTANTES="$(git ls-files --deleted)"',
        'if [ -n "$FALTANTES" ]; then',
        '  echo',
        '  echo "ATENCION: estos archivos quedaron preparados pero no estan en la carpeta:"',
        '  echo "$FALTANTES"',
        '  echo "No hagas commit todavia. Avisa para revisarlo."',
        '  exit 1',
        'fi',
        '',
        'echo',
        'echo "Archivos preparados: $(git diff --cached --name-only | wc -l | tr -d \' \')"',
        'git diff --cached --name-status | head -20',
        'echo',
        'echo "Todo listo. Ahora haz TU commit y sube la rama:"',
        'echo',
        f"echo '  git commit -m \"{parte['mensaje']}\"'",
        'echo "  git push -u origin $RAMA"',
        'echo',
        'echo "Despues abre el Pull Request en GitHub: base main <- compare $RAMA"',
    ]
    return rama, '\n'.join(l) + '\n'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--config', required=True)
    ap.add_argument('--base', required=True)
    ap.add_argument('--destino', default='main')
    ap.add_argument('--salida', required=True)
    args = ap.parse_args()

    cfg = cargar_config(args.config)
    excluir = tuple(getattr(cfg, 'EXCLUIR', ()))
    cambios = [c for c in normalizar(leer_delta(args.base, args.destino))
               if not (c[1].startswith(excluir) or (c[2] or '').startswith(excluir))]

    reparto = {p['n']: {'traer': set(), 'borrar': set(), 'mayus': []} for p in cfg.PARTES}
    sin_parte = []
    for estado, ruta, origen in cambios:
        n = parte_de(ruta, cfg.PARTES)
        if n is None:
            sin_parte.append(ruta); continue
        if estado == 'C':
            reparto[n]['mayus'].append((ruta, origen)); reparto[n]['traer'].add(ruta)
        elif estado == 'D':
            reparto[n]['borrar'].add(ruta)
        else:
            reparto[n]['traer'].add(ruta)
            if estado == 'R':
                reparto[n]['borrar'].add(origen)
    if sin_parte:
        sys.exit('Rutas sin parte asignada (agregalas a la config):\n  ' + '\n  '.join(sin_parte))

    os.makedirs(args.salida, exist_ok=True)
    anterior = None
    for parte in sorted(cfg.PARTES, key=lambda p: p['n']):
        r = reparto[parte['n']]
        if not (r['traer'] or r['borrar']):
            print(f"Parte {parte['n']}: sin cambios, no se genera script")
            continue
        rama, texto = generar_script(parte, anterior, cfg.FORK_URL, sorted(r['traer']), sorted(r['borrar']), r['mayus'])
        destino = os.path.join(args.salida, f'{rama}.sh')
        with open(destino, 'w') as f:
            f.write(texto)
        os.chmod(destino, 0o755)
        print(f"{destino}: {len(r['traer'])} a traer, {len(r['borrar'])} a borrar, {len(r['mayus'])} renombres de mayusculas")
        anterior = parte
    print(f'Total: {len(cambios)} cambios repartidos, ninguno sin asignar.')


if __name__ == '__main__':
    main()
