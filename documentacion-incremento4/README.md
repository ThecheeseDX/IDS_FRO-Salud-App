# Documentación del Incremento 4

Todo se compara contra el código final: commit `c36a0434`, más los arreglos del commit `9f9d4a13`.

| Paso | Carpeta o archivo | Contenido |
|---|---|---|
| 2 · CU y base de datos | `Incremento 4 - para copiar y pegar.docx` | 27 fichas como tablas con el formato del informe del Inc 3, el MR, la 1FN, la 2FN y la 3FN con las claves subrayadas, y las tablas del modelo físico |
| | `reporte-cambios-inc4.html` | Qué cambió en cada CU, clases y atributos nuevos, MERE, MR y normalización con los cambios marcados, y el modelo físico (tablas, columnas, tipos, claves foráneas, índices y script SQL) |
| | `Diagramas-CU-cambios-Inc4.md` | Qué cambiar en los diagramas de casos de uso del Documento 0 (burbujas include y extend) para que calcen con las 27 fichas corregidas |
| 3 · Árbol de navegación | `arbol-navegacion/` | Árbol del Inc 4 (75 interfaces, 168 funcionalidades), texto y tablas de vistas |
| | `arboles-por-incremento/` | Árbol coloreado por incremento: 1 azul, 2 morado, 3 verde, 4 naranjo |
| 4 · Diagramas de secuencia | `diagramas-secuencia/` | 24 diagramas legibles de 16 CU; el README de la carpeta dice cuáles reemplazan a los anteriores |
| 5 · Componentes y despliegue | `diagrama-componentes/` | Seis componentes internos nuevos y el GPS del dispositivo, con el texto para la Vista de Desarrollo |
| | `diagrama-despliegue/` | Los mismos nueve nodos, con las capacidades nuevas de cada uno y el texto para la Vista Física |

Cada carpeta trae su generador en Python. Para regenerar el paso 2: `python3 generar_reporte.py`. Las fuentes son `cus_inc4.py`, `modelo_datos.py` y `datos_bd.py`.
