import type { RuleDefinition } from './rule-catalog';
import type { StandardReference } from './types';

const ariaRolesReference: StandardReference = {
  type: 'WAI-ARIA',
  id: 'roles',
  label: 'WAI-ARIA 1.3 Editor Draft · Roles model',
  status: 'editor-draft',
  url: 'https://w3c.github.io/aria/#roles',
};

const ariaStatesReference: StandardReference = {
  type: 'WAI-ARIA',
  id: 'states_and_properties',
  label: 'WAI-ARIA 1.3 Editor Draft · States and properties',
  status: 'editor-draft',
  url: 'https://w3c.github.io/aria/#states_and_properties',
};

const ariaRequiredReference: StandardReference = {
  type: 'WAI-ARIA',
  id: 'requiredState',
  label: 'WAI-ARIA 1.3 Editor Draft · Required states and properties',
  status: 'editor-draft',
  url: 'https://w3c.github.io/aria/#requiredState',
};

const ariaChildrenReference: StandardReference = {
  type: 'WAI-ARIA',
  id: 'allowedChildRoles',
  label: 'WAI-ARIA 1.3 Editor Draft · Allowed accessibility child roles',
  status: 'editor-draft',
  url: 'https://w3c.github.io/aria/#allowedChildRoles',
};

const ariaParentReference: StandardReference = {
  type: 'WAI-ARIA',
  id: 'scope',
  label: 'WAI-ARIA 1.3 Editor Draft · Required accessibility parent role',
  status: 'editor-draft',
  url: 'https://w3c.github.io/aria/#scope',
};

const ariaIdReference: StandardReference = {
  type: 'WAI-ARIA',
  id: 'state_property_processing',
  label: 'WAI-ARIA 1.3 Editor Draft · State/property and ID reference processing',
  status: 'editor-draft',
  url: 'https://w3c.github.io/aria/#state_property_processing',
};

const impact = (en: string, es: string): Pick<RuleDefinition, 'severityRationale'> => ({
  severityRationale: { en, es },
});

export const INVALID_ARIA_ROLE_RULE: RuleDefinition = {
  id: 'FT-WARN-012',
  title: 'Explicit ARIA role cannot be resolved safely',
  severity: 'serious',
  ...impact(
    'An unresolved or abstract role can cause the intended semantics to be ignored, leaving assistive technologies with different semantics from those the author intended.',
    'Un rol no resoluble o abstracto puede hacer que se ignore la semántica prevista y que las tecnologías de asistencia reciban una semántica distinta de la que pretendía el autor.',
  ),
  references: [ariaRolesReference],
};

export const UNKNOWN_ARIA_ATTRIBUTE_RULE: RuleDefinition = {
  id: 'FT-WARN-013',
  title: 'Unknown aria-* attribute is used',
  severity: 'moderate',
  ...impact(
    'An unknown ARIA attribute is not part of the current ARIA vocabulary and can silently fail to expose the intended name, state or relationship.',
    'Un atributo ARIA desconocido no forma parte del vocabulario ARIA actual y puede no exponer silenciosamente el nombre, estado o relación que se pretendía.',
  ),
  references: [ariaStatesReference],
};

export const INVALID_ARIA_VALUE_RULE: RuleDefinition = {
  id: 'FT-WARN-014',
  title: 'ARIA state or property has an invalid value',
  severity: 'serious',
  ...impact(
    'An invalid ARIA value can be ignored or repaired differently by user agents, making state and relationship information unreliable for assistive technologies.',
    'Un valor ARIA no válido puede ignorarse o repararse de forma distinta por los agentes de usuario, haciendo poco fiable la información de estado o relación para las tecnologías de asistencia.',
  ),
  references: [ariaStatesReference],
};

export const REQUIRED_ARIA_PROPERTY_RULE: RuleDefinition = {
  id: 'FT-WARN-015',
  title: 'ARIA role is missing a required state or property',
  severity: 'serious',
  ...impact(
    'A role without a state or property that ARIA requires can expose an incomplete widget model, so assistive technologies may not receive information needed to operate or understand the control.',
    'Un rol sin un estado o propiedad que ARIA exige puede exponer un modelo de widget incompleto, por lo que las tecnologías de asistencia pueden no recibir información necesaria para comprender u operar el control.',
  ),
  references: [ariaRequiredReference],
};

