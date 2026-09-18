import Image from "next/image";
import { brand } from "./story-data";
import { cn } from "@/shared/ui/cn";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn("relative block h-10 w-32 overflow-hidden", className)}>
      <Image
        src="/brand/toutci-logo.png"
        alt={brand.name}
        width={132}
        height={66}
        priority
        className="absolute left-0 top-0 h-auto w-full -translate-y-[13px]"
      />
    </span>
  );
}
