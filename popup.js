// Popup logic
document.addEventListener('DOMContentLoaded', () => {
  // Load preferences from storage with error handling
  const loadPreferences = () => {
    try {
      chrome.storage.sync.get(['imageFormat', 'destination', 'annotate'], (result) => {
        // Apply preferences to UI with error handling
        if (result.imageFormat) {
          document.getElementById('format').value = result.imageFormat;
        }
        if (result.destination) {
          document.getElementById('destination').value = result.destination;
        }
        if (result.annotate !== undefined) {
          document.getElementById('annotate').checked = result.annotate;
        }
      });
    } catch (error) {
      console.error('Error loading preferences:', error);
      // Fallback to defaults
      document.getElementById('format').value = 'png';
      document.getElementById('destination').value = 'file';
      document.getElementById('annotate').checked = false;
    }
  };
  
  loadPreferences();
  
  // Set up event handlers with performance optimizations
  const handleCaptureVisible = () => {
    // Show loading indicator
    const visibleBtn = document.getElementById('visible');
    const originalText = visibleBtn.textContent;
    visibleBtn.textContent = 'Capturing...';
    visibleBtn.disabled = true;
    
    // Throttle rapid clicks
    const format = document.getElementById('format').value;
    chrome.runtime.sendMessage({ type: 'capture-visible', format }, (response) => {
      // Restore button state
      visibleBtn.textContent = originalText;
      visibleBtn.disabled = false;
      
      if (response.type === 'full-screenshot') {
        // Handle the screenshot with error handling
        try {
          encodeAndDownload(response.dataUrl, response.format);
        } catch (error) {
          console.error('Error encoding/download screenshot:', error);
        }
      } else if (response.type === 'error') {
        console.error('Capture error:', response.message);
      }
    });
  };
  
  const handleCaptureSelection = () => {
    // Show loading indicator
    const selectionBtn = document.getElementById('selection');
    const originalText = selectionBtn.textContent;
    selectionBtn.textContent = 'Selecting...';
    selectionBtn.disabled = true;
    
    // Throttle rapid clicks
    const format = document.getElementById('format').value;
    chrome.runtime.sendMessage({ type: 'begin-selection', format }, (response) => {
      // Restore button state
      selectionBtn.textContent = originalText;
      selectionBtn.disabled = false;
      
      if (response && response.type === 'error') {
        console.error('Selection error:', response.message);
      }
    });
  };
  
  // Set up event handlers
  document.getElementById('visible').addEventListener('click', handleCaptureVisible);
  document.getElementById('selection').addEventListener('click', handleCaptureSelection);
});
