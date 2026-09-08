import {
  localizedRuleTitle as baseLocalizedRuleTitle,
  localizedScanIssue as baseLocalizedScanIssue,
} from './i18n-base';
import type { AppLanguage } from './i18n-base';
import {
  localizeIssueSourceCopy,
  localizedReferenceLabel as baseLocalizedReferenceLabel,
} from './i18n-source-copy';
import type { ScanIssue, StandardReference } from './types';

export * from './i18n-base';

const LANGUAGE_PART_TITLE_EN = 'Declared content language has a known primary language tag';
const LANGUAGE_PART_TITLE_ES = 'El idioma declarado del contenido tiene una etiqueta de idioma principal conocida';
const LANGUAGE_PART_DESCRIPTION_ES = 'Este fragmento de contenido declara explícitamente un idioma, pero su valor lang no comienza por una subetiqueta de idioma principal registrada por IANA como Type: language.';

export function localizedReferenceLabel(reference: StandardReference, language: AppLanguage): string {
  if (language === 'es') {
    if (reference.label === 'Language of Parts') return 'Idioma de las partes';
    if (reference.label === 'Element with lang attribute has valid language tag') {
      return 'El elemento con atributo lang tiene una etiqueta de idioma válida';
    }
  }
  return baseLocalizedReferenceLabel(reference, language);
}

