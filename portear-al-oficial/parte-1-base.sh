#!/bin/bash
# Parte 1 — Base, reestructuración y despliegue
#
# Ejecutar dentro de un clon del repositorio OFICIAL (souln4me/IDS_FRO-Salud-App).
# El script deja los archivos preparados y NO hace el commit: ese lo haces tú,
# con tu propia cuenta, para que quede a tu nombre en el historial.
set -e

RAMA="parte-1-base"
BASE_SUGERIDA="origin/main"
FORK="https://github.com/ThecheeseDX/IDS_FRO-Salud-App.git"

git fetch origin --quiet
git remote get-url fork >/dev/null 2>&1 || git remote add fork "$FORK"
git fetch fork --quiet

# Si la parte anterior aún no está subida, se parte desde main.
if ! git rev-parse --verify --quiet "$BASE_SUGERIDA" >/dev/null; then BASE_SUGERIDA="origin/main"; fi
BASE="${1:-$BASE_SUGERIDA}"
echo "Creando la rama $RAMA a partir de $BASE"
git switch -c "$RAMA" "$BASE"

TRAER=(
  GUIA-NUBE.md
  README.md
  documentacion-incremento2/CU-corregidos-Incremento2.txt
  documentacion-incremento2/Diagramas-CU-cambios.md
  documentacion-incremento2/README.md
  'documentacion-incremento2/arbol-navegacion/Arbol de Navegacion Inc2 - tabla de vistas.md'
  'documentacion-incremento2/arbol-navegacion/Arbol de Navegacion Inc2.drawio'
  'documentacion-incremento2/arbol-navegacion/Arbol de Navegacion Inc2.png'
  documentacion-incremento2/arbol-navegacion/generar_arbol.py
  documentacion-incremento2/diagramas-secuencia/README.md
  documentacion-incremento2/diagramas-secuencia/generador/comun.py
  documentacion-incremento2/diagramas-secuencia/generador/motor.py
  documentacion-incremento2/diagramas-secuencia/generador/tanda1.py
  documentacion-incremento2/diagramas-secuencia/generador/tanda2.py
  documentacion-incremento2/diagramas-secuencia/generador/tanda3.py
  documentacion-incremento2/diagramas-secuencia/generador/tanda4.py
  documentacion-incremento2/diagramas-secuencia/generador/tanda5.py
  documentacion-incremento2/diagramas-secuencia/generador/tanda6.py
  documentacion-incremento2/diagramas-secuencia/generador/tanda7.py
  documentacion-incremento2/diagramas-secuencia/generador/tanda8.py
  documentacion-incremento2/reporte-brechas-inc2.html
  fro-controlador/.env.example
  fro-controlador/package-lock.json
  fro-controlador/package.json
  fro-controlador/scripts/importar-schema.js
  fro-controlador/scripts/migrar-db.js
  fro-controlador/scripts/probar-smtp.js
  fro-controlador/scripts/validar-schema.js
  fro-controlador/server.js
  fro-controlador/src/app.js
  fro-controlador/src/config/database.js
  fro-controlador/src/config/dbOptions.js
  fro-controlador/src/database/mysql/schema.sql
  fro-vista/.env.example
  fro-vista/app.json
  fro-vista/assets/logo-fro-marca.png
  fro-vista/assets/logo-fro.png
  fro-vista/package-lock.json
  fro-vista/package.json
  fro-vista/src/api/client.js
  fro-vista/src/components/DialogoAviso.js
  fro-vista/src/components/DialogoConfirmacion.js
  fro-vista/src/components/ErrorRetry.js
  fro-vista/src/components/LogoFro.js
  fro-vista/src/components/VistaConTeclado.js
  fro-vista/src/context/AuthContext.js
  fro-vista/src/navigation/AppNavigator.js
  fro-vista/src/theme/index.js
  fro-vista/src/utils/fechas.js
  fro-vista/src/utils/modalidad.js
  render.yaml
)

git checkout fork/main -- "${TRAER[@]}"

echo
echo "Archivos preparados:"
git status --short | head -20
echo "   ... (total: $(git status --porcelain | wc -l | tr -d ' ') archivos)"
echo
echo "Ahora haz TU commit y sube la rama:"
echo
echo '  git commit -m "Base del Incremento 2: esquema y migraciones de la base de datos, conf..."'
echo "  git push -u origin $RAMA"
echo
echo "Después abre el Pull Request en GitHub: base main <- compare $RAMA"
