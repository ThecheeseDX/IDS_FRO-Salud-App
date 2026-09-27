# Diagramas de secuencia — Incremento 3

Una carpeta por CU con su `.drawio` multipágina (se abre en app.diagrams.net) y un PNG por página: el flujo principal y una página por excepción, repetidas por actor cuando el CU tiene varios.

## Reglas (las mismas del Incremento 2)

1. Cada página de excepción retoma el flujo principal y termina en su mismo mensaje final.
2. SQL sin marcadores `?` ni cláusula `WHERE`: operación, tabla y columnas.
3. Las lifelines son idénticas en todas las páginas de un CU.
4. Ningún mensaje salta una lifeline: actor → vista → C_API_REST → controladores → capa de datos → MySQL → tabla, y la respuesta vuelve por el mismo camino.
5. Solo componentes del Diagrama de Componentes del Incremento 3 y tablas que existen en el esquema (el generador aborta si no).
6. **Todo tramo nace en el actor y vuelve a él** (regla de Pablo, 26-09-2026): con la pila vacía, el único mensaje válido es una llamada o acción del actor, y cada página termina de vuelta en el actor. Nada empieza en el servidor, ni al inicio ni a mitad de página. El validador lo comprueba.

Componentes nuevos del Incremento 3: `C_Programador_Agenda`, `C_Despachador_Notificaciones`, `C_Motor_Clinico`, `C_Filtro_Contenido`, `C_Cifrado_Mensajeria`, `C_Generador_Informes`, y la API externa `C_API_Expo_Push`.

Convenciones propias del Incremento 3:
- Los avisos siempre pasan por `C_Despachador_Notificaciones`. En el CU52 se dibuja completo (preferencias, tokens, Expo Push, Brevo, bitácora); en los demás CU, en su forma corta (centro de notificaciones y, si corresponde, correo).
- Lo que en el servidor corre también por temporizador (CU21, Exc. 4 del CU19) se dibuja desde la consulta del paciente que lo dispara de verdad: abrir Mis Citas llama al `C_Programador_Agenda` antes de responder. El temporizador de cada 5 minutos se indica en una nota.
- Lo que ocurre dentro de la acción de otro usuario (la oferta del cupo al primero de la fila, que sucede en la cancelación del CU18) se indica en una nota con referencia al CU que lo dibuja.
- Una sola vista por actor y CU, salvo el **CU58** (la calificación se ve en el buscador o en Mi perfil público y las reseñas en Evaluaciones del Profesional) y el **CU52**: cada rol dispara el aviso con una acción propia (Paciente cancela una cita en Mis Citas, Profesional confirma una hora pagada en la ficha, Administrador declara sus áreas en la Bandeja de Soporte) y luego lo lee en el Centro de Notificaciones, así que lleva dos vistas.

## Tandas

| Tanda | CUs | Páginas | Estado |
|---|---|---|---|
| 1 · Notificaciones y agenda | CU52 (3 roles), CU21, CU19 | 26 | hecha |
| 2 · Triaje y seguimiento | CU25, CU26, CU50 (2 roles), CU44, CU45 | 22 | hecha |
| 3 · Mensajería y filtro | CU53 (2 roles), CU57 (3 roles) | 20 | hecha |
| 4 · Calidad del servicio | CU55, CU56, CU58 (2 roles) | 19 | hecha |
| 5 · Soporte y gestión | CU60 (2 roles), CU61, CU64, CU63 | 25 | hecha |
| 6 · Finanzas | CU73, CU74, CU75 | ~25 | pendiente |

## Cómo regenerar

```bash
cd generador
python3 tanda1.py            # .drawio + PNG (necesita el Chromium de Playwright)
python3 tanda1.py --sin-png  # solo valida y genera los .drawio
```
