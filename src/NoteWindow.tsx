import {
  type CSSProperties,
  useEffect,
  useRef,
  useState,
} from "react";
import type { DrawStroke } from "./lib/noteWindowDrawing";
import { useNoteDrawing } from "./lib/noteWindowDrawingHook";
import { useNoteEditor } from "./lib/noteWindowEditorHook";
import { buildNotePeelGeometry } from "./lib/noteWindowGeometry";
import { useDelayedFlag, useDelayedPopover, useElementSize, usePeelAnimation } from "./lib/noteWindowHooks";
import { NoteDrawLayer, NotePeelLayers, NoteSurfaceControls, NoteSurfaceTools } from "./noteWindowComponents";
import { useNoteWindowState } from "./lib/noteWindowStateHook";
import "./NoteWindow.css";

interface NoteWindowProps {
  id: string;
}

export default function NoteWindow({ id }: NoteWindowProps) {
  const noteRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isCreateHovered, setIsCreateHovered] = useState(false);
  const [isDeleteHovered, setIsDeleteHovered] = useState(false);
  const {
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
  } = useNoteWindowState(id);
  const {
    isOpen: isDrawPaletteOpen,
    open: openDrawPalette,
    closeSoon: closeDrawPaletteSoon,
    closeNow: closeDrawPalette,
  } = useDelayedPopover(140);
  const {
    isOpen: isHighlightPaletteOpen,
    open: openHighlightPalette,
    closeSoon: closeHighlightPaletteSoon,
    closeNow: closeHighlightPalette,
  } = useDelayedPopover(140, closeDrawPalette);
  const isDeleteArmed = useDelayedFlag(isDeleteHovered, 200);
  const createPeel = usePeelAnimation(isCreateHovered, 36);
  const deletePeel = usePeelAnimation(isDeleteHovered, 46);
  const size = useElementSize(noteRef);
  const viewWidth = Math.max(size.width, 1);
  const viewHeight = Math.max(size.height, 1);
  const {
    activeStroke,
    disableDrawingMode,
    drawColorIndex,
    drawStrokes,
    drawTool,
    handleDrawPointerCancel,
    handleDrawPointerDown,
    handleDrawPointerMove,
    handleDrawPointerUp,
    isDrawingMode,
    selectDrawColor,
    toggleDrawTool,
  } = useNoteDrawing({
    surfaceRef,
    initialDrawStrokes: (initialNoteData.drawStrokes as DrawStroke[] | undefined) ?? [],
    initialDrawColorIndex: initialNoteData.drawColorIndex ?? 0,
    viewWidth,
    viewHeight,
  });
  const {
    applyHighlight,
    handleContentClick,
    handleContentInput,
    handleContentKeyDown,
    isChecklist,
    rememberSelection,
    toggleChecklist,
  } = useNoteEditor({
    contentRef,
    hlColorIndex,
    initialContentHtml: initialNoteData.contentHtml,
    initialIsChecklist: initialNoteData.isChecklist ?? false,
    onContentHtmlChange: (contentHtml) => {
      if (isClosingRef.current) {
        return;
      }
      saveNoteData({ contentHtml });
    },
  });

  const handleActivateDrawTool = (tool: "pen" | "eraser") => {
    closeHighlightPalette();
    if (tool !== "pen") {
      closeDrawPalette();
    }
    toggleDrawTool(tool);
  };

  useEffect(() => {
    if (!isClosingRef.current) {
      saveNoteData({ title, hlColorIndex, isChecklist, isPinned, drawColorIndex });
    }
  }, [title, hlColorIndex, isChecklist, isPinned, drawColorIndex]);

  useEffect(() => {
    if (!isClosingRef.current) {
      saveNoteData({ drawStrokes });
    }
  }, [drawStrokes]);

  const { createFlapPath, deleteFlapPath, createShadowPoints, deleteShadowPoints } = buildNotePeelGeometry(
    viewWidth,
    viewHeight,
    createPeel,
    deletePeel
  );

  return (
    <div ref={noteRef} className="sticky-container">
      <NotePeelLayers
        viewWidth={viewWidth}
        viewHeight={viewHeight}
        createPeel={createPeel}
        deletePeel={deletePeel}
        createFlapPath={createFlapPath}
        deleteFlapPath={deleteFlapPath}
        createShadowPoints={createShadowPoints}
        deleteShadowPoints={deleteShadowPoints}
        isDeleteArmed={isDeleteArmed}
      />

      <div
        ref={surfaceRef}
        className="note-surface"
        style={
          {
            "--create-peel": `${createPeel}px`,
            "--delete-peel": `${deletePeel}px`,
          } as CSSProperties
        }
      >
        <NoteSurfaceControls
          isPinned={isPinned}
          displayPinned={displayPinned}
          pinAnimation={pinAnimation}
          onTogglePinned={togglePinned}
          onPinAnimationEnd={handlePinAnimationEnd}
        />

        <input className={`title-input${isDrawingMode ? " is-drawing-disabled" : ""}`} placeholder="title..." value={title} onChange={(e) => setTitle(e.target.value)} spellCheck="false" />

        <div
          ref={contentRef}
          className={`note-content${isDrawingMode ? " is-drawing-disabled" : ""}`}
          contentEditable
          onInput={handleContentInput}
          onKeyUp={rememberSelection}
          onMouseUp={rememberSelection}
          onFocus={rememberSelection}
          onClick={handleContentClick}
          onKeyDown={handleContentKeyDown}
          data-placeholder="..."
          spellCheck="false"
          suppressContentEditableWarning={true}
        />

        <NoteDrawLayer
          isDrawingMode={isDrawingMode}
          viewWidth={viewWidth}
          viewHeight={viewHeight}
          drawStrokes={drawStrokes}
          activeStroke={activeStroke}
          onPointerDown={handleDrawPointerDown}
          onPointerMove={handleDrawPointerMove}
          onPointerUp={handleDrawPointerUp}
          onPointerCancel={handleDrawPointerCancel}
        />

        <NoteSurfaceTools
          isDrawPaletteOpen={isDrawPaletteOpen}
          isDrawingMode={isDrawingMode}
          drawTool={drawTool}
          drawColorIndex={drawColorIndex}
          isHighlightPaletteOpen={isHighlightPaletteOpen}
          hlColorIndex={hlColorIndex}
          isChecklist={isChecklist}
          onOpenDrawPalette={openDrawPalette}
          onCloseDrawPaletteSoon={closeDrawPaletteSoon}
          onActivatePen={(e) => {
            e.preventDefault();
            handleActivateDrawTool("pen");
          }}
          onSelectDrawColor={(index, e) => {
            e.preventDefault();
            selectDrawColor(index);
          }}
          onActivateEraser={(e) => {
            e.preventDefault();
            handleActivateDrawTool("eraser");
          }}
          onOpenHighlightPalette={openHighlightPalette}
          onCloseHighlightPaletteSoon={closeHighlightPaletteSoon}
          onApplyHighlight={(e) => {
            e.preventDefault();
            disableDrawingMode();
            applyHighlight();
          }}
          onSelectHighlightColor={(index, color, e) => {
            e.preventDefault();
            setHlColorIndex(index);
            applyHighlight(color);
          }}
          onToggleChecklist={(e) => {
            e.preventDefault();
            disableDrawingMode();
            toggleChecklist();
          }}
        />
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
