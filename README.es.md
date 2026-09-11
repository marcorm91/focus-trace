<p align="right"><a href="./README.md">English</a> · <strong>Español</strong></p>

# FocusTrace

**Depura el foco de accesibilidad como depuras JavaScript.**

FocusTrace es una extensión de navegador local-first con su propio motor de reglas WCAG 2.2 y un depurador runtime para foco de teclado, navegación SPA y comportamiento dinámico de la interfaz.

El proyecto se encuentra en desarrollo activo. Los resultados automáticos se separan de forma intencionada entre fallos deterministas, señales que requieren revisión contextual y avisos de autoría, para que la extensión no afirme una certeza que no puede sostener.

FocusTrace es software libre con licencia **GNU GPL v3.0 únicamente**. La licencia del código fuente y la identidad del proyecto FocusTrace se tratan por separado; consulta [Licencia e identidad del proyecto](#licencia-e-identidad-del-proyecto).

## Instalar

FocusTrace está disponible en la página oficial de Chrome Web Store:

- [Instalar FocusTrace desde Chrome Web Store](https://chromewebstore.google.com/detail/focustrace/efmfklamjafbknbmadpfmlbhobnoffnn)

La ficha de la tienda puede mostrar temporalmente una versión anterior mientras una nueva release está en revisión.

## API funcional de capacidades

Esta sección es el inventario funcional canónico de FocusTrace: qué puede analizar, observar, detectar, conservar y exportar la extensión, y qué tipo de evidencia produce cada capacidad.

FocusTrace utiliza WCAG 2.2 como fuente de conformidad. Los criterios WCAG 2.2 también quedan reflejados en los requisitos web de EN 301 549 V4.1.1, pero las reglas implementadas por FocusTrace cubren únicamente subconjuntos observables documentados y **no constituyen una evaluación completa de EN 301 549, una certificación ni una prueba de conformidad**.

### Tipos de resultado

| Resultado | Significado |
| --- | --- |
| **FAIL** | La evidencia medida permite determinar que la expectativa automatizada comprobada no se cumple. |
| **REVIEW** | Existe una señal relevante, pero determinar si constituye un problema de accesibilidad requiere contexto humano. |
| **WARNING** | Existe un riesgo de autoría HTML/ARIA o mantenimiento de estándares que debe corregirse o revisarse, sin convertirlo automáticamente en fallo WCAG. |
| **PASS** | Se cumple la expectativa concreta evaluada por esa regla. No implica conformidad completa con el criterio WCAG relacionado. |

### Capacidades principales

| Capacidad | Entrada / ámbito | Qué hace | Evidencia / salida |
| --- | --- | --- | --- |
| **Analizar página completa** | Documento activo | Ejecuta el motor local de reglas y prepara el snapshot limitado de Estructura de la página actual. | FAIL, REVIEW, WARNING y PASS, además de evidencia de Encabezados, Semántica y Métricas. |
| **Analizar componente** | Subárbol DOM seleccionado visualmente | Ejecuta el mismo motor limitado al componente, conservando contexto global cuando una regla lo necesita. | Hallazgos limitados al ámbito seleccionado. |
| **Inspeccionar hallazgo** | Resultado actual | Localiza y resalta el elemento objetivo cuando sigue presente en la página. | Selector, elemento y resaltado visual. |
| **Nombre accesible** | Controles compatibles | Calcula el nombre accesible y conserva la fuente que ganó en la resolución. | Rol, nombre calculado, fuente y candidatos inspeccionados. |
| **Contraste de texto** | Texto renderizado con colores resolubles | Calcula ratio, umbral, foreground/background, tamaño y peso. | Evidencia estructurada reutilizable en UI e informes. |
| **Contraste no textual** | Límites, estados, gráficos o indicadores observables | Evalúa señales deterministas y mantiene como REVIEW las composiciones ambiguas. | Ratio, tipo de señal y contexto visual. |
| **Tamaño de objetivos de puntero** | Objetivos de puntero renderizados y observables | Mide la geometría del objetivo y la separación de WCAG 2.5.8, conservando las excepciones contextuales como REVIEW. | Tamaño en píxeles CSS, objetivo vecino y justificación de PASS/REVIEW. |
| **Sugerencia de color** | Fallos deterministas de contraste | Propone un ajuste sRGB pequeño que alcance el ratio requerido cuando puede calcularse con seguridad. | HEX/RGB medido, propuesta y copia. |
| **Cómo corregirlo** | Hallazgos con remediación disponible | Muestra estrategias concretas de corrección y una comprobación posterior. | Guía localizada ES/EN. |
| **Estructura** | Análisis actual de página completa | Expone encabezados, revisión semántica y métricas estructurales preparadas con el análisis; Actualizar las recalcula tras cambios de la página. | Árbol H1-H6, sugerencias y recuentos. |
| **Trace** | Interacción real | Registra teclado/puntero, foco, cambios no sensibles de controles, mutaciones relevantes, rutas SPA, diálogos, candidatos a mensajes de estado, widgets ARIA y evidencia de causalidad/cambios de contexto. | Eventos correlacionados por interacción; el seguimiento de cambios de contexto no conserva valores de controles. |
| **Foco virtual** | Widgets con `aria-activedescendant` compatibles | Registra cambios válidos de foco virtual como evidencia informativa sin convertirlos en movimiento de foco DOM ni hallazgo. | Destino virtual disponible en Trace, Journey y Graph. |
| **Focus Walk** | Página activa | Automatiza el recorrido secuencial de foco para generar evidencia de navegación. | Recorrido de destinos alcanzables. |
| **Replay** | Sesión Trace grabada | Reproduce la evidencia como lectura sin reejecutar acciones sobre la página. | Secuencia runtime reconstruida. |
| **Recorrido / Journey** | Sesión Trace | Ordena el movimiento de foco cronológicamente. | Historia navegable del foco. |
| **Grafo / Graph** | Sesión Trace | Representa conexiones observadas entre destinos de foco. | Grafo de navegación observada. |
| **Breakpoints de accesibilidad** | Trace | Puede pausar la grabación al capturar determinadas causas runtime. | Punto de parada asociado a evidencia determinista. |
| **Site Audit** | Sitio del mismo origen | Descubre, agrupa y muestrea páginas representativas y ejecuta el scanner real. | Hallazgos por página, familia y plantilla. |
| **Notas del auditor** | Cualquier hallazgo estático o evento de Trace | Añade contexto humano editable y eliminable sin cambiar el resultado detectado ni su gravedad. | Nota local ligada al elemento padre e incluida en informes y exportaciones JSON. |
| **FocusTrace Memory** | Análisis repetidos, activado por defecto | Mantiene historial local limitado y sin caducidad temporal para comparar persistencia, cambios, resoluciones y regresiones. | Observaciones, notas del auditor, localizador y vista previa opcional. |
| **Informe** | Evidencia estática/runtime disponible | Consolida análisis, historias runtime y Estructura ya generada. | Vista de informe y exportaciones. |
| **PDF / TXT / Markdown / JSON** | Informe actual o línea base de Memory | Exporta la evidencia y las notas del auditor aplicables reutilizando los datos disponibles sin volver a recorrer silenciosamente todo el DOM. | Artefactos compartibles. |

### Reglas WCAG estáticas

| ID | Detecta / comprueba | Resultado | Referencia |
| --- | --- | --- | --- |
| `FT-WCAG-001` | La página HTML tiene un título no vacío. | FAIL / PASS | WCAG 2.4.2 · ACT 2779a5 |
| `FT-WCAG-002` | Las imágenes tienen nombre accesible o están tratadas como decorativas. | FAIL / PASS | WCAG 1.1.1 · ACT 23a2a8 |
| `FT-WCAG-003` | Los botones tienen nombre accesible no vacío. | FAIL / PASS | WCAG 4.1.2 · ACT 97a4e1 |
| `FT-WCAG-004` | Los campos de formulario tienen nombre accesible no vacío. | FAIL / PASS | WCAG 4.1.2 · ACT e086e5 |
| `FT-WCAG-005` | Los enlaces tienen nombre accesible no vacío. | FAIL / PASS | WCAG 4.1.2 / 2.4.4 · ACT c487ae |
| `FT-WCAG-006` | Contenido con `aria-hidden="true"` contiene elementos que siguen entrando en la navegación secuencial de foco. | FAIL / PASS | WCAG 4.1.2 · ACT 6cfa84 |
| `FT-WCAG-007` | La etiqueta visible forma parte del nombre accesible. | FAIL / PASS | WCAG 2.5.3 · ACT 2ee8b8 |
| `FT-WCAG-008` | El documento tiene un atributo `lang` no vacío. | FAIL / PASS | WCAG 3.1.1 · ACT b5c3f8 |
| `FT-WCAG-009` | El `lang` usa un subtag primario de idioma reconocido. | FAIL / PASS | WCAG 3.1.1 · ACT bf051a · IANA |
| `FT-WCAG-010` | El contraste de texto alcanza el ratio requerido cuando foreground/background pueden resolverse con certeza. | FAIL / REVIEW / PASS | WCAG 1.4.3 AA |
| `FT-WCAG-011` | La información visual no textual necesaria alcanza el contraste requerido cuando existe evidencia determinista. | FAIL / REVIEW / PASS | WCAG 1.4.11 AA |
| `FT-WCAG-012` | Los objetivos de puntero contienen un área verificable de 24 × 24 CSS px o cumplen una excepción observable de separación/inline; las excepciones semánticas no resolubles quedan para revisión. | REVIEW / PASS | WCAG 2.5.8 AA |
| `FT-WCAG-013` | Los valores `lang` explícitos de contenido de lenguaje humano renderizado usan un subtag primario de idioma reconocido. Se excluyen contextos con apariencia de código. | FAIL / PASS | WCAG 3.1.2 AA · ACT de46e4 · IANA |

`FT-WCAG-013` valida únicamente declaraciones explícitas de idioma sobre texto renderizado que hereda el `lang` evaluado. FocusTrace no utiliza NLP para deducir cambios de idioma sin marcar y excluye contextos con apariencia de código como `code`, `pre`, `samp`, `kbd` y `var` para no tratar etiquetas de lenguajes de programación como fallos de idioma humano. Un PASS significa por tanto que la declaración observada es válida, no que se hayan identificado todos los cambios de idioma humano de la página.

### Revisiones contextuales y estructurales

| ID | Detecta / señala | Resultado | Referencia |
| --- | --- | --- | --- |
| `FT-REVIEW-001` | `tabindex` positivo que puede alterar el orden natural del foco. | REVIEW | WCAG 2.4.3 |
| `FT-REVIEW-002` | Saltos de nivel en la jerarquía de encabezados. | REVIEW | WCAG 1.3.1 / 2.4.6 |
| `FT-REVIEW-003` | Campo que depende del `placeholder` como identificación/nombre. | REVIEW | WCAG 3.3.2 |
| `FT-REVIEW-004` | Ausencia de un landmark principal `<main>` / `role="main"` visible. | REVIEW / PASS | HTML · WAI-ARIA APG |
| `FT-REVIEW-005` | Más de un landmark `main` expuesto. | REVIEW / PASS | HTML · WAI-ARIA APG |
| `FT-REVIEW-006` | Interacción personalizada con comportamiento observable de botón. | REVIEW | HTML · WAI-ARIA APG |
| `FT-REVIEW-007` | Interacción personalizada con comportamiento observable de enlace/navegación. | REVIEW | HTML · WAI-ARIA APG |
| `FT-REVIEW-008` | Interacción genérica cuyo propósito no puede determinarse con seguridad. | REVIEW | WAI-ARIA APG |
| `FT-REVIEW-009` | `section` / `article` visible sin encabezado propio ni nombre accesible calculado. | REVIEW | HTML |
| `FT-REVIEW-010` | Landmarks repetidos de navegación, búsqueda o contenido complementario sin nombres distinguibles. | REVIEW | WAI-ARIA APG |
| `FT-REVIEW-011` | Los mismos mecanismos de ayuda cambian su orden relativo entre páginas muestreadas. | REVIEW | WCAG 3.2.6 |
| `FT-REVIEW-012` | Aparece una navegación significativa antes del contenido principal sin un enlace temprano de fragmento, alcanzable por teclado y validado, que lleve a la región main. | REVIEW / PASS | WCAG 2.4.1 |
| `FT-REVIEW-013` | El mismo conjunto exacto de destinos de navegación repetidos cambia su orden relativo entre páginas muestreadas. | REVIEW | WCAG 3.2.3 AA |
| `FT-REVIEW-014` | Un control de formulario usa vocabulario estándar reconocible de propósito `autocomplete` con una secuencia de tokens mal formada. Las taxonomías desconocidas/personalizadas se ignoran deliberadamente. | REVIEW / PASS | WCAG 1.3.5 AA · ACT 73f2c2 |
| `FT-REVIEW-015` | Un enlace nativo observado de forma única apunta al mismo destino exacto en páginas muestreadas del mismo idioma, pero su identificación cambia de forma sustancial. | REVIEW | WCAG 3.2.4 AA |
| `FT-REVIEW-016` | Texto directo renderizado queda bloqueado por `letter-spacing`, `word-spacing` o `line-height` inline con `!important` por debajo del umbral ACT correspondiente. | REVIEW / PASS | WCAG 1.4.12 AA · ACT 24afc2 / 78fd32 / 9e45ec |
| `FT-REVIEW-017` | Audio nativo probablemente pregrabado sin una alternativa equivalente candidata observable en el marcado local; las alternativas candidatas suprimen la revisión sin afirmar equivalencia. | REVIEW / PASS | WCAG 1.2.1 A |
| `FT-REVIEW-018` | Vídeo nativo probablemente pregrabado sin una pista observable de subtítulos; una pista `subtitles` por sí sola no se considera prueba de captions. | REVIEW / PASS | WCAG 1.2.2 A · ACT f51b46 |
| `FT-REVIEW-019` | Un campo observado como inválido o `:user-invalid` no expone un candidato textual no vacío mediante `aria-errormessage` o `aria-describedby`; las referencias resueltas solo producen PASS acotado de presencia de asociación. | REVIEW / PASS | WCAG 3.3.1 A · ACT 36b590 |
| `FT-REVIEW-020` | Un campo inválido tiene texto de error asociado y metadatos observables de restricciones útiles para corregirlo, por lo que la sugerencia necesita revisión humana. | REVIEW | WCAG 3.3.3 AA |
| `FT-REVIEW-021` | Vídeo nativo sincronizado probablemente pregrabado sin una alternativa para el medio o audiodescripción candidata observable en el marcado local. | REVIEW / PASS | WCAG 1.2.3 A · ACT c5a4ea |
| `FT-REVIEW-022` | Vídeo nativo con señales sólidas de emisión en directo sin una pista observable de subtítulos. Las URL HLS/DASH por sí solas no establecen que sea directo. | REVIEW / PASS | WCAG 1.2.4 AA |
| `FT-REVIEW-023` | Vídeo nativo sincronizado probablemente pregrabado sin pista nativa de descripciones ni control cercano de versión audiodescrita. | REVIEW / PASS | WCAG 1.2.5 AA · ACT 1ec09b |
| `FT-REVIEW-024` | En un viewport efectivo de 320 píxeles CSS —o 256 píxeles CSS de alto para escritura vertical—, contenido no exceptuado provoca desplazamiento transversal del documento o texto/controles renderizados quedan recortados por `overflow: hidden/clip`. | REVIEW / PASS | WCAG 1.4.10 AA |
| `FT-REVIEW-025` | Un enlace nativo renderizado dentro de texto se diferencia del texto adyacente que no es enlace mediante el color, presenta una diferencia de luminosidad inferior a 3:1 y no expone ninguna señal persistente de subrayado, tipografía, contorno o gráfico que FocusTrace pueda resolver. | REVIEW / PASS | WCAG 1.4.1 A |
| `FT-REVIEW-026` | Animaciones Web renderizadas, contenido `<marquee>` o vídeo nativo con `autoplay` pueden moverse, parpadear o desplazarse durante más de cinco segundos junto a otro contenido visible sin un control candidato observable. | REVIEW / PASS | WCAG 2.2.2 A |
| `FT-REVIEW-027` | Un nombre accesible de enlace no vacío coincide exactamente con una expresión genérica acotada en ES/EN y necesita revisar su contexto programático. | REVIEW | WCAG 2.4.4 A · ACT 5effbb |

Para `FT-REVIEW-012`, FocusTrace considera señal positiva un enlace de fragmento del mismo documento validado y situado antes del bloque de navegación repetitiva candidato. La ausencia del enlace o un destino roto permanece como **REVIEW**, no como FAIL automático, porque WCAG 2.4.1 admite otros mecanismos y la aplicabilidad de bloques repetidos puede requerir contexto entre páginas.

Para `FT-REVIEW-013`, FocusTrace compara únicamente landmarks de navegación renderizados con al menos tres destinos HTTP(S) únicos. Dos bloques solo se consideran el mismo mecanismo repetido cuando sus conjuntos completos de destinos coinciden exactamente y ese conjunto aparece una sola vez en cada página. Los solapamientos parciales o bloques duplicados ambiguos se ignoran. Un cambio de orden permanece como **REVIEW**, no como FAIL, porque el criterio permite cambios iniciados por el usuario y Site Audit no siempre puede demostrar ese contexto.

Para `FT-REVIEW-014`, FocusTrace valida únicamente valores `autocomplete` explícitos y no vacíos que utilizan de forma reconocible el vocabulario estándar de tokens HTML y cumplen la aplicabilidad de controles modelada a partir de ACT 73f2c2. Una secuencia estándar válida produce PASS para esta expectativa concreta; una secuencia estándar mal formada produce REVIEW, nunca FAIL automático. FocusTrace no deduce un propósito obligatorio a partir de `name`, etiqueta, placeholder o tipo de input, e ignora deliberadamente valores formados solo por tokens desconocidos porque una taxonomía personalizada todavía puede proporcionar un propósito programáticamente determinable. Determinar si el campo realmente recopila información sobre el usuario sigue siendo contextual.

Para `FT-REVIEW-015`, FocusTrace utiliza el destino HTTP(S) exacto del enlace únicamente como ancla fuerte de función entre páginas, no como prueba de que toda la funcionalidad sea idéntica. El destino debe aparecer una sola vez por página, ambas páginas deben declarar el mismo idioma principal y los dos nombres deben proceder de la misma fuente observada. Se ignoran destinos duplicados, páginas de idiomas distintos y etiquetas que conservan vocabulario funcional claro. Las variaciones exclusivamente numéricas se normalizan, por lo que textos como `Go to page 4` y `Go to page 5` no generan ruido. El resultado sigue siendo **REVIEW** porque la equivalencia semántica necesita confirmación humana y el colector de Site Audit usa intencionadamente una aproximación acotada al nombre, no AccName completo, para esta comparación.

Para `FT-REVIEW-016`, FocusTrace implementa únicamente los tres subconjuntos ACT actuales que comprueban espaciado inline con `!important`. Revisa `letter-spacing` por debajo de `0,12 × font-size`, `word-spacing` por debajo de `0,16 × font-size` y `line-height` por debajo de `1,5 × font-size` solo cuando el mismo nodo de texto directo presenta un salto automático real. Se excluyen valores CSS heredados, contextos con apariencia de código, texto oculto/recortado/fuera del documento y nodos con estilo que no sean HTML. Un valor inferior queda como **REVIEW** porque un mecanismo propio de la página y la aplicabilidad según idioma/sistema de escritura pueden seguir haciendo conforme WCAG 1.4.12. FocusTrace no automatiza la separación entre párrafos ni el juicio final de pérdida de contenido/funcionalidad al aplicar todos los valores conjuntamente.

Para `FT-REVIEW-017`, `FT-REVIEW-018`, `FT-REVIEW-021`, `FT-REVIEW-022` y `FT-REVIEW-023`, FocusTrace evalúa únicamente evidencia acotada de medios nativos. No decodifica los archivos multimedia, no transcribe audio ni analiza los píxeles del vídeo. Una duración finita o una fuente normal inspeccionable puede respaldar una revisión de contenido pregrabado; `srcObject`, duración infinita o una fuente `mediastream:` pueden respaldar una revisión de contenido en directo. Las fuentes solo `blob:` y las URL `.m3u8` / `.mpd` sin evidencia temporal runtime permanecen como **desconocidas** en lugar de adivinar si son pregrabadas o en directo. Las pistas nativas y controles cercanos de alternativas pueden aportar evidencia PASS acotada para la expectativa observable concreta, pero FocusTrace nunca verifica equivalencia ni la exactitud o completitud de subtítulos o audiodescripciones. Una alternativa tipo transcripción puede suprimir la revisión 1.2.3, pero no cuenta como evidencia de audiodescripción para 1.2.5. Los reproductores personalizados, subtítulos incrustados, la aplicabilidad por contenido auditivo y el juicio sobre contenido visual significativo siguen siendo manuales. `FT-REVIEW-017` sigue cubriendo únicamente el subconjunto de solo audio de WCAG 1.2.1.

`FT-REVIEW-024` inspecciona el estado responsive **actual** de la página; nunca cambia el zoom del navegador ni el tamaño del viewport. Ejecuta Analizar después de ampliar o estrechar la página hasta que su viewport efectivo mida como máximo 320 píxeles CSS de ancho para escritura horizontal —o 256 píxeles CSS de alto para escritura vertical—. FocusTrace mide el desbordamiento del documento, identifica destinos acotados no exceptuados que sobresalen y detecta texto/controles observables recortados por un ancestro sin desplazamiento con `overflow: hidden/clip`. Las superficies bidimensionales conocidas, como tablas de datos, gráficos SVG/canvas, vídeo y aplicaciones embebidas, quedan excluidas de la revisión automática. El resultado permanece como REVIEW porque las excepciones de layout esencial, el contenido responsive de sustitución, los overlays, Shadow DOM y el significado visual todavía requieren inspección manual.

`FT-REVIEW-025` proporciona una búsqueda automatizada conservadora de candidatos para el subconjunto de enlaces integrados de WCAG 1.4.1. Evalúa como máximo 2.000 enlaces nativos renderizados únicamente dentro de contextos de texto tipo `p`, `li`, `dd`, `dt`, `figcaption` y `blockquote`, excluyendo regiones de navegación/menú/barra de herramientas y enlaces aislados, y emite como máximo 50 revisiones por barrido. Un enlace solo se revisa cuando su color de texto renderizado se diferencia de texto adyacente comparable que no es enlace en menos de `3:1` y no se observa ninguna señal persistente no basada en el color en el estado normal. Los subrayados, diferencias tipográficas, contornos visibles, contenido generado y gráficos renderizados suprimen la revisión; se omiten colores iguales, fondos distintos o complejos, contenido oculto y renderizado no resoluble. La evidencia JSON estructurada conserva ambos colores, el ratio medido y los selectores de contexto. El resultado permanece como REVIEW porque el contexto visual y señales de autor poco habituales todavía requieren confirmación humana; otros casos de uso del color, como errores, campos obligatorios, gráficas e indicadores de estado, siguen siendo manuales.

`FT-REVIEW-026` proporciona una búsqueda conservadora de candidatos en el estado actual para la rama de movimiento, parpadeo y desplazamiento de WCAG 2.2.2. Inspecciona como máximo 1.000 animaciones Web activas expuestas por el navegador, 250 elementos `<marquee>` renderizados y 250 elementos nativos `video[autoplay]` renderizados, solo cuando se observa otro contenido visible, y emite como máximo 50 revisiones por barrido. Las animaciones Web con una duración activa total resuelta de cinco segundos o menos y los vídeos en autoplay de cinco segundos o menos registran PASS acotado; los controles nativos del vídeo también registran PASS acotado. Un control renderizado, con nombre accesible y relacionado explícitamente mediante `aria-controls` se conserva como candidato, pero no suprime REVIEW porque es necesario probar su comportamiento. La evidencia JSON estructurada registra la fuente, duración o repetición indefinida, propiedades de keyframes que cambian, confianza sobre el inicio automático y selectores de controles. El resultado permanece como REVIEW porque el carácter esencial, el inicio automático real y el comportamiento de controles personalizados requieren verificación humana. Las actualizaciones temporizadas de DOM/texto, píxeles de imágenes animadas, canvas/SMIL/reproductores personalizados, Shadow DOM y frames de otro origen siguen siendo manuales.

`FT-REVIEW-027` complementa el fallo por nombre vacío de `FT-WCAG-005`: revisa únicamente enlaces semánticos expuestos cuyo nombre accesible no vacío coincide exactamente con una lista deliberadamente pequeña e insensible a acentos de expresiones genéricas en español o inglés, como «leer más», «haz clic aquí», «detalles», “read more” o “here”. Inspecciona como máximo 2.000 candidatos y emite hasta 50 revisiones por análisis de página o componente. La evidencia JSON estructurada conserva texto acotado y selectores de destinos `aria-describedby` observables, la frase o párrafo contenedor, elementos de lista actuales y padres, celdas de tabla y encabezados asociados explícitamente o mediante `scope`, y el contenedor de bloque más cercano. El contexto nunca convierte el resultado en PASS porque decidir si el lenguaje natural identifica el propósito exige criterio humano; un encabezado visual anterior por sí solo no se trata como contexto programático normativo. Las variantes fuera del vocabulario acotado, la semántica en Shadow DOM o frames de otro origen, la comprensión del lenguaje y la excepción WCAG de ambigüedad general siguen siendo manuales.

Para `FT-REVIEW-019`, FocusTrace solo aplica cuando observa `aria-invalid` explícito distinto de `false` o `:user-invalid` compatible con el navegador. Un destino no vacío de `aria-errormessage` o `aria-describedby` cuenta únicamente como PASS acotado de presencia de asociación; FocusTrace no demuestra que el texto describa completamente el error ni que no exista otro mensaje visual o propio de la aplicación. `FT-REVIEW-020` solo se ejecuta cuando ese campo inválido ya tiene texto asociado y expone una restricción relevante para corregirlo, como `required`, un tipo de input restringido, `pattern`, `min`/`max`, `step` o límites de longitud. Sigue siendo REVIEW porque la suficiencia de la sugerencia y la excepción WCAG por seguridad/propósito requieren contexto. Ninguna de las dos reglas lee ni guarda el valor del campo.

Para las señales semánticas, FocusTrace intenta diferenciar la función antes de recomendar HTML nativo: comportamiento de botón → preferir `<button type="button">`; navegación → preferir `<a href="…">`; interacción ambigua → revisar primero la función real. ARIA puede mostrarse como fallback, pero no añade automáticamente el comportamiento nativo de teclado.

### Avisos de autoría HTML y ARIA

#### ARIA básico

| ID | Detecta | Resultado | Fuente |
| --- | --- | --- | --- |
| `FT-WARN-001` | Uso de un rol ARIA obsoleto. | WARNING / PASS | WAI-ARIA |
| `FT-WARN-002` | Estado o propiedad ARIA obsoletos para el rol. | WARNING / PASS | WAI-ARIA |
| `FT-WARN-003` | Estado o propiedad ARIA prohibidos para el rol. | WARNING / PASS | WAI-ARIA |

#### HTML

| ID | Detecta | Resultado | Fuente |
| --- | --- | --- | --- |
| `FT-WARN-004` | IDs HTML no vacíos duplicados. | WARNING / PASS | HTML Living Standard |
| `FT-WARN-005` | Elementos HTML completamente obsoletos. | WARNING | HTML Living Standard |
| `FT-WARN-006` | Atributos HTML obsoletos y no conformes. | WARNING | HTML Living Standard |
| `FT-WARN-007` | Características HTML obsoletas pero todavía conformes. | WARNING | HTML Living Standard |
| `FT-WARN-008` | Elemento fuera del padre o ancestro nativo requerido. | WARNING | HTML Living Standard |
| `FT-WARN-009` | Violación del modelo de contenido, grupo u orden permitido por HTML. | WARNING | HTML Living Standard |
| `FT-WARN-010` | Estructura conflictiva con controles interactivos o etiquetas anidadas. | WARNING | HTML Living Standard |
| `FT-WARN-011` | Jerarquía nativa inválida relacionada con `main`. | WARNING | HTML Living Standard |

#### ARIA avanzado

| ID | Detecta | Resultado | Fuente |
| --- | --- | --- | --- |
| `FT-WARN-012` | Rol explícito que no puede resolverse o uso de un rol ARIA abstracto. | WARNING | WAI-ARIA 1.3 |
| `FT-WARN-013` | Atributo `aria-*` desconocido. | WARNING | WAI-ARIA 1.3 |
| `FT-WARN-014` | Valor ARIA determinísticamente inválido. | WARNING | WAI-ARIA 1.3 |
| `FT-WARN-015` | Falta un estado o propiedad ARIA requerido para el rol resuelto. | WARNING | WAI-ARIA 1.3 |
| `FT-WARN-016` | Relación inválida de referencias por ID, `aria-owns` o `aria-activedescendant`. | WARNING | WAI-ARIA 1.3 |
| `FT-WARN-017` | Falta el rol padre requerido dentro de la relación de accesibilidad. | WARNING | WAI-ARIA 1.3 |
| `FT-WARN-018` | Un contenedor ARIA expone un rol hijo incompatible. | WARNING | WAI-ARIA 1.3 |
| `FT-WARN-019` | Estados ARIA de rango, posición o conjunto se contradicen entre sí. | WARNING | WAI-ARIA 1.3 |
| `FT-WARN-020` | Un estado o propiedad ARIA conocido no está soportado por el rol resuelto. | WARNING | WAI-ARIA 1.3 |
| `FT-WARN-021` | Una relación ARIA resuelve, pero el estado expuesto contradice esa relación o el contenido relacionado. | WARNING | WAI-ARIA 1.3 |

FocusTrace interpreta relaciones observables y `aria-owns`, no se limita a comparar padres DOM directos. Estos avisos identifican evidencia de autoría; una regla WCAG distinta debe decidir cuándo esa evidencia demuestra un fallo de conformidad.

### Reglas WCAG runtime

Trace almacena evidencia compacta: selector, rol, nombre accesible, tag, cambios relevantes, transición de ruta, eventos de diálogo/foco, resumen de arrastre y señales acotadas de teclado/puntero. No guarda snapshots DOM completos ni la trayectoria completa de coordenadas del puntero. Las capturas temporales y lossless usadas por `FT-RUNTIME-010` se comparan en memoria y no se conservan en Trace, Memory ni informes.

| ID | Detecta / observa | Resultado | Referencia |
| --- | --- | --- | --- |
| `FT-RUNTIME-001` | El elemento con foco es eliminado durante una interacción. | REVIEW | WCAG 2.4.3 |
| `FT-RUNTIME-002` | El componente que mantiene el foco puede quedar completamente cubierto por otro contenido. | REVIEW | WCAG 2.4.11 |
| `FT-RUNTIME-003` | Una navegación SPA cambia de ruta sin actualizar el título del documento. | REVIEW | WCAG 2.4.2 |
| `FT-RUNTIME-004` | Una navegación SPA cambia de ruta sin mover el foco a un nuevo contexto. | REVIEW | WCAG 2.4.3 |
| `FT-RUNTIME-005` | El elemento que conserva el foco pasa a estar oculto durante la interacción. | REVIEW | WCAG 2.4.3 / 4.1.2 |
| `FT-RUNTIME-006` | Se observa un arrastre significativo sobre un objetivo con señales de ser arrastrable y debe revisarse si existe una alternativa de puntero sencillo. | REVIEW | WCAG 2.5.7 |
| `FT-RUNTIME-007` | Tras una activación real aparece un mensaje visible y breve con apariencia de estado, sin semántica live/status observable ni una relación activa `aria-errormessage`. | REVIEW | WCAG 4.1.3 |
| `FT-RUNTIME-008` | Recibir el foco va seguido de un cambio de ruta, apertura de diálogo o movimiento programático de foco observado sin una activación independiente. | REVIEW | WCAG 3.2.1 |
| `FT-RUNTIME-009` | Un evento `input`/`change` de confianza sobre un control de configuración va seguido de un cambio de ruta, apertura de diálogo o movimiento programático de foco observado. | REVIEW | WCAG 3.2.2 |
| `FT-RUNTIME-010` | Tras una transición real con Tab/Shift+Tab, dos capturas estables sin foco y dos con foco no muestran ningún cambio de color de píxel en la región limitada alrededor del control enfocado. | REVIEW | WCAG 2.4.7 AA · ACT oj04fd |
| `FT-RUNTIME-011` | Se observa una activación de puntero de confianza sobre una acción personalizada que no es alcanzable en el orden secuencial de foco observado. | REVIEW | WCAG 2.1.1 A |
| `FT-RUNTIME-012` | La navegación repetida con Tab estándar recorre solo un subconjunto del orden de foco observado, o intentos repetidos de Tab dejan el foco inmóvil fuera de un modal abierto. | REVIEW | WCAG 2.1.2 A · ACT a1b64e |
| `FT-RUNTIME-013` | Estado semántico de activación, eliminación del objetivo o navegación ocurren después de pointer-down pero antes de soltar el puntero o recibir `pointercancel`. | REVIEW | WCAG 2.5.2 A |
| `FT-RUNTIME-014` | Durante Trace, un hover real de confianza, estado active de puntero, foco/focus-visible de teclado o estado semántico observado renderiza texto por debajo del ratio de contraste requerido. | REVIEW | WCAG 1.4.3 AA |
| `FT-RUNTIME-015` | El contenido adicional revelado por hover o foco reales se observa para detectar señales sobre si puede mantenerse bajo hover, permanecer visible y descartarse. | REVIEW | WCAG 1.4.13 AA |
| `FT-RUNTIME-016` | Durante Trace, un estado interactivo real de confianza renderiza un componente, gráfico o indicador de foco medido por debajo de 3:1 frente a su color adyacente. | REVIEW | WCAG 1.4.11 AA |

`FT-RUNTIME-002` vuelve a comprobar el elemento mientras mantiene el foco tras scroll, resize y mutaciones DOM relevantes. `FT-RUNTIME-006` requiere movimiento real del puntero por encima del umbral de jitter; un `dragstart` nativo por sí solo no se utiliza para emitir la revisión.

`FT-RUNTIME-007` está correlacionada con la interacción real y usa una ventana breve de estabilización. Excluye diálogos, contenedores de estado de widgets ya modelados, mensajes que reciben foco o van seguidos de un cambio de foco/navegación/diálogo, y mensajes ya expuestos mediante `role="status"`, `role="alert"`, `role="log"`, semántica de progreso, `aria-live` activo o una relación `aria-errormessage` activa. `aria-busy` por sí solo no se considera exposición suficiente de un mensaje de estado. La clasificación de un mensaje como “estado” sigue dependiendo del significado, por lo que la regla permanece como **REVIEW** y no fabrica un FAIL WCAG automático.

`FT-RUNTIME-008` y `FT-RUNTIME-009` usan una ventana acotada de correlación de 1,2 segundos. Las acciones independientes del usuario eliminan atribuciones antiguas, la activación explícita no se trata como fallo de On Focus y el movimiento secuencial normal del foco no se atribuye al control anterior. `FT-RUNTIME-009` registra la identidad del control y el tipo de evento `input`/`change` de confianza, no el valor del control. Ambas reglas permanecen como **REVIEW** porque el orden runtime no demuestra la causalidad del manejador para 3.2.1 ni permite establecer siempre si hubo aviso previo al usuario para 3.2.2.

`FT-RUNTIME-010` no utiliza deliberadamente Focus Walk automático porque `element.focus()` programático no reproduce de forma fiable la modalidad de teclado de `:focus-visible`. Solo se ejecuta durante un Trace manual tras una transición de confianza con Tab/Shift+Tab, espera un segundo con el foco estable y exige pares de capturas PNG estables antes/después sin cambios de viewport. Cualquier cambio local de píxeles cuenta como evidencia de que esta comprobación limitada observó una diferencia visible; animación/inestabilidad, scroll, resize o captura no disponible vuelven la observación inconclusa y no generan revisión. Un recorte local estable y sin cambios permanece como **REVIEW**, nunca FAIL automático, porque ACT `oj04fd` puede permitir un indicador de foco situado en otra zona del viewport.

`FT-RUNTIME-011` es deliberadamente acotada: necesita una activación real de puntero más una señal observable de acción personalizada y solo revisa el caso en que ese objetivo queda fuera de la navegación secuencial por teclado. No afirma que falten listeners delegados de frameworks ni un control equivalente de teclado en otra zona. `FT-RUNTIME-012` exige evidencia repetida de Tab real, ignora el wrapping de todo el orden de foco y suprime la contención intencionada dentro de un modal abierto; otros mecanismos de salida requieren revisión humana. `FT-RUNTIME-013` compara únicamente estado de activación observable antes de soltar/cancelar y permanece como REVIEW porque las excepciones de abortar, deshacer o función esencial dependen del contexto. `FT-RUNTIME-014` mide únicamente estados interactivos reales y de confianza que llegan a renderizarse durante Trace, espera una ventana acotada de estabilización y permanece como REVIEW porque los estados no observados y la aplicabilidad WCAG siguen requiriendo revisión manual.

`FT-RUNTIME-015` observa únicamente contenido adicional que llega a hacerse visible después de un hover real o de un foco correlacionado con una interacción del usuario. Asocia los candidatos de forma conservadora mediante relaciones ARIA explícitas o proximidad geométrica acotada, limita las observaciones simultáneas y solo emite evidencia REVIEW cuando una interacción observada sugiere que puede no cumplirse alguno de los requisitos de WCAG 1.4.13: descartable, hoverable o persistente. Escape se utiliza como prueba que puede aportar evidencia sobre la posibilidad de descartar el contenido, no como requisito WCAG universal; los estados no observados, mecanismos alternativos de cierre y la aplicabilidad siguen requiriendo revisión manual.

`FT-RUNTIME-016` reutiliza el evaluador existente de contraste no textual únicamente sobre el control interactuado una vez estabilizado el estado real de confianza. Solo emite REVIEW cuando una señal visual simple tiene un ratio resuelto por debajo de 3:1; gradientes/imágenes no resolubles, gráficos CSS generados, gráficos multicolor e indicadores de foco basados únicamente en `box-shadow` permanecen para revisión manual en lugar de generar ruido runtime. La evidencia de indicador de foco solo se atribuye a estados reales `focus`/`focus-visible`. Los estados no observados y la aplicabilidad de la información visual requerida siguen siendo manuales.

### Avisos ARIA runtime

Estas reglas se evalúan después de interacciones reales y una ventana corta de estabilización. Son contradicciones deterministas de estado/relaciones ARIA y se presentan como **WARNING**, no como FAIL WCAG automático.

| ID | Patrón | Detecta / observa | Resultado | Fuente |
| --- | --- | --- | --- | --- |
| `FT-RUNTIME-ARIA-001` | Disclosure / Accordion / Menu button | `aria-expanded` contradice la disponibilidad programática del contenido indicado por `aria-controls`. | WARNING | WAI-ARIA |
| `FT-RUNTIME-ARIA-002` | Tabs | La pestaña seleccionada controla un `tabpanel` que sigue oculto programáticamente. | WARNING | WAI-ARIA |
| `FT-RUNTIME-ARIA-003` | Combobox | Un combobox expandido no resuelve `aria-controls` hacia un rol de popup permitido. | WARNING | WAI-ARIA |
| `FT-RUNTIME-ARIA-004` | Combobox | El rol real del popup no coincide con `aria-haspopup`. | WARNING | WAI-ARIA |
| `FT-RUNTIME-ARIA-005` | Combobox / Listbox / Tree / Grid / Treegrid | `aria-activedescendant` falta o queda fuera de la relación permitida de propiedad/control. | WARNING | WAI-ARIA |
| `FT-RUNTIME-ARIA-006` | Tree | `aria-expanded` de un `treeitem` contradice la disponibilidad de su `group` hijo. | WARNING | WAI-ARIA |

### Guía runtime para diálogos modales

| ID | Detecta / observa | Resultado | Referencia |
| --- | --- | --- | --- |
| `FT-APG-001` | Se abre un diálogo y el foco inicial permanece fuera. | REVIEW | WAI-ARIA APG Dialog Modal |
| `FT-APG-002` | El foco escapa de un diálogo modal abierto. | REVIEW | WAI-ARIA APG Dialog Modal |
| `FT-APG-003` | Se cierra un diálogo sin restaurar el foco a un destino lógico. | REVIEW | WAI-ARIA APG Dialog Modal |

### Revisiones runtime de widgets APG

Estas reglas observan el comportamiento real de widgets modelados por FocusTrace. APG es una fuente informativa: los resultados permanecen como **REVIEW** y no se presentan como fallos WCAG normativos.

| ID | Patrón | Detecta / observa | Resultado |
| --- | --- | --- | --- |
| `FT-APG-004` | Tabs | Enter, Space o click activa una pestaña pero no pasa a seleccionada. | REVIEW |
| `FT-APG-005` | Menu button | La activación obligatoria no abre el menú, o el menú abierto no coloca el foco en el elemento esperado; ArrowUp/ArrowDown opcionales solo se revisan si la app los implementa. | REVIEW |
| `FT-APG-006` | Menu button | Escape deja el menú abierto o lo cierra sin devolver el foco al trigger. | REVIEW |
| `FT-APG-007` | Dialog | Un diálogo observado dinámicamente se abre sin nombre accesible. | REVIEW |
| `FT-APG-008` | Combobox / Listbox / Tree / Grid / Treegrid | Un `aria-activedescendant` válido queda oculto programáticamente después de navegar. | REVIEW |
| `FT-APG-009` | Combobox | Se pulsa Escape con el popup abierto pero el popup sigue expuesto. | REVIEW |
| `FT-APG-010` | Listbox | Un listbox de selección única expone varias opciones seleccionadas o marcadas. | REVIEW |
| `FT-APG-011` | Tabs / Radio group / Toolbar / Menu / Listbox / Tree / Grid / Treegrid | Un compuesto con roving tabindex deja varios tab stops gestionados dentro de la secuencia de página. | REVIEW |
| `FT-APG-012` | Tree | Flechas o Home/End obligatorios no alcanzan el destino/estado esperado por el patrón Tree observado. | REVIEW |
| `FT-APG-013` | Grid / Treegrid | Flechas o Home/End obligatorios no alcanzan la fila/celda o estado esperado. | REVIEW |
| `FT-APG-014` | Tree | Un árbol de selección única expone varios `treeitem` seleccionados o marcados. | REVIEW |
| `FT-APG-015` | Tabs | La navegación con flechas no alcanza la pestaña esperada respetando orientación y wrapping requerido. | REVIEW |
| `FT-APG-016` | Radio group | La navegación con flechas no alcanza/selecciona la radio ARIA esperada fuera de un toolbar. | REVIEW |
| `FT-APG-017` | Toolbar | La flecha gestionada por el toolbar no alcanza el control esperado. | REVIEW |
| `FT-APG-018` | Menu / Menubar | La flecha gestionada por el menú no alcanza el elemento de menú esperado. | REVIEW |
| `FT-APG-019` | Listbox | La flecha gestionada por el listbox no alcanza la opción/virtual option esperada. | REVIEW |
| `FT-APG-020` | Modal dialog | Se observa Escape dentro de un modal abierto y el modal sigue abierto tras estabilizarse. | REVIEW |
| `FT-APG-021` | Disclosure / Accordion | Enter o Space sobre el botón no cambia el estado `aria-expanded` expuesto. | REVIEW |

#### Modelos de foco y widgets cubiertos

| Área | Comportamiento observado |
| --- | --- |
| **Roving tabindex** | FocusTrace comprueba que normalmente un único elemento gestionado participe en el orden de tabulación de página. |
| **`aria-activedescendant`** | Los cambios válidos se registran como foco virtual informativo; no aumentan recuentos de hallazgos ni métricas Tab. |
| **Tabs** | Orientación, wrapping, activación y navegación con flechas. |
| **Radio groups** | Movimiento/selección con flechas fuera de toolbars; dentro de toolbar la navegación pertenece al toolbar. |
| **Toolbars** | Navegación según orientación, evitando apropiarse de teclas que pertenecen a controles embebidos. |
| **Menus / Menu buttons** | Apertura obligatoria con Enter/Space, apertura opcional con flechas cuando existe, navegación y Escape. |
| **Listboxes** | Navegación con foco DOM o virtual y coherencia de selección única. |
| **Disclosure / Accordion** | Cambio de `aria-expanded` con Enter/Space y coherencia entre estado y contenido controlado. |
| **Dialogs** | Nombre accesible, foco inicial, contención, Escape y restauración. |
| **Tree** | Orientación, recorrido visible, expandir/colapsar, padres/hijos, Home/End y selección. |
| **Grid / Treegrid** | Navegación de filas/celdas, Home/End y comportamiento de árbol cuando aplica, con límites conservadores para grids irregulares/virtualizados. |

### Causalidad runtime

| Clasificación | Significado |
| --- | --- |
| `FOCUSED_NODE_REMOVED` | El nodo que contenía el foco fue eliminado. |
| `FOCUS_FELL_BACK_TO_BODY` | El navegador terminó devolviendo el foco al documento/body. |
| `DIALOG_OPENED_WITHOUT_FOCUS` | Se abrió un diálogo sin que el foco entrara en él. |
| `MODAL_FOCUS_ESCAPE` | El foco abandonó un modal que seguía abierto. |
| `ROUTE_CHANGED_WITHOUT_FOCUS_MOVE` | Cambió la ruta SPA y el foco permaneció en el contexto anterior. |
| `FOCUSED_ELEMENT_BECAME_HIDDEN` | El elemento que tenía el foco pasó a estar oculto. |

La causalidad explica la cadena registrada; no convierte por sí misma una situación contextual en FAIL.

### Estructura

| Capacidad | Comportamiento |
| --- | --- |
| **Encabezados** | Reutiliza el análisis actual para mostrar el árbol H1-H6 abierto por defecto, con jerarquía, controles por rama y localización visual. |
| **Semántica** | Busca oportunidades concretas de HTML nativo e interacciones genéricas que necesitan revisión. |
| **Métricas** | Cuenta regiones semánticas, listas, formularios, botones, enlaces, campos, tablas e imágenes. |
| **Localización** | Un encabezado o conjunto de una métrica puede localizarse y resaltarse en la página. |
| **Análisis unificado de página** | **Analizar esta página** prepara Semántica y Métricas junto con el análisis normal de página completa; **Actualizar** recalcula el snapshot de Estructura después de cambios de la página. |
| **Límite de componente** | Los análisis de componente no reutilizan un snapshot antiguo de Estructura de página completa como si fuera evidencia del componente. |
| **Límite de seguridad** | El colector procesa como máximo 10.000 elementos por defecto. |
| **Reutilización en informes** | PDF/TXT/informe reutilizan métricas y sugerencias existentes sin exportar el árbol DOM completo. |

### Herramientas de Trace

| Herramienta | Función |
| --- | --- |
| **Interacciones** | Agrupa una acción de teclado/puntero y la evidencia runtime correlacionada mediante `interactionId`. |
| **Recorrido / Journey** | Reconstruye cronológicamente el movimiento del foco. |
| **Grafo / Graph** | Representa las conexiones observadas entre destinos de foco, incluido foco virtual compatible. |
| **Replay** | Muestra la secuencia grabada sin volver a ejecutar la interacción. |
| **Eliminar interacción** | Elimina una acción registrada por error y su evidencia correlacionada. |
| **Recalcular sesión** | Tras eliminar una interacción, recalcula Replay, Recorrido, Grafo e Informe. |
| **Breakpoints** | Puede detener Trace después de capturar condiciones runtime deterministas seleccionadas. |
| **Resaltado** | Permite localizar nuevamente un objetivo registrado cuando todavía existe. |

### Focus Walk

| Capacidad | Comportamiento |
| --- | --- |
| **Recorrido automático por Tab** | Recorre destinos alcanzables mediante navegación secuencial por teclado. |
| **Evidencia de foco** | Construye un recorrido sin tener que pulsar Tab manualmente por toda la página. |
| **Localización** | Los pasos pueden reutilizarse para señalar el objetivo correspondiente. |
| **Límite** | Es una herramienta de depuración; no sustituye pruebas manuales de teclado para comportamientos contextuales. |

### Site Audit

Site Audit trabaja sobre el mismo origen y reutiliza el scanner real de FocusTrace.

| Capacidad | Comportamiento |
| --- | --- |
| **Descubrimiento por sitemap** | Incorpora URLs del mismo origen expuestas mediante sitemaps. |
| **robots.txt** | Utiliza la información disponible durante el descubrimiento. |
| **Enlaces internos** | Descubre navegación interna del sitio. |
| **URLs manuales** | Permite añadir URLs concretas de forma opcional. |
| **Familias de rutas** | Agrupa rutas repetidas para evitar analizar ciegamente cada duplicado. |
| **Muestreo representativo** | Ejecuta el scanner sobre muestras de cada familia. |
| **Hallazgos de plantilla** | Solo considera compartida una señal normalizada cuando aparece en todas las muestras analizadas correctamente de la familia. |
| **Ayuda coherente** | Compara categorías de ayuda repetidas entre páginas para `FT-REVIEW-011`. |
| **Navegación coherente** | Compara conjuntos exactos de destinos de navegación repetidos entre páginas muestreadas para `FT-REVIEW-013`; ignora coincidencias parciales o ambiguas. |
| **Identificación coherente** | Revisa identificaciones sustancialmente divergentes solo para un destino exacto de enlace nativo observado de forma única entre páginas muestreadas del mismo idioma (`FT-REVIEW-015`). |
| **Historial multipágina** | Conserva la revisión estática más reciente por URL normalizada en la auditoría activa. |
| **Reanálisis** | Sustituye la revisión/evidencia visual anterior de la misma URL en lugar de duplicarla. |
| **Evidencia visual limitada** | Puede guardar pequeños recortes locales asociados a revisiones para mantener contexto histórico. |
| **PDF completo de auditoría** | Exporta las páginas guardadas con su evidencia disponible. |

| Límite actual | Valor |
| --- | ---: |
| URLs descubiertas | 500 |
| Páginas analizadas | 30 |
| Muestras por familia de rutas | 3 |
| Cada respuesta de robots.txt o sitemap | 6 MB realmente recibidos |

El muestreo es evidencia representativa: no demuestra que todas las URLs sean idénticas ni ejecuta automáticamente Trace sobre todos los recorridos del sitio.

### FocusTrace Memory

Memory está **activado por defecto** y puede desactivarse desde Ajustes. No caduca por antigüedad mientras FocusTrace siga instalada; los límites de capacidad siguen sustituyendo la evidencia conservada más antigua para mantener acotado el almacenamiento del navegador. Al desinstalar FocusTrace, el navegador elimina automáticamente su almacenamiento de extensión. Exporta antes el JSON portable de Memory si quieres reutilizar el historial o sus notas después de reinstalarla o en otro perfil del navegador.

| Capacidad | Comportamiento |
| --- | --- |
| **Historial por página/componente** | Compara observaciones del mismo ámbito a lo largo del tiempo. |
| **Persistencia** | Identifica hallazgos que continúan reproduciéndose. |
| **Cambios** | Expone diferencias entre observaciones sucesivas. |
| **Ya no reproducidos** | Señala hallazgos que estaban presentes y han dejado de aparecer. |
| **Regresiones** | Reconoce la reaparición de un hallazgo previamente resuelto. |
| **Localizador compacto** | Puede conservar ID o selector CSS para reconocer después el elemento. |
| **Vista previa visual** | Puede guardar un pequeño recorte JPEG local de un elemento con fallo visible cuando la captura está disponible. |
| **Fallback** | Si no puede capturar, conserva el localizador compacto. |
| **Notas del auditor** | Conserva las notas ligadas a hallazgos estáticos recordados y las incluye en el JSON portable de Memory. |
| **Borrado** | El historial puede borrarse desde Ajustes incluso con Memory desactivado. |
| **Ciclo de desinstalación** | El navegador elimina automáticamente Memory, notas, preferencias e historial de auditoría local al desinstalar FocusTrace; los archivos ya exportados permanecen fuera del almacenamiento de la extensión. |

| Límite actual | Valor |
| --- | ---: |
| Observaciones por ámbito | 8 |
| Observaciones totales | 200 |
| Vistas previas visuales | 24 |
| Caducidad temporal | Ninguna; los límites de capacidad sustituyen la evidencia más antigua |

Memory no almacena HTML de página, snapshots completos del DOM ni capturas de página completa.

### Informes y exportación

| Capacidad | Contenido / comportamiento |
| --- | --- |
| **Informe de sesión** | Combina hallazgos estáticos y evidencia runtime de la sesión actual. |
| **Historias de interacción** | Integra cadenas registradas por Trace, incluidas revisiones de mensajes de estado, warnings ARIA y reviews APG. |
| **Notas del auditor** | Incluye las notas humanas ligadas a hallazgos estáticos y eventos de Trace, separadas visualmente de la evidencia de FocusTrace. |
| **Estructura del documento** | Reutiliza métricas y sugerencias compactas preparadas por el análisis de página completa o por una actualización posterior de Estructura. |
| **Leyenda de reglas** | Explica familias `FT-WCAG-*`, `FT-WARN-*`, `FT-REVIEW-*`, `FT-RUNTIME-*`, `FT-RUNTIME-ARIA-*` y `FT-APG-*`. |
| **PDF** | Exportación imprimible de página o auditoría multipágina. |
| **TXT** | Exportación textual de la evidencia disponible. |
| **Markdown** | Exportación estructurada en Markdown. |
| **JSON** | El esquema v2 de Trace conserva las notas de eventos; los snapshots portables de Memory conservan las notas de hallazgos y siguen aceptando líneas base v1. |
| **Evidencia visual opcional** | El PDF de una página puede incluir captura solo cuando el usuario lo solicita expresamente. |
| **Evidencia histórica multipágina** | Los PDFs de auditoría pueden reutilizar recortes locales limitados guardados durante cada análisis. |

### Idiomas y preferencias

| Capacidad | Comportamiento |
| --- | --- |
| **Español / Inglés** | Interfaz, explicaciones, evidencia humana y recomendaciones se mantienen en ambos idiomas. |
| **Identificadores técnicos** | IDs de reglas, selectores, tokens HTML/ARIA, ratios y colores permanecen canónicos. |
| **Tamaño de interfaz** | Preferencia persistente. |
| **Breakpoints** | Preferencias runtime persistentes. |
| **Memory** | Activado por defecto; preferencia persistente de desactivación. |

### Límites del análisis

| Área | Límite principal |
| --- | --- |
| Nombre accesible | Implementación dirigida a los casos requeridos por el motor, no una reproducción completa del motor de accesibilidad de un navegador. |
| Shadow DOM / slots | Cobertura no completa. |
| Iframes cross-origin | No se recorre por completo su contenido. |
| Contraste | Composiciones visuales complejas permanecen como REVIEW cuando no pueden resolverse con certeza. |
| Tamaño de objetivos | Usa geometría observable del DOM/layout y descubrimiento conservador de objetivos. Las excepciones por control equivalente, necesidad esencial o control del navegador, listeners de puntero exclusivos de frameworks y áreas de impacto no rectangulares complejas pueden seguir requiriendo revisión manual. |
| Espaciado de texto | Solo se comprueban `letter-spacing`, `word-spacing` y `line-height` con salto automático bloqueados mediante `!important` inline contra los tres umbrales ACT actuales. La separación entre párrafos, los mecanismos propios de la página, la aplicabilidad por idioma/sistema de escritura y el juicio conjunto de pérdida de contenido/funcionalidad siguen siendo manuales. |
| Alternativas, subtítulos y audiodescripción en medios | Solo evidencia de medios nativos. 1.2.1 cubre el subconjunto de solo audio; 1.2.2/1.2.4 observan pistas de captions; 1.2.3/1.2.5 observan señales locales acotadas de alternativa para el medio o audiodescripción. Las URL HLS/DASH por sí solas no se tratan como directo, los sistemas personalizados o subtítulos incrustados pueden no detectarse, la disponibilidad de `audioTracks` varía según navegador y FocusTrace nunca verifica equivalencia ni exactitud/completitud de subtítulos o audiodescripciones. |
| Errores de formulario | La revisión estática observa estado inválido/`:user-invalid`, texto de error asociado mediante ARIA y metadatos de restricciones relevantes para la corrección. No lee valores de campos, no deduce todos los mensajes visuales o propios de la aplicación ni determina la suficiencia semántica de una sugerencia. |
| Foco visible | La cobertura runtime exige una transición real y de confianza con Tab/Shift+Tab, foco estable y capturas estables de la pestaña activa. El detector compara solo una región local limitada, por lo que píxeles sin cambios permanecen como REVIEW y no demuestran que no exista un indicador en otra zona del viewport. Focus Walk automático se excluye deliberadamente de esta regla. |
| Teclado / trampa | La cobertura runtime observa únicamente comportamiento real de puntero y Tab estándar. Controles equivalentes de teclado en otra zona, listeners delegados de frameworks, navegación no estándar y mecanismos de salida documentados siguen requiriendo revisión manual. |
| Cancelación del puntero | La cobertura runtime solo señala estado de activación ya observable antes de soltar/cancelar. Determinar si la activación es esencial, puede abortarse o puede deshacerse sigue siendo manual. |
| Estados dinámicos | El análisis estático no fuerza estados hover, pressed, checked o focus inactivos. Durante Trace, FocusTrace puede revisar el contraste medido de texto y no textual para los estados interactivos reales que se observen, pero no ejercita todos los estados ni todos los caminos posibles de la aplicación. La composición visual no textual no resoluble permanece para revisión manual en lugar de generar ruido runtime. |
| Contenido adicional en hover/foco | Trace observa únicamente contenido adicional que aparece realmente tras hover o foco correlacionado con el usuario. La asociación es acotada; mecanismos alternativos de cierre, comportamientos excepcionales y estados no observados siguen requiriendo revisión manual. |
| HTML | Opera sobre el DOM vivo ya parseado; el navegador puede haber reparado errores del HTML fuente. |
| ARIA | Deriva relaciones observables, pero no reproduce exactamente el árbol de accesibilidad interno ni la salida hablada de un lector de pantalla. |
| Runtime ARIA | Solo evalúa patrones modelados después de interacciones relevantes y usa una ventana de estabilización; no simula acciones arbitrarias. |
| Mensajes de estado | La revisión runtime se limita a texto visible y breve con señales de estado en ES/EN tras una activación real. No puede demostrar el significado de todos los mensajes, estados solo visuales/no textuales, la exposición exacta en el árbol de accesibilidad ni el anuncio real de un lector de pantalla. |
| Cambios de contexto | Trace correlaciona foco/input con rutas, diálogos y movimientos de foco DOM dentro de una ventana acotada. No demuestra causalidad del código de autor ni si un aviso previo satisface WCAG 3.2.2. |
| Propósito de entrada | Solo se validan secuencias explícitas de tokens `autocomplete` con apariencia de vocabulario estándar. La ausencia de `autocomplete`, las taxonomías personalizadas formadas solo por tokens desconocidos y si el campo realmente recopila información sobre el usuario quedan fuera del juicio automático. |
| Idioma de las partes | Solo se validan valores `lang` explícitos sobre texto de lenguaje humano renderizado. FocusTrace no deduce cambios de idioma ausentes a partir del propio texto y excluye deliberadamente contextos con apariencia de código. |
| APG | Es orientación informativa y las variantes opcionales no se fuerzan como si fueran requisitos universales. |
| Grid / Treegrid | La revisión es conservadora ante grids irregulares, virtualizados, spans e índices explícitos. |
| Runtime | Solo puede informar sobre caminos de interacción realmente observados. |
| Site Audit | El muestreo no equivale a comprobar todas las URLs. La comparación de navegación repetida ignora solapamientos parciales, mecanismos duplicados con el mismo conjunto exacto y cambios iniciados por el usuario; la comparación de identificación coherente se limita a destinos exactos y únicos de enlaces nativos en páginas con el mismo idioma principal declarado e ignora coincidencias ambiguas o duplicadas. |
| WCAG | PASS significa que pasa esa expectativa concreta, no todo el criterio WCAG. |
| EN 301 549 | No realiza una evaluación completa ni certifica conformidad. |

Consulta [`docs/RULES.md`](docs/RULES.md) para metodología y aplicabilidad detalladas, [`docs/RUNTIME_ARIA.md`](docs/RUNTIME_ARIA.md) para reglas runtime ARIA/APG y [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) para límites de arquitectura, datos y almacenamiento.

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
| `activeTab` | Chrome / Edge / Firefox | Analizar la página sobre la que el usuario activa FocusTrace y permitir evidencia local de pestaña visible para análisis explícitos, exportación de informes y revisión de foco visible con Tab real cuando esté disponible. |
| `scripting` | Chrome / Edge / Firefox | Inyectar la instrumentación local de análisis/runtime en la página activa. |
| `storage` | Chrome / Edge / Firefox | Guardar preferencias, estado local, auditorías acotadas, notas del auditor y evidencia de FocusTrace Memory. |
| `sidePanel` | Chrome / Edge | Mostrar la interfaz de depuración de FocusTrace en el panel lateral de Chromium. |

Firefox utiliza su integración nativa de sidebar en el manifest en lugar del permiso exclusivo de Chromium `sidePanel`.

Los builds de producción no necesitan permisos globales de host al instalarse. El acceso HTTP/HTTPS se declara como opcional y se solicita desde acciones explícitas del usuario. La captura amplia `<all_urls>` se solicita únicamente cuando una exportación visual la necesita y se elimina al finalizar cuando FocusTrace la adquirió para esa operación.

## Privacidad

Todo el análisis se ejecuta localmente en el navegador. FocusTrace no envía contenido de la página, datos del DOM, capturas ni interacciones grabadas a un servidor de FocusTrace ni a una API de IA de terceros.

El análisis de página completa prepara evidencia limitada de Estructura junto con el resultado del motor de reglas. FocusTrace Memory está activado por defecto, se puede desactivar y no caduca por antigüedad dentro de sus límites de capacidad. Las notas del auditor y la evidencia visual de Memory/informes permanecen locales salvo que el usuario exporte un informe o archivo JSON; las capturas lossless usadas para la comparación runtime de foco visible son temporales y no se persisten. Consulta [`PRIVACY.md`](PRIVACY.md) para la política de privacidad canónica y [`SECURITY.md`](SECURITY.md) para notificación responsable de vulnerabilidades.

## Licencia e identidad del proyecto

El código fuente de FocusTrace se distribuye bajo **GNU General Public License versión 3 únicamente (`GPL-3.0-only`)**. Consulta [`LICENSE`](LICENSE).

El nombre, el logo y la identidad del proyecto FocusTrace no se conceden mediante la licencia del código para usos que puedan hacer pasar un fork no oficial por la versión oficial. Consulta [`TRADEMARKS.md`](TRADEMARKS.md).

Las contribuciones son bienvenidas bajo la misma licencia. Consulta [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Probar el último build de desarrollo

Después de que CI termine correctamente para un push a `main`, GitHub Actions publica artefactos de desarrollo del commit exacto:

- `focustrace-chrome-dev`
- `focustrace-firefox-dev`

### Chrome

1. Abre **Actions** → **Dev Extension**.
2. Descarga `focustrace-chrome-dev` de la última ejecución correcta.
3. Descomprímelo.
4. Abre `chrome://extensions`, activa **Modo desarrollador** y pulsa **Cargar descomprimida**.
5. Selecciona la carpeta que contiene `manifest.json`.

### Build experimental de Firefox

1. Descarga y descomprime `focustrace-firefox-dev`.
2. Abre `about:debugging#/runtime/this-firefox`.
3. Selecciona **Cargar complemento temporal…**.
4. Selecciona el `manifest.json` del build.
5. Completa el smoke checklist de Firefox antes de considerar ese build como soportado.

Cada artefacto incluye `FOCUSTRACE_BUILD.txt` con el SHA de origen y el navegador objetivo. Los artefactos de desarrollo son previews sin firmar y se conservan durante 14 días.

## Desarrollo

Requisitos:

- Node.js 22
- npm

Instalar dependencias:

```bash
npm ci
```

Build de desarrollo:

```bash
npm run dev
npm run dev:firefox
```

Builds de producción:

```bash
npm run build
npm run build:edge
npm run build:firefox
```

Empaquetar artefactos:

```bash
npm run zip
npm run zip:edge
npm run zip:firefox
```

Validación principal:

```bash
npm run standards:validate
npm run capabilities:validate
npm run check
npm run lint
npm test
```

Gate de release:

```bash
npm run release:check
npm run release:check:full
```

Consulta [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) antes de crear una release o cambiar la visibilidad del repositorio.
