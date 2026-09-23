// Ruta: fro-vista/src/screens/Comun/ConversacionesScreen.js
//
// CU53 — Bandeja de conversaciones. Cada chat cuelga de un episodio clínico,
// así que la lista es la de los episodios en los que el usuario participa:
// para el paciente son sus tratamientos, para el profesional sus pacientes.
//
// Los episodios cerrados siguen apareciendo, al final y marcados: su
// conversación queda como historial de solo lectura (Excepción 3).

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, RefreshControl,
  ActivityIndicator, StyleSheet,
} from 'react-native';

import { getMisConversaciones } from '../../api/client';
import ErrorRetry from '../../components/ErrorRetry';
import { formatearFechaHora } from '../../utils/fechas';
import { colores, espacio, piezas, radio, tipografia, interaccion } from '../../theme';

export default function ConversacionesScreen({ navigation }) {
  const [conversaciones, setConversaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(false);

  const cargar = useCallback(async (esRefresco = false) => {
    if (esRefresco) setRefrescando(true);
    else setCargando(true);
    setError(false);
    try {
      const { conversaciones: recibidas } = await getMisConversaciones();
      setConversaciones(recibidas || []);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    // Al volver del chat, los contadores de no leídos cambian.
    const quitar = navigation.addListener('focus', () => cargar(true));
    return quitar;
  }, [cargar, navigation]);

  if (cargando) {
    return (
      <View style={estilos.centrado}>
        <ActivityIndicator size="large" color={colores.primario} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={estilos.centrado}>
        <ErrorRetry mensaje="No pudimos cargar tus conversaciones." onRetry={() => cargar()} />
      </View>
    );
  }

  return (
    <ScrollView
      style={estilos.fondo}
      contentContainerStyle={estilos.contenido}
      refreshControl={
        <RefreshControl refreshing={refrescando} onRefresh={() => cargar(true)} colors={[colores.primario]} />
      }
    >
      <Text style={estilos.intro}>
        Canal directo con tu equipo de tratamiento. Los mensajes viajan cifrados y solo los
        ven los dos participantes.
      </Text>

      {conversaciones.length === 0 ? (
        <View style={estilos.vacio}>
          <Text style={estilos.vacioIcono}>💬</Text>
          <Text style={estilos.vacioTitulo}>Sin conversaciones</Text>
          <Text style={estilos.vacioTexto}>
            El chat se abre con cada episodio clínico. Cuando tengas uno en curso, aparecerá aquí.
          </Text>
        </View>
      ) : (
        conversaciones.map((c) => {
          const cerrado = String(c.estado || '').toUpperCase() === 'CERRADO';
          return (
            <TouchableOpacity
              key={c.episodio_clinico_id}
              style={[estilos.tarjeta, cerrado && estilos.tarjetaCerrada]}
              onPress={() =>
                navigation.navigate('ChatClinico', {
                  episodioId: c.episodio_clinico_id,
                  nombreOtro: c.con,
                })
              }
              activeOpacity={interaccion.opacidadActiva}
            >
              <View style={estilos.cuerpo}>
                <Text style={estilos.nombre}>{c.con}</Text>
                <Text style={estilos.motivo} numberOfLines={1}>
                  {c.motivo_consulta || 'Sin motivo registrado'}
                  {cerrado ? ' · episodio cerrado' : ''}
                </Text>
                <Text style={estilos.momento}>
                  {c.ultimo_momento
                    ? `Último mensaje: ${formatearFechaHora(c.ultimo_momento)}`
                    : 'Sin mensajes todavía'}
                </Text>
              </View>

              {c.sin_leer > 0 && (
                <View style={estilos.globo}>
                  <Text style={estilos.globoTexto}>{c.sin_leer}</Text>
                </View>
              )}
              <Text style={estilos.chevron}>›</Text>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.lg, paddingBottom: espacio.xxl },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: espacio.xl, backgroundColor: colores.fondo },
  intro: { ...tipografia.meta, color: colores.textoSuave, marginBottom: espacio.base },

  tarjeta: { ...piezas.tarjeta, flexDirection: 'row', alignItems: 'center', marginBottom: espacio.md },
  tarjetaCerrada: { backgroundColor: colores.superficieSuave },
  cuerpo: { flex: 1 },
  nombre: { ...tipografia.cuerpoFuerte, color: colores.textoTitulo },
  motivo: { ...tipografia.meta, color: colores.textoSuave, marginTop: 2 },
  momento: { ...tipografia.micro, color: colores.textoTenue, marginTop: espacio.xs },

  globo: {
    minWidth: 22,
    height: 22,
    borderRadius: radio.completo,
    paddingHorizontal: 6,
    backgroundColor: colores.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: espacio.sm,
  },
  globoTexto: { ...tipografia.micro, color: colores.textoInverso },
  chevron: { fontSize: 24, color: colores.textoDeshabilitado },

  vacio: { alignItems: 'center', paddingTop: espacio.xxxl },
  vacioIcono: { fontSize: 44, marginBottom: espacio.md },
  vacioTitulo: { ...tipografia.subtitulo, color: colores.textoTitulo, marginBottom: espacio.xs },
  vacioTexto: { ...tipografia.meta, color: colores.textoSuave, textAlign: 'center', paddingHorizontal: espacio.xl },
});
