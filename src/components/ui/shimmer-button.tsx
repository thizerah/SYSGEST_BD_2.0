import * as React from "react";

import { cn } from "@/lib/utils";

export interface ShimmerButtonProps extends React.ComponentPropsWithoutRef<"button"> {
  shimmerClassName?: string;
}

export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  ({ className, children, disabled, shimmerClassName, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        className={cn(
          "group relative inline-flex items-center justify-center overflow-hidden rounded-lg border border-border/80 bg-background px-4 py-2 text-xs font-semibold text-foreground shadow-sm transition-all",
          "hover:border-primary/25 hover:bg-muted/40 hover:shadow-md",
          "disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        {...props}
      >
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-transparent via-primary/[0.12] to-transparent",
            "animate-shimmer-slide",
            shimmerClassName
          )}
        />
        <span className="relative z-[1] flex items-center gap-1.5">{children}</span>
      </button>
    );
  }
);
ShimmerButton.displayName = "ShimmerButton";
