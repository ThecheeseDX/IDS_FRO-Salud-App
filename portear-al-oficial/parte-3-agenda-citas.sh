#!/bin/bash
# Parte 3 — Agenda y gestión de citas
#
# Ejecutar dentro de un clon del repositorio OFICIAL (souln4me/IDS_FRO-Salud-App).
# El script deja los archivos preparados y NO hace el commit: ese lo haces tú,
# con tu propia cuenta, para que quede a tu nombre en el historial.
set -e

RAMA="parte-3-agenda-citas"
BASE_SUGERIDA="origin/parte-2-cuenta-seguridad"
FORK="https://github.com/ThecheeseDX/IDS_FRO-Salud-App.git"

# Si bajaste este script dentro del repositorio, que no aparezca como archivo suelto.
NOMBRE_SCRIPT="$(basename "$0")"
mkdir -p .git/info
grep -qxF "$NOMBRE_SCRIPT" .git/info/exclude 2>/dev/null || echo "$NOMBRE_SCRIPT" >> .git/info/exclude

git fetch origin --quiet
git remote get-url fork >/dev/null 2>&1 || git remote add fork "$FORK"
git fetch fork --quiet

# Si la parte anterior aún no está subida, se parte desde main.
if ! git rev-parse --verify --quiet "$BASE_SUGERIDA" >/dev/null; then BASE_SUGERIDA="origin/main"; fi
BASE="${1:-$BASE_SUGERIDA}"
echo "Creando la rama $RAMA a partir de $BASE"
git switch -c "$RAMA" "$BASE"

TRAER=(
  'documentacion-incremento2/diagramas-secuencia/CU17/CU17-Excepción 1.png'
  'documentacion-incremento2/diagramas-secuencia/CU17/CU17-Excepción 2.png'
  'documentacion-incremento2/diagramas-secuencia/CU17/CU17-Excepción 3.png'
  'documentacion-incremento2/diagramas-secuencia/CU17/CU17-Excepción 4.png'
  documentacion-incremento2/diagramas-secuencia/CU17/CU17-Principal.png
  documentacion-incremento2/diagramas-secuencia/CU17/CU17.drawio
  'documentacion-incremento2/diagramas-secuencia/CU18/CU18-Excepción 1 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU18/CU18-Excepción 1 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU18/CU18-Excepción 2 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU18/CU18-Excepción 2 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU18/CU18-Excepción 3 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU18/CU18-Excepción 3 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU18/CU18-Excepción 4 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU18/CU18-Excepción 4 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU18/CU18-Principal Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU18/CU18-Principal Profesional.png'
  documentacion-incremento2/diagramas-secuencia/CU18/CU18.drawio
  'documentacion-incremento2/diagramas-secuencia/CU22/CU22-Excepción 1 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU22/CU22-Excepción 1 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU22/CU22-Excepción 1 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU22/CU22-Excepción 2 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU22/CU22-Excepción 2 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU22/CU22-Excepción 2 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU22/CU22-Excepción 3 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU22/CU22-Excepción 3 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU22/CU22-Excepción 3 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU22/CU22-Excepción 4 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU22/CU22-Excepción 4 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU22/CU22-Excepción 4 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU22/CU22-Principal Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU22/CU22-Principal Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU22/CU22-Principal Profesional.png'
  documentacion-incremento2/diagramas-secuencia/CU22/CU22.drawio
  'documentacion-incremento2/diagramas-secuencia/CU76/CU76-Excepción 1.png'
  'documentacion-incremento2/diagramas-secuencia/CU76/CU76-Excepción 2.png'
  'documentacion-incremento2/diagramas-secuencia/CU76/CU76-Excepción 3.png'
  'documentacion-incremento2/diagramas-secuencia/CU76/CU76-Excepción 4.png'
  documentacion-incremento2/diagramas-secuencia/CU76/CU76-Principal.png
  documentacion-incremento2/diagramas-secuencia/CU76/CU76.drawio
  fro-controlador/src/controllers/citaController.js
  fro-controlador/src/controllers/disponibilidadController.js
  fro-controlador/src/controllers/marcasTemporalesController.js
  fro-controlador/src/controllers/profesionalController.js
  fro-controlador/src/routes/citaRoutes.js
  fro-controlador/src/routes/profesionalRoutes.js
  fro-controlador/src/services/agenda/agendaService.js
  fro-vista/src/components/BarraAtencionEnCurso.js
  fro-vista/src/components/DialogoMotivo.js
  fro-vista/src/components/EtiquetaEstado.js
  fro-vista/src/screens/Paciente/BuscarCitaScreen.js
  fro-vista/src/screens/Paciente/DashboardPaciente.js
  fro-vista/src/screens/Paciente/MisCitasScreen.js
  fro-vista/src/screens/Profesional/DashboardProfesional.js
  fro-vista/src/screens/Profesional/GestionDisponibilidadScreen.js
  fro-vista/src/screens/Profesional/MiJornadaScreen.js
  fro-vista/src/screens/Profesional/MiPerfilScreen.js
  fro-vista/src/utils/estados.js
)

git checkout fork/main -- "${TRAER[@]}"

BORRAR=(
  fro-controlador/src/controllers/CitaController.js
  fro-controlador/src/routes/CitaRoutes.js
  fro-vista/src/screens/Paciente/AgendamientoScreen.js
  fro-vista/src/screens/Profesional/MarcasTemporalesScreen.js
  fro-vista/src/screens/Profesional/PacientesAsignadosScreen.js
)

git rm -q -f --ignore-unmatch -- "${BORRAR[@]}"

echo
echo "Archivos preparados:"
git status --short | head -20
echo "   ... (total: $(git status --porcelain | wc -l | tr -d ' ') archivos)"
echo
echo "Ahora haz TU commit y sube la rama:"
echo
echo '  git commit -m "Agenda: reprogramación y cancelación de citas, trazabilidad de los cam..."'
echo "  git push -u origin $RAMA"
echo
echo "Después abre el Pull Request en GitHub: base main <- compare $RAMA"
