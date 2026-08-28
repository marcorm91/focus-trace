export type DuplicateIdSignal = {
  element: Element;
  id: string;
  occurrences: number;
};

type ScanRoot = Document | Element;

function containsInScope(root: ScanRoot, element: Element): boolean {
  return root instanceof Document || root === element || root.contains(element);
}

export function evaluateDuplicateIds(root: ScanRoot): DuplicateIdSignal[] {
  const byId = new Map<string, Element[]>();

  for (const element of document.querySelectorAll('[id]')) {
    const id = element.getAttribute('id') ?? '';
    if (!id) continue;
    const existing = byId.get(id);
    if (existing) existing.push(element);
    else byId.set(id, [element]);
  }

  const signals: DuplicateIdSignal[] = [];
  for (const [id, elements] of byId) {
    if (elements.length < 2) continue;
    for (const element of elements) {
      if (!containsInScope(root, element)) continue;
      signals.push({ element, id, occurrences: elements.length });
    }
  }

  return signals;
}
