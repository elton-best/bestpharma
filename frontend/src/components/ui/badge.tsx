import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#0F3B27] text-[#92FF5F] shadow hover:bg-[#0F3B27]/90",
        secondary:
          "border-transparent bg-[#CFF1D2] text-[#0F3B27] hover:bg-[#CFF1D2]/80 font-bold",
        success:
          "border-[#0F3B27]/20 bg-[#CFF1D2] text-[#0F3B27] font-bold hover:bg-[#b8f0bc]",
        warning:
          "border-[#FF7036]/30 bg-[#FF7036]/15 text-[#FF7036] font-bold hover:bg-[#FF7036]/25",
        destructive:
          "border-red-200 bg-red-50 text-red-700 font-bold shadow-sm hover:bg-red-100",
        outline:
          "border-[#0F3B27]/20 text-[#0F3B27] font-semibold bg-white/70",
        lime:
          "border-transparent bg-[#92FF5F] text-[#0F3B27] font-extrabold shadow-sm hover:bg-[#84f052]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
