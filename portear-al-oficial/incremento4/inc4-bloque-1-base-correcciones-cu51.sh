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
  fro-controlador/scripts/cu12_tokens.js
  fro-controlador/scripts/cu68_demo.js
  fro-controlador/scripts/cu70_demo.js
  fro-controlador/scripts/importar-schema.js
  fro-controlador/scripts/migrar-db.js
  fro-controlador/scripts/validar-schema.js
  fro-controlador/server.js
  fro-controlador/src/app.js
  fro-controlador/src/componentes/C_API_Adapter.js
  fro-controlador/src/componentes/C_API_REST.js
  fro-controlador/src/componentes/C_Capa_de_Acceso_a_Datos.js
  fro-controlador/src/componentes/C_Cifrado_Mensajeria.js
  fro-controlador/src/componentes/C_Control_Acceso_Clinico.js
  fro-controlador/src/componentes/C_Despachador_Notificaciones.js
  fro-controlador/src/componentes/C_Escalador_Eventos_Criticos.js
  fro-controlador/src/componentes/C_Filtro_Contenido.js
  fro-controlador/src/componentes/C_Generador_Informes.js
  fro-controlador/src/componentes/C_Gestor_Alta_Clinica.js
  fro-controlador/src/componentes/C_Gestor_Contingencia.js
  fro-controlador/src/componentes/C_Motor_Agendamiento.js
  fro-controlador/src/componentes/C_Motor_Clinico.js
  fro-controlador/src/componentes/C_Motor_Refuerzos.js
  fro-controlador/src/componentes/C_Programador_Agenda.js
  fro-controlador/src/componentes/C_Seguridad_JWT_BCrypt.js
  fro-controlador/src/componentes/C_Validador_Presencialidad.js
  fro-controlador/src/config/cloudinary.js
  fro-controlador/src/config/database.js
  fro-controlador/src/config/dbOptions.js
  fro-controlador/src/controllers/authController.js
  fro-controlador/src/controllers/citaController.js
  fro-controlador/src/controllers/clinico/chatController.js
  fro-controlador/src/controllers/clinico/documentoController.js
  fro-controlador/src/controllers/clinico/evolucionController.js
  fro-controlador/src/controllers/clinico/fichaClinicaController.js
  fro-controlador/src/controllers/clinico/intervencionController.js
  fro-controlador/src/controllers/clinico/objetivoController.js
  fro-controlador/src/controllers/clinico/pautaController.js
  fro-controlador/src/controllers/clinico/triajeController.js
  fro-controlador/src/controllers/clinico/versionController.js
  fro-controlador/src/controllers/comunaController.js
  fro-controlador/src/controllers/confirmacionController.js
  fro-controlador/src/controllers/disponibilidadController.js
  fro-controlador/src/controllers/evaluacionController.js
  fro-controlador/src/controllers/evidenciaController.js
  fro-controlador/src/controllers/finanzasController.js
  fro-controlador/src/controllers/inalterabilidadController.js
  fro-controlador/src/controllers/integracionDemoController.js
  fro-controlador/src/controllers/listaEsperaController.js
  fro-controlador/src/controllers/marcasTemporalesController.js
  fro-controlador/src/controllers/parametroController.js
  fro-controlador/src/controllers/perfilPacienteController.js
  fro-controlador/src/database/mysql/iniciar-db-local.js
  fro-controlador/src/database/mysql/schema.sql
  fro-controlador/src/middlewares/auditarAcceso.js
  fro-controlador/src/middlewares/authMiddleware.js
  fro-controlador/src/middlewares/roleMiddleware.js
  fro-controlador/src/models/parametroModel.js
  fro-controlador/src/models/transactionAuditModel.js
  fro-controlador/src/models/userModel.js
  fro-controlador/src/routes/authRoutes.js
  fro-controlador/src/routes/citaRoutes.js
  fro-controlador/src/routes/clinicaRoutes.js
  fro-controlador/src/routes/evaluacionRoutes.js
  fro-controlador/src/routes/finanzasRoutes.js
  fro-controlador/src/routes/inalterabilidadRoutes.js
  fro-controlador/src/routes/integracionDemoRoutes.js
  fro-controlador/src/routes/notificacionRoutes.js
  fro-controlador/src/routes/parametroRoutes.js
  fro-controlador/src/routes/profesionalRoutes.js
  fro-controlador/src/routes/soporteRoutes.js
  fro-controlador/src/services/agenda/agendaService.js
  fro-controlador/src/services/agenda/confirmacionService.js
  fro-controlador/src/services/agenda/presencialidadService.js
  fro-controlador/src/services/agenda/programador.js
  fro-controlador/src/services/audit/transactionAuditService.js
  fro-controlador/src/services/auth/seguridadService.js
  fro-controlador/src/services/clinico/adherenciaService.js
  fro-controlador/src/services/clinico/alertaClinicaService.js
  fro-controlador/src/services/clinico/cifradoService.js
  fro-controlador/src/services/clinico/episodioService.js
  fro-controlador/src/services/clinico/fichaPdfService.js
  fro-controlador/src/services/clinico/preclinicoService.js
  fro-controlador/src/services/clinico/triajeService.js
  fro-controlador/src/services/external/providerAdapter.js
  fro-controlador/src/services/informes/exportadorInformes.js
  fro-controlador/src/services/notifications/despachador.js
  fro-controlador/src/services/notifications/otpService.js
  fro-controlador/src/utils/dataMappers.js
  fro-controlador/src/utils/encriptar_bcrypt.js
  fro-controlador/src/utils/externalHttpClient.js
  fro-controlador/src/utils/retryState.js
  fro-controlador/src/validators/externalSchemas.js
  fro-vista/App.js
  fro-vista/src/api/client.js
  fro-vista/src/components/AdjuntarMaterial.js
  fro-vista/src/components/AdjuntoChat.js
  fro-vista/src/components/Avatar.js
  fro-vista/src/components/BarraAtencionEnCurso.js
  fro-vista/src/components/CalendarioMensual.js
  fro-vista/src/components/CambioContrasenaOTP.js
  fro-vista/src/components/CampanaNotificaciones.js
  fro-vista/src/components/CampoContrasena.js
  fro-vista/src/components/CodigoOTP.js
  fro-vista/src/components/DialogoAviso.js
  fro-vista/src/components/DialogoConfirmacion.js
  fro-vista/src/components/DialogoEvaluacion.js
  fro-vista/src/components/DialogoMotivo.js
  fro-vista/src/components/EditorBloqueHorario.js
  fro-vista/src/components/EncabezadoPerfilPaciente.js
  fro-vista/src/components/ErrorRetry.js
  fro-vista/src/components/EtiquetaEstado.js
  fro-vista/src/components/EtiquetaEvaluacion.js
  fro-vista/src/components/GraficoLinea.js
  fro-vista/src/components/Icono.js
  fro-vista/src/components/LienzoFirma.js
  fro-vista/src/components/LogoMarca.js
  fro-vista/src/components/MaterialApoyo.js
  fro-vista/src/components/PendientesDocumentar.js
  fro-vista/src/components/RequisitosContrasena.js
  fro-vista/src/components/SeccionHistorial.js
  fro-vista/src/components/SelectorDiasSemana.js
  fro-vista/src/components/SelectorFechaRapido.js
  fro-vista/src/components/TabSelector.js
  fro-vista/src/components/VistaConTeclado.js
  fro-vista/src/context/AuthContext.js
  fro-vista/src/navigation/AppNavigator.js
  fro-vista/src/navigation/PestanasPaciente.js
  fro-vista/src/navigation/PestanasProfesional.js
  fro-vista/src/navigation/barraInferior.js
  fro-vista/src/navigation/rutasBarra.js
  fro-vista/src/screens/Admin/BandejaSoporteScreen.js
  fro-vista/src/screens/Admin/LiquidacionesScreen.js
  fro-vista/src/screens/Admin/ModeracionResenasScreen.js
  fro-vista/src/screens/Admin/ParametrosScreen.js
  fro-vista/src/screens/Admin/ReportesScreen.js
  fro-vista/src/screens/Admin/SesionesSuspendidasScreen.js
  fro-vista/src/screens/Auth/LoginScreen.js
  fro-vista/src/screens/Auth/OTPScreen.js
  fro-vista/src/screens/Auth/RecuperarContrasenaScreen.js
  fro-vista/src/screens/Auth/RegisterScreen.js
  fro-vista/src/screens/Comun/ChatClinicoScreen.js
  fro-vista/src/screens/Comun/ConversacionesScreen.js
  fro-vista/src/screens/Comun/DocumentosScreen.js
  fro-vista/src/screens/Comun/EvidenciaSesionScreen.js
  fro-vista/src/screens/Comun/SeguridadScreen.js
  fro-vista/src/screens/Comun/SoporteScreen.js
  fro-vista/src/screens/Comun/VisorDocumentoScreen.js
  fro-vista/src/screens/Paciente/BuscarCitaScreen.js
  fro-vista/src/screens/Paciente/MiProgresoScreen.js
  fro-vista/src/screens/Paciente/MiSeguimientoScreen.js
  fro-vista/src/screens/Paciente/MiTratamientoScreen.js
  fro-vista/src/screens/Paciente/MisCitasScreen.js
  fro-vista/src/screens/Paciente/MisDatosScreen.js
  fro-vista/src/screens/Paciente/MisPautasScreen.js
  fro-vista/src/screens/Paciente/PagarReservaScreen.js
  fro-vista/src/screens/Paciente/PerfilProfesionalScreen.js
  fro-vista/src/screens/Paciente/PreparacionAltaScreen.js
  fro-vista/src/screens/Paciente/ResenasProfesionalScreen.js
  fro-vista/src/screens/Paciente/TriajeScreen.js
  fro-vista/src/screens/Profesional/FichaClinica/AnamnesisScreen.js
  fro-vista/src/screens/Profesional/FichaClinica/HistorialPacienteScreen.js
  fro-vista/src/screens/Profesional/FichaClinica/PautasScreen.js
  fro-vista/src/screens/Profesional/FichaClinica/SesionClinicaScreen.js
  fro-vista/src/screens/Profesional/FirmaConformidadScreen.js
  fro-vista/src/screens/Profesional/GestionDisponibilidadScreen.js
  fro-vista/src/screens/Profesional/MiJornadaScreen.js
  fro-vista/src/screens/Profesional/MisHorariosScreen.js
  fro-vista/src/screens/Profesional/MisLiquidacionesScreen.js
  fro-vista/src/theme/index.js
  fro-vista/src/utils/contrasena.js
  fro-vista/src/utils/dispositivo.js
  fro-vista/src/utils/estados.js
  fro-vista/src/utils/fechas.js
  fro-vista/src/utils/modalidad.js
  fro-vista/src/utils/push.js
  fro-vista/src/utils/texto.js
  fro-vista/src/utils/ubicacion.js
  fro-vista/src/utils/useEspacioInferior.js
  fro-vista/src/utils/useReporteUbicacion.js
  fro-vista/src/utils/validators.js
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