const EXTRA_COPY_ES: Record<string, { title: string; description: string }> = {
  'FT-WARN-008': {
    title: 'El elemento HTML se utiliza fuera de su contexto semántico requerido',
    description: 'Este elemento HTML nativo está fuera del contexto en el que el HTML Living Standard define su semántica estructural. Revisa la relación padre/ancestro indicada en la evidencia.',
  },
  'FT-WARN-009': {
    title: 'La estructura semántica HTML incumple un modelo de contenido nativo',
    description: 'Esta estructura HTML nativa no respeta el modelo de hijos, agrupación u orden definido por el HTML Living Standard. Corrige la estructura indicada en la evidencia.',
  },
  'FT-WARN-010': {
    title: 'Hay contenido interactivo nativo anidado en una estructura incompatible',
    description: 'Esta estructura interactiva o de etiquetado contiene una combinación de descendientes que HTML prohíbe porque puede volver ambiguos el foco, la activación o las relaciones entre controles.',
  },
  'FT-WARN-011': {
    title: 'El elemento main nativo no tiene una jerarquía válida',
    description: 'Este elemento <main> tiene un ancestro no permitido por la definición HTML de un main jerárquicamente correcto. Revisa la estructura de ancestros indicada en la evidencia.',
  },
  'FT-WARN-012': {
    title: 'El rol ARIA explícito no puede resolverse de forma segura',
    description: 'El atributo role contiene un rol abstracto o no puede resolverse a ningún rol WAI-ARIA registrado y no abstracto aplicando el modelo estándar de tokens alternativos.',
  },
  'FT-WARN-013': {
    title: 'Se utiliza un atributo aria-* desconocido',
    description: 'Este atributo aria-* no existe en el registro WAI-ARIA sincronizado, por lo que no puede exponer de forma fiable el estado, nombre o relación que se pretendía.',
  },
  'FT-WARN-014': {
    title: 'Un estado o propiedad ARIA tiene un valor no válido',
    description: 'Este estado o propiedad ARIA utiliza un valor que no coincide con la gramática actual de WAI-ARIA que FocusTrace puede verificar de forma determinista.',
  },
  'FT-WARN-015': {
    title: 'Al rol ARIA le falta un estado o propiedad obligatoria',
    description: 'El rol ARIA explícito resuelto requiere un estado o propiedad que no está presente y que tampoco queda proporcionado por una semántica nativa equivalente del elemento.',
  },
  'FT-WARN-016': {
    title: 'La referencia ARIA por ID no resuelve una relación válida',
    description: 'Esta relación ARIA basada en IDs está vacía, no resuelve, crea un ciclo, tiene varios propietarios o apunta fuera de la relación de accesibilidad que requiere la propiedad.',
  },
  'FT-WARN-017': {
    title: 'El rol ARIA está fuera de su contexto padre de accesibilidad requerido',
    description: 'El rol ARIA resuelto no se encuentra dentro del contexto padre de accesibilidad exigido después de tener en cuenta wrappers transparentes y relaciones aria-owns válidas.',
  },
  'FT-WARN-018': {
    title: 'El contenedor ARIA expone un rol hijo de accesibilidad incompatible',
    description: 'Este contenedor ARIA expone un hijo semántico cuyo rol queda fuera del modelo de roles hijo permitido para ese contenedor.',
  },
  'FT-WARN-019': {
    title: 'El rango o estado de conjunto ARIA es internamente incoherente',
    description: 'El elemento expone valores ARIA de rango, posición o conjunto que se contradicen entre sí aunque cada atributo individual pueda ser sintácticamente válido.',
  },
  'FT-WARN-020': {
    title: 'El estado o propiedad ARIA no es compatible con el rol resuelto',
    description: 'Este estado o propiedad ARIA existe en WAI-ARIA, pero no está admitido por el rol explícito o nativo resuelto para el elemento. La semántica resultante queda indefinida y las tecnologías de asistencia pueden ignorar el estado previsto.',
  },
  'FT-WARN-021': {
    title: 'La relación ARIA y el estado expuesto son incoherentes',
    description: 'La relación ARIA resuelve correctamente, pero el estado expuesto por el elemento contradice esa relación o la disponibilidad actual del contenido relacionado. Revisa aria-invalid, aria-errormessage, aria-expanded y aria-controls según la evidencia.',
  },
  'FT-REVIEW-009': {
    title: 'El contenido de sección debería poder identificarse por su estructura',
    description: 'Este section o article no tiene un encabezado que le pertenezca ni un nombre accesible calculado. Revisa si la sección puede identificarse correctamente o si un contenedor genérico se ajustaría mejor al contenido.',
  },
  'FT-REVIEW-010': {
    title: 'Los landmarks repetidos deberían tener nombres accesibles diferenciables',
    description: 'Hay varios landmarks con el mismo rol y este no tiene un nombre accesible diferenciable. Revisa sus etiquetas para que los usuarios puedan distinguir las regiones al navegar por landmarks.',
  },
  'FT-REVIEW-011': {
    title: 'Los mecanismos de ayuda repetidos pueden cambiar de orden entre páginas',
    description: 'Los mismos mecanismos de ayuda observados aparecen en distinto orden relativo entre páginas muestreadas. Revisa si entran en el alcance de WCAG 3.2.6 y, si es así, conserva un orden relativo coherente.',
  },
  'FT-REVIEW-012': {
    title: 'La navegación principal puede necesitar un mecanismo de salto para teclado',
    description: 'Se ha detectado un bloque de navegación significativo antes del contenido principal sin un enlace de fragmento validado para saltarlo con teclado. Revisa si otro mecanismo satisface WCAG 2.4.1.',
  },
  'FT-REVIEW-013': {
    title: 'La navegación repetida puede cambiar de orden entre páginas',
    description: 'El mismo conjunto exacto de destinos de navegación repetidos aparece en distinto orden relativo entre páginas muestreadas. Revisa que se trate del mismo mecanismo y que el cambio no haya sido iniciado por el usuario antes de considerar un problema de WCAG 3.2.3.',
  },
  'FT-REVIEW-014': {
    title: 'Los tokens de propósito autocomplete estándar pueden estar mal formados',
    description: 'Este control utiliza vocabulario autocomplete estándar, pero la secuencia de tokens observada no es válida. Revisa si el campo recopila información sobre el usuario y, cuando aplique WCAG 1.3.5, expón su propósito mediante un valor válido y programáticamente determinable.',
  },
  'FT-REVIEW-015': {
    title: 'Una función repetida puede identificarse de forma incoherente entre páginas',
    description: 'Un enlace nativo observado de forma única apunta al mismo destino exacto en páginas muestreadas con el mismo idioma principal, pero su identificación cambia de forma sustancial. Confirma que se trate de la misma funcionalidad y, si es así, mantén etiquetas o nombres accesibles coherentes según WCAG 3.2.4.',
  },
  'FT-RUNTIME-006': {
    title: 'La interacción de arrastre requiere revisar una alternativa de puntero sencillo',
    description: 'Trace observó un arrastre real. Revisa si la misma funcionalidad puede realizarse con un puntero sencillo sin movimiento de arrastre, teniendo en cuenta las excepciones de WCAG 2.5.7.',
  },
};

