"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Écran de mockup à échelle déterministe : le contenu est composé à une
 * largeur de design fixe (1200px pour Safari, 389px pour l'iPhone) puis
 * réduit via transform: scale() au quotient réel. Garantit des proportions
 * et des tailles de texte identiques à toutes les largeurs d'affichage,
 * sans layout par pourcentage fragile. Le scale n'affecte que le composant.
 */
export function ScreenScaler({
  designWidth,
  children,
  className,
}: {
  designWidth: number;
  children: ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () => setScale(node.clientWidth / designWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [designWidth]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden ${className ?? ""}`}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          width: designWidth,
          height: scale > 0 ? `${100 / scale}%` : "100%",
          transform: `scale(${scale})`,
          visibility: scale > 0 ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
