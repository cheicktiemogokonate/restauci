"use client";
// beui.dev/components/motion/input

import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type InputClassNames = {
  root?: string;
  label?: string;
  field?: string;
  input?: string;
  leftIcon?: string;
  rightIcon?: string;
  successIcon?: string;
  errorMessage?: string;
};

export interface InputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "defaultValue" | "onChange"
  > {
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  error?: string | boolean;
  success?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  classNames?: InputClassNames;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    value: valueProp,
    defaultValue,
    onChange,
    onFocus,
    onBlur,
    error,
    success,
    leftIcon,
    rightIcon,
    className,
    classNames,
    disabled,
    id: idProp,
    type,
    ...rest
  },
  ref,
) {
  const reactId = useId();
  const id = idProp ?? reactId;
  const reduce = useReducedMotion();
  const controlled = valueProp !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const [focused, setFocused] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const value = controlled ? (valueProp ?? "") : internal;
  const hasError = Boolean(error);
  const errorMessage = typeof error === "string" ? error : null;
  const rightSlot = success ? null : rightIcon;

  useEffect(() => {
    if (!fieldRef.current || reduce || !hasError) return;
    animate(
      fieldRef.current,
      { x: [0, -6, 6, -4, 4, -2, 0] },
      { duration: 0.45 },
    );
  }, [hasError, reduce]);

  return (
    <div className={cn("flex flex-col gap-2", className, classNames?.root)}>
      {label ? (
        <label
          htmlFor={id}
          className={cn(
            "px-1 text-[11px] font-bold tracking-[0.08em] text-[#173c2f]/75 uppercase",
            classNames?.label,
          )}
        >
          {label}
        </label>
      ) : null}

      <div
        ref={fieldRef}
        className={cn(
          "relative h-12 overflow-hidden rounded-2xl border bg-[#f7faf8] transition-[border-color,box-shadow,background-color] duration-200",
          "border-black/8 shadow-[inset_0_1px_0_rgba(255,255,255,.9)]",
          focused &&
          !hasError &&
          "border-[#0f8a5f]/45 bg-white shadow-[0_0_0_3px_rgba(15,138,95,.10)]",
          hasError &&
          "border-destructive/70 bg-red-50/50 shadow-[0_0_0_3px_rgba(220,38,38,.08)]",
          disabled && "opacity-60",
          classNames?.field,
        )}
      >
        {leftIcon ? (
          <span
            className={cn(
              "pointer-events-none absolute top-1/2 left-4 flex -translate-y-1/2 items-center text-[#527064] [&_svg]:size-4",
              classNames?.leftIcon,
            )}
          >
            {leftIcon}
          </span>
        ) : null}

        <input
          ref={ref}
          id={id}
          type={type}
          value={value}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={errorMessage ? `${id}-error` : undefined}
          {...rest}
          onChange={(event) => {
            if (!controlled) setInternal(event.target.value);
            onChange?.(event.target.value);
          }}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          className={cn(
            "h-full w-full bg-transparent text-sm font-medium text-[#132d24] caret-[#0f8a5f] outline-none placeholder:text-[#789087]/70",
            leftIcon ? "pl-11" : "pl-4",
            rightSlot || success ? "pr-12" : "pr-4",
            disabled && "cursor-not-allowed",
            classNames?.input,
          )}
        />

        {success ? (
          <motion.svg
            viewBox="0 0 24 24"
            fill="none"
            className={cn(
              "absolute top-1/2 right-4 size-5 -translate-y-1/2 text-[#0f8a5f]",
              classNames?.successIcon,
            )}
          >
            <motion.path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </motion.svg>
        ) : rightSlot ? (
          <span
            className={cn(
              "absolute top-1/2 right-1.5 flex size-10 -translate-y-1/2 items-center justify-center text-[#527064] [&_svg]:size-4",
              classNames?.rightIcon,
            )}
          >
            {rightSlot}
          </span>
        ) : null}
      </div>

      <AnimatePresence initial={false}>
        {errorMessage ? (
          <motion.p
            id={`${id}-error`}
            role="alert"
            initial={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, y: -4, filter: "blur(4px)" }
            }
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
            transition={{ duration: 0.2 }}
            className={cn(
              "px-1 text-xs font-medium text-destructive",
              classNames?.errorMessage,
            )}
          >
            {errorMessage}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
});
