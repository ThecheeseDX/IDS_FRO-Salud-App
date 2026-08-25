// Ruta: fro-vista/src/screens/Auth/RecuperarContrasenaScreen.js
//
// CU06 + CU07: recuperación de contraseña olvidada en dos pasos.
// Paso 1: se pide el correo y se envía un código OTP.
// Paso 2: código + contraseña nueva; el servidor valida robustez y expiración.

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';

import apiClient from '../../api/client';
import VistaConTeclado from '../../components/VistaConTeclado';

export default function RecuperarContrasenaScreen({ navigation }) {
  const [paso, setPaso] = useState(1);
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [requisitos, setRequisitos] = useState([]);

  // ── Paso 1: solicitar el código ────────────────────────────────────────────
  const solicitarCodigo = async () => {
    const correo = email.trim().toLowerCase();

    // CU06 — Excepción 3: formato inválido se bloquea antes de enviar.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    setCargando(true);
    setError('');
    try {
      const { data } = await apiClient.post('/auth/recuperar/solicitar', { email: correo });
      Alert.alert('Revisa tu correo', data?.mensaje || 'Si el correo está registrado, recibirás un código.');
      setPaso(2);
    } catch (err) {
      const respuesta = err.response?.data;
      setError(respuesta?.mensaje || 'No se pudo procesar la solicitud. Revisa tu conexión.');
    } finally {
      setCargando(false);
    }
  };

  // ── Paso 2: confirmar código y contraseña nueva ────────────────────────────
  const cambiarContrasena = async () => {
    setRequisitos([]);
    setError('');

    // CU07 — Excepción 1: el código es numérico de 6 dígitos.
    if (!/^\d{6}$/.test(codigo.trim())) {
      setError('El código son los 6 dígitos que llegaron a tu correo.');
      return;
    }
    if (nuevaContrasena !== confirmar) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setCargando(true);
    try {
      const { data } = await apiClient.post('/auth/recuperar/confirmar', {
        email: email.trim().toLowerCase(),
        codigo: codigo.trim(),
        nueva_contrasena: nuevaContrasena,
      });
      Alert.alert('Contraseña actualizada', data?.mensaje || 'Ya puedes iniciar sesión.', [
        { text: 'Iniciar sesión', onPress: () => navigation.replace('Login') },
      ]);
    } catch (err) {
      const respuesta = err.response?.data;
      // CU07 — Excepción 3: se muestran los requisitos incumplidos.
      if (respuesta?.error === 'CONTRASENA_DEBIL') {
        setRequisitos(respuesta.requisitos || []);
        setError(respuesta.mensaje);
      } else {
        setError(respuesta?.mensaje || 'No se pudo cambiar la contraseña. Intenta nuevamente.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <VistaConTeclado style={estilos.fondo} contentContainerStyle={estilos.contenedor}>
      <View style={estilos.tarjeta}>
        <Text style={estilos.titulo}>Recuperar contraseña</Text>

        {paso === 1 ? (
          <>
            <Text style={estilos.subtitulo}>
              Ingresa el correo de tu cuenta y te enviaremos un código de verificación.
            </Text>
            <TextInput
              style={estilos.input}
              placeholder="correo@ejemplo.cl"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!cargando}
            />
          </>
        ) : (
          <>
            <Text style={estilos.subtitulo}>
              Escribe el código que llegó a {email.trim()} y tu contraseña nueva.
            </Text>
            <TextInput
              style={[estilos.input, estilos.inputCodigo]}
              placeholder="Código de 6 dígitos"
              keyboardType="numeric"
              maxLength={6}
              value={codigo}
              onChangeText={(t) => setCodigo(t.replace(/[^0-9]/g, ''))}
              editable={!cargando}
            />
            <TextInput
              style={estilos.input}
              placeholder="Contraseña nueva"
              secureTextEntry
              value={nuevaContrasena}
              onChangeText={setNuevaContrasena}
              editable={!cargando}
            />
            <TextInput
              style={estilos.input}
              placeholder="Confirmar contraseña nueva"
              secureTextEntry
              value={confirmar}
              onChangeText={setConfirmar}
              editable={!cargando}
            />
            <Text style={estilos.ayuda}>Mínimo 8 caracteres, con letras y números.</Text>
          </>
        )}

        {error ? <Text style={estilos.error}>{error}</Text> : null}
        {requisitos.map((requisito) => (
          <Text key={requisito} style={estilos.error}>• {requisito}</Text>
        ))}

        <TouchableOpacity
          style={[estilos.boton, cargando && estilos.botonDeshabilitado]}
          onPress={paso === 1 ? solicitarCodigo : cambiarContrasena}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={estilos.botonTexto}>
              {paso === 1 ? 'Enviar código' : 'Cambiar contraseña'}
            </Text>
          )}
        </TouchableOpacity>

        {paso === 2 && (
          <TouchableOpacity onPress={solicitarCodigo} disabled={cargando}>
            <Text style={estilos.enlace}>Reenviar código</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => navigation.goBack()} disabled={cargando}>
          <Text style={estilos.enlace}>Volver al inicio de sesión</Text>
        </TouchableOpacity>
      </View>
    </VistaConTeclado>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#f4f6f8' },
  contenedor: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  tarjeta: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  titulo: { fontSize: 22, fontWeight: 'bold', color: '#1c3d5a', marginBottom: 8 },
  subtitulo: { color: '#555', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fafafa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 15,
  },
  inputCodigo: { letterSpacing: 6, fontSize: 18, textAlign: 'center' },
  ayuda: { color: '#888', fontSize: 12, marginBottom: 4 },
  error: { color: '#d32f2f', marginTop: 4, fontSize: 13 },
  boton: {
    backgroundColor: '#0052cc',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  botonDeshabilitado: { opacity: 0.6 },
  botonTexto: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  enlace: { color: '#0052cc', textAlign: 'center', marginTop: 16, fontWeight: '600' },
});
