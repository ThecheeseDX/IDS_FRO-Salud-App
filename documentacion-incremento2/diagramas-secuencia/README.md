# Diagramas de secuencia — Incremento 2

Un archivo `.drawio` por caso de uso, con **una página por diagrama**: el flujo
principal y una página por cada excepción de la ficha. Si el CU tiene varios
actores, el juego completo se repite por actor (igual que en el Incremento 1).
Junto a cada `.drawio` están los PNG de cada página, con el mismo nombre que
usó el Incremento 1 (`CUxx-Principal Actor.png`, `CUxx-Excepción n Actor.png`).

Notación (la misma de CU01/CU02 del Incremento 1):
- Lifelines: Actor → `V_<Vista>` → `C_API_REST` → `C_Capa_de_Acceso_a_Datos` → `C_MYSQL` → una por tabla.
  Los servicios externos aparecen como `S_<Servicio>` (Brevo para correo, Cloudinary para archivos).
- Flecha continua = llamada `nombre_en_snake_case(argumentos)`; punteada = retorno `return (...)`;
  bucle = operación interna del componente.
- Nota amarilla = punto donde ocurre la excepción. Después de la nota va la respuesta
  del sistema y la acción del actor; cuando la ficha dice que reintenta, el flujo se repite completo.

## Tandas

| Tanda | CUs | Páginas | Estado |
|---|---|---|---|
| 1 · Cuenta, seguridad y perfil | CU06, CU07, CU08, CU09, CU10, CU79 | 72 | Entregada |
| 2 · Gestión de citas | CU17, CU18, CU22, CU76 | | Pendiente |
| 3 · Triaje y evaluación | CU23, CU24, CU27, CU77 | | Pendiente |
| 4 · Pautas de ejercicio | CU46, CU47, CU48, CU49 | | Pendiente |
| 5 · Evidencia de atención | CU39, CU41, CU42, CU43 | | Pendiente |
| 6 · Documentos y versionado | CU31, CU33, CU34, CU35 | | Pendiente |
| 7 · Bonos y copagos | CU66, CU67, CU69, CU71 | | Pendiente |
| 8 · Episodio clínico | CU78 | | Pendiente |

## Cómo se generan

`generador/motor.py` convierte una descripción corta de cada CU (participantes,
mensajes del flujo principal, excepciones) en el `.drawio` y los PNG. Cada tanda
es un archivo `tandaN.py`. Para regenerar: `python3 generador/tanda1.py`
(necesita Python 3 y el Chromium headless de Playwright para los PNG; sin él
solo produce el `.drawio`).
