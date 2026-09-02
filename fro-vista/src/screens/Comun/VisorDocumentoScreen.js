// Ruta: fro-vista/src/screens/Comun/VisorDocumentoScreen.js
//
// CU35: visor embebido de documentos clínicos. Renderiza el contenido sin
// descarga persistente en el teléfono: imágenes con el componente nativo,
// PDF y video dentro de un visor web incrustado. El backend valida el RBAC
// antes de entregar la URL y registra cada visualización (o intento
// denegado) en la bitácora.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { WebView } from 'react-native-webview';

import apiClient from '../../api/client';
import ErrorRetry from '../../components/ErrorRetry';
import { formatearFecha } from '../../utils/fechas';

export default function VisorDocumentoScreen({ route }) {
  const { documentoId, nombre } = route?.params || {};

  const [documento, setDocumento] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');
  // Excepción 4: falla del renderizador embebido → código de error + recarga.
  const [errorVisor, setErrorVisor] = useState(false);
  const [claveVisor, setClaveVisor] = useState(0);

  const cargar = async () => {
    setErrorCarga('');
    try {
      const { data } = await apiClient.get(`/clinica/documentos/${documentoId}/ver`);
      setDocumento(data.documento);
    } catch (error) {
      const respuesta = error.response?.data;
      // Excepción 2: acceso denegado queda registrado en el log del servidor.
      setErrorCarga(
        respuesta?.mensaje ||
          (error.response?.status === 403
            ? 'No tienes autorización para visualizar este documento.'
            : 'No se pudo preparar el visor. Revisa tu conexión.')
      );
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const recargarVisor = () => {
    setErrorVisor(false);
    setClaveVisor((n) => n + 1);
  };

  if (errorCarga !== '') {
    return (
      <View style={estilos.centrado}>
        <ErrorRetry mensaje={errorCarga} onRetry={cargar} />
      </View>
    );
  }

  if (!documento) {
    return (
      <View style={estilos.centrado}>
        <ActivityIndicator size="large" color="#0052cc" />
      </View>
    );
  }

  if (errorVisor) {
    return (
      <View style={estilos.centrado}>
        <Text style={estilos.codigoError}>ERROR_RENDER_VISOR</Text>
        <Text style={estilos.textoError}>
          El visor embebido falló al renderizar el contenido.
        </Text>
        <TouchableOpacity style={estilos.botonRecarga} onPress={recargarVisor}>
          <Text style={estilos.botonRecargaTexto}>Recargar visor</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Android no renderiza PDF nativo en WebView: se incrusta el visor de
  // documentos de Google apuntando a la URL pública del repositorio.
  const urlVisor =
    documento.visor === 'pdf'
      ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(documento.url_publica)}`
      : documento.url_publica;

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.cabecera}>
        <Text style={estilos.nombre} numberOfLines={1}>
          {nombre || documento.nombre_original}
        </Text>
        <Text style={estilos.detalle}>
          {documento.formato?.toUpperCase()} ·{' '}
          {formatearFecha(documento.fecha_carga)} · solo
          visualización
        </Text>
      </View>

      {documento.visor === 'imagen' ? (
        <Image
          key={claveVisor}
          source={{ uri: documento.url_publica }}
          style={estilos.imagen}
          resizeMode="contain"
          onError={() => setErrorVisor(true)}
        />
      ) : (
        <WebView
          key={claveVisor}
          source={{ uri: urlVisor }}
          style={estilos.web}
          onError={() => setErrorVisor(true)}
          onHttpError={() => setErrorVisor(true)}
          allowsFullscreenVideo
          startInLoadingState
          renderLoading={() => (
            <View style={estilos.centrado}>
              <ActivityIndicator size="large" color="#0052cc" />
            </View>
          )}
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#1c1f24' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f4f6f8' },

  cabecera: { padding: 12, backgroundColor: '#11141a' },
  nombre: { color: '#fff', fontWeight: 'bold' },
  detalle: { color: '#9aa4b2', fontSize: 12, marginTop: 2 },

  imagen: { flex: 1 },
  web: { flex: 1 },

  codigoError: { fontWeight: 'bold', color: '#d32f2f', fontSize: 16, marginBottom: 6 },
  textoError: { color: '#555', textAlign: 'center', marginBottom: 16 },
  botonRecarga: {
    backgroundColor: '#0052cc',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  botonRecargaTexto: { color: '#fff', fontWeight: 'bold' },
});
