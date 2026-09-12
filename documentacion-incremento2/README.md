# Documentación del Incremento 2

Material de apoyo para actualizar el informe del repositorio `IDS_Documentacion_Grupo17`.
No es código: son los entregables de la revisión que comparó lo que dice la
documentación con lo que hace realmente la aplicación.

Estado: decisiones D1–D13 resueltas y aplicadas en el código (commit `ed760555`).

## Archivos

| Archivo | Qué contiene |
|---|---|
| `CU-corregidos-Incremento2.txt` | Las 53 fichas de caso de uso corregidas (CU01–CU79, incluido el CU10 nuevo), en el formato exacto del informe: CUxx, Nombre, Actor(es), Resumen, Frecuencia, Precondiciones, Descripción, Excepciones, Poscondiciones y Dependencias. Listas para copiar y pegar. |
| `Diagramas-CU-cambios.md` | Revisión de los "Diagramas de CU" del Documento 0: qué cambiar en cada uno (actores, burbujas de include y extend) y los problemas de formato heredados. |
| `reporte-brechas-inc2.html` | Reporte completo de brechas entre documentación y código: caso de uso por caso de uso, base de datos, y cómo reflejarlo en el MERE, el MR y las formas normales. Se abre con doble clic en cualquier navegador. |

## Cambios en el informe por eliminar la tabla `Pauta_Material`

La tabla existía en el esquema pero ningún flujo la usaba: el material terapéutico
se asocia a cada ejercicio (`Pauta_Ejercicio.material_terapeutico_id`). Se eliminó
de la base de datos, así que en el Incremento 1 hay que quitarla de cuatro lugares:

1. **MERE**: eliminar la relación "Usa" entre Pauta_Tratamiento y Material_Terapeutico, con sus atributos cantidad y frecuencia.
2. **Modelo Relacional**: eliminar la línea `Pauta_Material (pauta_tratamiento_id, material_terapeutico_id, cantidad, frecuencia)`.
3. **Normalización**: eliminar esa misma línea en 1FN, 2FN y 3FN.
4. **Modelo físico / diccionario de datos**: eliminar la tabla si aparece.

## Pendiente

- Árbol de navegación del Incremento 2.
- Diagramas de secuencia, en el estilo de los `.drawio` del Incremento 1.
