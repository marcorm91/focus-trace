import type {
  RuntimeBreakpointId,
  ScanIssue,
  Severity,
  StandardReference,
} from './types';

export type AppLanguage = 'en' | 'es';
export const SETTINGS_STORAGE_KEY = 'focustrace:settings';

export function tr(language: AppLanguage, english: string, spanish: string): string {
  return language === 'es' ? spanish : english;
}

export function localeFor(language: AppLanguage): string {
  return language === 'es' ? 'es-ES' : 'en-US';
}

export function localizedSeverity(severity: Severity, language: AppLanguage): string {
  if (language === 'en') return severity;
  const labels: Record<Severity, string> = {
    critical: 'crítico',
    serious: 'grave',
    moderate: 'moderado',
    minor: 'leve',
    info: 'info',
  };
  return labels[severity];
}

export function localizedReferenceStatus(
  status: StandardReference['status'],
  language: AppLanguage,
): string | undefined {
  if (!status) return undefined;
  if (language === 'en') return status.replace('-', ' ');
  const labels: Record<NonNullable<StandardReference['status']>, string> = {
    normative: 'normativa',
    informative: 'informativa',
    proposed: 'propuesta',
    'editor-draft': 'borrador editorial',
  };
  return labels[status];
}

export function findingCriteria(issue: Pick<ScanIssue, 'references'>): string[] {
  const wcag = issue.references.filter((reference) => reference.type === 'WCAG');
  const source = wcag.length ? wcag : issue.references.filter((reference) => reference.type !== 'ACT');
  return source.map((reference) =>
    `${reference.type} ${reference.id}${reference.level ? ` (${reference.level})` : ''}`,
  );
}

function withCriteria(description: string, issue: ScanIssue, language: AppLanguage): string {
  const criteria = findingCriteria(issue);
  if (!criteria.length) return description;
  return `${description} ${tr(language, 'Criterion/source', 'Criterio/fuente')}: ${criteria.join(' · ')}.`;
}

const RULE_TITLES_EN: Record<string, string> = {
  'FT-WCAG-010': 'Text color contrast',
  'FT-WCAG-011': 'Non-text visual contrast',
};

const RULE_TITLES_ES: Record<string, string> = {
  'FT-WCAG-001': 'La página HTML tiene un título no vacío',
  'FT-WCAG-002': 'La imagen tiene un nombre accesible o está marcada como decorativa',
  'FT-WCAG-003': 'El botón tiene un nombre accesible no vacío',
  'FT-WCAG-004': 'El campo de formulario tiene un nombre accesible no vacío',
  'FT-WCAG-005': 'El enlace tiene un nombre accesible no vacío',
  'FT-WCAG-006': 'El contenido con aria-hidden contiene un elemento en la navegación secuencial del foco',
  'FT-WCAG-007': 'La etiqueta visible forma parte del nombre accesible',
  'FT-WCAG-008': 'La página HTML tiene un atributo lang no vacío',
  'FT-WCAG-009': 'El atributo lang contiene una etiqueta de idioma principal conocida',
  'FT-WCAG-010': 'Contraste de color del texto',
  'FT-WCAG-011': 'Contraste visual no textual',
  'FT-WARN-001': 'Se utiliza un rol ARIA obsoleto',
  'FT-WARN-002': 'El estado o propiedad ARIA está obsoleto para este rol',
  'FT-WARN-003': 'El estado o propiedad ARIA está prohibido para este rol',
  'FT-WARN-004': 'Se utiliza un id HTML duplicado',
  'FT-WARN-005': 'Se utiliza un elemento HTML totalmente obsoleto',
  'FT-WARN-006': 'Se utiliza un atributo HTML obsoleto y no conforme',
  'FT-WARN-007': 'Se utiliza una característica HTML obsoleta pero todavía conforme con aviso',
  'FT-REVIEW-001': 'Un tabindex positivo puede crear un orden de foco inesperado',
  'FT-REVIEW-002': 'Los niveles de encabezado se saltan un nivel',
  'FT-REVIEW-003': 'El campo de formulario depende del placeholder como nombre accesible',
  'FT-REVIEW-004': 'La página expone un landmark principal',
  'FT-REVIEW-005': 'Varios landmarks principales requieren revisión estructural',
  'FT-REVIEW-006': 'Una interacción de tipo botón debería priorizar la semántica nativa de button',
  'FT-REVIEW-007': 'Una navegación de tipo enlace debería priorizar la semántica nativa de enlace',
  'FT-REVIEW-008': 'Un elemento interactivo genérico requiere revisión semántica',
  'FT-RUNTIME-001': 'El elemento con foco se eliminó durante la interacción',
  'FT-RUNTIME-002': 'El componente con foco puede estar completamente oculto por otro contenido',
  'FT-RUNTIME-003': 'La ruta SPA cambió sin actualizar el título del documento',
  'FT-RUNTIME-004': 'La ruta SPA cambió sin mover el foco',
  'FT-RUNTIME-005': 'El elemento con foco pasó a estar oculto durante la interacción',
  'FT-APG-001': 'El diálogo se abrió mientras el foco permanecía fuera',
  'FT-APG-002': 'El foco salió de un diálogo modal abierto',
  'FT-APG-003': 'El diálogo se cerró sin restaurar el foco a un destino lógico',
};

