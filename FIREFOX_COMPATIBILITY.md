
# Firefox Compatibility Report

## Changes Made to Make Extension Compatible with Firefox

### Manifest Changes
1. Added `browser_specific_settings` field with:
   - `gecko` configuration
   - Unique extension ID: `tabscreenshot@example.com` (required for Firefox)
   - Minimum Firefox version: `109.0` (this is the version where Manifest V3 was fully supported)

### Permissions
The extension already uses permissions that are compatible with Firefox:
- `activeTab` - supported in Firefox
- `downloads` - supported in Firefox  
- `storage` - supported in Firefox
- `unlimitedStorage` - supported in Firefox
- `scripting` - supported in Firefox (since Firefox 55)
- `clipboardWrite` - supported in Firefox

### APIs Used
The extension uses Chrome APIs that are compatible with Firefox:
- `chrome.tabs.captureVisibleTab()` - supported in Firefox
- `chrome.runtime.sendMessage()` - supported in Firefox
- `chrome.storage.sync` and `chrome.storage.local` - supported in Firefox
- `chrome.downloads.download()` - supported in Firefox
- `chrome.clipboard.write()` - supported in Firefox (as `navigator.clipboard.write()`)

### Content Scripts
The content scripts (selector.js) and the extension's architecture should work with Firefox as they're using standard web APIs and Chrome extension APIs that are supported.

### Extension ID
Firefox requires a unique extension ID that is different from Chrome's extension ID to avoid conflicts.

### Version Requirements
Firefox 109.0+ is required to support Manifest V3 and all the APIs used by this extension.
