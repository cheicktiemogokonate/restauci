"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface BarChartProps {
  items: {
    progress: number;
    label: string;
    className?: string;
    containerClassName?: string;
  }[];
  height?: number;
  className?: string;
}

export default function BarChart({
  items,
  className,
  height: providedHeight,
}: BarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number>();
  const [shouldUseValue, setShouldUseValue] = useState(false);
  const height = providedHeight ?? measuredHeight ?? 12;

  useLayoutEffect(() => {
    if (providedHeight !== undefined || !containerRef.current) return;
    const node = containerRef.current;
    const updateHeight = () => setMeasuredHeight(node.offsetHeight);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, [providedHeight]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setShouldUseValue(true), 250);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative box-border flex min-h-4 w-full flex-wrap items-end gap-[2px] overflow-hidden",
        className,
      )}
      style={{ height }}
    >
      {items.map((item) => {
        const clampedProgress = Math.min(100, Math.max(0, item.progress));
        const barHeight = shouldUseValue ? (clampedProgress / 100) * height : 0;
        return (
          <div
            className={cn("flex h-full flex-1 flex-col-reverse", item.containerClassName)}
            key={item.label}
            title={item.label}
          >
            <div
              style={{ height: barHeight }}
              className={cn("transition-[height,background-color] duration-500 ease-out", item.className)}
            />
          </div>
        );
      })}
    </div>
  );
}
