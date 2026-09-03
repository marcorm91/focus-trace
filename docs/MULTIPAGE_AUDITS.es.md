# Auditorías multipágina

FocusTrace agrupa análisis manuales de página completa en una auditoría ligera para revisar varias páginas seleccionadas y exportarlas en un único PDF sin repetir la cabecera del informe en cada página.

- El primer análisis de página crea la auditoría activa.
- Las páginas del mismo sitio se añaden automáticamente.
- Si cambia el sitio, FocusTrace pregunta si se añade a la auditoría actual, se inicia una nueva o se cancela.
- Volver a analizar la misma URL normalizada sustituye su resultado anterior y actualiza la hora de **Revisión realizada**.
- El PDF contiene una única portada y una sección por página, sin duplicar ejecuciones anteriores de la misma URL.
- Los análisis de componentes no crean páginas dentro de la auditoría.
- Las auditorías se guardan localmente y de forma acotada en `browser.storage.local`.
