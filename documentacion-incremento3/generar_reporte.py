# -*- coding: utf-8 -*-
"""
Genera reporte-brechas-inc3.html: brechas entre lo documentado (Documento 0,
Incremento 1 e Incremento 2) y lo implementado en el Incremento 3.

Las listas del modelo relacional (MR, 1FN, 2FN, 3FN) salen de una sola fuente
de datos, con los cambios marcados: las tablas nuevas empiezan con "+" y los
atributos nuevos van entre {+ }. Así las cuatro listas no se desincronizan.
"""
import html, re

# ─────────────────────────────────────────────────────────────────────────────
#  Modelo relacional: base = anexo del Incremento 2, con los cambios del Inc 3
# ─────────────────────────────────────────────────────────────────────────────

MR = """
Usuario (usuario_id, rut, nombre_completo, email, telefono, contraseña_hash, rol_acceso, cuenta_activo, hora_creacion, otp_codigo, otp_expiracion, {+dispositivos_push {token, plataforma, activo, momento_registro}}, {+areas_soporte {categoria}})
+Preferencia_Notificacion (usuario_id, canal_push, canal_email, ultima_modificacion)
Sesion_Usuario (sesion_usuario_id, jti, dispositivo, dispositivo_id, ip_origen, momento_inicio, activa, usuario_id)
Paciente (paciente_id, sexo_clinico, direccion, comuna, contacto_emergencia_nombre, contacto_emergencia_telefono, contacto_emergencia_parentesco, privacidad_contacto, {+resena_anonima}, usuario_id)
Profesional (profesional_id, num_registro_salud, reseña_curricular, areas_experticia, disponibilidad_horaria {dia, inicio, fin, modalidad}, {+comunas_atencion {comuna}}, calificacion_promedio, foto_url, tipo_sede, usuario_id, especialidad_id)
Bloqueo_Agenda (bloqueo_id, fecha_inicio, fecha_fin, motivo, profesional_id)
Profesional_Autorizado (rut_autorizado, habilitado, administrador_id)
Especialidad (especialidad_id, nombre, descripcion)
Sede (sede_id, nombre, horario_operacion, estado_sede)
Sede_Online (sede_id, link, contraseña, codigo)
Sede_Presencial (sede_id, direccion, comuna, infraestructura)
Triaje (triaje_id, estado, respuestas, momento_inicio, momento_completado, integrado, paciente_id)
+Reporte_Preclinico (reporte_preclinico_id, resumen, banderas, etiquetas, suficiente, momento_creacion, triaje_id, paciente_id, especialidad_sugerida_id)
Ficha_Clinica (ficha_clinica_id, ultima_actualizacion, antecedentes_quirurgicos, antecedentes_patologicos, anamnesis, plantilla_especialidad, alergias, paciente_id)
Episodio_Clinico (episodio_clinico_id, motivo_consulta, fecha_inicio, fecha_terminado, estado, paciente_id, profesional_id)
Evolucion_Clinica (evolucion_clinica_id, inalterable, hora_firma_digital, firma_digital, porcentaje_objetivo, respuesta_fisiologica, tecnicas_aplicadas, correcciones {numero, texto, fecha, profesional}, episodio_clinico_id, profesional_id)
Documento_Clinico (documento_id, nombre_original, categoria, formato, tamano_bytes, tipo_recurso, url_publica, public_id_cloud, paginas, fecha_carga, paciente_id, episodio_clinico_id, profesional_id)
Cita (cita_id, fecha_hora_inicio, fecha_hora_fin, checkin_profesional, checkin_paciente, estado, motivo_cancelacion, coordenadas_gps_paciente, coordenadas_gps_profesional, modalidad, evidencia_presencial, firma_conformidad_datos, sesion_certificada_en, certificacion_tipo, sesion_suspendida_en, motivo_suspension, firma_conformidad_url, metadatos_teleconsulta, paciente_id, profesional_id, sede_id, episodio_clinico_id)
+Solicitud_Confirmacion (solicitud_confirmacion_id, token, momento_envio, momento_expira, momento_respuesta, respuesta, canal_respuesta, cita_id)
Lista_Espera (lista_espera_id, momento_inscripcion, posicion, notificado, {+estado}, {+momento_notificacion}, {+momento_expira}, {+token_cupo}, paciente_id, cita_id)
Pauta_Tratamiento (pauta_tratamiento_id, nombre, estado, fecha_inicio, fecha_expiracion, ejercicios {nombre, series, repeticiones, frecuencia, material, fechas_cumplidas}, episodio_clinico_id)
Material_Terapeutico (material_terapeutico_id, nombre, tipo, url_archivo, categoria, formato, disponibilidad)
+Indicador_Adherencia (indicador_adherencia_id, fecha, porcentaje, tareas_programadas, tareas_cumplidas, momento_calculo, paciente_id)
+Reporte_Sintoma (reporte_sintoma_id, nivel_dolor, limitacion_funcional, comentario, clave_envio, momento_registro, paciente_id, episodio_clinico_id)
+Alerta_Clinica (alerta_clinica_id, tipo, severidad, motivo, datos, estado, momento_creacion, momento_revision, paciente_id, profesional_id, reporte_sintoma_id)
Financiador (financiador_id, nombre_institucion, rut_institucion, convenio_activo)
Bono (bono_id, folio, financiador, monto_cobertura, copago, estado_validacion, payload_respuesta, cita_id, financiador_id)
Transaccion (transaccion_id, monto_total, monto_diferencial, tipo, estado, momento_pago, metodo_pago, cita_id)
+Liquidacion (liquidacion_id, anio, mes, sesiones_validadas, monto_prestaciones, bonificacion, monto_total, observacion, momento_emision, profesional_id, emitida_por)
Evaluacion_Satisfaccion (evaluacion_satisfaccion_id, puntuacion, reseña, estado_moderacion, {+motivo_rechazo}, {+momento_moderacion}, momento_creacion, cita_id, {+moderador_id})
Notificacion (notificacion_id, canal, tipo, {+titulo}, contenido, {+datos}, momento_envio, leida, usuario_id)
Ticket_Soporte (ticket_soporte_id, categoria, descripcion, estado, momento_creacion, {+momento_enrutamiento}, momento_resuelto, {+adjunto_url}, {+resolucion}, usuario_id, {+asignado_a})
Bitacora_Auditoria (bitacora_auditoria_id, accion, entidad_afectada, ip_origen, momento_evento, datos_adicionales, usuario_id)
Mensaje_Chat (mensaje_id, contenido_cifrado, bloqueado, {+leido}, momento_envio, episodio_clinico_id, {+remitente_usuario_id})
+Palabra_Restringida (palabra_restringida_id, termino, categoria, activa, momento_creacion, administrador_id)
Objetivo_Terapeutico (objetivo_terapeutico_id, descripcion, meta_valor, valor_actual, unidad, episodio_clinico_id)
Derivacion_Interna (derivacion_interna_id, estado, justificacion, momento_creacion, episodio_clinico_id, profesional_origen_id, profesional_destino_id)
Paquete_Sesiones (paquete_sesiones_id, sesiones_total, sesiones_usadas, estado, precio_total, momento_adquisicion, paciente_id)
Disclaimer (disclaimer_id, momento_aceptacion, version_disclaimer, paciente_id)
Parametro_Global (parametro_id, clave, valor, descripcion, ultima_modificacion, administrador_id)
"""

# 1FN y 2FN son idénticas en el anexo del Incremento 2 (la 2FN no separa
# nada nuevo); se mantiene ese criterio.
FN1 = """
Usuario (usuario_id, rut, nombres, apellido_paterno, apellido_materno, email, contraseña_hash, rol_acceso, cuenta_activo, hora_creacion, otp_codigo, otp_expiracion)
Usuario_Telefono (usuario_id, telefono)
+Dispositivo_Push (dispositivo_push_id, token, plataforma, activo, momento_registro, usuario_id)
+Area_Soporte_Operador (usuario_id, categoria)
+Preferencia_Notificacion (usuario_id, canal_push, canal_email, ultima_modificacion)
Sesion_Usuario (sesion_usuario_id, jti, dispositivo, dispositivo_id, ip_origen, momento_inicio, activa, usuario_id)
Comuna (comuna_id, nombre_comuna)
Paciente (paciente_id, sexo_clinico, calle, numero_calle, departamento, contacto_emergencia_nombre, contacto_emergencia_telefono, contacto_emergencia_parentesco, privacidad_contacto, {+resena_anonima}, usuario_id, comuna_id)
Profesional (profesional_id, num_registro_salud, reseña_curricular, areas_experticia, calificacion_promedio, foto_url, tipo_sede, usuario_id, especialidad_id)
+Profesional_Comuna (profesional_id, comuna_id)
Bloqueo_Agenda (bloqueo_id, fecha_inicio, fecha_fin, motivo, profesional_id)
Profesional_Autorizado (rut_autorizado, habilitado, administrador_id)
Profesional_Disponibilidad (profesional_id, dia_semana, hora_inicio, hora_fin, modalidad)
Especialidad (especialidad_id, nombre, descripcion)
Sede (sede_id, nombre, estado_sede)
Sede_Horario (sede_id, dia_semana, hora_apertura, hora_cierre)
Sede_Online (sede_id, link, contraseña, codigo)
Sede_Presencial (sede_id, calle, numero_calle, departamento, infraestructura, comuna_id)
Triaje (triaje_id, estado, respuestas, momento_inicio, momento_completado, integrado, paciente_id)
+Reporte_Preclinico (reporte_preclinico_id, resumen, banderas, etiquetas, suficiente, momento_creacion, triaje_id, paciente_id, especialidad_sugerida_id)
Ficha_Clinica (ficha_clinica_id, ultima_actualizacion, anamnesis, plantilla_especialidad, paciente_id)
Ficha_Alergia (ficha_clinica_id, alergia)
Ficha_Antecedente_Quirurgico (ficha_clinica_id, antecedente)
Ficha_Antecedente_Patologico (ficha_clinica_id, antecedente)
Episodio_Clinico (episodio_clinico_id, motivo_consulta, fecha_inicio, fecha_terminado, estado, paciente_id, profesional_id)
Evolucion_Clinica (evolucion_clinica_id, inalterable, hora_firma_digital, firma_digital, porcentaje_objetivo, respuesta_fisiologica, tecnicas_aplicadas, episodio_clinico_id, profesional_id)
Evolucion_Version (version_id, numero_version, texto_correccion, fecha_creacion, evolucion_clinica_id, profesional_id)
Documento_Clinico (documento_id, nombre_original, categoria, formato, tamano_bytes, tipo_recurso, url_publica, public_id_cloud, paginas, fecha_carga, paciente_id, episodio_clinico_id, profesional_id)
Cita (cita_id, fecha_hora_inicio, fecha_hora_fin, checkin_profesional, checkin_paciente, estado, motivo_cancelacion, coordenadas_gps_paciente, coordenadas_gps_profesional, modalidad, evidencia_presencial, firma_conformidad_datos, sesion_certificada_en, certificacion_tipo, sesion_suspendida_en, motivo_suspension, firma_conformidad_url, metadatos_teleconsulta, paciente_id, profesional_id, sede_id, episodio_clinico_id)
+Solicitud_Confirmacion (solicitud_confirmacion_id, token, momento_envio, momento_expira, momento_respuesta, respuesta, canal_respuesta, cita_id)
Lista_Espera (lista_espera_id, momento_inscripcion, posicion, notificado, {+estado}, {+momento_notificacion}, {+momento_expira}, {+token_cupo}, paciente_id, cita_id)
Pauta_Tratamiento (pauta_tratamiento_id, nombre, estado, fecha_inicio, fecha_expiracion, episodio_clinico_id)
Pauta_Ejercicio (pauta_ejercicio_id, nombre_ejercicio, series, repeticiones, frecuencia, pauta_tratamiento_id, material_terapeutico_id)
Pauta_Cumplimiento (pauta_cumplimiento_id, fecha, momento_registro, pauta_ejercicio_id)
Material_Terapeutico (material_terapeutico_id, nombre, tipo, url_archivo, categoria, formato, disponibilidad)
+Indicador_Adherencia (indicador_adherencia_id, fecha, porcentaje, tareas_programadas, tareas_cumplidas, momento_calculo, paciente_id)
+Reporte_Sintoma (reporte_sintoma_id, nivel_dolor, limitacion_funcional, comentario, clave_envio, momento_registro, paciente_id, episodio_clinico_id)
+Alerta_Clinica (alerta_clinica_id, tipo, severidad, motivo, datos, estado, momento_creacion, momento_revision, paciente_id, profesional_id, reporte_sintoma_id)
Financiador (financiador_id, nombre_institucion, rut_institucion, convenio_activo)
Bono (bono_id, folio, financiador, monto_cobertura, copago, estado_validacion, payload_respuesta, cita_id)
Transaccion (transaccion_id, monto_total, monto_diferencial, tipo, estado, momento_pago, metodo_pago, cita_id, financiador_id)
+Liquidacion (liquidacion_id, anio, mes, sesiones_validadas, monto_prestaciones, bonificacion, monto_total, observacion, momento_emision, profesional_id, emitida_por)
Evaluacion_Satisfaccion (evaluacion_satisfaccion_id, puntuacion, reseña, estado_moderacion, {+motivo_rechazo}, {+momento_moderacion}, momento_creacion, cita_id, {+moderador_id})
Notificacion (notificacion_id, canal, tipo, {+titulo}, contenido, {+datos}, momento_envio, leida, usuario_id)
Ticket_Soporte (ticket_soporte_id, categoria, descripcion, estado, momento_creacion, {+momento_enrutamiento}, momento_resuelto, {+adjunto_url}, {+resolucion}, usuario_id, {+asignado_a})
Bitacora_Auditoria (bitacora_auditoria_id, accion, entidad_afectada, ip_origen, momento_evento, datos_adicionales, usuario_id)
Mensaje_Chat (mensaje_id, contenido_cifrado, bloqueado, {+leido}, momento_envio, episodio_clinico_id, {+remitente_usuario_id})
+Palabra_Restringida (palabra_restringida_id, termino, categoria, activa, momento_creacion, administrador_id)
Objetivo_Terapeutico (objetivo_terapeutico_id, descripcion, meta_valor, valor_actual, unidad, episodio_clinico_id)
Derivacion_Interna (derivacion_interna_id, estado, justificacion, momento_creacion, episodio_clinico_id, profesional_origen_id, profesional_destino_id)
Paquete_Sesiones (paquete_sesiones_id, sesiones_total, sesiones_usadas, estado, precio_total, momento_adquisicion, paciente_id)
Disclaimer (disclaimer_id, momento_aceptacion, version_disclaimer, paciente_id)
Parametro_Global (parametro_id, clave, valor, descripcion, ultima_modificacion, administrador_id)
"""
FN2 = FN1

