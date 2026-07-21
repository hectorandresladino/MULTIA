# Módulo de auditoría web autorizada

## Objetivo

Permitir que el propietario o administrador de un sitio realice una revisión preventiva y limitada desde MULTIA, sin convertir la aplicación en una herramienta de explotación.

## Flujo

1. El usuario escribe el dominio.
2. Declara la base de autorización.
3. El backend normaliza la URL y resuelve IPv4.
4. Se rechazan IP directas y redes privadas o reservadas.
5. Se fija la dirección pública validada para evitar cambios de DNS durante la solicitud.
6. Se consultan HTTP/HTTPS, TLS y 12 puertos TCP comunes.
7. Se examinan cabeceras y versiones visibles.
8. Cuando corresponde, se consultan avisos OSV para paquetes JavaScript con versión exacta.
9. El resultado se entrega al consejo de 185 agentes.

## Puertos permitidos

`21, 22, 25, 80, 443, 587, 993, 995, 3000, 8000, 8080, 8443`.

No existe campo para puertos personalizados.

## Evidencia y límites

- Puerto abierto: indica que hubo conexión TCP; no demuestra vulnerabilidad.
- Versión visible: proviene de información publicada por el sitio y puede ser incompleta o falsa.
- Aviso OSV: indica una coincidencia asociada al paquete y versión declarados; requiere confirmar que ese componente esté realmente instalado y afectado.
- Puerto sin respuesta: puede estar cerrado, filtrado o temporalmente inaccesible.

## Controles

- Autorización expresa obligatoria.
- Tres auditorías por minuto y hasta veinte por día y cliente, valores configurables.
- Tiempo total acotado.
- Respuesta HTML limitada.
- Sin redirecciones automáticas.
- Sin UDP.
- Sin fuerza bruta.
- Sin autenticación contra el objetivo.
- Sin explotación.
- Sin ejecución de código remoto.
- Sin escaneo continuo.
- Sin IP directas ni redes internas.

## Archivos

- `backend/lib/websiteAudit.js`
- `backend/test/websiteAudit.test.js`
- `frontend/src/components/WebsiteAuditPanel.jsx`
- `frontend/src/services/websiteAuditService.js`
- `frontend/src/services/websiteAuditService.test.js`
