// Background script - service worker for handling extension messages
let captureInProgress = false;
let storageCache = new Map();
let cacheTimeout = 5 * 60 * 1000; // 5 minutes cache timeout
let cacheSizeLimit = 50; // Limit cache to 50 items to prevent memory issues
let performanceLog = [];
let maxLogEntries = 100;

// Cache cleanup function with performance monitoring
setInterval(() => {
  const now = Date.now();
  let removedCount = 0;
  
  for (const [key, value] of storageCache.entries()) {
    if (now - value.timestamp > cacheTimeout) {
      storageCache.delete(key);
      removedCount++;
    }
  }
  
  // Log cache cleanup for monitoring
  if (removedCount > 0) {
    logPerformance('cache-cleanup', { removed: removedCount });
  }
}, 60000); // Check every minute

// Performance logging function
function logPerformance(event, data) {
  const timestamp = Date.now();
  performanceLog.push({
    timestamp,
    event,
    data
  });
  
  // Keep log size manageable
  if (performanceLog.length > maxLogEntries) {
    performanceLog.shift();
  }
}

// Get performance statistics
function getPerformanceStats() {
  return {
    cacheSize: storageCache.size,
    logSize: performanceLog.length,
    cacheHits: storageCache.size > 0 ? 'check implementation' : 0,
    lastLogEntry: performanceLog.length > 0 ? performanceLog[performanceLog.length - 1] : null
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const startTime = Date.now();
  
  if (request.type === 'capture-visible') {
    // Prevent multiple simultaneous captures
    if (captureInProgress) {
      const response = { type: 'error', message: 'Capture already in progress' };
      logPerformance('capture-error', { 
        operation: 'capture-visible', 
        error: 'concurrent-capture' 
      });
      sendResponse(response);
      return true;
    }
    
    captureInProgress = true;
    
    chrome.tabs.captureVisibleTab(null, { format: request.format }, (dataUrl) => {
      captureInProgress = false;
      const response = { type: 'full-screenshot', dataUrl, format: request.format };
      const duration = Date.now() - startTime;
      logPerformance('capture-visible', { duration });
      sendResponse(response);
    });
    return true;
  }
  
  if (request.type === 'capture-selection') {
    // Prevent multiple simultaneous captures
    if (captureInProgress) {
      const response = { type: 'error', message: 'Capture already in progress' };
      logPerformance('capture-error', { 
        operation: 'capture-selection', 
        error: 'concurrent-capture' 
      });
      sendResponse(response);
      return true;
    }
    
    captureInProgress = true;
    
    chrome.tabs.captureVisibleTab(null, { format: request.format }, (dataUrl) => {
      captureInProgress = false;
      const response = { type: 'cropped-screenshot', dataUrl, format: request.format };
      const duration = Date.now() - startTime;
      logPerformance('capture-selection', { duration });
      sendResponse(response);
    });
    return true;
  }
  
  // Handle storage operations with caching and performance monitoring
  if (request.type === 'storage-get') {
    const cached = storageCache.get(request.key);
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      const duration = Date.now() - startTime;
      logPerformance('storage-get-cache-hit', { 
        key: request.key, 
        duration,
        cacheSize: storageCache.size 
      });
      sendResponse({ type: 'storage-get-response', value: cached.value });
      return true;
    }
    
    // Cache miss - fetch from storage
    chrome.storage.sync.get(request.key, (result) => {
      // Apply cache size limit
      if (storageCache.size >= cacheSizeLimit) {
        // Remove oldest entry
        const firstKey = storageCache.keys().next().value;
        if (firstKey) {
          storageCache.delete(firstKey);
        }
      }
      
      storageCache.set(request.key, {
        value: result[request.key],
        timestamp: Date.now()
      });
      
      const duration = Date.now() - startTime;
      logPerformance('storage-get-cache-miss', { 
        key: request.key, 
        duration,
        cacheSize: storageCache.size 
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
      
      // Limit cache size
      if (storageCache.size > cacheSizeLimit) {
        // Remove oldest entry
        const firstKey = storageCache.keys().next().value;
        if (firstKey) {
          storageCache.delete(firstKey);
        }
      }
      
      const duration = Date.now() - startTime;
      logPerformance('storage-set', { 
        key: request.key, 
        duration,
        cacheSize: storageCache.size 
      });
      
      sendResponse({ type: 'storage-set-response' });
    });
    return true;
  }
  
  // Handle performance statistics request
  if (request.type === 'performance-stats') {
    const stats = getPerformanceStats();
    sendResponse({ type: 'performance-stats-response', stats });
    return true;
  }
});
