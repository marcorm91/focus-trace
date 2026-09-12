import type { RuleDefinition } from './rule-catalog';
import type { StandardReference } from './types';

const wcagInfoRelationships: StandardReference = {
  type: 'WCAG',
  id: '1.3.1',
  label: 'Info and Relationships',
  level: 'A',
  status: 'normative',
  url: 'https://www.w3.org/TR/WCAG22/#info-and-relationships',
};

const wcagNameRoleValue: StandardReference = {
  type: 'WCAG',
  id: '4.1.2',
  label: 'Name, Role, Value',
  level: 'A',
  status: 'normative',
  url: 'https://www.w3.org/TR/WCAG22/#name-role-value',
};

const aria: StandardReference = {
  type: 'WAI-ARIA',
  id: '1.3-editor-draft',
  label: 'WAI-ARIA 1.3 Editor Draft',
  status: 'editor-draft',
  url: 'https://w3c.github.io/aria/',
};

const ariaInHtml: StandardReference = {
  type: 'HTML',
  id: 'aria-in-html',
  label: 'ARIA in HTML · Author conformance requirements',
  status: 'normative',
  url: 'https://www.w3.org/TR/html-aria/#docconformance',
};

export const ARIA_HIDDEN_BODY_RULE: RuleDefinition = {
  id: 'FT-WCAG-016',
  title: 'Document body is not hidden from the accessibility tree',
  severity: 'critical',
  severityRationale: {
    en: 'Hiding the document body from the accessibility tree can remove essentially the entire page from assistive technologies while leaving it visually available.',
    es: 'Ocultar el body del documento del árbol de accesibilidad puede eliminar prácticamente toda la página para las tecnologías de asistencia mientras sigue disponible visualmente.',
  },
  references: [wcagInfoRelationships, wcagNameRoleValue, ariaInHtml],
};

export const ARIA_HOST_CONSTRAINT_RULE: RuleDefinition = {
  id: 'FT-WARN-023',
  title: 'ARIA host-language or conditional constraint is violated',
  severity: 'serious',
  severityRationale: {
    en: 'A role or state that conflicts with native HTML semantics can be ignored, repaired differently across platforms, or expose information that contradicts the real control state.',
    es: 'Un rol o estado que entra en conflicto con la semántica HTML nativa puede ignorarse, repararse de forma distinta entre plataformas o exponer información que contradice el estado real del control.',
  },
  references: [ariaInHtml, aria],
};

export const ARIA_DESCRIPTION_EQUIVALENCE_RULE: RuleDefinition = {
  id: 'FT-REVIEW-029',
  title: 'Braille or custom role description needs an equivalent semantic label',
  severity: 'serious',
  severityRationale: {
    en: 'Braille-specific labels and custom role descriptions can become confusing or unavailable when the corresponding non-braille accessible name, role, or role description is missing. FocusTrace keeps these authoring expectations as review where WAI-ARIA uses SHOULD-level guidance or exposure depends on user-agent repair.',
    es: 'Las etiquetas específicas de braille y las descripciones de rol personalizadas pueden resultar confusas o no estar disponibles cuando falta el nombre accesible, rol o descripción de rol equivalente no braille. FocusTrace mantiene estas expectativas como revisión cuando WAI-ARIA utiliza orientación de nivel SHOULD o la exposición depende de la reparación del agente de usuario.',
  },
  references: [aria],
};

export const ARIA_ROLE_STATE_RELATIONSHIP_RULES = [
  ARIA_HIDDEN_BODY_RULE,
  ARIA_HOST_CONSTRAINT_RULE,
  ARIA_DESCRIPTION_EQUIVALENCE_RULE,
] as const;
