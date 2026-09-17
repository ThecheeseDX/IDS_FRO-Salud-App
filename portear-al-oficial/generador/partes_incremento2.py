"""Reparto del Incremento 2 en seis partes.

Sirve de referencia y de prueba de regresion del generador. Para el
Incremento 3 se copia este archivo como partes_incremento3.py y se ajustan
las rutas de cada parte.
"""
FORK_URL = 'https://github.com/ThecheeseDX/IDS_FRO-Salud-App.git'

# La documentacion se entrega en el repositorio de documentacion, no en el oficial.
EXCLUIR = ['portear-al-oficial/', 'documentacion-incremento']

B, V = 'fro-controlador/src/', 'fro-vista/src/'

PARTES = [
    dict(n=1, slug='base', por_defecto=True, titulo='Base, reestructuracion y despliegue',
         mensaje='Base del Incremento 2: base de datos, configuracion, tema, navegacion y despliegue'),
    dict(n=2, slug='cuenta-seguridad', titulo='Cuenta, seguridad y acceso por rol',
         mensaje='Cuenta y seguridad del Incremento 2',
         rutas=[B + x for x in ('controllers/authController.js', 'routes/authRoutes.js', 'services/auth/seguridadService.js',
                                'services/notifications/otpService.js', 'middlewares/authMiddleware.js',
                                'middlewares/roleMiddleware.js', 'middlewares/auditarAcceso.js', 'middlewares/AuditarAcceso.js')]
              + [V + x for x in ('screens/Comun/SeguridadScreen.js', 'components/CodigoOTP.js', 'components/CambioContrasenaOTP.js',
                                 'utils/contrasena.js', 'screens/RegisterScreen.js', 'screens/LoginScreen.js')],
         prefijos=[V + 'screens/Auth/']),
    dict(n=3, slug='agenda-citas', titulo='Agenda y gestion de citas', mensaje='Agenda y citas del Incremento 2',
         rutas=[B + x for x in ('controllers/citaController.js', 'controllers/CitaController.js', 'routes/citaRoutes.js',
                                'routes/CitaRoutes.js', 'services/agenda/agendaService.js', 'controllers/disponibilidadController.js',
                                'controllers/marcasTemporalesController.js', 'controllers/profesionalController.js',
                                'routes/profesionalRoutes.js')]
              + [V + x for x in ('screens/Paciente/MisCitasScreen.js', 'screens/Paciente/BuscarCitaScreen.js',
                                 'screens/Paciente/DashboardPaciente.js', 'screens/Paciente/AgendamientoScreen.js',
                                 'screens/Profesional/MiJornadaScreen.js', 'screens/Profesional/MiPerfilScreen.js',
                                 'screens/Profesional/GestionDisponibilidadScreen.js', 'screens/Profesional/DashboardProfesional.js',
                                 'screens/Profesional/PacientesAsignadosScreen.js', 'screens/Profesional/MarcasTemporalesScreen.js',
                                 'components/BarraAtencionEnCurso.js', 'components/EtiquetaEstado.js',
                                 'components/DialogoMotivo.js', 'utils/estados.js')]),
    dict(n=4, slug='ficha-triaje', titulo='Ficha clinica, triaje y episodio', mensaje='Ficha clinica y triaje del Incremento 2',
         rutas=[B + x for x in ('controllers/clinico/triajeController.js', 'controllers/clinico/fichaClinicaController.js',
                                'controllers/fichaClinicaController.js', 'controllers/clinico/episodioController.js',
                                'controllers/EpisodioController.js', 'controllers/clinico/evolucionController.js',
                                'controllers/evolucionController.js', 'controllers/clinico/intervencionController.js',
                                'controllers/intervencionController.js', 'controllers/clinico/objetivoController.js',
                                'controllers/objetivoController.js', 'services/clinico/episodioService.js',
                                'services/clinico/triajeService.js', 'routes/clinicaRoutes.js', 'routes/ClinicaRoutes.js',
                                'controllers/inalterabilidadController.js', 'controllers/InalterabilidadController.js',
                                'routes/inalterabilidadRoutes.js', 'routes/InalterabilidadRoutes.js')]
              + [V + x for x in ('screens/Paciente/TriajeScreen.js', 'screens/Profesional/FichaClinica/FichaClinicaScreen.js',
                                 'screens/Profesional/FichaClinica/AnamnesisScreen.js', 'screens/Profesional/FichaClinica/EpisodioScreen.js',
                                 'screens/Profesional/FichaClinica/HistorialPacienteScreen.js',
                                 'screens/Profesional/FichaClinica/SesionClinicaScreen.js', 'screens/Profesional/AnamnesisScreen.js',
                                 'screens/Profesional/EpisodioScreen.js', 'screens/Profesional/EvolucionClinicaScreen.js',
                                 'screens/Profesional/HistorialPacienteScreen.js', 'screens/Profesional/InalterabilidadScreen.js',
                                 'screens/Profesional/IntervencionScreen.js', 'components/TabSelector.js')]),
    dict(n=5, slug='pautas-documentos-evidencia', titulo='Pautas, documentos y evidencia de atencion',
         mensaje='Pautas, documentos y evidencia del Incremento 2',
         rutas=[B + x for x in ('controllers/clinico/pautaController.js', 'controllers/clinico/documentoController.js',
                                'controllers/clinico/versionController.js', 'controllers/evidenciaController.js', 'config/cloudinary.js')]
              + [V + x for x in ('screens/Paciente/MisPautasScreen.js', 'screens/Profesional/FichaClinica/PautasScreen.js',
                                 'screens/Comun/DocumentosScreen.js', 'screens/Comun/VisorDocumentoScreen.js',
                                 'screens/Comun/EvidenciaSesionScreen.js', 'screens/Profesional/FirmaConformidadScreen.js',
                                 'components/LienzoFirma.js', 'utils/dispositivo.js')]),
    dict(n=6, slug='pagos-administracion', titulo='Pagos, integracion externa y administracion',
         mensaje='Pagos y administracion del Incremento 2',
         rutas=[B + x for x in ('controllers/pagoController.js', 'routes/pagoRoutes.js', 'services/external/providerAdapter.js',
                                'utils/externalHttpClient.js', 'validators/externalSchemas.js', 'utils/dataMappers.js',
                                'controllers/parametroController.js', 'controllers/integracionDemoController.js')]
              + [V + x for x in ('screens/Paciente/PagosScreen.js', 'screens/Admin/ParametrosScreen.js',
                                 'screens/Admin/SesionesSuspendidasScreen.js')]),
]
