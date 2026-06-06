import * as React from "react";
import { cn } from "@/lib/utils";

function CardHoverEffect({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-hover-effect"
      className={cn(
        "group relative overflow-hidden rounded-[32px] border border-slate-200 bg-white/90 p-0 shadow-lg shadow-slate-900/5 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-900/10",
        className
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-primary/10 via-transparent to-transparent opacity-90" />
      <div className="relative">{props.children}</div>
    </div>
  );
}

export { CardHoverEffect };