FN3 = """
Rol (rol_id, nombre_rol)
Usuario (usuario_id, rut, nombres, apellido_paterno, apellido_materno, email, contraseña_hash, cuenta_activo, hora_creacion, otp_codigo, otp_expiracion, rol_id)
Usuario_Telefono (usuario_id, telefono)
+Dispositivo_Push (dispositivo_push_id, token, plataforma, activo, momento_registro, usuario_id)
+Area_Soporte_Operador (usuario_id, categoria)
+Preferencia_Notificacion (usuario_id, canal_push, canal_email, ultima_modificacion)
Sesion_Usuario (sesion_usuario_id, jti, dispositivo, dispositivo_id, ip_origen, momento_inicio, activa, usuario_id)
Comuna (comuna_id, nombre_comuna)
Contacto_Emergencia (contacto_emergencia_id, nombre, telefono, parentesco)
Paciente (paciente_id, sexo_clinico, calle, numero_calle, departamento, privacidad_contacto, {+resena_anonima}, contacto_emergencia_id, usuario_id, comuna_id)
Profesional (profesional_id, num_registro_salud, reseña_curricular, areas_experticia, calificacion_promedio, foto_url, tipo_sede, usuario_id, especialidad_id)
+Profesional_Comuna (profesional_id, comuna_id)
Bloqueo_Agenda (bloqueo_id, fecha_inicio, fecha_fin, motivo, profesional_id)
Profesional_Autorizado (rut_autorizado, habilitado, administrador_id)
Profesional_Disponibilidad (profesional_id, dia_semana, hora_inicio, hora_fin, modalidad)
Especialidad (especialidad_id, nombre, descripcion)
Sede (sede_id, nombre, estado_sede)
Sede_Horario (sede_id, dia_semana, hora_apertura, hora_cierre)
Sede_Online (sede_id, link, contraseña, codigo)
Sede_Presencial (sede_id, calle, numero_calle, departamento, infraestructura, comuna_id)
Triaje (triaje_id, estado, respuestas, momento_inicio, momento_completado, integrado, paciente_id)
+Reporte_Preclinico (reporte_preclinico_id, resumen, banderas, etiquetas, suficiente, momento_creacion, triaje_id, paciente_id, especialidad_sugerida_id)
Ficha_Clinica (ficha_clinica_id, ultima_actualizacion, anamnesis, plantilla_especialidad, paciente_id)
Ficha_Alergia (ficha_clinica_id, alergia)
Ficha_Antecedente_Quirurgico (ficha_clinica_id, antecedente)
Ficha_Antecedente_Patologico (ficha_clinica_id, antecedente)
Episodio_Clinico (episodio_clinico_id, motivo_consulta, fecha_inicio, fecha_terminado, estado, paciente_id, profesional_id)
Evolucion_Clinica (evolucion_clinica_id, inalterable, hora_firma_digital, firma_digital, porcentaje_objetivo, respuesta_fisiologica, tecnicas_aplicadas, episodio_clinico_id, profesional_id)
Evolucion_Version (version_id, numero_version, texto_correccion, fecha_creacion, evolucion_clinica_id, profesional_id)
Documento_Clinico (documento_id, nombre_original, categoria, formato, tamano_bytes, tipo_recurso, url_publica, public_id_cloud, paginas, fecha_carga, paciente_id, episodio_clinico_id, profesional_id)
Cita (cita_id, fecha_hora_inicio, fecha_hora_fin, checkin_profesional, checkin_paciente, estado, motivo_cancelacion, coordenadas_gps_paciente, coordenadas_gps_profesional, modalidad, evidencia_presencial, firma_conformidad_datos, sesion_certificada_en, certificacion_tipo, sesion_suspendida_en, motivo_suspension, firma_conformidad_url, metadatos_teleconsulta, paciente_id, profesional_id, sede_id, episodio_clinico_id)
+Solicitud_Confirmacion (solicitud_confirmacion_id, token, momento_envio, momento_expira, momento_respuesta, respuesta, canal_respuesta, cita_id)
Lista_Espera (lista_espera_id, momento_inscripcion, posicion, notificado, {+estado}, {+momento_notificacion}, {+momento_expira}, {+token_cupo}, paciente_id, cita_id)
Pauta_Tratamiento (pauta_tratamiento_id, nombre, estado, fecha_inicio, fecha_expiracion, episodio_clinico_id)
Pauta_Ejercicio (pauta_ejercicio_id, nombre_ejercicio, series, repeticiones, frecuencia, pauta_tratamiento_id, material_terapeutico_id)
Pauta_Cumplimiento (pauta_cumplimiento_id, fecha, momento_registro, pauta_ejercicio_id)
Material_Terapeutico (material_terapeutico_id, nombre, tipo, url_archivo, categoria, formato, disponibilidad)
+Indicador_Adherencia (indicador_adherencia_id, fecha, porcentaje, tareas_programadas, tareas_cumplidas, momento_calculo, paciente_id)
+Reporte_Sintoma (reporte_sintoma_id, nivel_dolor, limitacion_funcional, comentario, clave_envio, momento_registro, paciente_id, episodio_clinico_id)
+Alerta_Clinica (alerta_clinica_id, tipo, severidad, motivo, datos, estado, momento_creacion, momento_revision, paciente_id, profesional_id, reporte_sintoma_id)
Financiador (financiador_id, nombre_institucion, rut_institucion, convenio_activo)
Bono (bono_id, folio, monto_cobertura, copago, estado_validacion, payload_respuesta, cita_id, financiador_id)
Transaccion (transaccion_id, monto_total, tipo, estado, momento_pago, metodo_pago, cita_id)
+Liquidacion (liquidacion_id, anio, mes, sesiones_validadas, monto_prestaciones, bonificacion, monto_total, observacion, momento_emision, profesional_id, emitida_por)
Evaluacion_Satisfaccion (evaluacion_satisfaccion_id, puntuacion, reseña, estado_moderacion, {+motivo_rechazo}, {+momento_moderacion}, momento_creacion, cita_id, {+moderador_id})
Notificacion (notificacion_id, canal, tipo, {+titulo}, contenido, {+datos}, momento_envio, leida, usuario_id)
Ticket_Soporte (ticket_soporte_id, categoria, descripcion, estado, momento_creacion, {+momento_enrutamiento}, momento_resuelto, {+adjunto_url}, {+resolucion}, usuario_id, {+asignado_a})
Bitacora_Auditoria (bitacora_auditoria_id, accion, entidad_afectada, ip_origen, momento_evento, datos_adicionales, usuario_id)
Mensaje_Chat (mensaje_id, contenido_cifrado, bloqueado, {+leido}, momento_envio, episodio_clinico_id, {+remitente_usuario_id})
+Palabra_Restringida (palabra_restringida_id, termino, categoria, activa, momento_creacion, administrador_id)
Objetivo_Terapeutico (objetivo_terapeutico_id, descripcion, meta_valor, valor_actual, unidad, episodio_clinico_id)
Derivacion_Interna (derivacion_interna_id, estado, justificacion, momento_creacion, episodio_clinico_id, profesional_origen_id, profesional_destino_id)
Paquete_Sesiones (paquete_sesiones_id, sesiones_total, sesiones_usadas, estado, precio_total, momento_adquisicion, paciente_id)
Disclaimer (disclaimer_id, momento_aceptacion, version_disclaimer, paciente_id)
=Parametro_Global (parametro_id, clave, valor, descripcion, ultima_modificacion, administrador_id)
"""


# ─────────────────────────────────────────────────────────────────────────────
#  Claves: la PK va con subrayado continuo y la FK con subrayado discontinuo.
#  Salen de schema.sql y de las migraciones (lo que existe en la base); lo que
#  el esquema no declara se completa con el criterio del modelo lógico.
# ─────────────────────────────────────────────────────────────────────────────
import os

def _claves_del_esquema():
    raiz = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fro-controlador')
    esquema = open(os.path.join(raiz, 'src/database/mysql/schema.sql'), encoding='utf-8').read()
    pks, fks = {}, {}
    for m in re.finditer(r'CREATE TABLE (?:IF NOT EXISTS )?`?(\w+)`?\s*\((.*?)\n\)\s*[^;]*;', esquema, re.S):
        tabla, cuerpo = m.group(1), m.group(2)
        for linea in cuerpo.split('\n'):
            linea = linea.strip()
            u = re.match(r'`?(\w+)`?\s+\w+.*PRIMARY KEY', linea)
            if u: pks[tabla] = [u.group(1).lower()]
            u = re.match(r'PRIMARY KEY\s*\(([^)]*)\)', linea)
            if u: pks[tabla] = [x.strip(' `').lower() for x in u.group(1).split(',')]
            for u in re.finditer(r'FOREIGN KEY\s*\(`?(\w+)`?\)', linea):
                fks.setdefault(tabla, set()).add(u.group(1))
    # Claves foráneas agregadas por migración: ALTER TABLE X ... FOREIGN KEY (col)
    migraciones = open(os.path.join(raiz, 'scripts/migrar-db.js'), encoding='utf-8').read()
    for m in re.finditer(r'ALTER TABLE `?(\w+)`?[^;`]*?FOREIGN KEY\s*\(`?(\w+)`?\)', migraciones, re.S):
        fks.setdefault(m.group(1), set()).add(m.group(2))
    return pks, fks

