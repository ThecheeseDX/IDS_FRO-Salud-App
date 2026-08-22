// Ruta: fro-vista/src/screens/Profesional/FichaClinica/FichaClinicaScreen.js
//
// Vista única de la ficha clínica del paciente. Reúne en pestañas internas las
// pantallas que antes vivían sueltas en el stack (historial, anamnesis,
// episodios, evolución e intervención) para que el profesional trabaje sin
// salir del contexto del paciente.

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import TabSelector from '../../../components/TabSelector';
import HistorialPacienteScreen from './HistorialPacienteScreen';
import AnamnesisScreen from './AnamnesisScreen';
import EpisodioScreen from './EpisodioScreen';
import EvolucionClinicaScreen from './EvolucionClinicaScreen';
import IntervencionScreen from './IntervencionScreen';

const TABS = [
  { key: 'historial',    titulo: 'Historial',    icono: '📋', Componente: HistorialPacienteScreen, requierePaciente: true },
  { key: 'anamnesis',    titulo: 'Anamnesis',    icono: '🩺', Componente: AnamnesisScreen,         requierePaciente: true },
  { key: 'episodios',    titulo: 'Episodios',    icono: '📁', Componente: EpisodioScreen,          requierePaciente: false },
  { key: 'evolucion',    titulo: 'Evolución',    icono: '📈', Componente: EvolucionClinicaScreen,  requierePaciente: false },
  { key: 'intervencion', titulo: 'Intervención', icono: '💪', Componente: IntervencionScreen,      requierePaciente: false },
];

// Las pantallas internas siguen llamando a navigation.navigate con los nombres
// de ruta antiguos. Aquí se traducen a un cambio de pestaña.
const RUTA_A_TAB = {
  HistorialPaciente: 'historial',
  Anamnesis: 'anamnesis',
  Episodio: 'episodios',
  EvolucionClinica: 'evolucion',
  Intervencion: 'intervencion',
};

export default function FichaClinicaScreen({ route, navigation }) {
  const { pacienteId, nombrePaciente } = route?.params || {};

  const [tabActiva, setTabActiva] = useState(pacienteId ? 'historial' : 'episodios');
  // Se conservan montadas las pestañas ya abiertas para no perder lo que el
  // profesional haya escrito al cambiar de una a otra.
  const [visitadas, setVisitadas] = useState(() => new Set([pacienteId ? 'historial' : 'episodios']));
  // Parámetros que una pestaña deja para otra (ej. el episodio seleccionado).
  const [paramsExtra, setParamsExtra] = useState({});

  useEffect(() => {
    navigation.setOptions({
      title: nombrePaciente ? `Ficha: ${nombrePaciente}` : 'Ficha Clínica',
    });
  }, [navigation, nombrePaciente]);

  const abrirTab = (key, params) => {
    if (params) {
      setParamsExtra((previos) => ({ ...previos, [key]: params }));
    }
    setVisitadas((previas) => new Set(previas).add(key));
    setTabActiva(key);
  };

  // navigation "envuelto": intercepta los saltos entre pantallas que ahora son
  // pestañas y deja pasar el resto al stack real.
  const navegacionInterna = useMemo(
    () => ({
      ...navigation,
      navigate: (destino, params) => {
        const tabDestino = RUTA_A_TAB[destino];
        if (tabDestino) {
          abrirTab(tabDestino, params);
          return;
        }
        navigation.navigate(destino, params);
      },
      // Dentro de la ficha, "volver" significa cerrar la ficha completa.
      goBack: () => navigation.goBack(),
      // Las pestañas no deben reescribir el título de la ficha.
      setOptions: () => {},
    }),
    [navigation]
  );

  return (
    <View style={styles.contenedor}>
      <TabSelector tabs={TABS} tabActiva={tabActiva} onCambiarTab={abrirTab} />

      <View style={styles.panel}>
        {TABS.map((tab) => {
          if (!visitadas.has(tab.key)) return null;

          const activa = tab.key === tabActiva;
          const { Componente } = tab;

          if (tab.requierePaciente && !pacienteId) {
            return activa ? (
              <View key={tab.key} style={styles.aviso}>
                <Text style={styles.avisoTexto}>
                  Selecciona un paciente desde la lista para ver esta sección.
                </Text>
              </View>
            ) : null;
          }

          const rutaInterna = {
            key: `ficha-${tab.key}`,
            name: tab.key,
            params: { pacienteId, nombrePaciente, ...(paramsExtra[tab.key] || {}) },
          };

          return (
            <View
              key={tab.key}
              style={activa ? styles.panelActivo : styles.panelOculto}
              pointerEvents={activa ? 'auto' : 'none'}
            >
              <Componente route={rutaInterna} navigation={navegacionInterna} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#fff',
  },
  panel: {
    flex: 1,
  },
  panelActivo: {
    ...StyleSheet.absoluteFillObject,
  },
  panelOculto: {
    display: 'none',
  },
  aviso: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  avisoTexto: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