const EXTRA_EVIDENCE_ES: Record<string, string> = {
  'FT-WARN-008': 'El elemento señalado no cumple el contexto padre o ancestro nativo exigido por HTML.',
  'FT-WARN-009': 'La estructura hija, agrupación u orden del elemento señalado no coincide con el modelo de contenido HTML nativo.',
  'FT-WARN-010': 'Se ha detectado contenido interactivo o etiquetable anidado en una combinación que HTML no permite.',
  'FT-WARN-011': 'El elemento <main> señalado se encuentra dentro de un ancestro no permitido por HTML.',
  'FT-WARN-012': 'El valor de role del elemento señalado no resuelve a un rol WAI-ARIA válido y no abstracto.',
  'FT-WARN-013': 'El elemento señalado utiliza un atributo aria-* que no existe en el registro WAI-ARIA sincronizado.',
  'FT-WARN-014': 'El estado o propiedad ARIA del elemento señalado contiene un valor no válido para su gramática.',
  'FT-WARN-015': 'Al rol ARIA resuelto del elemento señalado le falta un estado o propiedad obligatoria.',
  'FT-WARN-016': 'La relación ARIA basada en IDs del elemento señalado no resuelve de forma válida.',
  'FT-WARN-017': 'El rol ARIA del elemento señalado no se encuentra dentro de su contexto padre de accesibilidad requerido.',
  'FT-WARN-018': 'El contenedor ARIA señalado expone un rol hijo que no está permitido por su modelo de roles.',
  'FT-WARN-019': 'Los valores ARIA de rango, posición o conjunto del elemento señalado son internamente incoherentes.',
  'FT-WARN-020': 'El estado o propiedad ARIA del elemento señalado no es compatible con su rol resuelto.',
  'FT-WARN-021': 'La relación ARIA del elemento señalado resuelve, pero el estado expuesto contradice esa relación o el contenido relacionado.',
  'FT-REVIEW-009': 'La sección señalada no tiene un encabezado propio ni un nombre accesible calculado y necesita revisión contextual.',
  'FT-REVIEW-010': 'El landmark señalado repite un rol sin un nombre accesible suficientemente diferenciable.',
  'FT-REVIEW-011': 'El orden relativo observado de los mecanismos de ayuda no coincide entre las páginas comparadas.',
  'FT-REVIEW-012': 'Se ha detectado navegación significativa antes del contenido principal sin un mecanismo de salto por teclado validado.',
  'FT-REVIEW-013': 'El mismo conjunto exacto de destinos de navegación repetidos aparece en un orden relativo diferente entre las páginas comparadas.',
  'FT-REVIEW-014': 'El atributo autocomplete utiliza vocabulario estándar en una secuencia de tokens que necesita revisión.',
  'FT-REVIEW-015': 'La misma función de enlace observada de forma única presenta identificaciones sustancialmente distintas entre las páginas comparadas.',
  'FT-RUNTIME-006': 'Se observó un movimiento de arrastre real y debe revisarse si existe una alternativa equivalente sin arrastrar.',
};

const HELP_KIND_ES: Record<string, string> = {
  'human contact details': 'datos de contacto humano',
  'human contact mechanism': 'mecanismo de contacto humano',
  'self-help option': 'opción de autoayuda',
  'automated contact mechanism': 'mecanismo de contacto automatizado',
};

function localizeHelpOrder(order: string): string {
  return order
    .split(' → ')
    .map((part) => HELP_KIND_ES[part.trim()] ?? part.trim())
    .join(' → ');
}