PK_ESQUEMA, FK_ESQUEMA = _claves_del_esquema()

# Donde el modelo lógico difiere del esquema o el esquema no lo declara.
PK_LOGICA = {
    # En schema.sql la clave es solo sede_id (una sede tendría un único
    # horario): en la normalización la clave es la pareja sede/día.
    'Sede_Horario': ['sede_id', 'dia_semana'],
}
# Columnas que referencian a otra tabla aunque el esquema no declare la FK.
FK_LOGICA = {'administrador_id', 'moderador_id', 'financiador_id', 'rol_id', 'contacto_emergencia_id',
             'comuna_id', 'especialidad_id', 'usuario_id', 'paciente_id', 'profesional_id', 'cita_id',
             'episodio_clinico_id', 'sede_id', 'triaje_id', 'ficha_clinica_id', 'evolucion_clinica_id',
             'pauta_tratamiento_id', 'pauta_ejercicio_id', 'material_terapeutico_id', 'reporte_sintoma_id'}


def _atributos(cuerpo):
    """Separa los atributos del primer nivel (los grupos {…} quedan enteros)."""
    partes, nivel, actual = [], 0, ''
    for c in cuerpo:
        if c == '{': nivel += 1
        if c == '}': nivel -= 1
        if c == ',' and nivel == 0:
            partes.append(actual.strip()); actual = ''
        else:
            actual += c
    if actual.strip(): partes.append(actual.strip())
    return partes


def _marcar(atributo, pk, fk):
    """Atributo simple → subrayado según su papel; los grupos no llevan marca."""
    if '{' in atributo:
        return html.escape(atributo)
    nombre = atributo.strip()
    if nombre.lower() in pk:
        return f'<u class="pk">{html.escape(nombre)}</u>'
    if nombre in fk:
        return f'<u class="fk">{html.escape(nombre)}</u>'
    return html.escape(nombre)


def lista_relacional(texto):
    """Convierte las líneas del MR en HTML: claves subrayadas y cambios marcados."""
    filas = []
    for linea in texto.strip().split('\n'):
        nueva_tabla = linea.startswith('+')
        repuesta = linea.startswith('=')   # estaba en 1FN/2FN del anexo pero faltaba en su 3FN
        if nueva_tabla or repuesta:
            linea = linea[1:]
        nombre, cuerpo = linea.split(' (', 1)
        cuerpo = cuerpo.rsplit(')', 1)[0]
        attrs = _atributos(cuerpo)
        limpios = [a[2:-1].strip() if a.startswith('{+') else a for a in attrs]
        simples = [a for a in limpios if '{' not in a]
        pk = PK_LOGICA.get(nombre) or PK_ESQUEMA.get(nombre) or simples[:1]
        pk = [x.lower() for x in pk]
        fk = set(FK_ESQUEMA.get(nombre, ())) | {a for a in simples if a in FK_LOGICA and a.lower() not in pk}
        # La PK que además referencia a otra tabla (Sede_Online.sede_id) se
        # marca como PK: es la marca que manda.
        piezas = []
        for original, limpio in zip(attrs, limpios):
            marcado = _marcar(limpio, pk, fk)
            piezas.append(f'<mark>{marcado}</mark>' if original.startswith('{+') else marcado)
        clase = ' class="nueva"' if nueva_tabla else (' class="repuesta"' if repuesta else '')
        filas.append(f'<li{clase}><b>{html.escape(nombre)}</b> ({", ".join(piezas)})</li>')
    return '<ol class="mr">' + '\n'.join(filas) + '</ol>'


# ─────────────────────────────────────────────────────────────────────────────
#  Modelo físico: tablas nuevas y modificadas (tipos reales de MySQL)
# ─────────────────────────────────────────────────────────────────────────────

FISICO = [
 ('Preferencia_Notificacion', 'nueva · CU52', [
   ('usuario_id','INT','PK, FK → Usuario'),
   ('canal_push','BOOLEAN','NOT NULL, DEFAULT TRUE'),
   ('canal_email','BOOLEAN','NOT NULL, DEFAULT TRUE'),
   ('ultima_modificacion','TIMESTAMP','DEFAULT CURRENT_TIMESTAMP ON UPDATE'),
 ]),
 ('Dispositivo_Push', 'nueva · CU52', [
   ('dispositivo_push_id','INT','PK, AUTO_INCREMENT'),
   ('token','VARCHAR(255)','NOT NULL, UNIQUE'),
   ('plataforma','VARCHAR(20)',"NOT NULL, DEFAULT 'DESCONOCIDA'"),
   ('activo','BOOLEAN','NOT NULL, DEFAULT TRUE'),
   ('momento_registro','TIMESTAMP','DEFAULT CURRENT_TIMESTAMP'),
   ('usuario_id','INT','NOT NULL, FK → Usuario'),
 ]),
 ('Solicitud_Confirmacion', 'nueva · CU21', [
   ('solicitud_confirmacion_id','INT','PK, AUTO_INCREMENT'),
   ('token','VARCHAR(64)','NOT NULL, UNIQUE'),
   ('momento_envio','TIMESTAMP','DEFAULT CURRENT_TIMESTAMP'),
   ('momento_expira','TIMESTAMP','NOT NULL'),
   ('momento_respuesta','TIMESTAMP','NULL'),
   ('respuesta','VARCHAR(20)','NULL (CONFIRMADA / CANCELADA)'),
   ('canal_respuesta','VARCHAR(20)','NULL (APP / CORREO)'),
   ('cita_id','INT','NOT NULL, UNIQUE, FK → Cita (relación 1:1)'),
 ]),
 ('Reporte_Preclinico', 'nueva · CU25/CU26', [
   ('reporte_preclinico_id','INT','PK, AUTO_INCREMENT'),
   ('resumen','TEXT','NOT NULL'),
   ('banderas','JSON','lista de {codigo, texto, severidad}'),
   ('etiquetas','JSON','lista de etiquetas clínicas'),
   ('suficiente','BOOLEAN','NOT NULL, DEFAULT TRUE'),
   ('especialidad_sugerida_id','INT','NULL, FK → Especialidad'),
   ('momento_creacion','TIMESTAMP','DEFAULT CURRENT_TIMESTAMP'),
   ('triaje_id','INT','NOT NULL, UNIQUE, FK → Triaje (relación 1:1)'),
   ('paciente_id','INT','NOT NULL, FK → Paciente'),
 ]),
 ('Reporte_Sintoma', 'nueva · CU50', [
   ('reporte_sintoma_id','INT','PK, AUTO_INCREMENT'),
   ('nivel_dolor','TINYINT','NOT NULL (0-10)'),
   ('limitacion_funcional','TINYINT','NOT NULL (0-10)'),
   ('comentario','VARCHAR(500)','NULL'),
   ('clave_envio','VARCHAR(64)','NOT NULL, UNIQUE (idempotencia)'),
   ('momento_registro','TIMESTAMP','DEFAULT CURRENT_TIMESTAMP'),
   ('paciente_id','INT','NOT NULL, FK → Paciente'),
   ('episodio_clinico_id','INT','NULL, FK → Episodio_Clinico'),
 ]),
 ('Alerta_Clinica', 'nueva · CU50/CU44', [
   ('alerta_clinica_id','INT','PK, AUTO_INCREMENT'),
   ('tipo','VARCHAR(40)','NOT NULL (DETERIORO_CLINICO / ADHERENCIA_BAJA)'),
   ('severidad','VARCHAR(20)','NOT NULL'),
   ('motivo','VARCHAR(255)','NOT NULL'),
   ('datos','JSON','detalle de la evaluación'),
   ('estado','VARCHAR(20)',"NOT NULL, DEFAULT 'ABIERTA' (ABIERTA / REVISADA)"),
   ('momento_creacion','TIMESTAMP','DEFAULT CURRENT_TIMESTAMP'),
   ('momento_revision','TIMESTAMP','NULL'),
   ('paciente_id','INT','NOT NULL, FK → Paciente'),
   ('profesional_id','INT','NULL, FK → Profesional'),
   ('reporte_sintoma_id','INT','NULL, FK → Reporte_Sintoma'),
 ]),
 ('Indicador_Adherencia', 'nueva · CU44/CU45', [
   ('indicador_adherencia_id','INT','PK, AUTO_INCREMENT'),
   ('fecha','DATE','NOT NULL'),
   ('porcentaje','TINYINT','NOT NULL (0-100)'),
   ('tareas_programadas','INT','NOT NULL'),
   ('tareas_cumplidas','INT','NOT NULL'),
   ('momento_calculo','TIMESTAMP','DEFAULT CURRENT_TIMESTAMP ON UPDATE'),
   ('paciente_id','INT','NOT NULL, FK → Paciente; UNIQUE (paciente_id, fecha)'),
 ]),
 ('Palabra_Restringida', 'nueva · CU57', [
   ('palabra_restringida_id','INT','PK, AUTO_INCREMENT'),
   ('termino','VARCHAR(80)','NOT NULL, UNIQUE'),
   ('categoria','VARCHAR(40)',"NOT NULL, DEFAULT 'GENERAL'"),
   ('activa','BOOLEAN','NOT NULL, DEFAULT TRUE'),
   ('momento_creacion','TIMESTAMP','DEFAULT CURRENT_TIMESTAMP'),
   ('administrador_id','INT','NULL, FK → Usuario'),
 ]),
 ('Area_Soporte_Operador', 'nueva · CU61', [
   ('usuario_id','INT','PK (compuesta), FK → Usuario'),
   ('categoria','VARCHAR(50)','PK (compuesta)'),
 ]),
 ('Liquidacion', 'nueva · CU75', [
   ('liquidacion_id','INT','PK, AUTO_INCREMENT'),
   ('anio','SMALLINT','NOT NULL'),
   ('mes','TINYINT','NOT NULL'),
   ('sesiones_validadas','INT','NOT NULL, DEFAULT 0'),
   ('monto_prestaciones','INT','NOT NULL, DEFAULT 0'),
   ('bonificacion','INT','NOT NULL, DEFAULT 0'),
   ('monto_total','INT','NOT NULL, DEFAULT 0'),
   ('observacion','VARCHAR(255)','NULL'),
   ('momento_emision','TIMESTAMP','DEFAULT CURRENT_TIMESTAMP'),
   ('profesional_id','INT','NOT NULL, FK → Profesional; UNIQUE (profesional_id, anio, mes)'),
   ('emitida_por','INT','NOT NULL, FK → Usuario'),
 ]),
 ('Profesional_Comuna', 'nueva · posterior al Inc 2 (CU10/CU14)', [
   ('profesional_id','INT','PK (compuesta), FK → Profesional'),
   ('comuna_id','INT','PK (compuesta), FK → Comuna'),
 ]),
 ('Notificacion', 'modificada · CU52', [
   ('titulo','VARCHAR(120)','NUEVA · NULL'),
   ('datos','JSON','NUEVA · carga útil: pantalla de destino y parámetros'),
 ]),
 ('Lista_Espera', 'modificada · CU19', [
   ('estado','VARCHAR(20)',"NUEVA · NOT NULL, DEFAULT 'ESPERANDO' (ESPERANDO / NOTIFICADO / TOMADO / VENCIDO / CERRADO)"),
   ('momento_notificacion','TIMESTAMP','NUEVA · NULL'),
   ('momento_expira','TIMESTAMP','NUEVA · NULL'),
   ('token_cupo','VARCHAR(64)','NUEVA · NULL, UNIQUE'),
   ('(cita_id, paciente_id)','—','NUEVA restricción UNIQUE'),
 ]),
 ('Mensaje_Chat', 'modificada · CU53', [
   ('remitente_usuario_id','INT','NUEVA · NOT NULL, FK → Usuario'),
   ('leido','BOOLEAN','NUEVA · NOT NULL, DEFAULT FALSE'),
   ('(episodio_clinico_id, mensaje_id)','—','NUEVO índice'),
 ]),
 ('Evaluacion_Satisfaccion', 'modificada · CU55/CU56', [
   ('estado_moderacion','VARCHAR(20)',"CAMBIA de BOOLEAN a VARCHAR · NOT NULL, DEFAULT 'PENDIENTE' (PENDIENTE / APROBADA / RECHAZADA)"),
   ('motivo_rechazo','VARCHAR(255)','NUEVA · NULL'),
   ('moderador_id','INT','NUEVA · NULL, FK → Usuario'),
   ('momento_moderacion','TIMESTAMP','NUEVA · NULL'),
 ]),
 ('Ticket_Soporte', 'modificada · CU60/CU61', [
   ('asignado_a','INT','NUEVA · NULL, FK → Usuario'),
   ('momento_enrutamiento','TIMESTAMP','NUEVA · NULL'),
   ('adjunto_url','VARCHAR(500)','NUEVA · NULL'),
   ('resolucion','VARCHAR(500)','NUEVA · NULL'),
 ]),
 ('Paciente', 'modificada · CU58', [
   ('resena_anonima','BOOLEAN','NUEVA · NOT NULL, DEFAULT FALSE'),
 ]),
 ('Episodio_Clinico', 'modificada · CU78 (posterior al Inc 2)', [
   ('fecha_terminado','TIMESTAMP','CAMBIA · ahora NULL por defecto (antes nacía con la hora de creación)'),
 ]),
]

