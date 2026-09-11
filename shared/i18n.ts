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
    if (reference.label === 'Text Spacing') return 'Espaciado de texto';
    if (reference.label === 'Reflow') return 'Reajuste del contenido';
    if (reference.label === 'Important letter spacing in style attributes is wide enough') {
      return 'El espaciado de letras importante en atributos style es suficiente';
    }
    if (reference.label === 'Important line height in style attributes is wide enough') {
      return 'La altura de línea importante en atributos style es suficiente';
    }
    if (reference.label === 'Important word spacing in style attributes is wide enough') {
      return 'El espaciado de palabras importante en atributos style es suficiente';
    }
    if (reference.label === 'Audio-only and Video-only (Prerecorded)') {
      return 'Solo audio y solo vídeo (pregrabado)';
    }
    if (reference.label === 'Captions (Prerecorded)') return 'Subtítulos (pregrabados)';
    if (reference.label === 'Video element auditory content has captions') {
      return 'El contenido auditivo del elemento de vídeo tiene subtítulos';
    }
    if (reference.label === 'Audio Description or Media Alternative (Prerecorded)') {
      return 'Audiodescripción o alternativa para el medio (pregrabado)';
    }
    if (reference.label === 'Video element visual content has accessible alternative') {
      return 'El contenido visual del elemento de vídeo tiene una alternativa accesible';
    }
    if (reference.label === 'Captions (Live)') return 'Subtítulos (en directo)';
    if (reference.label === 'Audio Description (Prerecorded)') return 'Audiodescripción (pregrabada)';
    if (reference.label === 'Video element visual content has strict accessible alternative') {
      return 'El contenido visual del elemento de vídeo tiene una alternativa accesible estricta';
    }
    if (reference.label === 'Error Identification') return 'Identificación de errores';
    if (reference.label === 'Error message describes invalid form field value') {
      return 'El mensaje de error describe el valor no válido del campo de formulario';
    }
    if (reference.label === 'Error Suggestion') return 'Sugerencia ante errores';
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
  'FT-REVIEW-016': {
    title: 'El espaciado de texto inline con !important puede bloquear ajustes del usuario',
    description: 'Este texto renderizado usa una declaración inline !important de espaciado por debajo de la expectativa ACT. Revisa si la página ofrece un mecanismo equivalente para ajustar el espaciado y si WCAG 1.4.12 aplica al idioma o sistema de escritura antes de considerarlo un incumplimiento.',
  },
  'FT-REVIEW-017': {
    title: 'El audio pregrabado puede carecer de una alternativa equivalente observable',
    description: 'FocusTrace ha observado contenido probablemente pregrabado solo de audio sin una alternativa equivalente candidata en su marcado local. Revisa si existe una alternativa para medios temporales que presente la misma información antes de considerarlo un incumplimiento WCAG.',
  },
  'FT-REVIEW-018': {
    title: 'El vídeo pregrabado puede carecer de subtítulos observables',
    description: 'FocusTrace ha observado vídeo probablemente pregrabado sin una pista nativa de subtítulos observable. Revisa si contiene información auditiva y si los subtítulos se proporcionan mediante un reproductor personalizado o están incrustados en la imagen antes de considerarlo un incumplimiento WCAG.',
  },
  'FT-REVIEW-019': {
    title: 'El campo inválido observado puede carecer de una descripción textual de error asociada',
    description: 'FocusTrace ha observado un estado de campo inválido sin una descripción textual de error que pueda resolver mediante aria-errormessage o aria-describedby. Revisa cualquier mensaje visual o propio de la aplicación antes de considerarlo un incumplimiento WCAG.',
  },
  'FT-REVIEW-020': {
    title: 'El error de entrada observado necesita revisar la sugerencia de corrección',
    description: 'FocusTrace ha observado un campo inválido con texto de error asociado y metadatos de restricción relevantes para corregirlo. Revisa si el mensaje ofrece una sugerencia útil cuando se conoce, teniendo en cuenta la excepción de seguridad o propósito de WCAG.',
  },
  'FT-REVIEW-021': {
    title: 'El vídeo pregrabado puede carecer de una alternativa para el medio o audiodescripción observable',
    description: 'FocusTrace ha observado vídeo sincronizado probablemente pregrabado sin una audiodescripción ni alternativa equivalente candidata que pueda resolver en el marcado local. Revisa versiones audiodescritas, alternativas para el medio y el contenido visual significativo antes de considerarlo un incumplimiento WCAG.',
  },
  'FT-REVIEW-022': {
    title: 'El vídeo en directo puede carecer de subtítulos observables',
    description: 'FocusTrace ha observado vídeo nativo con señales sólidas de emisión en directo sin una pista nativa de subtítulos observable. Revisa subtítulos de reproductores personalizados o incrustados y si la emisión contiene información auditiva antes de considerarlo un incumplimiento WCAG.',
  },
  'FT-REVIEW-023': {
    title: 'El vídeo pregrabado puede carecer de una audiodescripción observable',
    description: 'FocusTrace ha observado vídeo sincronizado probablemente pregrabado sin una pista nativa de descripción ni un control cercano para una versión audiodescrita. Revisa el reproductor, versiones alternativas y el contenido visual real antes de considerarlo un incumplimiento WCAG.',
  },
  'FT-REVIEW-024': {
    title: 'El viewport estrecho puede perder contenido o exigir desplazamiento bidimensional',
    description: 'FocusTrace ha observado desbordamiento bidimensional no exceptuado o contenido renderizado recortado por un ancestro sin desplazamiento en el viewport estrecho actual. Revisa las alternativas responsive y las excepciones WCAG antes de considerarlo un incumplimiento.',
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
  'FT-REVIEW-016': 'Una declaración inline !important limita el espaciado de texto por debajo del valor evaluado para WCAG 1.4.12.',
  'FT-REVIEW-017': 'El audio probablemente pregrabado señalado no expone una alternativa equivalente candidata que FocusTrace pueda observar en su marcado local. La equivalencia del contenido sigue requiriendo revisión manual.',
  'FT-REVIEW-018': 'El vídeo probablemente pregrabado señalado no expone una pista nativa de subtítulos. Revisa subtítulos incrustados, reproductores personalizados y si el vídeo contiene realmente información auditiva.',
  'FT-REVIEW-019': 'El campo señalado expone un estado inválido, pero FocusTrace no ha resuelto texto de error no vacío mediante aria-errormessage o aria-describedby.',
  'FT-REVIEW-020': 'El campo señalado está inválido, tiene texto de error asociado y expone metadatos de restricción relevantes para la corrección; la suficiencia de la sugerencia requiere revisión humana.',
  'FT-REVIEW-021': 'El vídeo probablemente pregrabado señalado no expone una audiodescripción ni una alternativa para el medio candidata que FocusTrace pueda observar localmente. La equivalencia y cobertura del contenido visual requieren revisión manual.',
  'FT-REVIEW-022': 'El vídeo señalado presenta señales sólidas de contenido en directo y no expone una pista nativa de subtítulos. Revisa subtítulos personalizados o incrustados y la presencia real de información auditiva.',
  'FT-REVIEW-023': 'El vídeo probablemente pregrabado señalado no expone una pista nativa de descripción ni una versión audiodescrita observable. La precisión, integridad y aplicabilidad de la audiodescripción requieren revisión manual.',
  'FT-REVIEW-024': 'El viewport estrecho observado presenta desbordamiento bidimensional o contenido recortado que requiere revisión contextual.',
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

  if (ruleId === 'FT-REVIEW-016') {
    const normal = evidence.match(/^Inline (line-height): (.+?) !important computes to normal on wrapped text; ACT 78fd32 treats normal line height as below the 1\.5 × font-size expectation\.$/);
    if (normal) {
      return `Declaración inline ${normal[1]}: ${normal[2]} !important; el valor calculado es normal sobre texto con salto automático y ACT 78fd32 lo considera inferior a la expectativa de 1,5 × el tamaño de fuente.`;
    }
    const numeric = evidence.match(/^Inline (letter-spacing|word-spacing|line-height): (.+?) !important; computed (.+?); ([\d.-]+) × font-size; required at least ([\d.]+) × font-size\.$/);
    if (numeric) {
      return `Declaración inline ${numeric[1]}: ${numeric[2]} !important; valor calculado ${numeric[3]}; ${numeric[4]} × el tamaño de fuente; se requiere al menos ${numeric[5]} × el tamaño de fuente.`;
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

function localizedReflowEvidence(issue: ScanIssue): string | undefined {
  const evidence = issue.reflow;
  if (!evidence) return undefined;
  const viewport = `${evidence.viewportWidth} × ${evidence.viewportHeight} píxeles CSS`;
  if (evidence.kind === 'document-overflow') {
    const dimension = evidence.axis === 'horizontal' ? evidence.scrollWidth : evidence.scrollHeight;
    const dimensionLabel = evidence.axis === 'horizontal' ? 'anchura' : 'altura';
    const axisLabel = evidence.axis === 'horizontal' ? 'horizontal' : 'vertical';
    return `En un viewport de ${viewport} (${evidence.writingMode}), la ${dimensionLabel} del documento es de ${dimension} píxeles CSS y exige aproximadamente ${evidence.overflowPixels ?? 0} píxeles CSS de desplazamiento ${axisLabel}. Destinos no exceptuados que sobresalen: ${issue.targets.join(', ')}. Revisa si alguna excepción de layout bidimensional resulta esencial.`;
  }

  const clipping = evidence.clipping === 'complete' ? 'totalmente' : 'parcialmente';
  const axisLabel = evidence.axis === 'horizontal' ? 'horizontal' : 'vertical';
  return `En un viewport de ${viewport}, ${issue.targets[0] ?? 'el contenido señalado'} queda recortado ${clipping} por ${evidence.clippedBy ?? 'un ancestro sin desplazamiento'}; aproximadamente ${evidence.clippedPixels ?? 0} píxeles CSS no resultan observables en el eje ${axisLabel}.`;
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
    const evidence = issue.ruleId === 'FT-REVIEW-024'
      ? localizedReflowEvidence(issue)
      : localizedExtraEvidence(issue.ruleId, issue.evidence);
    if (evidence) localized = { ...localized, evidence };
  }
  return localizeIssueSourceCopy(issue, localized, language);
}
