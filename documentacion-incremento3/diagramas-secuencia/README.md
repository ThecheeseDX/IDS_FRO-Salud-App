# Diagramas de secuencia — Incremento 3

Una carpeta por CU con su `.drawio` multipágina (se abre en app.diagrams.net) y un PNG por página: el flujo principal y una página por excepción, repetidas por actor cuando el CU tiene varios.

## Reglas (las mismas del Incremento 2)

1. Cada página de excepción retoma el flujo principal y termina en su mismo mensaje final.
2. SQL sin marcadores `?` ni cláusula `WHERE`: operación, tabla y columnas.
3. Las lifelines son idénticas en todas las páginas de un CU.
4. Ningún mensaje salta una lifeline: actor → vista → C_API_REST → controladores → capa de datos → MySQL → tabla, y la respuesta vuelve por el mismo camino.
5. Solo componentes del Diagrama de Componentes del Incremento 3 y tablas que existen en el esquema (el generador aborta si no).

Componentes nuevos del Incremento 3: `C_Programador_Agenda`, `C_Despachador_Notificaciones`, `C_Motor_Clinico`, `C_Filtro_Contenido`, `C_Cifrado_Mensajeria`, `C_Generador_Informes`, y la API externa `C_API_Expo_Push`.

Convenciones propias del Incremento 3:
- Los avisos siempre pasan por `C_Despachador_Notificaciones`. En el CU52 se dibuja completo (preferencias, tokens, Expo Push, Brevo, bitácora); en los demás CU, en su forma corta (centro de notificaciones y, si corresponde, correo).
- Los CU que nacen en el servidor (CU21, y la Exc. 4 del CU19) empiezan en `C_Programador_Agenda`, con el paciente como actor.
- Una sola vista por actor y CU. CU21 usa la página web del correo (`V_Confirmacion_Correo`); la misma respuesta desde la app se indica en una nota.

## Tandas

| Tanda | CUs | Páginas | Estado |
|---|---|---|---|
| 1 · Notificaciones y agenda | CU52 (3 roles), CU21, CU19 | 26 | hecha |
| 2 · Triaje y seguimiento | CU25, CU26, CU50, CU44, CU45 | ~26 | pendiente |
| 3 · Mensajería y filtro | CU53, CU57 | ~25 | pendiente |
| 4 · Calidad del servicio | CU55, CU56, CU58 | ~20 | pendiente |
| 5 · Soporte y gestión | CU60, CU61, CU64, CU63 | ~25 | pendiente |
| 6 · Finanzas | CU73, CU74, CU75 | ~25 | pendiente |

## Cómo regenerar

```bash
cd generador
python3 tanda1.py            # .drawio + PNG (necesita el Chromium de Playwright)
python3 tanda1.py --sin-png  # solo valida y genera los .drawio
```
