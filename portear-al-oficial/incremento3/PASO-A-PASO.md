# Incremento 3 al repositorio oficial — paso a paso

Llevamos al repositorio oficial (`souln4me/IDS_FRO-Salud-App`) todo lo que se
hizo en el fork desde el Incremento 2: los 20 casos de uso del Incremento 3, el
rediseño Punto Paz Salud, las barras de navegación inferior de paciente y
profesional, y los ajustes que salieron de las pruebas.

Son **siete bloques**, en el mismo orden en que se construyó el incremento.
Cada uno corre su script, hace su commit y abre su propio Pull Request.

## Reparto

| Bloque | Quién | Contenido | Rama |
|---|---|---|---|
| 1 | souln4me | **Base** (base de datos, configuración, rediseño Punto Paz, barras de navegación, componentes comunes) + notificaciones y agenda: CU52, CU21, CU19 | `bloque-1-notificaciones-agenda` |
| 2 | ThecheeseDX | Triaje inteligente y banderas rojas: CU25, CU26, CU50 (incluye Mi tratamiento) | `bloque-2-triaje-banderas-rojas` |
| 3 | TenienteGnar23 | Adherencia y progreso: CU44, CU45 | `bloque-3-adherencia-progreso` |
| 4 | baguirrebetancour | Mensajería clínica y filtro de contenido: CU53, CU57 | `bloque-4-mensajeria-filtro` |
| 5 | baguirrebetancour | Calidad del servicio y perfil público del profesional: CU55, CU56, CU58 | `bloque-5-calidad-servicio` |
| 6 | HugoZamoraPardo | Soporte y panel de gestión: CU60, CU61, CU63, CU64 | `bloque-6-soporte-gestion` |
| 7 | Nykolayas-MP | Finanzas: CU73, CU74, CU75 | `bloque-7-finanzas` |

El bloque 1 es el más grande porque lleva todo lo transversal (lo que usan
todos los demás). baguirrebetancour hace el 4 y después el 5, como dos Pull
Requests separados.

**El orden no se cambia:** primero el 1, después el 2, y así hasta el 7.
Cada uno empieza cuando el Pull Request anterior ya está mezclado.

## Antes de empezar (una sola vez, cada uno)

1. **Permiso de escritura en el oficial.** Nicolás (souln4me) los agrega en
   `Settings` → `Collaborators` → `Add people`.
2. **Git instalado** (`git --version` debe responder con un número).
3. **Decirle a git quién eres**, con el correo de tu cuenta de GitHub:

```bash
git config --global user.name "Tu Nombre" && git config --global user.email "tucorreo@ejemplo.com"
```

4. **Tener el repositorio oficial clonado.** Si ya lo tienes del Incremento 2,
   sirve el mismo. Si no:

```bash
git clone https://github.com/souln4me/IDS_FRO-Salud-App.git
```

```bash
cd IDS_FRO-Salud-App
```

## Los seis pasos de tu bloque

En los comandos, cambia `bloque-2-triaje-banderas-rojas` por la rama de tu
bloque (columna "Rama" de la tabla).

**Paso 1. Ponte al día con lo que ya se mezcló.**

```bash
git checkout main && git pull
```

**Paso 2. Baja tu script.**

```bash
curl -sO https://raw.githubusercontent.com/ThecheeseDX/IDS_FRO-Salud-App/main/portear-al-oficial/incremento3/bloque-2-triaje-banderas-rojas.sh
```

**Paso 3. Ejecútalo.**

```bash
bash bloque-2-triaje-banderas-rojas.sh
```

Verás la lista de archivos preparados y, al final, los comandos que siguen. El
script no hace el commit: eso es tuyo. Si dice **ATENCIÓN** y lista archivos,
no hagas commit y avisa.

**Paso 4. Haz tu commit.** El script te muestra el mensaje sugerido; puedes
usar ese:

```bash
git commit -m "Incremento 3, bloque 2: triaje inteligente y banderas rojas (CU25, CU26, CU50)"
```

**Paso 5. Sube tu rama.**

```bash
git push -u origin bloque-2-triaje-banderas-rojas
```

**Paso 6. Abre el Pull Request** en
`https://github.com/souln4me/IDS_FRO-Salud-App`: botón **Compare & pull
request** (o `Pull requests` → `New pull request`, `base: main` ←
`compare: tu rama`) → **Create pull request**. Después se mezcla y le avisas
al siguiente.

## Si estás en Windows (PowerShell)

Descargar el script:

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/ThecheeseDX/IDS_FRO-Salud-App/main/portear-al-oficial/incremento3/bloque-2-triaje-banderas-rojas.sh" -OutFile "bloque-2-triaje-banderas-rojas.sh"
```

Ejecutarlo (Git trae su propio bash):

```powershell
& "C:\Program Files\Git\bin\bash.exe" bloque-2-triaje-banderas-rojas.sh
```

O bien: clic derecho en la carpeta del repositorio → **Git Bash Here**, y ahí
`bash bloque-2-triaje-banderas-rojas.sh`. Los comandos `git` del resto son
iguales en Windows, Mac y Linux.

## Si algo sale mal

- **Empezar de nuevo o la rama ya existe:**

```bash
git checkout main && git branch -D bloque-2-triaje-banderas-rojas
```

  y vuelves al paso 1.
- **Push pide usuario y contraseña:** GitHub no acepta la contraseña; usa un
  token (`Settings` → `Developer settings` → `Personal access tokens` →
  `Tokens (classic)` → marca `repo`) y pégalo como contraseña.
- **Windows repite `Unlink of file ... failed`:** responde `n` hasta que vuelva
  la terminal, cierra GitHub Desktop, VS Code y pausa OneDrive, borra la rama y
  repite.
- **No tienes permiso para subir:** pídele a Nicolás que te agregue como
  colaborador.

## Qué esperar del resultado

- Los bloques intermedios no levantan la aplicación por sí solos: los archivos
  compartidos viajan completos en el bloque que los lleva. Con los siete
  mezclados, el código del oficial queda **idéntico** al del fork (probado
  sobre un clon del oficial, en un sistema que, como Windows, no distingue
  mayúsculas).
- Después de mezclar todo, quien quiera correr la app tiene que instalar las
  dependencias nuevas (barra de navegación inferior, íconos y barra de estado):

```bash
cd fro-vista && npm install && npx expo start -c
```

- El README y la guía de la nube del oficial **no se tocan**: el equipo ya los
  había actualizado. La documentación del Incremento 3 (diagramas, árbol de
  navegación, reporte de brechas) va al repositorio de documentación, no aquí.
- La base de datos en Aiven ya tiene todas las tablas y columnas nuevas, y el
  servidor en Render ya corre esta versión. Mezclar en el oficial no cambia
  nada del despliegue.
