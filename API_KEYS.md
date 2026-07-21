# Claves de IA: solo para proveedores opcionales

MULTIA funciona por defecto con **IA Web sin clave**. Esa modalidad permite conversar, coordinar el consejo multiagente y generar proyectos full stack descargables sin configurar una API key.

OpenAI, Gemini, Groq y Anthropic son opciones adicionales. En OpenShift, sus claves deben guardarse únicamente en el Secret `multia-api-keys`.

Ejemplo:

```bash
oc create secret generic multia-api-keys \
  --from-literal=GEMINI_API_KEY='SU_CLAVE' \
  --dry-run=client -o yaml | oc apply -f -
oc rollout restart deployment/multia-app
```

No coloque claves en:

- archivos `.env` subidos a GitHub;
- variables que comiencen por `VITE_`;
- componentes React;
- capturas de pantalla;
- mensajes de chat.

Sin el Secret, el Pod inicia normalmente y utiliza WebLLM en el navegador.
