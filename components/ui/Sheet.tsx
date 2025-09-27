"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  overlayClassName?: string;
  disableCloseOnOverlay?: boolean;
}

/**
 * Mobile-first bottom sheet.
 * - Renders in a portal to body
 * - Closes on ESC / overlay click (configurable)
 * - Locks background scroll while open
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  overlayClassName,
  disableCloseOnOverlay
}: SheetProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Lock scroll when open
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-stretch justify-end",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      aria-hidden={!open}
    >
      {/* Overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-black/40 transition-opacity",
          overlayClassName,
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={() => {
          if (!disableCloseOnOverlay) onClose();
        }}
      />
      {/* Sheet panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative mx-auto w-full max-w-xl rounded-t-2xl border border-border-subtle bg-[rgb(var(--surface))] shadow-sheet safe-bottom",
          "transition-transform duration-200 ease-out will-change-transform",
          open ? "translate-y-0" : "translate-y-full",
          className
        )}
      >
        {/* Grabber */}
        <div className="flex w-full items-center justify-center py-2">
          <div className="h-1.5 w-10 rounded-full bg-border-subtle" />
        </div>

        {title ? (
          <div className="px-4 pb-2 text-base font-semibold text-text-primary">{title}</div>
        ) : null}

        <div className="max-h-[70vh] overflow-y-auto px-4 pb-4">{children}</div>

        {footer ? <div className="sticky bottom-0 w-full border-t border-border-subtle bg-[rgb(var(--surface))] px-4 py-3">{footer}</div> : null}

        {/* Close button for a11y (screen readers), visually hidden but focusable */}
        <button className="sr-only" onClick={onClose} aria-label="Close sheet">
          Close
        </button>
      </div>
    </div>,
    document.body
  );
}
