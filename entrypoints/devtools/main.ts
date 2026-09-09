type DevtoolsPanelsApi = {
  create: (
    title: string,
    iconPath: string,
    pagePath: string,
    callback?: (panel: unknown) => void,
  ) => unknown;
};

type DevtoolsApi = {
  inspectedWindow: { tabId: number };
  panels: DevtoolsPanelsApi;
};

type ChromeWithDevtools = typeof globalThis & {
  chrome?: { devtools?: DevtoolsApi };
};

const devtools = (globalThis as ChromeWithDevtools).chrome?.devtools;
if (!devtools) throw new Error('FocusTrace DevTools API is unavailable in this browser.');

const inspectedTabId = devtools.inspectedWindow.tabId;
const panelUrl = `sidepanel.html?focustraceTabId=${encodeURIComponent(String(inspectedTabId))}`;

devtools.panels.create(
  'FocusTrace',
  'icon/16.png',
  panelUrl,
  () => undefined,
);
