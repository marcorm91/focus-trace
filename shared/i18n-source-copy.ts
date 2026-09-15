import { localizedAuditEvidence } from './i18n-audit-evidence';
import { localizedContrastReason, type AppLanguage } from './i18n-base';
import type { ScanIssue, StandardReference } from './types';

const REFERENCE_LABEL_ES: Record<string, string> = {
  'Meaningful Sequence': 'Secuencia significativa',
  'Sensory Characteristics': 'Características sensoriales',
  "Sign Language (Prerecorded)": "Lengua de signos (pregrabada)",
  "Extended Audio Description (Prerecorded)": "Audiodescripción ampliada (pregrabada)",
  "Media Alternative (Prerecorded)": "Alternativa para el medio (pregrabada)",
  "Audio-only (Live)": "Solo audio (en directo)",
  "Identify Purpose": "Identificar el propósito",
  "Images of Text": "Imágenes de texto",
  "Contrast (Enhanced)": "Contraste (mejorado)",
  "Low or No Background Audio": "Sonido de fondo bajo o ausente",
  "Visual Presentation": "Presentación visual",
  "Images of Text (No Exception)": "Imágenes de texto (sin excepciones)",
  "Character Key Shortcuts": "Atajos de teclado con caracteres",
  "No Timing": "Sin límites de tiempo",
  "Interruptions": "Interrupciones",
  "Re-authenticating": "Reautenticación",
  "Timeouts": "Tiempos de espera",
  "Three Flashes or Below Threshold": "Tres destellos o por debajo del umbral",
  "Three Flashes": "Tres destellos",
  "Animation from Interactions": "Animación de las interacciones",
  "Multiple Ways": "Múltiples vías",
  "Location": "Ubicación",
  "Link Purpose (Link Only)": "Propósito de los enlaces (solo enlaces)",
  "Section Headings": "Encabezados de sección",
  "Focus Not Obscured (Enhanced)": "Foco no oculto (mejorado)",
  "Focus Appearance": "Apariencia del foco",
  "Pointer Gestures": "Gestos del puntero",
  "Motion Actuation": "Activación mediante movimiento",
  "Target Size (Enhanced)": "Tamaño del objetivo (mejorado)",
  "Concurrent Input Mechanisms": "Mecanismos de entrada simultáneos",
  "Unusual Words": "Palabras inusuales",
  "Abbreviations": "Abreviaturas",
  "Reading Level": "Nivel de lectura",
  "Pronunciation": "Pronunciación",
  "Change on Request": "Cambios a petición",
  "Error Prevention (Legal, Financial, Data)": "Prevención de errores (legales, financieros, de datos)",
  "Help": "Ayuda",
  "Error Prevention (All)": "Prevención de errores (todos)",
  "Redundant Entry": "Entrada redundante",
  "Accessible Authentication (Minimum)": "Autenticación accesible (mínima)",
  "Accessible Authentication (Enhanced)": "Autenticación accesible (mejorada)",
  "Parsing (Obsolete and removed)": "Procesamiento (obsoleto y eliminado)",

  "ARIA Authoring Practices Guide · Providing Accessible Names and Descriptions": "Guía de prácticas de autoría ARIA · Nombres y descripciones accesibles",
  "ARIA in HTML · Author conformance requirements": "ARIA en HTML · Requisitos de conformidad para autores",
  "Audio Control": "Control del audio",
  "Audio or video element avoids automatically playing audio": "El elemento de audio o vídeo evita reproducir audio automáticamente",
  "Content on Hover or Focus": "Contenido al pasar el puntero o recibir el foco",
  "Element in sequential focus order has visible focus": "El elemento del orden secuencial de foco tiene un indicador de foco visible",
  "Focus Visible": "Foco visible",
  "Focusable element has no keyboard trap via standard navigation": "El elemento enfocable no atrapa el teclado durante la navegación estándar",
  "HTML Living Standard · Headings and sections": "Estándar HTML · Encabezados y secciones",
  "HTML Living Standard · Tabular data": "Estándar HTML · Datos tabulares",
  "HTML Living Standard · The iframe element": "Estándar HTML · El elemento iframe",
  "HTML Living Standard · The object element": "Estándar HTML · El elemento object",
  "HTML accesskey attribute": "Atributo HTML accesskey",
  "HTML form control labeling and fieldset/legend semantics": "Etiquetado de controles HTML y semántica de fieldset/legend",
  "HTML viewport meta": "Metadatos HTML del viewport",
  "Iframe element has accessible name": "El elemento iframe tiene nombre accesible",
  "Iframe elements with identical accessible names have equivalent purpose": "Los elementos iframe con nombres accesibles idénticos tienen un propósito equivalente",
  "Iframe with negative tabindex has no focusable content": "El iframe con tabindex negativo no contiene contenido enfocable",
  "Keyboard": "Teclado",
  "Keyboard (No Exception)": "Teclado (sin excepciones)",
  "Meta element has no refresh delay": "El elemento meta no tiene un retraso de actualización",
  "Meta viewport allows for zoom": "Los metadatos del viewport permiten ampliar",
  "No Keyboard Trap": "Sin trampas para el foco del teclado",
  "Object element rendering non-text content has non-empty accessible name": "El elemento object que muestra contenido no textual tiene un nombre accesible no vacío",
  "Orientation": "Orientación",
  "Orientation of the page is not restricted using CSS transforms": "La orientación de la página no se restringe mediante transformaciones CSS",
  "Pointer Cancellation": "Cancelación del puntero",
  "Scrollable element is keyboard accessible": "El elemento desplazable es accesible mediante teclado",
  "Timing Adjustable": "Tiempo ajustable",
  "WAI-ARIA 1.3 Editor Draft · Accessible name requirements": "WAI-ARIA 1.3 · Borrador editorial · Requisitos de nombre accesible",
  "WAI-ARIA · region role": "WAI-ARIA · Rol region",
  "WAI-ARIA · table, grid and cell roles": "WAI-ARIA · Roles de tabla, cuadrícula y celda",
  "WCAG 2.2 · 1.3.1 Info and Relationships": "WCAG 2.2 · 1.3.1 Información y relaciones",

  'Page Titled': 'Página titulada',
  'HTML page has non-empty title': 'La página HTML tiene un título no vacío',
  'Non-text Content': 'Contenido no textual',
  'Image has non-empty accessible name': 'La imagen tiene un nombre accesible no vacío',
  'Name, Role, Value': 'Nombre, rol y valor',
  'Button has non-empty accessible name': 'El botón tiene un nombre accesible no vacío',
  'Form field has non-empty accessible name': 'El campo de formulario tiene un nombre accesible no vacío',
  'Link Purpose (In Context)': 'Propósito del enlace (en contexto)',
  'Link has non-empty accessible name': 'El enlace tiene un nombre accesible no vacío',
  'Link in context is descriptive': 'El enlace en contexto describe su propósito',
  'Element with aria-hidden has no content in sequential focus navigation': 'El elemento con aria-hidden no contiene contenido en la navegación secuencial del foco',
  'Label in Name': 'Etiqueta en el nombre',
  'Visible label is part of accessible name': 'La etiqueta visible forma parte del nombre accesible',
  'Language of Page': 'Idioma de la página',
  'HTML page has lang attribute': 'La página HTML tiene atributo lang',
  'HTML page lang attribute has valid language tag': 'El atributo lang de la página HTML contiene una etiqueta de idioma válida',
  'Identify Input Purpose': 'Identificar el propósito de la entrada',
  'Autocomplete attribute has valid value': 'El atributo autocomplete tiene un valor válido',
  'Contrast (Minimum)': 'Contraste (mínimo)',
  'Use of Color': 'Uso del color',
  'Pause, Stop, Hide': 'Pausar, detener u ocultar',
  'Reflow': 'Reajuste del contenido',
  'Resize Text': 'Cambio de tamaño del texto',
  'Non-text Contrast': 'Contraste no textual',
  'Target Size (Minimum)': 'Tamaño del objetivo (mínimo)',
  'Bypass Blocks': 'Saltar bloques',
  'Focus Order': 'Orden del foco',
  'Info and Relationships': 'Información y relaciones',
  'Headings and Labels': 'Encabezados y etiquetas',
  'Labels or Instructions': 'Etiquetas o instrucciones',
  'Focus Not Obscured (Minimum)': 'Foco no oculto (mínimo)',
  'Dragging Movements': 'Movimientos de arrastre',
  'Status Messages': 'Mensajes de estado',
  'On Focus': 'Al recibir el foco',
  'On Input': 'Al introducir datos',
  'Consistent Help': 'Ayuda coherente',
  'Consistent Navigation': 'Navegación coherente',
  'Consistent Identification': 'Identificación coherente',
  'WAI-ARIA 1.3 Editor Draft': 'WAI-ARIA 1.3 · borrador editorial',
  'WAI-ARIA 1.3 Editor Draft · Roles model': 'WAI-ARIA 1.3 · borrador editorial · Modelo de roles',
  'WAI-ARIA 1.3 Editor Draft · States and properties': 'WAI-ARIA 1.3 · borrador editorial · Estados y propiedades',
  'WAI-ARIA 1.3 Editor Draft · Required states and properties': 'WAI-ARIA 1.3 · borrador editorial · Estados y propiedades obligatorios',
  'WAI-ARIA 1.3 Editor Draft · Allowed accessibility child roles': 'WAI-ARIA 1.3 · borrador editorial · Roles hijo de accesibilidad permitidos',
  'WAI-ARIA 1.3 Editor Draft · Required accessibility parent role': 'WAI-ARIA 1.3 · borrador editorial · Rol padre de accesibilidad requerido',
  'WAI-ARIA 1.3 Editor Draft · State/property and ID reference processing': 'WAI-ARIA 1.3 · borrador editorial · Procesamiento de estados, propiedades y referencias por ID',
  'Dialog (Modal) Pattern': 'Patrón de diálogo modal',
  'HTML Living Standard · The id attribute': 'HTML Living Standard · El atributo id',
  'HTML Living Standard · The main element': 'HTML Living Standard · El elemento main',
  'HTML Living Standard · The button element': 'HTML Living Standard · El elemento button',
  'HTML Living Standard · Links created by a and area elements': 'HTML Living Standard · Enlaces creados por los elementos a y area',
  'HTML Living Standard · Obsolete features': 'HTML Living Standard · Características obsoletas',
  'HTML Living Standard · Content models': 'HTML Living Standard · Modelos de contenido',
  'HTML Living Standard · Element index and permitted parents': 'HTML Living Standard · Índice de elementos y padres permitidos',
  'HTML Living Standard · Interactive content': 'HTML Living Standard · Contenido interactivo',
  'HTML Living Standard · Sections': 'HTML Living Standard · Secciones',
  'ARIA Authoring Practices Guide · Read Me First': 'Guía de prácticas de autoría ARIA · Leer antes de empezar',
  'ARIA Authoring Practices Guide · Landmark Regions': 'Guía de prácticas de autoría ARIA · Regiones landmark',
};

