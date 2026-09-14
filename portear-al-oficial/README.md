# Portear el Incremento 2 al repositorio oficial, en seis partes

El trabajo del Incremento 2 está en el fork `ThecheeseDX/IDS_FRO-Salud-App` y
hay que llevarlo al oficial `souln4me/IDS_FRO-Salud-App` repartido en seis
pull requests, uno por estudiante.

Los dos repositorios comparten historia. El oficial está 64 commits atrás y no
tiene nada que el fork no tenga, así que el traspaso es limpio: 409 archivos
repartidos en seis partes que no se solapan.

Cada script deja los archivos de su parte preparados y **no hace el commit**.
El commit lo hace cada persona con su cuenta, para que quede a su nombre.

## Las seis partes

| Parte | Rama | Contenido | Archivos |
|---|---|---|---|
| 1 | `parte-1-base` | Base, reestructuración y despliegue: esquema y migraciones, configuración del servidor, tema y componentes comunes, navegación por rol, guía de nube | 51 |
| 2 | `parte-2-cuenta-seguridad` | Cuenta y seguridad: recuperación y cambio de contraseña, sesiones por dispositivo, privacidad, perfil público, segregación por rol | 94 |
| 3 | `parte-3-agenda-citas` | Agenda: reprogramación, cancelación, trazabilidad y descuento de sesiones | 62 |
| 4 | `parte-4-ficha-triaje` | Ficha clínica: triaje con disclaimer, integración a la anamnesis, plantillas por especialidad, episodio clínico | 55 |
| 5 | `parte-5-pautas-documentos-evidencia` | Pautas de ejercicio, repositorio de documentos con visor, correcciones versionadas y evidencia de la atención | 114 |
| 6 | `parte-6-pagos-administracion` | Bonos, copagos y planes, bitácora de transacciones externas, cuadratura y panel de administración | 33 |

Cada parte trae el código **y** los diagramas de secuencia de sus propios casos
de uso, así que es un entregable coherente.

## El orden importa

Las partes están encadenadas: la 2 sale de la 1, la 3 de la 2, y así. Hay
archivos que usan todos, como el esquema de la base de datos y la navegación de
la app, y por eso van en la parte 1. **Los pull requests se mezclan en orden,
del 1 al 6.**

## Qué hace cada persona

Una sola vez, clonar el repositorio oficial:

```bash
git clone https://github.com/souln4me/IDS_FRO-Salud-App.git && cd IDS_FRO-Salud-App
```

Después, la persona de la parte N ejecuta su script. Si la parte anterior ya
está subida, el script la toma sola; si no, se le pasa la rama anterior como
argumento:

```bash
bash portear-al-oficial/parte-2-cuenta-seguridad.sh
```

El script crea la rama, trae los archivos y los deja preparados. Entonces:

```bash
git commit -m "Cuenta y seguridad del Incremento 2: recuperación de contraseña, sesiones por dispositivo y privacidad de contacto"
```

```bash
git push -u origin parte-2-cuenta-seguridad
```

Y en GitHub se abre el Pull Request con base `main` y compare la rama recién
subida. Quien revise lo mezcla, y recién ahí la siguiente persona ejecuta su
script.

> Los scripts viven en el fork. Si prefieren no clonar el fork, cada persona
> puede copiar solo su script a la carpeta del repositorio oficial y ejecutarlo
> desde ahí: el script se encarga de agregar el fork como remoto y traer los
> archivos.

## Dos advertencias

**Las partes intermedias no levantan solas.** La aplicación quedó entrelazada:
la navegación de la parte 1 nombra pantallas que llegan en la 4 y la 5. Recién
con las seis mezcladas el sistema corre. Si la evaluación exige que cada entrega
funcione por separado, hay que repartir distinto y eso implica reescribir
código, no solo moverlo.

**El despliegue no se toca.** Ni Render, ni Cloudinary, ni Aiven, ni Brevo
dependen de qué repositorio aloja el código. Las credenciales están marcadas
como `sync: false` en `render.yaml`, es decir, viven en el panel de Render, y lo
único versionado son los `.env.example`, que son plantillas vacías. El servicio
que hoy corre desde el fork sigue igual. Si además quieren desplegar desde el
oficial, se crea un servicio nuevo en Render apuntando a ese repositorio y se
pegan las mismas variables.
