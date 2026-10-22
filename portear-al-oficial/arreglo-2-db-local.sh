#!/bin/bash
# Arreglo 2 — Script para dejar la base de datos local lista con un comando
#
# Ejecutar dentro de un clon del repositorio OFICIAL.
# Prepara los archivos y NO hace el commit: ese lo haces tu, con tu cuenta.
#
# Trae desde el fork:
#   - fro-controlador/src/database/mysql/iniciar-db-local.js (nuevo, junto a schema.sql)
#   - fro-controlador/package.json (solo suma el comando "db:local")
# y agrega al README del oficial un paso opcional que explica como usarlo.
set -e

RAMA="arreglo-2-db-local"
BASE_SUGERIDA="origin/main"
FORK="https://github.com/ThecheeseDX/IDS_FRO-Salud-App.git"

# Si bajaste este script dentro del repositorio, que no aparezca como archivo suelto.
NOMBRE_SCRIPT="$(basename "$0")"
mkdir -p .git/info
grep -qxF "$NOMBRE_SCRIPT" .git/info/exclude 2>/dev/null || echo "$NOMBRE_SCRIPT" >> .git/info/exclude

# gc.auto=0: evita que git reorganice sus paquetes (en Windows se bloquea si
# GitHub Desktop, VS Code u OneDrive tienen la carpeta abierta).
git -c gc.auto=0 fetch origin --quiet
git remote get-url fork >/dev/null 2>&1 || git remote add fork "$FORK"
git -c gc.auto=0 fetch fork --quiet

BASE="${1:-$BASE_SUGERIDA}"
echo "Creando la rama $RAMA a partir de $BASE"
git switch -c "$RAMA" "$BASE"

# 1) Traer los archivos desde el fork. El package.json del fork es igual al del
#    oficial salvo la linea nueva "db:local", por eso se puede traer completo.
TRAER=(
  fro-controlador/src/database/mysql/iniciar-db-local.js
  fro-controlador/package.json
)
git checkout fork/main -- "${TRAER[@]}"

# 2) README del oficial: se agrega un paso opcional despues de "4. Guarde el
#    archivo" del Paso 2.2. Si ya esta, no se duplica. (Se edita con node y no
#    con el README del fork, porque el oficial tiene su propio texto.)
node - <<'EOF'
const fs = require('fs');
const ruta = 'README.md';
let texto = fs.readFileSync(ruta, 'utf8');
if (texto.includes('npm run db:local')) {
  console.log('README: el paso de base de datos local ya estaba.');
  process.exit(0);
}
const bloque = `
### Paso 2.3 (opcional): Base de datos en su propio computador

Solo si quiere trabajar **sin** la base de la nube (por ejemplo para desarrollar
el servidor sin afectar los datos del equipo). Con MySQL 8 instalado y
encendido, ejecute dentro de \`fro-controlador\`:

\`\`\`
npm run db:local
\`\`\`

El script (\`src/database/mysql/iniciar-db-local.js\`, junto a \`schema.sql\`) hace
todo solo: crea el \`.env\` si no existe y le pregunta la contraseña de MySQL,
crea la base \`fro_salud_db\`, carga \`schema.sql\` (tablas y datos iniciales),
aplica las migraciones pendientes y verifica que todo quedó en orden. Se puede
repetir las veces que quiera: si la base ya existe no la toca. Para partir de
cero: \`npm run db:local -- --reiniciar\`.

Además deja tres cuentas de prueba activas para entrar desde la app sin pasar
por el correo de verificación (RUT / contraseña):

| Rol | RUT | Contraseña |
|---|---|---|
| Administrador | \`111111111\` | \`Prueba.2026\` |
| Profesional | \`222222222\` | \`Prueba.2026\` |
| Paciente | \`333333333\` | \`Prueba.2026\` |

> Si su \`.env\` tiene \`DATABASE_URL\` (la base de Aiven), el script se detiene
> para no confundir las dos bases: comente esa línea con \`#\` mientras trabaje
> en local y vuelva a activarla después.
`;
const ancla = /^4\. Guarde el archivo[^\n]*\n/m;
if (!ancla.test(texto)) {
  console.error('README: no se encontro la linea "4. Guarde el archivo" del Paso 2.2. Agrega el paso a mano.');
  process.exit(1);
}
texto = texto.replace(ancla, (linea) => linea + bloque);
fs.writeFileSync(ruta, texto);
console.log('README: agregado el Paso 2.3 (opcional) de base de datos local.');
EOF
git add README.md

# 3) Verificacion: todo lo preparado debe existir tambien en la carpeta.
for f in "${TRAER[@]}"; do [ -e "$f" ] || git checkout -- "$f"; done
FALTANTES="$(git ls-files --deleted)"
if [ -n "$FALTANTES" ]; then
  echo
  echo "ATENCION: estos archivos quedaron preparados pero no estan en la carpeta:"
  echo "$FALTANTES"
  echo "No hagas commit todavia. Avisa para revisarlo."
  exit 1
fi

echo
echo "Archivos preparados: $(git diff --cached --name-only | wc -l | tr -d ' ')"
git diff --cached --name-status
echo
echo "Todo listo. Ahora haz TU commit y sube la rama:"
echo
echo '  git commit -m "Script para dejar la base de datos local lista con un comando (npm run db:local)"'
echo "  git push -u origin $RAMA"
echo
echo "Despues abre el Pull Request en GitHub: base main <- compare $RAMA"
