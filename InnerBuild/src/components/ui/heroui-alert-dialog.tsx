"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* --- 1. Root --- */
const Root: React.FC<React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Root>> = (props) => (
  <AlertDialogPrimitive.Root {...props} />
);

/* --- 2. Trigger --- */
const Trigger = AlertDialogPrimitive.Trigger;

/* --- 3. Backdrop (Portal + Overlay) --- */
const Backdrop: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <AlertDialogPrimitive.Portal>
    <AlertDialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
    />
    {children}
  </AlertDialogPrimitive.Portal>
);

/* --- 4. Container --- */
const Container: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      "fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto pointer-events-none",
      className,
    )}
  >
    {children}
  </div>
);

/* --- 5. Dialog (Content) --- */
const Dialog = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AlertDialogPrimitive.Content
    ref={ref}
    className={cn(
      "relative pointer-events-auto w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-2xl transition-all duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 focus:outline-hidden",
      className,
    )}
    {...props}
  >
    {children}
  </AlertDialogPrimitive.Content>
));
Dialog.displayName = "HeroAlertDialog.Dialog";

/* --- 6. Close Trigger --- */
const CloseTrigger = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, children, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      "absolute right-4 top-4 rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-ink transition-colors focus-visible:outline-hidden",
      className,
    )}
    {...props}
  >
    {children || <X className="size-4" />}
    <span className="sr-only">Fermer</span>
  </AlertDialogPrimitive.Cancel>
));
CloseTrigger.displayName = "HeroAlertDialog.CloseTrigger";

/* --- 7. Header --- */
const Header: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn("flex items-start gap-3.5 mb-3", className)}>
    {children}
  </div>
);

/* --- 8. Icon --- */
export type AlertStatus = "danger" | "warning" | "info" | "success";

interface IconProps {
  status?: AlertStatus;
  className?: string;
  icon?: React.ReactNode;
}

const statusConfig: Record<
  AlertStatus,
  { bg: string; text: string; defaultIcon: React.ReactNode }
> = {
  danger: {
    bg: "bg-rose-500/10 dark:bg-rose-950/50",
    text: "text-rose-500",
    defaultIcon: <AlertCircle className="size-5" />,
  },
  warning: {
    bg: "bg-amber-500/10 dark:bg-amber-950/50",
    text: "text-amber-500",
    defaultIcon: <AlertTriangle className="size-5" />,
  },
  info: {
    bg: "bg-blue-500/10 dark:bg-blue-950/50",
    text: "text-blue-500",
    defaultIcon: <Info className="size-5" />,
  },
  success: {
    bg: "bg-emerald-500/10 dark:bg-emerald-950/50",
    text: "text-emerald-500",
    defaultIcon: <CheckCircle2 className="size-5" />,
  },
};

const Icon: React.FC<IconProps> = ({ status = "info", className, icon }) => {
  const config = statusConfig[status];
  return (
    <div
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-2xl",
        config.bg,
        config.text,
        className,
      )}
    >
      {icon || config.defaultIcon}
    </div>
  );
};

/* --- 9. Heading (Title) --- */
const Heading = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-base font-semibold tracking-tight text-ink", className)}
    {...props}
  />
));
Heading.displayName = "HeroAlertDialog.Heading";

/* --- 10. Body (Description) --- */
const Body = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
));
Body.displayName = "HeroAlertDialog.Body";

/* --- 11. Footer --- */
const Footer: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn("mt-6 flex flex-wrap items-center justify-end gap-2.5", className)}>
    {children}
  </div>
);

/* --- 12. Slot Button Helpers (Action / Cancel) --- */
const ActionButton = AlertDialogPrimitive.Action;
const CancelButton = AlertDialogPrimitive.Cancel;

export const HeroAlertDialog = Object.assign(Root, {
  Trigger,
  Backdrop,
  Container,
  Dialog,
  CloseTrigger,
  Header,
  Icon,
  Heading,
  Body,
  Footer,
  Action: ActionButton,
  Cancel: CancelButton,
});

export default HeroAlertDialog;
