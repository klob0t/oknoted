import { useState, useEffect } from "react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow, getAllWindows } from "@tauri-apps/api/window";
import "./App.css";

const appWindow = getCurrentWindow();

export default function NoteManager() {
  const [notes, setNotes] = useState<Record<string, any>>({});

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("sticky-notes-data") || "{}");
    setNotes(data);

    // Monitor windows to show manager when all notes are closed
    const interval = setInterval(async () => {
      const windows = await getAllWindows();
      const hasNotes = windows.some(w => w.label.startsWith('note-'));
      const isVisible = await appWindow.isVisible();
      
      // If no notes are open, make sure manager is shown
      if (!hasNotes && !isVisible) {
        appWindow.show();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const spawnWindow = (id: string) => {
    const baseUrl = window.location.href.split('?')[0];
    const url = `${baseUrl}?id=${id}`;
    
    console.log("Spawning window with URL:", url);

    const webview = new WebviewWindow(`note-${id}`, {
      url: url,
      title: "Sticky Note",
      width: 300,
      height: 300,
      decorations: false,
      transparent: true,
      alwaysOnTop: false,
    });

    webview.once('tauri://error', (e) => {
      console.error("Failed to create window:", e);
    });
    
    webview.once('tauri://created', () => {
      console.log("Window created successfully!");
    });
  };

  const spawnNewNote = () => {
    const newId = crypto.randomUUID();
    
    // Add to data if not exists
    const data = JSON.parse(localStorage.getItem("sticky-notes-data") || "{}");
    data[newId] = { title: "", contentHtml: "", colorIndex: 0 };
    localStorage.setItem("sticky-notes-data", JSON.stringify(data));

    spawnWindow(newId);
    
    // For now, let's keep manager visible so we can see what's happening
    // appWindow.hide();

    setNotes({...data});
  };

  const openExistingNote = (id: string) => {
    spawnWindow(id);
    // appWindow.hide();
  };

  const deleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = { ...notes };
    delete updated[id];
    localStorage.setItem("sticky-notes-data", JSON.stringify(updated));
    setNotes(updated);
  };

  const noteIds = Object.keys(notes);

  return (
    <div className="manager-container">
      <div className="manager-header">
        <h1>Sticky Notes</h1>
        <button className="add-main-btn" onClick={spawnNewNote}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Note
        </button>
      </div>

      {noteIds.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h2>No Sticky Notes Yet</h2>
          <p>Create your first note to get started!</p>
          <button className="create-first-btn" onClick={spawnNewNote}>
            Create First Note
          </button>
        </div>
      ) : (
        <div className="notes-list">
          {noteIds.map(id => (
            <div key={id} className="note-item" onClick={() => openExistingNote(id)}>
              <div className="note-item-info">
                <span className="note-item-title">{notes[id].title || "Untitled Note"}</span>
                <span className="note-item-preview">
                  {notes[id].contentHtml ? notes[id].contentHtml.replace(/<[^>]*>/g, '').slice(0, 40) : "No content..."}
                </span>
              </div>
              <button className="delete-note-btn" onClick={(e) => deleteNote(id, e)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
