import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import client from "../../api/client";

// ─────────────────────────────────────────────────────────────────────────────
// OTPScreen
// Props esperadas vía navigation.params:
//   - usuario_id  : número
//   - canal       : "EMAIL" | "SMS"
//   - destino     : string enmascarado para mostrar al usuario (ej: "j***@gmail.com")
// ─────────────────────────────────────────────────────────────────────────────

const LARGO_OTP = 6;
const SEGUNDOS_REENVIO = 60;

export default function OTPScreen({ route, navigation }) {
  const { usuario_id, canal = "EMAIL", destino = "" } = route?.params ?? {};

  const [digitos, setDigitos] = useState(Array(LARGO_OTP).fill(""));
  const [cargando, setCargando] = useState(false);
  const [cargandoReenvio, setCargandoReenvio] = useState(false);
  const [segundos, setSegundos] = useState(SEGUNDOS_REENVIO);
  const [error, setError] = useState(null);

  const inputs = useRef([]);

  // ── Cuenta regresiva para reenvío ──────────────────────────────────────────
  useEffect(() => {
    if (segundos <= 0) return;
    const timer = setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [segundos]);

  // ── Manejo de ingreso de dígitos ───────────────────────────────────────────
  function manejarCambio(texto, indice) {
    // Solo acepta un dígito numérico
    const valor = texto.replace(/[^0-9]/g, "").slice(-1);
    const nuevos = [...digitos];
    nuevos[indice] = valor;
    setDigitos(nuevos);
    setError(null);

    // Avanzar al siguiente campo automáticamente
    if (valor && indice < LARGO_OTP - 1) {
      inputs.current[indice + 1]?.focus();
    }
  }

  function manejarRetroceso(e, indice) {
    if (e.nativeEvent.key === "Backspace" && !digitos[indice] && indice > 0) {
      inputs.current[indice - 1]?.focus();
    }
  }

  function codigoCompleto() {
    return digitos.join("");
  }

  // ── Verificar OTP ──────────────────────────────────────────────────────────
  async function verificar() {
    const codigo = codigoCompleto();
    if (codigo.length < LARGO_OTP) {
      setError("Ingresa los 6 dígitos del código.");
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const { data } = await client.post("/auth/otp/verificar", {
        usuario_id,
        codigo,
      });

      Alert.alert("¡Listo!", data.mensaje, [
        { text: "Iniciar sesión", onPress: () => navigation.replace("Login") },
      ]);
    } catch (err) {
      const respuesta = err.response?.data;
      const errorCodigo = respuesta?.error;

      // Excepción 3: código incorrecto o expirado
      if (errorCodigo === "EXPIRADO" || errorCodigo === "CODIGO_INCORRECTO" || errorCodigo === "MAX_INTENTOS") {
        setError(respuesta.mensaje);
        setDigitos(Array(LARGO_OTP).fill(""));
        inputs.current[0]?.focus();
      } else if (errorCodigo === "PERSISTENCIA_FALLIDA") {
        // Excepción 4: falla de escritura en servidor
        Alert.alert(
          "Error al activar cuenta",
          "No se pudo activar tu cuenta. Por favor recarga la pantalla e intenta de nuevo.",
          [{ text: "Entendido" }]
        );
      } else {
        setError("Ocurrió un error inesperado. Intenta de nuevo.");
      }
    } finally {
      setCargando(false);
    }
  }

  // ── Reenviar OTP ───────────────────────────────────────────────────────────
  async function reenviarCodigo() {
    if (segundos > 0) return;

    setCargandoReenvio(true);
    setError(null);

    try {
      const { data } = await client.post("/auth/otp/solicitar", {
        usuario_id,
        canal,
      });

      if (data.ok) {
        setSegundos(SEGUNDOS_REENVIO);
        setDigitos(Array(LARGO_OTP).fill(""));
        inputs.current[0]?.focus();
        Alert.alert("Código reenviado", data.mensaje);
      }
    } catch (err) {
      const errorCodigo = err.response?.data?.error;

      // Excepción 1: falla del servicio de comunicaciones externo
      if (errorCodigo === "ENVIO_FALLIDO") {
        Alert.alert(
          "Error al enviar",
          "No se pudo enviar el código. Verifica tu señal e intenta de nuevo.",
          [{ text: "Reintentar", onPress: reenviarCodigo }, { text: "Cancelar" }]
        );
      } else {
        Alert.alert("Error", "No se pudo reenviar el código. Intenta más tarde.");
      }
    } finally {
      setCargandoReenvio(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={estilos.contenedor}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={estilos.tarjeta}>
        <Text style={estilos.titulo}>Verificación de identidad</Text>
        <Text style={estilos.subtitulo}>
          Ingresa el código de 6 dígitos enviado a{"\n"}
          <Text style={estilos.destino}>{destino}</Text>
        </Text>

        {/* Campos OTP */}
        <View style={estilos.filaOTP}>
          {digitos.map((digito, i) => (
            <TextInput
              key={i}
              ref={(ref) => (inputs.current[i] = ref)}
              style={[estilos.celdaOTP, error && estilos.celdaError]}
              value={digito}
              onChangeText={(texto) => manejarCambio(texto, i)}
              onKeyPress={(e) => manejarRetroceso(e, i)}
              keyboardType="numeric"
              maxLength={1}
              selectTextOnFocus
              autoFocus={i === 0}
            />
          ))}
        </View>

        {/* Mensaje de error */}
        {error && <Text style={estilos.textoError}>{error}</Text>}

        {/* Botón verificar */}
        <TouchableOpacity
          style={[estilos.boton, cargando && estilos.botonDeshabilitado]}
          onPress={verificar}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={estilos.textoBoton}>Verificar código</Text>
          )}
        </TouchableOpacity>

        {/* Reenviar código */}
        <View style={estilos.filareenvio}>
          <Text style={estilos.textoGris}>¿No recibiste el código? </Text>
          {segundos > 0 ? (
            <Text style={estilos.textoGris}>Reenviar en {segundos}s</Text>
          ) : (
            <TouchableOpacity onPress={reenviarCodigo} disabled={cargandoReenvio}>
              {cargandoReenvio ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <Text style={estilos.textoEnlace}>Reenviar ahora</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─ Estilos 
const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 24,
  },
  tarjeta: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 28,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
    alignItems: "center",
  },
  titulo: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitulo: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 20,
  },
  destino: {
    fontWeight: "600",
    color: "#334155",
  },
  filaOTP: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  celdaOTP: {
    width: 44,
    height: 54,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  celdaError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  textoError: {
    color: "#ef4444",
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  boton: {
    width: "100%",
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  textoBoton: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  filareenvio: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  textoGris: {
    color: "#94a3b8",
    fontSize: 13,
  },
  textoEnlace: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "600",
  },
});