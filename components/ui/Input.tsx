"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className={cn("relative w-full")}>
        {leftIcon ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-text-secondary">
            {leftIcon}
          </span>
        ) : null}
        <input
          type={type}
          ref={ref}
          className={cn(
            // base
            "w-full rounded-md border text-sm outline-none",
            // colors
            "bg-[rgb(var(--surface))] text-text-primary border-border-subtle placeholder:text-text-secondary",
            // sizing
            "h-10 px-3",
            leftIcon ? "pl-9" : undefined,
            rightIcon ? "pr-9" : undefined,
            // focus
            "focus-visible:ring-2 focus-visible:ring-accent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        {rightIcon ? (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className="absolute inset-y-0 right-3 inline-flex items-center text-text-secondary"
          >
            {rightIcon}
          </button>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";
