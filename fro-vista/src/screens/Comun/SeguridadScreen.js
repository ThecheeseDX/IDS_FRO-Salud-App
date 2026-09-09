// Ruta: fro-vista/src/screens/Comun/SeguridadScreen.js
//
// Panel de seguridad de la cuenta, común a los tres roles:
// - CU08: sesiones activas por dispositivo, con cierre remoto.
// - CU07: cambio de contraseña validado por código al correo.
// - CU09: privacidad de datos de contacto (solo pacientes).

import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  StyleSheet,
} from 'react-native';

import apiClient from '../../api/client';
import { AuthContext } from '../../context/AuthContext';
import VistaConTeclado from '../../components/VistaConTeclado';
import CodigoOTP from '../../components/CodigoOTP';
import DialogoConfirmacion from '../../components/DialogoConfirmacion';
import { formatearFechaHora } from '../../utils/fechas';
import { colores, radio } from '../../theme';
import DialogoAviso from '../../components/DialogoAviso';

export default function SeguridadScreen() {
  const { userData, logoutSession } = useContext(AuthContext);
  const esPaciente = userData?.rol === 'Paciente';

  // ── CU08: sesiones ─────────────────────────────────────────────────────────
  // Avisos con el diálogo de la app (el Alert nativo no se estiliza).
  const [aviso, setAviso] = useState(null);
  const [sesiones, setSesiones] = useState([]);
  const [cargandoSesiones, setCargandoSesiones] = useState(true);
  const [errorSesiones, setErrorSesiones] = useState(false);
  const [cerrandoId, setCerrandoId] = useState(null);

  // ── CU07: cambio de contraseña ─────────────────────────────────────────────
  const [cambioActivo, setCambioActivo] = useState(false);
  const [destinoOTP, setDestinoOTP] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [procesandoCambio, setProcesandoCambio] = useState(false);
  const [erroresCambio, setErroresCambio] = useState([]);

  // ── CU09: privacidad (solo pacientes) ──────────────────────────────────────
  const [privacidad, setPrivacidad] = useState(null);
  const [guardandoPrivacidad, setGuardandoPrivacidad] = useState(false);

  const cargarSesiones = async () => {
    setCargandoSesiones(true);
    setErrorSesiones(false);
    try {
      const { data } = await apiClient.get('/auth/sesiones');
      setSesiones(data?.sesiones || []);
    } catch {
      // CU08 — Excepción 2: no se pudo recuperar la lista en tiempo real.
      setErrorSesiones(true);
    } finally {
      setCargandoSesiones(false);
    }
  };

  const cargarPrivacidad = async () => {
    if (!esPaciente) return;
    try {
      const { data } = await apiClient.get('/auth/privacidad');
      setPrivacidad(data);
    } catch {
      setPrivacidad(null);
    }
  };

  useEffect(() => {
    cargarSesiones();
    cargarPrivacidad();
  }, []);

  // ── CU08: cierre remoto ────────────────────────────────────────────────────
  // Confirmación con el diálogo propio: el Alert nativo no sigue el diseño.
  const [sesionPorCerrar, setSesionPorCerrar] = useState(null);
  const confirmarCierre = (sesion) => setSesionPorCerrar(sesion);

  const cerrarSesion = async (sesion) => {
    setCerrandoId(sesion.sesion_usuario_id);
    try {
      await apiClient.post(`/auth/sesiones/${sesion.sesion_usuario_id}/cerrar`);
      if (sesion.actual) {
        logoutSession();
        return;
      }
      await cargarSesiones();
    } catch (err) {
      const respuesta = err.response?.data;
      // CU08 — Excepción 3: la sesión ya había expirado; se refresca la lista.
      setAviso({ tono: 'alerta', titulo: 'Aviso', mensaje: respuesta?.mensaje || 'No se pudo cerrar la sesión.' });
      await cargarSesiones();
    } finally {
      setCerrandoId(null);
    }
  };

  // ── CU07: cambio de contraseña con OTP ─────────────────────────────────────
  const iniciarCambio = async () => {
    setProcesandoCambio(true);
    setErroresCambio([]);
    try {
      const { data } = await apiClient.post('/auth/cambio-contrasena/solicitar');
      setDestinoOTP(data?.destino || 'tu correo');
      setCambioActivo(true);
    } catch {
      setAviso({ tono: 'error', titulo: 'Error', mensaje: 'No se pudo enviar el código. Intenta nuevamente.' });
    } finally {
      setProcesandoCambio(false);
    }
  };

  const confirmarCambio = async () => {
    setErroresCambio([]);
    if (!/^\d{6}$/.test(codigo.trim())) {
      setErroresCambio(['El código son los 6 dígitos que llegaron a tu correo.']);
      return;
    }
    if (nuevaContrasena !== confirmar) {
      setErroresCambio(['Las contraseñas no coinciden.']);
      return;
    }

    setProcesandoCambio(true);
    try {
      const { data } = await apiClient.post('/auth/cambio-contrasena/confirmar', {
        codigo: codigo.trim(),
        nueva_contrasena: nuevaContrasena,
      });
      setAviso({
        tono: 'ok',
        titulo: 'Contraseña actualizada',
        mensaje: data?.mensaje || 'Vuelve a iniciar sesión.',
        alCerrar: logoutSession,
      });
    } catch (err) {
      const respuesta = err.response?.data;
      if (respuesta?.error === 'CONTRASENA_DEBIL') {
        setErroresCambio([respuesta.mensaje, ...(respuesta.requisitos || [])]);
      } else {
        setErroresCambio([respuesta?.mensaje || 'No se pudo cambiar la contraseña.']);
      }
    } finally {
      setProcesandoCambio(false);
    }
  };

  // ── CU09: privacidad ───────────────────────────────────────────────────────
  const cambiarPreferencia = async (campo, valor) => {
    const anterior = privacidad;
    const nueva = { ...privacidad, [campo]: valor };
    setPrivacidad(nueva);
    setGuardandoPrivacidad(true);
    try {
      await apiClient.put('/auth/privacidad', {
        mostrar_direccion: nueva.mostrar_direccion,
        mostrar_telefono: nueva.mostrar_telefono,
      });
    } catch (err) {
      // CU09 — Excepción 4: si la escritura falla, se restaura lo anterior.
      setPrivacidad(anterior);
      setAviso({ tono: 'error', titulo: 'No se pudo guardar', mensaje: err.response?.data?.mensaje || 'Los cambios no se aplicaron. Intenta nuevamente.' });
    } finally {
      setGuardandoPrivacidad(false);
    }
  };

  const formatearFecha = (valor) => formatearFechaHora(valor, '—');

  return (
    <VistaConTeclado style={estilos.fondo} contentContainerStyle={estilos.contenido}>
      {/* ── CU08: Sesiones activas ── */}
      <Text style={estilos.seccion}>Sesiones activas</Text>
      <Text style={estilos.ayudaSeccion}>
        Estos dispositivos tienen acceso a tu cuenta. Puedes cerrarlos de forma remota.
      </Text>

      {cargandoSesiones ? (
        <ActivityIndicator size="large" color={colores.primario} style={estilos.cargando} />
      ) : errorSesiones ? (
        <View style={estilos.avisoError}>
          <Text style={estilos.avisoErrorTexto}>
            No se pudo obtener la lista de sesiones en este momento.
          </Text>
          <TouchableOpacity onPress={cargarSesiones}>
            <Text style={estilos.enlace}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        sesiones.map((sesion) => (
          <View key={sesion.sesion_usuario_id} style={estilos.tarjetaSesion}>
            <View style={estilos.sesionInfo}>
              <Text style={estilos.sesionDispositivo}>
                {sesion.dispositivo || 'Dispositivo desconocido'}
                {sesion.actual ? '  · este dispositivo' : ''}
              </Text>
              <Text style={estilos.sesionDetalle}>
                Desde {formatearFecha(sesion.momento_inicio)}
                {sesion.ip_origen ? `  ·  IP ${sesion.ip_origen}` : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={estilos.botonCerrarSesion}
              onPress={() => confirmarCierre(sesion)}
              disabled={cerrandoId === sesion.sesion_usuario_id}
            >
              <Text style={estilos.botonCerrarTexto}>
                {cerrandoId === sesion.sesion_usuario_id ? '…' : 'Cerrar'}
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* ── CU07: Cambio de contraseña ── */}
      <Text style={estilos.seccion}>Contraseña</Text>

      {!cambioActivo ? (
        <TouchableOpacity
          style={[estilos.botonPrimario, procesandoCambio && estilos.deshabilitado]}
          onPress={iniciarCambio}
          disabled={procesandoCambio}
        >
          {procesandoCambio ? (
            <ActivityIndicator color={colores.superficie} />
          ) : (
            <Text style={estilos.botonPrimarioTexto}>Cambiar contraseña</Text>
          )}
        </TouchableOpacity>
      ) : (
        <View style={estilos.tarjetaCambio}>
          <Text style={estilos.ayudaSeccion}>
            Enviamos un código a {destinoOTP}. Escríbelo junto a tu contraseña nueva.
          </Text>
          <CodigoOTP valor={codigo} onCambiar={setCodigo} />
          <TextInput
            style={estilos.input}
            placeholder="Contraseña nueva"
            secureTextEntry
            value={nuevaContrasena}
            onChangeText={setNuevaContrasena}
          />
          <TextInput
            style={estilos.input}
            placeholder="Confirmar contraseña nueva"
            secureTextEntry
            value={confirmar}
            onChangeText={setConfirmar}
          />
          <Text style={estilos.ayudaSeccion}>Mínimo 8 caracteres, con letras y números.</Text>

          {erroresCambio.map((mensaje) => (
            <Text key={mensaje} style={estilos.textoError}>• {mensaje}</Text>
          ))}

          <TouchableOpacity
            style={[estilos.botonPrimario, procesandoCambio && estilos.deshabilitado]}
            onPress={confirmarCambio}
            disabled={procesandoCambio}
          >
            {procesandoCambio ? (
              <ActivityIndicator color={colores.superficie} />
            ) : (
              <Text style={estilos.botonPrimarioTexto}>Confirmar cambio</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCambioActivo(false)} disabled={procesandoCambio}>
            <Text style={estilos.enlace}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── CU09: Privacidad (solo pacientes) ── */}
      {esPaciente && (
        <>
          <Text style={estilos.seccion}>Privacidad de mis datos</Text>
          <Text style={estilos.ayudaSeccion}>
            Define qué datos de contacto puede ver el profesional que te atiende. Tu contacto
            de emergencia siempre queda visible por seguridad.
          </Text>

          {privacidad === null ? (
            <ActivityIndicator size="small" color={colores.primario} style={estilos.cargando} />
          ) : (
            <View style={estilos.tarjetaPrivacidad}>
              <View style={estilos.filaPreferencia}>
                <Text style={estilos.preferenciaTexto}>Mostrar mi dirección</Text>
                <Switch
                  value={privacidad.mostrar_direccion}
                  onValueChange={(v) => cambiarPreferencia('mostrar_direccion', v)}
                  disabled={guardandoPrivacidad}
                  trackColor={{ false: colores.borde, true: colores.verde[300] }}
                  thumbColor={privacidad.mostrar_direccion ? colores.primario : colores.superficie}
                  ios_backgroundColor={colores.borde}
                />
              </View>
              <View style={estilos.filaPreferencia}>
                <Text style={estilos.preferenciaTexto}>Mostrar mi teléfono</Text>
                <Switch
                  value={privacidad.mostrar_telefono}
                  onValueChange={(v) => cambiarPreferencia('mostrar_telefono', v)}
                  disabled={guardandoPrivacidad}
                  trackColor={{ false: colores.borde, true: colores.verde[300] }}
                  thumbColor={privacidad.mostrar_telefono ? colores.primario : colores.superficie}
                  ios_backgroundColor={colores.borde}
                />
              </View>
            </View>
          )}
        </>
      )}
      <DialogoConfirmacion
        visible={sesionPorCerrar !== null}
        titulo={sesionPorCerrar?.actual ? 'Cerrar esta sesión' : 'Cerrar sesión remota'}
        mensaje={
          sesionPorCerrar?.actual
            ? 'Es la sesión de este dispositivo: tendrás que iniciar sesión de nuevo.'
            : 'Ese dispositivo perderá el acceso de inmediato.'
        }
        etiquetaConfirmar="Cerrar sesión"
        tono="peligro"
        onConfirmar={() => {
          const sesion = sesionPorCerrar;
          setSesionPorCerrar(null);
          cerrarSesion(sesion);
        }}
        onCancelar={() => setSesionPorCerrar(null)}
      />
      <DialogoAviso
        visible={aviso !== null}
        titulo={aviso?.titulo || ''}
        mensaje={aviso?.mensaje}
        tono={aviso?.tono}
        onCerrar={() => {
          const seguir = aviso?.alCerrar;
          setAviso(null);
          if (seguir) seguir();
        }}
      />
    </VistaConTeclado>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: 20, paddingBottom: 40 },
  seccion: { fontSize: 17, fontWeight: 'bold', color: colores.primario, marginTop: 18, marginBottom: 6 },
  ayudaSeccion: { color: colores.textoSuave, fontSize: 13, marginBottom: 12 },
  cargando: { marginVertical: 12 },

  avisoError: { backgroundColor: colores.errorSuave, borderRadius: radio.md, padding: 14 },
  avisoErrorTexto: { color: colores.error, marginBottom: 6 },

  tarjetaSesion: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: 14,
    marginBottom: 10,
  },
  sesionInfo: { flex: 1 },
  sesionDispositivo: { fontWeight: 'bold', color: colores.texto },
  sesionDetalle: { color: colores.textoSuave, fontSize: 13, marginTop: 3 },
  botonCerrarSesion: {
    borderWidth: 1,
    borderColor: colores.error,
    borderRadius: radio.sm,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginLeft: 10,
  },
  botonCerrarTexto: { color: colores.error, fontWeight: 'bold', fontSize: 13 },

  tarjetaCambio: { backgroundColor: colores.superficie, borderRadius: radio.md, borderWidth: 1, borderColor: colores.borde, padding: 16 },
  input: {
    borderWidth: 1,
    borderColor: colores.bordeCampo,
    backgroundColor: colores.fondo,
    borderRadius: radio.md,
    padding: 12,
    marginBottom: 10,
    fontSize: 15,
  },
  textoError: { color: colores.error, fontSize: 13, marginBottom: 4 },

  botonPrimario: {
    backgroundColor: colores.primario,
    borderRadius: radio.md,
    padding: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  botonPrimarioTexto: { color: colores.superficie, fontWeight: 'bold' },
  deshabilitado: { opacity: 0.6 },
  enlace: { color: colores.primario, textAlign: 'center', marginTop: 12, fontWeight: '600' },

  tarjetaPrivacidad: { backgroundColor: colores.superficie, borderRadius: radio.md, borderWidth: 1, borderColor: colores.borde, padding: 6 },
  filaPreferencia: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  preferenciaTexto: { color: colores.texto, fontSize: 15 },
});
