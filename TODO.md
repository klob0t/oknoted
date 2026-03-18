# Sticky Note - Development TODO

## 🚀 Incoming Features
- [ ] **Always on Top (Pin)**
    - Implement `setAlwaysOnTop` using Tauri Window API.
    - Add a `pin.svg` icon to the top controls.
    - Persist pinned state in `localStorage`.
    - Configure Tauri permissions in `capabilities/default.json`.
- [ ] **Multi-Note Support**
    - Ability to spawn new sticky note windows.
- [ ] **Export Options**
    - Export content as Markdown or plain text.

## ✅ Accomplished
- [x] **Visual Identity**
    - Integrated local handwriting font (`Mywriting.ttf`).
    - Custom "Marker" highlight style with `mix-blend-mode: multiply` and uneven edges.
    - Dynamic SVG icons for Checklist and Highlight.
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
