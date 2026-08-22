// Ruta: fro-vista/src/components/TabSelector.js
//
// Barra de pestañas horizontal reutilizable. Se implementa con componentes
// básicos de React Native para no sumar dependencias nativas al proyecto.

import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function TabSelector({ tabs, tabActiva, onCambiarTab, color = '#2e7d32' }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.barra}
      contentContainerStyle={styles.contenido}
    >
      {tabs.map((tab) => {
        const activa = tab.key === tabActiva;

        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activa && { borderBottomColor: color }]}
            onPress={() => onCambiarTab(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activa }}
          >
            {tab.icono ? <Text style={styles.icono}>{tab.icono}</Text> : null}
            <Text style={[styles.etiqueta, activa && { color, fontWeight: 'bold' }]}>
              {tab.titulo}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexGrow: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  contenido: {
    paddingHorizontal: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  icono: {
    fontSize: 15,
    marginRight: 6,
  },
  etiqueta: {
    fontSize: 14,
    color: '#666',
  },
});
