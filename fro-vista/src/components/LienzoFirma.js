// Ruta: fro-vista/src/components/LienzoFirma.js
//
// Lienzo táctil para capturar la firma manuscrita (CU42). Registra los trazos
// como listas de puntos {x, y} y los dibuja con SVG; los mismos trazos se
// guardan en el servidor y permiten re-renderizar la firma después.

import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, PanResponder, StyleSheet } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

const ALTO_LIENZO = 220;

export default function LienzoFirma({ onCambio }) {
  const [trazos, setTrazos] = useState([]);
  const trazoActual = useRef([]);
  const [, forzarRender] = useState(0);

  const notificar = (lista) => {
    if (onCambio) onCambio(lista);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evento) => {
        const { locationX, locationY } = evento.nativeEvent;
        trazoActual.current = [{ x: locationX, y: locationY }];
        forzarRender((n) => n + 1);
      },
      onPanResponderMove: (evento) => {
        const { locationX, locationY } = evento.nativeEvent;
        trazoActual.current.push({ x: locationX, y: locationY });
        forzarRender((n) => n + 1);
      },
      onPanResponderRelease: () => {
        if (trazoActual.current.length >= 2) {
          setTrazos((previos) => {
            const nuevos = [...previos, trazoActual.current.map((p) => ({
              x: Math.round(p.x * 10) / 10,
              y: Math.round(p.y * 10) / 10,
            }))];
            notificar(nuevos);
            return nuevos;
          });
        }
        trazoActual.current = [];
        forzarRender((n) => n + 1);
      },
    })
  ).current;

  const limpiar = () => {
    setTrazos([]);
    trazoActual.current = [];
    notificar([]);
  };

  const aPuntosSVG = (trazo) => trazo.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View>
      <View style={estilos.lienzo} {...panResponder.panHandlers}>
        <Svg width="100%" height={ALTO_LIENZO}>
          {trazos.map((trazo, i) => (
            <Polyline
              key={i}
              points={aPuntosSVG(trazo)}
              fill="none"
              stroke="#1c3d5a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {trazoActual.current.length >= 2 && (
            <Polyline
              points={aPuntosSVG(trazoActual.current)}
              fill="none"
              stroke="#1c3d5a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </Svg>
        {trazos.length === 0 && trazoActual.current.length === 0 && (
          <Text style={estilos.marcaAgua} pointerEvents="none">
            Firma aquí
          </Text>
        )}
      </View>
      <TouchableOpacity onPress={limpiar}>
        <Text style={estilos.limpiar}>Limpiar lienzo</Text>
      </TouchableOpacity>
    </View>
  );
}

const estilos = StyleSheet.create({
  lienzo: {
    height: ALTO_LIENZO,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#0052cc',
    borderRadius: 12,
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  marcaAgua: {
    position: 'absolute',
    alignSelf: 'center',
    color: '#c5cdd8',
    fontSize: 22,
    fontStyle: 'italic',
  },
  limpiar: { color: '#d32f2f', fontWeight: '600', textAlign: 'right', marginTop: 8 },
});
