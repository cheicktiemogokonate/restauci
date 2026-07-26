import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

interface AppLogoProps {
  href?: string;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  iconSizeClassName?: string;
  textSizeClassName?: string;
  textVisibilityClassName?: string;
  iconImageClassName?: string;
  textImageClassName?: string;
  alt?: string;
}

export function AppLogo({
  href,
  className,
  iconClassName,
  textClassName,
  iconSizeClassName = " w-10 sm:h-12 sm:w-12",
  textSizeClassName = "w-24 sm:w-32",
  textVisibilityClassName = "hidden sm:block",
  iconImageClassName,
  textImageClassName,
  alt = "Logo",
}: AppLogoProps) {
  const content = (
    <>
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center",
          iconSizeClassName,
          iconClassName,
        )}
      >
        <Image
          src="/icon.svg"
          alt={alt}
          width={48}
          height={48}
          className={cn("h-full w-full object-contain", iconImageClassName)}
        />
      </div>

      <div
        className={cn(
          textVisibilityClassName,
          textSizeClassName,
          textClassName,
        )}
      >
        <Image
          src="/text.svg"
          alt={`${alt} texte`}
          width={128}
          height={48}
          className={cn("h-auto w-full object-contain", textImageClassName)}
        />
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn("inline-flex items-center shrink-0", className)}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={cn("inline-flex items-center shrink-0", className)}>
      {content}
    </div>
  );
}
