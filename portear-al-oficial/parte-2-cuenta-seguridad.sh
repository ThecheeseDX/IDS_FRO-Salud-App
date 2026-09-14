#!/bin/bash
# Parte 2 — Cuenta, seguridad y acceso por rol
#
# Ejecutar dentro de un clon del repositorio OFICIAL (souln4me/IDS_FRO-Salud-App).
# El script deja los archivos preparados y NO hace el commit: ese lo haces tú,
# con tu propia cuenta, para que quede a tu nombre en el historial.
set -e

RAMA="parte-2-cuenta-seguridad"
BASE_SUGERIDA="origin/parte-1-base"
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
  'documentacion-incremento2/diagramas-secuencia/CU06/CU06-Excepción 1 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU06/CU06-Excepción 1 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU06/CU06-Excepción 1 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU06/CU06-Excepción 2 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU06/CU06-Excepción 2 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU06/CU06-Excepción 2 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU06/CU06-Excepción 3 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU06/CU06-Excepción 3 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU06/CU06-Excepción 3 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU06/CU06-Excepción 4 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU06/CU06-Excepción 4 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU06/CU06-Excepción 4 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU06/CU06-Principal Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU06/CU06-Principal Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU06/CU06-Principal Profesional.png'
  documentacion-incremento2/diagramas-secuencia/CU06/CU06.drawio
  'documentacion-incremento2/diagramas-secuencia/CU07/CU07-Excepción 1 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU07/CU07-Excepción 1 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU07/CU07-Excepción 1 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU07/CU07-Excepción 2 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU07/CU07-Excepción 2 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU07/CU07-Excepción 2 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU07/CU07-Excepción 3 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU07/CU07-Excepción 3 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU07/CU07-Excepción 3 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU07/CU07-Excepción 4 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU07/CU07-Excepción 4 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU07/CU07-Excepción 4 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU07/CU07-Principal Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU07/CU07-Principal Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU07/CU07-Principal Profesional.png'
  documentacion-incremento2/diagramas-secuencia/CU07/CU07.drawio
  'documentacion-incremento2/diagramas-secuencia/CU08/CU08-Excepción 1 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU08/CU08-Excepción 1 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU08/CU08-Excepción 1 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU08/CU08-Excepción 2 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU08/CU08-Excepción 2 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU08/CU08-Excepción 2 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU08/CU08-Excepción 3 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU08/CU08-Excepción 3 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU08/CU08-Excepción 3 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU08/CU08-Excepción 4 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU08/CU08-Excepción 4 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU08/CU08-Excepción 4 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU08/CU08-Principal Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU08/CU08-Principal Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU08/CU08-Principal Profesional.png'
  documentacion-incremento2/diagramas-secuencia/CU08/CU08.drawio
  'documentacion-incremento2/diagramas-secuencia/CU09/CU09-Excepción 1.png'
  'documentacion-incremento2/diagramas-secuencia/CU09/CU09-Excepción 2.png'
  'documentacion-incremento2/diagramas-secuencia/CU09/CU09-Excepción 3.png'
  'documentacion-incremento2/diagramas-secuencia/CU09/CU09-Excepción 4.png'
  documentacion-incremento2/diagramas-secuencia/CU09/CU09-Principal.png
  documentacion-incremento2/diagramas-secuencia/CU09/CU09.drawio
  'documentacion-incremento2/diagramas-secuencia/CU10/CU10-Excepción 1.png'
  'documentacion-incremento2/diagramas-secuencia/CU10/CU10-Excepción 2.png'
  'documentacion-incremento2/diagramas-secuencia/CU10/CU10-Excepción 3.png'
  'documentacion-incremento2/diagramas-secuencia/CU10/CU10-Excepción 4.png'
  'documentacion-incremento2/diagramas-secuencia/CU10/CU10-Excepción 5.png'
  'documentacion-incremento2/diagramas-secuencia/CU10/CU10-Excepción 6.png'
  documentacion-incremento2/diagramas-secuencia/CU10/CU10-Principal.png
  documentacion-incremento2/diagramas-secuencia/CU10/CU10.drawio
  'documentacion-incremento2/diagramas-secuencia/CU79/CU79-Excepción 1 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU79/CU79-Excepción 1 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU79/CU79-Excepción 1 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU79/CU79-Excepción 2 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU79/CU79-Excepción 2 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU79/CU79-Excepción 2 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU79/CU79-Excepción 3 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU79/CU79-Excepción 3 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU79/CU79-Excepción 3 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU79/CU79-Excepción 4 Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU79/CU79-Excepción 4 Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU79/CU79-Excepción 4 Profesional.png'
  'documentacion-incremento2/diagramas-secuencia/CU79/CU79-Principal Administrador.png'
  'documentacion-incremento2/diagramas-secuencia/CU79/CU79-Principal Paciente.png'
  'documentacion-incremento2/diagramas-secuencia/CU79/CU79-Principal Profesional.png'
  documentacion-incremento2/diagramas-secuencia/CU79/CU79.drawio
  fro-controlador/src/controllers/authController.js
  fro-controlador/src/middlewares/auditarAcceso.js
  fro-controlador/src/middlewares/authMiddleware.js
  fro-controlador/src/middlewares/roleMiddleware.js
  fro-controlador/src/routes/authRoutes.js
  fro-controlador/src/services/auth/seguridadService.js
  fro-controlador/src/services/notifications/otpService.js
  fro-vista/src/components/CambioContrasenaOTP.js
  fro-vista/src/components/CodigoOTP.js
  fro-vista/src/screens/Auth/LoginScreen.js
  fro-vista/src/screens/Auth/OTPScreen.js
  fro-vista/src/screens/Auth/RecuperarContrasenaScreen.js
  fro-vista/src/screens/Auth/RegisterScreen.js
  fro-vista/src/screens/Comun/SeguridadScreen.js
  fro-vista/src/utils/contrasena.js
)

git checkout fork/main -- "${TRAER[@]}"

BORRAR=(
  fro-controlador/src/middlewares/AuditarAcceso.js
  fro-vista/src/screens/LoginScreen.js
  fro-vista/src/screens/RegisterScreen.js
)

git rm -q -f --ignore-unmatch -- "${BORRAR[@]}"

echo
echo "Archivos preparados:"
git status --short | head -20
echo "   ... (total: $(git status --porcelain | wc -l | tr -d ' ') archivos)"
echo
echo "Ahora haz TU commit y sube la rama:"
echo
echo '  git commit -m "Cuenta y seguridad: recuperación y cambio de contraseña con código, se..."'
echo "  git push -u origin $RAMA"
echo
echo "Después abre el Pull Request en GitHub: base main <- compare $RAMA"
