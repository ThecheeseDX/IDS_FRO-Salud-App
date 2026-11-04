# -*- coding: utf-8 -*-
# Diagrama de prueba (CU65) para validar con Pablo el nivel de detalle y la legibilidad.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from motor_legible import generar_cu
from comun import *

CU65 = dict(id='CU65', nombre='Registrando y Siguiendo Derivaciones Internas', paginas=[
  dict(nombre='CU65 - Principal (derivar)', titulo='CU65 · Flujo principal: derivar el episodio',
       participantes=[ACTOR('Profesional'), VISTA('V_Derivacion_Interna'), SERVIDOR, BD],
       lineas=[
    'A -> V: Presionar "Derivar"',
    'V -> S: GET opciones de derivación',
    'S -> BD: Leer especialidades y profesionales',
    'BD --> S: Profesionales activos',
    'S --> V: Especialidades disponibles',
    'V --> A: Mostrar especialidades',
    'A -> V: Elegir destino y justificación',
    'V -> S: POST derivación',
    'S -> BD: Buscar derivación pendiente',
    'BD --> S: Resultado',
    'alt [el episodio no tiene otra pendiente]',
    '! Una transacción: derivación + bitácora',
    'S -> BD: Guardar derivación PENDIENTE',
    'BD --> S: Derivación guardada',
    'S ->> S: Avisar al receptor (CU52)',
    'S --> V: 201 Derivación enviada',
    'V --> A: Mostrar "Derivación enviada"',
    'else [ya hay una derivación pendiente]',
    'S --> V: 409 Derivación duplicada',
    'V --> A: Mostrar a quién está pendiente',
    'end',
  ]),
  dict(nombre='CU65 - Principal (responder)', titulo='CU65 · Flujo principal: responder la derivación',
       participantes=[ACTOR('Profesional receptor'), VISTA('V_Derivaciones_Recibidas'), SERVIDOR, BD],
       lineas=[
    'A -> V: Abrir "Derivaciones recibidas"',
    'V -> S: GET derivaciones recibidas',
    'S -> BD: Leer derivaciones del receptor',
    'BD --> S: Derivaciones',
    'S --> V: Lista de derivaciones',
    'V --> A: Mostrar las pendientes',
    'A -> V: Aceptar o rechazar',
    'V -> S: POST respuesta',
    'alt [acepta]',
    '! Una transacción: derivación, episodio, citas y bitácora',
    'S -> BD: Traspasar el episodio al receptor',
    'BD --> S: Episodio traspasado',
    'S ->> S: Avisar a quien derivó (CU52)',
    'S --> V: 200 Episodio a tu cargo',
    'V --> A: Mostrar "Derivación aceptada"',
    'else [rechaza indicando el motivo]',
    'S -> BD: Marcar derivación RECHAZADA',
    'BD --> S: Derivación rechazada',
    'S ->> S: Avisar el motivo a quien derivó',
    'S --> V: 200 Rechazo registrado',
    'V --> A: Mostrar "Derivación rechazada"',
    'end',
  ]),
])

if __name__ == '__main__':
    base = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    print('CU65:', generar_cu(CU65, base), 'diagramas')
