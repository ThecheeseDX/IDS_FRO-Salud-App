// Ruta: fro-vista/src/screens/Paciente/AgendamientoScreen.js
import React, { useState, useEffect, useContext } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import apiClient from '../../api/client';
import ErrorRetry from '../../components/ErrorRetry';

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Calcula la fecha real del próximo día de la semana dado
function proximaFecha(diaSemana) {
    const hoy = new Date();
    const diff = (diaSemana - hoy.getDay() + 7) % 7 || 7;
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + diff);
    return fecha.toISOString().split('T')[0];
}

export default function AgendamientoScreen({ navigation }) {
    const { userData } = useContext(AuthContext);

    // ── Estados ──────────────────────────────────────────────────────────────
    const [profesionales, setProfesionales] = useState([]);
    const [profesionalSeleccionado, setProfesionalSeleccionado] = useState(null);
    const [bloques, setBloques] = useState([]);
    const [bloqueSeleccionado, setBloqueSeleccionado] = useState(null);
    const [cargandoProfesionales, setCargandoProfesionales] = useState(true);
    const [cargandoBloques, setCargandoBloques] = useState(false);
    const [cargandoBloqueo, setCargandoBloqueo] = useState(false);
    const [errorRed, setErrorRed] = useState(false);

    // ── Cargar profesionales al entrar ───────────────────────────────────────
    const cargarProfesionales = async () => {
        setCargandoProfesionales(true);
        setErrorRed(false);
        try {
            const { data } = await apiClient.get('/citas/profesionales');
            setProfesionales(data);
        } catch (error) {
            // Excepción 1: pérdida de conexión
            setErrorRed(true);
        } finally {
            setCargandoProfesionales(false);
        }
    };

    useEffect(() => {
        cargarProfesionales();
    }, []);

    // ── Cargar disponibilidad del profesional seleccionado ───────────────────
    const seleccionarProfesional = async (profesional) => {
        setProfesionalSeleccionado(profesional);
        setBloqueSeleccionado(null);
        setCargandoBloques(true);
        try {
            const { data } = await apiClient.get(`/citas/disponibilidad/${profesional.profesional_id}`);
            setBloques(data);
        } catch (error) {
            Alert.alert('Error', 'No se pudo cargar la disponibilidad del profesional.');
            setBloques([]);
        } finally {
            setCargandoBloques(false);
        }
    };

    // ── CU15: Bloquear horario seleccionado ──────────────────────────────────
    const confirmarBloqueo = () => {
        if (!bloqueSeleccionado) {
            Alert.alert('Error', 'Selecciona un bloque horario primero.');
            return;
        }

        Alert.alert(
            'Confirmar reserva',
            `¿Deseas reservar el ${DIAS[bloqueSeleccionado.dia_semana]} de ${bloqueSeleccionado.hora_inicio} a ${bloqueSeleccionado.hora_fin} con ${profesionalSeleccionado.nombres} ${profesionalSeleccionado.apellido_paterno}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Confirmar', onPress: ejecutarBloqueo }
            ]
        );
    };

    const ejecutarBloqueo = async () => {
        setCargandoBloqueo(true);

        // Calcular fecha real del bloque
        const fecha = proximaFecha(parseInt(bloqueSeleccionado.dia_semana));
        const fecha_hora_inicio = `${fecha} ${bloqueSeleccionado.hora_inicio}`;
        const fecha_hora_fin = `${fecha} ${bloqueSeleccionado.hora_fin}`;

        try {
            const { data } = await apiClient.post('/citas/bloquear', {
                profesional_id: profesionalSeleccionado.profesional_id,
                sede_id: 1, // sede por defecto, ajustar según flujo real
                fecha_hora_inicio,
                fecha_hora_fin
            });

            // Poscondición CU15: bloque reservado exclusivamente
            Alert.alert(
                '¡Reserva exitosa!',
                `Tu cita ha sido agendada para el ${DIAS[bloqueSeleccionado.dia_semana]} ${fecha} de ${bloqueSeleccionado.hora_inicio} a ${bloqueSeleccionado.hora_fin}.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );

        } catch (error) {
            const err = error.response?.data;

            // Excepción 2: token caducado
            if (error.response?.status === 401) {
                Alert.alert('Sesión expirada', 'Tu sesión ha expirado. Inicia sesión nuevamente.');
                return;
            }

            // Excepción 4: colisión de reserva simultánea
            if (err?.error === 'BLOQUE_OCUPADO') {
                Alert.alert(
                    'Horario no disponible',
                    err.mensaje,
                    [{ text: 'Elegir otro horario', onPress: () => setBloqueSeleccionado(null) }]
                );
                return;
            }

            // Excepción 1: pérdida de conexión
            if (err?.error === 'CONEXION_PERDIDA' || !error.response) {
                Alert.alert('Sin conexión', 'Verifica tu conexión e intenta nuevamente.');
                return;
            }

            Alert.alert('Error', 'No se pudo completar la reserva. Intenta nuevamente.');
        } finally {
            setCargandoBloqueo(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    if (cargandoProfesionales) {
        return (
            <View style={styles.centrado}>
                <ActivityIndicator size="large" color="#0052cc" />
                <Text style={styles.cargandoTexto}>Cargando profesionales...</Text>
            </View>
        );
    }

    if (errorRed) {
        return <ErrorRetry mensaje="No se pudo conectar con el servidor." onRetry={cargarProfesionales} />;
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.titulo}>Agendar Cita</Text>

            {/* ── PASO 1: Seleccionar profesional ───────────────────────── */}
            <Text style={styles.paso}>Paso 1 — Selecciona un profesional</Text>
            {profesionales.map((prof) => (
                <TouchableOpacity
                    key={prof.profesional_id}
                    style={[
                        styles.tarjeta,
                        profesionalSeleccionado?.profesional_id === prof.profesional_id && styles.tarjetaSeleccionada
                    ]}
                    onPress={() => seleccionarProfesional(prof)}
                >
                    <Text style={styles.tarjetaNombre}>{prof.nombres} {prof.apellido_paterno}</Text>
                    <Text style={styles.tarjetaDetalle}>{prof.especialidad}</Text>
                    <Text style={styles.tarjetaDetalle}>⭐ {prof.calificacion_promedio}</Text>
                </TouchableOpacity>
            ))}

            {/* ── PASO 2: Seleccionar bloque horario ────────────────────── */}
            {profesionalSeleccionado && (
                <>
                    <Text style={styles.paso}>Paso 2 — Selecciona un bloque horario</Text>
                    {cargandoBloques ? (
                        <ActivityIndicator size="small" color="#0052cc" style={{ marginTop: 10 }} />
                    ) : bloques.length === 0 ? (
                        <Text style={styles.sinBloques}>No hay bloques disponibles.</Text>
                    ) : (
                        bloques.map((bloque, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.bloque,
                                    bloqueSeleccionado === bloque && styles.bloqueSeleccionado
                                ]}
                                onPress={() => setBloqueSeleccionado(bloque)}
                            >
                                <Text style={styles.bloqueDia}>{DIAS[bloque.dia_semana]}</Text>
                                <Text style={styles.bloqueHora}>{bloque.hora_inicio} — {bloque.hora_fin}</Text>
                            </TouchableOpacity>
                        ))
                    )}
                </>
            )}

            {/* ── PASO 3: Confirmar reserva ──────────────────────────────── */}
            {bloqueSeleccionado && (
                <TouchableOpacity
                    style={[styles.botonConfirmar, cargandoBloqueo && styles.botonDeshabilitado]}
                    onPress={confirmarBloqueo}
                    disabled={cargandoBloqueo}
                >
                    {cargandoBloqueo
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.botonTexto}>Confirmar Reserva</Text>}
                </TouchableOpacity>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f4f6f8' },
    centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    cargandoTexto: { marginTop: 10, color: '#666' },
    titulo: { fontSize: 24, fontWeight: 'bold', color: '#0052cc', marginBottom: 20 },
    paso: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 20, marginBottom: 10 },
    tarjeta: {
        backgroundColor: '#fff', padding: 16, borderRadius: 10,
        borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 10
    },
    tarjetaSeleccionada: { borderColor: '#0052cc', borderWidth: 2, backgroundColor: '#e8f0fe' },
    tarjetaNombre: { fontSize: 16, fontWeight: 'bold', color: '#1c3d5a' },
    tarjetaDetalle: { fontSize: 14, color: '#666', marginTop: 2 },
    bloque: {
        backgroundColor: '#fff', padding: 14, borderRadius: 10,
        borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 8,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
    },
    bloqueSeleccionado: { borderColor: '#2e7d32', borderWidth: 2, backgroundColor: '#e8f5e9' },
    bloqueDia: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    bloqueHora: { fontSize: 14, color: '#0052cc' },
    sinBloques: { color: '#999', fontStyle: 'italic', textAlign: 'center', marginTop: 10 },
    botonConfirmar: {
        backgroundColor: '#0052cc', padding: 16,
        borderRadius: 12, alignItems: 'center', marginTop: 24
    },
    botonDeshabilitado: { opacity: 0.6 },
    botonTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});