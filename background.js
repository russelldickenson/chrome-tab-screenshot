const supportedFormats = new Set(['png', 'jpeg', 'webp']);
const formatFor = (format) => supportedFormats.has(format) ? format : 'png';
const filenameFor = (format, prefix) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const label = prefix === 'tab-selection' ? 'Tab Selection' : 'Tab Screenshot';
  return `${label} ${timestamp}.${formatFor(format)}`;
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === 'open-annotator') {
        await chrome.storage.local.set({ pendingScreenshot: { dataUrl: message.dataUrl, format: message.format, destination: message.destination || 'file' } });
        await chrome.tabs.create({ url: chrome.runtime.getURL('annotation.html') });
        sendResponse({ ok: true });
        return;
      }

      if (message.type === 'download-image') {
        await chrome.downloads.download({
          url: message.dataUrl,
          filename: filenameFor(message.format, message.prefix),
          saveAs: true,
        });
        sendResponse({ ok: true });
        return;
      }

      if (message.type === 'request-capture' && sender.tab?.id) {
        // captureVisibleTab only guarantees PNG/JPEG; callers that need WebP
        // re-encode from this PNG in a document context (canvas).
        const dataUrl = await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' });
        sendResponse({ ok: true, dataUrl });
        return;
      }
    } catch (error) {
      sendResponse({ ok: false, error: error.message });
    }
  })();
  return true;
});
