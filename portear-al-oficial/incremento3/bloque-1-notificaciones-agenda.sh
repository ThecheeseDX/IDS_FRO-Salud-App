#!/bin/bash
# Bloque 1 — Base, rediseño Punto Paz, navegación inferior y notificaciones y agenda (CU52, CU21, CU19)
# Lo sube: souln4me
#
# Ejecutar dentro de un clon del repositorio OFICIAL.
# Prepara los archivos y NO hace el commit: ese lo haces tu, con tu cuenta.
set -e

RAMA="bloque-1-notificaciones-agenda"
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
  fro-controlador/.env.example
  fro-controlador/package-lock.json
  fro-controlador/package.json
  fro-controlador/scripts/migrar-db.js
  fro-controlador/scripts/probar-smtp.js
  fro-controlador/server.js
  fro-controlador/src/app.js
  fro-controlador/src/controllers/authController.js
  fro-controlador/src/controllers/citaController.js
  fro-controlador/src/controllers/clinico/episodioController.js
  fro-controlador/src/controllers/clinico/evolucionController.js
  fro-controlador/src/controllers/clinico/intervencionController.js
  fro-controlador/src/controllers/clinico/objetivoController.js
  fro-controlador/src/controllers/confirmacionController.js
  fro-controlador/src/controllers/disponibilidadController.js
  fro-controlador/src/controllers/evidenciaController.js
  fro-controlador/src/controllers/inalterabilidadController.js
  fro-controlador/src/controllers/listaEsperaController.js
  fro-controlador/src/controllers/marcasTemporalesController.js
  fro-controlador/src/controllers/notificacionController.js
  fro-controlador/src/controllers/parametroController.js
  fro-controlador/src/database/mysql/schema.sql
  fro-controlador/src/routes/citaRoutes.js
  fro-controlador/src/routes/notificacionRoutes.js
  fro-controlador/src/routes/parametroRoutes.js
  fro-controlador/src/services/agenda/agendaService.js
  fro-controlador/src/services/agenda/confirmacionService.js
  fro-controlador/src/services/agenda/programador.js
  fro-controlador/src/services/clinico/episodioService.js
  fro-controlador/src/services/notifications/despachador.js
  fro-controlador/src/services/notifications/otpService.js
  fro-controlador/src/utils/dataMappers.js
  fro-vista/.env.example
  fro-vista/App.js
  fro-vista/app.json
  fro-vista/assets/icono-adaptativo.png
  fro-vista/assets/icono-app.png
  fro-vista/assets/logo-puntopaz-completo.png
  fro-vista/assets/logo-puntopaz-icono.png
  fro-vista/package-lock.json
  fro-vista/package.json
  fro-vista/src/api/client.js
  fro-vista/src/components/BarraAtencionEnCurso.js
  fro-vista/src/components/CambioContrasenaOTP.js
  fro-vista/src/components/CampanaNotificaciones.js
  fro-vista/src/components/CampoContrasena.js
  fro-vista/src/components/DialogoAviso.js
  fro-vista/src/components/DialogoConfirmacion.js
  fro-vista/src/components/EditorBloqueHorario.js
  fro-vista/src/components/LogoMarca.js
  fro-vista/src/components/RequisitosContrasena.js
  fro-vista/src/components/SeccionHistorial.js
  fro-vista/src/context/AuthContext.js
  fro-vista/src/navigation/AppNavigator.js
  fro-vista/src/navigation/PestanasPaciente.js
  fro-vista/src/navigation/PestanasProfesional.js
  fro-vista/src/navigation/barraInferior.js
  fro-vista/src/navigation/rutasBarra.js
  fro-vista/src/screens/Admin/ParametrosScreen.js
  fro-vista/src/screens/Auth/LoginScreen.js
  fro-vista/src/screens/Auth/RegisterScreen.js
  fro-vista/src/screens/Comun/CentroNotificacionesScreen.js
  fro-vista/src/screens/Comun/SeguridadScreen.js
  fro-vista/src/screens/Comun/VisorDocumentoScreen.js
  fro-vista/src/screens/Paciente/BuscarCitaScreen.js
  fro-vista/src/screens/Paciente/MisCitasScreen.js
  fro-vista/src/screens/Profesional/FichaClinica/AnamnesisScreen.js
  fro-vista/src/screens/Profesional/FichaClinica/EpisodioScreen.js
  fro-vista/src/screens/Profesional/FichaClinica/FichaClinicaScreen.js
  fro-vista/src/screens/Profesional/FichaClinica/SesionClinicaScreen.js
  fro-vista/src/screens/Profesional/FirmaConformidadScreen.js
  fro-vista/src/screens/Profesional/GestionDisponibilidadScreen.js
  fro-vista/src/screens/Profesional/MiJornadaScreen.js
  fro-vista/src/screens/Profesional/MisHorariosScreen.js
  fro-vista/src/theme/index.js
  fro-vista/src/utils/estados.js
  fro-vista/src/utils/fechas.js
  fro-vista/src/utils/push.js
)
git checkout fork/main -- "${TRAER[@]}"

# 3) Quitar lo que ya no existe en el fork.
BORRAR=(
  fro-vista/assets/logo-fro-marca.png
  fro-vista/assets/logo-fro.png
  fro-vista/src/components/LogoFro.js
  fro-vista/src/screens/Paciente/DashboardPaciente.js
)
git rm -q -f --ignore-unmatch -- "${BORRAR[@]}"

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
echo '  git commit -m "Incremento 3, bloque 1: base, rediseño Punto Paz, navegación y notificaciones y agenda (CU52, CU21, CU19)"'
echo "  git push -u origin $RAMA"
echo
echo "Despues abre el Pull Request en GitHub: base main <- compare $RAMA"
