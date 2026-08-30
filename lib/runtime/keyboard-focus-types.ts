export type KeyboardFocusAction =
  | { kind: 'click' }
  | { kind: 'keydown'; key: string };
