import type { Window } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { updateNote } from "./noteStorage";

export const NOTE_WINDOW_DEFAULTS = {
  title: "Sticky Note",
  width: 300,
  height: 300,
  minWidth: 300,
  minHeight: 300,
  decorations: false,
  transparent: true,
  skipTaskbar: true,
} as const;

export function createNoteWindow(id: string, options?: { alwaysOnTop?: boolean; x?: number; y?: number }) {
  return new WebviewWindow(`note-${id}`, {
    url: `index.html?id=${id}`,
    ...NOTE_WINDOW_DEFAULTS,
    alwaysOnTop: options?.alwaysOnTop ?? false,
    x: options?.x,
    y: options?.y,
  });
}

export async function persistWindowPosition(noteId: string, window: Window | WebviewWindow) {
  const position = await window.outerPosition();
  updateNote(noteId, {
    windowPosition: {
      x: position.x,
      y: position.y,
    },
  });
}

export function persistInitialWindowPosition(noteId: string, window: WebviewWindow) {
  window.once("tauri://created", async () => {
    try {
      await persistWindowPosition(noteId, window);
    } catch {
      // Ignore initial position persistence failures.
    }
  });
}

export async function bindWindowPositionPersistence(
  noteId: string,
  window: Window,
  shouldSkip: () => boolean
) {
  const saveWindowPosition = async () => {
    try {
      if (shouldSkip()) {
        return;
      }

      await persistWindowPosition(noteId, window);
    } catch {
      // Ignore best-effort position persistence failures.
    }
  };

  await saveWindowPosition();
  return window.onMoved(() => {
    void saveWindowPosition();
  });
}
