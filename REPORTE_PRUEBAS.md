# Reporte de pruebas — MULTIA 4.0

## Backend

- **22 de 22 pruebas aprobadas**.
- Inicio de sesión y cookie de sesión.
- Protección CSRF en operaciones de escritura.
- Persistencia de conversaciones y mensajes.
- Retroalimentación humana.
- Métricas operativas.
- Creación, consulta y suspensión de usuarios.
- Protección contra la degradación del administrador activo.
- Constructor, espacios de trabajo y revisión preventiva.
- Ubicación aproximada, auditoría web autorizada y análisis de evidencias.
- Bloqueo de IP privadas, puertos no web y operaciones sin autorización.

## Frontend

- **27 de 27 pruebas aprobadas**.
- Carga dinámica de los 185 agentes.
- Diez equipos conectados.
- Servicios de IA, ubicación, auditoría web y centro de operaciones.
- Selección automática del modelo 1B o 3B según la complejidad.
- Compilación Vite de producción aprobada.
- Panel administrativo compilado correctamente.

## Integración

- `/api/health`: HTTP 200.
- Versión reportada: `4.0.0`.
- Base de datos SQLite inicializada correctamente.
- Conversación con dos mensajes guardada y recuperada.
- Usuario analista creado y suspendido.
- Operación de escritura sin CSRF: HTTP 403.
- Intento de retirar el propio rol administrativo: HTTP 400.

## Advertencias no bloqueantes

- `node:sqlite` aparece como funcionalidad experimental en Node.js 22.
- Vite informa que el paquete principal supera 500 kB; no impide la compilación, pero se recomienda división adicional del código en una fase posterior.
