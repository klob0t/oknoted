import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { FaPlus } from "react-icons/fa";
import { LuEraser, LuHighlighter, LuPencil } from "react-icons/lu";
import { TbPinned, TbPinnedFilled } from "react-icons/tb";
import { deleteNote, readNote, updateNote } from "./noteStorage";
import "./NoteWindow.css";

type DrawPoint = {
  x: number;
  y: number;
};

type DrawStroke = {
  id: string;
  points: DrawPoint[];
  color: string;
  width: number;
};

const HL_COLORS = [
  { name: "Neon Yellow", color: "#fff700" },
  { name: "Neon Green", color: "#2efd61" },
  { name: "Neon Blue", color: "#33d9ff" },
  { name: "Clear", color: "transparent" },
];

const DRAW_COLORS = [
  { name: "Brown", color: "#8f3a06" },
  { name: "Red", color: "#c2410c" },
  { name: "Blue", color: "#2563eb" },
];

const DRAW_PEN_WIDTH = 3.5;

const appWindow = getCurrentWindow();

interface NoteWindowProps {
  id: string;
}

export default function NoteWindow({ id }: NoteWindowProps) {
  const noteRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const isClosing = useRef(false);
  const createPeelRef = useRef(0);
  const deletePeelRef = useRef(0);
  const highlightCloseTimeoutRef = useRef<number | null>(null);
  const drawPaletteCloseTimeoutRef = useRef<number | null>(null);
  const lastContentRangeRef = useRef<Range | null>(null);
  const activeStrokeRef = useRef<DrawStroke | null>(null);
  const didBindWindowPositionRef = useRef(false);

  const getNoteData = () => {
    return readNote(id);
  };

  const saveNoteData = (updates: any) => {
    if (isClosing.current) return;
    updateNote(id, updates);
  };

  const [title, setTitle] = useState(() => getNoteData().title || "");
  const [hlColorIndex, setHlColorIndex] = useState(() => getNoteData().hlColorIndex ?? 0);
  const [isChecklist, setIsChecklist] = useState(() => getNoteData().isChecklist ?? false);
  const [isPinned, setIsPinned] = useState(() => getNoteData().isPinned ?? false);
  const [displayPinned, setDisplayPinned] = useState(() => getNoteData().isPinned ?? false);
  const [pinAnimation, setPinAnimation] = useState<"pinning" | "unpinning" | null>(null);
  const [drawStrokes, setDrawStrokes] = useState<DrawStroke[]>(() => (getNoteData().drawStrokes as DrawStroke[] | undefined) ?? []);
  const [drawColorIndex, setDrawColorIndex] = useState(() => getNoteData().drawColorIndex ?? 0);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawTool, setDrawTool] = useState<"pen" | "eraser">("pen");
  const [activeStroke, setActiveStroke] = useState<DrawStroke | null>(null);
  const [isHighlightPaletteOpen, setIsHighlightPaletteOpen] = useState(false);
  const [isDrawPaletteOpen, setIsDrawPaletteOpen] = useState(false);
  const [isCreateHovered, setIsCreateHovered] = useState(false);
  const [isDeleteHovered, setIsDeleteHovered] = useState(false);
  const [isDeleteArmed, setIsDeleteArmed] = useState(false);
  const [createPeel, setCreatePeel] = useState(0);
  const [deletePeel, setDeletePeel] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const openHighlightPalette = () => {
    setIsDrawPaletteOpen(false);
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

  const openDrawPalette = () => {
    if (drawPaletteCloseTimeoutRef.current !== null) {
      window.clearTimeout(drawPaletteCloseTimeoutRef.current);
      drawPaletteCloseTimeoutRef.current = null;
    }
    setIsDrawPaletteOpen(true);
  };

  const closeDrawPaletteSoon = () => {
    if (drawPaletteCloseTimeoutRef.current !== null) {
      window.clearTimeout(drawPaletteCloseTimeoutRef.current);
    }
    drawPaletteCloseTimeoutRef.current = window.setTimeout(() => {
      setIsDrawPaletteOpen(false);
      drawPaletteCloseTimeoutRef.current = null;
    }, 140);
  };

  const activateDrawTool = (tool: "pen" | "eraser") => {
    setIsHighlightPaletteOpen(false);
    if (tool !== "pen") {
      setIsDrawPaletteOpen(false);
    }
    setDrawTool((currentTool) => {
      if (isDrawingMode && currentTool === tool) {
        setIsDrawingMode(false);
        return currentTool;
      }

      setIsDrawingMode(true);
      return tool;
    });
  };

  useEffect(() => {
    if (!isClosing.current) {
      saveNoteData({ title, hlColorIndex, isChecklist, isPinned, drawColorIndex });
    }
  }, [title, hlColorIndex, isChecklist, isPinned, drawColorIndex]);

  useEffect(() => {
    if (!isClosing.current) {
      saveNoteData({ drawStrokes });
    }
  }, [drawStrokes]);

  useEffect(() => {
    if (!isDrawingMode) {
      activeStrokeRef.current = null;
      setActiveStroke(null);
    }
  }, [isDrawingMode]);

  useEffect(() => {
    appWindow.setAlwaysOnTop(isPinned);
  }, []);

  useEffect(() => {
    if (didBindWindowPositionRef.current) {
      return;
    }

    didBindWindowPositionRef.current = true;
    let unlistenMoved: (() => void) | undefined;
    let cancelled = false;

    const saveWindowPosition = async () => {
      try {
        const position = await appWindow.outerPosition();
        if (cancelled || isClosing.current) {
          return;
        }

        saveNoteData({
          windowPosition: {
            x: position.x,
            y: position.y,
          },
        });
      } catch {
        // Ignore best-effort position persistence failures.
      }
    };

    void saveWindowPosition();
    void appWindow.onMoved(() => {
      void saveWindowPosition();
    }).then((unlisten) => {
      unlistenMoved = unlisten;
    });

    return () => {
      cancelled = true;
      unlistenMoved?.();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (highlightCloseTimeoutRef.current !== null) {
        window.clearTimeout(highlightCloseTimeoutRef.current);
      }
      if (drawPaletteCloseTimeoutRef.current !== null) {
        window.clearTimeout(drawPaletteCloseTimeoutRef.current);
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
    updateNote(newId, { title: "", contentHtml: "" });

    const noteWindow = new WebviewWindow(`note-${newId}`, {
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

    noteWindow.once("tauri://created", async () => {
      try {
        const position = await noteWindow.outerPosition();
        updateNote(newId, {
          windowPosition: {
            x: position.x,
            y: position.y,
          },
        });
      } catch {
        // Ignore initial position persistence failures.
      }
    });
  };

  const closeNote = async () => {
    isClosing.current = true;
    deleteNote(id);
    await appWindow.close();
  };

  const togglePinned = () => {
    const newState = !isPinned;
    setPinAnimation(newState ? "pinning" : "unpinning");
    setIsPinned(newState);
    appWindow.setAlwaysOnTop(newState);
  };

  useEffect(() => {
    if (pinAnimation !== "pinning") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDisplayPinned(true);
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [pinAnimation]);

  const handlePinAnimationEnd = (event: React.AnimationEvent<HTMLButtonElement>) => {
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

  const getDrawPoint = (clientX: number, clientY: number): DrawPoint | null => {
    const surface = surfaceRef.current;
    if (!surface) return null;

    const rect = surface.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const clamp = (value: number) => Math.max(0, Math.min(1, value));
    return {
      x: clamp((clientX - rect.left) / rect.width),
      y: clamp((clientY - rect.top) / rect.height),
    };
  };

  const distanceToSegment = (point: DrawPoint, a: DrawPoint, b: DrawPoint) => {
    const ax = a.x * viewWidth;
    const ay = a.y * viewHeight;
    const bx = b.x * viewWidth;
    const by = b.y * viewHeight;
    const px = point.x * viewWidth;
    const py = point.y * viewHeight;

    const abx = bx - ax;
    const aby = by - ay;
    const apx = px - ax;
    const apy = py - ay;
    const abLenSq = abx * abx + aby * aby;

    if (abLenSq === 0) return Math.hypot(px - ax, py - ay);

    const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
    const closestX = ax + abx * t;
    const closestY = ay + aby * t;
    return Math.hypot(px - closestX, py - closestY);
  };

  const isPointNearStroke = (point: DrawPoint, stroke: DrawStroke) => {
    const threshold = Math.max(stroke.width * 2.8, 10);
    if (stroke.points.length === 1) {
      return distanceToSegment(point, stroke.points[0], stroke.points[0]) <= threshold;
    }

    for (let i = 1; i < stroke.points.length; i += 1) {
      if (distanceToSegment(point, stroke.points[i - 1], stroke.points[i]) <= threshold) {
        return true;
      }
    }

    return false;
  };

  const eraseAtPoint = (point: DrawPoint) => {
    setDrawStrokes((strokes) => strokes.filter((stroke) => !isPointNearStroke(point, stroke)));
  };

  const strokeToPath = (stroke: DrawStroke) => {
    if (stroke.points.length === 0) return "";
    if (stroke.points.length === 1) {
      const point = stroke.points[0];
      return `M ${point.x * viewWidth} ${point.y * viewHeight} L ${point.x * viewWidth + 0.01} ${point.y * viewHeight + 0.01}`;
    }
    if (stroke.points.length === 2) {
      return stroke.points
        .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x * viewWidth} ${point.y * viewHeight}`)
        .join(" ");
    }

    const scaledPoints = stroke.points.map((point) => ({
      x: point.x * viewWidth,
      y: point.y * viewHeight,
    }));

    let path = `M ${scaledPoints[0].x} ${scaledPoints[0].y}`;

    for (let i = 1; i < scaledPoints.length - 1; i += 1) {
      const current = scaledPoints[i];
      const next = scaledPoints[i + 1];
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      path += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
    }

    const penultimate = scaledPoints[scaledPoints.length - 2];
    const last = scaledPoints[scaledPoints.length - 1];
    path += ` Q ${penultimate.x} ${penultimate.y} ${last.x} ${last.y}`;

    return path;
  };

  const finishDrawStroke = () => {
    const stroke = activeStrokeRef.current;
    if (stroke && stroke.points.length > 0) {
      setDrawStrokes((strokes) => [...strokes, stroke]);
    }

    activeStrokeRef.current = null;
    setActiveStroke(null);
  };

  const handleDrawPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingMode) return;

    const point = getDrawPoint(e.clientX, e.clientY);
    if (!point) return;

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    if (drawTool === "eraser") {
      eraseAtPoint(point);
      return;
    }

    const nextStroke: DrawStroke = {
      id: crypto.randomUUID(),
      points: [point],
      color: DRAW_COLORS[drawColorIndex]?.color || DRAW_COLORS[0].color,
      width: DRAW_PEN_WIDTH,
    };

    activeStrokeRef.current = nextStroke;
    setActiveStroke(nextStroke);
  };

  const handleDrawPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingMode) return;

    const point = getDrawPoint(e.clientX, e.clientY);
    if (!point) return;

    if (drawTool === "eraser") {
      if ((e.buttons & 1) !== 1) return;
      eraseAtPoint(point);
      return;
    }

    const stroke = activeStrokeRef.current;
    if (!stroke) return;

    const lastPoint = stroke.points[stroke.points.length - 1];
    const delta = Math.hypot((point.x - lastPoint.x) * viewWidth, (point.y - lastPoint.y) * viewHeight);
    if (delta < 2.4) return;

    const nextStroke = {
      ...stroke,
      points: [...stroke.points, point],
    };

    activeStrokeRef.current = nextStroke;
    setActiveStroke(nextStroke);
  };

  const handleDrawPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (drawTool === "pen") {
      finishDrawStroke();
    }
  };

  const handleDrawPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (drawTool === "pen") {
      finishDrawStroke();
    }
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
            <span className="note-underlay-plus">
              <FaPlus />
            </span>
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
        ref={surfaceRef}
        className="note-surface"
        style={
          {
            "--create-peel": `${createPeel}px`,
            "--delete-peel": `${deletePeel}px`,
          } as React.CSSProperties
        }
      >
        <div className="note-surface-controls">
          <button className={`icon-btn pin-btn ${isPinned ? "active" : ""}${pinAnimation ? ` is-${pinAnimation}` : ""}`} onClick={togglePinned} onAnimationEnd={handlePinAnimationEnd} title={isPinned ? "Unpin Note" : "Pin Note"}>
            <span className={`pin-icon-stack${displayPinned ? " is-filled" : ""}`} aria-hidden="true">
              <TbPinned className="pin-icon pin-icon-outline" />
              <TbPinnedFilled className="pin-icon pin-icon-filled" />
            </span>
          </button>

          <div data-tauri-drag-region className="pill-drag-handle" />
        </div>

        <input className={`title-input${isDrawingMode ? " is-drawing-disabled" : ""}`} placeholder="title..." value={title} onChange={(e) => setTitle(e.target.value)} spellCheck="false" />

        <div
          ref={contentRef}
          className={`note-content${isDrawingMode ? " is-drawing-disabled" : ""}`}
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

        <div
          className={`draw-layer${isDrawingMode ? " is-active" : ""}`}
          onPointerDown={handleDrawPointerDown}
          onPointerMove={handleDrawPointerMove}
          onPointerUp={handleDrawPointerUp}
          onPointerCancel={handleDrawPointerCancel}
        >
          <svg className="draw-layer-svg" viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="none" aria-hidden="true">
            {drawStrokes.map((stroke) => (
              <path
                key={stroke.id}
                d={strokeToPath(stroke)}
                fill="none"
                stroke={stroke.color}
                strokeWidth={stroke.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {activeStroke ? (
              <path
                d={strokeToPath(activeStroke)}
                fill="none"
                stroke={activeStroke.color}
                strokeWidth={activeStroke.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>
        </div>

        <div className="note-surface-tools">
          <div className="tool-actions">
            <div
              className={`hl-controls${isDrawPaletteOpen ? " is-open" : ""}`}
              onPointerEnter={openDrawPalette}
              onPointerLeave={closeDrawPaletteSoon}
            >
              <button
                type="button"
                className={`icon-btn draw-tool-btn ${isDrawingMode && drawTool === "pen" ? "active" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  activateDrawTool("pen");
                }}
                title={isDrawingMode && drawTool === "pen" ? "Exit Draw Mode" : "Draw"}
              >
                <LuPencil />
              </button>
              <div className="hl-popup" onPointerEnter={openDrawPalette} onPointerLeave={closeDrawPaletteSoon}>
                {DRAW_COLORS.map((c, i) => (
                  <div
                    key={c.name}
                    className={`hl-popup-item ${i === drawColorIndex ? "active" : ""}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setDrawColorIndex(i);
                      setDrawTool("pen");
                      setIsDrawingMode(true);
                    }}
                    title={c.name}
                  >
                    <div className="hl-dot" style={{ backgroundColor: c.color }} />
                  </div>
                ))}
              </div>
            </div>
            <button
              type="button"
              className={`icon-btn draw-tool-btn ${isDrawingMode && drawTool === "eraser" ? "active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                activateDrawTool("eraser");
              }}
              title={isDrawingMode && drawTool === "eraser" ? "Exit Eraser" : "Erase Strokes"}
            >
              <LuEraser />
            </button>
            <div
              className={`hl-controls${isHighlightPaletteOpen ? " is-open" : ""}`}
              onPointerEnter={openHighlightPalette}
              onPointerLeave={closeHighlightPaletteSoon}
            >
              <button type="button" className="icon-btn highlight-btn" onMouseDown={(e) => { e.preventDefault(); setIsDrawingMode(false); applyHighlight(); }} title="Highlight Selection">
                <LuHighlighter />
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
                setIsDrawingMode(false);
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
