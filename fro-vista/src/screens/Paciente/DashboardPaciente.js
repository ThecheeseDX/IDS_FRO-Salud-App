// Ruta: fro-vista/src/screens/Paciente/DashboardPaciente.js
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import apiClient, { getMiDerivacion } from '../../api/client';
import ErrorRetry from '../../components/ErrorRetry';
import { colores, espacio, radio, sombra, tipografia, piezas, interaccion } from '../../theme';

export default function DashboardPaciente({ navigation }) {
  const { userData, confirmarCierreSesion } = useContext(AuthContext);

  const [isLoading, setIsLoading] = useState(true);
  const [errorRed, setErrorRed] = useState(false);
  // La respuesta ya no se muestra (era un texto técnico de sesión), pero la
  // llamada se mantiene: valida los permisos y detecta la caída del servidor.

  // CU26: a qué especialidad lo deriva su entrevista previa.
  const [derivacion, setDerivacion] = useState(null);

  const cargarDatosProtegidos = async () => {
    setIsLoading(true);
    setErrorRed(false);

    try {
      await apiClient.get('/auth/mi-perfil');
      const datos = await getMiDerivacion().catch(() => null);
      setDerivacion(datos?.hay_triaje ? datos : null);
    } catch (error) {
      if (!error.response || error.response.status >= 500) {
        setErrorRed(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarDatosProtegidos();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.saludo}>Hola,</Text>
        <Text style={styles.title}>{userData?.nombres || 'Usuario'}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="large" color={colores.primario} />
        ) : errorRed ? (
          <ErrorRetry
            mensaje="Hubo un problema al validar tus permisos con el servidor central."
            onRetry={cargarDatosProtegidos}
          />
        ) : (
          <>
            {/* CU26: sugerencia de derivación surgida del triaje. Solo aparece
                cuando el paciente ya completó su entrevista previa. */}
            {derivacion && (
              <View style={styles.tarjetaDerivacion}>
                <Text style={styles.derivacionTitulo}>
                  {derivacion.derivacion?.general
                    ? '🩺 Evaluación general'
                    : `🎯 Te sugerimos ${derivacion.derivacion?.nombre}`}
                </Text>
                <Text style={styles.derivacionTexto}>
                  {derivacion.derivacion?.general
                    ? 'Tu entrevista no apunta a una especialidad concreta. Te recomendamos una evaluación general para orientarte.'
                    : derivacion.derivacion?.disponible_en_comuna
                      ? `Según lo que contaste, es la especialidad que mejor calza con tu motivo de consulta. Hay profesionales que atienden a domicilio en ${derivacion.derivacion?.comuna || 'tu comuna'}.`
                      : derivacion.derivacion?.disponible_online
                        ? 'Según lo que contaste, es la especialidad que mejor calza contigo. En tu comuna no hay atención a domicilio, pero sí teleconsulta.'
                        : 'Según lo que contaste, es la especialidad que mejor calza contigo, pero por ahora no tenemos profesionales disponibles para tu comuna.'}
                </Text>

                {/* Excepción 2: sin cobertura en su comuna se ofrecen las
                    especialidades que sí tienen profesionales. */}
                {derivacion.derivacion?.alternativas?.length > 0 && (
                  <Text style={styles.derivacionAlternativas}>
                    Disponibles ahora: {derivacion.derivacion.alternativas.map((a) => a.nombre).join(', ')}.
                  </Text>
                )}

                <TouchableOpacity
                  onPress={() => navigation.navigate('BuscarCita')}
                  activeOpacity={interaccion.opacidadActiva}
                >
                  <Text style={styles.derivacionEnlace}>Buscar hora con esta orientación →</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* CU14 + CU15: gestión de citas unificada (ver, agendar y cancelar) */}
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => navigation.navigate('MisCitas')}
              activeOpacity={interaccion.opacidadActiva}
            >
              <View style={styles.menuIconoCaja}>
                <Text style={styles.menuIcon}>📅</Text>
              </View>
              <View style={styles.menuTexto}>
                <Text style={styles.menuTitle}>Mis Citas</Text>
                <Text style={styles.menuSubtitle}>
                  Revisa tus horas agendadas y reserva nuevas desde un mismo lugar.
                </Text>
              </View>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>

            {/* CU23/CU27: entrevista de triaje previa a la consulta */}
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => navigation.navigate('Triaje')}
              activeOpacity={interaccion.opacidadActiva}
            >
              <View style={styles.menuIconoCaja}>
                <Text style={styles.menuIcon}>🩺</Text>
              </View>
              <View style={styles.menuTexto}>
                <Text style={styles.menuTitle}>Entrevista Previa</Text>
                <Text style={styles.menuSubtitle}>
                  Responde unas preguntas antes de tu consulta para adelantar tu ficha.
                </Text>
              </View>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>

            {/* CU48: rutinas de ejercicio del tratamiento */}
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => navigation.navigate('MisPautas')}
              activeOpacity={interaccion.opacidadActiva}
            >
              <View style={styles.menuIconoCaja}>
                <Text style={styles.menuIcon}>🏋️</Text>
              </View>
              <View style={styles.menuTexto}>
                <Text style={styles.menuTitle}>Mis Ejercicios</Text>
                <Text style={styles.menuSubtitle}>
                  Revisa tu rutina del día y marca los ejercicios que completes.
                </Text>
              </View>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>

            {/* CU53: canal directo con el profesional tratante */}
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => navigation.navigate('Conversaciones')}
              activeOpacity={interaccion.opacidadActiva}
            >
              <View style={styles.menuIconoCaja}>
                <Text style={styles.menuIcon}>💬</Text>
              </View>
              <View style={styles.menuTexto}>
                <Text style={styles.menuTitle}>Mensajes</Text>
                <Text style={styles.menuSubtitle}>
                  Escríbele a tu profesional. La conversación viaja cifrada.
                </Text>
              </View>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>

            {/* CU45: panel gráfico con adherencia, síntomas y asistencia */}
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => navigation.navigate('MiProgreso')}
              activeOpacity={interaccion.opacidadActiva}
            >
              <View style={styles.menuIconoCaja}>
                <Text style={styles.menuIcon}>📊</Text>
              </View>
              <View style={styles.menuTexto}>
                <Text style={styles.menuTitle}>Mi Progreso</Text>
                <Text style={styles.menuSubtitle}>
                  Tu evolución en gráficos: dolor, cumplimiento de ejercicios y sesiones.
                </Text>
              </View>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>

            {/* CU50: reporte de evolución entre sesiones */}
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => navigation.navigate('MiSeguimiento')}
              activeOpacity={interaccion.opacidadActiva}
            >
              <View style={styles.menuIconoCaja}>
                <Text style={styles.menuIcon}>📈</Text>
              </View>
              <View style={styles.menuTexto}>
                <Text style={styles.menuTitle}>Mi Seguimiento</Text>
                <Text style={styles.menuSubtitle}>
                  Cuenta cómo vas entre sesiones: si algo empeora, avisamos a tu profesional.
                </Text>
              </View>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>

            {/* CU66/CU67: bonos, copagos y planes de sesiones */}
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => navigation.navigate('Pagos')}
              activeOpacity={interaccion.opacidadActiva}
            >
              <View style={styles.menuIconoCaja}>
                <Text style={styles.menuIcon}>💳</Text>
              </View>
              <View style={styles.menuTexto}>
                <Text style={styles.menuTitle}>Pagos y Bonos</Text>
                <Text style={styles.menuSubtitle}>
                  Valida tus bonos de cobertura, paga tus copagos y compra planes.
                </Text>
              </View>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>

            {/* CU35: repositorio de documentos clínicos con visor embebido */}
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => navigation.navigate('Documentos')}
              activeOpacity={interaccion.opacidadActiva}
            >
              <View style={styles.menuIconoCaja}>
                <Text style={styles.menuIcon}>📁</Text>
              </View>
              <View style={styles.menuTexto}>
                <Text style={styles.menuTitle}>Mis Documentos</Text>
                <Text style={styles.menuSubtitle}>
                  Consulta tus exámenes e informes clínicos sin descargarlos.
                </Text>
              </View>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>

            {/* CU60: solicitudes de soporte y su seguimiento */}
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => navigation.navigate('Soporte')}
              activeOpacity={interaccion.opacidadActiva}
            >
              <View style={styles.menuIconoCaja}>
                <Text style={styles.menuIcon}>🎫</Text>
              </View>
              <View style={styles.menuTexto}>
                <Text style={styles.menuTitle}>Ayuda y Soporte</Text>
                <Text style={styles.menuSubtitle}>
                  Reporta un problema y sigue el estado de tus solicitudes.
                </Text>
              </View>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>

            {/* CU07/CU08/CU09: seguridad de la cuenta */}
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => navigation.navigate('Seguridad')}
              activeOpacity={interaccion.opacidadActiva}
            >
              <View style={styles.menuIconoCaja}>
                <Text style={styles.menuIcon}>🔐</Text>
              </View>
              <View style={styles.menuTexto}>
                <Text style={styles.menuTitle}>Seguridad y privacidad</Text>
                <Text style={styles.menuSubtitle}>
                  Cambia tu contraseña, revisa tus sesiones y decide qué datos compartes.
                </Text>
              </View>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={confirmarCierreSesion}
        activeOpacity={interaccion.opacidadActiva}
      >
        <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colores.fondo },

  // La cabecera ya no es un bloque de color: el azul de marca se reserva para
  // los acentos y el saludo respira sobre fondo claro.
  header: {
    paddingHorizontal: espacio.lg,
    paddingTop: espacio.lg,
    paddingBottom: espacio.base,
    backgroundColor: colores.fondo,
  },
  saludo: { ...tipografia.cuerpo, color: colores.textoSuave },
  title: { ...tipografia.display, color: colores.textoTitulo },

  scroll: { flex: 1 },
  content: { padding: espacio.lg, paddingTop: espacio.xs, paddingBottom: espacio.sm },


  // CU26 — la orientación que sale del triaje, antes que el resto del menú.
  tarjetaDerivacion: {
    ...piezas.tarjeta,
    backgroundColor: colores.secundarioSuave,
    borderColor: colores.secundarioBorde,
    marginBottom: espacio.base,
  },
  derivacionTitulo: { ...tipografia.cuerpoFuerte, color: colores.secundarioFuerte },
  derivacionTexto: { ...tipografia.meta, color: colores.texto, marginTop: espacio.xs },
  derivacionAlternativas: { ...tipografia.meta, color: colores.textoSuave, marginTop: espacio.sm },
  derivacionEnlace: { ...tipografia.metaFuerte, color: colores.primario, marginTop: espacio.md },

  // Fila: ícono en pastilla de marca, texto a la izquierda, chevron al final.
  menuBtn: {
    ...piezas.tarjeta,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: espacio.md,
  },
  menuIconoCaja: {
    width: 46,
    height: 46,
    borderRadius: radio.md,
    backgroundColor: colores.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: espacio.base,
  },
  menuIcon: { fontSize: 22 },
  menuTexto: { flex: 1 },
  menuTitle: { ...tipografia.cuerpoFuerte, color: colores.textoTitulo, marginBottom: 2 },
  menuSubtitle: { ...tipografia.meta, color: colores.textoSuave },
  menuChevron: { fontSize: 28, color: colores.textoDeshabilitado, marginLeft: espacio.sm },

  // Cerrar sesión es destructivo pero secundario: contorno, no bloque rojo.
  // Solo el botón: sin panel de color detrás.
  logoutButton: {
    marginHorizontal: espacio.lg,
    marginBottom: espacio.lg,
    paddingVertical: espacio.md,
    borderRadius: radio.md,
    borderWidth: 1.5,
    borderColor: colores.error,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  logoutButtonText: { ...tipografia.cuerpoFuerte, color: colores.error },
});