export function localizedRuleTitle(ruleId: string, fallback: string, language: AppLanguage): string {
  return language === 'es'
    ? RULE_TITLES_ES[ruleId] ?? fallback
    : RULE_TITLES_EN[ruleId] ?? fallback;
}

const CONTRAST_REASONS_ES: Record<string, string> = {
  'A background image or gradient affects the rendered background.': 'Una imagen de fondo o un degradado afecta al fondo renderizado.',
  'Element or ancestor opacity affects the rendered colors.': 'La opacidad del elemento o de uno de sus ancestros afecta a los colores renderizados.',
  'mix-blend-mode affects the rendered colors.': 'La propiedad mix-blend-mode afecta a los colores renderizados.',
  'A CSS filter affects the rendered colors.': 'Un filtro CSS afecta a los colores renderizados.',
  'The backdrop behind the translucent element could not be resolved reliably.': 'No se pudo resolver con fiabilidad el fondo situado detrás del elemento translúcido.',
  'Element opacity could not be composited reliably.': 'No se pudo componer con fiabilidad la opacidad del elemento.',
  'The rendered background could not be resolved reliably.': 'No se pudo resolver con fiabilidad el fondo renderizado.',
  'The adjacent background could not be resolved reliably.': 'No se pudo resolver con fiabilidad el fondo adyacente.',
  'The adjacent color outside the component could not be resolved.': 'No se pudo resolver el color adyacente exterior al componente.',
  'Graphic opacity affects the rendered non-text color.': 'La opacidad del gráfico afecta al color no textual renderizado.',
};

export function localizedContrastReason(
  reason: string | undefined,
  language: AppLanguage,
): string | undefined {
  if (!reason || language === 'en') return reason;
  const exact = CONTRAST_REASONS_ES[reason];
  if (exact) return exact;

  const dynamicReasons: Array<[RegExp, string]> = [
    [/^Background color (.+) could not be resolved\.$/, 'No se pudo resolver el color de fondo $1.'],
    [/^Text color (.+) could not be resolved\.$/, 'No se pudo resolver el color del texto $1.'],
    [/^Text size (.+) could not be resolved\.$/, 'No se pudo resolver el tamaño del texto $1.'],
    [/^Pseudo-element background (.+) could not be resolved\.$/, 'No se pudo resolver el fondo del pseudoelemento $1.'],
    [/^Outline color (.+) could not be resolved\.$/, 'No se pudo resolver el color del contorno $1.'],
    [/^Graphic fill (.+) could not be resolved\.$/, 'No se pudo resolver el relleno del gráfico $1.'],
    [/^Graphic stroke (.+) could not be resolved\.$/, 'No se pudo resolver el trazo del gráfico $1.'],
  ];
  for (const [pattern, replacement] of dynamicReasons) {
    if (pattern.test(reason)) return reason.replace(pattern, replacement);
  }
  return undefined;
}

