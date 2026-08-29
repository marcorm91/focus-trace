import { tr, type AppLanguage } from './i18n';

export interface RuleLegendItem {
  id: 'wcag' | 'warn' | 'review' | 'runtime' | 'runtime-aria' | 'apg';
  pattern: string;
  description: string;
}

export interface RuleLegendNote {
  id: 'sequence' | 'result-severity' | 'external' | 'occurrence';
  title: string;
  description: string;
}

export interface RuleLegendCopy {
  title: string;
  intro: string;
  items: RuleLegendItem[];
  notes: RuleLegendNote[];
}

export function ruleLegendCopy(language: AppLanguage): RuleLegendCopy {
  return {
    title: tr(language, 'Rule legend and identifiers', 'Leyenda de reglas e identificadores'),
    intro: tr(
      language,
      'FocusTrace uses stable internal identifiers across Review, Trace, reports, exports and Memory. Every internal rule identifier starts with FT, meaning FocusTrace; FT identifiers are not official identifiers issued by WCAG, WAI-ARIA, APG or ACT.',
      'FocusTrace usa identificadores internos estables en Revisión, Trace, informes, exportaciones y Memory. Todo identificador interno empieza por FT, que significa FocusTrace; los identificadores FT no son identificadores oficiales de WCAG, WAI-ARIA, APG ni ACT.',
    ),
    items: [
      {
        id: 'wcag',
        pattern: 'FT-WCAG-###',
        description: tr(
          language,
          'FocusTrace rule directly mapped to evidence for a WCAG success criterion. It evaluates only the evidence described by that rule; it does not prove the whole criterion.',
          'Regla de FocusTrace vinculada directamente a evidencia de un criterio WCAG. Solo evalúa la evidencia definida por esa comprobación; no demuestra por sí sola todo el criterio.',
        ),
      },
      {
        id: 'warn',
        pattern: 'FT-WARN-###',
        description: tr(
          language,
          'Deterministic HTML, ARIA or authoring warning that should be corrected or reviewed without automatically claiming a WCAG failure.',
          'Aviso determinista de HTML, ARIA o autoría que debe corregirse o revisarse sin afirmar automáticamente un incumplimiento WCAG.',
        ),
      },
      {
        id: 'review',
        pattern: 'FT-REVIEW-###',
        description: tr(
          language,
          'Contextual signal that needs human judgement before it can be treated as an accessibility failure.',
          'Señal contextual que necesita criterio humano antes de poder tratarse como un fallo de accesibilidad.',
        ),
      },
      {
        id: 'runtime',
        pattern: 'FT-RUNTIME-###',
        description: tr(
          language,
          'Runtime rule based on behavior observed while Trace is recording, such as focus, dialog, route or dynamic DOM behavior.',
          'Regla runtime basada en comportamiento observado mientras Trace está grabando, como foco, diálogos, rutas o cambios dinámicos del DOM.',
        ),
      },
      {
        id: 'runtime-aria',
        pattern: 'FT-RUNTIME-ARIA-###',
        description: tr(
          language,
          'Deterministic contradiction in ARIA state or relationships observed after real interaction. These findings are warnings unless an independent WCAG rule proves a failure.',
          'Contradicción determinista en estados o relaciones ARIA observada tras una interacción real. Estos hallazgos son avisos salvo que una regla WCAG independiente demuestre un fallo.',
        ),
      },
      {
        id: 'apg',
        pattern: 'FT-APG-###',
        description: tr(
          language,
          'Behavior reviewed against WAI-ARIA Authoring Practices. APG is informative guidance, so these findings normally remain contextual reviews.',
          'Comportamiento revisado frente a WAI-ARIA Authoring Practices. APG es una guía informativa, por lo que estos hallazgos normalmente permanecen como revisiones contextuales.',
        ),
      },
    ],
    notes: [
      {
        id: 'sequence',
        title: tr(language, 'The number is internal.', 'El número es interno.'),
        description: tr(
          language,
          'For example, 010 in FT-APG-010 is the FocusTrace sequence number inside that family; it is not an official WCAG, WAI-ARIA or APG rule number.',
          'Por ejemplo, 010 en FT-APG-010 es el número de secuencia interno de FocusTrace dentro de esa familia; no es un número oficial de WCAG, WAI-ARIA ni APG.',
        ),
      },
      {
        id: 'result-severity',
        title: tr(language, 'Family, result and severity are different.', 'Familia, resultado y severidad son diferentes.'),
        description: tr(
          language,
          'The prefix identifies the evidence family. FAIL, WARNING, REVIEW and PASS describe the conclusion. Critical, Serious, Moderate and Minor describe FocusTrace impact or priority; they are not WCAG conformance levels.',
          'El prefijo identifica la familia de evidencia. FAIL, WARNING, REVIEW y PASS describen la conclusión. Critical, Serious, Moderate y Minor describen impacto o prioridad de FocusTrace; no son niveles de conformidad WCAG.',
        ),
      },
      {
        id: 'external',
        title: tr(language, 'External references stay separate.', 'Las referencias externas se mantienen separadas.'),
        description: tr(
          language,
          'References such as WCAG 2.4.3, ACT 2ee8b8 or WAI-ARIA aria-expanded belong to those standards. An FT identifier is always the FocusTrace rule that cites those sources where applicable.',
          'Referencias como WCAG 2.4.3, ACT 2ee8b8 o WAI-ARIA aria-expanded pertenecen a esos estándares. Un identificador FT siempre es la regla de FocusTrace que cita esas fuentes cuando corresponde.',
        ),
      },
      {
        id: 'occurrence',
        title: tr(language, 'Finding vs occurrence.', 'Hallazgo vs ocurrencia.'),
        description: tr(
          language,
          'A finding is one consolidated problem identity. An occurrence is each time Trace observed it. Repeated occurrences are counted without duplicating the report finding.',
          'Un hallazgo es una identidad de problema consolidada. Una ocurrencia es cada vez que Trace lo observó. Las ocurrencias repetidas se cuentan sin duplicar el hallazgo en el informe.',
        ),
      },
    ],
  };
}
