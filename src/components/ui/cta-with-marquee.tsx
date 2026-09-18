"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { ReactNode, useState } from "react";

export interface MarqueeProps {
  children: ReactNode;
  pauseOnHover?: boolean;
  reverse?: boolean;
  className?: string;
  speed?: number;
}

export function Marquee({
  children,
  pauseOnHover = false,
  reverse = false,
  className,
  speed = 40,
}: MarqueeProps) {
  return (
    <div
      className={cn(
        "group flex overflow-hidden [--gap:1rem] [gap:var(--gap)]",
        className
      )}
      style={
        {
          "--duration": `${speed}s`,
        } as React.CSSProperties
      }
    >
      <div
        className={cn(
          "flex min-w-full shrink-0 items-center justify-around gap-[var(--gap)] animate-marquee",
          reverse && "[animation-direction:reverse]",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          "flex min-w-full shrink-0 items-center justify-around gap-[var(--gap)] animate-marquee",
          reverse && "[animation-direction:reverse]",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
        aria-hidden="true"
      >
        {children}
      </div>
    </div>
  );
}

const defaultImagesRow1 = [
  "https://cdn.21st.dev/assets/mirror/69/697f7681b52a28ac0bdbba7112048ff98b24ae1f61c801524d3bea14a82c40e7.jpg",
  "https://cdn.21st.dev/assets/mirror/4c/4c334511e54d5e842944d4f50d6e652f07665a1e16766d28d11387c9b3b4c4d1.jpg",
  "https://cdn.21st.dev/assets/mirror/89/892cf4ed0c29f61f17fea5cccffad0575e37575ae5742c717ca16274d0d4e894.jpg",
  "https://cdn.21st.dev/assets/mirror/69/690e70500d799ff55c6f30eb47242fbaa63080c2d5d6cdc731048efe8588ebbe.jpg",
];

const defaultImagesRow2 = [
  "https://cdn.21st.dev/assets/mirror/c8/c8e98756dd770841764a95ebbdbad40e53854be8a98e1c7d25ddd4c8c7e70255.jpg",
  "https://cdn.21st.dev/assets/mirror/27/278d971ec24e44da1feebce8112db18c9e573b7f1640cf3c2e3465971092df0f.jpg",
  "https://cdn.21st.dev/assets/mirror/ff/ff22309571652c322033406ed025e30c20679bf9c5e7f2dd5d8bebf1acc56dfd.jpg",
  "https://cdn.21st.dev/assets/mirror/7c/7c529e9e13aa7c9933e060b7513d08d6ecceb48f9c276592294b094520115bdb.jpg",
];

export interface ScrambleButtonProps {
  label?: string;
  onClick?: () => void;
  className?: string;
}

export function ScrambleButton({
  label = "Start with one agent",
  onClick,
  className,
}: ScrambleButtonProps) {
  const [prevLabel, setPrevLabel] = useState(label);
  const [displayText, setDisplayText] = useState(label);
  const [isScrambling, setIsScrambling] = useState(false);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

  if (prevLabel !== label) {
    setPrevLabel(label);
    setDisplayText(label);
  }

  const scramble = () => {
    if (isScrambling) return;
    setIsScrambling(true);

    let iteration = 0;
    const maxIterations = label.length;

    const interval = setInterval(() => {
      setDisplayText(() =>
        label
          .split("")
          .map((letter, index) => {
            if (index < iteration) {
              return label[index];
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );

      if (iteration >= maxIterations) {
        clearInterval(interval);
        setIsScrambling(false);
      }

      iteration += 1 / 3;
    }, 30);
  };

  return (
    <button
      type="button"
      onMouseEnter={scramble}
      onClick={onClick}
      className={cn(
        "px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:bg-primary/90 transition-colors shadow-sm cursor-pointer",
        className
      )}
    >
      {displayText}
    </button>
  );
}

export interface HeroWithMarqueeProps {
  title?: string;
  subtitle?: string;
  description?: string;
  buttonLabel?: string;
  onButtonClick?: () => void;
  images1?: string[];
  images2?: string[];
  className?: string;
  badge?: string;
}

export function HeroWithMarquee({
  title = "AI agents that work - or you don't pay",
  subtitle = "One agent. One acceptance test.",
  description = "Fixed quote, defined upfront.",
  buttonLabel = "Start with one agent",
  onButtonClick,
  images1 = defaultImagesRow1,
  images2 = defaultImagesRow2,
  className,
  badge,
}: HeroWithMarqueeProps) {
  return (
    <div
      className={cn(
        "min-h-[500px] bg-background text-foreground flex items-center overflow-hidden relative py-12",
        className
      )}
    >
      <div className="container mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Content */}
          <div className="space-y-6">
            {badge && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#edf5f0] text-[#087a50] border border-[#087a50]/20">
                {badge}
              </span>
            )}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-[#102d1f]">
              {title}
            </h1>
            <div className="space-y-1 text-muted-foreground">
              {subtitle && <p className="text-base sm:text-lg">{subtitle}</p>}
              {description && <p className="text-base sm:text-lg">{description}</p>}
            </div>
            <div>
              <ScrambleButton label={buttonLabel} onClick={onButtonClick} />
            </div>
          </div>

          {/* Right Marquee Grid */}
          <div className="space-y-4 overflow-hidden">
            <Marquee speed={30} reverse className="[--gap:1rem]">
              {images1.map((src, idx) => (
                <div
                  key={idx}
                  className="relative w-48 h-48 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-[#dfe8e2]"
                >
                  <Image
                    src={src}
                    alt={`Showcase showcase ${idx + 1}`}
                    fill
                    sizes="192px"
                    className="object-cover"
                  />
                </div>
              ))}
            </Marquee>
            <Marquee speed={30} className="[--gap:1rem]">
              {images2.map((src, idx) => (
                <div
                  key={idx}
                  className="relative w-48 h-48 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-[#dfe8e2]"
                >
                  <Image
                    src={src}
                    alt={`Showcase showcase ${idx + 5}`}
                    fill
                    sizes="192px"
                    className="object-cover"
                  />
                </div>
              ))}
            </Marquee>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroWithMarqueeReverse({
  title = "Put one agent on a real workflow",
  subtitle = "Lead capture, operations, support, voice.",
  description = "It works, or you don't pay.",
  buttonLabel = "Start with one agent",
  onButtonClick,
  images1 = defaultImagesRow1,
  images2 = defaultImagesRow2,
  className,
  badge,
}: HeroWithMarqueeProps) {
  return (
    <div
      className={cn(
        "min-h-[500px] bg-background text-foreground flex items-center overflow-hidden relative py-12",
        className
      )}
    >
      <div className="container mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Marquee Grid */}
          <div className="space-y-4 overflow-hidden">
            <Marquee speed={30} reverse className="[--gap:1rem]">
              {images1.map((src, idx) => (
                <div
                  key={idx}
                  className="relative w-48 h-48 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-[#dfe8e2]"
                >
                  <Image
                    src={src}
                    alt={`Showcase showcase ${idx + 1}`}
                    fill
                    sizes="192px"
                    className="object-cover"
                  />
                </div>
              ))}
            </Marquee>
            <Marquee speed={30} className="[--gap:1rem]">
              {images2.map((src, idx) => (
                <div
                  key={idx}
                  className="relative w-48 h-48 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-[#dfe8e2]"
                >
                  <Image
                    src={src}
                    alt={`Showcase showcase ${idx + 5}`}
                    fill
                    sizes="192px"
                    className="object-cover"
                  />
                </div>
              ))}
            </Marquee>
          </div>

          {/* Right Content */}
          <div className="space-y-6">
            {badge && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#edf5f0] text-[#087a50] border border-[#087a50]/20">
                {badge}
              </span>
            )}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-[#102d1f]">
              {title}
            </h1>
            <div className="space-y-1 text-muted-foreground">
              {subtitle && <p className="text-base sm:text-lg">{subtitle}</p>}
              {description && <p className="text-base sm:text-lg">{description}</p>}
            </div>
            <div>
              <ScrambleButton label={buttonLabel} onClick={onButtonClick} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HeroWithMarquee;
