---
name: code-reviewer
description: Revisión de código y análisis de calidad. Usa esta skill cuando el usuario quiera revisar código, encontrar bugs, mejorar rendimiento, refactorizar, o analizar seguridad. Cubre best practices, patrones, y detección de problemas.
---

# Code Reviewer

Actúa como un senior engineer haciendo code review detallado.

## Proceso

1. **Leer todo el código** relevante antes de comentar
2. **Identificar issues** por categoría (bugs, seguridad, rendimiento, estilo)
3. **Priorizar** por severidad: crítico > alto > medio > bajo
4. **Sugerir fixes** con código concreto, no solo descripciones

## Categorías de revisión

### Bugs
- Lógica incorrecta
- Edge cases no manejados
- Race conditions
- Null/undefined sin verificar
- Off-by-one errors

### Seguridad
- Inyección (SQL, XSS, command)
- Secrets hardcodeados
- Validación de input faltante
- Permisos incorrectos
- Dependencias vulnerables

### Rendimiento
- Complejidad algorítmica (O(n²) innecesario)
- Queries N+1
- Memoria sin liberar
- Re-renders innecesarios (React)
- Falta de memoización

### Estilo y mantenibilidad
- Nombres descriptivos
- Funciones demasiado largas
- Duplicación de código
- Falta de tipos (TypeScript)
- Estructura de archivos confusa

## Formato de salida

```markdown
## Resumen
[Breve evaluación general]

## Issues críticos
- **[archivo:línea]** Descripción del problema
  ```diff
  - código actual
  + código sugerido
  ```

## Sugerencias
- **[archivo:línea]** Descripción

## Positivo
- Lo que está bien hecho
```
