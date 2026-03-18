import { useState, useEffect, useRef } from "react";
import "./App.css";

const COLORS = [
  { name: 'Cream', bg: '#fdf2c7', accent: '#fde68a' },
  { name: 'Pink', bg: '#ff2da0', accent: '#e61a8c' },
  { name: 'Cyan', bg: '#51d0f0', accent: '#38b6d9' },
  { name: 'Orange', bg: '#feac41', accent: '#e5942a' },
  { name: 'Green', bg: '#abe260', accent: '#8fc94a' },
];

const HL_COLORS = [
  { name: 'Neon Yellow', color: '#fff700' },
  { name: 'Neon Green', color: '#2efd61' },
  { name: 'Neon Blue', color: '#33d9ff' },
  { name: 'Clear', color: 'transparent' },
];

function App() {
  const contentRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);

  // --- STATE ---
  const [title, setTitle] = useState(() => {
    return localStorage.getItem("sticky-note-title") || "";
  });
  
  const [colorIndex, setColorIndex] = useState(() => {
    return parseInt(localStorage.getItem("sticky-note-color") || "0");
  });

  const [hlColorIndex, setHlColorIndex] = useState(() => {
    return parseInt(localStorage.getItem("sticky-note-hl-color") || "0");
  });

  const [isChecklist, setIsChecklist] = useState(() => {
    return localStorage.getItem("sticky-note-checklist") === "true";
  });

  // --- PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem("sticky-note-title", title);
    localStorage.setItem("sticky-note-color", colorIndex.toString());
    localStorage.setItem("sticky-note-hl-color", hlColorIndex.toString());
    localStorage.setItem("sticky-note-checklist", isChecklist.toString());
  }, [title, colorIndex, hlColorIndex, isChecklist]);

  // Load initial content into the div only ONCE
  useEffect(() => {
    if (isInitialLoad.current && contentRef.current) {
      const savedContent = localStorage.getItem("sticky-note-content-html") || "";
      contentRef.current.innerHTML = savedContent;
      isInitialLoad.current = false;
    }
  }, []);

  // --- HELPERS ---
  const currentColor = COLORS[colorIndex];

  const applyHighlight = (color?: string) => {
    const targetColor = color || HL_COLORS[hlColorIndex].color;
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      document.execCommand('hiliteColor', false, targetColor);
      saveContent();
    }
  };

  const saveContent = () => {
    if (contentRef.current) {
      localStorage.setItem("sticky-note-content-html", contentRef.current.innerHTML);
    }
  };

  const handleToggleChecklist = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const anchor = selection.anchorNode;
    const parentList = anchor?.parentElement?.closest('ul, ol');

    if (parentList) {
      if (parentList.classList.contains('checklist')) {
        parentList.classList.remove('checklist');
        setIsChecklist(false);
      } else {
        parentList.classList.add('checklist');
        if (parentList.tagName === 'OL') {
          document.execCommand('insertUnorderedList');
          const newList = selection.anchorNode?.parentElement?.closest('ul');
          if (newList) newList.classList.add('checklist');
        }
        setIsChecklist(true);
      }
    } else {
      document.execCommand('insertUnorderedList');
      const newList = selection.anchorNode?.parentElement?.closest('ul');
      if (newList) newList.classList.add('checklist');
      setIsChecklist(true);
    }
    saveContent();
  };

  const handleContentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const container = range.startContainer;
      const text = container.textContent || "";
      const offset = range.startOffset;

      const textBefore = text.slice(0, offset);

      if (textBefore === '1.') {
        e.preventDefault();
        // Precisely remove the '1.' text before converting
        range.setStart(container, offset - 2);
        range.deleteContents();
        document.execCommand('insertOrderedList');
      } else if (textBefore === '-') {
        e.preventDefault();
        // Precisely remove the '-' text before converting
        range.setStart(container, offset - 1);
        range.deleteContents();
        document.execCommand('insertUnorderedList');
      } else if (textBefore === '[]') {
        e.preventDefault();
        // Precisely remove the '[]' text before converting
        range.setStart(container, offset - 2);
        range.deleteContents();
        document.execCommand('insertUnorderedList');
        const newList = window.getSelection()?.anchorNode?.parentElement?.closest('ul');
        if (newList) newList.classList.add('checklist');
      }
    }
  };

  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'LI') {
      const parentList = target.closest('ul');
      if (parentList && parentList.classList.contains('checklist')) {
        target.classList.toggle('checked');
        saveContent();
      }
    }
  };

  return (
    <div className="sticky-container" style={{ backgroundColor: currentColor.bg }}>
      
      {/* DRAG HANDLE & CONTROLS */}
      <div data-tauri-drag-region className="drag-handle">
        <div className="color-dots">
          {COLORS.map((c, i) => (
            <div 
              key={c.name}
              className={`color-dot ${i === colorIndex ? 'active' : ''}`}
              style={{ backgroundColor: c.accent }}
              onClick={() => setColorIndex(i)}
              title={c.name}
            />
          ))}
        </div>

        <div className="controls-overlay">
          <div className="hl-controls">
            <button 
              className="icon-btn highlight-btn" 
              onMouseDown={(e) => { e.preventDefault(); applyHighlight(); }}
              title="Highlight Selection"
            >
              <svg 
                viewBox="0 0 1000 1000" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  fill="rgba(0,0,0,0.4)"
                  d="M618.64,231.51c-.96-11.89-6.61-22.92-15.7-30.65l-130.44-110.91c-18.93-16.1-47.33-13.8-63.43,5.13l-135.88,159.81-125.87,148.03c-4.87,5.73-8.23,12.59-9.77,19.96l-32.51,155.76c-2.59,12.44.19,25.39,7.66,35.67,7.48,10.27,18.94,16.91,31.58,18.27l65.04,7c1.61.17,3.22.26,4.82.26,13.38,0,26.17-5.97,34.77-16.44l25.5-31.05,42.51-4.64c11.43-1.24,21.95-6.82,29.4-15.58l148.39-174.52,113.36-133.32c7.73-9.09,11.54-20.88,10.57-32.78ZM289.36,500.19l-42.94,4.68c-11.7,1.27-22.43,7.08-29.9,16.17l-10.08,12.26,16.87-80.81,126.21-148.42,68.87,44.37-129.03,151.75Z"
                />
                <path 
                  fill="rgba(0,0,0,0.4)"
                  d="M850.91,843.4H149.09c-33.14,0-60-26.86-60-60s26.86-60,60-60h701.81c33.14,0,60,26.86,60,60s-26.86,60-60,60Z"
                />
              </svg>
            </button>
            <div className="hl-popup">
              {HL_COLORS.map((c, i) => (
                <div 
                  key={c.name}
                  className={`hl-popup-item ${i === hlColorIndex ? 'active' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setHlColorIndex(i);
                    applyHighlight(c.color);
                  }}
                  title={c.name}
                >
                  <div className="hl-dot" style={{ backgroundColor: c.color }}>
                    {c.name === 'Clear' && '🧹'}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button 
            className={`icon-btn ${isChecklist ? 'active' : ''}`} 
            onClick={handleToggleChecklist}
            title="Checklist Mode"
          >
            <svg 
              viewBox="0 0 1000 1000" 
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              stroke={isChecklist ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.25)"}
              strokeWidth="90"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="152.68 369.21 233.28 459.48 419.19 259.6"/>
              <line x1="536.75" y1="368.13" x2="847.32" y2="368.13"/>
              <polyline points="152.68 650.14 233.28 740.4 419.19 540.52"/>
              <line x1="536.75" y1="649.06" x2="847.32" y2="649.06"/>
            </svg>
          </button>
          <button className="close-btn" onClick={() => window.close()} title="Close Note">
            <svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
              <path className="st0" d="M671.24,348.89h0M671.24,348.89l-46.05,413.49h-250.36l-46.05-413.49h342.47M671.24,268.89h-342.48c-22.76,0-44.44,9.69-59.62,26.65-15.18,16.96-22.41,39.58-19.89,62.2l46.05,413.49c4.51,40.51,38.75,71.14,79.51,71.14h250.36c40.76,0,75-30.64,79.51-71.14l45.91-412.16c.42-3.34.64-6.74.64-10.19,0-44.18-35.81-80-80-80h0ZM671.24,428.89h0,0Z"/>
              <g>
                <path className="st0" d="M420.68,687.04c-13.81,0-25-11.19-25-25v-231.15c0-13.81,11.19-25,25-25s25,11.19,25,25v231.15c0,13.81-11.19,25-25,25Z"/>
                <path className="st0" d="M500,687.04c-13.81,0-25-11.19-25-25v-231.15c0-13.81,11.19-25,25-25s25,11.19,25,25v231.15c0,13.81-11.19,25-25,25Z"/>
                <path className="st0" d="M579.32,687.04c-13.81,0-25-11.19-25-25v-231.15c0-13.81,11.19-25,25-25s25,11.19,25,25v231.15c0,13.81-11.19,25-25,25Z"/>
              </g>
              <path className="st0 trash-lid" d="M694.66,150.62h-127.62c0-.09,0-.19,0-.28,0-22.09-17.91-40-40-40h-54.09c-22.09,0-40,17.91-40,40,0,.1,0,.19,0,.28h-127.62c-22.09,0-40,17.91-40,40s17.91,40,40,40h389.32c22.09,0,40-17.91,40-40s-17.91-40-40-40Z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* TITLE AREA */}
      <input 
        className="title-input"
        placeholder="Note Title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        spellCheck="false"
      />

      {/* CONTENT AREA (Rich Text) */}
      <div 
        ref={contentRef}
        className="note-content"
        contentEditable
        onInput={saveContent}
        onClick={handleContentClick}
        onKeyDown={handleContentKeyDown}
        placeholder="Type something..."
        spellCheck="false"
        suppressContentEditableWarning={true}
      />
      
    </div>
  );
}

export default App;