export const ARIA_REFERENCE_RULE: RuleDefinition = {
  id: 'FT-WARN-016',
  title: 'ARIA ID reference does not resolve to a valid relationship',
  severity: 'serious',
  ...impact(
    'A broken ARIA ID relationship can remove an accessible name, description, controlled relationship, error message, ownership relationship or active-descendant focus target.',
    'Una relación ARIA por ID rota puede eliminar un nombre accesible, descripción, relación de control, mensaje de error, relación de propiedad o destino de foco mediante active-descendant.',
  ),
  references: [ariaIdReference],
};

export const REQUIRED_ARIA_PARENT_RULE: RuleDefinition = {
  id: 'FT-WARN-017',
  title: 'ARIA role is outside its required accessibility parent context',
  severity: 'serious',
  ...impact(
    'ARIA roles that require a specific accessibility parent can lose their intended computed role when they are orphaned from that context.',
    'Los roles ARIA que requieren un padre de accesibilidad concreto pueden perder su rol calculado previsto cuando quedan fuera de ese contexto.',
  ),
  references: [ariaParentReference],
};

export const ALLOWED_ARIA_CHILD_RULE: RuleDefinition = {
  id: 'FT-WARN-018',
  title: 'ARIA container exposes an incompatible accessibility child role',
  severity: 'serious',
  ...impact(
    'A composite or structural ARIA container with incompatible accessibility children can expose a relationship that does not match the ARIA role model.',
    'Un contenedor ARIA compuesto o estructural con hijos de accesibilidad incompatibles puede exponer una relación que no coincide con el modelo de roles ARIA.',
  ),
  references: [ariaChildrenReference],
};

export const ARIA_STATE_CONSISTENCY_RULE: RuleDefinition = {
  id: 'FT-WARN-019',
  title: 'ARIA range or set state is internally inconsistent',
  severity: 'serious',
  ...impact(
    'Contradictory ARIA ranges, positions or counts can expose impossible state information to assistive technologies even when every individual attribute parses correctly.',
    'Los rangos, posiciones o recuentos ARIA contradictorios pueden exponer información de estado imposible a las tecnologías de asistencia aunque cada atributo individual sea sintácticamente válido.',
  ),
  references: [ariaStatesReference],
};

export const UNSUPPORTED_ARIA_PROPERTY_RULE: RuleDefinition = {
  id: 'FT-WARN-020',
  title: 'ARIA state or property is not supported by the resolved role',
  severity: 'serious',
  ...impact(
    'ARIA defines state and property support per role. Using a known attribute on a role that does not support it produces undefined semantics and can cause the intended state to be ignored by assistive technologies.',
    'ARIA define el soporte de estados y propiedades por rol. Usar un atributo conocido en un rol que no lo admite produce una semántica indefinida y puede hacer que las tecnologías de asistencia ignoren el estado previsto.',
  ),
  references: [ariaRolesReference, ariaStatesReference],
};

export const ARIA_RELATIONSHIP_CONSISTENCY_RULE: RuleDefinition = {
  id: 'FT-WARN-021',
  title: 'ARIA relationship and exposed state are inconsistent',
  severity: 'serious',
  ...impact(
    'A relationship can resolve correctly while still contradicting the state exposed by its owner, such as an error message without aria-invalid or an expanded control whose controlled content is unavailable.',
    'Una relación puede resolverse correctamente y aun así contradecir el estado expuesto por su propietario, por ejemplo un mensaje de error sin aria-invalid o un control expandido cuyo contenido controlado no está disponible.',
  ),
  references: [ariaStatesReference, ariaIdReference],
};

export const ADVANCED_ARIA_RULES = [
  INVALID_ARIA_ROLE_RULE,
  UNKNOWN_ARIA_ATTRIBUTE_RULE,
  INVALID_ARIA_VALUE_RULE,
  REQUIRED_ARIA_PROPERTY_RULE,
  ARIA_REFERENCE_RULE,
  REQUIRED_ARIA_PARENT_RULE,
  ALLOWED_ARIA_CHILD_RULE,
  ARIA_STATE_CONSISTENCY_RULE,
  UNSUPPORTED_ARIA_PROPERTY_RULE,
  ARIA_RELATIONSHIP_CONSISTENCY_RULE,
] as const;