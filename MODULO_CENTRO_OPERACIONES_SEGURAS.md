# Módulo: Centro de operaciones seguras

## Objetivo

Permitir que un usuario autorizado interprete evidencia de ciberseguridad y administre activos propios sin convertir MULTIA en una plataforma de ataque o vigilancia.

## Evidencias admitidas

- XML de inventario de puertos producido previamente en un entorno autorizado.
- `package-lock.json`.
- `requirements.txt` con versiones declaradas.
- SBOM CycloneDX JSON.
- Exportación JSON de cabeceras HTTP.
- Muestras de registros de hasta 1,5 MB.

## Procesamiento

1. El usuario confirma propiedad o autorización.
2. El navegador lee el archivo como texto.
3. El backend valida tamaño y tipo.
4. El contenido se interpreta sin ejecutar comandos.
5. Si existe inventario de paquetes compatible, se consulta OSV de forma limitada.
6. El informe resume aspectos positivos, riesgos, mejoras y limitaciones.
7. El consejo de 185 agentes recibe el resumen para priorizar remediaciones.

## Ubicación propia

La pestaña **Mi dispositivo** utiliza `navigator.geolocation` y requiere consentimiento explícito. Solo devuelve ciudad, región y país aproximados. No admite números telefónicos, IMEI, cuentas o dispositivos remotos.

## Trayectos propios

Los archivos GPX, GeoJSON y CSV se procesan en el navegador. Se calcula distancia y duración, y solo se geocodifican aproximadamente el inicio y el final. Las coordenadas y los puntos individuales no se incluyen en el mensaje enviado a los agentes.

## Activos propios

El inventario se guarda localmente en el navegador. Se recomienda registrar únicamente el nombre, tipo, últimos caracteres de un serial y notas no sensibles.
