# Orquestación de los 185 agentes

## Flujo de cada consulta

1. MULTIA detecta si la solicitud es de construcción, jurídica o de investigación.
2. Carga y valida los 185 agentes.
3. Conecta cada agente exactamente una vez dentro de uno de los 10 equipos.
4. Lanza los 10 equipos mediante `Promise.all`.
5. Cada equipo entrega análisis, aspectos positivos, aspectos negativos, mejoras, visión futura, evidencia y conclusión.
6. El relator compara coincidencias, desacuerdos, riesgos y afirmaciones sin fuente.
7. El presidente del consejo resuelve contradicciones y redacta la respuesta final.
8. Si se solicitó software, el constructor materializa la especificación, valida archivos y genera el ZIP.

## Consultas jurídicas

El equipo jurídico participa siempre. Cuando detecta relevancia jurídica, entrega un dictamen informativo con hechos conocidos, hechos faltantes, problema jurídico, fuentes primarias necesarias, argumentos favorables, argumentos desfavorables, conclusión provisional, riesgos y próximos pasos. No puede inventar normas, sentencias ni radicados.

## Búsquedas e investigación

El equipo de investigación formula estrategia, fuentes primarias, fechas de corte, hechos verificados, hechos pendientes, contradicciones y nivel de confianza. Sin un conector de Internet, MULTIA debe indicar que la comprobación externa está pendiente; no puede presentar una fuente imaginaria como consultada.

## Paralelismo real

Los diez equipos son invocados concurrentemente. Los proveedores remotos pueden responder en paralelo. WebLLM utiliza una única instancia del modelo dentro del navegador y encola las inferencias para no corromper el motor; por ello la participación es completa, pero el procesamiento físico es secuencial en ese modo gratuito.
