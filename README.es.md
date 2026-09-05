<p align="right"><a href="./README.md">English</a> · <strong>Español</strong></p>

# FocusTrace

**Depura el foco de accesibilidad como depuras JavaScript.**

FocusTrace es una extensión de navegador local-first con su propio motor de reglas WCAG 2.2 y un depurador runtime para foco de teclado, navegación SPA y comportamiento dinámico de la interfaz.

El proyecto se encuentra en desarrollo activo. Los resultados automáticos se separan de forma intencionada entre fallos deterministas, señales que requieren revisión contextual y avisos de autoría, para que la extensión no afirme una certeza que no puede sostener.

FocusTrace es software libre con licencia **GNU GPL v3.0 únicamente**. La licencia del código fuente y la identidad del proyecto FocusTrace se tratan por separado; consulta [Licencia e identidad del proyecto](#licencia-e-identidad-del-proyecto).

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
| **Analizar página completa** | Documento activo | Ejecuta el motor local de reglas sobre la página actual. | FAIL, REVIEW, WARNING y PASS según cada regla. |
| **Analizar componente** | Subárbol DOM seleccionado visualmente | Ejecuta el mismo motor limitado al componente, conservando contexto global cuando una regla lo necesita. | Hallazgos limitados al ámbito seleccionado. |
| **Inspeccionar hallazgo** | Resultado actual | Localiza y resalta el elemento objetivo cuando sigue presente en la página. | Selector, elemento y resaltado visual. |
| **Nombre accesible** | Controles compatibles | Calcula el nombre accesible y conserva la fuente que ganó en la resolución. | Rol, nombre calculado, fuente y candidatos inspeccionados. |
| **Contraste de texto** | Texto renderizado con colores resolubles | Calcula ratio, umbral, foreground/background, tamaño y peso. | Evidencia estructurada reutilizable en UI e informes. |
| **Contraste no textual** | Límites, estados, gráficos o indicadores observables | Evalúa señales deterministas y mantiene como REVIEW las composiciones ambiguas. | Ratio, tipo de señal y contexto visual. |
| **Tamaño de objetivos de puntero** | Objetivos de puntero renderizados y observables | Mide la geometría del objetivo y la separación de WCAG 2.5.8, conservando las excepciones contextuales como REVIEW. | Tamaño en píxeles CSS, objetivo vecino y justificación de PASS/REVIEW. |
| **Sugerencia de color** | Fallos deterministas de contraste | Propone un ajuste sRGB pequeño que alcance el ratio requerido cuando puede calcularse con seguridad. | HEX/RGB medido, propuesta y copia. |
| **Cómo corregirlo** | Hallazgos con remediación disponible | Muestra estrategias concretas de corrección y una comprobación posterior. | Guía localizada ES/EN. |
| **Estructura** | Página actual | Expone encabezados, semántica y métricas estructurales bajo demanda. | Árbol H1-H6, sugerencias y recuentos. |
| **Trace** | Interacción real | Registra teclado/puntero, foco, mutaciones relevantes, rutas SPA, diálogos, candidatos a mensajes de estado, widgets ARIA y causalidad. | Eventos correlacionados por interacción. |
| **Foco virtual** | Widgets con `aria-activedescendant` compatibles | Registra cambios válidos de foco virtual como evidencia informativa sin convertirlos en movimiento de foco DOM ni hallazgo. | Destino virtual disponible en Trace, Journey y Graph. |
| **Focus Walk** | Página activa | Automatiza el recorrido secuencial de foco para generar evidencia de navegación. | Recorrido de destinos alcanzables. |
| **Replay** | Sesión Trace grabada | Reproduce la evidencia como lectura sin reejecutar acciones sobre la página. | Secuencia runtime reconstruida. |
| **Recorrido / Journey** | Sesión Trace | Ordena el movimiento de foco cronológicamente. | Historia navegable del foco. |
| **Grafo / Graph** | Sesión Trace | Representa conexiones observadas entre destinos de foco. | Grafo de navegación observada. |
| **Breakpoints de accesibilidad** | Trace | Puede pausar la grabación al capturar determinadas causas runtime. | Punto de parada asociado a evidencia determinista. |
| **Site Audit** | Sitio del mismo origen | Descubre, agrupa y muestrea páginas representativas y ejecuta el scanner real. | Hallazgos por página, familia y plantilla. |
| **FocusTrace Memory** | Análisis repetidos, opt-in | Mantiene historial local limitado para comparar persistencia, cambios, resoluciones y regresiones. | Observaciones, localizador y vista previa opcional. |
| **Informe** | Evidencia estática/runtime disponible | Consolida análisis, historias runtime y Estructura ya generada. | Vista de informe y exportaciones. |
| **PDF / TXT / Markdown** | Informe actual | Exporta evidencia reutilizando los datos disponibles sin volver a recorrer silenciosamente todo el DOM. | Artefactos compartibles. |

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

Trace almacena evidencia compacta: selector, rol, nombre accesible, tag, cambios relevantes, transición de ruta, eventos de diálogo/foco y resumen de arrastre. No guarda snapshots DOM completos ni la trayectoria completa de coordenadas del puntero.

| ID | Detecta / observa | Resultado | Referencia |
| --- | --- | --- | --- |
| `FT-RUNTIME-001` | El elemento con foco es eliminado durante una interacción. | REVIEW | WCAG 2.4.3 |
| `FT-RUNTIME-002` | El componente que mantiene el foco puede quedar completamente cubierto por otro contenido. | REVIEW | WCAG 2.4.11 |
| `FT-RUNTIME-003` | Una navegación SPA cambia de ruta sin actualizar el título del documento. | REVIEW | WCAG 2.4.2 |
| `FT-RUNTIME-004` | Una navegación SPA cambia de ruta sin mover el foco a un nuevo contexto. | REVIEW | WCAG 2.4.3 |
| `FT-RUNTIME-005` | El elemento que conserva el foco pasa a estar oculto durante la interacción. | REVIEW | WCAG 2.4.3 / 4.1.2 |
| `FT-RUNTIME-006` | Se observa un arrastre significativo sobre un objetivo con señales de ser arrastrable y debe revisarse si existe una alternativa de puntero sencillo. | REVIEW | WCAG 2.5.7 |
| `FT-RUNTIME-007` | Tras una activación real aparece un mensaje visible y breve con apariencia de estado, sin semántica live/status observable ni una relación activa `aria-errormessage`. | REVIEW | WCAG 4.1.3 |

`FT-RUNTIME-002` vuelve a comprobar el elemento mientras mantiene el foco tras scroll, resize y mutaciones DOM relevantes. `FT-RUNTIME-006` requiere movimiento real del puntero por encima del umbral de jitter; un `dragstart` nativo por sí solo no se utiliza para emitir la revisión.

`FT-RUNTIME-007` está correlacionada con la interacción real y usa una ventana breve de estabilización. Excluye diálogos, contenedores de estado de widgets ya modelados, mensajes que reciben foco o van seguidos de un cambio de foco/navegación/diálogo, y mensajes ya expuestos mediante `role="status"`, `role="alert"`, `role="log"`, semántica de progreso, `aria-live` activo o una relación `aria-errormessage` activa. `aria-busy` por sí solo no se considera exposición suficiente de un mensaje de estado. La clasificación de un mensaje como “estado” sigue dependiendo del significado, por lo que la regla permanece como **REVIEW** y no fabrica un FAIL WCAG automático.

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
| **Encabezados** | Reutiliza el análisis actual para mostrar árbol H1-H6, jerarquía y localización visual. |
| **Semántica** | Busca oportunidades concretas de HTML nativo e interacciones genéricas que necesitan revisión. |
| **Métricas** | Cuenta regiones semánticas, listas, formularios, botones, enlaces, campos, tablas e imágenes. |
| **Localización** | Un encabezado o conjunto de una métrica puede localizarse y resaltarse en la página. |
| **Bajo demanda** | Semántica y Métricas solo recorren el DOM tras **Analizar estructura** o **Actualizar**. |
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
| **Historial multipágina** | Conserva la revisión estática más reciente por URL normalizada en la auditoría activa. |
| **Reanálisis** | Sustituye la revisión/evidencia visual anterior de la misma URL en lugar de duplicarla. |
| **Evidencia visual limitada** | Puede guardar pequeños recortes locales asociados a revisiones para mantener contexto histórico. |
| **PDF completo de auditoría** | Exporta las páginas guardadas con su evidencia disponible. |

| Límite actual | Valor |
| --- | ---: |
| URLs descubiertas | 500 |
| Páginas analizadas | 30 |
| Muestras por familia de rutas | 3 |

El muestreo es evidencia representativa: no demuestra que todas las URLs sean idénticas ni ejecuta automáticamente Trace sobre todos los recorridos del sitio.

### FocusTrace Memory

Memory es opcional y está **desactivado por defecto**.

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
| **Borrado** | El historial puede borrarse desde Ajustes incluso con Memory desactivado. |

| Límite actual | Valor |
| --- | ---: |
| Observaciones por ámbito | 8 |
| Observaciones totales | 200 |
| Vistas previas visuales | 24 |
| Antigüedad máxima | 90 días |

Memory no almacena HTML de página, snapshots completos del DOM ni capturas de página completa.

### Informes y exportación

| Capacidad | Contenido / comportamiento |
| --- | --- |
| **Informe de sesión** | Combina hallazgos estáticos y evidencia runtime de la sesión actual. |
| **Historias de interacción** | Integra cadenas registradas por Trace, incluidas revisiones de mensajes de estado, warnings ARIA y reviews APG. |
| **Estructura del documento** | Reutiliza métricas y sugerencias compactas si Estructura ya se generó. |
| **Leyenda de reglas** | Explica familias `FT-WCAG-*`, `FT-WARN-*`, `FT-REVIEW-*`, `FT-RUNTIME-*`, `FT-RUNTIME-ARIA-*` y `FT-APG-*`. |
| **PDF** | Exportación imprimible de página o auditoría multipágina. |
| **TXT** | Exportación textual de la evidencia disponible. |
| **Markdown** | Exportación estructurada en Markdown. |
| **Evidencia visual opcional** | El PDF de una página puede incluir captura solo cuando el usuario lo solicita expresamente. |
| **Evidencia histórica multipágina** | Los PDFs de auditoría pueden reutilizar recortes locales limitados guardados durante cada análisis. |

### Idiomas y preferencias

| Capacidad | Comportamiento |
| --- | --- |
| **Español / Inglés** | Interfaz, explicaciones, evidencia humana y recomendaciones se mantienen en ambos idiomas. |
| **Identificadores técnicos** | IDs de reglas, selectores, tokens HTML/ARIA, ratios y colores permanecen canónicos. |
| **Tamaño de interfaz** | Preferencia persistente. |
| **Breakpoints** | Preferencias runtime persistentes. |
| **Memory** | Preferencia opt-in persistente. |

### Límites del análisis

| Área | Límite principal |
| --- | --- |
| Nombre accesible | Implementación dirigida a los casos requeridos por el motor, no una reproducción completa del motor de accesibilidad de un navegador. |
| Shadow DOM / slots | Cobertura no completa. |
| Iframes cross-origin | No se recorre por completo su contenido. |
| Contraste | Composiciones visuales complejas permanecen como REVIEW cuando no pueden resolverse con certeza. |
| Tamaño de objetivos | Usa geometría observable del DOM/layout y descubrimiento conservador de objetivos. Las excepciones por control equivalente, necesidad esencial o control del navegador, listeners de puntero exclusivos de frameworks y áreas de impacto no rectangulares complejas pueden seguir requiriendo revisión manual. |
| Estados dinámicos | El análisis estático no fuerza sistemáticamente todos los estados hover, pressed, checked o focus. |
| HTML | Opera sobre el DOM vivo ya parseado; el navegador puede haber reparado errores del HTML fuente. |
| ARIA | Deriva relaciones observables, pero no reproduce exactamente el árbol de accesibilidad interno ni la salida hablada de un lector de pantalla. |
| Runtime ARIA | Solo evalúa patrones modelados después de interacciones relevantes y usa una ventana de estabilización; no simula acciones arbitrarias. |
| Mensajes de estado | La revisión runtime se limita a texto visible y breve con señales de estado en ES/EN tras una activación real. No puede demostrar el significado de todos los mensajes, estados solo visuales/no textuales, la exposición exacta en el árbol de accesibilidad ni el anuncio real de un lector de pantalla. |
| APG | Es orientación informativa y las variantes opcionales no se fuerzan como si fueran requisitos universales. |
| Grid / Treegrid | La revisión es conservadora ante grids irregulares, virtualizados, spans e índices explícitos. |
| Runtime | Solo puede informar sobre caminos de interacción realmente observados. |
| Site Audit | El muestreo no equivale a comprobar todas las URLs. |
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
| `activeTab` | Chrome / Edge / Firefox | Analizar la página sobre la que el usuario activa FocusTrace y permitir evidencia de pestaña visible para un análisis explícito cuando esté disponible. |
| `scripting` | Chrome / Edge / Firefox | Inyectar la instrumentación local de análisis/runtime en la página activa. |
| `storage` | Chrome / Edge / Firefox | Guardar preferencias, estado local, auditorías acotadas y la evidencia opcional de FocusTrace Memory. |
| `sidePanel` | Chrome / Edge | Mostrar la interfaz de depuración de FocusTrace en el panel lateral de Chromium. |

Firefox utiliza su integración nativa de sidebar en el manifest en lugar del permiso exclusivo de Chromium `sidePanel`.

Los builds de producción no necesitan permisos globales de host al instalarse. El acceso HTTP/HTTPS se declara como opcional y se solicita desde acciones explícitas del usuario. La captura amplia `<all_urls>` se solicita únicamente cuando una exportación visual la necesita y se elimina al finalizar cuando FocusTrace la adquirió para esa operación.

## Privacidad

Todo el análisis se ejecuta localmente en el navegador. FocusTrace no envía contenido de la página, datos del DOM, capturas ni interacciones grabadas a un servidor de FocusTrace ni a una API de IA de terceros.

Estructura se genera bajo demanda. FocusTrace Memory es opt-in. La evidencia visual de Memory y de los informes es local y limitada. Consulta [`PRIVACY.md`](PRIVACY.md) para la política de privacidad canónica y [`SECURITY.md`](SECURITY.md) para notificación responsable de vulnerabilidades.

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

Cada artefacto incluye `FOCUSTRACE_BUILD.txt` con el SHA de origen y el navegador de destino. Los artefactos de desarrollo son previews sin firmar y se conservan durante 14 días.

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