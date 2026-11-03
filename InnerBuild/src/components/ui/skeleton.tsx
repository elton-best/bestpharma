"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/60 animate-pulse transition-colors",
        // Premium Shimmer Overlay
        "after:absolute after:inset-0 after:animate-[shimmer_2s_infinite_linear]",
        "after:bg-gradient-to-r after:from-transparent after:via-foreground/5 dark:after:via-white/5 after:to-transparent",
        "after:content-['']",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
