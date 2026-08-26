export function openFocusedSettingsView(): void {
  const navButtons = [...document.querySelectorAll<HTMLButtonElement>('.workspace-nav button')];
  const activeIndex = navButtons.findIndex((button) => button.getAttribute('aria-current') === 'page');
  document.documentElement.dataset.ftSettingsReturn = String(Math.max(0, activeIndex));
  document.documentElement.dataset.ftSettingsOpen = 'true';
}

export function closeFocusedSettingsView(): void {
  const index = Number(document.documentElement.dataset.ftSettingsReturn ?? '0');
  const navButtons = [...document.querySelectorAll<HTMLButtonElement>('.workspace-nav button')];
  delete document.documentElement.dataset.ftSettingsOpen;
  delete document.documentElement.dataset.ftSettingsReturn;
  const target = navButtons[Number.isInteger(index) ? index : 0] ?? navButtons[0];
  target?.click();
}
