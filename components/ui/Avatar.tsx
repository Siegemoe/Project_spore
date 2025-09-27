"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string; // used for fallback initial
  size?: AvatarSize;
  rounded?: "full" | "lg" | "md";
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base"
};

export function Avatar({
  className,
  src,
  alt,
  name,
  size = "md",
  rounded = "full",
  ...props
}: AvatarProps) {
  const [errored, setErrored] = React.useState(false);
  const fallback = name?.trim()?.[0]?.toUpperCase();

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden bg-[rgb(var(--surface-muted))] text-text-primary",
        sizeClasses[size],
        rounded === "full" ? "rounded-full" : rounded === "lg" ? "rounded-lg" : "rounded-md",
        "border border-border-subtle",
        className
      )}
      {...props}
    >
      {src && !errored ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt || name || "avatar"}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : fallback ? (
        <span aria-hidden="true" className="font-medium">
          {fallback}
        </span>
      ) : (
        <span aria-hidden="true" className="block h-1/2 w-1/2 rounded-full bg-border-subtle" />
      )}
    </div>
  );
}
