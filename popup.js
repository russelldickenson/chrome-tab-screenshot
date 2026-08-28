const withActiveTab = async (message) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return { ok: false, error: 'No active tab found.' };
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['selector.js'] });
  return chrome.tabs.sendMessage(tab.id, message);
};

const destSelect = document.querySelector('#destination');
const formatWrap = document.querySelector('#format-wrap');
const formatSelect = document.querySelector('#format');
const status = document.querySelector('#status');
const saveOptions = document.querySelector('#save-options');

const showError = (message) => {
  status.textContent = message;
  status.hidden = false;
};

const annotateCheck = document.querySelector('#annotate');

const initialize = async () => {
  const { imageFormat = 'png', annotate = false, destination = 'file' } = await chrome.storage.sync.get(['imageFormat', 'annotate', 'destination']);
  destSelect.value = destination;
  formatSelect.value = imageFormat;
  annotateCheck.checked = annotate;
  formatWrap.classList.toggle('hidden', destination !== 'file');
  saveOptions.classList.toggle('hidden', annotate);
};

destSelect.addEventListener('change', async () => {
  const isFile = destSelect.value === 'file';
  formatWrap.classList.toggle('hidden', !isFile);
  await chrome.storage.sync.set({ destination: destSelect.value });
});

formatSelect.addEventListener('change', async () => {
  await chrome.storage.sync.set({ imageFormat: formatSelect.value });
});

annotateCheck.addEventListener('change', async () => {
  saveOptions.classList.toggle('hidden', annotateCheck.checked);
  await chrome.storage.sync.set({ annotate: annotateCheck.checked });
});

document.querySelector('#visible').addEventListener('click', async () => {
  try {
    const response = await withActiveTab({
      type: 'capture-visible',
      format: formatSelect.value,
      destination: destSelect.value,
      annotate: annotateCheck.checked,
    });
    if (response?.ok) {
      window.close();
    } else {
      showError(response?.error || 'This page cannot be captured. Try a normal website tab.');
    }
  } catch (error) {
    showError('This page cannot be captured. Try a normal website tab.');
  }
});

document.querySelector('#portion').addEventListener('click', async () => {
  try {
    const response = await withActiveTab({
      type: 'begin-selection',
      format: formatSelect.value,
      destination: destSelect.value,
      annotate: annotateCheck.checked,
    });
    if (response?.ok) {
      window.close();
    } else {
      showError(response?.error || 'This page cannot be captured. Try a normal website tab.');
    }
  } catch (error) {
    showError('This page cannot be captured. Try a normal website tab.');
  }
});

initialize();
