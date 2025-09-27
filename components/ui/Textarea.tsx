"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxLengthDisplay?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, maxLength, maxLengthDisplay = false, ...props }, ref) => {
    const [count, setCount] = React.useState(0);

    return (
      <div className="relative w-full">
        <textarea
          ref={ref}
          onChange={(e) => {
            setCount(e.target.value.length);
            props.onChange?.(e);
          }}
          className={cn(
            // base
            "w-full rounded-md border text-sm outline-none resize-none",
            // colors
            "bg-[rgb(var(--surface))] text-text-primary border-border-subtle placeholder:text-text-secondary",
            // sizing
            "min-h-[96px] p-3",
            // focus
            "focus-visible:ring-2 focus-visible:ring-accent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          maxLength={maxLength}
          {...props}
        />
        {maxLength && maxLengthDisplay ? (
          <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-text-secondary">
            {count}/{maxLength}
          </span>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
