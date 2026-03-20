import { type PointerEvent, useEffect, useRef, useState } from "react";
import { DRAW_COLORS, DRAW_PEN_WIDTH } from "./noteWindowConstants";
import { type DrawPoint, type DrawStroke, getNormalizedDrawPoint, isPointNearStroke } from "./noteWindowDrawing";

type DrawTool = "pen" | "eraser";

type SurfaceRef = {
  current: HTMLDivElement | null;
};

type UseNoteDrawingParams = {
  surfaceRef: SurfaceRef;
  initialDrawStrokes: DrawStroke[];
  initialDrawColorIndex: number;
  viewWidth: number;
  viewHeight: number;
};

export function useNoteDrawing({
  surfaceRef,
  initialDrawStrokes,
  initialDrawColorIndex,
  viewWidth,
  viewHeight,
}: UseNoteDrawingParams) {
  const activeStrokeRef = useRef<DrawStroke | null>(null);
  const [drawStrokes, setDrawStrokes] = useState<DrawStroke[]>(() => initialDrawStrokes);
  const [drawColorIndex, setDrawColorIndex] = useState(() => initialDrawColorIndex);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawTool, setDrawTool] = useState<DrawTool>("pen");
  const [activeStroke, setActiveStroke] = useState<DrawStroke | null>(null);

  useEffect(() => {
    if (!isDrawingMode) {
      activeStrokeRef.current = null;
      setActiveStroke(null);
    }
  }, [isDrawingMode]);

  const toggleDrawTool = (tool: DrawTool) => {
    setDrawTool((currentTool) => {
      if (isDrawingMode && currentTool === tool) {
        setIsDrawingMode(false);
        return currentTool;
      }

      setIsDrawingMode(true);
      return tool;
    });
  };

  const selectDrawColor = (index: number) => {
    setDrawColorIndex(index);
    setDrawTool("pen");
    setIsDrawingMode(true);
  };

  const disableDrawingMode = () => {
    setIsDrawingMode(false);
  };

  const getDrawPoint = (clientX: number, clientY: number): DrawPoint | null => {
    const surface = surfaceRef.current;
    if (!surface) return null;

    return getNormalizedDrawPoint(surface.getBoundingClientRect(), clientX, clientY);
  };

  const eraseAtPoint = (point: DrawPoint) => {
    setDrawStrokes((strokes) => strokes.filter((stroke) => !isPointNearStroke(point, stroke, viewWidth, viewHeight)));
  };

  const finishDrawStroke = () => {
    const stroke = activeStrokeRef.current;
    if (stroke && stroke.points.length > 0) {
      setDrawStrokes((strokes) => [...strokes, stroke]);
    }

    activeStrokeRef.current = null;
    setActiveStroke(null);
  };

  const handleDrawPointerDown = (e: PointerEvent<HTMLDivElement>) => {
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

  const handleDrawPointerMove = (e: PointerEvent<HTMLDivElement>) => {
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

  const handleDrawPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (drawTool === "pen") {
      finishDrawStroke();
    }
  };

  const handleDrawPointerCancel = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (drawTool === "pen") {
      finishDrawStroke();
    }
  };

  return {
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
  };
}