const SCAN_COPY_ES: Record<string, { description: string; evidence?: string }> = {
  'FT-WCAG-001': {
    description: 'El primer <title> HTML falta o contiene únicamente espacios en blanco.',
    evidence: 'El documento no expone un título de página no vacío.',
  },
  'FT-WCAG-002': {
    description: 'La imagen se expone como contenido gráfico, pero tiene un nombre accesible vacío y no está marcada como decorativa.',
    evidence: 'No se ha detectado un nombre accesible no vacío ni un tratamiento decorativo válido.',
  },
  'FT-WCAG-003': {
    description: 'El botón se expone a las tecnologías de asistencia con un nombre accesible vacío.',
    evidence: 'No se ha detectado ningún mecanismo válido que proporcione un nombre accesible no vacío al botón.',
  },
  'FT-WCAG-004': {
    description: 'El campo de formulario tiene un nombre accesible vacío.',
    evidence: 'No se ha detectado una etiqueta programática ni otro mecanismo válido de nombre accesible.',
  },
  'FT-WCAG-005': {
    description: 'El enlace tiene un nombre accesible vacío, por lo que su propósito no puede determinarse a partir de su nombre.',
    evidence: 'No se ha detectado ningún nombre accesible no vacío para el enlace.',
  },
  'FT-WCAG-006': {
    description: 'Un elemento oculto para las tecnologías de asistencia permanece en la navegación secuencial por teclado.',
    evidence: 'Existe un elemento enfocable dentro de contenido marcado con aria-hidden="true".',
  },
  'FT-WCAG-007': {
    description: 'El control tiene una etiqueta visible que no está incluida en el nombre accesible utilizado por tecnologías de asistencia y entrada por voz.',
    evidence: 'La etiqueta visible no está contenida en el nombre accesible calculado.',
  },
  'FT-WCAG-008': {
    description: 'El elemento HTML raíz no tiene un atributo lang con un valor no vacío.',
    evidence: 'El idioma principal de la página no está declarado mediante lang.',
  },
  'FT-WCAG-009': {
    description: 'El valor lang de la página no comienza por una subetiqueta de idioma principal registrada por IANA.',
    evidence: 'La etiqueta de idioma principal no se reconoce en el registro IANA utilizado por FocusTrace.',
  },
  'FT-WARN-001': {
    description: 'Este rol ARIA explícito está marcado como obsoleto en el registro WAI-ARIA actual.',
  },
  'FT-WARN-002': {
    description: 'Este estado o propiedad ARIA está marcado como obsoleto para el rol explícito resuelto.',
  },
  'FT-WARN-003': {
    description: 'Este estado o propiedad ARIA figura como prohibido para el rol explícito resuelto. Revisa la semántica utilizada.',
  },
  'FT-WARN-004': {
    description: 'El mismo valor id se utiliza en más de un elemento del documento. HTML exige que los IDs no vacíos sean únicos; los identificadores duplicados pueden hacer que relaciones basadas en ID o la navegación se resuelvan de forma impredecible.',
  },
  'FT-WARN-005': {
    description: 'La página utiliza un elemento que el HTML Living Standard clasifica como totalmente obsoleto y no conforme para autores. Sustitúyelo por la alternativa HTML/CSS/JavaScript moderna indicada en la evidencia.',
  },
  'FT-WARN-006': {
    description: 'La página utiliza un atributo o combinación atributo-elemento que el HTML Living Standard clasifica como obsoleto y no conforme. Elimínalo o sustitúyelo por la alternativa moderna indicada.',
  },
  'FT-WARN-007': {
    description: 'La página conserva una característica HTML heredada que el estándar todavía tolera únicamente como “obsoleta pero conforme” y que los validadores deben mostrar con aviso. Conviene eliminarla o modernizarla.',
  },
  'FT-REVIEW-001': {
    description: 'Un tabindex positivo modifica el orden secuencial natural del foco. Revisa si el orden resultante conserva el significado y la operabilidad.',
  },
  'FT-REVIEW-002': {
    description: 'Saltar un nivel de encabezado no supone automáticamente un incumplimiento WCAG, pero puede indicar que la estructura necesita revisión manual.',
  },
  'FT-REVIEW-003': {
    description: 'El control tiene un nombre calculado programáticamente, pero procede únicamente del placeholder. Revisa si existe una etiqueta visible y persistente.',
  },
  'FT-REVIEW-004': {
    description: 'La página no expone un elemento <main> visible ni un landmark role="main". Revisa si el contenido principal debe identificarse mediante un landmark principal para facilitar orientación y navegación.',
  },
  'FT-REVIEW-005': {
    description: 'La página expone más de un landmark principal. Revisa si debe existir una única región principal o si las regiones múltiples son realmente necesarias y están claramente diferenciadas.',
  },
  'FT-REVIEW-006': {
    description: 'Este elemento parece ejecutar una acción con semántica de botón. Prioriza <button type="button"> cuando sea posible; role="button" debe quedar como alternativa cuando no pueda utilizarse el elemento nativo y requiere reproducir correctamente teclado y foco.',
  },
  'FT-REVIEW-007': {
    description: 'Este elemento parece realizar navegación con semántica de enlace. Prioriza <a href="…"> para conservar el comportamiento nativo del navegador y de las tecnologías de asistencia; usa role="link" solo cuando no sea posible utilizar un enlace nativo.',
  },
  'FT-REVIEW-008': {
    description: 'FocusTrace ha detectado interacción sobre un elemento genérico, pero no puede determinar si representa una acción, navegación u otro widget. Revisa la intención antes de asignar semántica y prioriza el elemento HTML nativo correspondiente cuando exista.',
  },
};

