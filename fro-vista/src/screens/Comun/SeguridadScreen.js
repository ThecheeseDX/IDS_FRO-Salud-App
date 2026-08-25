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

export default function SeguridadScreen() {
  const { userData, logoutSession } = useContext(AuthContext);
  const esPaciente = userData?.rol === 'Paciente';

  // ── CU08: sesiones ─────────────────────────────────────────────────────────
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
  const confirmarCierre = (sesion) => {
    Alert.alert(
      sesion.actual ? 'Cerrar esta sesión' : 'Cerrar sesión remota',
      sesion.actual
        ? 'Es la sesión de este dispositivo: tendrás que iniciar sesión de nuevo.'
        : `El dispositivo "${sesion.dispositivo}" perderá el acceso de inmediato.`,
      [
        { text: 'Volver', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: () => cerrarSesion(sesion) },
      ]
    );
  };

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
      Alert.alert('Aviso', respuesta?.mensaje || 'No se pudo cerrar la sesión.');
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
      Alert.alert('Error', 'No se pudo enviar el código. Intenta nuevamente.');
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
      Alert.alert('Contraseña actualizada', data?.mensaje || 'Vuelve a iniciar sesión.', [
        { text: 'Entendido', onPress: logoutSession },
      ]);
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
      Alert.alert(
        'No se pudo guardar',
        err.response?.data?.mensaje || 'Los cambios no se aplicaron. Intenta nuevamente.'
      );
    } finally {
      setGuardandoPrivacidad(false);
    }
  };

  const formatearFecha = (valor) =>
    valor
      ? new Date(valor).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
      : '—';

  return (
    <VistaConTeclado style={estilos.fondo} contentContainerStyle={estilos.contenido}>
      {/* ── CU08: Sesiones activas ── */}
      <Text style={estilos.seccion}>Sesiones activas</Text>
      <Text style={estilos.ayudaSeccion}>
        Estos dispositivos tienen acceso a tu cuenta. Puedes cerrarlos de forma remota.
      </Text>

      {cargandoSesiones ? (
        <ActivityIndicator size="large" color="#0052cc" style={estilos.cargando} />
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
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={estilos.botonPrimarioTexto}>Cambiar contraseña</Text>
          )}
        </TouchableOpacity>
      ) : (
        <View style={estilos.tarjetaCambio}>
          <Text style={estilos.ayudaSeccion}>
            Enviamos un código a {destinoOTP}. Escríbelo junto a tu contraseña nueva.
          </Text>
          <TextInput
            style={[estilos.input, estilos.inputCodigo]}
            placeholder="Código de 6 dígitos"
            keyboardType="numeric"
            maxLength={6}
            value={codigo}
            onChangeText={(t) => setCodigo(t.replace(/[^0-9]/g, ''))}
          />
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
              <ActivityIndicator color="#fff" />
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
            <ActivityIndicator size="small" color="#0052cc" style={estilos.cargando} />
          ) : (
            <View style={estilos.tarjetaPrivacidad}>
              <View style={estilos.filaPreferencia}>
                <Text style={estilos.preferenciaTexto}>Mostrar mi dirección</Text>
                <Switch
                  value={privacidad.mostrar_direccion}
                  onValueChange={(v) => cambiarPreferencia('mostrar_direccion', v)}
                  disabled={guardandoPrivacidad}
                />
              </View>
              <View style={estilos.filaPreferencia}>
                <Text style={estilos.preferenciaTexto}>Mostrar mi teléfono</Text>
                <Switch
                  value={privacidad.mostrar_telefono}
                  onValueChange={(v) => cambiarPreferencia('mostrar_telefono', v)}
                  disabled={guardandoPrivacidad}
                />
              </View>
            </View>
          )}
        </>
      )}
    </VistaConTeclado>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#f4f6f8' },
  contenido: { padding: 20, paddingBottom: 40 },
  seccion: { fontSize: 18, fontWeight: 'bold', color: '#1c3d5a', marginTop: 18, marginBottom: 6 },
  ayudaSeccion: { color: '#666', fontSize: 13, marginBottom: 12 },
  cargando: { marginVertical: 12 },

  avisoError: { backgroundColor: '#fdecea', borderRadius: 10, padding: 14 },
  avisoErrorTexto: { color: '#b71c1c', marginBottom: 6 },

  tarjetaSesion: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 14,
    marginBottom: 10,
  },
  sesionInfo: { flex: 1 },
  sesionDispositivo: { fontWeight: 'bold', color: '#1f2937' },
  sesionDetalle: { color: '#777', fontSize: 12, marginTop: 3 },
  botonCerrarSesion: {
    borderWidth: 1,
    borderColor: '#d32f2f',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginLeft: 10,
  },
  botonCerrarTexto: { color: '#d32f2f', fontWeight: 'bold', fontSize: 13 },

  tarjetaCambio: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0', padding: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fafafa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    fontSize: 15,
  },
  inputCodigo: { letterSpacing: 6, fontSize: 18, textAlign: 'center' },
  textoError: { color: '#d32f2f', fontSize: 13, marginBottom: 4 },

  botonPrimario: {
    backgroundColor: '#0052cc',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  botonPrimarioTexto: { color: '#fff', fontWeight: 'bold' },
  deshabilitado: { opacity: 0.6 },
  enlace: { color: '#0052cc', textAlign: 'center', marginTop: 12, fontWeight: '600' },

  tarjetaPrivacidad: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0', padding: 6 },
  filaPreferencia: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  preferenciaTexto: { color: '#1f2937', fontSize: 15 },
});
