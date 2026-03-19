import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import "./NoteWindow.css";

const HL_COLORS = [
  { name: "Neon Yellow", color: "#fff700" },
  { name: "Neon Green", color: "#2efd61" },
  { name: "Neon Blue", color: "#33d9ff" },
  { name: "Clear", color: "transparent" },
];

const appWindow = getCurrentWindow();

interface NoteWindowProps {
  id: string;
}

export default function NoteWindow({ id }: NoteWindowProps) {
  const noteRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const isClosing = useRef(false);
  const createPeelRef = useRef(0);
  const deletePeelRef = useRef(0);
  const highlightCloseTimeoutRef = useRef<number | null>(null);
  const lastContentRangeRef = useRef<Range | null>(null);

  const getNoteData = () => {
    const allNotes = JSON.parse(localStorage.getItem("sticky-notes-data") || "{}");
    return allNotes[id] || {};
  };

  const saveNoteData = (updates: any) => {
    if (isClosing.current) return;
    const allNotes = JSON.parse(localStorage.getItem("sticky-notes-data") || "{}");
    allNotes[id] = { ...allNotes[id], ...updates };
    localStorage.setItem("sticky-notes-data", JSON.stringify(allNotes));
  };

  const [title, setTitle] = useState(() => getNoteData().title || "");
  const [hlColorIndex, setHlColorIndex] = useState(() => getNoteData().hlColorIndex ?? 0);
  const [isChecklist, setIsChecklist] = useState(() => getNoteData().isChecklist ?? false);
  const [isPinned, setIsPinned] = useState(() => getNoteData().isPinned ?? false);
  const [isHighlightPaletteOpen, setIsHighlightPaletteOpen] = useState(false);
  const [isCreateHovered, setIsCreateHovered] = useState(false);
  const [isDeleteHovered, setIsDeleteHovered] = useState(false);
  const [isDeleteArmed, setIsDeleteArmed] = useState(false);
  const [createPeel, setCreatePeel] = useState(0);
  const [deletePeel, setDeletePeel] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const openHighlightPalette = () => {
    if (highlightCloseTimeoutRef.current !== null) {
      window.clearTimeout(highlightCloseTimeoutRef.current);
      highlightCloseTimeoutRef.current = null;
    }
    setIsHighlightPaletteOpen(true);
  };

  const closeHighlightPaletteSoon = () => {
    if (highlightCloseTimeoutRef.current !== null) {
      window.clearTimeout(highlightCloseTimeoutRef.current);
    }
    highlightCloseTimeoutRef.current = window.setTimeout(() => {
      setIsHighlightPaletteOpen(false);
      highlightCloseTimeoutRef.current = null;
    }, 140);
  };

  useEffect(() => {
    if (!isClosing.current) {
      saveNoteData({ title, hlColorIndex, isChecklist, isPinned });
    }
  }, [title, hlColorIndex, isChecklist, isPinned]);

  useEffect(() => {
    appWindow.setAlwaysOnTop(isPinned);
  }, []);

  useEffect(() => {
    return () => {
      if (highlightCloseTimeoutRef.current !== null) {
        window.clearTimeout(highlightCloseTimeoutRef.current);
      }
    };
  }, []);

  const rememberContentSelection = () => {
    const selection = window.getSelection();
    const editor = contentRef.current;
    if (!selection || selection.rangeCount === 0 || !editor) return;

    const range = selection.getRangeAt(0);
    const commonAncestor = range.commonAncestorContainer;
    if (editor.contains(commonAncestor)) {
      lastContentRangeRef.current = range.cloneRange();
    }
  };

  const restoreContentSelection = () => {
    const editor = contentRef.current;
    const savedRange = lastContentRangeRef.current;
    const selection = window.getSelection();
    if (!editor || !savedRange || !selection) return false;

    editor.focus();
    selection.removeAllRanges();
    selection.addRange(savedRange.cloneRange());
    return true;
  };

  useLayoutEffect(() => {
    const element = noteRef.current;
    if (!element) return;

    const updateSize = () => {
      setSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    window.addEventListener("resize", updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  useEffect(() => {
    createPeelRef.current = createPeel;
  }, [createPeel]);

  useEffect(() => {
    deletePeelRef.current = deletePeel;
  }, [deletePeel]);

  const animatePeel = (
    targetPeel: number,
    currentRef: React.MutableRefObject<number>,
    setValue: React.Dispatch<React.SetStateAction<number>>
  ) => {
    const startPeel = currentRef.current;
    const delta = targetPeel - startPeel;

    if (Math.abs(delta) < 0.1) {
      setValue(targetPeel);
      return () => undefined;
    }

    const duration = 420;
    const startTime = performance.now();
    let frameId = 0;

    const easeOutBack = (t: number, overshoot: number) => {
      const x = t - 1;
      return 1 + (overshoot + 1) * x * x * x + overshoot * x * x;
    };

    const ease = (t: number) => {
      if (targetPeel === 0) return 1 - Math.pow(1 - t, 3);
      return easeOutBack(t, 0.48);
    };

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setValue(startPeel + delta * ease(progress));
      if (progress < 1) frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  };

  useEffect(() => animatePeel(isCreateHovered ? 36 : 0, createPeelRef, setCreatePeel), [isCreateHovered]);
  useEffect(() => animatePeel(isDeleteHovered ? 46 : 0, deletePeelRef, setDeletePeel), [isDeleteHovered]);

  useEffect(() => {
    if (!isDeleteHovered) {
      setIsDeleteArmed(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsDeleteArmed(true);
    }, 200);

    return () => window.clearTimeout(timeoutId);
  }, [isDeleteHovered]);

  useEffect(() => {
    if (isInitialLoad.current && contentRef.current) {
      contentRef.current.innerHTML = getNoteData().contentHtml || "";
      isInitialLoad.current = false;
    }
  }, []);

  const spawnNewNote = () => {
    const newId = crypto.randomUUID();
    const allNotes = JSON.parse(localStorage.getItem("sticky-notes-data") || "{}");
    allNotes[newId] = { title: "", contentHtml: "" };
    localStorage.setItem("sticky-notes-data", JSON.stringify(allNotes));

    new WebviewWindow(`note-${newId}`, {
      url: `index.html?id=${newId}`,
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
  };

  const closeNote = async () => {
    isClosing.current = true;
    const allNotes = JSON.parse(localStorage.getItem("sticky-notes-data") || "{}");
    delete allNotes[id];
    localStorage.setItem("sticky-notes-data", JSON.stringify(allNotes));
    await appWindow.close();
  };

  const togglePinned = () => {
    const newState = !isPinned;
    setIsPinned(newState);
    appWindow.setAlwaysOnTop(newState);
  };

  const applyHighlight = (color?: string) => {
    if (isClosing.current) return;
    const targetColor = color || HL_COLORS[hlColorIndex].color;
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      document.execCommand("hiliteColor", false, targetColor);
      saveContent();
    }
  };

  const saveContent = () => {
    if (contentRef.current && !isClosing.current) {
      saveNoteData({ contentHtml: contentRef.current.innerHTML });
    }
  };

  const isEditorEffectivelyEmpty = () => {
    const editor = contentRef.current;
    if (!editor) return true;

    const text = editor.textContent?.replace(/\u00a0/g, " ").trim() || "";
    const normalizedHtml = editor.innerHTML.replace(/<br\s*\/?>/gi, "").replace(/\s/g, "");
    return text.length === 0 && normalizedHtml.length === 0;
  };

  const placeCaretAtStart = (element: HTMLElement) => {
    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const placeCaretAtEnd = (element: HTMLElement) => {
    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const insertEmptyChecklist = () => {
    const editor = contentRef.current;
    if (!editor) return;

    editor.innerHTML = '<ul class="checklist"><li><br></li></ul>';
    const firstItem = editor.querySelector("li");
    if (firstItem instanceof HTMLElement) {
      editor.focus();
      placeCaretAtStart(firstItem);
    }
  };

  const unwrapChecklistToParagraphs = (list: HTMLElement) => {
    const editor = contentRef.current;
    if (!editor) return;

    const fragment = document.createDocumentFragment();
    const items = Array.from(list.querySelectorAll(":scope > li"));
    let caretTarget: HTMLElement | null = null;

    items.forEach((item) => {
      const paragraph = document.createElement("div");
      paragraph.innerHTML = item.innerHTML;
      paragraph.classList.remove("checked");

      if (paragraph.innerHTML.trim() === "") {
        paragraph.innerHTML = "<br>";
      }

      fragment.appendChild(paragraph);
      if (!caretTarget) caretTarget = paragraph;
    });

    list.replaceWith(fragment);

    const fallbackTarget = caretTarget || editor;
    if (fallbackTarget instanceof HTMLElement) {
      editor.focus();
      placeCaretAtEnd(fallbackTarget);
    }
  };

  const handleToggleChecklist = () => {
    if (isEditorEffectivelyEmpty()) {
      insertEmptyChecklist();
      setIsChecklist(true);
      saveContent();
      return;
    }

    const selection = window.getSelection();
    if ((!selection || selection.rangeCount === 0) && !restoreContentSelection()) return;

    const activeSelection = window.getSelection();
    if (!activeSelection || activeSelection.rangeCount === 0) return;

    const anchor = activeSelection.anchorNode;
    const parentList = anchor?.parentElement?.closest("ul, ol");
    const activeListItem = anchor?.parentElement?.closest("li");

    if (parentList) {
      if (parentList.classList.contains("checklist")) {
        if (parentList instanceof HTMLElement) {
          unwrapChecklistToParagraphs(parentList);
        }
        setIsChecklist(false);
      } else {
        parentList.classList.add("checklist");
        if (parentList.tagName === "OL") {
          document.execCommand("insertUnorderedList");
          const newList = window.getSelection()?.anchorNode?.parentElement?.closest("ul");
          if (newList) {
            newList.classList.add("checklist");
            const targetItem = window.getSelection()?.anchorNode?.parentElement?.closest("li")
              || newList.querySelector("li");
            if (targetItem instanceof HTMLElement) {
              placeCaretAtEnd(targetItem);
            }
          }
        }
        setIsChecklist(true);
      }
    } else {
      document.execCommand("insertUnorderedList");
      const newList = window.getSelection()?.anchorNode?.parentElement?.closest("ul");
      if (newList) {
        newList.classList.add("checklist");
        const targetItem = window.getSelection()?.anchorNode?.parentElement?.closest("li")
          || activeListItem
          || newList.querySelector("li");
        if (targetItem instanceof HTMLElement) {
          placeCaretAtEnd(targetItem);
        }
      }
      setIsChecklist(true);
    }
    rememberContentSelection();
    saveContent();
  };

  const handleContentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " ") {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const container = range.startContainer;
      const text = container.textContent || "";
      const offset = range.startOffset;
      const textBefore = text.slice(0, offset);

      if (textBefore === "1.") {
        e.preventDefault();
        range.setStart(container, offset - 2);
        range.deleteContents();
        document.execCommand("insertOrderedList");
      } else if (textBefore === "-") {
        e.preventDefault();
        range.setStart(container, offset - 1);
        range.deleteContents();
        document.execCommand("insertUnorderedList");
      } else if (textBefore === "[]") {
        e.preventDefault();
        range.setStart(container, offset - 2);
        range.deleteContents();
        document.execCommand("insertUnorderedList");
        const newList = window.getSelection()?.anchorNode?.parentElement?.closest("ul");
        if (newList) newList.classList.add("checklist");
      }
    }
  };

  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "LI") {
      const parentList = target.closest("ul");
      if (parentList && parentList.classList.contains("checklist")) {
        target.classList.toggle("checked");
        saveContent();
      }
    }
  };

  const buildRoundedTrianglePath = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
    radius: number
  ) => {
    const distAB = Math.hypot(ax - bx, ay - by);
    const distCB = Math.hypot(cx - bx, cy - by);
    const cornerRadius = Math.min(radius, distAB * 0.35, distCB * 0.35);
    if (cornerRadius <= 0.01) return `M ${ax} ${ay} L ${bx} ${by} L ${cx} ${cy} Z`;

    const t1x = bx + ((ax - bx) / distAB) * cornerRadius;
    const t1y = by + ((ay - by) / distAB) * cornerRadius;
    const t2x = bx + ((cx - bx) / distCB) * cornerRadius;
    const t2y = by + ((cy - by) / distCB) * cornerRadius;

    return `M ${ax} ${ay} L ${t1x} ${t1y} Q ${bx} ${by} ${t2x} ${t2y} L ${cx} ${cy} Z`;
  };

  const viewWidth = Math.max(size.width, 1);
  const viewHeight = Math.max(size.height, 1);
  const createLiftX = createPeel * 1.08;
  const createLiftY = createPeel * 0.94;
  const createCornerRadius = Math.min(createPeel * 0.24, 7);
  const createFlapPath = createPeel > 0
    ? buildRoundedTrianglePath(viewWidth - createPeel, 0, viewWidth - createLiftX, createLiftY, viewWidth, createPeel, createCornerRadius)
    : "";
  const deleteLiftX = deletePeel * 0.94;
  const deleteLiftY = deletePeel * 1.08;
  const deleteCornerRadius = Math.min(deletePeel * 0.24, 7);
  const deleteFlapPath = deletePeel > 0
    ? buildRoundedTrianglePath(0, viewHeight - deletePeel, deleteLiftX, viewHeight - deleteLiftY, deletePeel, viewHeight, deleteCornerRadius)
    : "";
  const createShadowPoints = createPeel > 0
    ? `${viewWidth - createPeel + 2},4 ${viewWidth - createLiftX + 5},${createLiftY + 7} ${viewWidth + 1},${createPeel + 6}`
    : "";
  const deleteShadowPoints = deletePeel > 0
    ? `4,${viewHeight - deletePeel + 1} ${deleteLiftX + 5},${viewHeight - deleteLiftY + 5} ${deletePeel + 6},${viewHeight + 1}`
    : "";

  return (
    <div ref={noteRef} className="sticky-container">
      {createPeel > 0 ? (
        <>
          <div className="note-underlay note-underlay-create" aria-hidden="true">
            <span className="note-underlay-plus">+</span>
          </div>
          <svg className="note-geometry note-flap-shadow-geometry" viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="none" aria-hidden="true">
            <polygon className="note-flap-shadow-shape" points={createShadowPoints} />
          </svg>
          <svg className="note-geometry note-flap-geometry" viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="note-create-flap-gradient" x1="28%" y1="78%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fad25f" />
                <stop offset="16%" stopColor="#f8bf1d" />
                <stop offset="80%" stopColor="#99580e" />
                <stop offset="100%" stopColor="#462000" />
              </linearGradient>
            </defs>
            <path className="note-flap-shape" d={createFlapPath} />
            <path className="note-flap-face-gradient" d={createFlapPath} fill="url(#note-create-flap-gradient)" />
            <polyline className="note-flap-seam" points={`${viewWidth - createPeel},0 ${viewWidth},${createPeel}`} />
          </svg>
        </>
      ) : null}

      <div className={`note-underlay note-underlay-delete${isDeleteArmed ? " is-open" : ""}`} aria-hidden="true">
        <svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
          <path className="trash-body" d="M671.24,348.89l-46.05,413.49h-250.36l-46.05-413.49h342.47M671.24,268.89h-342.48c-22.76,0-44.44,9.69-59.62,26.65-15.18,16.96-22.41,39.58-19.89,62.2l46.05,413.49c4.51,40.51,38.75,71.14,79.51,71.14h250.36c40.76,0,75-30.64,79.51-71.14l45.91-412.16c.42-3.34.64-6.74.64-10.19,0-44.18-35.81-80-80-80Z"/>
          <path className="trash-lid" d="M694.66,150.62h-127.62c0-.09,0-.19,0-.28,0-22.09-17.91-40-40-40h-54.09c-22.09,0-40,17.91-40,40,0,.1,0,.19,0,.28h-127.62c-22.09,0-40,17.91-40,40s17.91,40,40,40h389.32c22.09,0,40-17.91,40-40s-17.91-40-40-40Z"/>
        </svg>
      </div>

      {deletePeel > 0 ? (
        <>
          <svg className="note-geometry note-flap-shadow-geometry" viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="none" aria-hidden="true">
            <polygon className="note-flap-shadow-shape" points={deleteShadowPoints} />
          </svg>
          <svg className="note-geometry note-flap-geometry" viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="note-delete-flap-gradient" x1="72%" y1="22%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fad25f" />
                <stop offset="16%" stopColor="#f8bf1d" />
                <stop offset="80%" stopColor="#99580e" />
                <stop offset="100%" stopColor="#462000" />
              </linearGradient>
            </defs>
            <path className="note-flap-shape note-flap-shape-delete" d={deleteFlapPath} />
            <path className="note-flap-face-gradient note-flap-face-gradient-delete" d={deleteFlapPath} fill="url(#note-delete-flap-gradient)" />
            <polyline className="note-flap-seam" points={`0,${viewHeight - deletePeel} ${deletePeel},${viewHeight}`} />
          </svg>
        </>
      ) : null}

      <div
        className="note-surface"
        style={
          {
            "--create-peel": `${createPeel}px`,
            "--delete-peel": `${deletePeel}px`,
          } as React.CSSProperties
        }
      >
        <div className="note-surface-controls">
          <button className={`icon-btn pin-btn ${isPinned ? "active" : ""}`} onClick={togglePinned} title={isPinned ? "Unpin Note" : "Pin Note"}>
            <svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
              <path d="M544.45,192.12l114.96,100.12.11-.12,115.39,99.62-79.03,16.21-140.91,162.5-4.86,80.52-114.96-100.12.11-.12-115.39-99.62,79.03-16.21,140.69-162.25,4.86-80.52M544.44,102.12c-11.74,0-23.56,2.3-34.79,7-31.63,13.26-52.97,43.35-55.04,77.58l-3.02,50.05-100.69,116.12-49.12,10.08c-33.6,6.89-60.36,32.28-69,65.47-8.65,33.19,2.32,68.41,28.28,90.82l111.23,96.03c1.21,1.18,2.46,2.34,3.76,3.46l114.96,100.12c16.69,14.53,37.77,22.13,59.12,22.13,11.74,0,23.56-2.3,34.79-7,31.63-13.26,52.97-43.35,55.04-77.58l3.02-50.05,100.91-116.37,49.12-10.08c33.6-6.89,60.36-32.28,69.01-65.47,8.65-33.19-2.32-68.41-28.28-90.82l-115.39-99.62c-1.3-1.12-2.62-2.19-3.96-3.23l-110.82-96.51c-16.69-14.53-37.77-22.13-59.12-22.13h0Z" fill="currentColor" opacity="0.8"/>
              <polygon className="pin-core" points="774.91 391.73 695.88 407.94 554.97 570.45 550.11 650.97 435.16 550.85 435.26 550.73 319.87 451.11 398.9 434.9 539.59 272.64 544.45 192.12 659.41 292.24 659.51 292.11 774.91 391.73" fill="currentColor" opacity="0"/>
              <polygon points="472.94 583.61 224.91 811 207.41 795.83 397.38 518.1 472.94 583.61 472.94 583.61" fill="currentColor" opacity="0.8"/>
            </svg>
          </button>

          <div data-tauri-drag-region className="pill-drag-handle" />
        </div>

        <input className="title-input" placeholder="title..." value={title} onChange={(e) => setTitle(e.target.value)} spellCheck="false" />

        <div
          ref={contentRef}
          className="note-content"
          contentEditable
          onInput={saveContent}
          onKeyUp={rememberContentSelection}
          onMouseUp={rememberContentSelection}
          onFocus={rememberContentSelection}
          onClick={handleContentClick}
          onKeyDown={handleContentKeyDown}
          data-placeholder="..."
          spellCheck="false"
          suppressContentEditableWarning={true}
        />

        <div className="note-surface-tools">
          <div className="tool-actions">
            <div
              className={`hl-controls${isHighlightPaletteOpen ? " is-open" : ""}`}
              onPointerEnter={openHighlightPalette}
              onPointerLeave={closeHighlightPaletteSoon}
            >
              <button type="button" className="icon-btn highlight-btn" onMouseDown={(e) => { e.preventDefault(); applyHighlight(); }} title="Highlight Selection">
                <svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
                  <path fill="currentColor" d="M618.64,231.51c-.96-11.89-6.61-22.92-15.7-30.65l-130.44-110.91c-18.93-16.1-47.33-13.8-63.43,5.13l-135.88,159.81-125.87,148.03c-4.87,5.73-8.23,12.59-9.77,19.96l-32.51,155.76c-2.59,12.44.19,25.39,7.66,35.67,7.48,10.27,18.94,16.91,31.58,18.27l65.04,7c1.61.17,3.22.26,4.82.26,13.38,0,26.17-5.97,34.77-16.44l25.5-31.05,42.51-4.64c11.43-1.24,21.95-6.82,29.4-15.58l148.39-174.52,113.36-133.32c7.73-9.09,11.54-20.88,10.57-32.78ZM289.36,500.19l-42.94,4.68c-11.7,1.27-22.43,7.08-29.9,16.17l-10.08,12.26,16.87-80.81,126.21-148.42,68.87,44.37-129.03,151.75Z" />
                  <path fill="currentColor" d="M850.91,843.4H149.09c-33.14,0-60-26.86-60-60s26.86-60,60-60h701.81c33.14,0,60,26.86,60,60s-26.86,60-60,60Z" />
                </svg>
              </button>
              <div className="hl-popup" onPointerEnter={openHighlightPalette} onPointerLeave={closeHighlightPaletteSoon}>
                {HL_COLORS.map((c, i) => (
                  <div
                    key={c.name}
                    className={`hl-popup-item ${i === hlColorIndex ? "active" : ""}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setHlColorIndex(i);
                      applyHighlight(c.color);
                    }}
                    title={c.name}
                  >
                    <div className="hl-dot" style={{ backgroundColor: c.color }}>
                      {c.name === "Clear" && "×"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button
              type="button"
              className={`icon-btn ${isChecklist ? "active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleToggleChecklist();
              }}
              title="Checklist Mode"
            >
              <svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="90" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="152.68 369.21 233.28 459.48 419.19 259.6"/>
                <line x1="536.75" y1="368.13" x2="847.32" y2="368.13"/>
                <polyline points="152.68 650.14 233.28 740.4 419.19 540.52"/>
                <line x1="536.75" y1="649.06" x2="847.32" y2="649.06"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <button type="button" className="corner-hit-area corner-hit-area-create" onPointerEnter={() => setIsCreateHovered(true)} onPointerLeave={() => setIsCreateHovered(false)} onClick={spawnNewNote} title="New">
        <span className="sr-only">New</span>
      </button>

      <button type="button" className="corner-hit-area corner-hit-area-delete" onPointerEnter={() => setIsDeleteHovered(true)} onPointerLeave={() => setIsDeleteHovered(false)} onClick={closeNote} title="Delete">
        <span className="sr-only">Delete</span>
      </button>
    </div>
  );
}
