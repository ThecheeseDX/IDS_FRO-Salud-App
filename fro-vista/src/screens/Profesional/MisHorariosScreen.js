// Ruta: fro-vista/src/screens/Profesional/MisHorariosScreen.js
//
// Jornada semanal del profesional: los bloques horarios en los que los
// pacientes pueden reservar. Antes solo se definían al registrarse; aquí se
// agregan, editan y eliminan. Guardar reemplaza la jornada completa y no toca
// las citas ya agendadas.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';

import apiClient from '../../api/client';
import ErrorRetry from '../../components/ErrorRetry';
import DialogoAviso from '../../components/DialogoAviso';
import VistaConTeclado from '../../components/VistaConTeclado';
import { colores, espacio, piezas, radio, tipografia, interaccion } from '../../theme';

const DIAS = [
  { valor: 1, nombre: 'Lunes' },
  { valor: 2, nombre: 'Martes' },
  { valor: 3, nombre: 'Miércoles' },
  { valor: 4, nombre: 'Jueves' },
  { valor: 5, nombre: 'Viernes' },
  { valor: 6, nombre: 'Sábado' },
  { valor: 7, nombre: 'Domingo' },
];

const MODALIDADES = [
  { valor: 'DOMICILIO', nombre: 'A domicilio' },
  { valor: 'ONLINE', nombre: 'Online' },
  { valor: 'AMBOS', nombre: 'Ambas' },
];

