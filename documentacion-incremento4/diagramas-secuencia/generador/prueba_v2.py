# -*- coding: utf-8 -*-
# Prueba del formato con todos los componentes: CU65 y CU37.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from motor_legible import generar_cu
from comun import *

def pag(nombre, titulo, participantes, *lineas):
    out = []
    for l in lineas: out += l if isinstance(l, list) else [l]
    return dict(nombre=nombre, titulo=titulo, participantes=participantes, lineas=out)

CU65 = dict(id='CU65', paginas=[
 pag('CU65 - Principal (derivar)', 'CU65 · Flujo principal: derivar el episodio',
  [ACTOR('Profesional'), VISTA('V_Derivacion_Interna'), API, DESP, DAO, SQL],
  'A -> V: Presionar "Derivar"',
  'V -> API: GET opciones de derivación',
  db('API', 'Leer especialidades y profesionales', 'SELECT Especialidad, Profesional', 'Profesionales activos', 'Opciones'),
  'API --> V: Especialidades disponibles',
  'V --> A: Mostrar especialidades',
  'A -> V: Elegir destino y motivo',
  'V -> API: POST derivación',
  '! Una transacción: busca otra pendiente, INSERT Derivacion_Interna y Bitacora_Auditoria',
  db('API', 'Registrar la derivación', 'INSERT Derivacion_Interna', 'Resultado', 'Resultado'),
  'alt [el episodio no tenía otra pendiente]',
  aviso('API', 'CU52 · Avisar al receptor'),
  'API --> V: 201 Derivación enviada',
  'V --> A: Mostrar "Derivación enviada"',
  'else [ya había una derivación pendiente]',
  'API --> V: 409 Derivación duplicada',
  'V --> A: Avisar la pendiente',
  'end'),
 pag('CU65 - Principal (responder)', 'CU65 · Flujo principal: responder la derivación',
  [ACTOR('Profesional receptor'), VISTA('V_Derivaciones_Recibidas'), API, DESP, DAO, SQL],
  'A -> V: Abrir "Derivaciones recibidas"',
  'V -> API: GET derivaciones recibidas',
  db('API', 'Leer derivaciones del receptor', 'SELECT Derivacion_Interna', 'Filas', 'Derivaciones'),
  'API --> V: Lista de derivaciones',
  'V --> A: Mostrar las pendientes',
  'A -> V: Aceptar o rechazar',
  'V -> API: POST respuesta',
  'alt [acepta]',
  '! Una transacción: Derivacion_Interna, Episodio_Clinico, Cita y Bitacora_Auditoria',
  db('API', 'Traspasar el episodio', 'UPDATE Episodio_Clinico, Cita', 'Confirmación', 'Episodio traspasado'),
  aviso('API', 'CU52 · Avisar a quien derivó'),
  'API --> V: 200 Episodio a tu cargo',
  'V --> A: Mostrar "Derivación aceptada"',
  'else [rechaza indicando el motivo]',
  db('API', 'Rechazar la derivación', 'UPDATE Derivacion_Interna', 'Confirmación', 'Rechazo guardado'),
  aviso('API', 'CU52 · Avisar el motivo a quien derivó'),
  'API --> V: 200 Rechazo registrado',
  'V --> A: Mostrar "Derivación rechazada"',
  'end')])

CU37 = dict(id='CU37', paginas=[
 pag('CU37 - Principal (revisar)', 'CU37 · Flujo principal: revisar el cierre del episodio',
  [ACTOR('Profesional'), VISTA('V_Informe_Alta'), API, ALTA, DAO, SQL],
  'A -> V: Abrir "Informe de alta"',
  'V -> API: GET resumen del episodio',
  'API -> ALTA: Consolidar el episodio',
  db('ALTA', 'Leer metas del episodio', 'SELECT Objetivo_Terapeutico', 'Filas', 'Metas'),
  db('ALTA', 'Leer evoluciones y citas futuras', 'SELECT Evolucion_Clinica, Cita', 'Filas', 'Pendientes'),
  'ALTA ->> ALTA: Comparar metas con el umbral (80 %)',
  'ALTA --> API: Cumplimiento y pendientes',
  'API --> V: Resumen del episodio',
  'V --> A: Mostrar metas y pendientes'),
 pag('CU37 - Principal (emitir)', 'CU37 · Flujo principal: emitir el informe y cerrar el episodio',
  [ACTOR('Profesional'), VISTA('V_Informe_Alta'), API, DESP, ALTA, ADP, DAO, SQL, CLOUD],
  'A -> V: Escribir pautas y emitir',
  'V -> API: POST informe de alta',
  'API -> ALTA: Emitir el informe',
  'alt [umbral alcanzado y sin pendientes]',
  'ALTA ->> ALTA: Generar el PDF',
  'ALTA -> ADP: Subir el PDF',
  'ADP -> CLOUD: Subir archivo',
  'CLOUD --> ADP: URL',
  'ADP --> ALTA: URL del documento',
  '! Una transacción: Documento_Clinico, Episodio_Clinico, Derivacion_Interna y Bitacora_Auditoria',
  db('ALTA', 'Guardar informe y cerrar', 'INSERT y UPDATE (transacción)', 'Confirmación', 'Episodio cerrado'),
  'ALTA --> API: Informe emitido',
  aviso('API', 'CU52 · Avisar al paciente'),
  'API --> V: 201 Informe emitido',
  'V --> A: Mostrar "Informe emitido"',
  'else [evoluciones sin firmar o citas futuras]',
  'ALTA --> API: Pendientes por regularizar',
  'API --> V: 409 Pendientes',
  'V --> A: Mostrar los pendientes',
  'end')])

if __name__ == '__main__':
    base = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'prueba-v2')
    for cu in (CU65, CU37):
        print(cu['id'], generar_cu(cu, base))
