<p align="right"><a href="./README.md">English</a> · <strong>Español</strong></p>

# FocusTrace

**Depura el foco de accesibilidad como depuras JavaScript.**

FocusTrace es una extensión de navegador local-first con su propio motor de reglas WCAG 2.2 y un depurador runtime para foco de teclado, navegación SPA y comportamiento dinámico de la interfaz.

El proyecto se encuentra en desarrollo activo. Los resultados automáticos se separan de forma intencionada entre fallos deterministas, señales que requieren revisión contextual y avisos de autoría, para que la extensión no afirme una certeza que no puede sostener.

FocusTrace es software libre con licencia **GNU GPL v3.0 únicamente**. La licencia del código fuente y la identidad del proyecto FocusTrace se tratan por separado; consulta [Licencia e identidad del proyecto](#licencia-e-identidad-del-proyecto).

## ¿Qué lo hace diferente?

FocusTrace combina flujos complementarios de análisis estático, depuración runtime e histórico, en lugar de tratar la accesibilidad como un único escaneo.

### Análisis de página completa y de componentes

El motor local de reglas evalúa expectativas observables de WCAG, ARIA y HTML y conserva evidencia diagnóstica como la procedencia del nombre accesible y las relaciones de contraste medidas. Un análisis puede cubrir toda la página o limitarse al subárbol de un componente seleccionado, manteniendo el contexto global del documento cuando una regla lo necesita, por ejemplo para comprobar la unicidad de IDs duplicados.

Las reglas se relacionan con:

- criterios de conformidad WCAG 2.2;
- reglas W3C ACT cuando existe una regla de prueba aplicable;
- semántica y registros de WAI-ARIA;
- comportamiento de nombres de AccName / HTML-AAM;
- requisitos de autoría HTML cuando resultan útiles como avisos no-WCAG;
- WAI-ARIA APG para patrones de widgets runtime.

FocusTrace utiliza su propio motor local de reglas y no necesita un scanner de accesibilidad de terceros.

### Runtime Trace

Trace registra qué hizo el usuario, qué elemento tenía el foco, qué cambió en la página y dónde se movió el foco después. La evidencia grabada puede revisarse como recorrido, interacciones correlacionadas, grafo de foco o replay de solo lectura.

El depurador runtime puede generar explicaciones causales deterministas para patrones como la eliminación de un nodo con foco, la apertura de un modal sin recibir foco o una navegación SPA que deja el foco atrás. Estas explicaciones describen evidencia registrada; no convierten un comportamiento contextual en una afirmación automática de conformidad WCAG.

### FocusTrace Memory

FocusTrace Memory es un historial local y opcional para análisis repetidos de páginas y componentes. Está **desactivado por defecto**. Cuando el usuario activa **Recordar historial de accesibilidad**, FocusTrace guarda fingerprints hash compactos, contadores y marcas de tiempo para que los análisis posteriores puedan identificar fallos persistentes, cambios, problemas que ya no se reproducen y regresiones.

Memory no guarda HTML de la página, snapshots completos del DOM ni capturas. El historial está limitado a 8 observaciones por ámbito de página/componente y 200 en total; las observaciones de más de 90 días se eliminan cuando FocusTrace vuelve a leer el almacenamiento de Memory. El historial guardado puede borrarse desde Ajustes incluso cuando Memory está desactivado.

Memory es historial diagnóstico y no una prueba de conformidad WCAG. Consulta [`PRIVACY.md`](PRIVACY.md) para conocer el modelo de almacenamiento y activación voluntaria.

### Análisis de sitio

Site Audit descubre páginas del mismo origen a partir de sitemaps, robots.txt, enlaces internos y URLs añadidas manualmente de forma opcional, agrupa familias de rutas repetidas y ejecuta el scanner real de FocusTrace sobre muestras representativas en lugar de analizar a ciegas cada URL duplicada.

Los límites de seguridad actuales de Site Audit son 500 URLs descubiertas, 30 páginas analizadas y 3 muestras representativas por familia de rutas. Los hallazgos de plantilla se presentan como compartidos únicamente cuando la misma señal normalizada aparece en todas las muestras analizadas correctamente de esa familia. El muestreo representativo no demuestra que todas las URLs sean idénticas y Trace runtime no se ejecuta automáticamente sobre todo el sitio.

## Motor de reglas actual

La cobertura estática actual incluye:

- título de página;
- nombre accesible de imágenes / tratamiento decorativo;
- nombres accesibles de botones, campos de formulario y enlaces;
- etiqueta visible incluida en el nombre accesible;
- contenido con `aria-hidden="true"` que permanece en la navegación secuencial de foco;
- presencia del idioma de página y subtag primario reconocido;
- contraste de texto WCAG 1.4.3 con evidencia estructurada de ratio y color;
- cobertura conservadora de contraste no textual WCAG 1.4.11 para señales visuales deterministas;
- `tabindex` positivo, campos identificados solo por placeholder y saltos de nivel de encabezados como señales para revisar;
- señales de autoría ARIA obsoleta o prohibida como avisos;
- IDs HTML no vacíos duplicados como aviso de autoría, sin revivir incorrectamente el eliminado SC 4.1.1 de WCAG 2.2.

Para fallos deterministas de contraste, FocusTrace puede mostrar valores HEX/RGB, copiar los colores registrados y sugerir un pequeño ajuste sRGB que alcance el ratio requerido. Las composiciones visuales complejas permanecen como REVIEW en lugar de fabricarse como un falso fallo.

La grabación runtime observa actualmente:

- interacciones de teclado y puntero;
- movimiento de foco, navegación hacia atrás, bucles y saltos inesperados;
- nodos con foco eliminados u ocultados;
- cambios de ruta SPA;
- foco inicial, escape de foco y restauración de foco en diálogos modales;
- mutaciones DOM relevantes y evidencia del ciclo de vida de diálogos;
- breakpoints de accesibilidad para determinadas causas runtime deterministas.

Trace también incluye un replay de solo lectura de la evidencia registrada y un informe orientado a Trace que combina hallazgos estáticos con historias de interacción runtime y recomendaciones.

Consulta [`docs/RULES.md`](docs/RULES.md) para metodología, fuentes y limitaciones y [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) para los principales límites de arquitectura y datos.

## Compatibilidad con navegadores

FocusTrace utiliza Manifest V3.

Objetivos de release soportados actualmente:

- Google Chrome 114+
- Microsoft Edge basado en Chromium

Objetivo experimental de pre-release:

- Firefox 115+

El build de Firefox se genera y valida en CI, pero sigue siendo experimental hasta completar el checklist manual de smoke testing sobre el paquete. WXT genera la misma interfaz del sidepanel como sidebar de Firefox.

## Permisos de la extensión

FocusTrace mantiene intencionadamente un conjunto reducido de permisos en producción:

| Permiso | Navegador | Para qué se necesita |
| --- | --- | --- |
| `activeTab` | Chrome / Edge / Firefox | Analizar la página sobre la que el usuario activa FocusTrace de forma explícita. |
| `scripting` | Chrome / Edge / Firefox | Inyectar la instrumentación local de análisis/runtime en la página activa. |
| `storage` | Chrome / Edge / Firefox | Guardar preferencias de la extensión y estado local. |
| `sidePanel` | Chrome / Edge | Mostrar la interfaz de depuración de FocusTrace en el panel lateral de Chromium. |

Firefox utiliza su integración nativa de sidebar en el manifest en lugar de solicitar el permiso exclusivo de Chromium `sidePanel`.

Los builds de producción no necesitan permisos globales de host. El acceso a páginas HTTP/HTTPS se declara como opcional y solo se solicita desde acciones explícitas del usuario. Los informes imprimibles pueden incluir evidencia visual opcional; cuando se utiliza esta opción, FocusTrace solicita desde el clic de Exportar PDF la capacidad `<all_urls>` necesaria para capturas, ya que `tabs.captureVisibleTab()` requiere `activeTab` o `<all_urls>`. Ese permiso amplio se elimina al finalizar la exportación. Solo el build de pruebas end-to-end incluye permiso de host para localhost.

## Privacidad

Todo el análisis se ejecuta localmente en el navegador. FocusTrace no envía contenido de la página, datos del DOM, capturas ni interacciones grabadas a un servidor de FocusTrace ni a una API de IA de terceros.

La evidencia visual de los informes imprimibles es opcional. Los recortes de captura pueden contener contenido visible de la página, se preparan localmente únicamente para ese informe y FocusTrace no los transmite.

FocusTrace Memory es opt-in, está desactivado por defecto y guarda únicamente un historial local compacto y limitado. Puede desactivarse o borrarse desde Ajustes.

Consulta [`PRIVACY.md`](PRIVACY.md) para la política de privacidad canónica del proyecto y [`SECURITY.md`](SECURITY.md) para el proceso responsable de notificación de vulnerabilidades.

## Licencia e identidad del proyecto

El código fuente de FocusTrace se distribuye bajo **GNU General Public License versión 3 únicamente (`GPL-3.0-only`)**. Consulta [`LICENSE`](LICENSE).

La GPL permite ejecutar, estudiar, modificar y redistribuir el código cubierto bajo sus términos. Cuando se distribuye una versión modificada cubierta por la licencia, continúan aplicándose las obligaciones de código fuente y licencia de la GPL.

El nombre, el logo y la identidad del proyecto FocusTrace no se conceden mediante la licencia del código para usos que puedan hacer pasar un fork no oficial por la versión oficial de FocusTrace. Los forks son bienvenidos, pero las distribuciones con modificaciones sustanciales deberían utilizar un nombre principal y una identidad visual diferenciados. Consulta [`TRADEMARKS.md`](TRADEMARKS.md).

Las contribuciones son bienvenidas bajo la misma licencia del proyecto. Consulta [`CONTRIBUTING.md`](CONTRIBUTING.md).

FocusTrace pretende seguir siendo gratuito. Si en el futuro se introduce patrocinio voluntario, debería servir para apoyar el desarrollo continuado y no para convertir silenciosamente la herramienta de accesibilidad en un producto de pago.

## Probar el último build de desarrollo

Después de que el workflow de CI termine correctamente para un push a `main`, GitHub Actions publica artefactos de desarrollo de ese commit exacto:

- `focustrace-chrome-dev`
- `focustrace-firefox-dev`

### Chrome

1. Abre la pestaña **Actions** del repositorio y selecciona **Dev Extension**.
2. Abre la última ejecución correcta y descarga `focustrace-chrome-dev`.
3. Descomprímelo en una carpeta local.
4. Abre `chrome://extensions` y activa **Modo desarrollador**.
5. Pulsa **Cargar descomprimida** y selecciona la carpeta que contiene `manifest.json`.

Para actualizar una instalación de desarrollo existente, descarga el artefacto más reciente, sustituye el contenido de la carpeta local y pulsa **Recargar** en la tarjeta de FocusTrace de `chrome://extensions`.

### Build experimental de Firefox

1. Descarga y descomprime `focustrace-firefox-dev` desde la última ejecución correcta de **Dev Extension**.
2. Abre `about:debugging#/runtime/this-firefox`.
3. Selecciona **Cargar complemento temporal…**.
4. Selecciona el `manifest.json` del build.
5. Abre FocusTrace desde la acción de la barra de herramientas y completa el smoke checklist de Firefox antes de considerar ese build como soportado.

Cada artefacto incluye `FOCUSTRACE_BUILD.txt` con el SHA del commit de origen y el navegador de destino. Los artefactos de desarrollo son builds de preview sin firmar y se conservan durante 14 días.

## Desarrollo

Requisitos:

- Node.js 22
- npm

Instala dependencias y arranca el build de desarrollo Chromium por defecto:

```bash
npm install
npm run dev
```

Build de desarrollo Firefox MV3:

```bash
npm run dev:firefox
```

Builds de producción:

```bash
npm run build
npm run build:edge
npm run build:firefox
```

Empaquetar artefactos de navegador:

```bash
npm run zip
npm run zip:edge
npm run zip:firefox
```

Ejecutar la suite principal de validación:

```bash
npm run check
npm test
npm run standards:validate
```

Ejecutar el gate de release, incluidos los builds MV3 de producción de Chrome, Edge y Firefox:

```bash
npm run release:check
```

Ejecutar el gate completo incluyendo las pruebas E2E de navegador Chromium:

```bash
npm run release:check:full
```

Consulta [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) antes de crear una release o cambiar la visibilidad del repositorio.
