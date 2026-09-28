// Ruta: fro-vista/src/screens/Paciente/MiTratamientoScreen.js
//
// "Mi tratamiento": segunda pestaña de la barra inferior del paciente. Reúne
// en pestañas superiores (el mismo TabSelector de la ficha clínica del
// profesional) lo que antes eran cuatro botones sueltos del inicio.

import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';

import TabSelector from '../../components/TabSelector';
import MiProgresoScreen from './MiProgresoScreen';
import MisPautasScreen from './MisPautasScreen';
import MiSeguimientoScreen from './MiSeguimientoScreen';
import TriajeScreen from './TriajeScreen';
import { PESTANA_DE_TRATAMIENTO } from '../../navigation/rutasPaciente';
import { colores } from '../../theme';

const PESTANAS = [
  { key: 'progreso',    titulo: 'Mi progreso',       icono: '📊', Componente: MiProgresoScreen },
  { key: 'ejercicios',  titulo: 'Mis ejercicios',    icono: '🏋️', Componente: MisPautasScreen },
  { key: 'seguimiento', titulo: 'Mi seguimiento',    icono: '📈', Componente: MiSeguimientoScreen },
  { key: 'entrevista',  titulo: 'Entrevista previa', icono: '🩺', Componente: TriajeScreen },
];

export default function MiTratamientoScreen({ route, navigation }) {
  const pedida = route?.params?.pestana;
  const [tabActiva, setTabActiva] = useState(pedida || 'progreso');
  // Las pestañas ya abiertas se mantienen montadas: la entrevista a medio
  // responder o el reporte a medio escribir no se pierden al cambiar.
  const [visitadas, setVisitadas] = useState(() => new Set([pedida || 'progreso']));
  // "Mi progreso" solo muestra gráficos: se vuelve a montar cada vez que se
  // abre, para que refleje el reporte o los ejercicios recién registrados.
  const [vueltasProgreso, setVueltasProgreso] = useState(0);

  const abrirTab = (key) => {
    setTabActiva(key);
    setVisitadas((previas) => new Set(previas).add(key));
    if (key === 'progreso') setVueltasProgreso((n) => n + 1);
  };

  // Un aviso o un enlace puede pedir una pestaña concreta.
  useEffect(() => {
    if (!pedida) return;
    abrirTab(pedida);
    navigation.setParams({ pestana: undefined });
  }, [pedida]);

  // Las pantallas internas siguen llamando a navigate con sus nombres de
  // siempre; los que ahora son pestañas de aquí se traducen a un cambio.
  const navegacionInterna = useMemo(
    () => ({
      ...navigation,
      navigate: (destino, params) => {
        const interna = PESTANA_DE_TRATAMIENTO[destino];
        if (interna) {
          abrirTab(interna);
          return;
        }
        navigation.navigate(destino, params);
      },
      setOptions: () => {},
    }),
    [navigation]
  );

  return (
    <View style={styles.contenedor}>
      <TabSelector tabs={PESTANAS} tabActiva={tabActiva} onCambiarTab={abrirTab} />

      <View style={styles.panel}>
        {PESTANAS.map((tab) => {
          if (!visitadas.has(tab.key)) return null;
          const activa = tab.key === tabActiva;
          const { Componente } = tab;
          return (
            <View
              key={tab.key === 'progreso' ? `progreso-${vueltasProgreso}` : tab.key}
              style={activa ? styles.panelActivo : styles.panelOculto}
              pointerEvents={activa ? 'auto' : 'none'}
            >
              <Componente
                route={{ key: `tratamiento-${tab.key}`, name: tab.key, params: {} }}
                navigation={navegacionInterna}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  panel: { flex: 1 },
  // Igual que en la ficha clínica: la activa en el layout normal, las demás
  // montadas pero fuera del layout.
  panelActivo: { flex: 1 },
  panelOculto: { display: 'none' },
});
