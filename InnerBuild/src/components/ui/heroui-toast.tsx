import React from "react";
import { toast as sonnerToast } from "sonner";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Loader2,
  Users,
  HardDrive,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "default" | "accent" | "success" | "warning" | "danger";

export interface HeroToastOptions {
  description?: React.ReactNode;
  indicator?: React.ReactNode;
  variant?: ToastVariant;
  timeout?: number;
  isLoading?: boolean;
  actionProps?: {
    children: React.ReactNode;
    onPress?: () => void;
    onClick?: () => void;
    variant?: "default" | "secondary" | "tertiary" | "danger";
    className?: string;
  };
  onClose?: () => void;
  className?: string;
}

const defaultIcons: Record<ToastVariant, React.ReactNode> = {
  default: <Info className="size-4 text-muted-foreground" />,
  accent: <Info className="size-4 text-blue-500" />,
  success: <CheckCircle2 className="size-4 text-emerald-500" />,
  warning: <AlertTriangle className="size-4 text-amber-500" />,
  danger: <AlertCircle className="size-4 text-rose-500" />,
};

const variantStyles: Record<
  ToastVariant,
  {
    bg: string;
    border: string;
    indicatorBg: string;
  }
> = {
  default: {
    bg: "bg-card text-foreground",
    border: "border-border",
    indicatorBg: "bg-muted text-muted-foreground",
  },
  accent: {
    bg: "bg-card text-foreground",
    border: "border-blue-200 dark:border-blue-800/40",
    indicatorBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
  },
  success: {
    bg: "bg-card text-foreground",
    border: "border-emerald-200 dark:border-emerald-800/40",
    indicatorBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
  },
  warning: {
    bg: "bg-card text-foreground",
    border: "border-amber-200 dark:border-amber-800/40",
    indicatorBg: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
  },
  danger: {
    bg: "bg-card text-foreground",
    border: "border-rose-200 dark:border-rose-800/40",
    indicatorBg: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
  },
};

function renderHeroToastContent(
  id: string | number,
  title: React.ReactNode,
  options?: HeroToastOptions,
) {
  const variant = options?.variant ?? "default";
  const styles = variantStyles[variant];

  const handleAction = () => {
    if (options?.actionProps?.onPress) {
      options.actionProps.onPress();
    } else if (options?.actionProps?.onClick) {
      options.actionProps.onClick();
    }
  };

  return (
    <div
      className={cn(
        "relative flex w-full max-w-[420px] items-start gap-3 rounded-2xl border p-4 shadow-lg backdrop-blur-xs transition-all animate-in fade-in slide-in-from-bottom-2",
        styles.bg,
        styles.border,
        options?.className,
      )}
      role="status"
    >
      {/* Indicator icon */}
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-xl",
          styles.indicatorBg,
        )}
      >
        {options?.isLoading ? (
          <Loader2 className="size-4 animate-spin text-accent" />
        ) : options?.indicator !== undefined ? (
          options.indicator
        ) : (
          defaultIcons[variant]
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 pr-6">
        <div className="text-sm font-semibold tracking-tight text-ink">{title}</div>
        {options?.description && (
          <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {options.description}
          </div>
        )}
        {options?.actionProps && (
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={handleAction}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-hidden",
                options.actionProps.variant === "danger"
                  ? "bg-rose-500 text-white hover:bg-rose-600"
                  : options.actionProps.variant === "tertiary"
                    ? "bg-transparent text-muted-foreground hover:bg-muted hover:text-ink"
                    : "bg-ink text-paper hover:bg-ink/90",
                options.actionProps.className,
              )}
            >
              {options.actionProps.children}
            </button>
          </div>
        )}
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={() => {
          options?.onClose?.();
          sonnerToast.dismiss(id);
        }}
        className="absolute right-2.5 top-2.5 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-ink transition-colors"
        aria-label="Fermer"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function createToastConfig(options?: HeroToastOptions) {
  const duration = options?.timeout ?? (options?.isLoading ? Infinity : 4000);
  const onClose = options?.onClose;
  if (onClose) {
    return { duration, onDismiss: () => onClose() };
  }
  return { duration };
}

export function heroToast(message: React.ReactNode, options?: HeroToastOptions) {
  return sonnerToast.custom(
    (id) => renderHeroToastContent(id, message, { variant: "default", ...options }),
    createToastConfig(options),
  );
}

heroToast.success = (message: React.ReactNode, options?: HeroToastOptions) => {
  return sonnerToast.custom(
    (id) => renderHeroToastContent(id, message, { variant: "success", ...options }),
    createToastConfig(options),
  );
};

heroToast.info = (message: React.ReactNode, options?: HeroToastOptions) => {
  return sonnerToast.custom(
    (id) => renderHeroToastContent(id, message, { variant: "accent", ...options }),
    createToastConfig(options),
  );
};

heroToast.warning = (message: React.ReactNode, options?: HeroToastOptions) => {
  return sonnerToast.custom(
    (id) => renderHeroToastContent(id, message, { variant: "warning", ...options }),
    createToastConfig(options),
  );
};

heroToast.danger = (message: React.ReactNode, options?: HeroToastOptions) => {
  return sonnerToast.custom(
    (id) => renderHeroToastContent(id, message, { variant: "danger", ...options }),
    createToastConfig(options),
  );
};

heroToast.error = heroToast.danger;

heroToast.close = (id: string | number) => {
  sonnerToast.dismiss(id);
};

heroToast.promise = <T,>(
  promise: Promise<T>,
  data: {
    loading: React.ReactNode;
    success: React.ReactNode | ((data: T) => React.ReactNode);
    error: React.ReactNode | ((error: unknown) => React.ReactNode);
  },
) => {
  const toastId = heroToast(data.loading, {
    isLoading: true,
    variant: "default",
    timeout: 0,
  });

  promise
    .then((result) => {
      sonnerToast.dismiss(toastId);
      const msg = typeof data.success === "function" ? data.success(result) : data.success;
      heroToast.success(msg);
    })
    .catch((err) => {
      sonnerToast.dismiss(toastId);
      const msg = typeof data.error === "function" ? data.error(err) : data.error;
      heroToast.danger(msg);
    });

  return toastId;
};

// Export commonly used icons for indicators
export const ToastIcons = {
  Users,
  HardDrive,
  Star,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
};

export { heroToast as toast };
