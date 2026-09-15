#!/bin/bash
# Parte 5 — Pautas, documentos y evidencia de atención
#
# Ejecutar dentro de un clon del repositorio OFICIAL (souln4me/IDS_FRO-Salud-App).
# El script deja los archivos preparados y NO hace el commit: ese lo haces tú,
# con tu propia cuenta, para que quede a tu nombre en el historial.
set -e

RAMA="parte-5-pautas-documentos-evidencia"
BASE_SUGERIDA="origin/parte-4-ficha-triaje"
FORK="https://github.com/ThecheeseDX/IDS_FRO-Salud-App.git"

# Si bajaste este script dentro del repositorio, que no aparezca como archivo suelto.
NOMBRE_SCRIPT="$(basename "$0")"
mkdir -p .git/info
grep -qxF "$NOMBRE_SCRIPT" .git/info/exclude 2>/dev/null || echo "$NOMBRE_SCRIPT" >> .git/info/exclude

git -c gc.auto=0 fetch origin --quiet
git remote get-url fork >/dev/null 2>&1 || git remote add fork "$FORK"
git -c gc.auto=0 fetch fork --quiet

# Si la parte anterior aún no está subida, se parte desde main.
if ! git rev-parse --verify --quiet "$BASE_SUGERIDA" >/dev/null; then BASE_SUGERIDA="origin/main"; fi
BASE="${1:-$BASE_SUGERIDA}"
echo "Creando la rama $RAMA a partir de $BASE"
git switch -c "$RAMA" "$BASE"

