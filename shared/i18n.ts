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
    minor: 'menor',
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
  'FT-WCAG-010': 'El texto tiene suficiente contraste de color',
  'FT-WCAG-011': 'La información visual no textual necesaria tiene suficiente contraste',
  'FT-WARN-001': 'Se utiliza un rol ARIA obsoleto',
  'FT-WARN-002': 'El estado o propiedad ARIA está obsoleto para este rol',
  'FT-WARN-003': 'El estado o propiedad ARIA está prohibido para este rol',
  'FT-REVIEW-001': 'Un tabindex positivo puede crear un orden de foco inesperado',
  'FT-REVIEW-002': 'Los niveles de encabezado se saltan un nivel',
  'FT-REVIEW-003': 'El campo de formulario depende del placeholder como nombre accesible',
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
  return language === 'es' ? RULE_TITLES_ES[ruleId] ?? fallback : fallback;
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
  'FT-REVIEW-001': {
    description: 'Un tabindex positivo modifica el orden secuencial natural del foco. Revisa si el orden resultante conserva el significado y la operabilidad.',
  },
  'FT-REVIEW-002': {
    description: 'Saltar un nivel de encabezado no supone automáticamente un incumplimiento WCAG, pero puede indicar que la estructura necesita revisión manual.',
  },
  'FT-REVIEW-003': {
    description: 'El control tiene un nombre calculado programáticamente, pero procede únicamente del placeholder. Revisa si existe una etiqueta visible y persistente.',
  },
};

export function localizedScanIssue(
  issue: ScanIssue,
  language: AppLanguage,
): Pick<ScanIssue, 'title' | 'description' | 'evidence'> {
  if (language === 'en') {
    return {
      title: issue.title,
      description: withCriteria(issue.description, issue, language),
      ...(issue.evidence ? { evidence: issue.evidence } : {}),
    };
  }

  if (issue.ruleId === 'FT-WCAG-010') {
    return {
      title: localizedRuleTitle(issue.ruleId, issue.title, language),
      description: withCriteria(
        issue.outcome === 'fail'
          ? `El contraste del texto renderizado es ${issue.contrast?.ratio ?? '?'}:1, por debajo del mínimo requerido de ${issue.contrast?.requiredRatio ?? '?'}:1.`
          : 'FocusTrace no puede determinar con fiabilidad el contraste final entre el texto y su fondo. Revisa este caso manualmente en lugar de tratar un cálculo incierto como un fallo WCAG.',
        issue,
        language,
      ),
      ...(issue.evidence ? { evidence: issue.evidence } : {}),
    };
  }

  if (issue.ruleId === 'FT-WCAG-011') {
    const subject = issue.contrast?.subject ?? 'señal visual';
    return {
      title: localizedRuleTitle(issue.ruleId, issue.title, language),
      description: withCriteria(
        issue.outcome === 'fail'
          ? `El contraste observado para ${subject} es ${issue.contrast?.ratio ?? '?'}:1, por debajo del mínimo 3:1 exigido para la señal visual no textual evaluada.`
          : 'La señal visual no textual medida necesita revisión. FocusTrace conserva el ratio cuando puede calcularlo, pero no marca como fallo los casos donde no puede demostrar que ese borde, relleno, estado o gráfico sea imprescindible para comprender el componente.',
        issue,
        language,
      ),
      ...(issue.evidence ? { evidence: issue.evidence } : {}),
    };
  }

  const copy = SCAN_COPY_ES[issue.ruleId];
  return {
    title: localizedRuleTitle(issue.ruleId, issue.title, language),
    description: withCriteria(copy?.description ?? issue.description, issue, language),
    ...(issue.evidence ? { evidence: copy?.evidence ?? issue.evidence } : {}),
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
