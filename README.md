# oknoted.

**oknoted.** is a minimalist sticky note app built with **Tauri 2** and **React 19** for people who want to capture things quickly and get back to work.

It is lightweight, fast, and deliberately simple: a modern desktop take on sticky notes, minus the paper trail.

![oknoted logo](src/assets/icon/image-readme.png)

## Overview

oknoted. is designed to feel immediate and unobtrusive. Open a note, write what you need, move it where it belongs, and keep going. No heavy workspace setup, no unnecessary ceremony, and no feature bloat pretending to be productivity.

Each note runs in its own lightweight window, so your desktop can stay organized, chaotic, or somewhere in between.

## Features

- **Multi-window notes**  
  Open as many notes as you need. Each one lives in its own lightweight window.

- **Rich text editing with smart triggers**  
  Write naturally and let the editor keep up:
  - Type `1. ` to start a numbered list
  - Type `- ` to start a bulleted list
  - Type `[] ` to create an interactive checklist

- **Interactive checklists**  
  Click checklist items to mark them complete.

- **Highlighting tools**  
  Add neon-style highlights in Yellow, Green, or Blue. There is also an eraser tool for cleaning things up when necessary.

- **Drawing mode**  
  Sketch directly on notes with a pen tool, eraser, and multiple pen colors.

- **Handwritten note feel**  
  Includes the [**Stampatello**](https://www.1001fonts.com/stampatello-faceto-font.html) font for a more natural, paper-like look.

- **Pin to Top**  
  Keep important notes visible above everything else.

- **Drag and Drop**  
  Move notes freely around your desktop using the custom drag handle.

- **System tray integration**  
  Access the Note Manager or quit the app directly from the tray.

- **Smart Note Manager**  
  When all notes are closed, the manager automatically reappears so the app never leaves you with a dead end.

- **Peel interactions**  
  Both the manager and note windows use custom peel interactions for creating notes, deleting notes, and linking out.

- **State persistence**  
  Notes, titles, content, drawings, settings, and note positions are automatically saved and restored.

- **Windows startup restore**  
  After first run, the app can launch at Windows startup and reopen any unclosed notes where they were left.

## Tech Stack

- **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **Backend / Runtime:** [Tauri 2](https://v2.tauri.app/), [Rust](https://www.rust-lang.org/)

## Getting Started

### Prerequisites

Before running the app, make sure you have:

- [Node.js](https://nodejs.org/) (latest LTS recommended)
- [Rust](https://www.rust-lang.org/tools/install)
- **Windows users:** [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with C++ build tools installed

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/sticky.git
   cd sticky
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run the app in development mode:

   ```bash
   npm run tauri dev
   ```

4. Build for production:

   ```bash
   npm run tauri build
   ```

## Project Structure

- `src/`  
  React frontend source code

- `src/NoteManager.tsx`  
  The main launcher and manager window

- `src/NoteWindow.tsx`  
  The logic for individual sticky note windows

- `src/noteStorage.ts`  
  Shared note persistence helpers

- `src-tauri/`  
  Rust backend and Tauri configuration

- `src-tauri/tauri.conf.json`  
  Window definitions and security configuration

- `src-tauri/capabilities/`  
  Granular permission sets for Tauri 2

- `src-tauri/src/lib.rs`  
  System tray logic and Tauri plugin setup

## Why oknoted.

There are plenty of note apps that want to become your second operating system.

oknoted. does not.

It is built for quick thoughts, small reminders, loose planning, and the kind of notes that deserve to stay visible without demanding your full attention.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
