# Chrome Web Store Listing — Tab Screenshot

> Last Updated: 2026-07-24

## Store Listing

**Extension Name**
Tab Screenshot

**Short Description**
Capture the visible tab or a chosen area of it.

**Detailed Description**
Tab Screenshot makes it easy to capture, annotate, and save screenshots of your active browser tab. Whether you need to grab the entire visible viewport or just a specific section, Tab Screenshot has you covered.

FEATURES
• Capture Viewport — Capture the full visible area of your current tab instantly.
• Selected Area Capture — Drag and resize a selection box to capture exactly what you need.
• Rich Annotations — Draw arrows and outline boxes to highlight important elements on your screenshots.
• Customizable Colors & Line Widths — Choose from a wide palette of colors and adjust border widths.
• Flexible Destinations — Download screenshots directly as files (PNG, JPEG, WebP) or copy them straight to your clipboard.
• Quick Undo & Shortcuts — Undo mistakes with Ctrl+Z / Cmd+Z or hit Enter to save.

HOW TO USE
1. Click the Tab Screenshot icon in your browser toolbar.
2. Choose your destination (Save to File or Copy to Clipboard) and preferred image format.
3. Choose whether to enable "Annotate screenshot".
4. Click "Capture visible area" or "Capture portion".
5. If capturing a portion, drag to select the area, then click "Capture selection".
6. In the annotator page (if enabled), add arrows/boxes, then click save!

PRIVACY
Tab Screenshot is designed with privacy first. The extension does not collect, store, or transmit any personal data or browsing history off-device. All captured images are processed entirely locally in your browser.

PERMISSIONS
• "activeTab" — Needed to capture the current active page when you request a screenshot.
• "scripting" — Used to inject the selection box overlay into the active page.
• "downloads" — Used to save screenshots directly to your local downloads folder.
• "storage" — Used to persist your preferred settings (image format, destination, annotation toggle) across browser sessions.
• "clipboardWrite" — Allows you to copy captured and annotated screenshots directly to your system clipboard.

SUPPORT
Found a bug or have a suggestion? Open an issue on our GitHub repository:
https://github.com/russelldickenson/chrome-tab-screenshot

Version 1.2.0 — Initial release of the clean viewport capture, portion selector, and canvas annotator.

**Category**
Productivity

**Single Purpose**
Captures the visible viewport or a user-selected area of a Chrome tab, with optional tools to annotate and save the output.

**Primary Language**
English


## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ✅ Ready | `icons/icon-128.png` |
| Screenshot 1 | 1280×800 or 640×400 | ✅ Ready | `screenshots/tab-screenshot-1.png` |
| Screenshot 2 | 1280×800 or 640×400 | ✅ Ready | `screenshots/tab-screenshot-2.png` |
| Screenshot 3 | 1280×800 or 640×400 | ✅ Ready | `screenshots/tab-screenshot-3.png` |
| Screenshot 4 | 1280×800 or 640×400 | ✅ Ready | `screenshots/tab-screenshot-4.png` |

### Screenshot Notes
- **Screenshot 1**: Shows the main extension popup open, displaying options for Destination, Image Format, and Annotation toggle.
- **Screenshot 2**: Shows the selection overlay active on a page with the drag-to-select indicator and "Capture selection" buttons.
- **Screenshot 3**: Shows the canvas annotation editor screen with a screenshot loaded, showing red arrows and boxes drawn on it.
- **Screenshot 4**: Shows the annotation editor with color swatches and line width options active.


## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `activeTab` | permissions | Temporary permission to capture and script the active tab when explicitly triggered by the user clicking the extension popup options. |
| `tabs` | permissions | Required to programmatically open the annotator page (`annotation.html`) in a new tab after a screenshot is captured. |
| `downloads` | permissions | Required to download screenshot images directly to the user's downloads folder. |
| `storage` | permissions | Required to save user preference options (e.g., preferred file format, copy/download destination) and handle temporary data handoff to the annotation tab. |
| `scripting` | permissions | Required to inject the area selector content script (`selector.js`) into the page to display the crop selection UI. |
| `clipboardWrite` | permissions | Required to copy screenshots to the system clipboard when the user selects clipboard as their destination. |


## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes


## Privacy Policy

**Privacy Policy URL**
https://github.com/russelldickenson/chrome-tab-screenshot/blob/main/PRIVACY.md

*(See `PRIVACY.md` in the repository for details.)*


## Distribution

**Visibility**: Public
**Regions**: All regions
**Pricing**: Free


## Developer Info

**Publisher Name**
Russell Dickenson

**Contact Email**
russell@example.com

**Support URL / Email**
https://github.com/russelldickenson/chrome-tab-screenshot/issues


## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.2.0 | 2026-07-24 | Release with annotation editor, copy to clipboard support, format options, and selection crop UI. | Draft |


## Review Notes

### Known Issues / Limitations
- Cannot capture chrome:// settings pages or the Chrome Web Store itself due to security restrictions built into Chrome.
