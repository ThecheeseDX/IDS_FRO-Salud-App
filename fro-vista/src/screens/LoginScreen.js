import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext'; // ◄ NUEVO
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { validateRut } from '../utils/validators'; 

// ◄ NUEVO: Importamos el cliente centralizado de Axios
import apiClient from '../api/client'; 

export default function LoginScreen({ navigation }) {
  // --- ESTADOS LOCALES ---
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [rutError, setRutError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { loginSession } = useContext(AuthContext);

  // --- PASO 6: VALIDACIÓN SINTÁCTICA EN TIEMPO REAL (Excepción 1) ---
  useEffect(() => {
    const rutLimpio = rut.replace(/[^0-9kK]/g, '');
    
    if (rutLimpio.length >= 8) {
      if (!validateRut(rut)) {
        setRutError('⚠️ Formato de RUT inválido (Módulo 11 incorrecto).');
      } else {
        setRutError('');
      }
    } else if (rutLimpio.length > 0) {
      setRutError('');
    }
  }, [rut]); 

  const isFormValid = password.length > 0 && validateRut(rut);

  // --- PASO 7: DESPACHO DE PETICIÓN HTTP ---
  const handleLogin = async () => {
    setLoginError('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/auth/login', {
        rut: rut,
        contrasena: password
      });

      setIsLoading(false);
      const { token, usuario, mensaje } = response.data;

      // ◄ NUEVO: Usamos la función del contexto para guardar el token en el teléfono
      await loginSession(token, usuario);
      console.log("✅ Sesión guardada globalmente para el rol:", usuario.rol);
      
      // Mantenemos tus redirecciones por ahora (luego el AppNavigator lo hará solo)
      if (usuario.rol === 'Paciente') {
        navigation.replace('DashboardPaciente');
      } else if (usuario.rol === 'Profesional') {
        navigation.replace('DashboardProfesional');
      } else if (usuario.rol === 'Administrador') {
        navigation.replace('DashboardAdmin');
      } else {
        Alert.alert("Acceso Autorizado", "Bienvenido, pero tu rol no tiene una vista asignada.");
      }
    } catch (error) {
      // 3. BLOQUE DE CAPTURA DE ERRORES
      setIsLoading(false);

      if (error.response) {
        // El servidor respondió con un error conocido (Excepciones 2 y 4)
        if (error.response.status === 401) {
          // EXCEPCIÓN 4: Credenciales inválidas (Denegación de acceso)
          setLoginError('❌ Credenciales inválidas. Verifique su RUT y contraseña.');
        } else if (error.response.status === 500) {
          // EXCEPCIÓN 2: Fallo criptográfico o de base de datos en el servidor
          setLoginError('⚠️ Servicio no disponible temporalmente. Intente nuevamente en unos segundos.');
        } else {
          // Cualquier otro error del backend no mapeado
          setLoginError(error.response.data.error || 'Ocurrió un error en la autenticación.');
        }
      } else {
        // EXCEPCIÓN 3: El servidor nunca respondió (Caída de red o servidor apagado)
        setLoginError('🔌 Error de conexión con el servidor. Revise su internet o verifique que el backend esté encendido.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>FRO Salud</Text>
        <Text style={styles.subtitle}>Portal de Acceso Seguro</Text>
      </View>

      <View style={styles.formContainer}>
        
        <Text style={styles.label}>RUT</Text>
        <TextInput
          style={[styles.input, rutError ? styles.inputError : null]}
          placeholder="12.345.678-K"
          placeholderTextColor="#888888" 
          value={rut}
          onChangeText={setRut}
          autoCapitalize="none"
          editable={!isLoading}
        />
        {rutError ? <Text style={styles.errorText}>{rutError}</Text> : null}

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#888888" 
          secureTextEntry={true} 
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          editable={!isLoading}
        />

        {/* Aquí se muestran los mensajes de las Excepciones 2, 3 y 4 */}
        {loginError ? <Text style={styles.errorTextGeneral}>{loginError}</Text> : null}

        <View style={styles.buttonContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#0052cc" />
          ) : (
            <TouchableOpacity 
              style={[styles.loginButton, !isFormValid ? styles.loginButtonDisabled : null]} 
              onPress={handleLogin}
              disabled={!isFormValid || isLoading} 
            >
              <Text style={[styles.loginButtonText, !isFormValid ? styles.loginButtonTextDisabled : null]}>
                INICIAR SESIÓN
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <TouchableOpacity 
        style={styles.registerLink} 
        onPress={() => navigation.navigate('Register')}
        disabled={isLoading}
      >
        <Text style={styles.registerLinkText}>
          ¿No tienes cuenta? <Text style={styles.registerLinkHighlight}>Regístrate aquí</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8', justifyContent: 'center', padding: 20 },
  headerContainer: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#0052cc', marginBottom: 5 },
  subtitle: { fontSize: 15, color: '#555555' },
  formContainer: { backgroundColor: '#ffffff', padding: 22, borderRadius: 10, borderWidth: 1, borderColor: '#e0e0e0', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  label: { color: '#333333', fontSize: 12, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#fafafa', color: '#000000', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, marginBottom: 16, borderWidth: 1, borderColor: '#cccccc' },
  inputError: { borderColor: '#d32f2f', backgroundColor: '#fff0f0' },
  errorText: { color: '#d32f2f', fontSize: 11, marginTop: -12, marginBottom: 12 },
  errorTextGeneral: { color: '#d32f2f', fontSize: 13, textAlign: 'center', marginBottom: 15, fontWeight: '500' },
  buttonContainer: { height: 50, justifyContent: 'center', marginTop: 10 },
  loginButton: { backgroundColor: '#0052cc', paddingVertical: 14, borderRadius: 6, alignItems: 'center' },
  loginButtonDisabled: { backgroundColor: '#e0e0e0' },
  loginButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  loginButtonTextDisabled: { color: '#999999' },
  registerLink: { marginTop: 30, alignItems: 'center' },
  registerLinkText: { color: '#666666', fontSize: 14 },
  registerLinkHighlight: { color: '#0052cc', fontWeight: 'bold' }
});