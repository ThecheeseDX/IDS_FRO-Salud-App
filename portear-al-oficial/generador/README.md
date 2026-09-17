# Generador de scripts de traspaso

Genera los scripts que llevan un incremento del fork al repositorio oficial,
repartido en partes (una por estudiante). Cada script crea su rama y deja los
archivos preparados; el commit lo hace cada persona con su cuenta.

## Para el Incremento 3

1. Copiar `partes_incremento2.py` como `partes_incremento3.py` y ajustar qué
   rutas le tocan a cada parte. Lo que no calce en ninguna cae en la parte
   marcada `por_defecto`.
2. Desde la raíz del fork, con el oficial agregado como remoto `upstream`:

```bash
git fetch upstream
```

```bash
python3 portear-al-oficial/generador/generar_partes.py --config portear-al-oficial/generador/partes_incremento3.py --base upstream/main --destino main --salida portear-al-oficial/incremento3
```

El generador se detiene si alguna ruta queda sin parte asignada, así que nada
se pierde en silencio.

3. Probar los scripts en un clon del oficial antes de entregarlos (ver
   *Prueba* más abajo) y subirlos al fork.
4. El equipo los ejecuta igual que en el Incremento 2, siguiendo
   `../PASO-A-PASO.md`.

La documentación queda excluida del traspaso (`EXCLUIR` en la config), porque
se entrega en el repositorio de documentación.

## Qué corrige respecto del Incremento 2

En el Incremento 2 faltaron seis archivos en el oficial. Eran renombres que
solo cambiaban mayúsculas, como `CitaRoutes.js` a `citaRoutes.js`. Windows y
macOS no distinguen mayúsculas en los nombres, así que el script, al borrar el
nombre antiguo, eliminaba también el archivo nuevo de la carpeta. Quien después
agregaba todo con `git add -A` o con GitHub Desktop subía ese borrado.

Ahora esos renombres se aplican en dos pasos con `git mv` a través de un nombre
temporal, y cada script verifica al final que todo lo preparado exista en la
carpeta. Si algo falta, se detiene y avisa antes del commit.

## Prueba

Se reprodujo el error del Incremento 2 en un disco que no distingue
mayúsculas, simulando `git add -A` antes de cada commit: con los scripts
anteriores faltaban exactamente los mismos seis archivos que en el oficial.
Con este generador, ninguna parte borra archivos de la carpeta y el resultado
final del código es idéntico al fork.

## ¿Sigue funcionando si el fork se separa del oficial?

Sí. Los scripts no usan el vínculo de fork que muestra GitHub: solo la
dirección del repositorio y el historial de commits que ambos comparten. Al usar
*Leave fork network* la dirección no cambia y GitHub conserva todo el historial
de commits. La prueba de arriba incluso usó como "fork" una carpeta local, sin
ningún vínculo en GitHub, y funcionó igual.

El único requisito es que el fork siga **público**, porque los scripts se
descargan y leen sin iniciar sesión. Si lo hacen privado, hay que entregar los
scripts de otra forma y dar acceso de lectura a quienes los ejecuten.
