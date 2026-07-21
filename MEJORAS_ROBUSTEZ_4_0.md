# Mejoras de robustez incorporadas en MULTIA 4.0

## Identidad y acceso

- Autenticación obligatoria.
- Contraseñas derivadas con PBKDF2-SHA512 y sal individual.
- Cookies HttpOnly y protección CSRF.
- Sesiones con vencimiento.
- Tres roles operativos.
- Administración de usuarios con protección del último administrador.

## Memoria y trazabilidad

- Conversaciones persistentes por usuario.
- Mensajes con metadatos del modelo.
- Retroalimentación humana.
- Registro de ejecuciones y eventos de auditoría.
- Caché local aislada por nombre de usuario.

## Selección de modelo

El modo WebLLM elige automáticamente:

- 1B para conversación y explicaciones sencillas;
- 3B para derecho, investigación, seguridad, programación, arquitectura, proyectos completos o entradas extensas.

La selección no cambia el proveedor escogido por el usuario cuando se utiliza un servicio externo.

## OpenShift

- PVC de 1 GiB.
- Datos en `/var/lib/multia`.
- Una réplica y estrategia `Recreate` compatibles con SQLite/RWO.
- Usuario no privilegiado y sistema de archivos raíz de solo lectura.
- Probes de inicio, disponibilidad y salud.

## Próxima evolución recomendada

Para una instalación empresarial:

1. PostgreSQL administrado.
2. Almacenamiento de objetos para proyectos y documentos.
3. Redis o una cola para tareas largas.
4. Varias réplicas.
5. Inicio de sesión institucional OIDC.
6. Buscador con fuentes y citas verificables.
7. Evaluaciones automáticas de calidad y alucinaciones.
