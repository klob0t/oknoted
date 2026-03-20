# Sticky Note - Development TODO

## 🚀 Incoming Features
- [ ] **Always on Top (Pin)**
    - Implement `setAlwaysOnTop` using Tauri Window API.
    - Add a `pin.svg` icon to the top controls.
    - Persist pinned state in `localStorage`.
    - Configure Tauri permissions in `capabilities/default.json`.
- [x] **Multi-Note Support**
    - Transitioned to ID-based data structure in `localStorage`.
    - Implemented `NoteManager` for "Empty State" and note organization.
    - Dynamic window spawning using `WebviewWindow` API.
    - Automatic Manager hide/show logic based on active notes.
- [ ] **Export Options**
    - Export content as Markdown or plain text.

## 🛠️ Troubleshooting Log

### 1. Window Dragging (Windows 10/11)
- **Issue:** Window wouldn't move despite `data-tauri-drag-region`.
- **Cause:** Tauri v2 requires explicit permission for dragging.
- **Fix:** Added `core:window:allow-start-dragging` to `capabilities/default.json`.

### 2. Rust Compilation Errors
- **Issue:** `dlltool.exe` not found.
- **Cause:** Rust was using the `gnu` toolchain instead of the `msvc` toolchain required for Visual Studio Build Tools.
- **Fix:** Switched default toolchain to `stable-x86_64-pc-windows-msvc`.

### 3. Multi-Window Spawning Failures
- **Issue:** `New Note` button added items to list but didn't open windows.
- **Cause:** Permission scope mismatch. The `default.json` only allowed the window labeled `"main"`, but the app was renamed to `"manager"` and notes to `"note-*"`.
- **Fix:** Updated `windows` array in `capabilities/default.json` to `["manager", "note-*"]` and added `core:webview:allow-create-webview`.

## ✅ Accomplished
- [x] **Visual Identity**
    - Integrated **Stampatello** handwriting font.
    - Custom "Marker" highlight style with `mix-blend-mode: multiply` and uneven edges.
    - Dynamic SVG icons for Checklist, Highlight, and **Animated Trash (Close)**.
    - Enlarged icon buttons for better accessibility.
- [x] **Rich Text & Lists**
    - Seamless list triggers: `1. ` for Numbers, `- ` for Bullets.
    - Dedicated `[] ` trigger for interactive Checklists.
    - Click-to-check functionality for checklist items.
- [x] **Highlighter Pro**
    - Vibrant Neon color selection (Yellow, Green, Blue).
    - Compact, horizontal hover-menu with bounce animation.
    - "Clear Highlight" (Eraser) functionality.
- [x] **State Persistence**
    - Title, Content (HTML), Color Theme, and Highlight settings saved to `localStorage`.
- [x] **Tauri Integration**
    - Set up Rust (MSVC) and C++ Build Tools environment.
    - Configured window transparency and shadow.
    - Enabled native window dragging.


run codex resume 019d062a-e58e-71f1-92f9-d08bf8acb2dd