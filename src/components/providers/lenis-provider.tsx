"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ReactLenis, useLenis } from "lenis/react";
import { MotionConfig } from "motion/react";
import { type ReactNode, useEffect, useSyncExternalStore } from "react";

gsap.registerPlugin(ScrollTrigger);

const subscribeToHydration = () => () => undefined;

function ScrollTriggerSync() {
  const lenis = useLenis(ScrollTrigger.update);

  useEffect(() => {
    if (!lenis) return;

    const update = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.refresh();

    return () => {
      gsap.ticker.remove(update);
    };
  }, [lenis]);

  return null;
}

export function LenisProvider({ children }: { children: ReactNode }) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  return (
    <ReactLenis
      root
      options={{
        autoRaf: false,
        anchors: true,
        smoothWheel: true,
        lerp: 0.1,
        duration: 1.0,
      }}
    >
      <MotionConfig reducedMotion={hydrated ? "user" : "never"}>
        <ScrollTriggerSync />
        {children}
      </MotionConfig>
    </ReactLenis>
  );
}
