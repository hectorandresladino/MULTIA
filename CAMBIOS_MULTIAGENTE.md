# Cambios MULTIA

- Restaurado el total de **185 agentes**, todos con nombres internos y profesionales.
- Conectados exactamente una vez en **10 equipos expertos**.
- Todos los equipos participan en cada consulta, búsqueda o solicitud de proyecto.
- Añadido equipo jurídico de 20 agentes, incluido derecho colombiano, propiedad horizontal, jurisprudencia, prueba y contraargumentos.
- Añadido equipo de investigación de 20 agentes para fuentes oficiales, citas, fechas, hechos, metodología e incertidumbre.
- Toda respuesta debe exponer aspectos positivos, negativos, mejoras y visión futura.
- El relator debate en todas las consultas, no únicamente en proyectos.
- El consejo emite la síntesis final y el constructor se activa solo cuando se solicita software.
- Se prohíbe inventar fuentes, normas, sentencias, enlaces o verificaciones externas.


## Versión 3.2 — Auditoría web autorizada

- Se agregó un panel para evaluar sitios propios o expresamente autorizados.
- Se agregó validación contra SSRF con resolución y fijación de IPv4 pública.
- Se agregó revisión HTTP, TLS, cabeceras, tecnologías visibles y 12 puertos comunes.
- Se agregó consulta OSV sin API key para paquetes compatibles con versión exacta visible.
- El informe se conecta a los diez equipos y los 185 agentes.
- Se agregaron reglas que prohíben explotación, fuerza bruta, evasión, persistencia y ampliación del escaneo.


## Versión 3.3 — Centro de operaciones seguras

- Se agregó análisis de reportes de inventario de puertos importados, sin escaneo activo.
- Se agregó revisión de `package-lock.json`, `requirements.txt` y SBOM CycloneDX con consulta OSV limitada.
- Se agregó análisis preventivo de cabeceras y muestras de registros con redacción de secretos.
- Se agregó ubicación voluntaria y puntual del dispositivo actual mediante permiso del navegador.
- Se agregó análisis local de trayectos propios; el consejo no recibe coordenadas exactas ni puntos individuales.
- Se agregó inventario local de activos propios sin identificadores completos.
- Se prohíben ubicación remota de terceros, búsqueda por teléfono o IMEI, comandos, explotación, fuerza bruta y malware.

## Versión 4.0 — Acceso, memoria y operación robusta

- Se añadió autenticación obligatoria con sesiones HttpOnly y protección CSRF.
- Se añadieron roles de administrador, analista y usuario.
- Se añadió un panel para crear, suspender y administrar cuentas.
- Se impide desactivar o degradar al último administrador activo.
- Se añadió persistencia de conversaciones, mensajes, retroalimentación, ejecuciones y eventos de auditoría.
- Se añadió un PVC para conservar la base SQLite y los espacios de trabajo en OpenShift Sandbox.
- La caché local quedó separada por usuario.
- Se añadió selección automática de modelo WebLLM: 1B para tareas sencillas y 3B para tareas complejas.
- Se añadieron métricas de uso y retroalimentación humana sobre respuestas.
