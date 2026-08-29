export function activationBelongsToPanelWindow(
  panelWindowId: number | undefined,
  activationWindowId: number,
): boolean {
  return panelWindowId != null && activationWindowId === panelWindowId;
}
