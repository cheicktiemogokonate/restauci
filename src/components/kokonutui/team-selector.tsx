"use client";

/**
 * @author: @dorianbaffier
 * @description: Team Selector
 * @version: 3.0.0
 * @date: 2026-04-23
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { Minus, Plus } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const AVATAR_OVERLAP = 12;
const DICEBEAR_STYLE = "notionists-neutral";
const dicebearUrl = (seed: string) =>
  `https://api.dicebear.com/9.x/${DICEBEAR_STYLE}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=f4f4f5,e4e4e7,d4d4d8,a1a1aa`;

interface TeamMember {
  id: string;
  name: string;
  avatarUrl: string;
}

const DEFAULT_MEMBERS: TeamMember[] = [
  { id: "member-1", name: "Alex Rivera", avatarUrl: dicebearUrl("Alex") },
  { id: "member-2", name: "Blair Kim", avatarUrl: dicebearUrl("Blair") },
  { id: "member-3", name: "Casey Lin", avatarUrl: dicebearUrl("Casey") },
  { id: "member-4", name: "Devon Marsh", avatarUrl: dicebearUrl("Devon") },
];

const animations = {
  avatar: {
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 22,
        mass: 0.6,
      },
    },
    hidden: {
      opacity: 0,
      scale: 0.85,
      transition: { duration: 0.18, ease: "easeOut" },
    },
  } satisfies Variants,
  vibration: {
    idle: { x: 0 },
    shake: {
      x: [-3, 3, -2, 2, 0] as const,
      transition: { duration: 0.28, ease: "easeOut" },
    },
  } satisfies Variants,
} as const;

interface TeamSelectorProps {
  members?: TeamMember[];
  value?: number;
  defaultValue?: number;
  max?: number;
  onChange?: (size: number) => void;
  label?: string;
  singularLabel?: string;
  pluralLabel?: string;
  decrementLabel?: string;
  incrementLabel?: string;
  showAvatars?: boolean;
  variant?: "card" | "compact";
  className?: string;
}

export default function TeamSelector({
  members = DEFAULT_MEMBERS,
  value,
  defaultValue = 1,
  max,
  onChange,
  label = "Team Size",
  singularLabel = "member",
  pluralLabel = "members",
  decrementLabel = "Decrease team size",
  incrementLabel = "Increase team size",
  showAvatars = true,
  variant = "card",
  className = "",
}: TeamSelectorProps) {
  const maxTeamSize = Math.max(1, max ?? members.length);
  const [internalCount, setInternalCount] = useState(() =>
    Math.min(Math.max(defaultValue, 1), maxTeamSize),
  );
  const peopleCount = Math.min(
    Math.max(value ?? internalCount, 1),
    maxTeamSize,
  );
  const [isVibrating, setIsVibrating] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const vibrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(
    () => () => {
      if (vibrationTimerRef.current) clearTimeout(vibrationTimerRef.current);
    },
    [],
  );

  const updateCount = (next: number) => {
    if (value === undefined) setInternalCount(next);
    onChange?.(next);
  };

  const triggerVibration = () => {
    if (prefersReducedMotion) {
      return;
    }
    setIsVibrating(true);
    if (vibrationTimerRef.current) clearTimeout(vibrationTimerRef.current);
    vibrationTimerRef.current = setTimeout(() => setIsVibrating(false), 280);
  };

  const handleIncrement = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (peopleCount < maxTeamSize) {
      setDirection(1);
      const newCount = peopleCount + 1;
      updateCount(newCount);
    } else {
      triggerVibration();
    }
  };

  const handleDecrement = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (peopleCount > 1) {
      setDirection(-1);
      const newCount = peopleCount - 1;
      updateCount(newCount);
    } else {
      triggerVibration();
    }
  };

  const counterDistance = prefersReducedMotion ? 0 : 10;

  return (
    <div
      className={`flex w-full flex-col items-center justify-center ${className}`}
    >
      <div
        className={
          variant === "compact"
            ? "w-full"
            : "w-full max-w-xs rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] dark:border-white/8 dark:bg-zinc-900/60"
        }
      >
        <fieldset>
          <legend className="mb-3 w-full text-sm font-medium text-foreground">
            {label}
          </legend>

          {showAvatars ? <div className="mb-7 flex justify-center">
            <div className="flex items-center">
              {members.slice(0, maxTeamSize).map((member, index) => (
                <motion.div
                  animate={index < peopleCount ? "visible" : "hidden"}
                  className="flex items-center justify-center"
                  initial={index < defaultValue ? "visible" : "hidden"}
                  key={member.id}
                  style={{
                    marginLeft: index === 0 ? 0 : -AVATAR_OVERLAP,
                    zIndex: maxTeamSize - index,
                  }}
                  variants={animations.avatar}
                >
                  <Image
                    alt={member.name}
                    className="size-11 rounded-full border-2 border-white bg-zinc-100 object-cover shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/5 dark:border-zinc-900 dark:bg-zinc-800 dark:ring-white/5"
                    height={88}
                    src={member.avatarUrl}
                    unoptimized
                    width={88}
                  />
                </motion.div>
              ))}
            </div>
          </div> : null}

          <motion.div
            animate={isVibrating ? "shake" : "idle"}
            className="flex items-center justify-center gap-5"
            initial="idle"
            variants={animations.vibration}
          >
            <button
              aria-label={decrementLabel}
              className="flex size-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-500 transition-all duration-150 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 focus-visible:ring-offset-2 active:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:border-white/8 dark:bg-zinc-900 dark:text-zinc-400 dark:active:bg-zinc-800/80 dark:focus-visible:ring-zinc-500/40 dark:focus-visible:ring-offset-zinc-900 dark:hover:border-white/16 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:disabled:hover:bg-zinc-900"
              disabled={peopleCount <= 1}
              onClick={handleDecrement}
              type="button"
            >
              <Minus aria-hidden="true" className="size-3.5" strokeWidth={2} />
            </button>

            <div className="flex min-w-16 flex-col items-center">
              <div className="relative h-9 overflow-hidden">
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.output
                    animate={{ opacity: 1, y: 0 }}
                    aria-live="polite"
                    className="block select-none font-semibold text-3xl text-zinc-900 tabular-nums dark:text-zinc-100"
                    exit={{
                      opacity: 0,
                      y: direction * -counterDistance,
                      transition: { duration: 0.14, ease: "easeIn" },
                    }}
                    initial={{
                      opacity: 0,
                      y: direction * counterDistance,
                    }}
                    key={peopleCount}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {peopleCount}
                  </motion.output>
                </AnimatePresence>
              </div>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                {peopleCount === 1 ? singularLabel : pluralLabel}
              </span>
            </div>

            <button
              aria-label={incrementLabel}
              className="flex size-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-white text-zinc-500 transition-all duration-150 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40 focus-visible:ring-offset-2 active:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:border-white/8 dark:bg-zinc-900 dark:text-zinc-400 dark:active:bg-zinc-800/80 dark:focus-visible:ring-zinc-500/40 dark:focus-visible:ring-offset-zinc-900 dark:hover:border-white/16 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:disabled:hover:bg-zinc-900"
              disabled={peopleCount >= maxTeamSize}
              onClick={handleIncrement}
              type="button"
            >
              <Plus aria-hidden="true" className="size-3.5" strokeWidth={2} />
            </button>
          </motion.div>
        </fieldset>
      </div>
    </div>
  );
}