PARAMETROS = [
 ('ANTICIPACION_SOLICITUD_CONFIRMACION_HORAS','24','CU21'),
 ('VIGENCIA_ENLACE_CONFIRMACION_HORAS','48','CU21'),
 ('MAX_PACIENTES_LISTA_ESPERA','5','CU19'),
 ('PLAZO_RESPUESTA_LISTA_ESPERA_MINUTOS','30','CU19'),
 ('MINIMO_RESPUESTAS_PRECLINICO','4','CU25'),
 ('LATENCIA_MAXIMA_REPORTE_MS','2000','CU25'),
 ('UMBRAL_DOLOR_CRITICO','8','CU50'),
 ('UMBRAL_ALZA_DOLOR','3','CU50'),
 ('UMBRAL_ADHERENCIA_CRITICA','50','CU44'),
 ('MINIMO_TAREAS_PARA_ALERTA_ADHERENCIA','5','CU44'),
 ('MAX_ADJUNTO_TICKET_MB','5','CU60'),
 ('MAX_FILAS_POR_TOMO_INFORME','2000','CU63'),
 ('ARANCEL_ESPECIALIDAD','40000','CU73 (ya existía desde el Inc 2)'),
 ('DESCUENTO_PAQUETE_PORCENTAJE','10','CU73'),
 ('HORAS_ANTICIPACION_DEVOLUCION','24','CU74'),
 ('PORCENTAJE_HONORARIO_PROFESIONAL','70','CU75'),
 ('LATENCIA_MAXIMA_LIQUIDACION_MS','2000','CU75'),
]

# ─────────────────────────────────────────────────────────────────────────────
#  Casos de uso: qué cambió respecto a la ficha del Documento 0
# ─────────────────────────────────────────────────────────────────────────────

