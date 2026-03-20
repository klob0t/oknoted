export const NOTE_STORAGE_KEY = "sticky-notes-data";

export type NoteWindowPosition = {
  x: number;
  y: number;
};

export type NoteRecord = {
  title?: string;
  contentHtml?: string;
  colorIndex?: number;
  hlColorIndex?: number;
  isChecklist?: boolean;
  isPinned?: boolean;
  drawStrokes?: unknown[];
  drawColorIndex?: number;
  windowPosition?: NoteWindowPosition;
};

export type NoteStore = Record<string, NoteRecord>;

export function readNoteStore(): NoteStore {
  try {
    const raw = localStorage.getItem(NOTE_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed as NoteStore : {};
  } catch {
    return {};
  }
}

export function writeNoteStore(store: NoteStore) {
  localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(store));
}

export function readNote(id: string): NoteRecord {
  return readNoteStore()[id] || {};
}

export function updateNote(id: string, updates: Partial<NoteRecord>) {
  const store = readNoteStore();
  store[id] = { ...store[id], ...updates };
  writeNoteStore(store);
}

export function deleteNote(id: string) {
  const store = readNoteStore();
  delete store[id];
  writeNoteStore(store);
}