function technicalEvidenceTokens(evidence: string): string[] {
  const matches = evidence.match(/<[^>]+>|aria-[a-z-]+(?:="[^"]*")?|role="[^"]*"|autocomplete="[^"]*"|#[A-Za-z][\w:.-]*/gi) ?? [];
  return [...new Set(matches)];
}

function localizedExtraEvidence(ruleId: string, evidence: string): string | undefined {
  if (ruleId === 'FT-WARN-008') {
    const directParent = evidence.match(/^(<[^>]+>) requires a direct (.+?) parent(?:; current parent is (.+?))?\.$/);
    if (directParent) {
      const parentRequirement = (directParent[2] ?? '')
        .replace(/\s+or\s+/gi, ' o ')
        .replace(/\s+and\s+/gi, ' y ');
      return `${directParent[1]} requiere un padre directo ${parentRequirement}${directParent[3] ? `; el padre actual es ${directParent[3]}` : ''}.`;
    }
  }

  if (ruleId === 'FT-WARN-016') {
    const missingId = evidence.match(/^(aria-[a-z-]+) references missing ID (#[A-Za-z][\w:.-]*)\.$/i);
    if (missingId) return `${missingId[1]} hace referencia al ID inexistente ${missingId[2]}.`;
  }

  if (ruleId === 'FT-WARN-020') {
    const unsupported = evidence.match(/^(aria-[a-z-]+) is not supported by (role="[^"]+")\.$/i);
    if (unsupported) return `${unsupported[1]} no es compatible con ${unsupported[2]}.`;
  }

  if (ruleId === 'FT-WARN-021') {
    const contradiction = evidence.match(/^(aria-[a-z-]+="[^"]+") contradicts the current availability of (#[A-Za-z][\w:.-]*)\.$/i);
    if (contradiction) return `${contradiction[1]} contradice la disponibilidad actual de ${contradiction[2]}.`;
  }

  if (ruleId === 'FT-REVIEW-011') {
    const comparison = evidence.match(/^Observed order: (.+?)\. Comparison page (https?:\/\/\S+): (.+)\.$/);
    if (comparison) {
      return `Orden observado: ${localizeHelpOrder(comparison[1] ?? '')}. Página comparada ${comparison[2]}: ${localizeHelpOrder(comparison[3] ?? '')}.`;
    }
  }

  if (ruleId === 'FT-REVIEW-012') {
    const missingTarget = evidence.match(/^Potential bypass link points to missing fragment target (#[A-Za-z][\w:.-]*)\.$/);
    if (missingTarget) return `El posible enlace de salto apunta al destino de fragmento inexistente ${missingTarget[1]}.`;

    const navigation = evidence.match(/^Navigation landmark before main exposes (\d+) sequential keyboard stops\. No validated keyboard bypass link to the primary main content was detected before that block\.$/);
    if (navigation) {
      return `El landmark de navegación anterior a main expone ${navigation[1]} paradas secuenciales de teclado. No se detectó antes de ese bloque un enlace de salto por teclado validado hacia el contenido principal.`;
    }
  }

  if (ruleId === 'FT-REVIEW-013') {
    const comparison = evidence.match(/^Observed navigation order: (.+?)\. Comparison page (https?:\/\/\S+): (.+)\.$/);
    if (comparison) {
      return `Orden de navegación observado: ${comparison[1]}. Página comparada ${comparison[2]}: ${comparison[3]}.`;
    }
  }

  if (ruleId === 'FT-REVIEW-014') {
    const match = evidence.match(/^autocomplete=("[^"]*")\./);
    if (match) return `Valor autocomplete observado: ${match[1]}. La secuencia de tokens estándar necesita revisión para confirmar que identifica correctamente el propósito del campo.`;
  }

  if (ruleId === 'FT-REVIEW-015') {
    const comparison = evidence.match(/^Function destination: (.+?)\. Observed identification: "(.+?)" \(([^)]+)\)\. Comparison page (https?:\/\/\S+): "(.+?)" \(([^)]+)\)\.$/);
    if (comparison) {
      return `Destino funcional: ${comparison[1]}. Identificación observada: "${comparison[2]}" (${comparison[3]}). Página comparada ${comparison[4]}: "${comparison[5]}" (${comparison[6]}).`;
    }
  }

  const fallback = EXTRA_EVIDENCE_ES[ruleId];
  if (!fallback) return undefined;
  const tokens = technicalEvidenceTokens(evidence);
  return tokens.length > 0 ? `${fallback} Datos técnicos: ${tokens.join(' · ')}.` : fallback;
}

function localizedLanguagePartIssue(issue: ScanIssue): ScanIssue {
  const evidenceMatch = issue.evidence?.match(/^lang = (.+?); primary subtag = (.+)$/);
  const evidence = evidenceMatch
    ? `lang = ${evidenceMatch[1]}; subetiqueta principal = ${evidenceMatch[2]}`
    : issue.evidence;
  return {
    ...issue,
    title: LANGUAGE_PART_TITLE_ES,
    description: `${LANGUAGE_PART_DESCRIPTION_ES} Criterio/fuente: WCAG 3.1.2 (AA).`,
    ...(evidence ? { evidence } : {}),
    references: issue.references.map((reference) => ({
      ...reference,
      label: localizedReferenceLabel(reference, 'es'),
    })),
  };
}

export function localizedRuleTitle(ruleId: string, fallback: string, language: AppLanguage): string {
  if (language === 'es' && ruleId === 'FT-WCAG-013' && fallback === LANGUAGE_PART_TITLE_EN) {
    return LANGUAGE_PART_TITLE_ES;
  }
  if (language === 'es' && EXTRA_COPY_ES[ruleId]) return EXTRA_COPY_ES[ruleId].title;
  return baseLocalizedRuleTitle(ruleId, fallback, language);
}

export function localizedScanIssue(issue: ScanIssue, language: AppLanguage): ScanIssue {
  if (language === 'es' && issue.ruleId === 'FT-WCAG-013') return localizedLanguagePartIssue(issue);

  const copy = language === 'es' ? EXTRA_COPY_ES[issue.ruleId] : undefined;
  if (!copy) {
    return localizeIssueSourceCopy(issue, baseLocalizedScanIssue(issue, language), language);
  }

  let localized = baseLocalizedScanIssue({
    ...issue,
    title: copy.title,
    description: copy.description,
  }, language);
  if (issue.evidence && localized.evidence === issue.evidence) {
    const evidence = localizedExtraEvidence(issue.ruleId, issue.evidence);
    if (evidence) localized = { ...localized, evidence };
  }
  return localizeIssueSourceCopy(issue, localized, language);
}
