// Ruta: fro-vista/src/navigation/rutasPaciente.js
//
// Con la barra inferior del paciente, varias pantallas dejaron de ser rutas
// sueltas: viven dentro de una pestaña (o de una pestaña de "Mi tratamiento").
// Los avisos del servidor (datos.pantalla) y algunas pantallas siguen usando
// los nombres de siempre; aquí se traducen a su destino anidado.

export const PESTANAS_PACIENTE = 'PestanasPaciente';

// Nombre antiguo → pestaña de la barra inferior.
const PESTANA_DE = {
  DashboardPaciente: 'Inicio',
  MisCitas: 'Inicio',
  Conversaciones: 'Mensajes',
  Seguridad: 'Perfil',
};

// Nombre antiguo → pestaña interna de "Mi tratamiento".
export const PESTANA_DE_TRATAMIENTO = {
  MiProgreso: 'progreso',
  MisPautas: 'ejercicios',
  MiSeguimiento: 'seguimiento',
  Triaje: 'entrevista',
};

// La barra ya está abierta debajo de cualquier otra pantalla: hay que volver
// a ella ('pop'), no apilar una segunda copia encima.
const VOLVER = { pop: true };

/**
 * Traduce un destino a [ruta, params, opciones] para navigation.navigate. Si
 * la ruta existe tal cual en el navegador raíz, se usa directo; si es una
 * pantalla que ahora vive dentro de las pestañas del paciente, se arma la ruta
 * anidada. Devuelve null si el rol no tiene ese destino.
 */
export function resolverDestino(rutasDelRol, destino, params) {
  if (!destino) return null;
  if (rutasDelRol.includes(destino)) return [destino, params];
  if (!rutasDelRol.includes(PESTANAS_PACIENTE)) return null;

  if (PESTANA_DE[destino]) {
    return [PESTANAS_PACIENTE, { screen: PESTANA_DE[destino], params }, VOLVER];
  }
  if (PESTANA_DE_TRATAMIENTO[destino]) {
    return [
      PESTANAS_PACIENTE,
      { screen: 'Tratamiento', params: { ...(params || {}), pestana: PESTANA_DE_TRATAMIENTO[destino] } },
      VOLVER,
    ];
  }
  return null;
}

/** Atajo para pantallas del paciente que vuelven a una pestaña (p. ej. Mis citas). */
export function irAPestana(navigation, destino, params) {
  const ruta = resolverDestino([PESTANAS_PACIENTE], destino, params);
  if (ruta) navigation.navigate(...ruta);
  else navigation.navigate(destino, params);
}
