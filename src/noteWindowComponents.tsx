import type React from "react";
import { FaPlus } from "react-icons/fa";
import { LuEraser, LuHighlighter, LuPencil } from "react-icons/lu";
import { TbPinned, TbPinnedFilled } from "react-icons/tb";
import { DRAW_COLORS, HL_COLORS } from "./lib/noteWindowConstants";
import type { DrawStroke } from "./lib/noteWindowDrawing";
import { strokeToPath } from "./lib/noteWindowDrawing";

type NotePeelLayersProps = {
  viewWidth: number;
  viewHeight: number;
  createPeel: number;
  deletePeel: number;
  createFlapPath: string;
  deleteFlapPath: string;
  createShadowPoints: string;
  deleteShadowPoints: string;
  isDeleteArmed: boolean;
};

export function NotePeelLayers({
  viewWidth,
  viewHeight,
  createPeel,
  deletePeel,
  createFlapPath,
  deleteFlapPath,
  createShadowPoints,
  deleteShadowPoints,
  isDeleteArmed,
}: NotePeelLayersProps) {
  return (
    <>
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
    </>
  );
}

type NoteSurfaceControlsProps = {
  isPinned: boolean;
  displayPinned: boolean;
  pinAnimation: "pinning" | "unpinning" | null;
  onTogglePinned: () => void;
  onPinAnimationEnd: (event: React.AnimationEvent<HTMLButtonElement>) => void;
};

export function NoteSurfaceControls({
  isPinned,
  displayPinned,
  pinAnimation,
  onTogglePinned,
  onPinAnimationEnd,
}: NoteSurfaceControlsProps) {
  return (
    <div className="note-surface-controls">
      <button
        className={`icon-btn pin-btn ${isPinned ? "active" : ""}${pinAnimation ? ` is-${pinAnimation}` : ""}`}
        onClick={onTogglePinned}
        onAnimationEnd={onPinAnimationEnd}
        title={isPinned ? "Unpin Note" : "Pin Note"}
      >
        <span className={`pin-icon-stack${displayPinned ? " is-filled" : ""}`} aria-hidden="true">
          <TbPinned className="pin-icon pin-icon-outline" />
          <TbPinnedFilled className="pin-icon pin-icon-filled" />
        </span>
      </button>

      <div data-tauri-drag-region className="pill-drag-handle" />
    </div>
  );
}

type NoteDrawLayerProps = {
  isDrawingMode: boolean;
  viewWidth: number;
  viewHeight: number;
  drawStrokes: DrawStroke[];
  activeStroke: DrawStroke | null;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
};

export function NoteDrawLayer({
  isDrawingMode,
  viewWidth,
  viewHeight,
  drawStrokes,
  activeStroke,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: NoteDrawLayerProps) {
  return (
    <div
      className={`draw-layer${isDrawingMode ? " is-active" : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <svg className="draw-layer-svg" viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="none" aria-hidden="true">
        {drawStrokes.map((stroke) => (
          <path
            key={stroke.id}
            d={strokeToPath(stroke, viewWidth, viewHeight)}
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
            d={strokeToPath(activeStroke, viewWidth, viewHeight)}
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
  );
}

type NoteSurfaceToolsProps = {
  isDrawPaletteOpen: boolean;
  isDrawingMode: boolean;
  drawTool: "pen" | "eraser";
  drawColorIndex: number;
  isHighlightPaletteOpen: boolean;
  hlColorIndex: number;
  isChecklist: boolean;
  onOpenDrawPalette: () => void;
  onCloseDrawPaletteSoon: () => void;
  onActivatePen: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onSelectDrawColor: (index: number, e: React.MouseEvent<HTMLDivElement>) => void;
  onActivateEraser: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onOpenHighlightPalette: () => void;
  onCloseHighlightPaletteSoon: () => void;
  onApplyHighlight: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onSelectHighlightColor: (index: number, color: string, e: React.MouseEvent<HTMLDivElement>) => void;
  onToggleChecklist: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

export function NoteSurfaceTools({
  isDrawPaletteOpen,
  isDrawingMode,
  drawTool,
  drawColorIndex,
  isHighlightPaletteOpen,
  hlColorIndex,
  isChecklist,
  onOpenDrawPalette,
  onCloseDrawPaletteSoon,
  onActivatePen,
  onSelectDrawColor,
  onActivateEraser,
  onOpenHighlightPalette,
  onCloseHighlightPaletteSoon,
  onApplyHighlight,
  onSelectHighlightColor,
  onToggleChecklist,
}: NoteSurfaceToolsProps) {
  return (
    <div className="note-surface-tools">
      <div className="tool-actions">
        <div
          className={`hl-controls${isDrawPaletteOpen ? " is-open" : ""}`}
          onPointerEnter={onOpenDrawPalette}
          onPointerLeave={onCloseDrawPaletteSoon}
        >
          <button
            type="button"
            className={`icon-btn draw-tool-btn ${isDrawingMode && drawTool === "pen" ? "active" : ""}`}
            onMouseDown={onActivatePen}
            title={isDrawingMode && drawTool === "pen" ? "Exit Draw Mode" : "Draw"}
          >
            <LuPencil />
          </button>
          <div className="hl-popup" onPointerEnter={onOpenDrawPalette} onPointerLeave={onCloseDrawPaletteSoon}>
            {DRAW_COLORS.map((c, i) => (
              <div
                key={c.name}
                className={`hl-popup-item ${i === drawColorIndex ? "active" : ""}`}
                onMouseDown={(e) => onSelectDrawColor(i, e)}
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
          onMouseDown={onActivateEraser}
          title={isDrawingMode && drawTool === "eraser" ? "Exit Eraser" : "Erase Strokes"}
        >
          <LuEraser />
        </button>

        <div
          className={`hl-controls${isHighlightPaletteOpen ? " is-open" : ""}`}
          onPointerEnter={onOpenHighlightPalette}
          onPointerLeave={onCloseHighlightPaletteSoon}
        >
          <button type="button" className="icon-btn highlight-btn" onMouseDown={onApplyHighlight} title="Highlight Selection">
            <LuHighlighter />
          </button>
          <div className="hl-popup" onPointerEnter={onOpenHighlightPalette} onPointerLeave={onCloseHighlightPaletteSoon}>
            {HL_COLORS.map((c, i) => (
              <div
                key={c.name}
                className={`hl-popup-item ${i === hlColorIndex ? "active" : ""}`}
                onMouseDown={(e) => onSelectHighlightColor(i, c.color, e)}
                title={c.name}
              >
                <div className="hl-dot" style={{ backgroundColor: c.color }}>
                  {c.name === "Clear" && "x"}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          className={`icon-btn ${isChecklist ? "active" : ""}`}
          onMouseDown={onToggleChecklist}
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
  );
}
