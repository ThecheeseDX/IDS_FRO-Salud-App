// Ruta: fro-vista/src/screens/Paciente/PerfilProfesionalScreen.js
//
// CU10/CU14 — Perfil público del profesional, tal como él lo ve en "Mi perfil
// público" pero de solo lectura: foto, especialidad, reseña curricular, áreas
// de experticia, modalidad, comunas donde atiende y sus valoraciones (CU58).
// Se abre al tocar su nombre en Buscar y agendar cita.

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

import { getPerfilPublicoProfesional, getResenasProfesional } from '../../api/client';
import ErrorRetry from '../../components/ErrorRetry';
import { formatearFecha } from '../../utils/fechas';
import { colores, espacio, piezas, radio, tipografia, interaccion } from '../../theme';

const MODALIDAD = {
  DOMICILIO: 'A domicilio',
  ONLINE: 'Virtual',
  AMBOS: 'A domicilio y virtual',
};

// En el perfil se muestran los comentarios más recientes; el resto, en
// "Ver todas las evaluaciones".
const RESENAS_VISIBLES = 3;

export default function PerfilProfesionalScreen({ route, navigation }) {
  const { profesionalId, nombre } = route?.params || {};
  const [perfil, setPerfil] = useState(null);
  const [resenas, setResenas] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (nombre) navigation.setOptions?.({ title: nombre });
  }, [navigation, nombre]);

  const cargar = useCallback(async () => {
    setError(false);
    setPerfil(null);
    try {
      const [datosPerfil, datosResenas] = await Promise.all([
        getPerfilPublicoProfesional(profesionalId),
        // Las valoraciones son un complemento: si fallan, el perfil se ve igual.
        getResenasProfesional(profesionalId).catch(() => null),
      ]);
      setPerfil(datosPerfil);
      setResenas(datosResenas);
    } catch {
      setError(true);
    }
  }, [profesionalId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) {
    return (
      <View style={estilos.centrado}>
        <ErrorRetry mensaje="No pudimos cargar el perfil del profesional." onRetry={cargar} />
      </View>
    );
  }
  if (!perfil) {
    return (
      <View style={estilos.centrado}>
        <ActivityIndicator size="large" color={colores.primario} />
      </View>
    );
  }

  const nombreCompleto = [perfil.nombres, perfil.apellido_paterno, perfil.apellido_materno]
    .filter(Boolean)
    .join(' ');
  const iniciales = `${perfil.nombres?.[0] || ''}${perfil.apellido_paterno?.[0] || ''}`.toUpperCase();
  const promedio = Number(perfil.calificacion_promedio || 0);
  const comentarios = resenas?.resenas || [];

  const verEvaluaciones = () =>
    navigation.navigate('ResenasProfesional', { profesionalId, nombre: nombreCompleto });

  return (
    <ScrollView style={estilos.fondo} contentContainerStyle={estilos.contenido}>
      {/* Fotografía, especialidad y calificación */}
      <View style={estilos.bloqueFoto}>
        {perfil.foto_url ? (
          <Image source={{ uri: perfil.foto_url }} style={estilos.foto} />
        ) : (
          <View style={[estilos.foto, estilos.fotoVacia]}>
            <Text style={estilos.iniciales}>{iniciales || '👤'}</Text>
          </View>
        )}
        <View style={estilos.fotoTexto}>
          <Text style={estilos.nombre}>{nombreCompleto}</Text>
          <Text style={estilos.meta}>
            {perfil.especialidad || 'Sin especialidad'}
            {perfil.num_registro_salud ? ` · Reg. ${perfil.num_registro_salud}` : ''}
          </Text>
          {perfil.total_evaluaciones > 0 ? (
            <Text style={estilos.calificacion}>
              {'★'.repeat(Math.round(promedio))}
              {'☆'.repeat(5 - Math.round(promedio))}{'  '}
              {promedio.toFixed(1)} ({perfil.total_evaluaciones})
            </Text>
          ) : (
            <Text style={estilos.ayuda}>Perfil nuevo · sin evaluaciones aún</Text>
          )}
        </View>
      </View>

      <Text style={estilos.etiqueta}>Reseña curricular</Text>
      <Text style={[estilos.valor, !perfil.resena_curricular && estilos.valorVacio]}>
        {perfil.resena_curricular || 'El profesional aún no escribe su reseña.'}
      </Text>

      <Text style={estilos.etiqueta}>Áreas de experticia</Text>
      <Text style={[estilos.valor, !perfil.areas_experticia && estilos.valorVacio]}>
        {perfil.areas_experticia || 'Sin áreas informadas.'}
      </Text>

      <Text style={estilos.etiqueta}>Modalidad de atención</Text>
      <Text style={estilos.valor}>{MODALIDAD[perfil.tipo_sede] || 'No informada'}</Text>

      <Text style={estilos.etiqueta}>Comunas donde atiende a domicilio</Text>
      {perfil.tipo_sede === 'ONLINE' ? (
        <Text style={[estilos.valor, estilos.valorVacio]}>Atiende solo de forma virtual.</Text>
      ) : (perfil.comunas || []).length === 0 ? (
        // Sin comunas declaradas aparece en las búsquedas de todas las comunas.
        <Text style={[estilos.valor, estilos.valorVacio]}>No ha limitado sus comunas de atención.</Text>
      ) : (
        <View style={estilos.comunas}>
          {perfil.comunas.map((c) => (
            <View key={c.comuna_id} style={estilos.comuna}>
              <Text style={estilos.comunaTexto}>{c.nombre}</Text>
            </View>
          ))}
        </View>
      )}

      {/* CU58: valoraciones de pacientes atendidos */}
      <Text style={estilos.etiqueta}>Valoraciones</Text>
      <View style={estilos.resumen}>
        <Text style={estilos.numero}>{perfil.total_evaluaciones > 0 ? promedio.toFixed(1) : '—'}</Text>
        <Text style={estilos.estrellas}>
          {'★'.repeat(Math.round(promedio))}
          {'☆'.repeat(5 - Math.round(promedio))}
        </Text>
        <Text style={estilos.total}>
          {perfil.total_evaluaciones > 0
            ? `${perfil.total_evaluaciones} evaluación(es) de pacientes atendidos`
            : 'Perfil nuevo: todavía no tiene evaluaciones.'}
        </Text>
      </View>

      {comentarios.slice(0, RESENAS_VISIBLES).map((r) => (
        <View key={r.evaluacion_satisfaccion_id} style={estilos.tarjeta}>
          <View style={estilos.cabecera}>
            <Text style={estilos.estrellasChicas}>
              {'★'.repeat(r.puntuacion)}
              {'☆'.repeat(5 - r.puntuacion)}
            </Text>
            <Text style={estilos.momento}>{formatearFecha(r.momento_creacion)}</Text>
          </View>
          <Text style={estilos.texto}>“{r.resena}”</Text>
          <Text style={estilos.autor}>— {r.autor || 'Paciente'}</Text>
        </View>
      ))}

      {comentarios.length > RESENAS_VISIBLES && (
        <TouchableOpacity
          style={estilos.botonVerTodas}
          onPress={verEvaluaciones}
          activeOpacity={interaccion.opacidadActiva}
          accessibilityRole="button"
        >
          <Text style={estilos.botonVerTodasTexto}>Ver todas las evaluaciones ({comentarios.length})</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.lg, paddingBottom: espacio.xxl },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: espacio.xl, backgroundColor: colores.fondo },

  // Mismas piezas que "Mi perfil público" del profesional, sin campos editables.
  bloqueFoto: { ...piezas.tarjeta, flexDirection: 'row', alignItems: 'center', marginBottom: espacio.sm },
  foto: { width: 84, height: 84, borderRadius: 42, backgroundColor: colores.primarioSuave },
  fotoVacia: { justifyContent: 'center', alignItems: 'center' },
  iniciales: { ...tipografia.titulo, color: colores.primario },
  fotoTexto: { flex: 1, marginLeft: espacio.base },
  nombre: { ...tipografia.cuerpoFuerte, color: colores.textoTitulo },
  meta: { ...tipografia.meta, color: colores.textoSuave, marginBottom: espacio.sm },
  calificacion: { ...tipografia.meta, color: colores.secundarioFuerte },
  ayuda: { ...tipografia.meta, color: colores.textoTenue },

  etiqueta: { ...piezas.etiqueta, marginTop: espacio.lg },
  valor: { ...piezas.tarjeta, ...tipografia.cuerpo, color: colores.texto },
  valorVacio: { color: colores.textoTenue, fontStyle: 'italic' },

  comunas: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm },
  comuna: {
    paddingVertical: espacio.sm,
    paddingHorizontal: espacio.md,
    borderRadius: radio.completo,
    borderWidth: 1,
    borderColor: colores.primario,
    backgroundColor: colores.primarioSuave,
  },
  comunaTexto: { ...tipografia.meta, color: colores.primario, fontWeight: '600' },

  resumen: {
    ...piezas.tarjeta,
    alignItems: 'center',
    marginBottom: espacio.md,
    backgroundColor: colores.secundarioSuave,
    borderColor: colores.secundarioBorde,
  },
  numero: { ...tipografia.display, fontSize: 44, lineHeight: 50, color: colores.secundarioFuerte },
  estrellas: { fontSize: 22, color: colores.secundario, letterSpacing: 3 },
  total: { ...tipografia.meta, color: colores.textoSuave, marginTop: espacio.sm, textAlign: 'center' },

  tarjeta: { ...piezas.tarjeta, marginBottom: espacio.md },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  estrellasChicas: { fontSize: 15, color: colores.secundario, letterSpacing: 2 },
  momento: { ...tipografia.micro, color: colores.textoTenue },
  texto: { ...tipografia.cuerpo, color: colores.texto, marginTop: espacio.sm, fontStyle: 'italic' },
  autor: { ...tipografia.meta, color: colores.textoSuave, marginTop: espacio.sm, fontStyle: 'italic' },

  botonVerTodas: { ...piezas.botonSecundario },
  botonVerTodasTexto: { ...tipografia.cuerpoFuerte, color: colores.primario },
});
