import type React from "react";

export function rememberContentSelection(
  editor: HTMLElement | null,
  rangeRef: React.MutableRefObject<Range | null>
) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !editor) {
    return;
  }

  const range = selection.getRangeAt(0);
  const commonAncestor = range.commonAncestorContainer;
  if (editor.contains(commonAncestor)) {
    rangeRef.current = range.cloneRange();
  }
}

export function restoreContentSelection(
  editor: HTMLElement | null,
  rangeRef: React.MutableRefObject<Range | null>
) {
  const savedRange = rangeRef.current;
  const selection = window.getSelection();
  if (!editor || !savedRange || !selection) {
    return false;
  }

  editor.focus();
  selection.removeAllRanges();
  selection.addRange(savedRange.cloneRange());
  return true;
}

export function isEditorEffectivelyEmpty(editor: HTMLElement | null) {
  if (!editor) {
    return true;
  }

  const text = editor.textContent?.replace(/\u00a0/g, " ").trim() || "";
  const normalizedHtml = editor.innerHTML.replace(/<br\s*\/?>/gi, "").replace(/\s/g, "");
  return text.length === 0 && normalizedHtml.length === 0;
}

export function placeCaretAtStart(element: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function placeCaretAtEnd(element: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function insertEmptyChecklist(editor: HTMLElement | null) {
  if (!editor) {
    return;
  }

  editor.innerHTML = '<ul class="checklist"><li><br></li></ul>';
  const firstItem = editor.querySelector("li");
  if (firstItem instanceof HTMLElement) {
    editor.focus();
    placeCaretAtStart(firstItem);
  }
}

export function unwrapChecklistToParagraphs(editor: HTMLElement | null, list: HTMLElement) {
  if (!editor) {
    return;
  }

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
    if (!caretTarget) {
      caretTarget = paragraph;
    }
  });

  list.replaceWith(fragment);

  const fallbackTarget = caretTarget || editor;
  if (fallbackTarget instanceof HTMLElement) {
    editor.focus();
    placeCaretAtEnd(fallbackTarget);
  }
}

export function handleEditorListShortcut(e: React.KeyboardEvent) {
  if (e.key !== " ") {
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

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
    if (newList) {
      newList.classList.add("checklist");
    }
  }
}

export function handleChecklistItemClick(target: HTMLElement) {
  if (target.tagName !== "LI") {
    return false;
  }

  const parentList = target.closest("ul");
  if (parentList && parentList.classList.contains("checklist")) {
    target.classList.toggle("checked");
    return true;
  }

  return false;
}
