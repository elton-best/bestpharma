"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { Bold, Italic, Underline, Strikethrough } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectionMode = "single" | "multiple";

interface ToggleButtonGroupProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>,
    "type" | "value" | "defaultValue" | "onValueChange"
  > {
  selectionMode?: SelectionMode;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  className?: string;
  children: React.ReactNode;
}

const ToggleButtonGroupContext = React.createContext<{
  selectionMode: SelectionMode;
}>({
  selectionMode: "multiple",
});

const ToggleButtonGroupRoot = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  ToggleButtonGroupProps
>(
  (
    {
      selectionMode = "multiple",
      value,
      defaultValue,
      onValueChange,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const sharedClassName = cn(
      "inline-flex items-center gap-1 rounded-xl border border-line bg-card/60 p-1 shadow-xs backdrop-blur-xs",
      className,
    );

    if (selectionMode === "single") {
      const singleProps: React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> = {
        type: "single",
        ...(typeof value === "string" ? { value } : {}),
        ...(typeof defaultValue === "string" ? { defaultValue } : {}),
        ...(typeof onValueChange === "function"
          ? { onValueChange: onValueChange as (val: string) => void }
          : {}),
      };

      return (
        <ToggleButtonGroupContext.Provider value={{ selectionMode }}>
          <ToggleGroupPrimitive.Root
            ref={ref}
            className={sharedClassName}
            {...props}
            {...singleProps}
          >
            {children}
          </ToggleGroupPrimitive.Root>
        </ToggleButtonGroupContext.Provider>
      );
    }

    const multipleProps: React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> = {
      type: "multiple",
      ...(Array.isArray(value) ? { value } : {}),
      ...(Array.isArray(defaultValue) ? { defaultValue } : {}),
      ...(typeof onValueChange === "function"
        ? { onValueChange: onValueChange as (val: string[]) => void }
        : {}),
    };

    return (
      <ToggleButtonGroupContext.Provider value={{ selectionMode }}>
        <ToggleGroupPrimitive.Root
          ref={ref}
          className={sharedClassName}
          {...props}
          {...multipleProps}
        >
          {children}
        </ToggleGroupPrimitive.Root>
      </ToggleButtonGroupContext.Provider>
    );
  },
);
ToggleButtonGroupRoot.displayName = "ToggleButtonGroup";

/* --- Separator --- */
const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    aria-orientation="vertical"
    className={cn("mx-0.5 h-4 w-px bg-line/80 self-center", className)}
    {...props}
  />
));
Separator.displayName = "ToggleButtonGroup.Separator";

/* --- ToggleButton --- */
export interface ToggleButtonProps
  extends Omit<React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>, "value"> {
  id?: string;
  value?: string;
  isIconOnly?: boolean;
}

export const ToggleButton = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  ToggleButtonProps
>(({ className, id, value, isIconOnly = false, children, ...props }, ref) => {
  const itemValue = value || id || "";

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      value={itemValue}
      className={cn(
        "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50",
        "text-muted-foreground hover:bg-muted/70 hover:text-ink",
        "data-[state=on]:bg-accent/15 data-[state=on]:text-accent data-[state=on]:font-semibold shadow-xs",
        isIconOnly ? "size-8 p-1.5" : "px-3 py-1.5 text-xs",
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
});
ToggleButton.displayName = "ToggleButton";

export const ToggleButtonGroup = Object.assign(ToggleButtonGroupRoot, {
  Separator,
});

export const Icons = {
  Bold,
  Italic,
  Underline,
  Strikethrough,
};

export default ToggleButtonGroup;
