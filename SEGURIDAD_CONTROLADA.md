# Seguridad controlada

El equipo de seguridad participa en todas las consultas y revisa únicamente información, código, archivos y espacios autorizados. No ejecuta acciones destructivas ni contra terceros. Todo riesgo crítico o alto en un proyecto generado debe corregirse o bloquear la descarga.

## Centro de operaciones

- Los archivos importados se interpretan como evidencia y no se ejecutan.
- No existe terminal remota ni ejecución de herramientas del sistema.
- No hay explotación, fuerza bruta, evasión, persistencia, malware ni recuperación de credenciales.
- Los registros se limitan en tamaño y las muestras mostradas redactan secretos e identificadores extensos.
- La consulta OSV se limita a versiones declaradas en un manifiesto y debe verificarse con el inventario real.

## Ubicación y trayectos

- La ubicación solo se obtiene con permiso expreso del navegador del dispositivo actual.
- No se admite localización por número, IMEI, cuenta, dirección IP o identificadores de terceros.
- Los trayectos propios se procesan localmente y el consejo recibe únicamente un resumen sin coordenadas exactas.
- El inventario de activos se guarda en `localStorage` y no debe contener credenciales ni identificadores completos.

El equipo jurídico y el equipo de investigación no inventan normas, sentencias, citas ni fuentes. Cuando falta evidencia, el resultado debe indicar **pendiente de verificación**.
