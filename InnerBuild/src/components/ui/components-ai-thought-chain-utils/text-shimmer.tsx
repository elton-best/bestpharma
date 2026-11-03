"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function ShimmerText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block bg-[linear-gradient(110deg,#93c5fd,45%,#1d4ed8,55%,#93c5fd)] dark:bg-[linear-gradient(110deg,#60a5fa,45%,#ffffff,55%,#60a5fa)] bg-[length:250%_100%] bg-clip-text text-transparent animate-shimmer font-medium",
        className
      )}
    >
      {text}
    </span>
  );
}

export default ShimmerText;
