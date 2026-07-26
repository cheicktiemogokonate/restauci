"use client";
// beui.dev/components/motion/text-animation

import {
  motion,
  useInView,
  useReducedMotion,
  type Transition,
} from "motion/react";
import {
  useRef,
  type ComponentType,
  type ElementType,
  type ReactNode,
  type RefObject,
} from "react";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

type SplitMode = "word" | "char";

export interface TextRevealProps {
  text: string | string[];
  as?: ElementType;
  className?: string;
  split?: SplitMode;
  stagger?: number;
  delay?: number;
  blur?: number;
  yOffset?: string | number;
  once?: boolean;
  whileInView?: boolean;
}

export function TextReveal({
  text,
  as: Comp = "span",
  className,
  split = "word",
  stagger = 0.07,
  delay = 0,
  blur = 8,
  yOffset = "28%",
  once = true,
  whileInView = false,
}: TextRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once, amount: 0.4 });
  const reduce = useReducedMotion();
  const shouldAnimate = whileInView ? inView : true;
  const lines = Array.isArray(text) ? text : [text];
  const Component = Comp as ComponentType<{
    ref?: RefObject<HTMLElement | null>;
    className?: string;
    children?: ReactNode;
  }>;
  let unitIndex = 0;

  return (
    <Component ref={ref} className={cn("block", className)}>
      {lines.map((line, lineIndex) => {
        const units = split === "word" ? line.split(" ") : Array.from(line);
        return (
          <span key={`${line}-${lineIndex}`} className="block">
            {units.map((unit, index) => {
              const unitDelay = delay + unitIndex++ * stagger;
              const initial = reduce
                ? { opacity: 0 }
                : { y: yOffset, opacity: 0, filter: `blur(${blur}px)` };
              const animate = shouldAnimate
                ? reduce
                  ? { opacity: 1 }
                  : { y: 0, opacity: 1, filter: "blur(0px)" }
                : initial;
              const transition: Transition = reduce
                ? { duration: 0.2, delay: unitDelay * 0.3 }
                : {
                    y: {
                      type: "spring",
                      stiffness: 160,
                      damping: 26,
                      mass: 1,
                      delay: unitDelay,
                    },
                    opacity: {
                      duration: 0.6,
                      ease: EASE_OUT,
                      delay: unitDelay,
                    },
                    filter: {
                      duration: 0.7,
                      ease: EASE_OUT,
                      delay: unitDelay,
                    },
                  };

              return (
                <motion.span
                  key={`${unit}-${index}`}
                  initial={initial}
                  animate={animate}
                  transition={transition}
                  className="inline-block will-change-transform"
                >
                  {unit}
                  {split === "word" && index < units.length - 1 ? (
                    <span className="inline-block">&nbsp;</span>
                  ) : null}
                </motion.span>
              );
            })}
          </span>
        );
      })}
    </Component>
  );
}