export function localizedReferenceLabel(reference: StandardReference, language: AppLanguage): string {
  if (language === 'en') return reference.label;
  return REFERENCE_LABEL_ES[reference.label] ?? reference.label;
}

function localizeReferences(references: StandardReference[], language: AppLanguage): StandardReference[] {
  if (language === 'en') return references;
  return references.map((reference) => ({
    ...reference,
    label: localizedReferenceLabel(reference, language),
  }));
}

function technicalTokens(text: string): string[] {
  const matches = text.match(
    /<[^>]+>|aria-[a-z-]+(?:="[^"]*")?|role="[^"]*"|#[A-Za-z][\w:.-]*|\bH[1-6]\b|\btabindex="?-?\d+"?|\b\d+(?:\.\d+)?:1\b|rgba?\([^)]*\)|#[0-9a-f]{3,8}|"[^"]{1,80}"/gi,
  ) ?? [];
  return [...new Set(matches)];
}

function looksLikeEnglishProse(text: string): boolean {
  return /\b(the|this|that|is|are|was|were|has|have|with|without|from|into|outside|inside|requires|required|recommended|current|detected|missing|obsolete|conforming|element|landmark|accessible|focus|page|property|state|should|could|cannot|must|used|authors|only|unexpected|source|rule|title|generated|description|review|warning|failure|available|supported)\b/i.test(text);
}

function localizeObsoleteDetail(detail: string): string | undefined {
  const localized = detail
    .replace(/ is entirely obsolete and must not be used by authors\./g, ' está totalmente obsoleto y no debe utilizarse en código de autor.')
    .replace(/ is obsolete and must not be used by authors\./g, ' está obsoleto y no debe utilizarse en código de autor.')
    .replace(/ uses an obsolete-but-conforming JavaScript MIME declaration\./g, ' utiliza una declaración MIME de JavaScript obsoleta pero todavía conforme.')
    .replace(/ does not satisfy the obsolete-but-conforming legacy-anchor constraints and is non-conforming\./g, ' no cumple las restricciones heredadas de anclas obsoletas pero conformes y no es conforme.')
    .replace(/ is obsolete and non-conforming/g, ' está obsoleto y no es conforme')
    .replace(/ is obsolete but conforming/g, ' está obsoleto pero sigue siendo conforme')
    .replace(/ and must trigger a conformance-checker warning/g, ' y debe generar un aviso del validador de conformidad')
    .replace(/ only with no type or type="text\/javascript"/g, ' solo cuando no existe type o type="text/javascript"')
    .replace(/ under the legacy fragment-target constraints/g, ' según las restricciones heredadas de destino de fragmento')
    .replace(/ for legacy compatibility/g, ' por compatibilidad heredada')
    .replace(/; only border="0" is retained as obsolete-but-conforming\./g, '; solo border="0" se conserva como obsoleto pero conforme.')
    .replace(/; only UTF-8 is retained as obsolete-but-conforming\./g, '; solo UTF-8 se conserva como obsoleto pero conforme.')
    .replace(/; only text\/css is retained as obsolete-but-conforming\./g, '; solo text/css se conserva como obsoleto pero conforme.')
    .replace(/ for this value\/type combination\./g, ' para esta combinación de valor y type.');

  if (!looksLikeEnglishProse(localized)) return localized;
  return undefined;
}

function localizeModernization(replacement: string): string | undefined {
  const exact: Record<string, string> = {
    'Remove border="0" and use CSS when border styling is needed.': 'Elimina border="0" y utiliza CSS cuando sea necesario definir el borde.',
    'Remove charset; conforming HTML documents and scripts use UTF-8.': 'Elimina charset; los documentos HTML y scripts conformes utilizan UTF-8.',
    'Remove language="JavaScript"; JavaScript is the default scripting language.': 'Elimina language="JavaScript"; JavaScript es el lenguaje de script predeterminado.',
    'Omit type for JavaScript modules/classic scripts where the HTML syntax allows it.': 'Omite type en módulos y scripts JavaScript clásicos cuando la sintaxis HTML lo permita.',
    'Remove type="text/css"; CSS is the default style language.': 'Elimina type="text/css"; CSS es el lenguaje de estilos predeterminado.',
    'Use id instead of the legacy anchor name attribute.': 'Utiliza id en lugar del atributo heredado name del ancla.',
    'Remove the border attribute and use CSS.': 'Elimina el atributo border y utiliza CSS.',
    'Remove charset; HTML documents and scripts are required to use UTF-8.': 'Elimina charset; los documentos HTML y scripts deben utilizar UTF-8.',
    'Remove language; use type only for non-JavaScript data blocks where appropriate.': 'Elimina language; utiliza type solo para bloques de datos que no sean JavaScript cuando corresponda.',
    'Remove type for CSS; use <script> for non-CSS data blocks.': 'Elimina type para CSS; utiliza <script> para bloques de datos que no sean CSS.',
    'Use id instead.': 'Utiliza id en su lugar.',
  };
  if (exact[replacement]) return exact[replacement];

  const numberInput = replacement.match(/^Remove (maxlength|size) from number inputs unless legacy-user-agent support is intentionally required\.$/);
  if (numberInput) {
    return `Elimina ${numberInput[1]} de los campos numéricos salvo que se necesite expresamente compatibilidad con agentes de usuario heredados.`;
  }

  return undefined;
}

function localizedObsoleteEvidence(evidence: string): string {
  const parts = evidence.match(/^(.*?) Suggested modernization: (.*)$/s);
  if (!parts) return fallbackTechnicalEvidence(evidence);

  const detail = localizeObsoleteDetail(parts[1] ?? '');
  const modernization = localizeModernization(parts[2] ?? '');
  if (detail && modernization) return `${detail} Modernización sugerida: ${modernization}`;
  if (detail) return `${detail} Modernización sugerida: revisa la alternativa HTML/CSS moderna indicada por el estándar.`;

  return fallbackTechnicalEvidence(evidence, 'Se ha detectado una característica HTML obsoleta. Revisa su sustitución por una alternativa HTML/CSS actual.');
}

function fallbackTechnicalEvidence(
  evidence: string,
  prefix = 'La evidencia original contiene datos técnicos generados por FocusTrace que necesitan revisión.',
): string {
  const tokens = technicalTokens(evidence);
  return tokens.length > 0 ? `${prefix} Datos técnicos: ${tokens.join(' · ')}.` : prefix;
}

function localizeResidualEvidence(ruleId: string, evidence: string): string {
  const translated = localizedAuditEvidence(evidence, 'es');
  if (translated !== evidence) return translated;
  if (ruleId === 'FT-REVIEW-003') {
    const match = evidence.match(/^Accessible name (.+) is sourced from (placeholder|aria-placeholder)\.$/);
    if (match) return `El nombre accesible ${match[1]} procede de ${match[2]}.`;
  }

  if (ruleId === 'FT-REVIEW-004') {
    if (evidence === 'No exposed main landmark was detected. Prefer a native <main> element for the primary content when the document structure allows it.') {
      return 'No se ha detectado ningún landmark main expuesto. Prioriza un elemento <main> nativo para el contenido principal cuando la estructura del documento lo permita.';
    }
  }

  if (ruleId === 'FT-WARN-005' || ruleId === 'FT-WARN-006' || ruleId === 'FT-WARN-007') {
    return localizedObsoleteEvidence(evidence);
  }

  if (!looksLikeEnglishProse(evidence)) return evidence;
  return fallbackTechnicalEvidence(evidence);
}

function spanishFallbackTitle(ruleId: string): string {
  return `Hallazgo de accesibilidad ${ruleId}`;
}

function spanishFallbackDescription(): string {
  return 'FocusTrace ha detectado una condición de accesibilidad que requiere revisión. Consulta la evidencia técnica y las referencias normativas para determinar la corrección adecuada.';
}

function localizeContrast(
  contrast: ScanIssue['contrast'],
  language: AppLanguage,
): ScanIssue['contrast'] {
  if (!contrast?.reason || language === 'en') return contrast;
  const reason = localizedContrastReason(contrast.reason, language)
    ?? (looksLikeEnglishProse(contrast.reason)
      ? 'El contexto visual no se ha podido resolver de forma determinista. Revisa este caso manualmente.'
      : contrast.reason);
  return { ...contrast, reason };
}

export function localizeIssueSourceCopy(
  source: ScanIssue,
  localized: ScanIssue,
  language: AppLanguage,
): ScanIssue {
  if (language === 'en') return localized;

  const title = localized.title === source.title && looksLikeEnglishProse(localized.title)
    ? spanishFallbackTitle(source.ruleId)
    : localized.title;
  const description = localized.description.startsWith(source.description) && looksLikeEnglishProse(source.description)
    ? spanishFallbackDescription() + localized.description.slice(source.description.length)
    : localized.description;
  const evidence = localized.evidence && source.evidence && localized.evidence === source.evidence
    ? localizeResidualEvidence(source.ruleId, localized.evidence)
    : localized.evidence;
  const contrast = localizeContrast(localized.contrast, language);

  return {
    ...localized,
    title,
    description,
    ...(evidence ? { evidence } : {}),
    ...(contrast ? { contrast } : {}),
    references: localizeReferences(localized.references, language),
  };
}
