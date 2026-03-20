export type DrawPoint = {
  x: number;
  y: number;
};

export type DrawStroke = {
  id: string;
  points: DrawPoint[];
  color: string;
  width: number;
};

export function getNormalizedDrawPoint(
  rect: DOMRect,
  clientX: number,
  clientY: number
): DrawPoint | null {
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const clamp = (value: number) => Math.max(0, Math.min(1, value));

  return {
    x: clamp((clientX - rect.left) / rect.width),
    y: clamp((clientY - rect.top) / rect.height),
  };
}

export function distanceToSegment(
  point: DrawPoint,
  a: DrawPoint,
  b: DrawPoint,
  viewWidth: number,
  viewHeight: number
) {
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

  if (abLenSq === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));
  const closestX = ax + abx * t;
  const closestY = ay + aby * t;
  return Math.hypot(px - closestX, py - closestY);
}

export function isPointNearStroke(
  point: DrawPoint,
  stroke: DrawStroke,
  viewWidth: number,
  viewHeight: number
) {
  const threshold = Math.max(stroke.width * 2.8, 10);

  if (stroke.points.length === 1) {
    return distanceToSegment(point, stroke.points[0], stroke.points[0], viewWidth, viewHeight) <= threshold;
  }

  for (let i = 1; i < stroke.points.length; i += 1) {
    if (distanceToSegment(point, stroke.points[i - 1], stroke.points[i], viewWidth, viewHeight) <= threshold) {
      return true;
    }
  }

  return false;
}

export function strokeToPath(stroke: DrawStroke, viewWidth: number, viewHeight: number) {
  if (stroke.points.length === 0) {
    return "";
  }

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
}
