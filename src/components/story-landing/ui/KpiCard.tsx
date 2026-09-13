"use client";

import { AnimatedNumber } from "@/components/motion/animated-number";
import { cn } from "@/shared/ui/cn";

export interface KpiCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/** KPI du dashboard Safari — Number Animation beUI (spec §13). */
export function KpiCard({ label, value, prefix, suffix, className }: KpiCardProps) {
  return (
    <div
      className={cn(
        "flex-1 rounded-xl border border-[#E3EAE5] bg-white px-4 py-3",
        className,
      )}
    >
      <p className="text-[11px] font-medium tracking-wide text-[#7A8A80] uppercase">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-[#22312A]">
        <AnimatedNumber
          value={value}
          prefix={prefix}
          suffix={suffix}
          duration={1}
          startOnView={false}
        />
      </p>
    </div>
  );
}
