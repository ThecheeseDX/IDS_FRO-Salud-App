# Reparación del repositorio oficial

## Qué pasó

El backend del repositorio oficial **no arranca**. Al iniciarlo responde:

```
Error: Cannot find module './routes/clinicaRoutes'
```

Faltan seis archivos que sí existen en el fork:

- `fro-controlador/src/controllers/citaController.js`
- `fro-controlador/src/controllers/inalterabilidadController.js`
- `fro-controlador/src/middlewares/auditarAcceso.js`
- `fro-controlador/src/routes/citaRoutes.js`
- `fro-controlador/src/routes/clinicaRoutes.js`
- `fro-controlador/src/routes/inalterabilidadRoutes.js`

**La causa fue un error de los scripts de traspaso, no de quien los ejecutó.**
Esos seis archivos solo cambiaban de mayúscula a minúscula, por ejemplo
`CitaRoutes.js` pasó a `citaRoutes.js`. Windows no distingue mayúsculas de
minúsculas en los nombres, así que cuando el script borró el nombre antiguo
borró también el archivo nuevo, que para Windows era el mismo. Después git los
mostró como eliminados y se subieron así.

## Cómo repararlo

Lo hace **una sola persona**, con GitHub Desktop y Visual Studio Code cerrados.
Los comandos son iguales en PowerShell, Git Bash y Mac, y no necesitan `bash`.
Desde la carpeta del repositorio oficial:

```bash
git checkout main
```

```bash
git pull
```

```bash
git fetch https://github.com/ThecheeseDX/IDS_FRO-Salud-App.git main
```

```bash
git checkout FETCH_HEAD -- fro-controlador/src/controllers/citaController.js fro-controlador/src/controllers/inalterabilidadController.js fro-controlador/src/middlewares/auditarAcceso.js fro-controlador/src/routes/citaRoutes.js fro-controlador/src/routes/clinicaRoutes.js fro-controlador/src/routes/inalterabilidadRoutes.js
```

Revisa que aparezcan los seis archivos como agregados:

```bash
git status
```

Y súbelo:

```bash
git commit -m "Restaura controladores y rutas de citas, ficha clinica e inalterabilidad que se eliminaron por error en el traspaso del Incremento 2"
```

```bash
git push
```

Si `main` está protegida y no deja subir directo, crea una rama con
`git checkout -b reparacion-archivos-faltantes` antes del commit, súbela con
`git push -u origin reparacion-archivos-faltantes` y abre un Pull Request.

## Cómo comprobar que quedó bien

La reparación se probó en un clon del oficial: antes de restaurar, el backend
falla con el error de arriba; después, carga todos sus módulos. Para verificarlo
en tu computador, desde `fro-controlador`:

```bash
npm install
```

```bash
node -e "require('./src/app'); console.log('OK')"
```

Debe imprimir `OK`.
