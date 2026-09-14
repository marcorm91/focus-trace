import { tr, type AppLanguage } from '../../shared/i18n';
import type { ScanIssue } from '../../shared/types';
import {
  guidanceForIssue,
  reportFindingDescription,
  type FindingGuidance,
} from './finding-guidance';

export interface GuidanceExample {
  bad: string;
  good: string;
}

export interface EvidenceBasedGuidance extends FindingGuidance {
  observedProblem: string;
  reproduction: string;
  limitation: string;
  manualReview: boolean;
  example?: GuidanceExample;
}

function primaryTarget(issue: ScanIssue): string | undefined {
  const target = issue.targets[0]?.trim();
  return target || undefined;
}

function reproductionForIssue(issue: ScanIssue, language: AppLanguage): string {
  const target = primaryTarget(issue);
  const targetSuffix = target
    ? tr(language, ` Start from the recorded target ${target}.`, ` Parte del destino registrado ${target}.`)
    : '';

  if (issue.ruleId.startsWith('FT-RUNTIME-') || issue.ruleId.startsWith('FT-APG-')) {
    return tr(
      language,
      `Repeat the interaction that produced the recorded runtime evidence using the same keyboard, pointer or navigation path.${targetSuffix}`,
      `Repite la interacción que produjo la evidencia runtime registrada utilizando el mismo recorrido de teclado, puntero o navegación.${targetSuffix}`,
    );
  }

  if (issue.outcome === 'review') {
    return tr(
      language,
      `Reproduce the same rendered state and review the recorded evidence in its original page or component scope.${targetSuffix}`,
      `Reproduce el mismo estado renderizado y revisa la evidencia registrada en su ámbito original de página o componente.${targetSuffix}`,
    );
  }

  return tr(
    language,
    `Run the same page or component scan against the same rendered state and inspect the recorded evidence.${targetSuffix}`,
    `Ejecuta el mismo análisis de página o componente sobre el mismo estado renderizado y revisa la evidencia registrada.${targetSuffix}`,
  );
}

function limitationForIssue(issue: ScanIssue, language: AppLanguage): string {
  if (issue.outcome === 'review') {
    return tr(
      language,
      'FocusTrace has evidence that this condition needs inspection, but the final accessibility outcome depends on context that cannot be proven automatically. Treat it as a manual review, not as a deterministic failure.',
      'FocusTrace dispone de evidencia de que esta condición necesita inspección, pero el resultado final de accesibilidad depende de un contexto que no puede demostrarse automáticamente. Trátalo como revisión manual, no como un fallo determinista.',
    );
  }

  if (issue.outcome === 'warning') {
    return tr(
      language,
      'This is an authoring or semantics warning. It identifies a risky or non-conforming condition, but by itself it does not prove a user-facing accessibility failure. Verify the final semantics and behavior before closing the finding.',
      'Este es un aviso de autoría o semántica. Identifica una condición de riesgo o no conforme, pero por sí sola no demuestra un fallo de accesibilidad para el usuario. Verifica la semántica y el comportamiento finales antes de cerrar el hallazgo.',
    );
  }

  return tr(
    language,
    'The failure is based on evidence observed in the captured state. Re-run the same check after remediation and confirm that no documented exception or different rendered state changes the result.',
    'El fallo se basa en evidencia observada en el estado capturado. Repite la misma comprobación después de corregirlo y confirma que ninguna excepción documentada ni un estado renderizado diferente cambian el resultado.',
  );
}

function exampleForRule(ruleId: string): GuidanceExample | undefined {
  switch (ruleId) {
    case 'FT-WCAG-001':
      return {
        bad: '<title></title>',
        good: '<title>Checkout · Example Store</title>',
      };
    case 'FT-WCAG-002':
      return {
        bad: '<img src="chart.png">',
        good: '<img src="chart.png" alt="Sales increased 18% in Q3">',
      };
    case 'FT-WCAG-003':
      return {
        bad: '<button><svg aria-hidden="true">…</svg></button>',
        good: '<button aria-label="Close"><svg aria-hidden="true">…</svg></button>',
      };
    case 'FT-WCAG-004':
    case 'FT-REVIEW-003':
      return {
        bad: '<input placeholder="Email">',
        good: '<label for="email">Email</label><input id="email" type="email">',
      };
    case 'FT-WCAG-005':
      return {
        bad: '<a href="/pricing"><svg aria-hidden="true">…</svg></a>',
        good: '<a href="/pricing">View pricing</a>',
      };
    case 'FT-WCAG-006':
      return {
        bad: '<div aria-hidden="true"><button>Close</button></div>',
        good: '<div aria-hidden="true"><span>Decorative content</span></div>',
      };
    case 'FT-WCAG-007':
      return {
        bad: '<button aria-label="Remove item">Delete</button>',
        good: '<button aria-label="Delete item">Delete</button>',
      };
    case 'FT-WCAG-008':
    case 'FT-WCAG-009':
      return {
        bad: '<html lang="">',
        good: '<html lang="en">',
      };
    case 'FT-REVIEW-001':
      return {
        bad: '<button tabindex="3">Save</button>',
        good: '<button>Save</button>',
      };
    case 'FT-WARN-004':
      return {
        bad: '<input id="name"><div id="name">…</div>',
        good: '<input id="name"><div id="name-help">…</div>',
      };
    default:
      return undefined;
  }
}

export function evidenceBasedGuidanceForIssue(
  issue: ScanIssue,
  language: AppLanguage,
  baseGuidance: FindingGuidance = guidanceForIssue(issue, language),
): EvidenceBasedGuidance {
  return {
    ...baseGuidance,
    observedProblem: reportFindingDescription(issue, language),
    reproduction: reproductionForIssue(issue, language),
    limitation: limitationForIssue(issue, language),
    manualReview: issue.outcome !== 'fail',
    ...(exampleForRule(issue.ruleId) ? { example: exampleForRule(issue.ruleId) } : {}),
  };
}
