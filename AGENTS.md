# Tab Screenshot — Agent Guide

## Overview

Manifest V3 Chrome extension. Captures the visible viewport of a tab (or a user-selected rectangle) and saves to a file or the system clipboard, with an optional annotation step.

| Attribute | Value |
|---|---|
| API | Manifest V3 |
| Storage | `chrome.storage.sync` (prefs), `chrome.storage.local` (ephemeral) |
| Permissions | `activeTab`, `tabs`, `downloads`, `storage`, `scripting`, `clipboardWrite` |
| Image formats | PNG (default), JPEG, WebP |

---

## File Layout

```
deem/
├── manifest.json       Extension manifest
├── background.js       Service worker — message router
├── popup.html          Popup UI
├── popup.js            Popup logic
├── popup.css           Popup styles
├── selector.js         Content script — overlay + capture pipeline
├── annotation.html     Annotation editor page
├── annotation.js       Annotation editor logic
├── annotation.css      Annotation editor styles
├── icons/              Extension icons (16, 32, 48, 128 PNG + SVG source)
├── AGENTS.md           This file
└── README.md           User-facing docs
```

---

## Data Flow

### 1. Popup opens → reads prefs from `chrome.storage.sync`

Keys: `imageFormat` (png\|jpeg\|webp), `destination` (file\|clipboard), `annotate` (boolean)

### 2a. Capture visible area

```
popup.js → selector.js (sendMessage)
  → selector.js handler: stores `imageDestination`, forwards to background:
      chrome.runtime.sendMessage({ type: 'capture-visible', format })
    → background.js: chrome.tabs.captureVisibleTab()
      → sends back { type: 'full-screenshot', dataUrl, format }
        → selector.js: encodeAndDownload()
```

### 2b. Capture selected area

```
popup.js → selector.js (sendMessage: begin-selection)
  → selector.js: show(format) — overlay with pointer events
    → user clicks "Capture selection" → confirm()
      → background.js: captureVisibleTab() → crop-screenshot
        → selector.js: encodeAndDownload()
```

### 3. Destination routing (in encodeAndDownload)

```
encodeAndDownload():
  1. Load image, draw onto canvas (apply crop if needed), encode to data URL
  2. Read annotate from chrome.storage.sync
  3. Branch:
     annotate=true → open-annotator message → background stores in local storage
       → opens annotation.html → user annotates → Save:
         file  → download-image message
         clip  → canvas.toBlob() → navigator.clipboard.write()
     
     clip  → canvas.toBlob() → navigator.clipboard.write()
     file  → download-image message → chrome.downloads.download()
```
