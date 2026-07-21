---
name: webapp-testing
description: Testing de aplicaciones web con Playwright. Usa esta skill cuando el usuario quiera testear, verificar, o depurar una aplicación web. Soporta verificación de funcionalidad frontend, debugging de UI, capturas de pantalla y logs del navegador.
---

# Web Application Testing

Para testear aplicaciones web locales, escribe scripts nativos de Python con Playwright.

## Árbol de decisión

```
Tarea del usuario → ¿Es HTML estático?
    ├─ Sí → Leer HTML directamente para identificar selectores
    │        ├─ Éxito → Escribir script Playwright con selectores
    │        └─ Falla → Tratar como dinámica
    │
    └─ No (webapp dinámica) → ¿El servidor está corriendo?
        ├─ No → Iniciar servidor + escribir script Playwright
        └─ Sí → Reconocimiento-then-acción:
            1. Navegar y esperar networkidle
            2. Tomar screenshot o inspeccionar DOM
            3. Identificar selectores del estado renderizado
            4. Ejecutar acciones con selectores descubiertos
```

## Patrón Reconocimiento-Then-Acción

1. **Inspeccionar DOM renderizado**:
   ```python
   page.screenshot(path='/tmp/inspect.png', full_page=True)
   content = page.content()
   page.locator('button').all()
   ```

2. **Identificar selectores** de la inspección
3. **Ejecutar acciones** con los selectores descubiertos

## Mejores prácticas

- Usar `sync_playwright()` para scripts síncronos
- Siempre cerrar el browser al terminar
- Selectores descriptivos: `text=`, `role=`, CSS, o IDs
- Waits apropiados: `page.wait_for_selector()` o `page.wait_for_timeout()`
- **Siempre** esperar `page.wait_for_load_state('networkidle')` antes de inspeccionar
