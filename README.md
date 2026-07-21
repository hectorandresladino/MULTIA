# MULTIA 4.0 — plataforma multiagente robusta para OpenShift

MULTIA 4.0 conserva los **185 agentes profesionales**, los **10 equipos coordinados**, el constructor full stack y los módulos preventivos de seguridad. Esta versión añade protección de acceso, memoria persistente, administración de usuarios, retroalimentación humana, trazabilidad de modelos y selección automática de capacidad.

## Mejoras principales de la versión 4.0

- Inicio de sesión obligatorio mediante cookie `HttpOnly`, `SameSite=Lax` y protección CSRF.
- Roles: **administrador**, **analista** y **usuario**.
- Panel administrativo para crear cuentas, cambiar roles, suspender accesos y consultar métricas.
- Protección que impide desactivar o degradar al último administrador.
- Conversaciones y mensajes persistentes en SQLite sobre un PVC de OpenShift.
- Caché del navegador separada por usuario.
- Retroalimentación humana positiva o negativa sobre respuestas de la IA.
- Registro de proveedor, modelo, modo, duración y volumen de cada ejecución.
- Selección automática de Llama 3.2 1B para consultas sencillas y 3B para tareas complejas en el modo WebLLM.
- Auditoría de eventos administrativos y operaciones sensibles.
- Espacios de trabajo y ZIP persistidos en el PVC durante su vigencia.

## Capacidades conservadas

- IA Web sin API key mediante WebLLM.
- Consejo de 185 agentes agrupados en 10 equipos.
- Análisis con aspectos positivos, negativos, riesgos, mejoras y visión futura.
- Apoyo jurídico con separación entre hechos, inferencias y datos pendientes de verificación.
- Constructor full stack con archivos reales, validación, revisión preventiva y ZIP temporal.
- Análisis local de fotografías mediante EXIF/GPS, OCR y contexto visual, sin reconocimiento facial.
- Auditoría preventiva de sitios web propios o autorizados.
- Centro de operaciones seguras para interpretar evidencias y dependencias sin ejecutar comandos.
- Ubicación voluntaria del dispositivo actual y análisis local de trayectos propios.

## Primer acceso

Después del despliegue, MULTIA crea un token de instalación de un solo uso cuando no existe ningún usuario:

```bash
oc logs deployment/multia-app | grep "Token de instalación"
```

Abra la Route, ingrese el token y cree el primer administrador. También puede crear previamente el Secret opcional `multia-auth-secrets` con las variables `MULTIA_ADMIN_USERNAME`, `MULTIA_ADMIN_PASSWORD` y `MULTIA_ADMIN_DISPLAY_NAME`.

## Despliegue en OpenShift Sandbox

```bash
oc apply -f openshift.yaml
oc start-build multia-build --follow
oc get pods
oc get route multia-route
```

La aplicación escucha en `PORT=3000`, utiliza un usuario no privilegiado, raíz de solo lectura, PVC de 1 GiB y una sola réplica.

## Arquitectura de persistencia

La versión Sandbox utiliza SQLite en `/var/lib/multia/multia.db` y un PVC `ReadWriteOnce`. Es adecuada para una instancia personal o demostrativa con una sola réplica. Para producción empresarial con varias réplicas se debe migrar la capa de persistencia a PostgreSQL y utilizar almacenamiento de objetos para los proyectos y ZIP.

## Paralelismo

Los diez equipos se inician mediante `Promise.all`. Con proveedores remotos pueden ejecutarse de forma concurrente. En IA Web sin clave existe una única instancia del modelo en el navegador, por lo que las inferencias se procesan en cola para evitar bloqueos, aunque los 185 perfiles permanecen representados en la deliberación.

## Límites responsables

MULTIA no ejecuta explotación, fuerza bruta, malware, rastreo de terceros ni comandos arbitrarios. Las funciones de auditoría exigen autorización y producen recomendaciones preventivas. Una respuesta de IA no sustituye la revisión humana en decisiones jurídicas, financieras, médicas o de seguridad.
