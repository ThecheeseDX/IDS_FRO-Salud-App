# Documentación del Incremento 4

Entregables del Paso 2: cambios en los casos de uso y en la base de datos, comparados contra el código final (commit `c36a0434`, 63 migraciones).

- **`Incremento 4 - para copiar y pegar.docx`**: las 27 fichas como tablas, con el formato del informe del Incremento 3. Son los 6 CU del incremento (Tablas 3.2 a 3.7) y 21 CU anteriores actualizados. Al final vienen las listas MR, 1FN, 2FN y 3FN completas, con la PK subrayada y la FK con subrayado discontinuo. Se copia una tabla o una lista y se pega en el informe.
- **`reporte-cambios-inc4.html`**: qué cambió en cada CU, con un botón para copiar cada ficha; hallazgos del código; clases y atributos nuevos; cómo dibujarlos en el MERE; el MR y la normalización con los cambios marcados.

Para regenerar los dos archivos: `python3 generar_reporte.py`.

Las fuentes son `cus_inc4.py` (fichas), `modelo_datos.py` (MR y formas normales sobre el anexo del Inc 3, en `base-modelo-inc3.json`) y `datos_bd.py` (columnas, tipos y MERE). `generar_docx.py` arma el Word con los estilos del informe del Inc 3, que están en `plantilla/`.
