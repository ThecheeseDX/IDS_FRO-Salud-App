// Ruta: fro-vista/src/screens/Comun/DocumentosScreen.js
//
// Repositorio multimedia de la ficha clínica, compartido por ambos roles:
// - Profesional (recibe pacienteId): ve, carga (CU33) y categoriza (CU34).
// - Paciente (sin pacienteId): consulta sus propios documentos (CU35).
// El binario vive en Cloudinary; aquí solo se listan metadatos y se abre el
// visor embebido sin descargas persistentes.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  ScrollView,
  StyleSheet,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import apiClient from '../../api/client';
import ErrorRetry from '../../components/ErrorRetry';

const ICONO_POR_VISOR = { imagen: '🖼️', pdf: '📄', video: '🎬' };

function iconoDe(doc) {
  if (doc.formato === 'pdf') return ICONO_POR_VISOR.pdf;
  if (['mp4', 'mov'].includes(doc.formato)) return ICONO_POR_VISOR.video;
  return ICONO_POR_VISOR.imagen;
}

function pesoLegible(bytes) {
  if (!bytes) return '';
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export default function DocumentosScreen({ route, navigation }) {
  const { pacienteId, nombrePaciente } = route?.params || {};
  const esProfesional = Boolean(pacienteId);

  const [documentos, setDocumentos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtro, setFiltro] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  // CU34: documento cuya categoría se está eligiendo en el modal.
  const [docPorCategorizar, setDocPorCategorizar] = useState(null);

  const cargar = async (categoriaFiltro = filtro) => {
    setErrorCarga(false);
    setCargando(true);
    try {
      const ruta = esProfesional
        ? `/clinica/pacientes/${pacienteId}/documentos`
        : '/clinica/mis-documentos';
      const { data } = await apiClient.get(ruta, {
        params: categoriaFiltro ? { categoria: categoriaFiltro } : {},
      });
      setDocumentos(data.documentos || []);
      // CU34 Excepción 1: si las categorías no llegan, queda la lista vacía
      // y el botón de recarga permite reintentar el módulo completo.
      setCategorias(data.categorias || []);
    } catch (error) {
      const respuesta = error.response?.data;
      if (error.response?.status === 403) {
        Alert.alert('Acceso denegado', respuesta?.mensaje || 'Sin autorización.');
        navigation.goBack();
        return;
      }
      setErrorCarga(true);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const aplicarFiltro = (clave) => {
    const nuevo = clave === filtro ? null : clave;
    setFiltro(nuevo);
    cargar(nuevo);
  };

  // ── CU33: carga de archivos (solo profesional) ─────────────────────────────
  const confirmarYSubir = (archivo) => {
    // Excepción 3: cancelar antes de la transferencia purga la selección.
    Alert.alert(
      'Confirmar carga',
      `${archivo.name}\nTamaño: ${pesoLegible(archivo.size)}\n\n¿Cargar este archivo a la ficha de ${nombrePaciente || 'este paciente'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cargar archivo', onPress: () => subirArchivo(archivo) },
      ]
    );
  };

  const subirArchivo = async (archivo) => {
    setSubiendo(true);
    try {
      const formulario = new FormData();
      formulario.append('archivo', {
        uri: archivo.uri,
        name: archivo.name,
        type: archivo.mimeType || 'application/octet-stream',
      });

      const { data } = await apiClient.post(
        `/clinica/pacientes/${pacienteId}/documentos`,
        formulario,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          transformRequest: (d) => d,
        }
      );

      await cargar();
      // CU34: recién cargado, se ofrece de inmediato la clasificación.
      setDocPorCategorizar({ documento_id: data.documento_id, nombre_original: archivo.name });
    } catch (error) {
      const respuesta = error.response?.data;
      // Excepciones 1, 2 y 4 del CU33 llegan explicadas desde el servidor.
      Alert.alert(
        'Carga no realizada',
        respuesta?.mensaje || respuesta?.error || 'Se interrumpió la transferencia. Reinicia el proceso de carga.'
      );
    } finally {
      setSubiendo(false);
    }
  };

  const elegirImagen = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permiso.status !== 'granted') {
      Alert.alert('Permiso denegado', 'Sin acceso a la galería no es posible seleccionar imágenes.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (resultado.canceled || !resultado.assets?.length) return;
    const activo = resultado.assets[0];
    const nombre = activo.fileName || `imagen_${Date.now()}.jpg`;
    confirmarYSubir({
      uri: activo.uri,
      name: nombre,
      size: activo.fileSize || 0,
      mimeType: activo.mimeType || 'image/jpeg',
    });
  };

  const elegirDocumento = async () => {
    const resultado = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*', 'video/mp4', 'video/quicktime'],
      copyToCacheDirectory: true,
    });
    if (resultado.canceled || !resultado.assets?.length) return;
    const activo = resultado.assets[0];
    confirmarYSubir({
      uri: activo.uri,
      name: activo.name,
      size: activo.size || 0,
      mimeType: activo.mimeType || 'application/octet-stream',
    });
  };

  // ── CU34: reclasificación ──────────────────────────────────────────────────
  const asignarCategoria = async (clave) => {
    const doc = docPorCategorizar;
    setDocPorCategorizar(null);
    try {
      await apiClient.put(`/clinica/documentos/${doc.documento_id}/categoria`, {
        categoria: clave,
      });
      await cargar();
    } catch (error) {
      const respuesta = error.response?.data;
      // CU34 Excepción 3: falla de indexación → acceso directo sigue operativo.
      Alert.alert(
        'Clasificación no aplicada',
        respuesta?.mensaje || 'Falló el motor de indexación. El documento sigue accesible de forma directa; informa al administrador.'
      );
    }
  };

  const nombreCategoria = (clave) =>
    categorias.find((c) => c.clave === clave)?.nombre || clave;

  const renderDocumento = ({ item }) => (
    <TouchableOpacity
      style={estilos.card}
      onPress={() =>
        navigation.navigate('VisorDocumento', {
          documentoId: item.documento_id,
          nombre: item.nombre_original,
        })
      }
    >
      <Text style={estilos.icono}>{iconoDe(item)}</Text>
      <View style={estilos.info}>
        <Text style={estilos.nombre} numberOfLines={1}>{item.nombre_original}</Text>
        <Text style={estilos.detalle}>
          {nombreCategoria(item.categoria)} · {pesoLegible(item.tamano_bytes)}
        </Text>
        <Text style={estilos.detalle}>
          {new Date(item.fecha_carga).toLocaleDateString('es-CL')}
          {item.cargado_por?.trim() ? ` · ${item.cargado_por}` : ''}
        </Text>
      </View>
      {esProfesional && (
        <TouchableOpacity
          style={estilos.botonEtiqueta}
          onPress={() => setDocPorCategorizar(item)}
        >
          <Text>🏷️</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (errorCarga) {
    return (
      <View style={estilos.centrado}>
        <ErrorRetry
          mensaje="No se pudo cargar el repositorio de documentos."
          onRetry={() => cargar()}
        />
      </View>
    );
  }

  return (
    <View style={estilos.contenedor}>
      {nombrePaciente ? (
        <Text style={estilos.subtitulo}>Paciente: {nombrePaciente}</Text>
      ) : null}

      {/* Filtros por categoría (CU34: recuperación selectiva) */}
      {categorias.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={estilos.filtros}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
        >
          {categorias.map((c) => (
            <TouchableOpacity
              key={c.clave}
              style={[estilos.chip, filtro === c.clave && estilos.chipActivo]}
              onPress={() => aplicarFiltro(c.clave)}
            >
              <Text style={filtro === c.clave ? estilos.chipTextoActivo : estilos.chipTexto}>
                {c.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {cargando ? (
        <View style={estilos.centrado}>
          <ActivityIndicator size="large" color="#0052cc" />
        </View>
      ) : (
        <FlatList
          data={documentos}
          keyExtractor={(item) => String(item.documento_id)}
          renderItem={renderDocumento}
          contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
          ListEmptyComponent={
            <View style={estilos.vacio}>
              <Text style={estilos.vacioIcono}>📁</Text>
              <Text style={estilos.vacioTexto}>
                {filtro
                  ? 'No hay documentos en esta categoría.'
                  : 'Aún no hay documentos en el repositorio.'}
              </Text>
            </View>
          }
        />
      )}

      {/* CU33: carga (solo profesional) */}
      {esProfesional && (
        <View style={estilos.barraCarga}>
          <TouchableOpacity
            style={[estilos.botonCarga, subiendo && estilos.deshabilitado]}
            onPress={elegirImagen}
            disabled={subiendo}
          >
            <Text style={estilos.botonCargaTexto}>🖼️ Subir imagen</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[estilos.botonCarga, subiendo && estilos.deshabilitado]}
            onPress={elegirDocumento}
            disabled={subiendo}
          >
            <Text style={estilos.botonCargaTexto}>📄 Subir documento</Text>
          </TouchableOpacity>
        </View>
      )}

      {subiendo && (
        <View style={estilos.velo}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={estilos.veloTexto}>Transfiriendo al repositorio…</Text>
        </View>
      )}

      {/* CU34: menú de clasificación taxonómica */}
      <Modal visible={docPorCategorizar !== null} transparent animationType="fade">
        <View style={estilos.fondoModal}>
          <View style={estilos.cajaModal}>
            <Text style={estilos.tituloModal}>Clasificar documento</Text>
            <Text style={estilos.detalle} numberOfLines={1}>
              {docPorCategorizar?.nombre_original}
            </Text>
            {categorias
              .filter((c) => c.clave !== 'SIN_CLASIFICAR')
              .map((c) => (
                <TouchableOpacity
                  key={c.clave}
                  style={estilos.opcionCategoria}
                  onPress={() => asignarCategoria(c.clave)}
                >
                  <Text style={estilos.opcionTexto}>{c.nombre}</Text>
                </TouchableOpacity>
              ))}
            {/* Omitir la selección deja el metadato "Sin clasificar" (Exc.2) */}
            <TouchableOpacity onPress={() => asignarCategoria('SIN_CLASIFICAR')}>
              <Text style={estilos.omitir}>Omitir (queda Sin Clasificar)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f4f6f8' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  subtitulo: { color: '#555', paddingHorizontal: 16, paddingTop: 12, fontWeight: '600' },

  filtros: { maxHeight: 46, marginTop: 10 },
  chip: {
    borderWidth: 1,
    borderColor: '#0052cc',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipActivo: { backgroundColor: '#0052cc' },
  chipTexto: { color: '#0052cc', fontSize: 12 },
  chipTextoActivo: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    marginBottom: 10,
  },
  icono: { fontSize: 26, marginRight: 10 },
  info: { flex: 1 },
  nombre: { fontWeight: 'bold', color: '#1f2937' },
  detalle: { color: '#666', fontSize: 12, marginTop: 2 },
  botonEtiqueta: { padding: 8 },

  vacio: { alignItems: 'center', paddingTop: 60 },
  vacioIcono: { fontSize: 44, marginBottom: 10 },
  vacioTexto: { color: '#666', textAlign: 'center', paddingHorizontal: 30 },

  barraCarga: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 10,
  },
  botonCarga: {
    flex: 1,
    backgroundColor: '#0052cc',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    elevation: 4,
  },
  botonCargaTexto: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  deshabilitado: { opacity: 0.6 },

  velo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  veloTexto: { color: '#fff', marginTop: 12, fontWeight: '600' },

  fondoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  cajaModal: { backgroundColor: '#fff', borderRadius: 14, padding: 18 },
  tituloModal: { fontSize: 17, fontWeight: 'bold', color: '#1c3d5a', marginBottom: 4 },
  opcionCategoria: {
    borderWidth: 1,
    borderColor: '#dbe3ec',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  opcionTexto: { color: '#1f2937' },
  omitir: { color: '#888', textAlign: 'center', marginTop: 14, fontStyle: 'italic' },
});
