---
name: doc-creator
description: Creación de documentos en múltiples formatos. Usa esta skill cuando el usuario quiera crear o editar documentos Word (.docx), PDF, PowerPoint (.pptx), o Excel (.xlsx). Incluye estructura, formato, y generación de contenido.
---

# Document Creator

Guía para crear documentos profesionales en múltiples formatos.

## Word (.docx)

```python
from docx import Document
from docx.shared import Pt, Inches

doc = Document()
doc.add_heading('Título', level=1)
doc.add_paragraph('Contenido del documento')
doc.save('documento.docx')
```

### Estructura recomendada
- Portada con título y fecha
- Índice para documentos > 5 páginas
- Encabezados jerárquicos (H1, H2, H3)
- Pie de página con número de página

## PDF

```python
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

c = canvas.Canvas("documento.pdf", pagesize=A4)
c.drawString(100, 750, "Contenido")
c.save()
```

### Consideraciones
- Usar fuentes embebidas para caracteres especiales
- Márgenes consistentes (2.5cm estándar)
- Tablas con bordes limpios
- Imágenes con resolución adecuada (300dpi)

## PowerPoint (.pptx)

```python
from pptx import Presentation
from pptx.util import Inches, Pt

prs = Presentation()
slide = prs.slides.add_slide(prs.slide_layouts[1])
slide.shapes.title.text = "Título"
slide.placeholders[1].text = "Contenido"
prs.save('presentacion.pptx')
```

### Reglas de diseño de slides
- Máximo 6 bullets por slide
- Una idea principal por slide
- Contraste alto texto/fondo
- Imágenes relevantes, no decorativas

## Excel (.xlsx)

```python
from openpyxl import Workbook

wb = Workbook()
ws = wb.active
ws['A1'] = 'Encabezado'
ws.append(['dato1', 'dato2'])
wb.save('datos.xlsx')
```

### Buenas prácticas
- Headers con formato bold y fondo coloreado
- Anchos de columna autoajustados
- Filtros en tablas grandes
- Fórmulas en lugar de valores calculados cuando sea posible
