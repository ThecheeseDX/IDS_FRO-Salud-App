# Diagramas de secuencia: Incremento 4

Son **85 páginas de 16 CU** en el mismo formato y con las mismas reglas del Incremento 3:
- todos los componentes y las tablas como líneas de vida;
- mensajes técnicos, con el SQL sin `?` ni `WHERE`;
- ningún mensaje se salta una línea de vida y cada llamada vuelve por el mismo camino;
- una página por excepción, que retoma el flujo principal;
- páginas separadas por actor cuando el CU tiene más de uno.

**Lo único que cambia es el tamaño, para que se lean mejor** (pedido de Pablo, 04-11-2026):
- letra de 17 puntos (antes 12);
- cajas, flechas, barras de activación y notas más grandes;
- más espacio entre mensajes;
- separación entre líneas de vida calculada para que ningún texto se salga de su tramo.

Cada carpeta trae un `.drawio` con una página por diagrama (se abre en app.diagrams.net) y un PNG por página.

| Grupo | CU | Páginas |
|---|---|---|
| CU del Incremento 4 | CU37 · CU51 · CU54 · CU47 | 5 cada uno |
| | CU62 (Paciente que dispara + Administrador) | 6 |
| | CU65 (Profesional que deriva + Profesional que recibe) | 7 |
| | CU72 (Profesional + Administrador) | 6 |
| Rehechos: reemplazan **todas** las páginas anteriores del CU | CU38 · CU40 | 5 cada uno |
| | CU39 · CU41 (dos actores) | 6 cada uno |
| | CU53 (Paciente y Profesional) | 10 |
| | CU55 | 5 |
| Flujo nuevo: se suman a los diagramas que ya tiene el CU | CU09 (datos y foto) | 4 |
| | CU35 (descarga de la ficha) | 2 |
| | CU78 (cierre del episodio) | 3 |

En los CU del flujo nuevo solo van las excepciones de la ficha que aplican a ese flujo; los comentarios de cada tanda dicen cuáles.

Los demás CU que cambiaron de texto (CU11, CU28, CU30, CU44, CU48, CU49, CU56, CU57, CU58, CU66 y CU71) conservan sus diagramas, porque los pasos son los mismos.

**Para regenerarlos:** `python3 generador/tandaA.py` (lo mismo con `tandaB` y `tandaC`). Con `--sin-png` solo valida.

El motor es el del Incremento 3 con el tamaño ajustado. `comun.py` suma los componentes nuevos del diagrama de componentes del Incremento 4.
