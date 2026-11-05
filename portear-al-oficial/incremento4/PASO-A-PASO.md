# Incremento 4 al repositorio oficial — paso a paso

Llevamos al repositorio oficial (`souln4me/IDS_FRO-Salud-App`) todo lo que se
hizo en el fork desde el Incremento 3:
- los 6 casos de uso del Incremento 4;
- la ronda de correcciones: chat general con adjuntos, inicio y término automáticos con GPS, Mi Jornada por día, semana y mes, pautas con días y material, evaluación por sesión y por tratamiento, perfil del paciente y descarga de la ficha;
- los arreglos de seguridad.

Son **seis bloques, uno por persona**, cada uno con un caso de uso. Cada
persona corre su script, hace su commit con su cuenta y abre su propio Pull
Request.

## Reparto

| Bloque | Quién | Contenido | Rama |
|---|---|---|---|
| 1 | souln4me | **Base** (migraciones de la base de datos, servidor, navegación, componentes comunes), **ronda de correcciones** y preparación para el alta: CU51 | `inc4-bloque-1-base-correcciones-cu51` |
| 2 | ThecheeseDX | Informe de alta y cierre del episodio: CU37 | `inc4-bloque-2-informe-alta` |
| 3 | TenienteGnar23 | Mensajes de refuerzo positivo: CU54 | `inc4-bloque-3-refuerzo-positivo` |
| 4 | baguirrebetancour | Escalamiento de eventos críticos: CU62 | `inc4-bloque-4-eventos-criticos` |
| 5 | HugoZamoraPardo | Derivaciones internas: CU65 | `inc4-bloque-5-derivaciones-internas` |
| 6 | Nykolayas-MP | Interfaz de contingencia para bonos: CU72 | `inc4-bloque-6-contingencia-bonos` |

El bloque 1 es el más grande, porque lleva todo lo que usan los demás y la
ronda de correcciones completa.

**El orden no se cambia:** primero el 1, después el 2, y así hasta el 6.
Cada uno empieza cuando el Pull Request anterior ya está mezclado.

## Antes de empezar (una sola vez, cada uno)

1. **Permiso de escritura en el oficial.** Nicolás (souln4me) los agrega en
   `Settings` → `Collaborators` → `Add people`.
2. **Git instalado** (`git --version` debe responder con un número).
3. **Decirle a git quién eres**, con el correo de tu cuenta de GitHub:

```bash
git config --global user.name "Tu Nombre" && git config --global user.email "tucorreo@ejemplo.com"
```

4. **Tener el repositorio oficial clonado.** Si ya lo tienes de los incrementos
   anteriores, sirve el mismo. Si no:

```bash
git clone https://github.com/souln4me/IDS_FRO-Salud-App.git
```

```bash
cd IDS_FRO-Salud-App
```

## Los seis pasos de tu bloque

En los comandos, cambia `inc4-bloque-2-informe-alta` por la rama de tu
bloque (columna "Rama" de la tabla).

**Paso 1. Ponte al día con lo que ya se mezcló.**

```bash
git checkout main && git pull
```

**Paso 2. Baja tu script.**

```bash
curl -sO https://raw.githubusercontent.com/ThecheeseDX/IDS_FRO-Salud-App/main/portear-al-oficial/incremento4/inc4-bloque-2-informe-alta.sh
```

**Paso 3. Ejecútalo.**

```bash
bash inc4-bloque-2-informe-alta.sh
```

Verás la lista de archivos preparados y, al final, los comandos que siguen. El
script no hace el commit: eso es tuyo. Si dice **ATENCIÓN** y lista archivos,
no hagas commit y avisa.

**Paso 4. Haz tu commit.** El script te muestra el mensaje sugerido; puedes
usar ese:

```bash
git commit -m "Incremento 4, bloque 2: informe de alta y cierre del episodio (CU37)"
```

**Paso 5. Sube tu rama.**

```bash
git push -u origin inc4-bloque-2-informe-alta
```

**Paso 6. Abre el Pull Request** en
`https://github.com/souln4me/IDS_FRO-Salud-App`: botón **Compare & pull
request** (o `Pull requests` → `New pull request`, `base: main` ←
`compare: tu rama`) → **Create pull request**. Después se mezcla y le avisas
al siguiente.

## Si estás en Windows (PowerShell)

Descargar el script:

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/ThecheeseDX/IDS_FRO-Salud-App/main/portear-al-oficial/incremento4/inc4-bloque-2-informe-alta.sh" -OutFile "inc4-bloque-2-informe-alta.sh"
```

Ejecutarlo (Git trae su propio bash):

```powershell
& "C:\Program Files\Git\bin\bash.exe" inc4-bloque-2-informe-alta.sh
```

O bien: clic derecho en la carpeta del repositorio → **Git Bash Here**, y ahí
`bash inc4-bloque-2-informe-alta.sh`. Los comandos `git` del resto son
iguales en Windows, Mac y Linux.

## Si algo sale mal

- **Empezar de nuevo o la rama ya existe:**

```bash
git checkout main && git branch -D inc4-bloque-2-informe-alta
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
  compartidos viajan completos en el bloque que los lleva. Con los seis
  mezclados, el código del oficial queda **idéntico** al del fork. Lo probamos
  sobre un clon del oficial, corriendo los seis bloques en orden con un commit
  por bloque.
- No hay dependencias nuevas: basta con reiniciar la app con la caché limpia.

```bash
cd fro-vista && npx expo start -c
```

- La base de datos se pone al día sola: al arrancar, el servidor aplica las
  migraciones nuevas. En un computador con la base local, basta con correr
  `npm run db:local` en `fro-controlador`. La guía `GUIA-LOCAL.md` viaja en el
  bloque 1.
- El README y la guía de la nube del oficial **no se tocan**: los mantiene el
  equipo. La documentación del Incremento 4 (fichas, diagramas, árbol y
  reporte) va al repositorio de documentación, no aquí.
- La base de datos en Aiven y el servidor en Render ya corren esta versión.
  Mezclar en el oficial no cambia nada del despliegue.
