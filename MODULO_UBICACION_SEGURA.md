# Módulo de análisis seguro de lugar por fotografía

## Objetivo

Permitir que una persona suba una fotografía y obtenga una evaluación del **lugar o contexto geográfico** sin intentar identificar a quienes aparecen en ella.

## Flujo

1. La fotografía se selecciona en el navegador.
2. `exifr` lee metadatos EXIF y GPS de forma local.
3. `Tesseract.js` extrae texto visible mediante OCR en español e inglés.
4. Un modelo visual local genera una descripción general de la escena cuando el navegador lo permite.
5. Si existen coordenadas GPS, el backend consulta Nominatim y devuelve únicamente ciudad, región y país.
6. El informe se entrega a los 185 agentes mediante los diez equipos coordinados.
7. El consejo compara hipótesis, evidencia favorable, evidencia contraria, limitaciones, mejoras y nivel de confianza.

## Límites obligatorios

- No reconoce rostros.
- No compara una cara con perfiles de Internet.
- No determina quién aparece en la imagen.
- No deduce nacionalidad, etnia, religión, salud, orientación o ideología a partir de la apariencia.
- No entrega domicilios, números de documento, teléfonos ni coordenadas exactas.
- No combina un nombre con una fotografía para localizar a una persona privada.
- El nombre opcional se trata como una investigación pública independiente y nunca como prueba de identidad.

## Privacidad

La fotografía no se sube al backend. El OCR y la descripción visual se ejecutan en el navegador. Cuando la imagen contiene GPS, solo las coordenadas se envían al endpoint interno de MULTIA para obtener una ubicación aproximada; el endpoint no devuelve calle ni número de inmueble.

## Componentes abiertos estudiados

- `exifr`: lectura de metadatos EXIF y GPS en JavaScript.
- `Tesseract.js`: OCR en navegador mediante WebAssembly.
- `Transformers.js`: ejecución de modelos visuales en el navegador.
- `geopy` y Nominatim: referencia para geocodificación y geocodificación inversa.
- `Geo-picture Tag Reader` de Panoramax en GitLab: referencia para metadatos normalizados de fotografías geolocalizadas.

## Primera ejecución

El OCR y el modelo visual descargan recursos web en el primer uso y los almacenan en la caché del navegador. Si el modelo visual no puede cargarse, MULTIA continúa con EXIF, GPS y OCR.

## Resultado esperado

El consejo debe devolver:

1. País y región más probables.
2. Ciudad solo cuando exista evidencia suficiente.
3. Evidencias a favor y en contra.
4. Aspectos positivos de la información disponible.
5. Limitaciones y riesgos de error.
6. Nivel de confianza.
7. Mejoras legales y respetuosas para verificar el lugar.
8. Decisión final separando hechos, inferencias y datos pendientes.