const EVIDENCE_SUBJECT_ES: Record<string, string> = {
  text: 'texto',
  'input value': 'valor del campo',
  'textarea value': 'valor del área de texto',
  'selected option': 'opción seleccionada',
  placeholder: 'placeholder',
  'generated text': 'texto generado',
  graphic: 'gráfico',
  'icon fill': 'relleno del icono',
  'icon stroke': 'trazo del icono',
  'component visual boundary': 'límite visual del componente',
  'component fill': 'relleno del componente',
  'component border': 'borde del componente',
  'observed focus indicator': 'indicador de foco observado',
  'observed focus outline': 'contorno de foco observado',
  'control icons': 'iconos del control',
  'CSS graphic': 'gráfico CSS',
  'canvas graphic': 'gráfico canvas',
};

const OBSERVED_STATE_ES: Record<string, string> = {
  hover: 'hover',
  active: 'activo',
  focus: 'foco',
  'focus-visible': 'foco visible',
  checked: 'marcado',
  unchecked: 'no marcado',
  expanded: 'expandido',
  collapsed: 'contraído',
  selected: 'seleccionado',
  unselected: 'no seleccionado',
  pressed: 'pulsado',
  unpressed: 'no pulsado',
};

function localizedEvidenceSubject(subject: string | undefined): string {
  if (!subject) return 'señal visual';
  return EVIDENCE_SUBJECT_ES[subject] ?? subject;
}

function localizedSemanticSignal(signal: string): string {
  const normalized = signal.trim();
  if (normalized === 'click handler') return 'controlador de clic';
  if (normalized === 'keyboard handler') return 'controlador de teclado';
  if (normalized === 'navigation-like click handler') return 'controlador de clic con comportamiento de navegación';
  if (normalized === 'interactive behavior') return 'comportamiento interactivo';
  return normalized;
}

function localizedSemanticEvidence(evidence: string): string | undefined {
  const match = evidence.match(/^Current <([^>]+)>; signals: (.*?); confidence=(high|medium)\.\s*(.*)$/);
  if (!match) return undefined;

  const tag = match[1]!;
  const rawSignals = match[2] ?? 'interactive behavior';
  const confidence = match[3] ?? 'medium';
  const rawRecommendation = match[4] ?? '';
  const signals = (rawSignals || 'interactive behavior')
    .split(',')
    .map(localizedSemanticSignal)
    .join(', ');
  const recommendation = rawRecommendation === 'Native recommendation withheld because the interaction intent is ambiguous.'
    ? 'No se ofrece una recomendación de elemento nativo porque la intención de la interacción es ambigua.'
    : rawRecommendation
      .replace('Recommended native element:', 'Elemento nativo recomendado:')
      .replace('Alternative semantics:', 'Semántica alternativa:')
      .replace('with complete keyboard and focus behavior.', 'con comportamiento completo de teclado y foco.')
      .replace('with complete keyboard and navigation behavior.', 'con comportamiento completo de teclado y navegación.');

  return `Elemento actual <${tag}>; señales: ${signals}; confianza=${confidence === 'high' ? 'alta' : 'media'}. ${recommendation}`;
}

function localizedObservedStateSuffix(evidence: string | undefined): string {
  const match = evidence?.match(/Observed visual state:\s*([^.]+)\./);
  if (!match?.[1]) return '';
  const states = match[1].split(',').map((state) => OBSERVED_STATE_ES[state.trim()] ?? state.trim());
  return ` Estado visual observado: ${states.join(', ')}.`;
}

