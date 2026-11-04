# -*- coding: utf-8 -*-
# Diagrama de prueba (CU65, principal de quien deriva) con la versión resumida:
# mismas reglas del Inc 3, pero sin las tablas como líneas de vida (van en el
# mensaje a C_MYSQL), una sola ida a la base por operación y letra 20.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import motor
motor.FUENTE = 20; motor.LETRA = 0.56 * 20
from motor import generar_cu, chrome_path
from comun import *

def base(llamada, sql, ret_sql, retorno, origen=API):
    return [f'{origen} -> {DAO}: {llamada}', f'{DAO} -> {SQL}: {sql}', f'{SQL} --> {DAO}: {ret_sql}', f'{DAO} --> {origen}: {retorno}']

PRINCIPAL = [
    'A -> V: derivar_episodio(episodio_id)',
    f'V -> {API}: GET /clinica/episodio/:id/derivaciones/opciones',
    *base('listar_receptores_activos()', 'SELECT Especialidad, Profesional', 'return (filas)', 'return (receptores)'),
    f'{API} --> V: return (200: especialidades)',
    'V --> A: mostrar_especialidades()',
    'A -> V: enviar_derivacion(destino, motivo)',
    f'V -> {API}: POST /clinica/episodio/:id/derivaciones',
    f'{API} ->> {API}: validar_responsable_y_motivo()',
    '! Una transacción: revisa que no haya otra pendiente, guarda y anota en la bitácora',
    *base('registrar_derivacion(PENDIENTE)', 'INSERT Derivacion_Interna', 'return (1 fila)', 'return (guardada)'),
    f'{API} -> {DESP}: despachar(DERIVACION_RECIBIDA)',
    *base('guardar_aviso()', 'INSERT Notificacion', 'return (1 fila)', 'return (aviso guardado)', origen=DESP),
    f'{DESP} --> {API}: return (aviso enviado)',
    f'{API} --> V: return (201: derivación enviada)',
    'V --> A: mostrar_derivacion_pendiente()',
]

CU65 = dict(id='CU65', nombre='Registrando y siguiendo derivaciones internas', actores=['Profesional'],
  vistas={'Profesional': 'V_Derivacion_Interna'},
  participantes=[ACTOR, VISTA, P(API), P(DESP), P(DAO), P(SQL)],
  principal=PRINCIPAL, excepciones={})

if __name__ == '__main__':
    salida = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'prueba'))
    print(generar_cu(CU65, os.path.join(salida, 'CU65'), chrome_path()))
