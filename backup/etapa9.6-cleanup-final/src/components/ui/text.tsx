import React from "react";
import { cn } from "@/lib/utils";

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  as?: React.ElementType;
  variant?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "small" | "label" | "span";
  weight?: "normal" | "medium" | "semibold" | "bold";
  color?: "default" | "muted" | "primary" | "success" | "error" | "warning";
}

export function Text({
  as,
  variant = "p",
  weight = "normal",
  color = "default",
  className,
  ...props
}: TextProps) {
  const Component = as || variant;

  const variantStyles = {
    h1: "text-4xl font-bold",
    h2: "text-3xl font-bold",
    h3: "text-2xl font-bold",
    h4: "text-xl font-semibold",
    h5: "text-lg font-semibold",
    h6: "text-base font-semibold",
    p: "text-base",
    small: "text-sm",
    label: "text-sm",
    span: "",
  };

  const weightStyles = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  };

  const colorStyles = {
    default: "text-foreground",
    muted: "text-muted-foreground",
    primary: "text-primary",
    success: "text-green-600",
    error: "text-red-600",
    warning: "text-amber-600",
  };

  return (
    <Component
      className={cn(
        variantStyles[variant],
        weightStyles[weight],
        colorStyles[color],
        className
      )}
      {...props}
    />
  );
} 