// Horas en punto: la agenda se ofrece en bloques de una hora.
const HORAS = Array.from({ length: 18 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`); // 06:00 a 23:00

let siguienteClave = 1;
const conClave = (bloque) => ({ ...bloque, clave: siguienteClave++ });

export default function MisHorariosScreen() {
  const [bloques, setBloques] = useState([]);
  const [modalidadGeneral, setModalidadGeneral] = useState('DOMICILIO');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cambios, setCambios] = useState(false);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(false);
    try {
      const { data } = await apiClient.get('/profesionales/mi-horario');
      // La búsqueda ofrece horas en punto: un bloque antiguo "08:30" en la
      // práctica ya partía a las 08:00, así que se muestra como tal.
      const enPunto = (h) => `${String(h || '00').slice(0, 2)}:00`;
      setBloques(
        (data.bloques || []).map((b) =>
          conClave({
            ...b,
            dia_semana: Number(b.dia_semana),
            hora_inicio: enPunto(b.hora_inicio),
            hora_fin: enPunto(b.hora_fin),
          })
        )
      );
      setModalidadGeneral(data.modalidad_general && data.modalidad_general !== 'AMBOS' ? data.modalidad_general : 'DOMICILIO');
      setCambios(false);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const actualizar = (clave, campo, valor) => {
    setBloques((previos) => previos.map((b) => (b.clave === clave ? { ...b, [campo]: valor } : b)));
    setCambios(true);
  };

  const eliminar = (clave) => {
    setBloques((previos) => previos.filter((b) => b.clave !== clave));
    setCambios(true);
  };

  const agregar = () => {
    setBloques((previos) => [
      ...previos,
      conClave({ dia_semana: 1, hora_inicio: '09:00', hora_fin: '13:00', modalidad: modalidadGeneral }),
    ]);
    setCambios(true);
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const { data } = await apiClient.put('/profesionales/mi-horario', {
        bloques: bloques.map(({ clave, ...b }) => b),
      });
      setAviso({ tono: 'ok', titulo: 'Jornada guardada', mensaje: data.mensaje });
      await cargar();
    } catch (err) {
      const respuesta = err.response?.data;
      setAviso({
        tono: 'error',
        titulo: 'No se pudo guardar',
        mensaje: respuesta?.mensaje || respuesta?.error || 'Revisa tu conexión e intenta nuevamente.',
      });
    } finally {
      setGuardando(false);
    }
  };

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
        <ErrorRetry mensaje="No se pudo cargar tu jornada." onRetry={cargar} />
      </View>
    );
  }

  // Ordenados por día y hora para leerlos como una semana.
  const ordenados = [...bloques].sort(
    (a, b) => a.dia_semana - b.dia_semana || String(a.hora_inicio).localeCompare(String(b.hora_inicio))
  );

  return (
    <View style={estilos.fondo}>
      <VistaConTeclado contentContainerStyle={estilos.contenido}>
        <Text style={estilos.intro}>
          Estos son los horarios en que los pacientes pueden reservar contigo, en bloques de una
          hora. Las citas que ya están agendadas no cambian al editar tu jornada.
        </Text>

        {ordenados.length === 0 ? (
          <Text style={estilos.vacio}>Todavía no tienes bloques. Agrega el primero.</Text>
        ) : null}

        {ordenados.map((b) => (
          <View key={b.clave} style={estilos.tarjeta}>
            <View style={estilos.cabecera}>
              <Text style={estilos.titulo}>
                {DIAS.find((d) => d.valor === Number(b.dia_semana))?.nombre} · {b.hora_inicio} a {b.hora_fin}
              </Text>
              <TouchableOpacity
                onPress={() => eliminar(b.clave)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Eliminar bloque"
              >
                <Text style={estilos.eliminar}>Eliminar</Text>
              </TouchableOpacity>
            </View>

            <Text style={estilos.etiqueta}>Día</Text>
            <View style={estilos.selector}>
              <Picker selectedValue={Number(b.dia_semana)} onValueChange={(v) => actualizar(b.clave, 'dia_semana', Number(v))}>
                {DIAS.map((d) => (
                  <Picker.Item key={d.valor} label={d.nombre} value={d.valor} />
                ))}
              </Picker>
            </View>

            <View style={estilos.fila}>
              <View style={estilos.columna}>
                <Text style={estilos.etiqueta}>Desde</Text>
                <View style={estilos.selector}>
                  <Picker selectedValue={b.hora_inicio} onValueChange={(v) => actualizar(b.clave, 'hora_inicio', v)}>
                    {HORAS.slice(0, -1).map((h) => (
                      <Picker.Item key={h} label={h} value={h} />
                    ))}
                  </Picker>
                </View>
              </View>
              <View style={estilos.columna}>
                <Text style={estilos.etiqueta}>Hasta</Text>
                <View style={estilos.selector}>
                  <Picker selectedValue={b.hora_fin} onValueChange={(v) => actualizar(b.clave, 'hora_fin', v)}>
                    {HORAS.slice(1).map((h) => (
                      <Picker.Item key={h} label={h} value={h} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
            {b.hora_inicio >= b.hora_fin ? (
              <Text style={estilos.errorTexto}>La hora de término debe ser posterior al inicio.</Text>
            ) : null}

            <Text style={estilos.etiqueta}>Modalidad en este horario</Text>
            <View style={estilos.selector}>
              <Picker selectedValue={b.modalidad} onValueChange={(v) => actualizar(b.clave, 'modalidad', v)}>
                {MODALIDADES.map((m) => (
                  <Picker.Item key={m.valor} label={m.nombre} value={m.valor} />
                ))}
              </Picker>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={estilos.botonAgregar}
          onPress={agregar}
          activeOpacity={interaccion.opacidadActiva}
        >
          <Text style={estilos.botonAgregarTexto}>＋ Agregar bloque horario</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[estilos.botonGuardar, (!cambios || guardando) && estilos.deshabilitado]}
          onPress={guardar}
          disabled={!cambios || guardando}
          activeOpacity={interaccion.opacidadActiva}
        >
          {guardando ? (
            <ActivityIndicator color={colores.textoInverso} />
          ) : (
            <Text style={estilos.botonGuardarTexto}>{cambios ? 'Guardar jornada' : 'Sin cambios'}</Text>
          )}
        </TouchableOpacity>
      </VistaConTeclado>

      <DialogoAviso
        visible={aviso !== null}
        titulo={aviso?.titulo || ''}
        mensaje={aviso?.mensaje}
        tono={aviso?.tono}
        onCerrar={() => setAviso(null)}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.lg, paddingBottom: espacio.xxl },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: espacio.xl, backgroundColor: colores.fondo },
  intro: { ...tipografia.meta, color: colores.textoSuave, marginBottom: espacio.base },
  vacio: { ...tipografia.meta, color: colores.textoTenue, fontStyle: 'italic', marginBottom: espacio.base },

  tarjeta: { ...piezas.tarjeta, marginBottom: espacio.md },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: espacio.sm },
  titulo: { ...tipografia.cuerpoFuerte, color: colores.textoTitulo, flex: 1 },
  eliminar: { ...tipografia.metaFuerte, color: colores.error },

  etiqueta: { ...tipografia.micro, color: colores.textoSuave, marginTop: espacio.sm, marginBottom: 4 },
  selector: {
    borderWidth: 1,
    borderColor: colores.bordeCampo,
    borderRadius: radio.sm,
    backgroundColor: colores.superficie,
    overflow: 'hidden',
  },
  fila: { flexDirection: 'row', gap: espacio.sm },
  columna: { flex: 1 },
  errorTexto: { ...tipografia.micro, color: colores.error, marginTop: espacio.xs, letterSpacing: 0 },

  botonAgregar: {
    borderWidth: 1.5,
    borderColor: colores.primario,
    borderStyle: 'dashed',
    borderRadius: radio.md,
    paddingVertical: espacio.md,
    alignItems: 'center',
    marginTop: espacio.sm,
  },
  botonAgregarTexto: { ...tipografia.cuerpoFuerte, color: colores.primario },
  botonGuardar: { ...piezas.botonPrimario, alignItems: 'center', marginTop: espacio.lg },
  botonGuardarTexto: { ...tipografia.cuerpoFuerte, color: colores.textoInverso },
  deshabilitado: { opacity: 0.5 },
});
