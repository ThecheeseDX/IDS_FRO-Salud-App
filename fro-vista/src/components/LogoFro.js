// Ruta: fro-vista/src/components/LogoFro.js
//
// Logo oficial de FRO Salud. Un solo componente para todos los lugares donde
// aparece (cabecera de navegación, login, registro, splash), de modo que el
// archivo del logo y sus proporciones se cambien en un único sitio.

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

import { colores, tipografia, espacio } from '../theme';

const LOGO = require('../../assets/logo-fro.png');

// El archivo es cuadrado pero la marca ocupa una banda horizontal al centro,
// así que se recorta con un alto proporcional para que no quede flotando en
// medio de mucho aire.
const PROPORCION = 2.6;

/**
 * @param {'sm'|'md'|'lg'} tamano  alto de la marca
 * @param {boolean} conNombre      muestra "Salud" bajo el logotipo
 */
export default function LogoFro({ tamano = 'md', conNombre = false, style }) {
  const alto = { sm: 22, md: 34, lg: 52 }[tamano] || 34;

  return (
    <View style={[estilos.contenedor, style]}>
      <Image
        source={LOGO}
        style={{ height: alto, width: alto * PROPORCION }}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="FRO Salud"
      />
      {conNombre && (
        <Text style={[estilos.nombre, tamano === 'lg' && estilos.nombreGrande]}>
          SALUD
        </Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { alignItems: 'center', justifyContent: 'center' },
  nombre: {
    ...tipografia.micro,
    color: colores.primario,
    letterSpacing: 6,
    marginTop: -espacio.xs,
  },
  nombreGrande: { fontSize: 13, letterSpacing: 9 },
});
