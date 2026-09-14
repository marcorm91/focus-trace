import type { RuleDefinition, } from './rule-catalog';
import type { StandardReference } from './types';

const resizeText: StandardReference = {
  type: 'WCAG',
  id: '1.4.4',
  label: 'Resize Text',
  level: 'AA',
  status: 'normative',
  url: 'https://www.w3.org/TR/WCAG22/#resize-text',
};

const orientation: StandardReference = {
  type: 'WCAG',
  id: '1.3.4',
  label: 'Orientation',
  level: 'AA',
  status: 'normative',
  url: 'https://www.w3.org/TR/WCAG22/#orientation',
};

const metaViewportAct: StandardReference = {
  type: 'ACT',
  id: 'b4f0c3',
  label: 'Meta viewport allows for zoom',
  status: 'normative',
  url: 'https://www.w3.org/WAI/standards-guidelines/act/rules/b4f0c3/',
};

const orientationAct: StandardReference = {
  type: 'ACT',
  id: 'b33eff',
  label: 'Orientation of the page is not restricted using CSS transforms',
  status: 'normative',
  url: 'https://www.w3.org/WAI/standards-guidelines/act/rules/b33eff/',
};

const viewportMeta: StandardReference = {
  type: 'HTML',
  id: 'meta-viewport',
  label: 'HTML viewport meta',
  status: 'normative',
  url: 'https://html.spec.whatwg.org/multipage/semantics.html#meta-viewport',
};

export const VIEWPORT_ZOOM_RULE: RuleDefinition = {
  id: 'FT-WCAG-021',
  title: 'Meta viewport preserves 200% zoom',
  severity: 'moderate',
  severityRationale: {
    en: 'An authored viewport restriction can prevent text enlargement up to 200% in affected user agents, materially limiting access for people with low vision. The check is bounded to the ACT-observable viewport syntax rather than claiming complete Resize Text conformance.',
    es: 'Una restricción de viewport definida por el autor puede impedir ampliar el texto hasta el 200 % en agentes de usuario afectados, limitando de forma relevante el acceso de personas con baja visión. La comprobación se limita a la sintaxis de viewport observable por ACT y no afirma conformidad completa con Resize Text.',
  },
  references: [resizeText, metaViewportAct, viewportMeta],
};

export const LARGE_SCALE_ZOOM_REVIEW_RULE: RuleDefinition = {
  id: 'FT-REVIEW-041',
  title: 'Meta viewport may restrict larger zoom levels',
  severity: 'minor',
  severityRationale: {
    en: 'A maximum-scale below 5 can reduce the enlargement range available in affected mobile user agents. Five-times zoom is retained as a compatibility and usability review threshold, not presented as a WCAG requirement.',
    es: 'Un maximum-scale inferior a 5 puede reducir el rango de ampliación disponible en agentes de usuario móviles afectados. La ampliación de cinco veces se conserva como umbral de revisión de compatibilidad y usabilidad, no como requisito WCAG.',
  },
  references: [resizeText, viewportMeta],
};

export const ORIENTATION_LOCK_REVIEW_RULE: RuleDefinition = {
  id: 'FT-REVIEW-042',
  title: 'Page may restrict operation to one display orientation',
  severity: 'serious',
  severityRationale: {
    en: 'Orientation-conditioned quarter-turn transforms can effectively lock content to portrait or landscape and create a substantial access barrier. The result remains REVIEW because an orientation can be essential and page controls or script may provide an alternative.',
    es: 'Las transformaciones de cuarto de vuelta condicionadas por orientación pueden bloquear de hecho el contenido a portrait o landscape y crear una barrera de acceso importante. El resultado permanece como REVIEW porque una orientación puede ser esencial y los controles o scripts de la página pueden ofrecer una alternativa.',
  },
  references: [orientation, orientationAct],
};

export const VIEWPORT_VISUAL_RULES: RuleDefinition[] = [
  VIEWPORT_ZOOM_RULE,
  LARGE_SCALE_ZOOM_REVIEW_RULE,
  ORIENTATION_LOCK_REVIEW_RULE,
];
