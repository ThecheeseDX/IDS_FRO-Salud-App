#!/bin/bash
# Parte 4 — Ficha clínica, triaje y episodio
#
# Ejecutar dentro de un clon del repositorio OFICIAL (souln4me/IDS_FRO-Salud-App).
# El script deja los archivos preparados y NO hace el commit: ese lo haces tú,
# con tu propia cuenta, para que quede a tu nombre en el historial.
set -e

RAMA="parte-4-ficha-triaje"
BASE_SUGERIDA="origin/parte-3-agenda-citas"
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
  'documentacion-incremento2/diagramas-secuencia/CU23/CU23-Excepción 1.png'
  'documentacion-incremento2/diagramas-secuencia/CU23/CU23-Excepción 2.png'
  'documentacion-incremento2/diagramas-secuencia/CU23/CU23-Excepción 3.png'
  'documentacion-incremento2/diagramas-secuencia/CU23/CU23-Excepción 4.png'
  documentacion-incremento2/diagramas-secuencia/CU23/CU23-Principal.png
  documentacion-incremento2/diagramas-secuencia/CU23/CU23.drawio
  'documentacion-incremento2/diagramas-secuencia/CU24/CU24-Excepción 1.png'
  'documentacion-incremento2/diagramas-secuencia/CU24/CU24-Excepción 2.png'
  'documentacion-incremento2/diagramas-secuencia/CU24/CU24-Excepción 3.png'
  'documentacion-incremento2/diagramas-secuencia/CU24/CU24-Excepción 4.png'
  documentacion-incremento2/diagramas-secuencia/CU24/CU24-Principal.png
  documentacion-incremento2/diagramas-secuencia/CU24/CU24.drawio
  'documentacion-incremento2/diagramas-secuencia/CU27/CU27-Excepción 1.png'
  'documentacion-incremento2/diagramas-secuencia/CU27/CU27-Excepción 2.png'
  'documentacion-incremento2/diagramas-secuencia/CU27/CU27-Excepción 3.png'
  documentacion-incremento2/diagramas-secuencia/CU27/CU27-Principal.png
  documentacion-incremento2/diagramas-secuencia/CU27/CU27.drawio
  'documentacion-incremento2/diagramas-secuencia/CU77/CU77-Excepción 1.png'
  'documentacion-incremento2/diagramas-secuencia/CU77/CU77-Excepción 2.png'
  'documentacion-incremento2/diagramas-secuencia/CU77/CU77-Excepción 3.png'
  'documentacion-incremento2/diagramas-secuencia/CU77/CU77-Excepción 4.png'
  documentacion-incremento2/diagramas-secuencia/CU77/CU77-Principal.png
  documentacion-incremento2/diagramas-secuencia/CU77/CU77.drawio
  'documentacion-incremento2/diagramas-secuencia/CU78/CU78-Excepción 1.png'
  'documentacion-incremento2/diagramas-secuencia/CU78/CU78-Excepción 2.png'
  'documentacion-incremento2/diagramas-secuencia/CU78/CU78-Excepción 3.png'
  'documentacion-incremento2/diagramas-secuencia/CU78/CU78-Excepción 4.png'
  documentacion-incremento2/diagramas-secuencia/CU78/CU78-Principal.png
  documentacion-incremento2/diagramas-secuencia/CU78/CU78.drawio
  fro-controlador/src/controllers/clinico/episodioController.js
  fro-controlador/src/controllers/clinico/evolucionController.js
  fro-controlador/src/controllers/clinico/fichaClinicaController.js
  fro-controlador/src/controllers/clinico/intervencionController.js
  fro-controlador/src/controllers/clinico/objetivoController.js
  fro-controlador/src/controllers/clinico/triajeController.js
  fro-controlador/src/controllers/inalterabilidadController.js
  fro-controlador/src/routes/clinicaRoutes.js
  fro-controlador/src/routes/inalterabilidadRoutes.js
  fro-controlador/src/services/clinico/episodioService.js
  fro-controlador/src/services/clinico/triajeService.js
  fro-vista/src/components/TabSelector.js
  fro-vista/src/screens/Paciente/TriajeScreen.js
  fro-vista/src/screens/Profesional/FichaClinica/AnamnesisScreen.js
  fro-vista/src/screens/Profesional/FichaClinica/EpisodioScreen.js
  fro-vista/src/screens/Profesional/FichaClinica/FichaClinicaScreen.js
  fro-vista/src/screens/Profesional/FichaClinica/HistorialPacienteScreen.js
  fro-vista/src/screens/Profesional/FichaClinica/SesionClinicaScreen.js
)

git checkout fork/main -- "${TRAER[@]}"

BORRAR=(
  fro-controlador/src/controllers/EpisodioController.js
  fro-controlador/src/controllers/InalterabilidadController.js
  fro-controlador/src/controllers/evolucionController.js
  fro-controlador/src/controllers/fichaClinicaController.js
  fro-controlador/src/controllers/intervencionController.js
  fro-controlador/src/controllers/objetivoController.js
  fro-controlador/src/routes/ClinicaRoutes.js
  fro-controlador/src/routes/InalterabilidadRoutes.js
  fro-vista/src/screens/Profesional/AnamnesisScreen.js
  fro-vista/src/screens/Profesional/EpisodioScreen.js
  fro-vista/src/screens/Profesional/EvolucionClinicaScreen.js
  fro-vista/src/screens/Profesional/HistorialPacienteScreen.js
  fro-vista/src/screens/Profesional/InalterabilidadScreen.js
  fro-vista/src/screens/Profesional/IntervencionScreen.js
)

git rm -q -f --ignore-unmatch -- "${BORRAR[@]}"

echo
echo "Archivos preparados:"
git status --short | head -20
echo "   ... (total: $(git status --porcelain | wc -l | tr -d ' ') archivos)"
echo
echo "Ahora haz TU commit y sube la rama:"
echo
echo '  git commit -m "Ficha clínica: entrevista previa de triaje con su disclaimer, integrac..."'
echo "  git push -u origin $RAMA"
echo
echo "Después abre el Pull Request en GitHub: base main <- compare $RAMA"