CUS = [
 ('Notificaciones y agenda', [
  ('CU52','Emitiendo notificaciones multicanal','Paciente, Profesional → <b>Paciente, Profesional, Administrador</b> (todos reciben avisos)',
   ['Nuevo <b>despachador único</b>: todo aviso queda siempre en el centro de notificaciones de la app y, según las preferencias del usuario, sale además por push y por correo (Brevo). La ficha hablaba solo de push y correo.',
    'Push real <b>no disponible en Expo Go</b> (Android lo bloquea desde el SDK 53): el registro del token queda implementado para una build propia. Por eso "push" en las pruebas = campana de la app + correo.',
    'Nuevas pantallas: <b>campana con globo de no leídos</b> (en los tres inicios) y <b>Centro de notificaciones</b> con preferencias de canal (push / correo). Las leídas bajan al final.',
    'Al tocar un aviso se abre la pantalla de destino que viaja en la carga útil (<code>datos.pantalla</code>); si esa pantalla no existe para el rol, se ignora.',
    'Los avisos del chat se <b>agrupan</b>: un solo aviso por conversación que se actualiza con "N mensajes nuevos".',
    'Excepciones 1 y 4 de la ficha (pérdida de red del profesional al insertar cita; paquete OTA de Expo) no aplican al flujo real: se reemplazan por "fallo del despacho no revierte la operación" y "pantalla no disponible para el rol". Exc. 2 (push desactivado → solo correo + bitácora) y 3 (descartar la alerta) se cumplen tal cual.'],
   'Campana (3 inicios), Centro de notificaciones · <code>/api/notificaciones/*</code> · tabla Notificacion (+titulo, +datos), Preferencia_Notificacion, Dispositivo_Push · bitácora DESPACHO_NOTIFICACION'),
  ('CU21','Confirmando asistencia a cita de forma distribuida','Paciente',
   ['La solicitud la emite el sistema cuando la cita entra en la ventana de anticipación (parámetro, 24 h), con un <b>programador cada 5 min</b> y una pasada extra cuando el paciente abre Mis Citas (Render gratuito duerme el servidor).',
    'Dos superficies: <b>Mis Citas</b> (cita destacada con Confirmar / Cancelar, cancelar exige motivo y anticipación ≥ 2 h) y el <b>correo</b> con un enlace con token de un solo uso y vigencia de 48 h que abre una página web con el detalle y los dos botones.',
    'Responder desde la app cierra el enlace del correo. Exc. 2 (token vencido): la página lo informa y Mis Citas ofrece <b>"Enviarme un enlace nuevo"</b>.',
    'Nuevos motivos de rechazo: ya respondida, cita en otro estado, cancelación fuera de plazo.',
    'Decisión D1: la solicitud se emite <b>solo para citas pagadas</b>; a las no pagadas de la ventana se les envía el recordatorio "Paga tu hora". Confirmar exige pago (CITA_SIN_PAGO), también al reenviar el enlace.'],
   'Mis Citas, página pública del enlace · <code>/api/citas/confirmacion/:token</code>, <code>/confirmaciones/pendientes</code>, <code>/:id/solicitar-confirmacion</code> · tabla Solicitud_Confirmacion · programador'),
  ('CU19','Gestionando lista de espera secuencial','Paciente',
   ['La lista se ofrece <b>de a uno</b>: al liberarse el bloque, solo el primero pasa a NOTIFICADO con un plazo (parámetro, 30 min). Antes (Inc 2) se avisaba a todos a la vez.',
    'Nuevo paso: <b>tomar el cupo</b>, desde Mis Citas o desde el botón "Tomar el cupo" del correo (página pública en dos pasos, porque los lectores de correo abren los enlaces al previsualizar). Tomarlo crea una cita nueva AGENDADA en ese bloque, <b>pendiente de pago (CU73)</b>, cierra la lista y avisa al resto (CUPO_CEDIDO).',
    'Exc. 1 ampliada: además de lista completa (parámetro, 5), se rechaza inscribirse en un bloque propio, ya libre o pasado, o dos veces.',
    'Exc. 4 (vence el plazo → siguiente) corre en el programador y al abrir Mis Citas. Nueva Exc. 5: el bloque volvió a ocuparse al tomar el cupo.',
    'Nueva acción "Salir de la lista de espera". Al cancelar, el paciente que cancela <b>no</b> ve cuántas personas esperaban (dato de terceros).'],
   'Buscar hora (bloques ocupados), Mis Citas (En lista de espera), página pública del cupo · <code>/api/citas/:id/lista-espera</code>, <code>/lista-espera/:id/tomar</code>, <code>/lista-espera/cupo/:token</code>, <code>/mis-listas-espera</code> · Lista_Espera (+estado, +momento_notificacion, +momento_expira, +token_cupo)'),
 ]),
 ('Triaje inteligente y banderas rojas', [
  ('CU25','Sintetizando reporte de hallazgos pre-clínicos','Profesional',
   ['El análisis se ejecuta <b>una sola vez al completar el triaje</b> (CU23) y queda guardado en <b>Reporte_Preclinico</b> (uno por triaje); los triajes anteriores a esta función se sintetizan la primera vez que se abren.',
    'Reglas de banderas rojas explícitas, con severidad: dolor ≥ 8, cuadro &gt; 6 meses, falta de aire al esfuerzo, antecedentes sensibles, alergias, signos de alarma en el relato. Además etiquetas clínicas y resumen legible.',
    'Exc. 1: "Información insuficiente" = menos de MINIMO_RESPUESTAS_PRECLINICO (4) respuestas. Exc. 2: latencia &gt; 2000 ms queda en la bitácora; además se exige vínculo clínico con el paciente (PACIENTE_NO_ASIGNADO).'],
   'Ficha Clínica del paciente (reporte pre-clínico) · <code>/api/clinica/pacientes/:id/reporte-preclinico</code> · Reporte_Preclinico'),
  ('CU26','Sugiriendo derivación por especialidad clínica','Paciente',
   ['La sugerencia sale del mismo análisis del CU25, con un mapa motivo → especialidad (respiratorio → Kinesiología Respiratoria, nutrición → Nutricionista, dolor/lesión → Kinesiología).',
    'Exc. 1 cambia de texto y de acción: <b>"Tu entrevista no apunta a una especialidad concreta… Contáctate con nosotros"</b> con botón a Soporte (antes: "evaluación general").',
    'Exc. 2 se resuelve por <b>comuna y modalidad</b> (Profesional_Comuna y teleconsulta), no por "Sede"; se muestran alternativas disponibles y el botón "Buscar hora ahora".'],
   'Cierre de la Entrevista previa · <code>/api/clinica/mi-derivacion</code> · Reporte_Preclinico.especialidad_sugerida_id'),
  ('CU50','Generando y notificando alerta por deterioro clínico','Paciente → <b>Paciente, Profesional</b> (revisa la alerta)',
   ['Nueva pantalla <b>Mi Seguimiento</b>: dolor y limitación 0-10 (dos filas de botones), comentario. Cada envío lleva una <b>clave de envío única</b> (idempotencia) y, sin red, se retiene en el teléfono y se reenvía solo.',
    'Umbrales parametrizables: UMBRAL_DOLOR_CRITICO (8) y UMBRAL_ALZA_DOLOR (3 puntos sobre el reporte anterior).',
    'La alerta se persiste en <b>Alerta_Clinica</b> y llega al <b>panel de banderas rojas</b> del inicio del profesional, que la marca como revisada. Exc. 4: si la alerta no se puede escribir, el reporte no se pierde.'],
   'Mi Seguimiento (paciente), Banderas rojas (inicio del profesional), síntomas del paciente en la ficha · <code>/api/clinica/sintomas</code>, <code>/mis-sintomas</code>, <code>/alertas</code>, <code>/alertas/:id/revisar</code> · Reporte_Sintoma, Alerta_Clinica'),
 ]),
 ('Adherencia y progreso', [
  ('CU44','Actualizando indicadores de adherencia y síntomas','Paciente',
   ['Fórmula explícita: cumplidas / programadas mientras la pauta estuvo vigente (diaria = un día por día transcurrido; semanal = una por semana iniciada), tope 100%.',
    'Se recalcula al marcar una tarea (CU48), al cerrar una sesión (REALIZADA) y al abrir Mi Progreso; cada cálculo es una <b>medición diaria</b> en Indicador_Adherencia (una fila por paciente y día), que es la serie del gráfico del CU45.',
    'Exc. 2: si no se puede calcular, se entrega el último valor marcado como "suspendido" (no un cero falso). Exc. 4: bajo UMBRAL_ADHERENCIA_CRITICA (50%) con ≥ 5 tareas se crea una alerta ADHERENCIA_BAJA (una abierta por paciente) para el profesional.',
    'El profesional también ve la adherencia del paciente en la ficha.'],
   'Mis Ejercicios, Mi Progreso, ficha del profesional · <code>/api/clinica/mi-progreso</code>, <code>/pacientes/:id/adherencia</code> · Indicador_Adherencia, Alerta_Clinica'),
  ('CU45','Visualizando progreso en dashboard gráfico','Paciente',
   ['Nueva pantalla <b>Mi Progreso</b>: adherencia, curva de dolor y de limitación, recuento de sesiones; atajos 30/90 días y fechas desde/hasta.',
    'Gráficos propios con react-native-svg (no hay librería de gráficos) y una <b>barrera de error</b> que cae a texto (Exc. 2). Exc. 3: el rango invertido se bloquea en la app y el servidor lo rechaza (RANGO_INVALIDO). Exc. 1: vista introductoria sin datos.'],
   'Mi Progreso · <code>/api/clinica/mi-progreso?desde=&hasta=</code> · componente GraficoLinea'),
 ]),
 ('Mensajería clínica y filtro', [
  ('CU53','Comunicando mediante mensajería clínica cifrada','Paciente, Profesional',
   ['<b>Sin WebSockets</b>: la app consulta novedades cada 6 s (<code>desde_id</code>). El chat cuelga del <b>episodio clínico</b>; el administrador no accede.',
    'Cifrado <b>AES-256-GCM</b> con clave propia (CLAVE_CIFRADO_CHAT) o derivada del JWT; el diagnóstico informa cuál está en uso. Exc. 4: mensaje no descifrable → se muestra como ilegible, sin romper.',
    'Exc. 2: envío fallido queda <b>retenido en el teléfono</b> y se reintenta. Exc. 3: episodio cerrado → solo lectura. Tope de 1000 caracteres.',
    'Nueva bandeja <b>Mensajes</b> (foto del profesional, motivo, no leídos) y separadores por día ("Hoy", "Ayer", fecha). Un solo aviso por conversación (CU52).'],
   'Mensajes, Chat clínico · <code>/api/clinica/mis-conversaciones</code>, <code>/episodio/:id/mensajes</code> · Mensaje_Chat (+remitente_usuario_id, +leido)'),
  ('CU57','Filtrando automáticamente contenido restringido','Paciente, Profesional → <b>+ Administrador</b> (gestiona el diccionario)',
   ['Nueva pantalla del administrador <b>Términos restringidos</b>: agregar (con categoría), activar/desactivar, eliminar; el diccionario viene sembrado y se cachea 60 s.',
    'El filtro <b>normaliza</b> (minúsculas, sin acentos, sin letras repetidas) y compara por palabra completa. Aplica al chat (CU53) <b>y a las reseñas</b> (CU55): en la reseña se guarda la nota y se descarta el texto con el aviso "No se pudo registrar el mensaje porque incluye términos no permitidos".',
    'Exc. 3 cambia: el texto no se pierde; en el chat queda retenido localmente. El bloqueo se anota en la bitácora <b>sin guardar el texto</b> (BLOQUEO_CONTENIDO_RESTRINGIDO).'],
   'Chat, evaluación, Términos restringidos (admin) · <code>/api/parametros/palabras-restringidas</code> · Palabra_Restringida'),
 ]),
 ('Calidad del servicio', [
  ('CU55','Evaluando satisfacción post-sesión','Profesional → <b>Paciente</b>',
   ['<b>Cambio de actor y de disparo:</b> ya no aparece un modal en el teléfono del profesional. Al cerrarse la sesión (finalizar atención o transición a Realizada) el paciente recibe el aviso <b>"Califica tu atención"</b>; al tocarlo, Mis Citas abre el formulario de esa cita. La ruta de evaluación acepta solo el rol Paciente.',
    'La <b>nota entra al promedio de inmediato</b> (bloqueo de fila del profesional, Exc. 4); el <b>texto</b> queda PENDIENTE de moderación (CU56) y pasa antes por el filtro (CU57).',
    'Exc. 1 cambia: la condición es "cita Realizada y no evaluada" (SESION_NO_CERRADA / YA_EVALUADA), no el check-in GPS. Exc. 2: acceso permanente en Mis Citas ("Califica tu atención").'],
   'Aviso EVALUAR_SESION, Mis Citas (DialogoEvaluacion) · <code>/api/citas/:id/evaluacion</code>, <code>/evaluaciones/pendientes</code> · Evaluacion_Satisfaccion, Profesional.calificacion_promedio'),
  ('CU56','Moderando testimonios públicos','Administrador',
   ['Nueva pantalla <b>Moderar testimonios</b> con filtro por estado. Solo se modera el <b>texto</b>; la nota nunca.',
    'estado_moderacion pasa de booleano a <b>PENDIENTE / APROBADA / RECHAZADA</b>, con causal, moderador y momento. Rechazar = borrado lógico con causal obligatoria (Exc. 3). Aprobar avisa al profesional (TESTIMONIO_PUBLICADO).',
    'Exc. 2 (saneado de caracteres) y Exc. 4 (rollback) se cumplen tal cual.'],
   'Moderar testimonios (panel admin) · <code>/api/evaluaciones/moderacion</code>, <code>/:id/moderar</code> · Evaluacion_Satisfaccion (+motivo_rechazo, +moderador_id, +momento_moderacion)'),
  ('CU58','Calculando y visualizando calificación profesional','Paciente → <b>Paciente, Profesional</b> (ve su calificación)',
   ['El promedio está <b>persistido</b> en Profesional.calificacion_promedio (se recalcula en cada evaluación), no se suma en cada búsqueda. La búsqueda entrega promedio y cantidad.',
    'Nueva pantalla <b>Evaluaciones</b> del profesional: promedio, total y reseñas aprobadas con <b>autor</b> ("Nombre A." o "Anónimo" según la preferencia del paciente en Seguridad y privacidad — atributo nuevo Paciente.resena_anonima).',
    'Exc. 2: "Perfil nuevo · sin evaluaciones aún". Exc. 3 (retirar el cursor) no aplica en móvil. El profesional ve su calificación en Mi perfil público.'],
   'Buscar hora, Evaluaciones, Mi perfil público, Seguridad y privacidad · <code>/api/profesionales/:id/resenas</code>, <code>/auth/privacidad</code> · Paciente (+resena_anonima)'),
 ]),
 ('Soporte y panel de gestión', [
  ('CU60','Registrando y siguiendo solicitudes de soporte','Paciente, Profesional',
   ['Nueva pantalla <b>Soporte</b>: categorías fijas (técnico, citas, pagos, clínico, cuenta, otro), descripción, <b>captura opcional</b> a Cloudinary; "Mis solicitudes" con estado, foto y respuesta.',
    'Exc. 2 cambia: el servicio que puede faltar es el repositorio de imágenes (no un "clúster documental"); se ofrece enviar sin adjunto. Exc. 4: adjunto &gt; MAX_ADJUNTO_TICKET_MB (5) se rechaza sin crear el ticket. Precondición: servidor en Render, no AWS.',
    'Al resolverse, el solicitante recibe el aviso TICKET_RESUELTO.'],
   'Soporte (paciente y profesional) · <code>/api/soporte/categorias</code>, <code>/tickets</code>, <code>/mis-tickets</code> · Ticket_Soporte (+adjunto_url, +resolucion)'),
  ('CU61','Enrutando automáticamente solicitudes por categoría','Administrador',
   ['El enrutamiento ocurre <b>al crear el ticket</b> (operador que cubre el área con menos tickets abiertos) y se reintenta al abrir la bandeja. Cada operador declara sus áreas (tabla nueva Area_Soporte_Operador).',
    'Exc. 2: sin operador → ticket sin asignar en <b>supervisión general</b> + aviso a todos los administradores (TICKET_SIN_OPERADOR). Exc. 3: ticket tomado por otro → TICKET_REASIGNADO y refrescar. Exc. 4 (servicio horario) no aplica: se usa la hora de la base.',
    'Nueva pantalla <b>Bandeja de soporte</b>: filtros, tomar, resolver (respuesta obligatoria), captura ampliable y <b>contacto del solicitante</b> (RUT, teléfono con marcado, correo).'],
   'Bandeja de soporte (panel admin) · <code>/api/soporte/bandeja</code>, <code>/tickets/:id</code>, <code>/areas</code> · Ticket_Soporte (+asignado_a, +momento_enrutamiento), Area_Soporte_Operador'),
  ('CU64','Visualizando dashboard de monitoreo de KPIs','Administrador',
   ['El <b>Panel de administración es ahora el inicio del administrador</b> (antes lo era Parámetros globales, que pasa a ser una herramienta más).',
    'KPIs: pacientes activos, citas por estado, satisfacción promedio, adherencia, recaudación (neta de devoluciones) y pendientes de gestión (tickets, testimonios, sesiones suspendidas), con filtro de rango.',
    'Exc. 2: ante fallo se entrega la <b>caché de 2 minutos</b> con la leyenda de datos diferidos. Exc. 1 se cumple con la barrera de gráficos. Exc. 3 (permisos territoriales) no aplica: no hay administradores por sede.'],
   'Panel de administración · <code>/api/gestion/kpis?desde=&hasta=</code> · solo lectura (caché en memoria)'),
  ('CU63','Generando y exportando reportes operativos','Administrador',
   ['Tres informes: <b>asistencia, recaudación y adherencia</b>; formatos <b>XLSX, PDF y CSV</b> (la ficha no mencionaba CSV, que es la salida alternativa de la Exc. 3).',
    'Exc. 4: más de MAX_FILAS_POR_TOMO_INFORME (2000) filas → tomos correlativos. La descarga usa el sistema de archivos del teléfono y la hoja de compartir.',
    'Poscondición cumplida: bitácora EXPORTACION_INFORME con tipo, rango, formato y tomo.'],
   'Informes operativos (panel admin) · <code>/api/gestion/informes</code>, <code>/informes/:tipo</code>'),
 ]),
 ('Finanzas', [
  ('CU73','Comercializando prestaciones con restricción de cobro anticipado','Paciente → <b>Paciente, Profesional</b> (confirma)',
   ['<b>Cambio central:</b> pagar <b>no confirma</b> la cita. Con el pago íntegro la cita queda agendada y pagada, el profesional recibe el aviso "Hora pagada por confirmar" y <b>la confirma desde la ficha</b>; el servidor impide confirmar una hora sin pago a cualquier actor (CITA_SIN_PAGO → "Esperando pago" en la ficha). Decisión D1: la solicitud de asistencia del CU21 solo se emite para horas pagadas.',
    'Nueva pantalla <b>Pagar tu hora</b> tras reservar: sesión suelta (ARANCEL_ESPECIALIDAD), plan de <b>10, 15 o 20</b> con DESCUENTO_PAQUETE_PORCENTAJE (reemplaza los 4/8/12 del Inc 2) o usar una sesión de un plan activo (transacción SESION_PLAN de monto 0; la sesión se descuenta al finalizar, CU76).',
    'Pasarela <b>simulada</b> con tres métodos: pago exitoso, rechazado, confirmación lenta. Rechazo (Exc. 3 y 4) → transacción RECHAZADA, reserva revocada (cita cancelada) y cupo a la lista de espera. Pago en tránsito → hora reservada pero no pagada ni confirmable.',
    'Mis Citas: "Pagar esta hora" o "Pagada · esperando que el profesional confirme". Poscondición cambia: agendada y pagada, pendiente de confirmación.'],
   'Pagar tu hora, Mis Citas, ficha del profesional (Confirmar / Esperando pago) · <code>/api/finanzas/citas/:id/opciones</code>, <code>/comprar</code> · Transaccion (tipos PRESTACION, PAQUETE, SESION_PLAN), Paquete_Sesiones'),
  ('CU74','Actualizando y devolviendo transacciones financieras','Paciente',
   ['Botones "Cambiar a plan 10/15/20" en Mis Citas sobre una cita <b>pagada como sesión suelta</b> (agendada o confirmada). Dentro de las 24 h previas: diferencia = precio del plan − pagado; plan con una sesión ya usada.',
    'Exc. 1 (fuera de las 24 h) → <b>devolución total</b>, cita cancelada, hora liberada y ofrecida a la lista de espera. Nuevo rechazo YA_EN_PLAN: una hora cubierta por un plan no se vuelve a actualizar.',
    'La <b>devolución por cancelación</b> (RF74) va dentro de la transacción de la cancelación, <b>solo para sesiones sueltas</b> (con plan no se devuelve dinero: la sesión sigue en el plan). El paciente recibe el aviso DEVOLUCION_PAGO y la ve en la sección <b>Devoluciones</b> de Pagos y Bonos.'],
   'Mis Citas, Pagos y Bonos · <code>/api/finanzas/citas/:id/actualizar-a-paquete</code>, <code>/api/citas/:id/transicionar</code> (CANCELAR) · Transaccion (tipos ACTUALIZACION, DEVOLUCION)'),
  ('CU75','Liquidando ganancias en panel financiero','Administrador → <b>Administrador, Profesional</b> (solo lectura)',
   ['Nueva pantalla <b>Liquidaciones</b> (mes ‹ ›): por profesional, sesiones validadas del mes (Cita.sesion_certificada_en, CU41) × arancel × PORCENTAJE_HONORARIO_PROFESIONAL (70%), bonificación numérica y observación; emitir pide confirmación y deja la fila <b>inalterable</b> (YA_EMITIDA al reintentar).',
    'Nueva pantalla <b>Mis Liquidaciones</b> del profesional, solo lectura, con aviso LIQUIDACION_EMITIDA. Exc. 4: latencia &gt; 2000 ms queda en la bitácora.'],
   'Liquidaciones (admin), Mis Liquidaciones (profesional) · <code>/api/finanzas/liquidaciones</code>, <code>/mis-liquidaciones</code> · Liquidacion'),
 ]),
]

