import { useEffect, useLayoutEffect, useRef, useState } from "react";

type ElementRef<T extends HTMLElement> = {
  current: T | null;
};

export function useElementSize<T extends HTMLElement>(elementRef: ElementRef<T>) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = elementRef.current;
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
  }, [elementRef]);

  return size;
}

function animatePeel(targetPeel: number, currentPeel: number, setValue: (value: number) => void) {
  const delta = targetPeel - currentPeel;

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
    setValue(currentPeel + delta * ease(progress));
    if (progress < 1) {
      frameId = window.requestAnimationFrame(tick);
    }
  };

  frameId = window.requestAnimationFrame(tick);
  return () => window.cancelAnimationFrame(frameId);
}

export function usePeelAnimation(isHovered: boolean, expandedPeel: number) {
  const [peel, setPeel] = useState(0);
  const peelRef = useRef(0);

  useEffect(() => {
    peelRef.current = peel;
  }, [peel]);

  useEffect(() => {
    return animatePeel(isHovered ? expandedPeel : 0, peelRef.current, setPeel);
  }, [expandedPeel, isHovered]);

  return peel;
}

export function useDelayedFlag(isActive: boolean, delayMs: number) {
  const [flag, setFlag] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setFlag(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFlag(true);
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [delayMs, isActive]);

  return flag;
}

export function useDelayedPopover(delayMs: number, onOpen?: () => void) {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const open = () => {
    onOpen?.();
    clearCloseTimeout();
    setIsOpen(true);
  };

  const closeSoon = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
      closeTimeoutRef.current = null;
    }, delayMs);
  };

  const closeNow = () => {
    clearCloseTimeout();
    setIsOpen(false);
  };

  useEffect(() => {
    return () => {
      clearCloseTimeout();
    };
  }, []);

  return { isOpen, open, closeSoon, closeNow };
}
