#!/bin/bash
# Parte 6 — Pagos, integración externa y administración
#
# Ejecutar dentro de un clon del repositorio OFICIAL (souln4me/IDS_FRO-Salud-App).
# El script deja los archivos preparados y NO hace el commit: ese lo haces tú,
# con tu propia cuenta, para que quede a tu nombre en el historial.
set -e

RAMA="parte-6-pagos-administracion"
BASE_SUGERIDA="origin/parte-5-pautas-documentos-evidencia"
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
  'documentacion-incremento2/diagramas-secuencia/CU66/CU66-Excepción 1.png'
  'documentacion-incremento2/diagramas-secuencia/CU66/CU66-Excepción 2.png'
  'documentacion-incremento2/diagramas-secuencia/CU66/CU66-Excepción 3.png'
  'documentacion-incremento2/diagramas-secuencia/CU66/CU66-Excepción 4.png'
  documentacion-incremento2/diagramas-secuencia/CU66/CU66-Principal.png
  documentacion-incremento2/diagramas-secuencia/CU66/CU66.drawio
  'documentacion-incremento2/diagramas-secuencia/CU67/CU67-Excepción 1.png'
  'documentacion-incremento2/diagramas-secuencia/CU67/CU67-Excepción 2.png'
  'documentacion-incremento2/diagramas-secuencia/CU67/CU67-Excepción 3.png'
  'documentacion-incremento2/diagramas-secuencia/CU67/CU67-Excepción 4.png'
  documentacion-incremento2/diagramas-secuencia/CU67/CU67-Principal.png
  documentacion-incremento2/diagramas-secuencia/CU67/CU67.drawio
  'documentacion-incremento2/diagramas-secuencia/CU69/CU69-Excepción 1.png'
  'documentacion-incremento2/diagramas-secuencia/CU69/CU69-Excepción 2.png'
  'documentacion-incremento2/diagramas-secuencia/CU69/CU69-Excepción 3.png'
  documentacion-incremento2/diagramas-secuencia/CU69/CU69-Principal.png
  documentacion-incremento2/diagramas-secuencia/CU69/CU69.drawio
  'documentacion-incremento2/diagramas-secuencia/CU71/CU71-Excepción 1.png'
  'documentacion-incremento2/diagramas-secuencia/CU71/CU71-Excepción 2.png'
  'documentacion-incremento2/diagramas-secuencia/CU71/CU71-Excepción 3.png'
  'documentacion-incremento2/diagramas-secuencia/CU71/CU71-Excepción 4.png'
  documentacion-incremento2/diagramas-secuencia/CU71/CU71-Principal.png
  documentacion-incremento2/diagramas-secuencia/CU71/CU71.drawio
  fro-controlador/src/controllers/pagoController.js
  fro-controlador/src/controllers/parametroController.js
  fro-controlador/src/routes/pagoRoutes.js
  fro-controlador/src/services/external/providerAdapter.js
  fro-controlador/src/utils/dataMappers.js
  fro-controlador/src/utils/externalHttpClient.js
  fro-controlador/src/validators/externalSchemas.js
  fro-vista/src/screens/Admin/ParametrosScreen.js
  fro-vista/src/screens/Admin/SesionesSuspendidasScreen.js
  fro-vista/src/screens/Paciente/PagosScreen.js
)

git checkout fork/main -- "${TRAER[@]}"

echo
echo "Archivos preparados:"
git status --short | head -20
echo "   ... (total: $(git status --porcelain | wc -l | tr -d ' ') archivos)"
echo
echo "Ahora haz TU commit y sube la rama:"
echo
echo '  git commit -m "Bonos de cobertura, copagos y planes de sesiones, bitácora de transacc..."'
echo "  git push -u origin $RAMA"
echo
echo "Después abre el Pull Request en GitHub: base main <- compare $RAMA"
