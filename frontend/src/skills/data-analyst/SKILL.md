---
name: data-analyst
description: Análisis de datos y visualización. Usa esta skill cuando el usuario quiera analizar datos, crear gráficos, estadísticas, limpieza de datos, o trabajar con datasets. Incluye Python, pandas, matplotlib, y SQL.
---

# Data Analyst

Guía para análisis de datos profesional.

## Proceso

1. **Entender los datos**: cargar, inspeccionar schema, tipos, tamaño
2. **Limpieza**: nulos, duplicados, outliers, tipos incorrectos
3. **Análisis exploratorio**: estadísticas descriptivas, distribuciones
4. **Visualización**: gráficos apropiados al tipo de dato
5. **Insights**: conclusiones accionables

## Python + Pandas

```python
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Cargar
df = pd.read_csv('data.csv')

# Inspeccionar
df.info()
df.describe()
df.isnull().sum()

# Limpiar
df = df.drop_duplicates()
df['columna'] = df['columna'].fillna(df['columna'].median())

# Analizar
correlation = df.corr()
grouped = df.groupby('categoria')['valor'].agg(['mean', 'sum', 'count'])
```

## Gráficos por tipo de dato

| Tipo de dato | Gráfico recomendado |
|---|---|
| Distribución | Histograma, KDE |
| Comparación | Bar chart, Box plot |
| Relación | Scatter, Heatmap |
| Composición | Pie, Stacked bar |
| Serie temporal | Line chart |
| Geográfico | Choropleth |

## SQL

```sql
-- Agregaciones comunes
SELECT categoria, COUNT(*) as total, AVG(valor) as promedio
FROM tabla
GROUP BY categoria
HAVING COUNT(*) > 10
ORDER BY promedio DESC;

-- Window functions
SELECT *,
  ROW_NUMBER() OVER (PARTITION BY categoria ORDER BY valor DESC) as rank
FROM tabla;
```

## Mejores prácticas

- Siempre verificar nulos antes de operar
- Usar `dtype` correcto (category para strings repetidos)
- Documentar supuestos del análisis
- Validar resultados con sanity checks
