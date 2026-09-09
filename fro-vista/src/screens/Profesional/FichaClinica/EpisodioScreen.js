import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator
} from 'react-native';
import apiClient, { getHistorialPaciente } from '../../../api/client';
import VistaConTeclado from '../../../components/VistaConTeclado';
import DialogoAviso from '../../../components/DialogoAviso';
import { formatearFecha } from '../../../utils/fechas';
import { colores, espacio, piezas, tipografia } from '../../../theme';

// ─────────────────────────────────────────────────────────────────────────────
// EpisodioScreen — CU13
// El token JWT se inyecta automáticamente por el interceptor de client.js
// Cada petición dispara auditarAccesoClinico en el backend
// ─────────────────────────────────────────────────────────────────────────────
export default function EpisodioScreen({ route }) {
  // La ficha entrega el paciente en contexto; antes había que saberse de
  // memoria el identificador del episodio para poder consultarlo.
  const { pacienteId } = route?.params || {};

  // Avisos con el diálogo de la app (el Alert nativo no se estiliza).

  const [aviso, setAviso] = useState(null);

  const [episodiosDisponibles, setEpisodiosDisponibles] = useState(null);
  const [cargandoLista, setCargandoLista] = useState(false);

  const verEpisodiosDelPaciente = async () => {
    setCargandoLista(true);
    try {
      const data = await getHistorialPaciente(pacienteId);
      const lista = (data?.episodios || []).map((ep) => ({
        id: ep.episodio_clinico_id,
        titulo: `Episodio #${ep.episodio_clinico_id}`,
        detalle: ep.motivo_consulta || 'Sin motivo registrado',
        nota: `${ep.estado || 'Sin estado'} · desde ${formatearFecha(ep.fecha_inicio)}`,
      }));
      setEpisodiosDisponibles(lista);
    } catch (error) {
      setAviso({ tono: 'error', titulo: 'No se pudo consultar', mensaje: 'No fue posible obtener los episodios de este paciente.' });
    } finally {
      setCargandoLista(false);
    }
  };

  // ─ Estado para BUSCAR episodio ──────────────────────────────────────────
  const [episodioId, setEpisodioId] = useState('');
  const [episodio, setEpisodio] = useState(null);
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);

  // ─ Estado para el botón de iniciar atención
  const [cargandoEvolucion, setCargandoEvolucion] = useState(false);

  // ─ Estado para CREAR episodio ───────────────────────────────────────────
  const [nuevoEpisodio, setNuevoEpisodio] = useState({
    motivo_consulta: '',
    paciente_id: '',
    profesional_id: ''
  });
  const [cargandoCreacion, setCargandoCreacion] = useState(false);

  // ─ LECTURA: GET /api/clinica/episodio/:id ────────────────────────────────
  // ─ LECTURA_EPISODIO_CLINICO en Bitacora_Auditoria
  const buscarEpisodio = async () => {
    if (!episodioId) {
      setAviso({ tono: 'error', titulo: 'Error', mensaje: 'Ingresa el ID del episodio.' });
      return;
    }
    setCargandoBusqueda(true);
    setEpisodio(null);
    try {
      const { data } = await apiClient.get(`/clinica/episodio/${episodioId}`);
      setEpisodio(data);
    } catch (error) {
      const err = error.response?.data;
      if (error.response?.status === 401) {
        setAviso({ tono: 'error', titulo: 'Sesión inválida', mensaje: 'Tu sesión ha expirado. Inicia sesión nuevamente.' });
      } else if (error.response?.status === 403) {
        setAviso({ tono: 'error', titulo: 'Acceso denegado', mensaje: err?.error || 'No tienes permisos para esta acción.' });
      } else if (err?.error === 'FALLO_BITACORA') {
        setAviso({ tono: 'error', titulo: 'Error de auditoría', mensaje: err.mensaje });
      } else {
        setAviso({ tono: 'error', titulo: 'Error', mensaje: err?.error || 'No se pudo obtener el episodio.' });
      }
    } finally {
      setCargandoBusqueda(false);
    }
  };

  // ─ INICIAR ATENCIÓN (CREAR EVOLUCIÓN EN BLANCO) ──────────────────────────
  const iniciarAtencion = async () => {
    setCargandoEvolucion(true);
    try {
      const { data } = await apiClient.post(`/clinica/episodio/${episodio.episodio_clinico_id}/evolucion`);
      setAviso({ tono: 'ok', titulo: 'Atención Iniciada', mensaje: `${data.mensaje}\n\nEl ID de tu nueva Evolución es: ${data.evolucion_clinica_id}\n(Anótalo para registrar avances o firmarlo)` });
    } catch (error) {
      const err = error.response?.data;
      setAviso({ tono: 'error', titulo: 'Error', mensaje: err?.error || 'No se pudo iniciar la sesión clínica.' });
    } finally {
      setCargandoEvolucion(false);
    }
  };

  // ─ CREACIÓN: POST /api/clinica/episodio ──────────────────────────────────
  // Dispara: CREACION_EPISODIO_CLINICO en Bitacora_Auditoria
  const crearEpisodio = async () => {
    const { motivo_consulta, paciente_id, profesional_id } = nuevoEpisodio;
    if (!motivo_consulta || !paciente_id || !profesional_id) {
      setAviso({ tono: 'error', titulo: 'Error', mensaje: 'Todos los campos son requeridos.' });
      return;
    }
    setCargandoCreacion(true);
    try {
      const { data } = await apiClient.post('/clinica/episodio', {
        motivo_consulta,
        paciente_id: parseInt(paciente_id),
        profesional_id: parseInt(profesional_id)
      });
      setAviso({ tono: 'ok', titulo: 'Éxito', mensaje: data.mensaje });
      setNuevoEpisodio({ motivo_consulta: '', paciente_id: '', profesional_id: '' });
    } catch (error) {
      const err = error.response?.data;
      if (error.response?.status === 401) {
        setAviso({ tono: 'error', titulo: 'Sesión inválida', mensaje: 'Tu sesión ha expirado. Inicia sesión nuevamente.' });
      } else if (error.response?.status === 403) {
        setAviso({ tono: 'error', titulo: 'Acceso denegado', mensaje: err?.error || 'No tienes permisos para esta acción.' });
      } else if (err?.error === 'FALLO_BITACORA') {
        setAviso({ tono: 'error', titulo: 'Error de auditoría', mensaje: err.mensaje });
      } else {
        setAviso({ tono: 'error', titulo: 'Error', mensaje: err?.error || 'No se pudo crear el episodio.' });
      }
    } finally {
      setCargandoCreacion(false);
    }
  };

  return (
    <VistaConTeclado style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.title}>Episodios Clínicos</Text>
        <Text style={styles.subtitulo}>Cada acción queda registrada en la bitácora de auditoría.</Text>

        {/* ── BUSCAR EPISODIO ─────────────────────────────────────────────── */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Consultar Episodio</Text>
          <Text style={styles.label}>ID del episodio</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 12"
            keyboardType="numeric"
            value={episodioId}
            onChangeText={setEpisodioId}
          />
          {pacienteId ? (
            <TouchableOpacity
              style={styles.botonVerEpisodios}
              onPress={verEpisodiosDelPaciente}
              disabled={cargandoLista}
            >
              <Text style={styles.botonVerEpisodiosTexto}>
                {cargandoLista ? 'Buscando…' : '📁 Ver episodios de este paciente'}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.boton} onPress={buscarEpisodio} disabled={cargandoBusqueda}>
            {cargandoBusqueda
              ? <ActivityIndicator color={colores.superficie} />
              : <Text style={styles.botonTexto}>Buscar</Text>}
          </TouchableOpacity>
          
          {episodio && (
            <View style={styles.resultado}>
              <Text style={styles.resultadoTitulo}>Episodio #{episodio.episodio_clinico_id}</Text>
              <Text style={styles.resultadoCampo}>Motivo: {episodio.motivo_consulta}</Text>
              <Text style={styles.resultadoCampo}>Estado: {episodio.estado ?? 'Sin estado'}</Text>
              <Text style={styles.resultadoCampo}>Inicio: {formatearFecha(episodio.fecha_inicio)}</Text>
              
              {/* NUEVO BOTÓN PARA CREAR LA EVOLUCIÓN */}
              <TouchableOpacity 
                style={[styles.boton, { backgroundColor: colores.advertencia, marginTop: 15 }]} 
                onPress={iniciarAtencion} 
                disabled={cargandoEvolucion}
              >
                {cargandoEvolucion
                  ? <ActivityIndicator color={colores.superficie} />
                  : <Text style={styles.botonTexto}>+ Iniciar Nueva Atención</Text>}
              </TouchableOpacity>

            </View>
          )}
        </View>

        {/* ── CREAR EPISODIO ──────────────────────────────────────────────── */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Crear Episodio</Text>
          <Text style={styles.label}>Motivo de consulta</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: dolor lumbar"
            value={nuevoEpisodio.motivo_consulta}
            onChangeText={(v) => setNuevoEpisodio({ ...nuevoEpisodio, motivo_consulta: v })}
          />
          <Text style={styles.label}>ID del paciente</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 7"
            keyboardType="numeric"
            value={nuevoEpisodio.paciente_id}
            onChangeText={(v) => setNuevoEpisodio({ ...nuevoEpisodio, paciente_id: v })}
          />
          <Text style={styles.label}>ID del profesional</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 3"
            keyboardType="numeric"
            value={nuevoEpisodio.profesional_id}
            onChangeText={(v) => setNuevoEpisodio({ ...nuevoEpisodio, profesional_id: v })}
          />
          <TouchableOpacity
            style={[styles.boton, { backgroundColor: colores.exito }]}
            onPress={crearEpisodio}
            disabled={cargandoCreacion}
          >
            {cargandoCreacion
              ? <ActivityIndicator color={colores.superficie} />
              : <Text style={styles.botonTexto}>Crear Episodio</Text>}
          </TouchableOpacity>
        </View>
        <DialogoAviso
        visible={episodiosDisponibles !== null}
        titulo="Episodios del paciente"
        mensaje={
          episodiosDisponibles?.length
            ? 'Toca uno para consultarlo.'
            : 'Este paciente todavía no tiene episodios registrados.'
        }
        lista={episodiosDisponibles || []}
        tono="info"
        etiquetaCerrar="Cerrar"
        onSeleccionarFila={
          episodiosDisponibles?.length
            ? (fila) => {
                setEpisodioId(String(fila.id));
                setEpisodiosDisponibles(null);
              }
            : undefined
        }
        onCerrar={() => setEpisodiosDisponibles(null)}
      />
      <DialogoAviso
        visible={aviso !== null}
        titulo={aviso?.titulo || ''}
        mensaje={aviso?.mensaje}
        tono={aviso?.tono}
        onCerrar={() => {
          const seguir = aviso?.alCerrar;
          setAviso(null);
          if (seguir) seguir();
        }}
      />
    </VistaConTeclado>
  );
}

const styles = StyleSheet.create({
  label: { ...piezas.etiqueta },
  container: {
    flex: 1,
    backgroundColor: colores.fondo,
    // El contenido no puede quedar al ras del borde de la pantalla.
    paddingHorizontal: espacio.lg,
    paddingTop: espacio.base,
  },
  title: {
    ...tipografia.titulo,
    color: colores.textoTitulo,
    marginBottom: 4,
  },
  subtitulo: {
    ...tipografia.meta,
    color: colores.textoSuave,
    marginBottom: 24,
  },
  seccion: {
    ...tipografia.micro,
    color: colores.textoTenue,
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  seccionTitulo: {
    ...tipografia.micro,
    color: colores.textoTenue,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  input: {
    ...piezas.campo,
    marginBottom: 12,
  },
  boton: {
    ...piezas.botonPrimario,
    alignItems: 'center',
  },
  botonTexto: {
    ...tipografia.cuerpoFuerte,
    color: colores.textoInverso,
  },
  resultado: {
    ...piezas.tarjeta,
    marginTop: 16,
  },
  botonVerEpisodios: {
    ...piezas.botonSecundario,
    paddingVertical: espacio.md,
    marginBottom: espacio.md,
  },
  botonVerEpisodiosTexto: { ...tipografia.cuerpoFuerte, color: colores.primario },
  resultadoTitulo: { ...tipografia.subtitulo, color: colores.textoTitulo, marginBottom: 8 },
  resultadoCampo: { ...tipografia.cuerpo, color: colores.texto, marginBottom: 4 }
});