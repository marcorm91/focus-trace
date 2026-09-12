export const ELEMENT_INTERNALS_BRIDGE_SCHEMA = 1 as const;
export const ELEMENT_INTERNALS_REQUEST_EVENT = 'focustrace:element-internals:request';
export const ELEMENT_INTERNALS_REQUEST_ATTRIBUTE = 'data-focustrace-element-internals-request';
export const ELEMENT_INTERNALS_KEY_ATTRIBUTE = 'data-focustrace-element-internals-key';
export const ELEMENT_INTERNALS_RESPONSE_ATTRIBUTE = 'data-focustrace-element-internals-response';

export const ELEMENT_INTERNALS_ARIA_PROPERTIES = {
  'aria-activedescendant': 'ariaActiveDescendant',
  'aria-atomic': 'ariaAtomic',
  'aria-autocomplete': 'ariaAutoComplete',
  'aria-braillelabel': 'ariaBrailleLabel',
  'aria-brailleroledescription': 'ariaBrailleRoleDescription',
  'aria-busy': 'ariaBusy',
  'aria-checked': 'ariaChecked',
  'aria-colcount': 'ariaColCount',
  'aria-colindex': 'ariaColIndex',
  'aria-colspan': 'ariaColSpan',
  'aria-controls': 'ariaControls',
  'aria-current': 'ariaCurrent',
  'aria-describedby': 'ariaDescribedBy',
  'aria-description': 'ariaDescription',
  'aria-details': 'ariaDetails',
  'aria-disabled': 'ariaDisabled',
  'aria-errormessage': 'ariaErrorMessage',
  'aria-expanded': 'ariaExpanded',
  'aria-flowto': 'ariaFlowTo',
  'aria-haspopup': 'ariaHasPopup',
  'aria-hidden': 'ariaHidden',
  'aria-invalid': 'ariaInvalid',
  'aria-keyshortcuts': 'ariaKeyShortcuts',
  'aria-label': 'ariaLabel',
  'aria-labelledby': 'ariaLabelledBy',
  'aria-level': 'ariaLevel',
  'aria-live': 'ariaLive',
  'aria-modal': 'ariaModal',
  'aria-multiline': 'ariaMultiLine',
  'aria-multiselectable': 'ariaMultiSelectable',
  'aria-orientation': 'ariaOrientation',
  'aria-owns': 'ariaOwns',
  'aria-placeholder': 'ariaPlaceholder',
  'aria-posinset': 'ariaPosInSet',
  'aria-pressed': 'ariaPressed',
  'aria-readonly': 'ariaReadOnly',
  'aria-relevant': 'ariaRelevant',
  'aria-required': 'ariaRequired',
  'aria-roledescription': 'ariaRoleDescription',
  'aria-rowcount': 'ariaRowCount',
  'aria-rowindex': 'ariaRowIndex',
  'aria-rowspan': 'ariaRowSpan',
  'aria-selected': 'ariaSelected',
  'aria-setsize': 'ariaSetSize',
  'aria-sort': 'ariaSort',
  'aria-valuemax': 'ariaValueMax',
  'aria-valuemin': 'ariaValueMin',
  'aria-valuenow': 'ariaValueNow',
  'aria-valuetext': 'ariaValueText',
} as const;

export type ElementInternalsAriaProperty = keyof typeof ELEMENT_INTERNALS_ARIA_PROPERTIES;

export interface ElementInternalsLabelSnapshot {
  id?: string;
  text: string;
}

export interface ElementInternalsSemanticSnapshot {
  key: string;
  role?: string;
  aria: Partial<Record<ElementInternalsAriaProperty, string>>;
  labels: ElementInternalsLabelSnapshot[];
  formAssociated: boolean;
}

export interface ElementInternalsBridgeResponse {
  schema: typeof ELEMENT_INTERNALS_BRIDGE_SCHEMA;
  requestId: string;
  snapshots: ElementInternalsSemanticSnapshot[];
}
