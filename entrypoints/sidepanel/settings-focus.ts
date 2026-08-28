type FocusedSubview = 'settings' | 'instructions';

function openFocusedSubview(view: FocusedSubview): void {
  const navButtons = [...document.querySelectorAll<HTMLButtonElement>('.workspace-nav button')];
  const activeIndex = navButtons.findIndex((button) => button.getAttribute('aria-current') === 'page');
  document.documentElement.dataset.ftFocusedSubviewReturn = String(Math.max(0, activeIndex));
  document.documentElement.dataset.ftFocusedSubviewOpen = view;
}

function closeFocusedSubview(): void {
  const index = Number(document.documentElement.dataset.ftFocusedSubviewReturn ?? '0');
  const navButtons = [...document.querySelectorAll<HTMLButtonElement>('.workspace-nav button')];
  delete document.documentElement.dataset.ftFocusedSubviewOpen;
  delete document.documentElement.dataset.ftFocusedSubviewReturn;
  const target = navButtons[Number.isInteger(index) ? index : 0] ?? navButtons[0];
  target?.click();
}

export function openFocusedSettingsView(): void {
  openFocusedSubview('settings');
}

export function closeFocusedSettingsView(): void {
  closeFocusedSubview();
}

export function openFocusedInstructionsView(): void {
  openFocusedSubview('instructions');
}

export function closeFocusedInstructionsView(): void {
  closeFocusedSubview();
}
