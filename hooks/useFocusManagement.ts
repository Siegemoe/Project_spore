"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hook for managing focus trap within a container
 * Essential for modals, dropdowns, and other interactive components
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Hook for managing focus restoration
 * Useful when opening/closing modals or navigating between views
 */
export function useFocusRestore<T extends HTMLElement>() {
  const previousFocusRef = useRef<T | null>(null);

  const saveFocus = () => {
    previousFocusRef.current = document.activeElement as T;
  };

  const restoreFocus = () => {
    if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
      previousFocusRef.current.focus();
    }
  };

  return { saveFocus, restoreFocus };
}

/**
 * Hook for managing focus on list items with keyboard navigation
 */
export function useListFocus<T extends HTMLElement>(
  items: T[],
  onSelect?: (item: T, index: number) => void
) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const listRef = useRef<HTMLElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev: number) => {
          const next = (prev + 1) % items.length;
          items[next]?.focus?.();
          return next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev: number) => {
          const next = prev === -1 ? items.length - 1 : (prev - 1 + items.length) % items.length;
          items[next]?.focus?.();
          return next;
        });
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && items[focusedIndex]) {
          onSelect?.(items[focusedIndex], focusedIndex);
        }
        break;
      case 'Escape':
        setFocusedIndex(-1);
        listRef.current?.blur();
        break;
    }
  };

  return { focusedIndex, handleKeyDown, listRef };
}

/**
 * Hook for managing focus on interactive elements
 * Provides consistent focus behavior across the application
 */
export function useFocusManagement() {
  const setFocus = (element: HTMLElement | null) => {
    if (element) {
      element.focus();
      // Ensure the element is visible
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const blurActiveElement = () => {
    if (document.activeElement && document.activeElement !== document.body) {
      (document.activeElement as HTMLElement).blur();
    }
  };

  return { setFocus, blurActiveElement };
}
