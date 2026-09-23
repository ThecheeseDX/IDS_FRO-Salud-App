// Ruta: fro-vista/src/utils/push.js
//
// CU52 — Registro del teléfono para notificaciones push.
//
// Estado real hoy: Expo Go dejó de entregar notificaciones push remotas en
// Android (Google las bloqueó desde el SDK 53), así que en el flujo de pruebas
// del equipo este registro devuelve NO_DISPONIBLE y la app se queda con el
// centro de notificaciones y el correo, que sí funcionan.
//
// El código queda completo y conectado para el día en que el equipo genere una
// build propia (EAS o development build): ahí el token se obtiene igual, se
// manda al servidor con este mismo llamado y las alertas empiezan a llegar al
// teléfono sin tocar nada más, ni aquí ni en el backend.

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { registrarDispositivoPush, olvidarDispositivoPush } from '../api/client';

// Con la app abierta, el aviso se muestra igual: si no, una notificación que
// llega mientras el usuario está adentro pasaría desapercibida.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

let tokenActual = null;

/** El identificador del proyecto en Expo, que exige el SDK 49 en adelante. */
function idDeProyecto() {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.easConfig?.projectId ||
    null
  );
}

/**
 * Pide permiso, obtiene el token del teléfono y lo registra en el servidor.
 *
 * @returns {Promise<{estado: string, detalle?: string}>}
 *   REGISTRADO    · el token quedó guardado y el teléfono puede recibir push
 *   SIN_PERMISO   · el usuario no autorizó las notificaciones
 *   NO_DISPONIBLE · el entorno no entrega push (Expo Go, emulador, sin proyecto)
 */
export async function registrarPush() {
  try {
    // Android necesita un canal declarado o las alertas no suenan ni aparecen.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Avisos de Punto Paz Salud',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const permisos = await Notifications.getPermissionsAsync();
    let concedido = permisos.granted;
    if (!concedido && permisos.canAskAgain !== false) {
      const pedido = await Notifications.requestPermissionsAsync();
      concedido = pedido.granted;
    }
    if (!concedido) {
      return { estado: 'SIN_PERMISO' };
    }

    const projectId = idDeProyecto();
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    if (!token) return { estado: 'NO_DISPONIBLE' };

    await registrarDispositivoPush(token, Platform.OS);
    tokenActual = token;
    return { estado: 'REGISTRADO' };
  } catch (error) {
    // En Expo Go Android esto cae siempre, y es lo esperado: no es un fallo que
    // deba molestar al usuario, así que se informa sin alarmar.
    return { estado: 'NO_DISPONIBLE', detalle: error?.message };
  }
}

/** Da de baja el token al cerrar sesión, para que no le lleguen avisos ajenos. */
export async function olvidarPush() {
  if (!tokenActual) return;
  try {
    await olvidarDispositivoPush(tokenActual);
  } catch {
    // Cerrar sesión nunca puede fallar por esto.
  } finally {
    tokenActual = null;
  }
}

/**
 * Escucha el toque sobre una notificación del sistema y entrega su carga útil
 * (la pantalla a la que hay que saltar). Devuelve la función para dejar de
 * escuchar.
 */
export function escucharToques(alTocar) {
  const suscripcion = Notifications.addNotificationResponseReceivedListener((respuesta) => {
    const datos = respuesta?.notification?.request?.content?.data || {};
    alTocar(datos);
  });
  return () => suscripcion.remove();
}
