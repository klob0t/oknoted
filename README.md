# oknoted. 📝

**oknoted.** is a minimalist, high-performance sticky note application built with **Tauri 2** and **React 19**. It aims to provide a seamless, clutter-free note-taking experience that feels like using physical sticky notes on your digital desktop.

![oknoted logo](src/assets/icon/image-readme.png)

## ✨ Features

-   **Multi-Window Support**: Spawn as many notes as you need. Each note exists in its own lightweight window.
-   **Rich Text Editing**:
    -   **Smart Triggers**: Start a list with `1. ` for numbers, `- ` for bullets, or `[] ` for interactive checklists.
    -   **Interactive Checklists**: Click items to mark them as completed.
    -   **Highlighter Pro**: Vibrant neon highlights (Yellow, Green, Blue) with a dedicated "Eraser" tool.
-   **Customization**:
    -   **5 Color Themes**: Cream, Pink, Cyan, Orange, and Green.
    -   **Typography**: Integrated **Stampatello** handwriting font for a natural feel.
-   **Productivity Tools**:
    -   **Pin to Top**: Keep important notes always visible.
    -   **Drag & Drop**: Move notes anywhere on your screen using the custom drag handle.
-   **System Integration**:
    -   **Tray Icon**: Quickly show the Note Manager or quit the app from the system tray.
    -   **Smart Manager**: The central "Note Manager" automatically reappears when all notes are closed.
-   **Easter Egg Peel**: A custom "Patrick Kunka" style peel effect in the manager reveals the creator's logo and a link to their site.
-   **State Persistence**: All your notes, titles, contents, and settings are automatically saved to `localStorage`.

## 🛠️ Tech Stack

-   **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
-   **Backend/Runtime**: [Tauri 2](https://v2.tauri.app/), [Rust](https://www.rust-lang.org/)
-   **Styling**: Vanilla CSS with modern features like `mix-blend-mode` for realistic highlighting.

## 🚀 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (Latest LTS recommended)
-   [Rust](https://www.rust-lang.org/tools/install)
-   **Windows Users**: [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with C++ build tools installed.

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/sticky.git
    cd sticky
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run in development mode:
    ```bash
    npm run tauri dev
    ```

4.  Build for production:
    ```bash
    npm run tauri build
    ```

## 📂 Project Structure

-   `src/`: React frontend source code.
    -   `NoteManager.tsx`: The main launcher window.
    -   `NoteWindow.tsx`: The logic for individual sticky note windows.
-   `src-tauri/`: Rust backend and Tauri configuration.
    -   `tauri.conf.json`: Window definitions and security permissions.
    -   `capabilities/`: Granular permission sets for Tauri 2.
    -   `src/lib.rs`: System tray and window event handling.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details (if applicable).

---
*Made with ❤️ by [klob0t](https://github.com/klob0t)*
