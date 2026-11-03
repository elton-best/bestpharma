import React from "react";
import { cn } from "@/lib/utils";

interface WaveLoaderProps {
  className?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function WaveLoader({ className, label = "Chargement en cours…", size = "md" }: WaveLoaderProps) {
  const heights = size === "sm" 
    ? ["h-1.5", "h-2.5", "h-3.5", "h-2.5", "h-1.5"]
    : size === "lg"
    ? ["h-3.5", "h-5", "h-6", "h-5", "h-3.5"]
    : ["h-2.5", "h-3.5", "h-4.5", "h-3.5", "h-2.5"];

  return (
    <div className={cn("inline-flex items-center gap-2", className)} role="status" aria-label={label}>
      <span className="flex h-6 items-center justify-center gap-0.5" aria-hidden="true">
        <span
          className={cn(heights[0], "w-1 rounded-full bg-accent origin-center")}
          style={{ animation: "spinner-wave 0.9s ease-in-out infinite 0s" }}
        />
        <span
          className={cn(heights[1], "w-1 rounded-full bg-accent origin-center")}
          style={{ animation: "spinner-wave 0.9s ease-in-out infinite 0.12s" }}
        />
        <span
          className={cn(heights[2], "w-1 rounded-full bg-accent origin-center")}
          style={{ animation: "spinner-wave 0.9s ease-in-out infinite 0.24s" }}
        />
        <span
          className={cn(heights[3], "w-1 rounded-full bg-accent origin-center")}
          style={{ animation: "spinner-wave 0.9s ease-in-out infinite 0.36s" }}
        />
        <span
          className={cn(heights[4], "w-1 rounded-full bg-accent origin-center")}
          style={{ animation: "spinner-wave 0.9s ease-in-out infinite 0.48s" }}
        />
      </span>
      {label && <span className="text-xs text-muted-foreground font-medium animate-pulse">{label}</span>}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export default WaveLoader;
