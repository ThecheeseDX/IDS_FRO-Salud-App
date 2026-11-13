# Levantamiento de Procesos Final (BPMN en Bizagi)

Procesos con los que queda trabajando Punto Paz Salud al usar la aplicación completa (proceso To-Be), con los 79 casos de uso implementados.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `Levantamiento de Procesos Final.bpm` | El archivo de Bizagi Modeler. Trae 3 diagramas: los 10 procesos, y los 2 subprocesos de ficha clínica. |
| `figuras/` | Una imagen PNG por proceso (12), lista para pegar en el documento. También en SVG. |
| `cobertura-casos-de-uso.md` | En qué proceso y en qué actividad aparece cada uno de los 79 casos de uso. |
| `respaldo/Levantamiento de Procesos Final (respaldo).bpm` | Copia de respaldo, por si Bizagi no abre el archivo principal (ver más abajo). |
| `generador/` | El programa que escribe todo lo anterior. Los procesos están descritos en `procesos.py`. |

## Cómo abrirlo

1. Abrir Bizagi Modeler (versión 4.3 o posterior, la misma del levantamiento inicial).
2. `Archivo` → `Abrir` → `Levantamiento de Procesos Final.bpm`.
3. Abajo aparecen tres pestañas: **Diagrama 1** (los 10 procesos, uno debajo del otro), **Diagrama 2** (subproceso de creación de ficha clínica) y **Diagrama 3** (subproceso de actualización de ficha clínica).
4. Cada actividad trae su descripción y sus casos de uso: se ven al seleccionarla, en `Propiedades` → `Descripción`.

**Importante:** el archivo se generó copiando la estructura del levantamiento inicial del Documento 0, pero no se pudo probar abriéndolo en Bizagi, porque Bizagi solo funciona en Windows. La única figura que no estaba en el archivo inicial es la tarea automática del sistema (la del engranaje). Si Bizagi mostrara un error al abrirlo, usar el archivo de `respaldo/`: es idéntico, pero esas tareas van como tareas comunes, con figuras que ya existían en el archivo inicial.

## Qué cambia frente al levantamiento inicial

- Se mantienen los cinco procesos del Documento 0 (agendamiento, confirmación de sesión, atención clínica y gestión de ficha, comunicación y seguimiento) y los dos subprocesos de ficha clínica, ahora con la aplicación.
- Se agregan cinco procesos que nacen con la aplicación: registro y acceso, pago y bonos, alta y derivación, soporte y eventos críticos, y gestión y supervisión administrativa.
- Cada proceso tiene una calle nueva, **Sistema Punto Paz Salud**, que muestra lo que la aplicación hace sola: validar, avisar, calcular, registrar y resguardar.
- Aparece el **Administrador** como participante, y los proveedores externos (financiador y pasarela de pago).
- Se conserva el formato: un pool por proceso, calles por participante y tres fases por proceso.

## Texto propuesto para el documento

### Levantamiento de procesos final: BPMN en herramienta Bizagi

Con la aplicación Punto Paz Salud en operación, el agendamiento deja de hacerse por WhatsApp: el paciente busca una hora en la agenda real de cada profesional, la reserva y la paga desde la app, y el sistema impide que dos personas tomen el mismo bloque. El registro clínico ya no queda en los dispositivos personales de cada profesional, sino en una ficha clínica electrónica única, firmada digitalmente e inalterable, con versiones para las correcciones. El seguimiento deja de depender de la memoria del profesional: el paciente marca sus ejercicios y reporta sus síntomas, y el sistema calcula la adherencia, envía refuerzos y alerta ante un deterioro. La comunicación pasa a un chat cifrado dentro de la aplicación, con respaldo formal de cada indicación.

En las Figuras X.1 a la X.10 se presenta el Levantamiento de Procesos Final de Punto Paz Salud, que modela bajo el estándar BPMN cómo se ejecutan las etapas del servicio con el sistema terminado. Se mantienen los cinco procesos del levantamiento inicial, ahora apoyados por la aplicación: proceso de agendamiento (Fig. X.2), proceso de confirmación de sesión (Fig. X.3), proceso de atención clínica y gestión de ficha clínica (Fig. X.4), proceso de comunicación (Fig. X.5) y proceso de seguimiento (Fig. X.6). A ellos se suman cinco procesos que nacen con el sistema: proceso de registro y acceso (Fig. X.1), proceso de pago y bonos (Fig. X.7), proceso de alta y derivación (Fig. X.8), proceso de soporte y eventos críticos (Fig. X.9) y proceso de gestión y supervisión administrativa (Fig. X.10).

