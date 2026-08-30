export type KeyboardFocusAction =
  | { kind: 'click' }
  | {
      kind: 'keydown';
      key: string;
      ctrlKey?: boolean;
      altKey?: boolean;
      shiftKey?: boolean;
      metaKey?: boolean;
    };