PREVIOS = [
 ('CU02 / CU10','Registro y perfil del profesional','Comunas de atención a domicilio (varias, chips) al registrarse y en Mi perfil público; nueva pantalla <b>Mis horarios de atención</b> para agregar, editar y eliminar bloques semanales (horas en punto, sin superposición).','Profesional_Comuna; <code>/api/profesionales/mi-horario</code>'),
 ('CU14','Búsqueda de horas','Filtro por comuna del paciente (solo profesionales que la cubren o atienden online), búsqueda por nombre, jornada por día, calificación del profesional (CU58), bloques de hoy ya pasados no se ofrecen (y el servidor rechaza reservarlos), modalidad por defecto "Atención Domiciliaria".','citaController.buscarDisponibilidad'),
 ('CU09','Privacidad del paciente','Nueva preferencia "Mostrar mi nombre en mis calificaciones" (anónimo).','Paciente.resena_anonima'),
 ('CU20 / CU76','Máquina de estados de la cita','El profesional solo puede CONFIRMAR una cita pagada (CU73); cancelar con ≥ 24 h genera devolución (CU74); al pasar a REALIZADA se recalcula la adherencia (CU44) y se pide la evaluación al paciente (CU55).','citaController.transicionarEstadoCita'),
 ('CU38','Marcas temporales','Finalizar la atención dispara el aviso de evaluación al paciente (CU55) y el recálculo de adherencia (CU44); ya no abre el formulario en el teléfono del profesional.','marcasTemporalesController'),
 ('CU78','Episodio clínico','Un episodio nuevo nace sin fecha de término (antes quedaba "terminado a la misma hora"); una atención en curso puede trasladarse a un episodio nuevo.','Episodio_Clinico.fecha_terminado NULL'),
 ('CU59','Parámetros globales','Buscador de parámetros, 17 parámetros nuevos (tabla más abajo) y "Última versión" ya muestra la fecha.','Parametro_Global'),
 ('Marca','Rebranding','La aplicación pasó de FRO Salud a <b>Punto Paz Salud</b>: nombre, logo y paleta (#003B4D / #8B7140). Los documentos siguen diciendo FRO Salud: decisión del equipo si se actualiza el nombre en los informes.','fro-vista/src/theme'),
]

# ─────────────────────────────────────────────────────────────────────────────
#  HTML
# ─────────────────────────────────────────────────────────────────────────────

def cu_html():
    partes = []
    for bloque, cus in CUS:
        partes.append(f'<h3>{html.escape(bloque)}</h3>')
        for cod, nombre, actor, cambios, vive in cus:
            items = ''.join(f'<li>{c}</li>' for c in cambios)
            partes.append(f'''
<article class="cu">
  <header><span class="cod">{cod}</span> <span class="nom">{html.escape(nombre)}</span></header>
  <div class="fila"><span class="et">Actor(es)</span><div>{actor}</div></div>
  <div class="fila"><span class="et">Qué cambió</span><ul>{items}</ul></div>
  <div class="fila"><span class="et">Dónde vive</span><div class="vive">{vive}</div></div>
</article>''')
    return '\n'.join(partes)


def previos_html():
    filas = ''.join(f'<tr><td><b>{a}</b><br><small>{b}</small></td><td>{c}</td><td class="vive">{d}</td></tr>' for a,b,c,d in PREVIOS)
    return f'<table><thead><tr><th>Ficha afectada</th><th>Qué cambió después del Incremento 2</th><th>Dónde vive</th></tr></thead><tbody>{filas}</tbody></table>'


def fisico_html():
    partes = []
    for tabla, tipo, cols in FISICO:
        filas = ''.join(f'<tr><td><code>{html.escape(c)}</code></td><td>{html.escape(t)}</td><td>{html.escape(r)}</td></tr>' for c,t,r in cols)
        partes.append(f'<h4>{tabla} <small>{html.escape(tipo)}</small></h4><table class="fis"><thead><tr><th>Columna</th><th>Tipo</th><th>Restricciones</th></tr></thead><tbody>{filas}</tbody></table>')
    return '\n'.join(partes)


def parametros_html():
    filas = ''.join(f'<tr><td><code>{k}</code></td><td>{v}</td><td>{cu}</td></tr>' for k,v,cu in PARAMETROS)
    return f'<table><thead><tr><th>Clave</th><th>Valor inicial</th><th>CU</th></tr></thead><tbody>{filas}</tbody></table>'


PAGINA = f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Brechas Incremento 3</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&family=Source+Sans+3:wght@400;600&family=JetBrains+Mono:wght@400&display=swap">
<style>
:root {{
  --fondo:#FCFBF9; --superficie:#FFFFFF; --texto:#23201C; --suave:#5D564D; --tenue:#8A8278;
  --borde:#E7E2DB; --marca:#003B4D; --marcaSuave:#E6EEF1; --acento:#8B7140; --acentoSuave:#F3EEE4;
  --alerta:#A85A00; --alertaSuave:#FFF2E3; --nuevo:#DFF0E7; --nuevoTexto:#0E5A38;
}}
@media (prefers-color-scheme: dark) {{
  :root:not([data-theme="light"]) {{
    --fondo:#15171A; --superficie:#1D2024; --texto:#ECE8E1; --suave:#B8B0A4; --tenue:#847C71;
    --borde:#2E3238; --marca:#8FC5D8; --marcaSuave:#1B2E36; --acento:#D2B27F; --acentoSuave:#2A251C;
    --alerta:#F0A85A; --alertaSuave:#3A2A14; --nuevo:#1E3A2C; --nuevoTexto:#9FDDB9;
  }}
}}
:root[data-theme="dark"] {{
  --fondo:#15171A; --superficie:#1D2024; --texto:#ECE8E1; --suave:#B8B0A4; --tenue:#847C71;
  --borde:#2E3238; --marca:#8FC5D8; --marcaSuave:#1B2E36; --acento:#D2B27F; --acentoSuave:#2A251C;
  --alerta:#F0A85A; --alertaSuave:#3A2A14; --nuevo:#1E3A2C; --nuevoTexto:#9FDDB9;
}}
* {{ box-sizing:border-box }}
body {{ margin:0; background:var(--fondo); color:var(--texto); font:16px/1.55 "Source Sans 3", system-ui, sans-serif; }}
main {{ max-width:1000px; margin:0 auto; padding:32px 16px 80px }}
h1,h2,h3,h4 {{ font-family:"Source Serif 4", Georgia, serif; font-weight:600; text-wrap:balance; color:var(--texto) }}
h1 {{ font-size:34px; line-height:1.15; margin:8px 0 4px }}
h2 {{ font-size:24px; margin:48px 0 12px; padding-top:20px; border-top:2px solid var(--marca) }}
h3 {{ font-size:19px; margin:30px 0 10px; color:var(--marca) }}
h4 {{ font-size:16px; margin:24px 0 6px }}
h4 small {{ font:600 12px/1 "Source Sans 3"; letter-spacing:.06em; text-transform:uppercase; color:var(--acento); margin-left:8px }}
p, li {{ max-width:72ch }}
.eyebrow {{ font-size:12px; letter-spacing:.12em; text-transform:uppercase; color:var(--acento); font-weight:600 }}
.sub {{ color:var(--suave); margin:0 0 20px }}
nav.indice {{ background:var(--superficie); border:1px solid var(--borde); border-radius:10px; padding:14px 18px; margin:20px 0 }}
nav.indice a {{ color:var(--marca); text-decoration:none; margin-right:14px; white-space:nowrap }}
code {{ font:13px "JetBrains Mono", monospace; background:var(--marcaSuave); color:var(--marca); padding:1px 5px; border-radius:4px }}
.caja {{ background:var(--superficie); border:1px solid var(--borde); border-left:4px solid var(--marca); border-radius:8px; padding:14px 18px; margin:16px 0 }}
.caja.decision {{ border-left-color:var(--alerta); background:var(--alertaSuave) }}
.alerta {{ color:var(--alerta); font-weight:600 }}
table {{ border-collapse:collapse; width:100%; margin:12px 0 20px; font-size:14.5px; background:var(--superficie) }}
th, td {{ text-align:left; vertical-align:top; padding:8px 10px; border-bottom:1px solid var(--borde) }}
th {{ font-size:12px; letter-spacing:.06em; text-transform:uppercase; color:var(--suave); background:var(--fondo) }}
.tabla-scroll {{ overflow-x:auto }}
article.cu {{ background:var(--superficie); border:1px solid var(--borde); border-radius:10px; padding:14px 18px; margin:12px 0 }}
article.cu header {{ display:flex; gap:10px; align-items:baseline; margin-bottom:8px }}
.cod {{ font:600 13px "JetBrains Mono", monospace; color:var(--acento); background:var(--acentoSuave); padding:2px 8px; border-radius:999px }}
.nom {{ font-family:"Source Serif 4", serif; font-size:18px; font-weight:600 }}
.fila {{ display:grid; grid-template-columns:110px 1fr; gap:10px; padding:6px 0; border-top:1px dashed var(--borde) }}
.fila .et {{ font-size:12px; letter-spacing:.06em; text-transform:uppercase; color:var(--suave); padding-top:4px }}
.fila ul {{ margin:0; padding-left:18px }}
.fila li {{ margin:4px 0 }}
.vive {{ color:var(--suave); font-size:14px }}
ol.mr {{ padding-left:22px; font:14px/1.6 "JetBrains Mono", monospace; background:var(--superficie); border:1px solid var(--borde); border-radius:8px; padding:14px 14px 14px 36px; overflow-x:auto }}
ol.mr li {{ max-width:none; margin:2px 0; white-space:normal }}
ol.mr li.nueva {{ background:var(--nuevo); border-radius:4px; padding:2px 6px; margin-left:-6px }}
ol.mr li.nueva b::before {{ content:"NUEVA · "; color:var(--nuevoTexto); font-size:11px; letter-spacing:.06em }}
ol.mr li.repuesta {{ background:var(--alertaSuave); border-radius:4px; padding:2px 6px; margin-left:-6px }}
ol.mr li.repuesta b::before {{ content:"FALTABA EN LA 3FN DEL INC 2 · "; color:var(--alerta); font-size:11px; letter-spacing:.06em }}
mark {{ background:var(--nuevo); color:var(--nuevoTexto); padding:0 3px; border-radius:3px }}
/* Claves del modelo relacional: PK subrayado continuo, FK subrayado discontinuo. */
u.pk {{ text-decoration:underline solid; text-decoration-thickness:1.5px; text-underline-offset:3px }}
u.fk {{ text-decoration:underline dashed; text-decoration-thickness:1.5px; text-underline-offset:3px }}
.leyenda {{ font-size:13px; color:var(--suave) }}
.leyenda mark, .leyenda .nuevaEj {{ margin:0 4px }}
.nuevaEj {{ background:var(--nuevo); color:var(--nuevoTexto); padding:0 6px; border-radius:4px; font-family:"JetBrains Mono", monospace; font-size:12px }}
@media (max-width:640px) {{ .fila {{ grid-template-columns:1fr }} h1 {{ font-size:28px }} }}
</style>
</head>
<body>
<main>
<div class="eyebrow">Punto Paz Salud · Grupo 17 · Incremento 3</div>
<h1>Brechas Incremento 3</h1>
<p class="sub">Lo que quedó implementado en el código y todavía no está en el Documento 0 ni en los informes de los incrementos 1 y 2. Código de referencia: commit <code>4e01994b</code> del 26-09-2026. Este reporte no modifica los documentos: es la guía para corregirlos a mano.</p>

