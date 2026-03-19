# AGENTS.md

## Project
- Desktop sticky notes app built with Tauri 2, Vite, React 19, and TypeScript.
- Frontend source lives in `src/`.
- Native window/config code lives in `src-tauri/`.

## Key Files
- `src/NoteManager.tsx`: compact launcher window that creates notes.
- `src/NoteWindow.tsx`: note editor window.
- `src/NoteManager.css`: launcher visuals and peel effect.
- `src/NoteWindow.css`: note window styling.
- `src-tauri/tauri.conf.json`: window sizes and labels.
- `src-tauri/src/lib.rs`: tray/menu and manager window behavior.

## Commands
- Install deps: `npm.cmd install`
- Type-check: `npx.cmd tsc --noEmit`
- Frontend dev: `npm.cmd run dev`
- App dev: `npm.cmd run tauri dev`
- Production build: `npm.cmd run build`

## Working Rules
- Use `npm.cmd`/`npx.cmd` on PowerShell because script execution may block `npm`/`npx`.
- Preserve Tauri drag regions such as `data-tauri-drag-region` when editing frameless windows.
- Note data is stored in `localStorage` under `sticky-notes-data`; keep new manager/note flows compatible with that shape.
- Prefer transparent/frictionless UI changes that respect the small manager window size in `tauri.conf.json`.

## Verification
- Minimum check after UI/code edits: `npx.cmd tsc --noEmit`
- If `vite build` fails with sandbox/process spawn restrictions, note that explicitly rather than assuming the app is broken.
