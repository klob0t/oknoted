import { useEffect } from "react";
import { getCurrentWindow, getAllWindows } from "@tauri-apps/api/window";
import "./NoteManager.css";

const appWindow = getCurrentWindow();

export default function NoteManager() {
  useEffect(() => {
    // Monitor windows to show manager when all notes are closed
    const interval = setInterval(async () => {
      const windows = await getAllWindows();
      const hasNotes = windows.some(w => w.label.startsWith('note-'));
      if (!hasNotes) {
        appWindow.show();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const createNewNote = async () => {
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const id = crypto.randomUUID();
    
    // Initialize data in sticky-notes-data
    const allNotes = JSON.parse(localStorage.getItem("sticky-notes-data") || "{}");
    allNotes[id] = { title: "", contentHtml: "", colorIndex: 0 };
    localStorage.setItem("sticky-notes-data", JSON.stringify(allNotes));

    new WebviewWindow(`note-${id}`, {
      url: `index.html?id=${id}`,
      title: "Sticky Note",
      width: 300,
      height: 300,
      minWidth: 300,
      minHeight: 300,
      decorations: false,
      transparent: true,
      alwaysOnTop: false,
      skipTaskbar: true,
    });
    
    // Hide the manager window after creating a note
    appWindow.hide();
  };

  return (
    <div className="manager-container">
      <div data-tauri-drag-region className="manager-mini-launcher">
        <h1 className="app-logo">oknoted.</h1>
        <button className="add-note-circle" onClick={createNewNote} title="Create New Note">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
    </div>
  );
}
