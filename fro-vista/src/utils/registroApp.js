/**
 * Componente: Cliente Móvil
 * Casos de uso: apoyo común (toda la app).
 *
 * Registro de actividad de la app. Escribe en la terminal donde corre Expo
 * (la de Visual Studio Code) qué pantalla se abre y cada llamada al servidor,
 * con su respuesta, su duración y el caso de uso que la atiende (el servidor
 * lo informa en la cabecera X-Caso-Uso). Ejemplo:
 *
 *   [App] ▶ pantalla: ReservarCita
 *   [App] POST /citas → 201 · 230 ms · CU15
 *   [App] ⚠️ POST /citas → 409 HORARIO_OCUPADO · 180 ms · CU15
 *
 * Solo funciona en desarrollo (__DEV__): la app publicada no escribe nada.
 * Nunca registra lo que se envía ni lo que vuelve (RUT, contraseñas, datos
 * clínicos): solo la ruta, sin parámetros de búsqueda.
 */

const ACTIVO = typeof __DEV__ !== 'undefined' && __DEV__;

// Las pantallas que se actualizan solas (chat, avisos, atención en curso)
// repiten la misma consulta cada pocos segundos: se muestra una vez por minuto.
const SILENCIO_REPETIDAS_MS = 60 * 1000;
const repetidas = new Map();

function hora() {
  const d = new Date();
  const dos = (n) => String(n).padStart(2, '0');
  return `${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`;
}

export function registrar(mensaje) {
  if (ACTIVO) console.log(`[App ${hora()}] ${mensaje}`);
}

let pantallaActual = null;
/** Pantalla que quedó a la vista después de navegar. */
export function registrarPantalla(nombre) {
  if (!ACTIVO || !nombre || nombre === pantallaActual) return;
  pantallaActual = nombre;
  registrar(`▶ pantalla: ${nombre}`);
}

/** Una llamada al servidor, al recibir la respuesta (o el error). */
export function registrarLlamada({ metodo, url, estado, ms, casoDeUso, codigoError, sinConexion }) {
  if (!ACTIVO) return;
  const ruta = String(url || '').split('?')[0];
  const verbo = String(metodo || 'get').toUpperCase();

  let sufijoRepetidas = '';
  if (verbo === 'GET' && estado && estado < 400) {
    const clave = `${ruta} ${estado}`;
    const anterior = repetidas.get(clave);
    const ahora = Date.now();
    if (anterior && ahora - anterior.desde < SILENCIO_REPETIDAS_MS) {
      anterior.veces += 1;
      return;
    }
    if (anterior?.veces) sufijoRepetidas = ` · (se repitió ${anterior.veces} veces)`;
    repetidas.set(clave, { desde: ahora, veces: 0 });
    if (repetidas.size > 500) repetidas.clear();
  }

  if (sinConexion) {
    registrar(`❌ ${verbo} ${ruta} → sin respuesta del servidor (${ms} ms)`);
    return;
  }
  const marca = estado >= 500 ? '❌ ' : estado >= 400 ? '⚠️ ' : '';
  const partes = [`${marca}${verbo} ${ruta} → ${estado}${codigoError ? ` ${codigoError}` : ''}`, `${ms} ms`];
  if (casoDeUso) partes.push(casoDeUso);
  registrar(partes.join(' · ') + sufijoRepetidas);
}