TRAER=(
  'documentacion-incremento2/diagramas-secuencia/CU31/CU31-Excepción 1.png'
  'documentacion-incremento2/diagramas-secuencia/CU31/CU31-Excepción 2.png'
  'documentacion-incremento2/diagramas-secuencia/CU31/CU31-Excepción 3.png'
  'documentacion-incremento2/diagramas-secuencia/CU31/CU31-Excepción 4.png'
  documentacion-incremento2/diagramas-secuencia/CU31/CU31-Principal.png
  documentacion-incremento2/diagramas-secuencia/CU31/CU31.drawio
  'documentacion-incremento2/diagramas-secuencia/CU33/CU33-Excepción 1.png'
  'documentacion-incremento2/diagramas-secuencia/CU33/CU33-Excepción 2.png'
  'documentacion-incremento2/diagramas-secuencia/CU33/CU33-Excepción 3.png'
  'documentacion-incremento2/diagramas-secuencia/CU33/CU33-Excepción 4.png'
  documentacion-incremento2/diagramas-secuencia/CU33/CU33-Principal.png
  documentacion-incremento2/diagramas-secuencia/CU33/CU33.drawio
  'documentacion-incremento2/diagramas-secuencia/CU34/CU34-Excepción 1.png'
  'documentacion-incremento2/diagramas-secuencia/CU34/CU34-Excepción 2.png'
  'documentacion-incremento2/diagramas-secuencia/CU34/CU34-Excepción 3.png'
  documentacion-incremento2/diagramas-secuencia/CU34/CU34-Principal.png
  documentacion-incremento2/diagramas-secuencia/CU34/CU34.drawio
  'documentacion-incremento2/diagramas-secuencia/CU35/CU35-Excepción 1 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU35/CU35-Excepción 1 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU35/CU35-Excepción 1 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU35/CU35-Excepción 2 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU35/CU35-Excepción 2 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU35/CU35-Excepción 2 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU35/CU35-Excepción 3 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU35/CU35-Excepción 3 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU35/CU35-Excepción 3 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU35/CU35-Excepción 4 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU35/CU35-Excepción 4 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU35/CU35-Excepción 4 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU35/CU35-Principal Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU35/CU35-Principal Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU35/CU35-Principal Profesional.png'
  documentacion-incremento2/diagramas-secuencia/CU35/CU35.drawio
  'documentacion-incremento2/diagramas-secuencia/CU39/CU39-Excepción 1 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU39/CU39-Excepción 1 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU39/CU39-Excepción 2 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU39/CU39-Excepción 2 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU39/CU39-Excepción 3 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU39/CU39-Excepción 3 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU39/CU39-Excepción 4 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU39/CU39-Excepción 4 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU39/CU39-Principal Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU39/CU39-Principal Profesional.png'
  documentacion-incremento2/diagramas-secuencia/CU39/CU39.drawio
  'documentacion-incremento2/diagramas-secuencia/CU41/CU41-Excepción 1 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU41/CU41-Excepción 1 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU41/CU41-Excepción 2 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU41/CU41-Excepción 2 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU41/CU41-Excepción 3 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU41/CU41-Excepción 3 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU41/CU41-Excepción 4 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU41/CU41-Excepción 4 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU41/CU41-Principal Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU41/CU41-Principal Profesional.png'
  documentacion-incremento2/diagramas-secuencia/CU41/CU41.drawio
  'documentacion-incremento2/diagramas-secuencia/CU42/CU42-Excepción 1 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU42/CU42-Excepción 1 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU42/CU42-Excepción 2 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU42/CU42-Excepción 2 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU42/CU42-Excepción 3 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU42/CU42-Excepción 3 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU42/CU42-Excepción 4 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU42/CU42-Excepción 4 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU42/CU42-Principal Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU42/CU42-Principal Profesional.png'
  documentacion-incremento2/diagramas-secuencia/CU42/CU42.drawio
  'documentacion-incremento2/diagramas-secuencia/CU43/CU43-Excepción 1 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU43/CU43-Excepción 1 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU43/CU43-Excepción 2 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU43/CU43-Excepción 2 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU43/CU43-Excepción 3 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU43/CU43-Excepción 3 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU43/CU43-Excepción 4 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU43/CU43-Excepción 4 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU43/CU43-Principal Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU43/CU43-Principal Profesional.png'
  documentacion-incremento2/diagramas-secuencia/CU43/CU43.drawio
  'documentacion-incremento2/diagramas-secuencia/CU46/CU46-Excepción 1.png'
  'documentacion-incremento2/diagramas-secuencia/CU46/CU46-Excepción 2.png'
  'documentacion-incremento2/diagramas-secuencia/CU46/CU46-Excepción 3.png'
  'documentacion-incremento2/diagramas-secuencia/CU46/CU46-Excepción 4.png'
  documentacion-incremento2/diagramas-secuencia/CU46/CU46-Principal.png
  documentacion-incremento2/diagramas-secuencia/CU46/CU46.drawio
  'documentacion-incremento2/diagramas-secuencia/CU47/CU47-Excepción 1.png'
  'documentacion-incremento2/diagramas-secuencia/CU47/CU47-Excepción 2.png'
  'documentacion-incremento2/diagramas-secuencia/CU47/CU47-Excepción 3.png'
  'documentacion-incremento2/diagramas-secuencia/CU47/CU47-Excepción 4.png'
  documentacion-incremento2/diagramas-secuencia/CU47/CU47-Principal.png
  documentacion-incremento2/diagramas-secuencia/CU47/CU47.drawio
  'documentacion-incremento2/diagramas-secuencia/CU48/CU48-Excepción 1.png'
  'documentacion-incremento2/diagramas-secuencia/CU48/CU48-Excepción 2.png'
  'documentacion-incremento2/diagramas-secuencia/CU48/CU48-Excepción 3.png'
  'documentacion-incremento2/diagramas-secuencia/CU48/CU48-Excepción 4.png'
  documentacion-incremento2/diagramas-secuencia/CU48/CU48-Principal.png
  documentacion-incremento2/diagramas-secuencia/CU48/CU48.drawio
  'documentacion-incremento2/diagramas-secuencia/CU49/CU49-Excepción 1.png'
  'documentacion-incremento2/diagramas-secuencia/CU49/CU49-Excepción 2.png'
  'documentacion-incremento2/diagramas-secuencia/CU49/CU49-Excepción 3.png'
  'documentacion-incremento2/diagramas-secuencia/CU49/CU49-Excepción 4.png'
  documentacion-incremento2/diagramas-secuencia/CU49/CU49-Principal.png
  documentacion-incremento2/diagramas-secuencia/CU49/CU49.drawio
  fro-controlador/src/config/cloudinary.js
  fro-controlador/src/controllers/clinico/documentoController.js
  fro-controlador/src/controllers/clinico/pautaController.js
  fro-controlador/src/controllers/clinico/versionController.js
  fro-controlador/src/controllers/evidenciaController.js
  fro-vista/src/components/LienzoFirma.js
  fro-vista/src/screens/Comun/DocumentosScreen.js
  fro-vista/src/screens/Comun/EvidenciaSesionScreen.js
  fro-vista/src/screens/Comun/VisorDocumentoScreen.js
  fro-vista/src/screens/Paciente/MisPautasScreen.js
  fro-vista/src/screens/Profesional/FichaClinica/PautasScreen.js
  fro-vista/src/screens/Profesional/FirmaConformidadScreen.js
  fro-vista/src/utils/dispositivo.js
)

git checkout fork/main -- "${TRAER[@]}"

echo
echo "Archivos preparados:"
git status --short | head -20
echo "   ... (total: $(git status --porcelain | wc -l | tr -d ' ') archivos)"
echo
echo "Ahora haz TU commit y sube la rama:"
echo
echo '  git commit -m "Pautas de ejercicio, repositorio de documentos con visor, correcciones..."'
echo "  git push -u origin $RAMA"
echo
echo "Después abre el Pull Request en GitHub: base main <- compare $RAMA"