En las Figuras X.11 y X.12 se presentan los subprocesos de creación de ficha clínica y de actualización de ficha clínica, que detallan cómo se abre, se registra, se firma y se resguarda la información clínica del paciente.

En todos los diagramas se agrega la calle "Sistema Punto Paz Salud", que muestra las actividades que la aplicación realiza de forma automática, y se incorpora al Administrador como participante.

### Resumen de cada proceso

- **Proceso de Registro y Acceso (Fig. X.1).** La persona se registra como paciente o profesional; el sistema valida sus datos y verifica su identidad con un código enviado al correo. A los profesionales los acredita el administrador. Luego cada persona inicia sesión y ve solo las vistas de su rol.
- **Proceso de Agendamiento (Fig. X.2).** El paciente busca por especialidad, profesional y modalidad, y elige una hora de la agenda real. El sistema bloquea la hora mientras se paga; si la hora ya fue tomada, ofrece la lista de espera. Con el pago registrado, el profesional confirma la cita y el paciente recibe el aviso.
- **Proceso de Confirmación de Sesión (Fig. X.3).** El sistema detecta solo las citas próximas y pide la confirmación por la app, por notificación y por correo. El paciente confirma, cambia la hora o cancela. Al cancelar, el sistema libera la hora, la ofrece al primero de la lista de espera y aplica la devolución.
- **Proceso de Atención Clínica y Gestión de Ficha Clínica (Fig. X.4).** El paciente responde una entrevista previa y el profesional recibe un reporte pre-clínico. Al iniciar y finalizar la atención, el sistema registra las horas y valida la presencia: por GPS en las visitas a domicilio y con evidencia de conexión en las virtuales. El paciente firma su conformidad, la sesión se certifica y la ficha se actualiza.
- **Proceso de Comunicación (Fig. X.5).** El paciente escribe a su profesional por el chat de la aplicación. El sistema filtra el contenido restringido, cifra el mensaje, lo guarda y avisa al destinatario. La conversación queda respaldada.
- **Proceso de Seguimiento (Fig. X.6).** El profesional prescribe una pauta de ejercicios. El paciente marca su cumplimiento y reporta sus síntomas; el sistema calcula la adherencia, envía mensajes de ánimo y alerta al profesional si detecta un deterioro. El profesional revisa el progreso y ajusta el tratamiento.
- **Proceso de Pago y Bonos (Fig. X.7).** El paciente paga una sesión o un plan, o registra su bono de cobertura. El sistema valida el bono con el financiador y cobra por la pasarela de pago. Si el financiador no responde, se activa una contingencia que permite registrar el bono de forma provisoria y regularizarlo después.
- **Proceso de Alta y Derivación (Fig. X.8).** Cuando el paciente alcanza sus metas, el sistema habilita contenidos de preparación para el alta. El profesional emite el informe de alta, que cierra el episodio, o deriva al paciente a otro profesional, que revisa la ficha y decide si acepta el traspaso.
- **Proceso de Soporte y Eventos Críticos (Fig. X.9).** Pacientes y profesionales levantan solicitudes de soporte. El sistema las enruta por categoría y, si detecta un término crítico, escala el evento de inmediato al administrador, que acusa recibo y actúa.
- **Proceso de Gestión y Supervisión Administrativa (Fig. X.10).** El administrador revisa los indicadores, modera los testimonios, genera informes, calcula las liquidaciones de los profesionales y ajusta los parámetros del sistema.
- **Subproceso de creación de ficha clínica (Fig. X.11).** El sistema crea la ficha con los datos del registro y del triaje y abre el episodio clínico. El profesional registra la anamnesis y las metas, firma, y el registro queda sellado.
- **Subproceso de actualización de ficha clínica (Fig. X.12).** El profesional registra la evolución, adjunta documentos y firma. El registro queda inalterable; una corrección posterior crea una versión nueva y conserva la anterior.

En resumen, los diagramas del levantamiento final muestran que las tareas manuales y los canales informales del levantamiento inicial fueron reemplazados por flujos estandarizados y controlados por el sistema: cada hora agendada, cada atención, cada mensaje y cada pago queda registrado, validado y con trazabilidad.

## Para regenerar

```bash
python3 generador/generar.py
```

Avisa si una flecha atraviesa una figura, si una figura queda sin conexión y si falta algún caso de uso. Las figuras PNG usan el Chromium que ya está instalado en este computador.
