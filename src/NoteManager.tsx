import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getCurrentWindow, getAllWindows } from "@tauri-apps/api/window";
import { enable as enableAutostart, isEnabled as isAutostartEnabled } from "@tauri-apps/plugin-autostart";
import { openUrl } from "@tauri-apps/plugin-opener";
import { FaPlus } from "react-icons/fa";
import { readNoteStore, updateNote } from "./noteStorage";
import "./NoteManager.css";

const appWindow = getCurrentWindow();

export default function NoteManager() {
  const launcherRef = useRef<HTMLDivElement>(null);
  const createPeelRef = useRef(0);
  const linkPeelRef = useRef(0);
  const [isCreateHovered, setIsCreateHovered] = useState(false);
  const [isLinkHovered, setIsLinkHovered] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [createPeel, setCreatePeel] = useState(0);
  const [linkPeel, setLinkPeel] = useState(0);
  const [hoveredAction, setHoveredAction] = useState<"create" | "link" | null>(null);
  const didRestoreNotesRef = useRef(false);
  const isRestoringNotesRef = useRef(true);

  useEffect(() => {
    const ensureAutostartEnabled = async () => {
      try {
        const enabled = await isAutostartEnabled();
        if (!enabled) {
          await enableAutostart();
        }
      } catch {
        // Ignore autostart registration failures in development/runtime fallback.
      }
    };

    void ensureAutostartEnabled();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (isRestoringNotesRef.current) {
        return;
      }

      const windows = await getAllWindows();
      const hasNotes = windows.some((w) => w.label.startsWith("note-"));
      if (!hasNotes) {
        appWindow.show();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (didRestoreNotesRef.current) {
      return;
    }

    didRestoreNotesRef.current = true;

    const restoreNotes = async () => {
      try {
        const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
        const allNotes = readNoteStore();
        const noteEntries = Object.entries(allNotes);

        if (noteEntries.length === 0) {
          await appWindow.show();
          return;
        }

        const existingWindows = await getAllWindows();
        const openLabels = new Set(existingWindows.map((window) => window.label));

        for (const [id, note] of noteEntries) {
          const label = `note-${id}`;
          if (openLabels.has(label)) {
            continue;
          }

          const options: ConstructorParameters<typeof WebviewWindow>[1] = {
            url: `index.html?id=${id}`,
            title: "Sticky Note",
            width: 300,
            height: 300,
            minWidth: 300,
            minHeight: 300,
            decorations: false,
            transparent: true,
            alwaysOnTop: !!note.isPinned,
            skipTaskbar: true,
          };

          if (note.windowPosition) {
            options.x = note.windowPosition.x;
            options.y = note.windowPosition.y;
          }

          new WebviewWindow(label, options);
        }

        await appWindow.hide();
      } finally {
        isRestoringNotesRef.current = false;
      }
    };

    void restoreNotes();
  }, []);

  useLayoutEffect(() => {
    const element = launcherRef.current;
    if (!element) {
      return;
    }

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
    linkPeelRef.current = linkPeel;
  }, [linkPeel]);

  useEffect(() => {
    const targetPeel = isCreateHovered ? 36 : 0;
    const startPeel = createPeelRef.current;
    const delta = targetPeel - startPeel;

    if (Math.abs(delta) < 0.1) {
      setCreatePeel(targetPeel);
      return;
    }

    const duration = 420;
    const startTime = performance.now();
    let frameId = 0;

    const easeOutBack = (t: number, overshoot: number) => {
      const x = t - 1;
      return 1 + (overshoot + 1) * x * x * x + overshoot * x * x;
    };

    const ease = (t: number) => {
      if (targetPeel === 0) {
        return 1 - Math.pow(1 - t, 3);
      }

      return easeOutBack(t, 0.48);
    };

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setCreatePeel(startPeel + delta * ease(progress));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [isCreateHovered]);

  useEffect(() => {
    const targetPeel = isLinkHovered ? 34 : 0;
    const startPeel = linkPeelRef.current;
    const delta = targetPeel - startPeel;

    if (Math.abs(delta) < 0.1) {
      setLinkPeel(targetPeel);
      return;
    }

    const duration = 420;
    const startTime = performance.now();
    let frameId = 0;

    const easeOutBack = (t: number, overshoot: number) => {
      const x = t - 1;
      return 1 + (overshoot + 1) * x * x * x + overshoot * x * x;
    };

    const ease = (t: number) => {
      if (targetPeel === 0) {
        return 1 - Math.pow(1 - t, 3);
      }

      return easeOutBack(t, 0.42);
    };

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setLinkPeel(startPeel + delta * ease(progress));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [isLinkHovered]);

  const createNewNote = async () => {
    const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
    const id = crypto.randomUUID();
    updateNote(id, { title: "", contentHtml: "", colorIndex: 0 });

    const noteWindow = new WebviewWindow(`note-${id}`, {
      url: `index.html?id=${id}`,
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
        updateNote(id, {
          windowPosition: {
            x: position.x,
            y: position.y,
          },
        });
      } catch {
        // Ignore initial position persistence failures.
      }
    });

    appWindow.hide();
  };

  const openWebsite = async () => {
    await openUrl("https://klob0t.xyz");
  };

  const updateCornerHover = (clientX: number, clientY: number) => {
    const element = launcherRef.current;
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    const isCreateCorner = localX >= rect.width - 56 && localY <= 56;
    const isLinkCorner = localX <= 52 && localY >= rect.height - 52;

    setIsCreateHovered(isCreateCorner);
    setIsLinkHovered(isLinkCorner);
    setHoveredAction(isCreateCorner ? "create" : isLinkCorner ? "link" : null);
  };

  const getCornerAction = (clientX: number, clientY: number) => {
    const element = launcherRef.current;
    if (!element) {
      return null;
    }

    const rect = element.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    if (localX >= rect.width - 56 && localY <= 56) {
      return "create";
    }

    if (localX <= 52 && localY >= rect.height - 52) {
      return "link";
    }

    return null;
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

    if (cornerRadius <= 0.01) {
      return `M ${ax} ${ay} L ${bx} ${by} L ${cx} ${cy} Z`;
    }

    const t1x = bx + ((ax - bx) / distAB) * cornerRadius;
    const t1y = by + ((ay - by) / distAB) * cornerRadius;
    const t2x = bx + ((cx - bx) / distCB) * cornerRadius;
    const t2y = by + ((cy - by) / distCB) * cornerRadius;

    return `M ${ax} ${ay} L ${t1x} ${t1y} Q ${bx} ${by} ${t2x} ${t2y} L ${cx} ${cy} Z`;
  };

  const viewWidth = Math.max(size.width, 1);
  const viewHeight = Math.max(size.height, 1);
  const mainPoints = `0,0 ${viewWidth - createPeel},0 ${viewWidth},${createPeel} ${viewWidth},${viewHeight} ${linkPeel},${viewHeight} 0,${viewHeight - linkPeel}`;
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
  const linkLiftX = linkPeel * 0.94;
  const linkLiftY = linkPeel * 1.08;
  const linkCornerRadius = Math.min(linkPeel * 0.24, 7);
  const linkFlapPath = linkPeel > 0
    ? buildRoundedTrianglePath(
        0,
        viewHeight - linkPeel,
        linkLiftX,
        viewHeight - linkLiftY,
        linkPeel,
        viewHeight,
        linkCornerRadius
      )
    : "";
  const createShadowPoints = createPeel > 0
    ? `${viewWidth - createPeel + 2},4 ${viewWidth - createLiftX + 5},${createLiftY + 7} ${viewWidth + 1},${createPeel + 6}`
    : "";
  const linkShadowPoints = linkPeel > 0
    ? `4,${viewHeight - linkPeel + 1} ${linkLiftX + 5},${viewHeight - linkLiftY + 5} ${linkPeel + 6},${viewHeight + 1}`
    : "";

  return (
    <div className="manager-container">
      <div
        className={`manager-mini-launcher${hoveredAction ? " is-action-hovered" : ""}`}
        title={hoveredAction === "create" ? "New Note" : hoveredAction === "link" ? "Open klob0t.xyz" : ""}
        onPointerMove={(event) => updateCornerHover(event.clientX, event.clientY)}
        onPointerLeave={() => {
          setIsCreateHovered(false);
          setIsLinkHovered(false);
          setHoveredAction(null);
        }}
        onClick={(event) => {
          const action = getCornerAction(event.clientX, event.clientY);
          if (action === "create") {
            void createNewNote();
          } else if (action === "link") {
            void openWebsite();
          }
        }}
      >
        <div data-tauri-drag-region className="launcher-drag-region" />

        <div ref={launcherRef} className="launcher-sticker">
          <svg className="launcher-geometry launcher-main-geometry" viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="none" aria-hidden="true">
            <polygon className="launcher-main-shape" points={mainPoints} />
          </svg>

          <div className="corner-underlay corner-underlay-create" aria-hidden="true">
            <span className="corner-symbol corner-symbol-plus">
              <FaPlus />
            </span>
          </div>

          <div className="corner-underlay corner-underlay-link" aria-hidden="true">
            <span className="site-logo" />
          </div>

          {createPeel > 0 ? (
            <>
              <svg className="launcher-geometry launcher-flap-shadow-geometry" viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="none" aria-hidden="true">
                <polygon className="launcher-flap-shadow-shape" points={createShadowPoints} />
              </svg>
              <svg className="launcher-geometry launcher-flap-geometry" viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="launcher-create-flap-gradient" x1="28%" y1="78%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#fad25f" />
                    <stop offset="16%" stopColor="#f8bf1d" />
                    <stop offset="80%" stopColor="#99580e" />
                    <stop offset="100%" stopColor="#462000" />
                  </linearGradient>
                </defs>
                <path className="launcher-flap-shape" d={createFlapPath} />
                <path className="launcher-flap-face-gradient" d={createFlapPath} fill="url(#launcher-create-flap-gradient)" />
                <polyline className="launcher-flap-seam" points={`${viewWidth - createPeel},0 ${viewWidth},${createPeel}`} />
              </svg>
            </>
          ) : null}

          {linkPeel > 0 ? (
            <>
              <svg className="launcher-geometry launcher-flap-shadow-geometry" viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="none" aria-hidden="true">
                <polygon className="launcher-flap-shadow-shape" points={linkShadowPoints} />
              </svg>
              <svg className="launcher-geometry launcher-flap-geometry" viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="launcher-link-flap-gradient" x1="72%" y1="22%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fad25f" />
                    <stop offset="16%" stopColor="#f8bf1d" />
                    <stop offset="80%" stopColor="#99580e" />
                    <stop offset="100%" stopColor="#462000" />
                  </linearGradient>
                </defs>
                <path className="launcher-flap-shape launcher-flap-shape-link" d={linkFlapPath} />
                <path className="launcher-flap-face-gradient launcher-flap-face-gradient-link" d={linkFlapPath} fill="url(#launcher-link-flap-gradient)" />
                <polyline className="launcher-flap-seam" points={`0,${viewHeight - linkPeel} ${linkPeel},${viewHeight}`} />
              </svg>
            </>
          ) : null}

          <div className="launcher-face">
            <span className="app-logo" aria-label="oknoted" role="img" />
          </div>
        </div>
      </div>
    </div>
  );
}
