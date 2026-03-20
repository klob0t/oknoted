import { type KeyboardEvent, type MouseEvent, useEffect, useRef, useState } from "react";
import { HL_COLORS } from "./noteWindowConstants";
import {
  handleChecklistItemClick,
  handleEditorListShortcut,
  insertEmptyChecklist,
  isEditorEffectivelyEmpty,
  placeCaretAtEnd,
  rememberContentSelection,
  restoreContentSelection,
  unwrapChecklistToParagraphs,
} from "./noteWindowEditor";

type ContentRef = {
  current: HTMLDivElement | null;
};

type UseNoteEditorParams = {
  contentRef: ContentRef;
  hlColorIndex: number;
  initialContentHtml?: string;
  initialIsChecklist: boolean;
  onContentHtmlChange: (contentHtml: string) => void;
};

export function useNoteEditor({
  contentRef,
  hlColorIndex,
  initialContentHtml,
  initialIsChecklist,
  onContentHtmlChange,
}: UseNoteEditorParams) {
  const isInitialLoadRef = useRef(true);
  const lastContentRangeRef = useRef<Range | null>(null);
  const [isChecklist, setIsChecklist] = useState(() => initialIsChecklist);

  useEffect(() => {
    if (isInitialLoadRef.current && contentRef.current) {
      contentRef.current.innerHTML = initialContentHtml || "";
      isInitialLoadRef.current = false;
    }
  }, [contentRef, initialContentHtml]);

  const saveContent = () => {
    const editor = contentRef.current;
    if (!editor) {
      return;
    }

    onContentHtmlChange(editor.innerHTML);
  };

  const rememberSelection = () => {
    rememberContentSelection(contentRef.current, lastContentRangeRef);
  };

  const applyHighlight = (color?: string) => {
    const targetColor = color || HL_COLORS[hlColorIndex].color;
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      document.execCommand("hiliteColor", false, targetColor);
      saveContent();
    }
  };

  const toggleChecklist = () => {
    if (isEditorEffectivelyEmpty(contentRef.current)) {
      insertEmptyChecklist(contentRef.current);
      setIsChecklist(true);
      saveContent();
      return;
    }

    const selection = window.getSelection();
    if ((!selection || selection.rangeCount === 0) && !restoreContentSelection(contentRef.current, lastContentRangeRef)) {
      return;
    }

    const activeSelection = window.getSelection();
    if (!activeSelection || activeSelection.rangeCount === 0) {
      return;
    }

    const anchor = activeSelection.anchorNode;
    const parentList = anchor?.parentElement?.closest("ul, ol");
    const activeListItem = anchor?.parentElement?.closest("li");

    if (parentList) {
      if (parentList.classList.contains("checklist")) {
        if (parentList instanceof HTMLElement) {
          unwrapChecklistToParagraphs(contentRef.current, parentList);
        }
        setIsChecklist(false);
      } else {
        parentList.classList.add("checklist");
        if (parentList.tagName === "OL") {
          document.execCommand("insertUnorderedList");
          const newList = window.getSelection()?.anchorNode?.parentElement?.closest("ul");
          if (newList) {
            newList.classList.add("checklist");
            const targetItem =
              window.getSelection()?.anchorNode?.parentElement?.closest("li") || newList.querySelector("li");
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
        const targetItem =
          window.getSelection()?.anchorNode?.parentElement?.closest("li") || activeListItem || newList.querySelector("li");
        if (targetItem instanceof HTMLElement) {
          placeCaretAtEnd(targetItem);
        }
      }
      setIsChecklist(true);
    }

    rememberSelection();
    saveContent();
  };

  const handleContentKeyDown = (e: KeyboardEvent) => {
    handleEditorListShortcut(e);
  };

  const handleContentClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (handleChecklistItemClick(target)) {
      saveContent();
    }
  };

  return {
    applyHighlight,
    handleContentClick,
    handleContentInput: saveContent,
    handleContentKeyDown,
    isChecklist,
    rememberSelection,
    toggleChecklist,
  };
}
