# Despliegue de MULTIA 4.0 en OpenShift Developer Sandbox

## 1. Suba esta versión a GitHub

El `openshift.yaml` usa:

```text
https://github.com/hectorandresladino/MULTIA.git
rama master
```

Reemplace el contenido anterior del repositorio por esta versión.

## 2. Despliegue

```bash
oc project NOMBRE_DE_SU_PROYECTO
oc apply -f openshift.yaml
oc start-build multia-build --follow
```

## 3. Compruebe el Pod y la Route

```bash
oc get pods
oc logs deployment/multia-app
oc get route multia-route -o jsonpath='https://{.spec.host}{"\n"}'
```

## 4. Cree el primer administrador

La forma más sencilla es consultar el token de instalación:

```bash
oc logs deployment/multia-app | grep "Token de instalación"
```

Abra la Route, copie el token y cree el administrador con una contraseña de mínimo 12 caracteres que incluya mayúscula, minúscula y número.

### Configuración anticipada mediante Secret opcional

```bash
oc create secret generic multia-auth-secrets \
  --from-literal=MULTIA_ADMIN_USERNAME=administrador \
  --from-literal=MULTIA_ADMIN_DISPLAY_NAME='Administrador MULTIA' \
  --from-literal=MULTIA_ADMIN_PASSWORD='CAMBIE_ESTA_CONTRASENA_SEGURA'
```

No publique ese comando con la contraseña real en GitHub. Si el Secret existe antes del primer arranque, el administrador se crea automáticamente.

## 5. Administre usuarios

Inicie sesión como administrador y pulse el engranaje de la barra lateral. Allí puede:

- crear usuarios;
- asignar rol de usuario, analista o administrador;
- suspender y reactivar cuentas;
- consultar métricas de conversaciones, mensajes y ejecuciones de IA.

MULTIA impide que el administrador se retire su propio permiso o deje el sistema sin un administrador activo.

## 6. Persistencia

El PVC `multia-data-pvc` conserva:

- usuarios y sesiones;
- conversaciones y mensajes;
- retroalimentación;
- métricas de ejecuciones;
- eventos de auditoría;
- proyectos temporales del constructor.

Compruebe el PVC:

```bash
oc get pvc multia-data-pvc
```

No elimine el PVC si desea conservar la memoria de MULTIA.

## 7. IA sin API key

La modalidad predeterminada se ejecuta en Chrome o Edge mediante WebGPU:

- tareas sencillas: Llama 3.2 1B;
- tareas complejas, jurídicas, de investigación, código o seguridad: Llama 3.2 3B.

La primera carga descarga el modelo en el navegador. Las API keys externas siguen siendo opcionales y deben configurarse únicamente en el Secret `multia-api-keys`.

## 8. Limitación de la versión Sandbox

Esta versión usa SQLite sobre un PVC `ReadWriteOnce`, por lo que mantiene una sola réplica y estrategia `Recreate`. Para alta disponibilidad se requiere migrar a PostgreSQL y almacenamiento compartido.
