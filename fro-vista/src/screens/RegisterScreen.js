import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView, Alert, StyleSheet } from 'react-native';
import apiClient from '../api/client'; // Tu configuración de Axios

const RegisterScreen = ({ navigation }) => {
    // Estado del formulario
    const [formData, setFormData] = useState({
        rut: '', nombres: '', apellido_paterno: '', apellido_materno: '', email: '', telefono: '',
        contrasena: '', confirmar_contrasena: '',
        sexo_clinico: '', calle: '', numero_calle: '', departamento: '', comuna_id: '1', // Hardcodeado por ahora (Requiere CU de Comunas)
        emergencia_nombre: '', emergencia_parentesco: '', emergencia_telefono: ''
    });

    const handleChange = (name, value) => {
        setFormData({ ...formData, [name]: value });
    };

    const validarFormatosSintacticos = () => {
        // Excepción 3: Un campo no cumple el formato requerido
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            Alert.alert("Error", "El formato del correo electrónico es inválido.");
            return false;
        }
        
        // Excepción 4: Las contraseñas ingresadas no coinciden
        if (formData.contrasena !== formData.confirmar_contrasena) {
            Alert.alert("Alerta de discrepancia", "Las contraseñas no coinciden. Por favor, reingrese sus claves.");
            return false;
        }

        // Aquí puedes agregar la validación Módulo 11 del RUT en un utils/validators.js luego
        if(formData.rut.length < 8) {
            Alert.alert("Error", "El RUT ingresado no es válido.");
            return false;
        }

        return true;
    };

    const confirmarCreacionCuenta = async () => {
        if (!validarFormatosSintacticos()) return; // Desactiva el envío implícitamente si falla

        try {
            // Se ejecuta la llamada POST (Controlador API REST)
            const response = await apiClient.post('/auth/registrar', formData);
            
            if (response.status === 201) {
                // Notificación de registro exitoso
                Alert.alert("Éxito", "Paciente registrado exitosamente.", [
                    { text: "OK", onPress: () => navigation.navigate('Login') }
                ]);
            }
        } catch (error) {
            // Excepción 1 y 5: Red o indisponibilidad (Timeout o Network Error)
            if (!error.response) {
                Alert.alert("Error de red", "No se pudo conectar con el servidor. Compruebe su conexión a internet.");
            } else {
                // Excepción 6: Error interno de la BD o unicidad (Viene del backend)
                Alert.alert("Error del sistema", error.response.data.error || "El servicio no está disponible temporalmente.");
            }
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Interfaz de Registro Único</Text>

            <Text style={styles.sectionHeader}>Sección 1: Identidad y Credenciales</Text>
            <TextInput style={styles.input} placeholder="RUT" value={formData.rut} onChangeText={(v) => handleChange('rut', v)} />
            <TextInput style={styles.input} placeholder="Nombres" value={formData.nombres} onChangeText={(v) => handleChange('nombres', v)} />
            <TextInput style={styles.input} placeholder="Apellido Paterno" value={formData.apellido_paterno} onChangeText={(v) => handleChange('apellido_paterno', v)} />
            <TextInput style={styles.input} placeholder="Apellido Materno" value={formData.apellido_materno} onChangeText={(v) => handleChange('apellido_materno', v)} />
            <TextInput style={styles.input} placeholder="Correo Electrónico" keyboardType="email-address" value={formData.email} onChangeText={(v) => handleChange('email', v)} />
            <TextInput style={styles.input} placeholder="Teléfono (+56 9 XXXX XXXX)" keyboardType="phone-pad" value={formData.telefono} onChangeText={(v) => handleChange('telefono', v)} />
            <TextInput style={styles.input} placeholder="Contraseña" secureTextEntry value={formData.contrasena} onChangeText={(v) => handleChange('contrasena', v)} />
            <TextInput style={styles.input} placeholder="Confirmar Contraseña" secureTextEntry value={formData.confirmar_contrasena} onChangeText={(v) => handleChange('confirmar_contrasena', v)} />

            <Text style={styles.sectionHeader}>Sección 2: Parámetros Paciente</Text>
            <TextInput style={styles.input} placeholder="Sexo Clínico (Hombre/Mujer)" value={formData.sexo_clinico} onChangeText={(v) => handleChange('sexo_clinico', v)} />
            <TextInput style={styles.input} placeholder="Calle" value={formData.calle} onChangeText={(v) => handleChange('calle', v)} />
            <TextInput style={styles.input} placeholder="Número" value={formData.numero_calle} onChangeText={(v) => handleChange('numero_calle', v)} />
            <TextInput style={styles.input} placeholder="Departamento (Opcional)" value={formData.departamento} onChangeText={(v) => handleChange('departamento', v)} />
            
            <Text style={styles.subHeader}>Contacto de Emergencia</Text>
            <TextInput style={styles.input} placeholder="Nombre Contacto" value={formData.emergencia_nombre} onChangeText={(v) => handleChange('emergencia_nombre', v)} />
            <TextInput style={styles.input} placeholder="Parentesco" value={formData.emergencia_parentesco} onChangeText={(v) => handleChange('emergencia_parentesco', v)} />
            <TextInput style={styles.input} placeholder="Teléfono Emergencia" keyboardType="phone-pad" value={formData.emergencia_telefono} onChangeText={(v) => handleChange('emergencia_telefono', v)} />

            <View style={styles.buttonContainer}>
                <Button title="FINALIZAR REGISTRO DE PACIENTE" onPress={confirmarCreacionCuenta} color="#1c3d5a" />
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
    title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    sectionHeader: { fontSize: 16, fontWeight: 'bold', backgroundColor: '#e0e0e0', padding: 10, marginTop: 10, marginBottom: 10 },
    subHeader: { fontSize: 14, fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
    input: { borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff', padding: 10, marginBottom: 10, borderRadius: 5 },
    buttonContainer: { marginTop: 20, marginBottom: 40 }
});

export default RegisterScreen;