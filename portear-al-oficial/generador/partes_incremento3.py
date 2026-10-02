"""Reparto del Incremento 3 en siete bloques, en el orden en que se construyó.

Lo que no era del Incremento 3 (rediseño Punto Paz, barras de navegación
inferior, ajustes tras las pruebas) va con el bloque cuyo tema toca; lo
transversal (base de datos, configuración, navegación, tema y componentes
comunes) va al bloque 1, que es el bloque por defecto.

Los bloques se encadenan: cada rama parte de la anterior. Los archivos
compartidos viajan completos en el bloque al que se asignan, así que la app
queda funcionando cuando están los siete mezclados, en orden.
"""
FORK_URL = 'https://github.com/ThecheeseDX/IDS_FRO-Salud-App.git'
PREFIJO_RAMA = 'bloque'

# La documentacion va al repositorio de documentacion. El README y la guia de
# la nube no se tocan: el equipo ya actualizo el README del oficial.
EXCLUIR = ['portear-al-oficial/', 'documentacion-incremento', 'README.md', 'GUIA-NUBE.md']

B, V = 'fro-controlador/src/', 'fro-vista/src/'

PARTES = [
    dict(n=1, slug='notificaciones-agenda', autor='souln4me', por_defecto=True,
         titulo='Base, rediseño Punto Paz, navegación inferior y notificaciones y agenda (CU52, CU21, CU19)',
         mensaje='Incremento 3, bloque 1: base, rediseño Punto Paz, navegación y notificaciones y agenda (CU52, CU21, CU19)',
         rutas=[B + x for x in ('services/notifications/despachador.js', 'controllers/notificacionController.js',
                                'routes/notificacionRoutes.js', 'services/agenda/programador.js',
                                'services/agenda/agendaService.js', 'services/agenda/confirmacionService.js',
                                'controllers/confirmacionController.js', 'controllers/listaEsperaController.js',
                                'controllers/citaController.js', 'routes/citaRoutes.js',
                                'controllers/disponibilidadController.js', 'controllers/marcasTemporalesController.js')]
              + [V + x for x in ('screens/Comun/CentroNotificacionesScreen.js', 'components/CampanaNotificaciones.js',
                                 'utils/push.js', 'screens/Paciente/MisCitasScreen.js', 'screens/Paciente/BuscarCitaScreen.js',
                                 'screens/Paciente/DashboardPaciente.js', 'screens/Profesional/MiJornadaScreen.js',
                                 'screens/Profesional/GestionDisponibilidadScreen.js', 'screens/Profesional/MisHorariosScreen.js',
                                 'components/EditorBloqueHorario.js', 'components/BarraAtencionEnCurso.js',
                                 'components/SeccionHistorial.js')]),
    dict(n=2, slug='triaje-banderas-rojas', autor='ThecheeseDX',
         titulo='Triaje inteligente y banderas rojas (CU25, CU26, CU50)',
         mensaje='Incremento 3, bloque 2: triaje inteligente y banderas rojas (CU25, CU26, CU50)',
         rutas=[B + x for x in ('services/clinico/preclinicoService.js', 'services/clinico/alertaClinicaService.js',
                                'controllers/clinico/seguimientoController.js', 'controllers/clinico/triajeController.js',
                                'services/clinico/triajeService.js', 'routes/clinicaRoutes.js')]
              + [V + x for x in ('screens/Paciente/TriajeScreen.js', 'screens/Paciente/MiSeguimientoScreen.js',
                                 'screens/Paciente/MiTratamientoScreen.js', 'screens/Profesional/DashboardProfesional.js',
                                 'screens/Profesional/FichaClinica/HistorialPacienteScreen.js')]),
    dict(n=3, slug='adherencia-progreso', autor='TenienteGnar23',
         titulo='Adherencia y progreso (CU44, CU45)',
         mensaje='Incremento 3, bloque 3: adherencia y progreso (CU44, CU45)',
         rutas=[B + x for x in ('services/clinico/adherenciaService.js', 'controllers/clinico/pautaController.js')]
              + [V + x for x in ('screens/Paciente/MiProgresoScreen.js', 'screens/Paciente/MisPautasScreen.js',
                                 'components/GraficoLinea.js')]),
    dict(n=4, slug='mensajeria-filtro', autor='baguirrebetancour',
         titulo='Mensajería clínica y filtro de contenido (CU53, CU57)',
         mensaje='Incremento 3, bloque 4: mensajería clínica y filtro de contenido (CU53, CU57)',
         rutas=[B + x for x in ('controllers/clinico/chatController.js', 'services/clinico/cifradoService.js',
                                'services/clinico/filtroContenidoService.js')]
              + [V + x for x in ('screens/Comun/ChatClinicoScreen.js', 'screens/Comun/ConversacionesScreen.js',
                                 'screens/Admin/PalabrasRestringidasScreen.js', 'utils/useEspacioInferior.js')]),
    dict(n=5, slug='calidad-servicio', autor='baguirrebetancour',
         titulo='Calidad del servicio y perfil público (CU55, CU56, CU58)',
         mensaje='Incremento 3, bloque 5: calidad del servicio y perfil público (CU55, CU56, CU58)',
         rutas=[B + x for x in ('controllers/evaluacionController.js', 'routes/evaluacionRoutes.js',
                                'controllers/profesionalController.js', 'routes/profesionalRoutes.js')]
              + [V + x for x in ('components/DialogoEvaluacion.js', 'screens/Paciente/ResenasProfesionalScreen.js',
                                 'screens/Paciente/PerfilProfesionalScreen.js', 'screens/Admin/ModeracionResenasScreen.js',
                                 'screens/Profesional/MiPerfilScreen.js')]),
    dict(n=6, slug='soporte-gestion', autor='HugoZamoraPardo',
         titulo='Soporte y panel de gestión (CU60, CU61, CU63, CU64)',
         mensaje='Incremento 3, bloque 6: soporte y panel de gestión (CU60, CU61, CU63, CU64)',
         rutas=[B + x for x in ('controllers/soporteController.js', 'routes/soporteRoutes.js',
                                'controllers/gestionController.js', 'routes/gestionRoutes.js')]
              + [V + x for x in ('screens/Comun/SoporteScreen.js', 'screens/Admin/BandejaSoporteScreen.js',
                                 'screens/Admin/PanelAdminScreen.js', 'screens/Admin/ReportesScreen.js')]),
    dict(n=7, slug='finanzas', autor='Nykolayas-MP',
         titulo='Finanzas (CU73, CU74, CU75)',
         mensaje='Incremento 3, bloque 7: finanzas (CU73, CU74, CU75)',
         rutas=[B + x for x in ('controllers/finanzasController.js', 'routes/finanzasRoutes.js', 'controllers/pagoController.js')]
              + [V + x for x in ('screens/Paciente/PagarReservaScreen.js', 'screens/Paciente/PagosScreen.js',
                                 'screens/Admin/LiquidacionesScreen.js', 'screens/Profesional/MisLiquidacionesScreen.js')]),
]
