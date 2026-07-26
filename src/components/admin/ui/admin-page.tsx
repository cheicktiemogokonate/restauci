import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-full bg-muted/30">
      <div
        className={cn(
          "mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
