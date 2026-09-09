// Ruta: fro-vista/src/screens/Profesional/Trazabilidad/TrazabilidadScreen.js
//
// Agrupa las tareas de auditoría y seguridad del documento clínico
// (inalterabilidad y marcas temporales), separadas del trabajo clínico diario.

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import TabSelector from '../../../components/TabSelector';
import InalterabilidadScreen from './InalterabilidadScreen';
import MarcasTemporalesScreen from './MarcasTemporalesScreen';
import { colores, espacio, tipografia } from '../../../theme';

const TABS = [
  {
    key: 'inalterabilidad',
    titulo: 'Inalterabilidad',
    icono: '🔒',
    Componente: InalterabilidadScreen,
    descripcion: 'Finaliza registros clínicos y protégelos contra modificaciones.',
  },
  {
    key: 'marcas',
    titulo: 'Marcas Temporales',
    icono: '⏱️',
    Componente: MarcasTemporalesScreen,
    descripcion: 'Registra inicio, término y duración de cada atención.',
  },
];

export default function TrazabilidadScreen() {
  const [tabActiva, setTabActiva] = useState('inalterabilidad');
  const [visitadas, setVisitadas] = useState(() => new Set(['inalterabilidad']));

  const abrirTab = (key) => {
    setVisitadas((previas) => new Set(previas).add(key));
    setTabActiva(key);
  };

  const descripcion = useMemo(
    () => TABS.find((tab) => tab.key === tabActiva)?.descripcion,
    [tabActiva]
  );

  return (
    <View style={styles.contenedor}>
      <TabSelector tabs={TABS} tabActiva={tabActiva} onCambiarTab={abrirTab} />

      <Text style={styles.descripcion}>{descripcion}</Text>

      <View style={styles.panel}>
        {TABS.map((tab) => {
          if (!visitadas.has(tab.key)) return null;

          const activa = tab.key === tabActiva;
          const { Componente } = tab;

          return (
            <View
              key={tab.key}
              style={activa ? styles.panelActivo : styles.panelOculto}
              pointerEvents={activa ? 'auto' : 'none'}
            >
              <Componente />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Sin padding arriba: la barra de pestañas se adosa a la cabecera de
  // navegación en vez de quedar flotando bajo ella.
  contenedor: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  descripcion: {
    ...tipografia.meta,
    color: colores.textoSuave,
    paddingHorizontal: espacio.lg,
    paddingTop: espacio.md,
    paddingBottom: espacio.xs,
  },
  panel: {
    flex: 1,
  },
  // Igual que en FichaClinicaScreen: la pestaña activa usa flex normal;
  // el posicionamiento absoluto recortaba el contenido en Android.
  panelActivo: {
    flex: 1,
  },
  panelOculto: {
    display: 'none',
  },
});
