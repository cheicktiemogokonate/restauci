"use client";
// Adapted from the beUI StatefulButton API while preserving the app's shadcn button styling.

import { Button } from "@/components/ui/button";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Loader2, X } from "lucide-react";
import {
  forwardRef,
  type ComponentProps,
  type ReactNode,
} from "react";

export type ButtonState = "idle" | "loading" | "success" | "error";

export interface StatefulButtonProps
  extends Omit<ComponentProps<typeof Button>, "children"> {
  state?: ButtonState;
  children: ReactNode;
  loadingText?: ReactNode;
  successText?: ReactNode;
  errorText?: ReactNode;
  icon?: ReactNode;
}

export const StatefulButton = forwardRef<
  HTMLButtonElement,
  StatefulButtonProps
>(function StatefulButton(
  {
    state = "idle",
    children,
    loadingText = "Chargement…",
    successText = "Terminé",
    errorText = "Réessayer",
    icon,
    disabled,
    ...props
  },
  ref,
) {
  const reduce = useReducedMotion();
  const content =
    state === "loading"
      ? loadingText
      : state === "success"
        ? successText
        : state === "error"
          ? errorText
          : children;
  const stateIcon =
    state === "loading" ? (
      <Loader2 className="animate-spin" aria-hidden="true" />
    ) : state === "success" ? (
      <Check aria-hidden="true" />
    ) : state === "error" ? (
      <X aria-hidden="true" />
    ) : (
      icon
    );

  return (
    <Button
      ref={ref}
      disabled={disabled || state === "loading"}
      aria-busy={state === "loading"}
      {...props}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={state}
          className="inline-flex items-center gap-2"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={{ duration: reduce ? 0.1 : 0.2 }}
        >
          {stateIcon}
          {content}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
});