<nav class="indice">
  <a href="#resumen">Resumen</a>
  <a href="#decision">Decisión D1</a>
  <a href="#metodo">Método</a>
  <a href="#cus">A · Casos de uso</a>
  <a href="#previos">B · Cambios previos al Inc 3</a>
  <a href="#bd">C · Base de datos</a>
  <a href="#mere">MERE</a>
  <a href="#mr">MR</a>
  <a href="#fn">1FN → 3FN</a>
  <a href="#fisico">Modelo físico</a>
  <a href="#nombres">Nombres y erratas</a>
</nav>

<h2 id="resumen">Resumen</h2>
<ul>
  <li><b>20 casos de uso</b> implementados: CU19, 21, 25, 26, 44, 45, 50, 52, 53, 55, 56, 57, 58, 60, 61, 63, 64, 73, 74 y 75. Los 20 tienen diferencias con su ficha del Documento 0; en seis cambia o se amplía el actor (CU50, CU55, CU57, CU58, CU73, CU75) y en tres cambia el disparo principal (CU55, CU73, CU25).</li>
  <li><b>Base de datos:</b> 10 tablas nuevas del Incremento 3 más 1 posterior al Inc 2 (<code>Profesional_Comuna</code>); 7 tablas existentes con atributos nuevos o cambiados; 17 parámetros globales nuevos. En total la base tiene 55 tablas y 46 migraciones automáticas.</li>
  <li><b>Fichas listas para pegar:</b> las 20 fichas corregidas están en <code>CU-corregidos-Incremento3.txt</code>, en el formato exacto del informe.</li>
  <li><b>Decisiones tomadas durante el desarrollo</b> (ya aplicadas en el código): push real solo con build propia; chat con consulta periódica en vez de WebSockets; el paciente califica, no el profesional; pagar no confirma, confirma el profesional; planes de 10/15/20 en vez de 4/8/12; devolución solo sobre sesiones sueltas.</li>
</ul>

<div class="caja decision" id="decision">
  <b>[D1] Decisión tomada (26-09-2026) — CU21 versus CU73: opción A.</b><br>
  La solicitud de confirmación de asistencia (CU21) se emite <b>solo para citas ya pagadas</b>; a las citas agendadas sin pago dentro de la misma ventana se les envía, una sola vez, el recordatorio <b>"Paga tu hora"</b> (app + correo, tipo de aviso RECORDATORIO_PAGO). Confirmar una cita exige el pago íntegro sea quien sea el que confirme: el profesional desde la ficha, o el paciente desde Mis Citas o desde el enlace del correo (CITA_SIN_PAGO en caso contrario). Aplicado en el código el mismo día; las fichas del TXT ya lo reflejan.
</div>

<h2 id="metodo">Alcance y método</h2>
<p>Se compararon las fichas de los 20 CU del Documento 0 (tabla por CU: actores, precondiciones, descripción con [Excepción n], excepciones, poscondiciones) con el código del servidor (<code>fro-controlador</code>: controladores, servicios, rutas y migraciones) y de la aplicación (<code>fro-vista</code>: pantallas y navegación). Para la base de datos se cruzó el anexo del Incremento 2 (MR, 1FN, 2FN, 3FN y los PNG del MERE y del modelo físico) con <code>schema.sql</code> y las 46 migraciones de <code>scripts/migrar-db.js</code>, que son lo que realmente existe en la base de Aiven.</p>
<p>Formato de cada CU: <b>actor</b> (antes → después cuando cambia), <b>qué cambió</b> en flujo, pasos, condiciones y excepciones, y <b>dónde vive</b> (pantallas, endpoints, tablas). Lo que la ficha ya decía y el código cumple igual no se repite.</p>

<h2 id="cus">A · Casos de uso del Incremento 3</h2>
{cu_html()}

<h2 id="previos">B · Cambios posteriores al Incremento 2 que tocan fichas anteriores</h2>
<p>Entre la entrega del Incremento 2 (16-09-2026) y el cierre del Incremento 3 hubo mejoras pedidas en las pruebas que modifican fichas ya documentadas. No son CU nuevos, pero los informes anteriores no las reflejan.</p>
<div class="tabla-scroll">{previos_html()}</div>

<h2 id="bd">C · Base de datos</h2>

<h3 id="bd-nuevas">Clases (tablas) nuevas</h3>
<table><thead><tr><th>Tabla</th><th>CU</th><th>Para qué existe</th><th>Relaciones</th></tr></thead><tbody>
<tr><td><code>Preferencia_Notificacion</code></td><td>CU52</td><td>Canales que acepta cada usuario (push, correo). Sin fila, ambos activos. El centro de notificaciones de la app siempre recibe.</td><td>1:1 con Usuario (PK = usuario_id)</td></tr>
<tr><td><code>Dispositivo_Push</code></td><td>CU52</td><td>Tokens de notificación push, uno por dispositivo, listos para una build propia.</td><td>N:1 Usuario</td></tr>
<tr><td><code>Solicitud_Confirmacion</code></td><td>CU21</td><td>Solicitud de confirmación con token de un solo uso, vencimiento, respuesta y canal.</td><td>1:1 con Cita (cita_id UNIQUE)</td></tr>
<tr><td><code>Reporte_Preclinico</code></td><td>CU25, CU26</td><td>Síntesis del triaje: resumen, banderas rojas, etiquetas, suficiencia y especialidad sugerida.</td><td>1:1 con Triaje; N:1 Paciente; N:1 Especialidad (sugerida)</td></tr>
<tr><td><code>Reporte_Sintoma</code></td><td>CU50</td><td>Reporte de evolución del paciente entre sesiones (dolor, limitación, comentario), con clave de envío única.</td><td>N:1 Paciente; N:1 Episodio_Clinico (opcional)</td></tr>
<tr><td><code>Alerta_Clinica</code></td><td>CU50, CU44</td><td>Banderas rojas del panel del profesional: deterioro clínico o adherencia baja, con estado abierta/revisada.</td><td>N:1 Paciente; N:1 Profesional; N:1 Reporte_Sintoma (opcional)</td></tr>
<tr><td><code>Indicador_Adherencia</code></td><td>CU44, CU45</td><td>Índice de adherencia por día (una fila por paciente y fecha); es la serie del gráfico de progreso.</td><td>N:1 Paciente; UNIQUE (paciente, fecha)</td></tr>
<tr><td><code>Palabra_Restringida</code></td><td>CU57</td><td>Diccionario de términos no permitidos, con categoría y activación, administrado por el Administrador.</td><td>N:1 Usuario (administrador)</td></tr>
<tr><td><code>Area_Soporte_Operador</code></td><td>CU61</td><td>Áreas (categorías de ticket) que atiende cada operador. Es la tabla que hace posible el enrutamiento.</td><td>N:M entre Usuario (administrador) y la categoría (valor)</td></tr>
<tr><td><code>Liquidacion</code></td><td>CU75</td><td>Liquidación mensual por profesional: sesiones validadas, montos, bonificación, total; inalterable.</td><td>N:1 Profesional; N:1 Usuario (emitida_por); UNIQUE (profesional, año, mes)</td></tr>
<tr><td><code>Profesional_Comuna</code></td><td>CU10, CU14 (posterior al Inc 2)</td><td>Comunas en las que el profesional atiende a domicilio; filtra la búsqueda del paciente.</td><td>N:M entre Profesional y Comuna</td></tr>
</tbody></table>

<h3 id="bd-atributos">Atributos nuevos o cambiados en clases existentes</h3>
<table><thead><tr><th>Tabla</th><th>Cambio</th><th>CU</th></tr></thead><tbody>
<tr><td><code>Notificacion</code></td><td>+ <code>titulo</code>, + <code>datos</code> (JSON con la pantalla de destino y sus parámetros)</td><td>CU52</td></tr>
<tr><td><code>Lista_Espera</code></td><td>+ <code>estado</code> (ESPERANDO / NOTIFICADO / TOMADO / VENCIDO / CERRADO), + <code>momento_notificacion</code>, + <code>momento_expira</code>, + <code>token_cupo</code>; restricción UNIQUE (cita_id, paciente_id)</td><td>CU19</td></tr>
<tr><td><code>Mensaje_Chat</code></td><td>+ <code>remitente_usuario_id</code> (FK Usuario), + <code>leido</code></td><td>CU53</td></tr>
<tr><td><code>Evaluacion_Satisfaccion</code></td><td><code>estado_moderacion</code> pasa de BOOLEAN a VARCHAR (PENDIENTE / APROBADA / RECHAZADA); + <code>motivo_rechazo</code>, + <code>moderador_id</code> (FK Usuario), + <code>momento_moderacion</code></td><td>CU55, CU56</td></tr>
<tr><td><code>Ticket_Soporte</code></td><td>+ <code>asignado_a</code> (FK Usuario), + <code>momento_enrutamiento</code>, + <code>adjunto_url</code>, + <code>resolucion</code></td><td>CU60, CU61</td></tr>
<tr><td><code>Paciente</code></td><td>+ <code>resena_anonima</code></td><td>CU58</td></tr>
<tr><td><code>Episodio_Clinico</code></td><td><code>fecha_terminado</code> ahora es NULL hasta que se cierra el episodio (sin cambio de estructura en el MR)</td><td>CU78</td></tr>
<tr><td><code>Transaccion</code></td><td>Sin columnas nuevas, pero <code>tipo</code> adquiere los valores PRESTACION, PAQUETE, SESION_PLAN, ACTUALIZACION y DEVOLUCION, y <code>estado</code> los valores PAGADA, EN_TRANSITO y RECHAZADA</td><td>CU73, CU74</td></tr>
<tr><td><code>Profesional</code></td><td><code>calificacion_promedio</code> ya existía; ahora se recalcula y persiste en cada evaluación</td><td>CU55, CU58</td></tr>
</tbody></table>

<h3 id="bd-parametros">Parámetros globales nuevos (filas de <code>Parametro_Global</code>)</h3>
<p>No cambian la estructura, pero conviene listarlos en el diccionario de datos o en la sección de parámetros del informe.</p>
{parametros_html()}

<h3 id="bd-sinuso">Columnas y tablas que existen pero ningún flujo usa</h3>
<ul>
  <li><code>Derivacion_Interna</code> sigue sin flujo: el CU26 guarda la sugerencia en <code>Reporte_Preclinico.especialidad_sugerida_id</code>, no aquí. Decisión del equipo: mantenerla para un CU futuro o eliminarla del modelo.</li>
  <li><code>Lista_Espera.notificado</code> quedó redundante con <code>estado</code> (se sigue escribiendo por compatibilidad).</li>
  <li><code>Notificacion.canal</code> vale siempre 'APP'; los canales por los que salió cada aviso quedan en la bitácora (DESPACHO_NOTIFICACION).</li>
