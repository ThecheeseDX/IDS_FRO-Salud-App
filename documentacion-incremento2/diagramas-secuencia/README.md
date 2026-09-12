# Diagramas de secuencia — Incremento 2

Un archivo `.drawio` por caso de uso, con **una página por diagrama**: el flujo
principal y una página por cada excepción de la ficha. Si el CU tiene varios
actores, el juego completo se repite por actor (igual que en el Incremento 1).
Junto a cada `.drawio` están los PNG de cada página, con el mismo nombre que
usó el Incremento 1 (`CUxx-Principal Actor.png`, `CUxx-Excepción n Actor.png`).

Reglas de notación (la misma de CU01/CU02 del Incremento 1):

- **Las lifelines son las mismas en todas las páginas de un CU.** Si una tabla o un componente
  aparece en una sola página (por ejemplo, la bitácora que solo se escribe en una excepción),
  igual se dibuja en el flujo principal y en el resto de las excepciones, aunque ahí no reciba
  mensajes.
- **Ningún mensaje salta una lifeline.** La cadena es actor → vista → `C_API_REST` →
  `C_Capa_de_Acceso_a_Datos` → `C_MYSQL` → tabla, y los componentes internos
  (`C_Seguridad_JWT_BCrypt`, `C_API_Adapter`) y los servicios externos se llaman desde
  `C_API_REST` y el adaptador, nunca directamente desde la vista o el actor.
- **Solo se usan componentes del Diagrama de Componentes** del Incremento 1: Cliente Móvil
  (las vistas `V_*`), API REST, API Adapter, Seguridad JWT/BCrypt, Capa de Acceso a Datos,
  MySQL y las APIs externas (Brevo, Cloudinary, Transacciones, Bonos, OpenAI, Expo Push).
- El generador verifica estas reglas y se detiene si alguna página las incumple.

Detalle del dibujo:
- Lifelines: Actor → `V_<Vista>` → `C_API_REST` → `C_Capa_de_Acceso_a_Datos` → `C_MYSQL` → una por tabla.
  Los servicios externos aparecen como `S_<Servicio>` (Brevo para correo, Cloudinary para archivos).
- Flecha continua = llamada `nombre_en_snake_case(argumentos)`; punteada = retorno `return (...)`;
  bucle = operación interna del componente.
- SQL: se muestran la operación, la tabla y las columnas, sin marcadores «?» y sin la cláusula WHERE
  (`UPDATE Cita SET estado, motivo_cancelacion`). La tanda 1 se entregó antes de este acuerdo y
  conserva el formato con «?» y WHERE.
- Nota amarilla = punto donde ocurre la excepción. Después de la nota van la respuesta del
  sistema y la acción del actor, y **toda página de excepción retoma y completa el flujo
  principal**: el diagrama siempre termina en el mismo mensaje final que su página Principal.

## Tandas

| Tanda | CUs | Páginas | Estado |
|---|---|---|---|
| 1 · Cuenta, seguridad y perfil | CU06, CU07, CU08, CU09, CU10, CU79 | 72 | Entregada |
| 2 · Gestión de citas | CU17, CU18, CU22, CU76 | 35 | Entregada |
| 3 · Triaje y evaluación | CU27, CU23, CU24, CU77 | 19 | Entregada |
| 4 · Pautas de ejercicio | CU46, CU47, CU48, CU49 | | Pendiente |
| 5 · Evidencia de atención | CU39, CU41, CU42, CU43 | | Pendiente |
| 6 · Documentos y versionado | CU31, CU33, CU34, CU35 | | Pendiente |
| 7 · Bonos y copagos | CU66, CU67, CU69, CU71 | | Pendiente |
| 8 · Episodio clínico | CU78 | | Pendiente |

## Cómo se generan

`generador/motor.py` convierte una descripción corta de cada CU (participantes,
mensajes del flujo principal, excepciones) en el `.drawio` y los PNG. Cada tanda es un archivo `tandaN.py`
y `comun.py` reúne los participantes y los atajos de SQL compartidos. Para regenerar: `python3 generador/tanda1.py`
(necesita Python 3 y el Chromium headless de Playwright para los PNG; sin él
solo produce el `.drawio`).
