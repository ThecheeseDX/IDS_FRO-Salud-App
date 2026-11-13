# -*- coding: utf-8 -*-
"""Convierte un SVG en PNG con el Chromium sin ventana que ya está en el equipo."""
import os
import subprocess
import tempfile

CHROME = os.path.expanduser('~/Library/Caches/ms-playwright/chromium_headless_shell-1234/'
                            'chrome-headless-shell-mac-arm64/chrome-headless-shell')


def svg_a_png(svg, ancho, alto, destino, escala=2):
    with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False, encoding='utf-8') as f:
        f.write(f'<html><body style="margin:0;background:#fff">{svg}</body></html>')
        pagina = f.name
    try:
        subprocess.run([CHROME, '--headless', f'--screenshot={destino}', f'--window-size={int(ancho) + 2},{int(alto) + 2}',
                        f'--force-device-scale-factor={escala}', '--hide-scrollbars', '--default-background-color=FFFFFFFF',
                        f'file://{pagina}'], check=True, capture_output=True, timeout=120)
    finally:
        os.unlink(pagina)