</ul>

<h3 id="mere">Cómo reflejarlo en el MERE</h3>
<div class="caja">Convención del MERE actual: entidades como rectángulos, atributos en óvalos (clave subrayada), relaciones como rombos con cardinalidad en cada extremo. Sugerencia de ubicación entre paréntesis para no cruzar líneas.</div>
<h4>Entidades nuevas (con sus atributos)</h4>
<table><thead><tr><th>Entidad</th><th>Atributos (clave subrayada)</th><th>Relaciones y cardinalidades</th></tr></thead><tbody>
<tr><td><b>Preferencia_Notificacion</b></td><td><u>usuario_id</u>, canal_push, canal_email, ultima_modificacion</td><td>Usuario <i>Configura</i> Preferencia_Notificacion: 1 : 1 (junto a Notificacion, arriba a la izquierda)</td></tr>
<tr><td><b>Dispositivo_Push</b></td><td><u>dispositivo_push_id</u>, token, plataforma, activo, momento_registro</td><td>Usuario <i>Registra</i> Dispositivo_Push: 1 : N</td></tr>
<tr><td><b>Solicitud_Confirmacion</b></td><td><u>solicitud_confirmacion_id</u>, token, momento_envio, momento_expira, momento_respuesta, respuesta, canal_respuesta</td><td>Cita <i>Solicita</i> Solicitud_Confirmacion: 1 : 1 (bajo Cita)</td></tr>
<tr><td><b>Reporte_Preclinico</b></td><td><u>reporte_preclinico_id</u>, resumen, banderas, etiquetas, suficiente, momento_creacion</td><td>Triaje <i>Sintetiza</i> Reporte_Preclinico: 1 : 1 · Paciente <i>Posee</i> Reporte_Preclinico: 1 : N · Especialidad <i>Sugiere</i> Reporte_Preclinico: 1 : N (junto a Triaje, izquierda)</td></tr>
<tr><td><b>Reporte_Sintoma</b></td><td><u>reporte_sintoma_id</u>, nivel_dolor, limitacion_funcional, comentario, clave_envio, momento_registro</td><td>Paciente <i>Reporta</i> Reporte_Sintoma: 1 : N · Episodio_Clinico <i>Contiene</i> Reporte_Sintoma: 1 : N (opcional del lado del episodio)</td></tr>
<tr><td><b>Alerta_Clinica</b></td><td><u>alerta_clinica_id</u>, tipo, severidad, motivo, datos, estado, momento_creacion, momento_revision</td><td>Reporte_Sintoma <i>Genera</i> Alerta_Clinica: 1 : N (opcional) · Paciente <i>Tiene</i> Alerta_Clinica: 1 : N · Profesional <i>Revisa</i> Alerta_Clinica: 1 : N</td></tr>
<tr><td><b>Indicador_Adherencia</b></td><td><u>indicador_adherencia_id</u>, fecha, porcentaje, tareas_programadas, tareas_cumplidas, momento_calculo</td><td>Paciente <i>Mide</i> Indicador_Adherencia: 1 : N (una por día)</td></tr>
<tr><td><b>Palabra_Restringida</b></td><td><u>palabra_restringida_id</u>, termino, categoria, activa, momento_creacion</td><td>Usuario (Administrador) <i>Administra</i> Palabra_Restringida: 1 : N (junto a Parametro_Global)</td></tr>
<tr><td><b>Liquidacion</b></td><td><u>liquidacion_id</u>, anio, mes, sesiones_validadas, monto_prestaciones, bonificacion, monto_total, observacion, momento_emision</td><td>Profesional <i>Recibe</i> Liquidacion: 1 : N · Usuario (Administrador) <i>Emite</i> Liquidacion: 1 : N (bajo Profesional, derecha)</td></tr>
</tbody></table>
<h4>Atributos multivaluados nuevos (óvalo doble) que la 1FN convierte en tabla</h4>
<ul>
  <li><b>Usuario</b>: <code>areas_soporte</code> (multivaluado, valores = categorías de ticket) → tabla <code>Area_Soporte_Operador</code>. Alternativa: entidad débil Area_Soporte con relación <i>Atiende</i> N : M.</li>
  <li><b>Profesional</b>: relación nueva <i>Atiende en</i> Profesional – Comuna, N : M → tabla <code>Profesional_Comuna</code>. (El MERE ya tiene Comuna por Paciente y Sede_Presencial.)</li>
</ul>
<h4>Atributos nuevos en entidades existentes</h4>
<ul>
  <li><b>Notificacion</b>: titulo, datos.</li>
  <li><b>Lista_Espera</b>: estado, momento_notificacion, momento_expira, token_cupo.</li>
  <li><b>Mensaje_Chat</b>: leido; relación nueva Usuario <i>Envía</i> Mensaje_Chat 1 : N (remitente).</li>
  <li><b>Evaluacion_Satisfaccion</b>: motivo_rechazo, momento_moderacion; relación nueva Usuario (Administrador) <i>Modera</i> Evaluacion_Satisfaccion 1 : N.</li>
  <li><b>Ticket_Soporte</b>: momento_enrutamiento, adjunto_url, resolucion; relación nueva Usuario (Administrador) <i>Atiende</i> Ticket_Soporte 1 : N (asignado_a), distinta de <i>Abre</i>.</li>
  <li><b>Paciente</b>: resena_anonima.</li>
</ul>

<h3 id="mr">MR con los cambios incorporados</h3>
<p class="leyenda">Leyenda: <u class="pk">clave_primaria</u> subrayado continuo; <u class="fk">clave_foranea</u> subrayado discontinuo (si un atributo es a la vez clave primaria y foránea, como <code>sede_id</code> en Sede_Online, lleva la marca de clave primaria); <span class="nuevaEj">NUEVA</span> tabla que no estaba en el anexo del Incremento 2; <mark>atributo</mark> agregado a una tabla que ya existía. Se mantiene el estilo del anexo: los grupos repetitivos van entre llaves y se separan en la 1FN. Las claves salen de <code>schema.sql</code> y de las migraciones.</p>
{lista_relacional(MR)}

<h3 id="fn">Normalización con los cambios incorporados</h3>
<h4>Qué aporta cada paso en el Incremento 3</h4>
<ul>
  <li><b>1FN</b> (atomicidad, sin grupos repetitivos): los tres grupos multivaluados nuevos pasan a tablas propias: <code>dispositivos_push</code> de Usuario → <code>Dispositivo_Push</code>; <code>areas_soporte</code> de Usuario → <code>Area_Soporte_Operador</code>; <code>comunas_atencion</code> de Profesional → <code>Profesional_Comuna</code>. Las demás tablas nuevas ya llegan atómicas (banderas, etiquetas y datos se guardan como JSON, igual que respuestas y privacidad_contacto en el anexo actual).</li>
  <li><b>2FN</b> (sin dependencias parciales): las tablas nuevas con clave compuesta (<code>Area_Soporte_Operador</code>, <code>Profesional_Comuna</code>) no tienen atributos fuera de la clave, así que no hay nada que separar. Igual que en el anexo del Incremento 2, la 2FN queda idéntica a la 1FN.</li>
  <li><b>3FN</b> (sin dependencias transitivas): <code>Reporte_Preclinico</code> guarda <code>especialidad_sugerida_id</code> y no el nombre de la especialidad; <code>Alerta_Clinica</code> referencia <code>reporte_sintoma_id</code> en vez de repetir dolor y limitación; <code>Liquidacion.monto_total</code> es derivado (prestaciones + bonificación) pero se conserva a propósito porque la liquidación es una foto inalterable del cálculo del momento (misma razón por la que Bono guarda copago). Además se repone <code>Parametro_Global</code>, que en el anexo del Incremento 2 aparece en 1FN y 2FN pero falta en la 3FN.</li>
</ul>
<h4>Primera Forma Normal</h4>
{lista_relacional(FN1)}
<h4>Segunda Forma Normal</h4>
{lista_relacional(FN2)}
<h4>Tercera Forma Normal</h4>
{lista_relacional(FN3)}

<h3 id="fisico">Modelo físico</h3>
<p>Tipos y restricciones reales de MySQL, tomados de <code>schema.sql</code> y de las migraciones. En el diagrama del modelo físico (<code>Modelo_Físico.drawio.png</code>) hay que agregar las 11 cajas nuevas con sus columnas, dibujar las llaves foráneas indicadas y agregar las columnas nuevas a las 6 cajas modificadas (Notificacion, Lista_Espera, Mensaje_Chat, Evaluacion_Satisfaccion, Ticket_Soporte, Paciente). Las cajas <b>Preferencia_Notificacion</b> y <b>Dispositivo_Push</b> van junto a Notificacion (arriba); <b>Solicitud_Confirmacion</b> bajo Cita; <b>Reporte_Preclinico</b> junto a Triaje; <b>Reporte_Sintoma</b>, <b>Alerta_Clinica</b> e <b>Indicador_Adherencia</b> entre Paciente y Episodio_Clinico; <b>Palabra_Restringida</b> junto a Parametro_Global; <b>Area_Soporte_Operador</b> junto a Ticket_Soporte; <b>Liquidacion</b> junto a Profesional; <b>Profesional_Comuna</b> entre Profesional y Comuna.</p>
<div class="tabla-scroll">{fisico_html()}</div>

<h3 id="nombres">Diferencias de nombres, omisiones y erratas</h3>
<ul>
  <li>Se mantienen las diferencias de nombre ya reportadas en el Incremento 2 (el documento escribe <code>nombre_comuna</code>, <code>contraseña_hash</code> y <code>reseña</code>; el esquema físico usa <code>Comuna.nombre</code>, <code>contrasena_hash</code> y <code>resena</code>). Da lo mismo cuál se adopte, pero conviene que MR, normalización y modelo físico usen el mismo.</li>
  <li>El anexo del Incremento 2 omite <code>Parametro_Global</code> en la 3FN (está en 1FN y 2FN). Se repone en la lista de arriba.</li>
  <li><code>schema.sql</code> tenía una clave foránea pegada por error en <code>Solicitud_Confirmacion</code> (a <code>moderador_id</code>, columna de Evaluacion_Satisfaccion). Producción no la sufrió porque la tabla la crea la migración; ya está corregida en el código (commit <code>4e01994b</code>). No afecta a los documentos.</li>
  <li><b>Subrayados de las claves.</b> En los Word entregados (Incremento 1 e Incremento 2) el MR y la 1FN, 2FN y 3FN están como texto sin subrayar: ninguna clave aparece marcada. Las listas de este reporte ya las traen (primaria continua, foránea discontinua) y se pueden copiar tal cual; al pegarlas en Word, conviene usar subrayado simple para la primaria y subrayado de guiones para la foránea.</li>
  <li><code>Sede_Horario</code>: en <code>schema.sql</code> su clave primaria es solo <code>sede_id</code>, lo que permitiría un único horario por sede. En la normalización la clave correcta es la pareja (<code>sede_id</code>, <code>dia_semana</code>), y así se marca arriba. Viene del Incremento 2 y no afecta a la app (las sedes no tienen pantalla que edite su horario).</li>
  <li>La aplicación se llama ahora <b>Punto Paz Salud</b>; los informes siguen diciendo FRO Salud. Decisión del equipo si se actualiza el nombre y el logo en los documentos.</li>
</ul>

<p class="leyenda" style="margin-top:48px">Generado por <code>generar_reporte.py</code> el 26-09-2026 a partir del commit <code>4e01994b</code>; claves del modelo relacional agregadas el 03-10-2026.</p>
</main>
</body>
</html>
'''

if __name__ == '__main__':
    import pathlib
    salida = pathlib.Path(__file__).with_name('reporte-brechas-inc3.html')
    salida.write_text(PAGINA, encoding='utf-8')
    print('escrito', salida, len(PAGINA), 'bytes')
