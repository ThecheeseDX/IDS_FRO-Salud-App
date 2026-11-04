# Diagramas de secuencia: Incremento 4

Son **98 páginas de 16 CU** en el mismo formato y con las mismas reglas del Incremento 3:
- todos los componentes y las tablas como líneas de vida;
- mensajes técnicos, con el SQL sin `?` ni `WHERE`;
- ningún mensaje se salta una línea de vida y cada llamada vuelve por el mismo camino;
- una página por excepción, que retoma el flujo principal;
- páginas separadas por actor cuando el CU tiene más de uno.

**Para que se lean bien, se resume lo menos importante** (formato aprobado por Pablo con el diagrama de prueba del CU65, 04-11-2026):
- las tablas no son líneas de vida: el mensaje a `C_MYSQL` nombra la operación y las tablas (por ejemplo `SELECT Episodio_Clinico, Profesional`);
- cada ida a la base es un solo viaje, y varias consultas seguidas del mismo componente se juntan en uno;
- BEGIN, COMMIT y ROLLBACK van en una nota amarilla;
- las rutas HTTP llevan un nombre que se entiende solo: `GET opciones_de_derivacion(episodio_id)` en vez de `GET /clinica/episodio/:id/derivaciones/opciones`;
- cada página de excepción parte en la última acción del actor antes de la excepción ("los pasos anteriores son los del flujo principal") y retoma el flujo hasta el final;
- letra de 20 puntos, cajas más grandes y los textos largos partidos en renglones para que el diagrama no se ensanche.

Cada carpeta trae un `.drawio` con una página por diagrama (se abre en app.diagrams.net) y un PNG por página.

| Grupo | CU | Páginas |
|---|---|---|
| CU del Incremento 4 | CU37 · CU51 · CU54 · CU47 | 5 cada uno |
| | CU62 (Paciente que dispara + Administrador) | 7 |
| | CU65 (Profesional que deriva + Profesional que recibe) | 7 |
| | CU72 (Profesional + Administrador, cada excepción para ambos) | 10 |
| Rehechos: reemplazan **todas** las páginas anteriores del CU | CU38 · CU40 | 5 cada uno |
| | CU39 · CU41 (dos actores, cada excepción para ambos) | 10 cada uno |
| | CU53 (Paciente y Profesional) | 10 |
| | CU55 | 5 |
| Flujo nuevo: se suman a los diagramas que ya tiene el CU | CU09 (datos y foto) | 4 |
| | CU35 (descarga de la ficha) | 2 |
| | CU78 (cierre del episodio) | 3 |

En los CU del flujo nuevo solo van las excepciones de la ficha que aplican a ese flujo; los comentarios de cada tanda dicen cuáles.

Los demás CU que cambiaron de texto (CU11, CU28, CU30, CU44, CU48, CU49, CU56, CU57, CU58, CU66 y CU71) conservan sus diagramas, porque los pasos son los mismos.

**Para regenerarlos:** `python3 generador/tandaA.py` (lo mismo con `tandaB` y `tandaC`). Con `--sin-png` solo valida.

El motor es el del Incremento 3 con el tamaño ajustado. El resumen lo aplica `generador/resumen.py` sobre cada página, sin tocar las definiciones de las tandas. `comun.py` suma los componentes nuevos del diagrama de componentes del Incremento 4.
