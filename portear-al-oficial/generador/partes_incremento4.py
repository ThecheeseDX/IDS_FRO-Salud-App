"""Reparto del Incremento 4 en seis bloques, un CU por persona (decisión de
Pablo, 04-11-2026).

El bloque 1 es el bloque por defecto: además del CU51 lleva la base
(migraciones, esquema, servidor, navegación, componentes comunes), los
arreglos y toda la ronda de correcciones del incremento (chat general, GPS
automático, Mi Jornada, pautas con días y material, evaluación por sesión y
tratamiento, perfil del paciente, documentos). Cada uno de los otros bloques
lleva los archivos propios de su CU.

Los bloques se encadenan: cada rama parte de la anterior y los archivos
compartidos viajan completos en el bloque al que se asignan, así que la app
queda funcionando cuando están los seis mezclados, en orden.
"""
FORK_URL = 'https://github.com/ThecheeseDX/IDS_FRO-Salud-App.git'
PREFIJO_RAMA = 'inc4-bloque'

# La documentacion va al repositorio de documentacion. El README y la guia de
# la nube los mantiene el equipo en el oficial; la guia local si viaja.
EXCLUIR = ['portear-al-oficial/', 'documentacion-incremento', 'README.md', 'GUIA-NUBE.md']

B, V = 'fro-controlador/src/', 'fro-vista/src/'

PARTES = [
    dict(n=1, slug='base-correcciones-cu51', autor='souln4me', por_defecto=True,
         titulo='Base del incremento, ronda de correcciones y preparación para el alta (CU51)',
         mensaje='Incremento 4, bloque 1: base, correcciones y preparación para el alta (CU51)',
         rutas=['GUIA-LOCAL.md']
              + [V + x for x in ('screens/Paciente/PreparacionAltaScreen.js', 'screens/Paciente/MiTratamientoScreen.js')]),
    dict(n=2, slug='informe-alta', autor='ThecheeseDX',
         titulo='Informe de alta y cierre del episodio (CU37)',
         mensaje='Incremento 4, bloque 2: informe de alta y cierre del episodio (CU37)',
         rutas=[B + x for x in ('services/clinico/altaService.js', 'controllers/clinico/altaController.js',
                                'controllers/clinico/episodioController.js')]
              + [V + x for x in ('screens/Profesional/InformeAltaScreen.js', 'screens/Profesional/FichaClinica/EpisodioScreen.js')]),
    dict(n=3, slug='refuerzo-positivo', autor='TenienteGnar23',
         titulo='Mensajes de refuerzo positivo (CU54)',
         mensaje='Incremento 4, bloque 3: mensajes de refuerzo positivo (CU54)',
         rutas=[B + x for x in ('services/clinico/refuerzoService.js', 'controllers/notificacionController.js')]
              + [V + x for x in ('screens/Comun/CentroNotificacionesScreen.js',)]),
    dict(n=4, slug='eventos-criticos', autor='baguirrebetancour',
         titulo='Escalamiento de eventos críticos a supervisión (CU62)',
         mensaje='Incremento 4, bloque 4: escalamiento de eventos críticos (CU62)',
         rutas=[B + x for x in ('services/clinico/escalamientoService.js', 'services/clinico/filtroContenidoService.js',
                                'controllers/gestionController.js', 'routes/gestionRoutes.js',
                                'controllers/soporteController.js', 'controllers/clinico/seguimientoController.js')]
              + [V + x for x in ('screens/Admin/EventosCriticosScreen.js', 'screens/Admin/PalabrasRestringidasScreen.js',
                                 'screens/Admin/PanelAdminScreen.js')]),
    dict(n=5, slug='derivaciones-internas', autor='HugoZamoraPardo',
         titulo='Derivaciones internas (CU65)',
         mensaje='Incremento 4, bloque 5: derivaciones internas (CU65)',
         rutas=[B + x for x in ('controllers/clinico/derivacionController.js', 'services/clinico/accesoClinicoService.js',
                                'controllers/profesionalController.js')]
              + [V + x for x in ('screens/Profesional/DerivacionInternaScreen.js', 'screens/Profesional/DerivacionesRecibidasScreen.js',
                                 'screens/Profesional/DashboardProfesional.js', 'screens/Profesional/FichaClinica/FichaClinicaScreen.js')]),
    dict(n=6, slug='contingencia-bonos', autor='Nykolayas-MP',
         titulo='Interfaz de contingencia para bonos (CU72)',
         mensaje='Incremento 4, bloque 6: interfaz de contingencia para bonos (CU72)',
         rutas=[B + x for x in ('services/external/contingenciaService.js', 'controllers/contingenciaController.js',
                                'controllers/pagoController.js', 'routes/pagoRoutes.js')]
              + [V + x for x in ('screens/Comun/ContingenciaBonosScreen.js', 'screens/Paciente/PagosScreen.js',
                                 'screens/Profesional/MiPerfilScreen.js')]),
]
