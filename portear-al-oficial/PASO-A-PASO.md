# Paso a paso para cada persona

Guía para llevar el Incremento 2 al repositorio oficial en seis partes.
Cada uno hace su parte, en orden, y abre su propio Pull Request.

## Reparto sugerido

| Parte | Quién | Contenido |
|---|---|---|
| 1 | ThecheeseDX | Base: base de datos, configuración, tema, navegación y despliegue |
| 2 | HugoZamoraPardo | Cuenta y seguridad |
| 3 | souln4me | Agenda y citas |
| 4 | Nykolayas-MP | Ficha clínica, triaje y episodio |
| 5 | Benbetag | Pautas, documentos y evidencia |
| 6 | TenienteGnar23 | Pagos, integración externa y administración |

Se puede intercambiar. Lo único que no cambia es el orden: primero la 1,
después la 2, y así hasta la 6.

## Antes de empezar (una sola vez, cada uno)

**1. Tener permiso de escritura en el repositorio oficial.**
Nicolás (souln4me) los agrega en `Settings` → `Collaborators` → `Add people`.
Sin esto no pueden subir su rama.

**2. Tener git instalado.** En una terminal:

```bash
git --version
```

Si responde con un número de versión, está listo. Si no, en Mac se instala con
`xcode-select --install` y en Windows desde `git-scm.com`.

**3. Decirle a git quién eres.** Usa el mismo correo de tu cuenta de GitHub:

```bash
git config --global user.name "Tu Nombre" && git config --global user.email "tucorreo@ejemplo.com"
```

**4. Clonar el repositorio oficial.** Se hace una sola vez:

```bash
git clone https://github.com/souln4me/IDS_FRO-Salud-App.git
```

```bash
cd IDS_FRO-Salud-App
```

## Los seis pasos de tu parte

Reemplaza `parte-2-cuenta-seguridad` por el nombre de la rama que te toca:

| Parte | Nombre de la rama |
|---|---|
| 1 | `parte-1-base` |
| 2 | `parte-2-cuenta-seguridad` |
| 3 | `parte-3-agenda-citas` |
| 4 | `parte-4-ficha-triaje` |
| 5 | `parte-5-pautas-documentos-evidencia` |
| 6 | `parte-6-pagos-administracion` |

**Paso 1. Ponte al día con lo que ya se mezcló.**

```bash
git checkout main && git pull
```

**Paso 2. Baja tu script.** Desde la carpeta del repositorio:

```bash
curl -sO https://raw.githubusercontent.com/ThecheeseDX/IDS_FRO-Salud-App/main/portear-al-oficial/parte-2-cuenta-seguridad.sh
```

**Paso 3. Ejecútalo.**

```bash
bash parte-2-cuenta-seguridad.sh
```

Verás la lista de archivos preparados y, al final, los comandos que siguen.
El script no hace el commit: eso es tuyo.

**Paso 4. Haz tu commit.** Escribe un mensaje que explique qué aportas:

```bash
git commit -m "Cuenta y seguridad del Incremento 2: recuperación y cambio de contraseña, sesiones activas por dispositivo y privacidad de datos de contacto"
```

**Paso 5. Sube tu rama.**

```bash
git push -u origin parte-2-cuenta-seguridad
```

**Paso 6. Abre el Pull Request.** Entra a
`https://github.com/souln4me/IDS_FRO-Salud-App`, GitHub mostrará un aviso
amarillo con tu rama y un botón **Compare & pull request**. Si no aparece, anda
a la pestaña `Pull requests` → `New pull request`, elige `base: main` y
`compare: tu rama`. Escribe el título y aprieta **Create pull request**.

Listo. Avísale a la persona de la parte siguiente para que empiece.

## El orden importa

Las partes están encadenadas porque comparten archivos, como el esquema de la
base de datos y la navegación de la aplicación. **Cada uno empieza cuando el
Pull Request anterior ya está mezclado.** Si tu turno llega antes de que
mezclen el anterior, el script te avisa y arma tu rama sobre la anterior igual,
pero es más simple esperar.

## Si algo sale mal

**Te equivocaste de rama o quieres empezar de nuevo:**

```bash
git checkout main && git branch -D parte-2-cuenta-seguridad
```

Y vuelves al paso 1.

**El script dice que la rama ya existe:** ya la creaste antes. Bórrala con el
comando de arriba y repite.

**Al hacer push te pide usuario y contraseña:** GitHub ya no acepta contraseña.
Usa un token: en GitHub, `Settings` → `Developer settings` →
`Personal access tokens` → `Tokens (classic)` → `Generate new token`, marca
`repo`, y pega ese token cuando te pida la contraseña.

**No tienes permiso para subir la rama:** todavía no eres colaborador del
repositorio oficial. Pídele a Nicolás que te agregue.

## Qué esperar del resultado

Las partes intermedias no levantan la aplicación por sí solas: el sistema quedó
entrelazado y recién con las seis mezcladas corre completo. Eso es normal y
esperable en este reparto.

El despliegue no se toca. Render, Cloudinary, Aiven y Brevo siguen funcionando
igual, porque sus credenciales viven en el panel de Render y no en el
repositorio.
