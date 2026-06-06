import React from "react";

interface BackgroundDecorationProps {
  src: string;
  className?: string;
  size?: number; // e.g. 200 to 500
}

export default function BackgroundDecoration({ src, className = "", size = 300 }: BackgroundDecorationProps) {
  // Extra signature identification matching known names
  const fileName = src.split("/").pop() || "";

  // Render inline SVGs to allow stroke dash animation and coloring
  const renderInlineSVG = () => {
    switch (fileName) {
      case "mushroom-outline.svg":
        return (
          <g stroke="#085a3c" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M50 20 C25 20 20 45 20 55 C20 57 22 58 24 58 L76 58 C78 58 80 57 80 55 C80 45 75 20 50 20 Z" className="animated-path" />
            <path d="M42 58 L42 80 C42 83 45 85 50 85 C55 85 58 83 58 80 L58 58" className="animated-path" />
            <path d="M30 58 Q50 64 70 58" className="animated-path" />
            <circle cx="35" cy="35" r="5" className="animated-path" />
            <circle cx="50" cy="45" r="4" className="animated-path" />
            <circle cx="65" cy="32" r="6" className="animated-path" />
            <circle cx="48" cy="28" r="3" className="animated-path" />
          </g>
        );
      case "pizza-outline.svg":
        return (
          <g stroke="#085a3c" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 20 L80 50 L25 80 Z" className="animated-path" />
            <path d="M15 20 Q12 50 25 80" strokeWidth="2.8" className="animated-path" />
            <circle cx="35" cy="40" r="4" className="animated-path" />
            <circle cx="50" cy="50" r="5" className="animated-path" />
            <circle cx="32" cy="62" r="3" className="animated-path" />
            <circle cx="58" cy="58" r="4" className="animated-path" />
            <path d="M22 35 Q30 38 32 30" className="animated-path" />
            <path d="M25 55 Q35 52 40 60" className="animated-path" />
            <path d="M45 42 Q50 35 60 45" className="animated-path" />
          </g>
        );
      case "fork-spoon-outline.svg":
        return (
          <g stroke="#085a3c" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M30 15 L30 45 L35 45 L35 15" className="animated-path" />
            <path d="M22 15 L22 35 C22 45 38 45 38 35 L38 15" className="animated-path" />
            <path d="M30 45 L30 85" strokeWidth="2.5" className="animated-path" />
            <path d="M70 15 C60 15 58 35 58 42 C58 48 65 52 70 52 C75 52 82 48 82 42 C82 35 80 15 70 15 Z" className="animated-path" />
            <path d="M70 52 L70 85" strokeWidth="2.5" className="animated-path" />
          </g>
        );
      case "tomato-outline.svg":
        return (
          <g stroke="#085a3c" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M50 85 C22 85 15 65 15 50 C15 35 25 25 45 25 C47 25 49 25.5 50 26 C51 25.5 53 25 55 25 C75 25 85 35 85 50 C85 65 78 85 50 85 Z" className="animated-path" />
            <path d="M50 25 L50 15" strokeWidth="2.8" className="animated-path" />
            <path d="M50 25 Q40 20 30 24 Q42 26 50 25" className="animated-path" />
            <path d="M50 25 Q60 20 70 24 Q58 26 50 25" className="animated-path" />
            <path d="M50 25 Q45 29 48 35 Q50 29 50 25" className="animated-path" />
            <path d="M50 25 Q55 29 52 35 Q50 29 50 25" className="animated-path" />
            <path d="M22 45 C20 55 25 65 30 70" className="animated-path" />
          </g>
        );
      case "chef-hat-outline.svg":
        return (
          <g stroke="#085a3c" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M30 70 Q15 65 20 50 Q12 35 28 35 Q30 15 50 15 Q70 15 72 35 Q88 35 80 50 Q85 65 70 70" className="animated-path" />
            <path d="M30 70 L70 70 L70 85 L30 85 Z" className="animated-path" />
            <path d="M30 78 L70 78" className="animated-path" />
            <path d="M40 70 L40 85" className="animated-path" />
            <path d="M50 70 L50 85" className="animated-path" />
            <path d="M60 70 L60 85" className="animated-path" />
          </g>
        );
      case "herbs-outline.svg":
        return (
          <g stroke="#085a3c" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M50 85 C50 85 40 55 50 15" strokeWidth="2.5" className="animated-path" />
            <path d="M50 65 Q30 65 25 55 Q40 50 50 65" className="animated-path" />
            <path d="M50 65 L35 58" className="animated-path" />
            <path d="M50 50 Q70 50 75 40 Q60 35 50 50" className="animated-path" />
            <path d="M50 50 L65 43" className="animated-path" />
            <path d="M50 35 Q32 32 30 22 Q43 20 50 35" className="animated-path" />
            <path d="M50 35 L38 27" className="animated-path" />
            <path d="M50 20 Q65 15 62 5 Q52 8 50 20" className="animated-path" />
          </g>
        );
      case "vegetables-outline.svg":
        return (
          <g stroke="#085a3c" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M55 25 C62 30 65 38 18 82 C16 84 13 83 12 81 C11 80 12 77 14 75 L53 23 C53 23 54 24 55 25 Z" strokeWidth="2.5" className="animated-path" />
            <path d="M28 66 Q30 63 35 60" className="animated-path" />
            <path d="M40 52 Q42 49 45 46" className="animated-path" />
            <path d="M48 40 Q50 37 52 34" className="animated-path" />
            <path d="M53 23 C53 23 55 12 62 10" className="animated-path" />
            <path d="M54 24 C54 24 64 18 70 12" className="animated-path" />
            <path d="M55 25 C55 25 64 28 72 24" className="animated-path" />
          </g>
        );
      case "coffee-outline.svg":
        return (
          <g stroke="#085a3c" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M25 35 L75 35 L70 70 C68 80 58 82 50 82 C42 82 32 80 30 70 Z" className="animated-path" />
            <path d="M75 42 C82 42 85 48 85 52 C85 57 80 62 72 62" className="animated-path" />
            <path d="M38 18 Q40 25 42 18" className="animated-path" />
            <path d="M50 18 Q52 25 54 18" className="animated-path" />
            <path d="M62 18 Q64 25 66 18" className="animated-path" />
          </g>
        );
      case "burger-outline.svg":
        return (
          <g stroke="#085a3c" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 50 C20 30 40 20 50 20 C60 20 80 30 80 50 Z" className="animated-path" />
            <path d="M15 50 L85 50 C87 50 88 52 87 54 L82 62 L18 62 L13 54 C12 52 13 50 15 50 Z" strokeWidth="2" className="animated-path" />
            <path d="M22 62 Q50 68 78 62" strokeWidth="2.5" className="animated-path" />
            <path d="M18 70 L82 70" strokeWidth="2" className="animated-path" />
            <path d="M23 70 C23 78 30 82 50 82 C70 82 77 78 77 70 Z" className="animated-path" />
          </g>
        );
      case "cheese-outline.svg":
        return (
          <g stroke="#085a3c" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 75 L85 75 L75 30 L15 75 Z" className="animated-path" />
            <path d="M15 75 L15 62 L75 30" className="animated-path" />
            <circle cx="35" cy="62" r="3" className="animated-path" />
            <circle cx="55" cy="55" r="4.5" className="animated-path" />
            <circle cx="45" cy="68" r="2.5" className="animated-path" />
            <circle cx="68" cy="48" r="3.5" className="animated-path" />
          </g>
        );
      default:
        // Return null to fallback to standard <img> rendering
        return null;
    }
  };

  const inlineSvgElement = renderInlineSVG();

  if (inlineSvgElement) {
    return (
      <div
        style={{ width: `${size}px`, height: `${size}px` }}
        className={`pointer-events-none select-none z-0 hover:scale-105 transition-transform duration-1000 ${className}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          className="w-full h-full overflow-visible"
        >
          <style>{`
            @keyframes infinite-flow {
              0% {
                stroke-dashoffset: 0;
              }
              100% {
                stroke-dashoffset: -300;
              }
            }
            .animated-path {
              stroke-dasharray: 12 14;
              // animation: infinite-flow 55s linear infinite ;
              filter: drop-shadow(0px 1px 2px rgba(8, 90, 60, 0.05));
              opacity: 0.85;
            }
          `}</style>
          {inlineSvgElement}
        </svg>
      </div>
    );
  }

  // Fallback to standard <img>
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      referrerPolicy="no-referrer"
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`pointer-events-none select-none z-0 hover:scale-105 transition-transform duration-1000 ${className}`}
    />
  );
}
