# Documentación del Incremento 3

Material de apoyo para actualizar el informe del repositorio `IDS_Documentacion_Grupo17`.
No es código: son los entregables de la revisión que comparó lo que dice la
documentación (Documento 0, Incremento 1 e Incremento 2) con lo que hace la
aplicación tras el Incremento 3.

Código de referencia: commit `4e01994b` (26-09-2026).

## Paso 2 — Reporte de brechas (hecho)

| Archivo | Qué contiene |
|---|---|
| `reporte-brechas-inc3.html` | Reporte completo: caso de uso por caso de uso (actor, qué cambió, dónde vive), cambios posteriores al Inc 2 que tocan fichas anteriores, y base de datos: tablas y atributos nuevos, parámetros globales, cómo reflejarlo en el MERE, MR y normalización 1FN→2FN→3FN completas con los cambios marcados, y modelo físico con tipos. Se abre con doble clic en cualquier navegador. |
| `CU-corregidos-Incremento3.txt` | Las 20 fichas de caso de uso corregidas (CU19, 21, 25, 26, 44, 45, 50, 52, 53, 55, 56, 57, 58, 60, 61, 63, 64, 73, 74, 75), en el formato exacto del informe, listas para copiar y pegar. |
| `generar_reporte.py` | Script que genera el HTML. Las cuatro listas del modelo relacional salen de una sola fuente de datos; si cambia una tabla, se edita ahí y se vuelve a correr. |

Decisión **[D1]** (CU21 vs. CU73) tomada: opción A, aplicada en el código; ver la caja al inicio del reporte.

## Paso 3 — Árbol de navegación (hecho, carpeta `arbol-navegacion/`)

| Archivo | Qué contiene |
|---|---|
| `Arbol de Navegacion Inc3.png` | Figura en alta resolución (7525 × 2146), mismo estilo del Incremento 2 (celeste = interfaces, morado = funcionalidades). |
| `Arbol de Navegacion Inc3.drawio` | Fuente editable en draw.io (app.diagrams.net). |
| `arbol.svg` | Misma figura en vectores. |
| `Arbol de Navegacion Inc3 - tabla de vistas.md` | Texto de la sección y tabla Vista → CUs → Funcionalidad, con qué es nuevo respecto al Incremento 2. |
| `generar_arbol.py` | Script que genera el .drawio y el SVG; si cambia una vista, se edita el árbol ahí y se vuelve a correr. El PNG se captura con Chromium headless a partir del SVG. |

Decisiones del árbol: las dos páginas del correo (Confirmación por Correo, Tomar Cupo por Correo) se dibujan como interfaces con la nota "desde el correo"; los CU que corren en el servidor (CU25, CU44, CU52, CU61) van como funcionalidades de la vista que los dispara; el título usa el nombre actual, Punto Paz Salud.

## Paso 4 — Tanda 0: diagrama de componentes (hecho, carpeta `diagrama-componentes/`)

| Archivo | Qué contiene |
|---|---|
| `Diagrama de Componentes Inc3.png` | Figura en alta resolución, mismo estilo del Inc 2, con los seis componentes internos nuevos del Inc 3. |
| `Diagrama de Componentes Inc3.drawio` | Fuente editable (el del Inc 2 solo existía en PNG). |
| `Diagrama de Componentes Inc3 - texto.md` | Texto propuesto para la Vista de Desarrollo, tabla de componentes nuevos y sus nombres en los diagramas de secuencia. |
| `generar_componentes.py` | Generador (.drawio + SVG); el PNG se captura con Chromium headless. |

## Diagrama de despliegue (carpeta `diagrama-despliegue/`)

| Archivo | Qué contiene |
|---|---|
| `Diagrama de Despliegue Inc3.png` | Figura en alta resolución, mismo estilo del Inc 2, actualizada al Inc 3. |
| `Diagrama de Despliegue Inc3.drawio` | Fuente editable (el del Inc 2 solo existía en PNG). |
| `Diagrama de Despliegue Inc3 - texto.md` | Texto propuesto para la sección y tabla de cambios nodo por nodo. |
| `generar_despliegue.py` | Generador (.drawio + SVG); el PNG se captura con Chromium headless. |

## Modelo relacional y normalización

En `reporte-brechas-inc3.html` las listas del MR, 1FN, 2FN y 3FN marcan las claves: primaria con subrayado continuo y foránea con subrayado discontinuo (tomadas de `schema.sql` y las migraciones). Los Word del Inc 1 y del Inc 2 no traían ninguna clave subrayada.

## Estado

- Paso 4 terminado: diagramas de secuencia de las seis tandas (ver `diagramas-secuencia/README.md`).
