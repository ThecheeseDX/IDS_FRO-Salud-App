#!/bin/bash
# Inc4-bloque 1 — Base del incremento, ronda de correcciones y preparación para el alta (CU51)
# Lo sube: souln4me
#
# Ejecutar dentro de un clon del repositorio OFICIAL.
# Prepara los archivos y NO hace el commit: ese lo haces tu, con tu cuenta.
set -e

RAMA="inc4-bloque-1-base-correcciones-cu51"
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
  GUIA-LOCAL.md
  fro-controlador/scripts/importar-schema.js
  fro-controlador/scripts/migrar-db.js
  fro-controlador/scripts/validar-schema.js
  fro-controlador/server.js
  fro-controlador/src/controllers/citaController.js
  fro-controlador/src/controllers/clinico/chatController.js
  fro-controlador/src/controllers/clinico/documentoController.js
  fro-controlador/src/controllers/clinico/evolucionController.js
  fro-controlador/src/controllers/clinico/fichaClinicaController.js
  fro-controlador/src/controllers/clinico/intervencionController.js
  fro-controlador/src/controllers/clinico/pautaController.js
  fro-controlador/src/controllers/evaluacionController.js
  fro-controlador/src/controllers/evidenciaController.js
  fro-controlador/src/controllers/inalterabilidadController.js
  fro-controlador/src/controllers/marcasTemporalesController.js
  fro-controlador/src/controllers/perfilPacienteController.js
  fro-controlador/src/database/mysql/iniciar-db-local.js
  fro-controlador/src/database/mysql/schema.sql
  fro-controlador/src/routes/authRoutes.js
  fro-controlador/src/routes/citaRoutes.js
  fro-controlador/src/routes/clinicaRoutes.js
  fro-controlador/src/services/agenda/agendaService.js
  fro-controlador/src/services/agenda/presencialidadService.js
  fro-controlador/src/services/clinico/adherenciaService.js
  fro-controlador/src/services/clinico/fichaPdfService.js
  fro-controlador/src/services/notifications/despachador.js
  fro-vista/src/api/client.js
  fro-vista/src/components/AdjuntarMaterial.js
  fro-vista/src/components/AdjuntoChat.js
  fro-vista/src/components/Avatar.js
  fro-vista/src/components/CalendarioMensual.js
  fro-vista/src/components/DialogoEvaluacion.js
  fro-vista/src/components/EncabezadoPerfilPaciente.js
  fro-vista/src/components/EtiquetaEvaluacion.js
  fro-vista/src/components/Icono.js
  fro-vista/src/components/MaterialApoyo.js
  fro-vista/src/components/PendientesDocumentar.js
  fro-vista/src/components/SelectorDiasSemana.js
  fro-vista/src/components/SelectorFechaRapido.js
  fro-vista/src/navigation/AppNavigator.js
  fro-vista/src/navigation/PestanasPaciente.js
  fro-vista/src/navigation/barraInferior.js
  fro-vista/src/navigation/rutasBarra.js
  fro-vista/src/screens/Admin/ModeracionResenasScreen.js
  fro-vista/src/screens/Comun/ChatClinicoScreen.js
  fro-vista/src/screens/Comun/ConversacionesScreen.js
  fro-vista/src/screens/Comun/DocumentosScreen.js
  fro-vista/src/screens/Comun/EvidenciaSesionScreen.js
  fro-vista/src/screens/Comun/SeguridadScreen.js
  fro-vista/src/screens/Comun/VisorDocumentoScreen.js
  fro-vista/src/screens/Paciente/MiTratamientoScreen.js
  fro-vista/src/screens/Paciente/MisCitasScreen.js
  fro-vista/src/screens/Paciente/MisDatosScreen.js
  fro-vista/src/screens/Paciente/MisPautasScreen.js
  fro-vista/src/screens/Paciente/PerfilProfesionalScreen.js
  fro-vista/src/screens/Paciente/PreparacionAltaScreen.js
  fro-vista/src/screens/Paciente/ResenasProfesionalScreen.js
  fro-vista/src/screens/Profesional/FichaClinica/HistorialPacienteScreen.js
  fro-vista/src/screens/Profesional/FichaClinica/PautasScreen.js
  fro-vista/src/screens/Profesional/FichaClinica/SesionClinicaScreen.js
  fro-vista/src/screens/Profesional/MiJornadaScreen.js
  fro-vista/src/utils/estados.js
  fro-vista/src/utils/texto.js
  fro-vista/src/utils/ubicacion.js
  fro-vista/src/utils/useReporteUbicacion.js
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
echo '  git commit -m "Incremento 4, bloque 1: base, correcciones y preparación para el alta (CU51)"'
echo "  git push -u origin $RAMA"
echo
echo "Despues abre el Pull Request en GitHub: base main <- compare $RAMA"
