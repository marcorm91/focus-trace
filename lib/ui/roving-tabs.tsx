import { useRef, type KeyboardEvent, type RefCallback } from 'react';

export interface RovingTabOption<T extends string> {
  id: T;
  disabled?: boolean;
}

export type RovingTabsOrientation = 'horizontal' | 'vertical';

function enabledOptions<T extends string>(options: readonly RovingTabOption<T>[]): RovingTabOption<T>[] {
  return options.filter((option) => !option.disabled);
}

export function rovingTabTarget<T extends string>(
  options: readonly RovingTabOption<T>[],
  currentId: T,
  key: string,
  orientation: RovingTabsOrientation = 'horizontal',
): T | undefined {
  const enabled = enabledOptions(options);
  if (!enabled.length) return undefined;

  if (key === 'Home') return enabled[0]?.id;
  if (key === 'End') return enabled.at(-1)?.id;

  const previousKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
  const nextKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
  if (key !== previousKey && key !== nextKey) return undefined;

  const currentIndex = enabled.findIndex((option) => option.id === currentId);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const delta = key === nextKey ? 1 : -1;
  const nextIndex = (safeIndex + delta + enabled.length) % enabled.length;
  return enabled[nextIndex]?.id;
}

export function useRovingTabs<T extends string>(input: {
  options: readonly RovingTabOption<T>[];
  selected: T;
  onSelect: (id: T) => void;
  orientation?: RovingTabsOrientation;
}) {
  const refs = useRef(new Map<T, HTMLButtonElement>());
  const enabled = enabledOptions(input.options);
  const selectedEnabled = enabled.some((option) => option.id === input.selected);
  const tabStopId = selectedEnabled ? input.selected : enabled[0]?.id;

  return (id: T) => {
    const option = input.options.find((candidate) => candidate.id === id);
    const ref: RefCallback<HTMLButtonElement> = (node) => {
      if (node) refs.current.set(id, node);
      else refs.current.delete(id);
    };

    return {
      ref,
      tabIndex: !option?.disabled && id === tabStopId ? 0 : -1,
      onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
        const next = rovingTabTarget(
          input.options,
          id,
          event.key,
          input.orientation ?? 'horizontal',
        );
        if (!next || next === id) return;
        event.preventDefault();
        input.onSelect(next);
        refs.current.get(next)?.focus();
      },
    };
  };
}
