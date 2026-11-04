# Diagramas de secuencia: Incremento 4

Son 24 diagramas de 16 CU, en el formato legible acordado con Pablo el 04-11-2026:
- 4 o 5 líneas de vida: el actor, la vista, "Servidor" (agrupa C_API_REST y los controladores), "Base de datos" (C_MYSQL) y, cuando corresponde, un servicio externo en la última columna.
- A lo más 16 mensajes por camino.
- Etiquetas cortas.
- Un solo bloque alternativo, sin anidar.

Los errores menores quedan en el texto del CU.

Cada carpeta `CUxx/` trae un `.drawio` con una página por diagrama (se abre en app.diagrams.net) y un PNG por página.

| Grupo | CU | Diagramas |
|---|---|---|
| CU del Incremento 4 | CU37 · CU51 · CU54 | 1 cada uno |
| | CU62 | 2: escalar · acusar recibo |
| | CU65 | 2: derivar · responder |
| | CU72 | 2: registrar · regularizar |
| Rehechos: el flujo anterior ya no existe | CU38 · CU40 · CU41 | 1 cada uno. **Reemplazan** todas las páginas anteriores del CU |
| | CU39 | 2: ubicación del paciente · validar en cada marca. **Reemplazan** las anteriores |
| | CU47 | 2: prescribir · material de apoyo. **Reemplazan** las anteriores |
| | CU53 | 2: mensaje · adjunto. **Reemplazan** las anteriores |
| | CU55 | 2: sesión · tratamiento. **Reemplazan** las anteriores |
| Flujo nuevo: el diagrama anterior sigue vigente | CU09 | 2 nuevos: editar mis datos · foto de perfil |
| | CU35 | 1 nuevo: descargar mi ficha |
| | CU78 | 1 nuevo: cerrar el episodio |

Los demás CU que cambiaron de texto (CU11, CU28, CU30, CU44, CU48, CU49, CU56, CU57, CU58, CU66 y CU71) conservan sus diagramas, porque los pasos son los mismos.

Para regenerarlos: `python3 generador/diagramas_inc4.py`. Con `--sin-png` solo valida. El motor (`generador/motor_legible.py`) no dibuja nada si un diagrama rompe alguna regla.
