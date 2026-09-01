// Ruta: fro-vista/src/utils/fechas.js
//
// Formateo de fechas del servidor. Existe por un error real: las citas se
// mostraban tres o cuatro horas antes de la hora agendada.
//
// El servidor entrega dos cosas distintas que NO se pueden tratar igual:
//
//  1. Columnas de fecha/hora de la base ("2026-09-05 08:00:00"). Son hora de
//     pared chilena, sin huso. Convertirlas desplaza la hora: la cita de las
//     08:00 terminaba mostrándose a las 05:00. Se leen tal cual.
//
//  2. Marcas de tiempo instantáneas en JSON ("2026-09-05T11:00:00.000Z"), como
//     los check-in de evidencia. Esas sí son momentos absolutos en UTC y deben
//     convertirse al huso del teléfono.
//
// parsearFecha() distingue ambos casos por su formato.

const PATRON_HORA_PARED = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;
const PATRON_SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Convierte un valor del servidor en un Date del teléfono.
 * Devuelve null si el valor no es una fecha reconocible.
 */
export function parsearFecha(valor) {
  if (!valor) return null;

  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor;
  }

  const texto = String(valor).trim();

  // Caso 1: hora de pared. Se construye con los componentes locales para que
  // el teléfono NO aplique ninguna conversión de huso.
  const pared = texto.match(PATRON_HORA_PARED);
  if (pared) {
    const [, anio, mes, dia, hora, minuto, segundo] = pared;
    return new Date(
      Number(anio), Number(mes) - 1, Number(dia),
      Number(hora), Number(minuto), Number(segundo || 0)
    );
  }

  const soloFecha = texto.match(PATRON_SOLO_FECHA);
  if (soloFecha) {
    const [, anio, mes, dia] = soloFecha;
    return new Date(Number(anio), Number(mes) - 1, Number(dia));
  }

  // Caso 2: instante absoluto (ISO con Z u offset). Aquí sí corresponde
  // convertir al huso local del teléfono.
  const fecha = new Date(texto);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** Fecha y hora completas: "sábado, 05-09, 08:00" */
export function formatearFechaHora(valor, respaldo = 'Fecha no informada') {
  const fecha = parsearFecha(valor);
  if (!fecha) return respaldo;
  return fecha.toLocaleString('es-CL', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Solo la fecha: "05-09-2026" */
export function formatearFecha(valor, respaldo = 'Fecha no informada') {
  const fecha = parsearFecha(valor);
  if (!fecha) return respaldo;
  return fecha.toLocaleDateString('es-CL');
}

/** Solo la hora: "08:00" */
export function formatearHora(valor, respaldo = '--:--') {
  const fecha = parsearFecha(valor);
  if (!fecha) return respaldo;
  return fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

/** Rango de una cita: "08:00 a 09:00" */
export function formatearRango(inicio, fin) {
  const desde = formatearHora(inicio, null);
  const hasta = formatearHora(fin, null);
  if (!desde) return 'Horario no informado';
  return hasta ? `${desde} a ${hasta}` : desde;
}
