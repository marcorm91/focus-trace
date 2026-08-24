export default defineBackground(() => {
  chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id) return;
    await chrome.sidePanel.open({ tabId: tab.id });
  });
});
