"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "accent" | "outline" | "ghost" | "default";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const baseClasses =
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:pointer-events-none";

const sizeClasses: Record<ButtonSize, string> = {
  sm: "text-sm h-9 px-3 gap-2",
  md: "text-sm h-10 px-4 gap-2",
  lg: "text-base h-11 px-5 gap-2"
};

const variantClasses: Record<ButtonVariant, string> = {
  accent: "bg-accent text-white hover:brightness-95",
  outline:
    "border border-border-subtle text-text-primary bg-transparent hover:bg-surface-muted",
  ghost: "bg-transparent text-text-primary hover:bg-[rgb(var(--surface-muted)/0.6)]",
  default: "bg-[rgb(var(--surface))] text-text-primary border border-border-subtle hover:bg-surface-muted"
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "accent", size = "md", loading = false, leftIcon, rightIcon, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(baseClasses, sizeClasses[size], variantClasses[variant], className)}
        aria-busy={loading || undefined}
        {...props}
      >
        {leftIcon ? <span className="shrink-0">{leftIcon}</span> : null}
        <span className={cn("inline-flex items-center", { "opacity-0": loading })}>{children}</span>
        {rightIcon ? <span className="shrink-0">{rightIcon}</span> : null}
        {loading ? (
          <span
            className="absolute inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            aria-hidden="true"
          />
        ) : null}
      </button>
    );
  }
);
Button.displayName = "Button";
