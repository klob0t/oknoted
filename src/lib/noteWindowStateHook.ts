import { type AnimationEvent, useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { deleteNote, readNote, type NoteRecord, updateNote } from "./noteStorage";
import { bindWindowPositionPersistence, createNoteWindow, persistInitialWindowPosition } from "./noteWindowPersistence";

const appWindow = getCurrentWindow();

export function useNoteWindowState(id: string) {
  const initialNoteDataRef = useRef<NoteRecord>(readNote(id));
  const isClosingRef = useRef(false);
  const initialNoteData = initialNoteDataRef.current;

  const [title, setTitle] = useState(() => initialNoteData.title || "");
  const [hlColorIndex, setHlColorIndex] = useState(() => initialNoteData.hlColorIndex ?? 0);
  const [isPinned, setIsPinned] = useState(() => initialNoteData.isPinned ?? false);
  const [displayPinned, setDisplayPinned] = useState(() => initialNoteData.isPinned ?? false);
  const [pinAnimation, setPinAnimation] = useState<"pinning" | "unpinning" | null>(null);

  const saveNoteData = (updates: Partial<NoteRecord>) => {
    if (isClosingRef.current) {
      return;
    }

    updateNote(id, updates);
  };

  useEffect(() => {
    void appWindow.setAlwaysOnTop(isPinned);
  }, [isPinned]);

  useEffect(() => {
    let unlistenMoved: (() => void) | undefined;
    let cancelled = false;

    void bindWindowPositionPersistence(id, appWindow, () => cancelled || isClosingRef.current).then((unlisten) => {
      unlistenMoved = unlisten;
    });

    return () => {
      cancelled = true;
      unlistenMoved?.();
    };
  }, [id]);

  useEffect(() => {
    if (pinAnimation !== "pinning") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDisplayPinned(true);
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [pinAnimation]);

  const spawnNewNote = () => {
    const newId = crypto.randomUUID();
    updateNote(newId, { title: "", contentHtml: "" });
    const noteWindow = createNoteWindow(newId);
    persistInitialWindowPosition(newId, noteWindow);
  };

  const closeNote = async () => {
    isClosingRef.current = true;
    deleteNote(id);
    await appWindow.close();
  };

  const togglePinned = () => {
    const newState = !isPinned;
    setPinAnimation(newState ? "pinning" : "unpinning");
    setIsPinned(newState);
  };

  const handlePinAnimationEnd = (event: AnimationEvent<HTMLButtonElement>) => {
    if (!pinAnimation) {
      return;
    }

    const expectedAnimation = pinAnimation === "pinning" ? "pin-stamp" : "pin-lift";
    if (event.animationName !== expectedAnimation) {
      return;
    }

    if (pinAnimation === "unpinning") {
      setDisplayPinned(false);
    }
    setPinAnimation(null);
  };

  return {
    closeNote,
    displayPinned,
    handlePinAnimationEnd,
    hlColorIndex,
    initialNoteData,
    isClosingRef,
    isPinned,
    pinAnimation,
    saveNoteData,
    setHlColorIndex,
    setTitle,
    spawnNewNote,
    title,
    togglePinned,
  };
}
