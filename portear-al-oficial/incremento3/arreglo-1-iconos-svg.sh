#!/bin/bash
# Arreglo 1 — Íconos de la barra inferior dibujados en SVG
#
# Ejecutar dentro de un clon del repositorio OFICIAL.
# Prepara los archivos y NO hace el commit: ese lo haces tu, con tu cuenta.
set -e

RAMA="arreglo-1-iconos-svg"
BASE_SUGERIDA="origin/main"
FORK="https://github.com/ThecheeseDX/IDS_FRO-Salud-App.git"

# Si bajaste este script dentro del repositorio, que no aparezca como archivo suelto.
NOMBRE_SCRIPT="$(basename "$0")"
mkdir -p .git/info
grep -qxF "$NOMBRE_SCRIPT" .git/info/exclude 2>/dev/null || echo "$NOMBRE_SCRIPT" >> .git/info/exclude

# gc.auto=0: evita que git reorganice sus paquetes (en Windows se bloquea si
# GitHub Desktop, VS Code u OneDrive tienen la carpeta abierta).
git -c gc.auto=0 fetch origin --quiet
git remote get-url fork >/dev/null 2>&1 || git remote add fork "$FORK"
git -c gc.auto=0 fetch fork --quiet

if ! git rev-parse --verify --quiet "$BASE_SUGERIDA" >/dev/null; then BASE_SUGERIDA="origin/main"; fi
BASE="${1:-$BASE_SUGERIDA}"
echo "Creando la rama $RAMA a partir de $BASE"
git switch -c "$RAMA" "$BASE"

# 2) Traer los archivos nuevos y modificados desde el fork.
TRAER=(
  fro-vista/src/components/Icono.js
  fro-vista/src/navigation/PestanasPaciente.js
  fro-vista/src/navigation/barraInferior.js
  fro-vista/src/screens/Comun/ConversacionesScreen.js
  fro-vista/src/screens/Comun/SeguridadScreen.js
  fro-vista/src/screens/Paciente/MisCitasScreen.js
  fro-vista/src/screens/Paciente/PerfilProfesionalScreen.js
  fro-vista/src/screens/Profesional/MiJornadaScreen.js
  fro-vista/src/screens/Profesional/MiPerfilScreen.js
)
git checkout fork/main -- "${TRAER[@]}"

# 4) Verificacion: todo lo preparado debe existir tambien en la carpeta.
for f in "${TRAER[@]}"; do [ -e "$f" ] || git checkout -- "$f"; done
FALTANTES="$(git ls-files --deleted)"
if [ -n "$FALTANTES" ]; then
  echo
  echo "ATENCION: estos archivos quedaron preparados pero no estan en la carpeta:"
  echo "$FALTANTES"
  echo "No hagas commit todavia. Avisa para revisarlo."
  exit 1
fi

echo
echo "Archivos preparados: $(git diff --cached --name-only | wc -l | tr -d ' ')"
git diff --cached --name-status | head -20
echo
echo "Todo listo. Ahora haz TU commit y sube la rama:"
echo
echo '  git commit -m "Arreglo: íconos de la barra inferior en SVG (no dependen de descargar Ionicons.ttf)"'
echo "  git push -u origin $RAMA"
echo
echo "Despues abre el Pull Request en GitHub: base main <- compare $RAMA"
