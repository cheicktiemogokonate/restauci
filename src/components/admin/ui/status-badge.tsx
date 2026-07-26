import {
  AnimatedBadge,
  type AnimatedBadgeStatus,
} from "@/components/motion/animated-badge";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type StatusBadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

interface StatusBadgeProps
  extends Omit<ComponentProps<typeof AnimatedBadge>, "status"> {
  variant?: StatusBadgeVariant;
}

const variantClasses: Record<StatusBadgeVariant, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  neutral: "border-gray-200 bg-gray-50 text-gray-700",
};

export function StatusBadge({
  variant = "neutral",
  className,
  ...props
}: StatusBadgeProps) {
  return (
    <AnimatedBadge
      status={variant as AnimatedBadgeStatus}
      size="sm"
      className={cn("font-semibold", variantClasses[variant], className)}
      {...props}
    />
  );
}
