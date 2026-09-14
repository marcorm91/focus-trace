import type { RuleDefinition } from './rule-catalog';
import type { StandardReference } from './types';

const htmlAccesskey: StandardReference = {
  type: 'HTML',
  id: 'accesskey',
  label: 'HTML accesskey attribute',
  status: 'normative',
  url: 'https://html.spec.whatwg.org/multipage/interaction.html#the-accesskey-attribute',
};

const timingAdjustable: StandardReference = {
  type: 'WCAG',
  id: '2.2.1',
  label: 'Timing Adjustable',
  level: 'A',
  status: 'normative',
  url: 'https://www.w3.org/TR/WCAG22/#timing-adjustable',
};

const metaRefreshAct: StandardReference = {
  type: 'ACT',
  id: 'bc659a',
  label: 'Meta element has no refresh delay',
  status: 'proposed',
  url: 'https://www.w3.org/WAI/standards-guidelines/act/rules/bc659a/proposed/',
};

const keyboard: StandardReference = {
  type: 'WCAG',
  id: '2.1.1',
  label: 'Keyboard',
  level: 'A',
  status: 'normative',
  url: 'https://www.w3.org/TR/WCAG22/#keyboard',
};

const keyboardNoException: StandardReference = {
  type: 'WCAG',
  id: '2.1.3',
  label: 'Keyboard (No Exception)',
  level: 'AAA',
  status: 'normative',
  url: 'https://www.w3.org/TR/WCAG22/#keyboard-no-exception',
};

const scrollableAct: StandardReference = {
  type: 'ACT',
  id: '0ssw9k',
  label: 'Scrollable element is keyboard accessible',
  status: 'proposed',
  url: 'https://www.w3.org/WAI/standards-guidelines/act/rules/0ssw9k/proposed/',
};

const audioControl: StandardReference = {
  type: 'WCAG',
  id: '1.4.2',
  label: 'Audio Control',
  level: 'A',
  status: 'normative',
  url: 'https://www.w3.org/TR/WCAG22/#audio-control',
};

const autoplayAudioAct: StandardReference = {
  type: 'ACT',
  id: '80f0bf',
  label: 'Audio or video element avoids automatically playing audio',
  status: 'proposed',
  url: 'https://www.w3.org/WAI/standards-guidelines/act/rules/80f0bf/proposed/',
};

export const ACCESSKEY_UNIQUENESS_RULE: RuleDefinition = {
  id: 'FT-WARN-028',
  title: 'Accesskey token is assigned to more than one element',
  severity: 'serious',
  severityRationale: {
    en: 'Reusing an accesskey token can make shortcut activation ambiguous or browser-dependent and can prevent keyboard users from reaching the intended command reliably. FocusTrace reports this as an authoring warning because actual shortcut assignment depends on the user agent and platform.',
    es: 'Reutilizar un token accesskey puede hacer que la activación del atajo sea ambigua o dependa del navegador e impedir que usuarios de teclado alcancen de forma fiable el comando esperado. FocusTrace lo informa como aviso de autoría porque la asignación real del atajo depende del agente de usuario y la plataforma.',
  },
  references: [htmlAccesskey],
};

export const META_REFRESH_TIMING_RULE: RuleDefinition = {
  id: 'FT-WCAG-022',
  title: 'Delayed meta refresh must not impose a short page time limit',
  severity: 'critical',
  severityRationale: {
    en: 'A delayed automatic refresh or redirect can remove content or change context before a user with a disability has enough time to read or operate the page. FocusTrace limits FAIL to the ACT-observable delay window for WCAG 2.2.1.',
    es: 'Una actualización o redirección automática con retraso puede eliminar contenido o cambiar el contexto antes de que una persona con discapacidad disponga de tiempo suficiente para leer u operar la página. FocusTrace limita FAIL a la ventana de retraso observable por ACT para WCAG 2.2.1.',
  },
  references: [timingAdjustable, metaRefreshAct],
};

export const SCROLLABLE_REGION_KEYBOARD_RULE: RuleDefinition = {
  id: 'FT-REVIEW-043',
  title: 'Scrollable region may not be reachable with sequential keyboard navigation',
  severity: 'serious',
  severityRationale: {
    en: 'A scrollable region with no sequentially focusable entry point can make content inside the region difficult or impossible to reach with a keyboard in affected browsers. The result remains REVIEW because browser scrolling behavior, decorative regions and external controls can require context.',
    es: 'Una región desplazable sin un punto de entrada alcanzable mediante foco secuencial puede hacer que su contenido resulte difícil o imposible de alcanzar con teclado en navegadores afectados. El resultado permanece como REVIEW porque el comportamiento de scroll del navegador, las regiones decorativas y los controles externos pueden requerir contexto.',
  },
  references: [keyboard, keyboardNoException, scrollableAct],
};

export const AUTOPLAY_AUDIO_REVIEW_RULE: RuleDefinition = {
  id: 'FT-REVIEW-044',
  title: 'Automatically playing audio may need a stop or mute mechanism',
  severity: 'moderate',
  severityRationale: {
    en: 'Audio that starts automatically and continues for more than three seconds can interfere with speech output and concentration. FocusTrace keeps the result as REVIEW because browser autoplay policy, actual audio-track presence and custom stop/mute controls are not always provable from static media state.',
    es: 'El audio que comienza automáticamente y continúa durante más de tres segundos puede interferir con la salida hablada y la concentración. FocusTrace mantiene el resultado como REVIEW porque la política de autoplay del navegador, la presencia real de pista de audio y los controles personalizados de parada/silencio no siempre pueden demostrarse desde el estado estático del medio.',
  },
  references: [audioControl, autoplayAudioAct],
};

export const KEYBOARD_NAVIGATION_MOTION_RULES: RuleDefinition[] = [
  ACCESSKEY_UNIQUENESS_RULE,
  META_REFRESH_TIMING_RULE,
  SCROLLABLE_REGION_KEYBOARD_RULE,
  AUTOPLAY_AUDIO_REVIEW_RULE,
];
