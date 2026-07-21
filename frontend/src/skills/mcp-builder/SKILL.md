---
name: mcp-builder
description: Guía para construir servidores MCP (Model Context Protocol). Usa esta skill cuando el usuario quiera crear un servidor MCP, integrar herramientas con asistentes de IA o construir integraciones con APIs externas.
---

# MCP Server Development Guide

## Visión general

Model Context Protocol (MCP) permite conectar herramientas y datos externos a asistentes de IA.

## Workflow de alto nivel

### Fase 1: Investigación y Planificación
- Entender qué herramientas necesita el usuario
- Identificar las APIs o fuentes de datos a integrar
- Diseñar el esquema de herramientas (input/output)
- Revisar documentación de MCP

### Fase 2: Implementación
- Configurar el proyecto (Python o TypeScript)
- Implementar cada herramienta con su schema
- Manejar errores y edge cases
- Usar el SDK oficial de MCP

### Fase 3: Revisión y Test
- Testear cada herramienta individualmente
- Verificar manejo de errores
- Probar con el MCP Inspector

### Fase 4: Evaluaciones
- Crear casos de prueba para cada herramienta
- Verificar que las respuestas son correctas
- Documentar el uso

## Estructura de un servidor MCP

```python
from mcp.server import Server
from mcp.types import Tool, TextContent

server = Server("my-server")

@server.list_tools()
async def list_tools():
    return [Tool(
        name="my_tool",
        description="Descripción de la herramienta",
        inputSchema={
            "type": "object",
            "properties": {
                "param": {"type": "string", "description": "Parámetro"}
            }
        }
    )]

@server.call_tool()
async def call_tool(name, arguments):
    if name == "my_tool":
        # Lógica de la herramienta
        return [TextContent(type="text", text="Resultado")]
```

## Mejores prácticas

- Descripciones de herramientas claras y específicas
- Schemas de input validados
- Manejo robusto de errores
- Timeouts apropiados
- Logging para debugging