function localizedContrastEvidence(issue: ScanIssue): string | undefined {
  const contrast = issue.contrast;
  if (!contrast) return undefined;
  const subject = localizedEvidenceSubject(contrast.subject);
  const suffix = localizedObservedStateSuffix(issue.evidence);

  if (issue.ruleId === 'FT-WCAG-010') {
    if (contrast.ratio == null) {
      return `No se pudo resolver con fiabilidad el contraste renderizado de ${subject}. Ratio mínimo requerido: ${contrast.requiredRatio}:1.${suffix}`;
    }
    const visual = [
      contrast.foreground ? `primer plano ${contrast.foreground}` : undefined,
      contrast.background ? `fondo ${contrast.background}` : undefined,
      contrast.fontSizePx != null ? `fuente ${contrast.fontSizePx}px / ${contrast.fontWeight ?? '?'}` : undefined,
    ].filter(Boolean).join('; ');
    return `${subject}: contraste ${contrast.ratio}:1; requerido ${contrast.requiredRatio}:1${visual ? `; ${visual}` : ''}.${suffix}`;
  }

  if (issue.ruleId === 'FT-WCAG-011') {
    if (contrast.ratio == null) {
      return `No se pudo calcular un ratio determinista para ${subject}. Ratio mínimo requerido: ${contrast.requiredRatio}:1.${suffix}`;
    }
    const visual = [
      contrast.foreground ? `color visual ${contrast.foreground}` : undefined,
      contrast.background ? `color adyacente ${contrast.background}` : undefined,
    ].filter(Boolean).join('; ');
    return `${subject}: ${contrast.ratio}:1; requerido ${contrast.requiredRatio}:1${visual ? `; ${visual}` : ''}.${suffix}`;
  }

  return undefined;
}

function localizedDynamicEvidence(issue: ScanIssue): string | undefined {
  if (!issue.evidence) return undefined;
  if (['FT-REVIEW-006', 'FT-REVIEW-007', 'FT-REVIEW-008'].includes(issue.ruleId)) {
    return localizedSemanticEvidence(issue.evidence) ?? issue.evidence;
  }
  if (issue.ruleId === 'FT-WARN-001') {
    return issue.evidence.replace('; deprecated since ARIA ', '; obsoleto desde ARIA ');
  }
  if (issue.ruleId === 'FT-WARN-002' || issue.ruleId === 'FT-WARN-003') {
    return issue.evidence.replace(' on role=', ' en role=');
  }
  if (issue.ruleId === 'FT-WARN-004') {
    return issue.evidence.replace(
      /^id=(.+) is used by (\d+) elements in this document\.$/,
      'id=$1 se utiliza en $2 elementos de este documento.',
    );
  }
  if (issue.ruleId === 'FT-REVIEW-002') {
    return issue.evidence.replace(
      /^Document starts with (H[1-6]) before any H1\.$/,
      'El documento comienza con $1 antes de cualquier H1.',
    );
  }
  if (issue.ruleId === 'FT-REVIEW-005') {
    return issue.evidence.replace(
      /^(\d+) exposed main landmarks were detected\. Native HTML should not expose multiple visible <main> elements; multiple ARIA main landmarks require clear structural purpose and distinguishable labels\.$/,
      'Se han detectado $1 landmarks main expuestos. El HTML nativo no debería exponer varios elementos <main> visibles; varios landmarks main de ARIA requieren un propósito estructural claro y etiquetas diferenciables.',
    );
  }
  return issue.evidence;
}

function localizedIssueEvidence(
  issue: ScanIssue,
  copy: { description: string; evidence?: string } | undefined,
): string | undefined {
  if (!issue.evidence) return undefined;
  return copy?.evidence
    ?? localizedContrastEvidence(issue)
    ?? localizedDynamicEvidence(issue);
}

