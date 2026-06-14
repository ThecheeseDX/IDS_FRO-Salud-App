import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, ScrollView, Alert, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import apiClient from '../api/client';
import { validateRut } from '../utils/validators';

const RegisterScreen = ({ navigation }) => {
    const [esProfesional, setEsProfesional] = useState(false);
    const [comunas, setComunas] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);
    const [errores, setErrores] = useState({});
    const [disponibilidad, setDisponibilidad] = useState([]);

    const [formData, setFormData] = useState({
        rut: '', nombres: '', apellido_paterno: '', apellido_materno: '', email: '', telefono: '', contrasena: '', confirmar_contrasena: '',
        sexo_clinico: '', calle: '', numero_calle: '', departamento: '', comuna_id: '', emergencia_nombre: '', emergencia_parentesco: '', emergencia_telefono: '',
        num_registro_salud: '', especialidad_id: '', tipo_sede: '', resena_curricular: ''
    });

    useEffect(() => {
        const cargarDatosBD = async () => {
            try {
                const resComunas = await apiClient.get('/auth/comunas');
                setComunas(resComunas.data);
                const resEspecialidades = await apiClient.get('/auth/especialidades');
                setEspecialidades(resEspecialidades.data);
            } catch (error) {
                console.error("Error cargando diccionarios", error);
            }
        };
        cargarDatosBD();
    }, []);

    const handleChange = (name, value) => {
        setFormData({ ...formData, [name]: value });
        if (errores[name]) setErrores({ ...errores, [name]: false });
    };

    const validarRUTProfesional = async () => {
        if (!validateRut(formData.rut)) {
            Alert.alert("Error", "Ingrese un RUT válido primero.");
            return;
        }
        try {
            const res = await apiClient.get(`/auth/validar-profesional/${formData.rut}`);
            if (res.status === 200) {
                setEsProfesional(true);
                Alert.alert("Acreditación Exitosa", "Se han habilitado los campos para registro médico.");
            }
        } catch (error) {
            if (error.response && error.response.status === 404) {
                Alert.alert("Acreditación Denegada", error.response.data.error);
            } else {
                Alert.alert("Error", "No se pudo validar el RUT en este momento.");
            }
            setEsProfesional(false);
        }
    };

    const agregarBloqueHorario = () => {
        setDisponibilidad([...disponibilidad, { dia_semana: '1', hora_inicio: '08:00', hora_fin: '12:00' }]);
    };

    const actualizarHorario = (index, campo, valor) => {
        const nuevosHorarios = [...disponibilidad];
        nuevosHorarios[index][campo] = valor;
        setDisponibilidad(nuevosHorarios);
    };

    const eliminarHorario = (index) => {
        const nuevosHorarios = disponibilidad.filter((_, i) => i !== index);
        setDisponibilidad(nuevosHorarios);
    };

    const validarFormatosSintacticos = () => {
        let nuevosErrores = {};
        let esValido = true;

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            nuevosErrores.email = true; esValido = false;
        }
        if (formData.contrasena !== formData.confirmar_contrasena) {
            nuevosErrores.contrasena = true; nuevosErrores.confirmar_contrasena = true; esValido = false;
            Alert.alert("Alerta de discrepancia", "Las contraseñas no coinciden.");
        }
        if (!validateRut(formData.rut)) { 
            nuevosErrores.rut = true; 
            esValido = false; 
        }

        if (!esProfesional) {
            if (formData.comuna_id === '') { nuevosErrores.comuna_id = true; esValido = false; }
            if (formData.sexo_clinico === '') { nuevosErrores.sexo_clinico = true; esValido = false; }
        } else {
            if(formData.num_registro_salud === '') { nuevosErrores.num_registro_salud = true; esValido = false; }
            if(formData.especialidad_id === '') { nuevosErrores.especialidad_id = true; esValido = false; }
            if(formData.tipo_sede === '') { nuevosErrores.tipo_sede = true; esValido = false; }
            if(disponibilidad.length === 0) { 
                Alert.alert("Agenda Vacía", "Debe agregar al menos un bloque horario."); 
                esValido = false; 
            }
        }

        setErrores(nuevosErrores);
        
        // SOLUCIÓN: Verificamos dinámicamente si hay algún error rojo en el formulario
        const tieneErroresRojos = Object.keys(nuevosErrores).some(key => key !== 'contrasena' && key !== 'confirmar_contrasena');
        
        if (tieneErroresRojos) {
            Alert.alert("Error", "Por favor, revise los campos marcados en rojo.");
        }

        return esValido;
    };

    const confirmarCreacionCuenta = async () => {
        if (!validarFormatosSintacticos()) return;

        try {
            const response = await apiClient.post('/auth/verificar-unicidad', {
                rut: formData.rut,
                email: formData.email
            });

            if (response.status === 200) {
                const mensajeDinamico = esProfesional
                    ? "¿Declara que los datos de contacto y la matriz horaria ingresada son precisos y veraces?"
                    : "¿Declara que sus datos personales y de contacto ingresados son precisos y veraces?";

                Alert.alert(
                    "Confirmación de Datos",
                    mensajeDinamico,
                    [
                        { text: "Cancelar (Revisar)", style: "cancel" },
                        { text: "Confirmar y Registrar", onPress: procesarRegistro }
                    ]
                );
            }
        } catch (error) {
            if (error.response && error.response.status === 409) {
                const campoError = error.response.data.campo;
                setErrores(prevErrores => ({ ...prevErrores, [campoError]: true }));
                Alert.alert("Aviso de Duplicidad", error.response.data.error);
            } else if (error.code === 'ECONNABORTED' || (error.message && error.message.includes('Network'))) {
                Alert.alert("Error de Conexión", "El servicio de validación no está disponible. Verifique su conexión y reintente.");
            } else {
                Alert.alert("Error del sistema", "Ocurrió un error inesperado al validar la información.");
            }
        }
    };

    // ── CAMBIO CU04 ───────────────────────────────────────────────────────────
    // Antes: navegaba directo a Login al recibir 201.
    // Ahora: el backend devuelve { usuario_id, email } junto al 201,
    //        y navegamos a OTPScreen pasando esos datos como parámetros.
    // ─────────────────────────────────────────────────────────────────────────
    const procesarRegistro = async () => {
        try {
            let response;
            if (esProfesional) {
                const payloadProfesional = { ...formData, disponibilidad };
                response = await apiClient.post('/auth/registrar-profesional', payloadProfesional);
            } else {
                response = await apiClient.post('/auth/registrar', formData);
            }

            if (response.status === 201) {
                const { usuario_id, email } = response.data;

                // Enmascarar email para mostrarlo en OTPScreen (ej: j***@gmail.com)
                const partes = email.split('@');
                const emailMascarado = partes[0][0] + '***@' + partes[1];

                navigation.navigate('OTP', {
                    usuario_id,
                    canal: 'EMAIL',
                    destino: emailMascarado,
                });
            }
        } catch (error) {
            const msg = error.response ? error.response.data.error : "No se pudo conectar con el servidor.";
            Alert.alert("Error del sistema", msg);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#f5f5f5' }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
                <Text style={styles.title}>{esProfesional ? "Alta de Profesional" : "Registro Único"}</Text>

                <Text style={styles.sectionHeader}>Sección 1: Identidad y Credenciales</Text>

                <View style={styles.row}>
                    <TextInput style={[styles.input, { width: '55%' }, errores.rut && styles.inputError]} placeholder="RUT (Sin puntos ni guion)" value={formData.rut} onChangeText={(v) => handleChange('rut', v)} />
                    <TouchableOpacity style={styles.btnValidar} onPress={validarRUTProfesional}>
                        <Text style={styles.txtBtnValidar}>Acreditar RUT Médico</Text>
                    </TouchableOpacity>
                </View>

                <TextInput style={[styles.input, errores.nombres && styles.inputError]} placeholder="Nombres" value={formData.nombres} onChangeText={(v) => handleChange('nombres', v)} />

                <View style={styles.row}>
                    <TextInput style={[styles.input, styles.halfInput, errores.apellido_paterno && styles.inputError]} placeholder="Apellido Paterno" value={formData.apellido_paterno} onChangeText={(v) => handleChange('apellido_paterno', v)} />
                    <TextInput style={[styles.input, styles.halfInput, errores.apellido_materno && styles.inputError]} placeholder="Apellido Materno" value={formData.apellido_materno} onChangeText={(v) => handleChange('apellido_materno', v)} />
                </View>

                <TextInput style={[styles.input, errores.email && styles.inputError]} placeholder="Correo Electrónico" keyboardType="email-address" value={formData.email} onChangeText={(v) => handleChange('email', v)} autoCapitalize="none" />
                <TextInput style={[styles.input, errores.telefono && styles.inputError]} placeholder="Teléfono (+56 9 XXXX XXXX)" keyboardType="phone-pad" value={formData.telefono} onChangeText={(v) => handleChange('telefono', v)} />
                <TextInput style={[styles.input, errores.contrasena && styles.inputError]} placeholder="Contraseña" secureTextEntry value={formData.contrasena} onChangeText={(v) => handleChange('contrasena', v)} />
                <TextInput style={[styles.input, errores.confirmar_contrasena && styles.inputError]} placeholder="Confirmar Contraseña" secureTextEntry value={formData.confirmar_contrasena} onChangeText={(v) => handleChange('confirmar_contrasena', v)} />

                {!esProfesional && (
                    <View>
                        <Text style={styles.sectionHeader}>Sección 2: Parámetros Paciente</Text>

                        <View style={[styles.pickerContainer, errores.sexo_clinico && styles.inputError]}>
                            <Picker selectedValue={formData.sexo_clinico} onValueChange={(v) => handleChange('sexo_clinico', v)}>
                                <Picker.Item label="Seleccione su Sexo..." value="" color="#999" />
                                <Picker.Item label="Hombre" value="Hombre" />
                                <Picker.Item label="Mujer" value="Mujer" />
                            </Picker>
                        </View>

                        <Text style={styles.subHeader}>Dirección</Text>
                        <View style={[styles.pickerContainer, errores.comuna_id && styles.inputError]}>
                            <Picker selectedValue={formData.comuna_id} onValueChange={(v) => handleChange('comuna_id', v)}>
                                <Picker.Item label="Seleccione su comuna..." value="" color="#999" />
                                {comunas.map((c) => (<Picker.Item key={c.comuna_id.toString()} label={c.nombre} value={c.comuna_id.toString()} />))}
                            </Picker>
                        </View>
                        <TextInput style={styles.input} placeholder="Calle" value={formData.calle} onChangeText={(v) => handleChange('calle', v)} />
                        <View style={styles.row}>
                            <TextInput style={[styles.input, styles.halfInput]} placeholder="Número" value={formData.numero_calle} onChangeText={(v) => handleChange('numero_calle', v)} />
                            <TextInput style={[styles.input, styles.halfInput]} placeholder="Depto (Opcional)" value={formData.departamento} onChangeText={(v) => handleChange('departamento', v)} />
                        </View>

                        <Text style={styles.subHeader}>Contacto de Emergencia</Text>
                        <TextInput style={styles.input} placeholder="Nombre Contacto" value={formData.emergencia_nombre} onChangeText={(v) => handleChange('emergencia_nombre', v)} />
                        <View style={styles.row}>
                            <TextInput style={[styles.input, styles.halfInput]} placeholder="Parentesco" value={formData.emergencia_parentesco} onChangeText={(v) => handleChange('emergencia_parentesco', v)} />
                            <TextInput style={[styles.input, styles.halfInput]} placeholder="Teléfono" keyboardType="phone-pad" value={formData.emergencia_telefono} onChangeText={(v) => handleChange('emergencia_telefono', v)} />
                        </View>
                    </View>
                )}

                {esProfesional && (
                    <View>
                        <Text style={[styles.sectionHeader, { backgroundColor: '#d1ecf1' }]}>Sección 3: Acreditación Profesional</Text>

                        <TextInput style={[styles.input, errores.num_registro_salud && styles.inputError]} placeholder="Número de Registro Superintendencia" value={formData.num_registro_salud} onChangeText={(v) => handleChange('num_registro_salud', v)} />

                        <View style={[styles.pickerContainer, errores.especialidad_id && styles.inputError]}>
                            <Picker selectedValue={formData.especialidad_id} onValueChange={(v) => handleChange('especialidad_id', v)}>
                                <Picker.Item label="Especialidad Clínica..." value="" color="#999" />
                                {especialidades.map((e) => (<Picker.Item key={e.especialidad_id.toString()} label={e.nombre} value={e.especialidad_id.toString()} />))}
                            </Picker>
                        </View>

                        <View style={[styles.pickerContainer, errores.tipo_sede && styles.inputError]}>
                            <Picker selectedValue={formData.tipo_sede} onValueChange={(v) => handleChange('tipo_sede', v)}>
                                <Picker.Item label="Modalidad de Atención..." value="" color="#999" />
                                <Picker.Item label="Atención Domiciliaria" value="DOMICILIO" />
                                <Picker.Item label="Teleconsulta Online" value="ONLINE" />
                                <Picker.Item label="Ambas Modalidades" value="AMBOS" />
                            </Picker>
                        </View>

                        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Reseña Curricular (Breve)" multiline numberOfLines={3} value={formData.resena_curricular} onChangeText={(v) => handleChange('resena_curricular', v)} />

                        <Text style={styles.subHeader}>Matriz de Jornada Laboral</Text>
                        {disponibilidad.map((bloque, index) => (
                            <View key={index} style={styles.horarioBox}>
                                <View style={styles.pickerContainerHorario}>
                                    <Picker selectedValue={bloque.dia_semana} onValueChange={(v) => actualizarHorario(index, 'dia_semana', v)} style={{ height: 55, justifyContent: 'center' }}>
                                        <Picker.Item label="Lunes" value="1" />
                                        <Picker.Item label="Martes" value="2" />
                                        <Picker.Item label="Miércoles" value="3" />
                                        <Picker.Item label="Jueves" value="4" />
                                        <Picker.Item label="Viernes" value="5" />
                                        <Picker.Item label="Sábado" value="6" />
                                        <Picker.Item label="Domingo" value="7" />
                                    </Picker>
                                </View>
                                <View style={styles.row}>
                                    <TextInput style={[styles.input, { width: '40%', marginBottom: 0 }]} placeholder="Inicio (ej 08:00)" value={bloque.hora_inicio} onChangeText={(v) => actualizarHorario(index, 'hora_inicio', v)} />
                                    <TextInput style={[styles.input, { width: '40%', marginBottom: 0 }]} placeholder="Fin (ej 13:00)" value={bloque.hora_fin} onChangeText={(v) => actualizarHorario(index, 'hora_fin', v)} />
                                    <TouchableOpacity style={styles.btnEliminar} onPress={() => eliminarHorario(index)}>
                                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>X</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                        <Button title="+ Añadir Bloque Horario" onPress={agregarBloqueHorario} color="#457b9d" />
                    </View>
                )}

                <View style={styles.buttonContainer}>
                    <Button title={esProfesional ? "FINALIZAR ALTA MÉDICA" : "FINALIZAR REGISTRO PACIENTE"} onPress={confirmarCreacionCuenta} color={esProfesional ? "#2a9d8f" : "#1c3d5a"} />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
    title: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#1c3d5a' },
    sectionHeader: { fontSize: 16, fontWeight: 'bold', backgroundColor: '#e0e0e0', padding: 10, marginTop: 10, marginBottom: 15, borderRadius: 8 },
    subHeader: { fontSize: 14, fontWeight: 'bold', marginTop: 10, marginBottom: 10, color: '#444' },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    input: { borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff', padding: 12, marginBottom: 15, borderRadius: 25, fontSize: 15 },
    halfInput: { width: '48%' },
    inputError: { borderColor: '#ff4444', borderWidth: 2 },
    pickerContainer: { borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fff', borderRadius: 25, marginBottom: 15, overflow: 'hidden' },
    btnValidar: { backgroundColor: '#457b9d', width: '40%', borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    txtBtnValidar: { color: '#fff', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
    horarioBox: { backgroundColor: '#fff', padding: 10, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
    pickerContainerHorario: { borderWidth: 1, borderColor: '#ccc', borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
    btnEliminar: { backgroundColor: '#e63946', width: '15%', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    buttonContainer: { marginTop: 25, marginBottom: 50 }
});

export default RegisterScreen;