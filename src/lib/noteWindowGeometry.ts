export function buildRoundedTrianglePath(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  radius: number
) {
  const distAB = Math.hypot(ax - bx, ay - by);
  const distCB = Math.hypot(cx - bx, cy - by);
  const cornerRadius = Math.min(radius, distAB * 0.35, distCB * 0.35);

  if (cornerRadius <= 0.01) {
    return `M ${ax} ${ay} L ${bx} ${by} L ${cx} ${cy} Z`;
  }

  const t1x = bx + ((ax - bx) / distAB) * cornerRadius;
  const t1y = by + ((ay - by) / distAB) * cornerRadius;
  const t2x = bx + ((cx - bx) / distCB) * cornerRadius;
  const t2y = by + ((cy - by) / distCB) * cornerRadius;

  return `M ${ax} ${ay} L ${t1x} ${t1y} Q ${bx} ${by} ${t2x} ${t2y} L ${cx} ${cy} Z`;
}

export function buildNotePeelGeometry(viewWidth: number, viewHeight: number, createPeel: number, deletePeel: number) {
  const createLiftX = createPeel * 1.08;
  const createLiftY = createPeel * 0.94;
  const createCornerRadius = Math.min(createPeel * 0.24, 7);
  const createFlapPath = createPeel > 0
    ? buildRoundedTrianglePath(
        viewWidth - createPeel,
        0,
        viewWidth - createLiftX,
        createLiftY,
        viewWidth,
        createPeel,
        createCornerRadius
      )
    : "";

  const deleteLiftX = deletePeel * 0.94;
  const deleteLiftY = deletePeel * 1.08;
  const deleteCornerRadius = Math.min(deletePeel * 0.24, 7);
  const deleteFlapPath = deletePeel > 0
    ? buildRoundedTrianglePath(
        0,
        viewHeight - deletePeel,
        deleteLiftX,
        viewHeight - deleteLiftY,
        deletePeel,
        viewHeight,
        deleteCornerRadius
      )
    : "";

  const createShadowPoints = createPeel > 0
    ? `${viewWidth - createPeel + 2},4 ${viewWidth - createLiftX + 5},${createLiftY + 7} ${viewWidth + 1},${createPeel + 6}`
    : "";

  const deleteShadowPoints = deletePeel > 0
    ? `4,${viewHeight - deletePeel + 1} ${deleteLiftX + 5},${viewHeight - deleteLiftY + 5} ${deletePeel + 6},${viewHeight + 1}`
    : "";

  return {
    createFlapPath,
    deleteFlapPath,
    createShadowPoints,
    deleteShadowPoints,
  };
}
