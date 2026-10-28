// Background script - service worker for handling extension messages
let captureInProgress = false;
let storageCache = new Map();
let cacheTimeout = 5 * 60 * 1000; // 5 minutes cache timeout

// Cache cleanup function
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of storageCache.entries()) {
    if (now - value.timestamp > cacheTimeout) {
      storageCache.delete(key);
    }
  }
}, 60000); // Check every minute

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'capture-visible') {
    // Prevent multiple simultaneous captures
    if (captureInProgress) {
      sendResponse({ type: 'error', message: 'Capture already in progress' });
      return true;
    }
    
    captureInProgress = true;
    
    chrome.tabs.captureVisibleTab(null, { format: request.format }, (dataUrl) => {
      captureInProgress = false;
      sendResponse({ type: 'full-screenshot', dataUrl, format: request.format });
    });
    return true;
  }
  
  if (request.type === 'capture-selection') {
    // Prevent multiple simultaneous captures
    if (captureInProgress) {
      sendResponse({ type: 'error', message: 'Capture already in progress' });
      return true;
    }
    
    captureInProgress = true;
    
    chrome.tabs.captureVisibleTab(null, { format: request.format }, (dataUrl) => {
      captureInProgress = false;
      sendResponse({ type: 'cropped-screenshot', dataUrl, format: request.format });
    });
    return true;
  }
  
  // Handle storage operations with caching
  if (request.type === 'storage-get') {
    const cached = storageCache.get(request.key);
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      sendResponse({ type: 'storage-get-response', value: cached.value });
      return true;
    }
    
    chrome.storage.sync.get(request.key, (result) => {
      storageCache.set(request.key, {
        value: result[request.key],
        timestamp: Date.now()
      });
      sendResponse({ type: 'storage-get-response', value: result[request.key] });
    });
    return true;
  }
  
  if (request.type === 'storage-set') {
    chrome.storage.sync.set({ [request.key]: request.value }, () => {
      // Cache the set value
      storageCache.set(request.key, {
        value: request.value,
        timestamp: Date.now()
      });
      sendResponse({ type: 'storage-set-response' });
    });
    return true;
  }
});