export function localizedScanIssue(
  issue: ScanIssue,
  language: AppLanguage,
): ScanIssue {
  if (issue.contrastState) {
    const { kind, state } = issue.contrastState;
    const textState = kind === 'text';
    const title = language === 'es'
      ? textState
        ? 'Revisar el contraste de texto en estados no observados'
        : 'Revisar el contraste no textual en estados no observados'
      : textState
        ? 'Review text contrast in unobserved states'
        : 'Review non-text contrast in unobserved states';
    const description = language === 'es'
      ? `FocusTrace ha encontrado una regla CSS para el estado ${state}, pero ese estado no estaba activo durante el análisis; por tanto, no se ha medido ningún fallo de contraste. Activa el estado y revisa su resultado visual manualmente.`
      : `FocusTrace found a CSS rule for the ${state} state, but that state was not active during analysis, so no contrast failure was measured. Activate the state and review its visual result manually.`;
    return {
      ...issue,
      title,
      description: withCriteria(description, issue, language),
      ...(issue.evidence ? { evidence: issue.evidence } : {}),
    };
  }

  if (language === 'en') {
    return {
      ...issue,
      title: localizedRuleTitle(issue.ruleId, issue.title, language),
      description: withCriteria(issue.description, issue, language),
      ...(issue.evidence ? { evidence: issue.evidence } : {}),
    };
  }

  if (issue.ruleId === 'FT-WCAG-010') {
    return {
      ...issue,
      title: localizedRuleTitle(issue.ruleId, issue.title, language),
      description: withCriteria(
        issue.outcome === 'fail'
          ? `El contraste del texto renderizado es ${issue.contrast?.ratio ?? '?'}:1, por debajo del mínimo requerido de ${issue.contrast?.requiredRatio ?? '?'}:1.`
          : 'FocusTrace no puede determinar con fiabilidad el contraste final entre el texto y su fondo. Revisa este caso manualmente en lugar de tratar un cálculo incierto como un fallo WCAG.',
        issue,
        language,
      ),
      ...(issue.evidence ? { evidence: localizedIssueEvidence(issue, undefined) } : {}),
    };
  }

  if (issue.ruleId === 'FT-WCAG-011') {
    const subject = localizedEvidenceSubject(issue.contrast?.subject);
    return {
      ...issue,
      title: localizedRuleTitle(issue.ruleId, issue.title, language),
      description: withCriteria(
        issue.outcome === 'fail'
          ? `El contraste observado para ${subject} es ${issue.contrast?.ratio ?? '?'}:1, por debajo del mínimo 3:1 exigido para la señal visual no textual evaluada.`
          : 'La señal visual no textual medida necesita revisión. FocusTrace conserva el ratio cuando puede calcularlo, pero no marca como fallo los casos donde no puede demostrar que ese borde, relleno, estado o gráfico sea imprescindible para comprender el componente.',
        issue,
        language,
      ),
      ...(issue.evidence ? { evidence: localizedIssueEvidence(issue, undefined) } : {}),
    };
  }

  const copy = SCAN_COPY_ES[issue.ruleId];
  return {
    ...issue,
    title: localizedRuleTitle(issue.ruleId, issue.title, language),
    description: withCriteria(copy?.description ?? issue.description, issue, language),
    ...(issue.evidence ? { evidence: localizedIssueEvidence(issue, copy) } : {}),
  };
}

const BREAKPOINTS_ES: Record<RuntimeBreakpointId, { label: string; description: string }> = {
  'focused-node-removed': {
    label: 'Se elimina el nodo con foco',
    description: 'Pausa cuando el elemento que tiene el foco se elimina del DOM.',
  },
  'focus-fell-back-to-body': {
    label: 'El foco cae al body',
    description: 'Pausa cuando el foco termina en el body del documento después de una interacción.',
  },
  'dialog-opened-without-focus': {
    label: 'El diálogo se abre sin foco',
    description: 'Pausa cuando se abre un diálogo pero el foco no se establece dentro de él.',
  },
  'modal-focus-escape': {
    label: 'El foco sale del modal',
    description: 'Pausa cuando el foco se mueve fuera de un diálogo modal abierto.',
  },
  'route-changed-without-focus-move': {
    label: 'La ruta SPA cambia sin mover el foco',
    description: 'Pausa cuando cambia una ruta sin que después se observe una transición de foco.',
  },
  'focused-element-became-hidden': {
    label: 'El elemento con foco pasa a estar oculto',
    description: 'Pausa cuando el elemento con foco, o uno de sus ancestros, pasa a estar oculto.',
  },
};

export function localizedBreakpoint(
  id: RuntimeBreakpointId,
  fallback: { label: string; description: string },
  language: AppLanguage,
): { label: string; description: string } {
  return language === 'es' ? BREAKPOINTS_ES[id] : fallback;
}
