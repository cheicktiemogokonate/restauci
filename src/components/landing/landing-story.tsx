"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDown, ArrowRight } from "lucide-react";
import { memo, useLayoutEffect, useRef, useState } from "react";
import { PhoneExperience } from "@/components/landing/phone-experience";
import { ProDashboard } from "@/components/landing/pro-dashboard";
import { RequestCard } from "@/components/landing/request-card";
import { Highlighter } from "@/components/ui/highlighter";
import { brand, type StoryStep } from "@/lib/landing/story-data";

gsap.registerPlugin(ScrollTrigger);

const STORY_ENTRIES = [
  {
    step: 2,
    label: "Découverte",
    title: "Tout commence par une découverte.",
    body: "Explorez ce qui est disponible autour de vous.",
  },
  {
    step: 4,
    label: "Sélection",
    title: "Une expérience simple, jusqu’au bout.",
    body: "Choisissez, puis transmettez votre demande en quelques gestes.",
  },
  {
    step: 6,
    label: "Confirmation",
    title: "Confirmation instantanée.",
    body: "La demande #D-2048 est prête à rejoindre l’établissement partenaire.",
  },
] as const;

const CHECKPOINTS: ReadonlyArray<{ at: number; step: StoryStep }> = [
  { at: 0, step: 0 },
  { at: 0.04, step: 1 },
  { at: 0.08, step: 2 },
  { at: 0.17, step: 3 },
  { at: 0.18, step: 4 },
  { at: 0.26, step: 5 },
  { at: 0.27, step: 6 },
  { at: 0.36, step: 7 },
  { at: 0.56, step: 8 },
  { at: 0.58, step: 9 },
  { at: 0.65, step: 10 },
  { at: 0.72, step: 11 },
  { at: 0.79, step: 12 },
  { at: 0.85, step: 13 },
  { at: 0.91, step: 14 },
  { at: 0.96, step: 15 },
];

function stepFromProgress(progress: number): StoryStep {
  let result: StoryStep = 0;
  for (const checkpoint of CHECKPOINTS) {
    if (progress >= checkpoint.at) result = checkpoint.step;
  }
  return result;
}

const StoryLegends = memo(function StoryLegends() {
  return (
    <div className="story-legends" aria-live="polite">
      {STORY_ENTRIES.map((entry) => (
        <article className="story-legend" key={entry.step} aria-hidden="true">
          <p>{entry.label}</p>
          <h2>{entry.title}</h2>
          <span>{entry.body}</span>
        </article>
      ))}
    </div>
  );
});

function MotionStage() {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const browserRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const transferRef = useRef<HTMLDivElement>(null);
  const activeStep = useRef<StoryStep>(0);
  const [step, setStep] = useState<StoryStep>(0);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let dispose: () => void = () => { };

    const phone = phoneRef.current;
    const browser = browserRef.current;
    const hero = heroRef.current;
    const transfer = transferRef.current;
    const track = trackRef.current;
    const legends = track
      ? Array.from(track.querySelectorAll<HTMLElement>(".story-legend"))
      : [];

    if (!phone || !browser || !hero || !transfer || !track || legends.length !== 3) return;

    const mm = gsap.matchMedia();

    const createTimeline = (compact: boolean) => {
      const timeline = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });
      const timelineClock = { value: 0 };
      const phoneStoryY = compact ? -34 : -47;
      const browserStoryY = compact ? -45 : -48;

      const phoneInit = {
        x: 0,
        y: 0,
        xPercent: compact ? 8 : 55,
        yPercent: compact ? -36 : -48,
        scale: compact ? 0.58 : 0.70,
        rotationY: compact ? 0 : -12,
        rotationZ: 2,
        autoAlpha: 0.55,
        transformOrigin: "50% 50%",
      };

      const browserInit = {
        x: 0,
        y: 0,
        xPercent: compact ? -85 : -85,
        yPercent: compact ? -44 : -48,
        scale: compact ? 0.72 : 0.72,
        rotationY: compact ? 0 : 6,
        rotationZ: -1.5,
        autoAlpha: 0.70,
        transformOrigin: "50% 50%",
      };

      const heroInit = {
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: 0,
        opacity: 1,
      };

      // Explicitly establish initial state for both JS and GSAP
      gsap.set(phone, { ...phoneInit, "--sheet-height": "36%" });
      gsap.set(browser, browserInit);
      gsap.set(transfer, {
        x: 0,
        y: 0,
        xPercent: compact ? -50 : 35,
        yPercent: compact ? -30 : -36,
        scale: compact ? 0.82 : 0.85,
        rotationZ: 0,
        rotationY: 0,
        autoAlpha: 0,
        transformOrigin: "50% 50%",
      });
      gsap.set(legends, { x: 0, autoAlpha: 0, yPercent: compact ? 0 : -50, y: compact ? 30 : 40 });
      gsap.set(hero, heroInit);

      timeline
        .to(timelineClock, { value: 1, duration: 1, ease: "none" }, 0)

        /* ───────────────────────────────────────────────────
         * ACT 1 — Hero + teaser devices in background (0 → 0.08)
         * ─────────────────────────────────────────────────── */
        .addLabel("acte-1-promesse", 0)

        /* ───────────────────────────────────────────────────
         * Hero fades out + Phone glides into focus (0.005 → 0.08)
         * ─────────────────────────────────────────────────── */
        .fromTo(
          hero,
          heroInit,
          { xPercent: -50, yPercent: -50, y: "-80vh", opacity: 0, duration: 0.055, ease: "power2.in" },
          0.005
        )
        .fromTo(
          browser,
          browserInit,
          { x: 0, y: 0, xPercent: compact ? -130 : -105, autoAlpha: 0, duration: 0.055, ease: "power2.in" },
          0.005
        )
        .fromTo(
          phone,
          phoneInit,
          {
            x: 0,
            y: 0,
            xPercent: compact ? -50 : 35,
            yPercent: phoneStoryY,
            scale: 1,
            rotationY: 0,
            rotationZ: 0,
            autoAlpha: 1,
            duration: 0.065,
            ease: "power2.out",
          },
          0.015
        )

        /* ───────────────────────────────────────────────────
         * ACT 2 — Phone experience: Discovery, Selection, Confirmation
         * Strictly sequential legend transitions — ZERO superposition
         * (0.08 → 0.36)
         * ─────────────────────────────────────────────────── */
        .addLabel("acte-2-experience", 0.08)
        // Legend 1 – Découverte (0.08 -> 0.17)
        .to(legends[0], { autoAlpha: 1, y: 0, duration: 0.035, ease: "power2.out" }, 0.08)
        .to(legends[0], { y: compact ? -25 : -35, autoAlpha: 0, duration: 0.025, ease: "power2.in" }, 0.145)

        // Bottom sheet smooth expansion 1: 36% -> 68%
        .to(phone, { "--sheet-height": "68%", duration: 0.06, ease: "power1.inOut" }, 0.15)

        // Legend 2 – Sélection (0.175 -> 0.265) — enters strictly AFTER Legend 1 is gone
        .to(legends[1], { autoAlpha: 1, y: 0, duration: 0.035, ease: "power2.out" }, 0.175)
        .to(legends[1], { y: compact ? -25 : -35, autoAlpha: 0, duration: 0.025, ease: "power2.in" }, 0.24)

        // Bottom sheet smooth expansion 2: 68% -> 84%
        .to(phone, { "--sheet-height": "84%", duration: 0.06, ease: "power1.inOut" }, 0.245)

        // Legend 3 – Confirmation (0.270 -> 0.355) — enters strictly AFTER Legend 2 is gone
        .to(legends[2], { autoAlpha: 1, y: 0, duration: 0.035, ease: "power2.out" }, 0.270)
        .to(legends[2], { y: compact ? -25 : -35, autoAlpha: 0, duration: 0.025, ease: "power2.in" }, 0.33)

        // Continuous subtle phone micro-breathing
        .to(phone, {
          yPercent: phoneStoryY + 1.2,
          rotationZ: 0.6,
          duration: 0.10,
          ease: "sine.inOut",
        }, 0.08)
        .to(phone, {
          yPercent: phoneStoryY - 1,
          rotationZ: -0.5,
          duration: 0.11,
          ease: "sine.inOut",
        }, 0.18)
        .to(phone, {
          yPercent: phoneStoryY,
          rotationZ: 0,
          duration: 0.08,
          ease: "sine.inOut",
        }, 0.28)

        /* ───────────────────────────────────────────────────
         * ACT 3 — Transmission: Card physically detaches from phone,
         * travels across stage, then absorbs into incoming browser
         * (0.36 → 0.56)
         * ─────────────────────────────────────────────────── */
        .addLabel("acte-3-transmission", 0.36)

        // Phase A: Card physically lifts off phone screen (0.36 → 0.42)
        .to(transfer, {
          autoAlpha: 1,
          scale: compact ? 1.04 : 1.08,
          x: 0,
          y: 0,
          xPercent: compact ? -50 : 35,
          yPercent: compact ? -58 : -42,
          rotationZ: compact ? -2 : -3,
          rotationY: compact ? 0 : -6,
          duration: 0.06,
          ease: "power2.out",
        }, 0.36)
        .to(phone, {
          scale: compact ? 0.90 : 0.92,
          rotationY: compact ? 0 : 8,
          rotationZ: compact ? -1.5 : -1,
          autoAlpha: compact ? 0.85 : 0.9,
          duration: 0.06,
          ease: "power2.out",
        }, 0.36)

        // Phase B: Mid-flight travel across stage (0.42 → 0.52)
        .set(browser, {
          x: 0,
          y: 0,
          xPercent: compact ? -50 : -105,
          yPercent: compact ? 35 : browserStoryY,
          scale: compact ? 0.88 : 0.85,
          rotationY: compact ? 0 : 6,
          rotationZ: 0,
          autoAlpha: 0,
        }, 0.41)
        .to(browser, {
          x: 0,
          y: 0,
          xPercent: compact ? -50 : -65,
          yPercent: browserStoryY,
          scale: compact ? 0.96 : 0.88,
          rotationY: 0,
          autoAlpha: 1,
          duration: 0.10,
          ease: "power2.out",
        }, 0.42)
        .to(phone, {
          x: 0,
          y: 0,
          xPercent: compact ? -50 : 38,
          yPercent: compact ? 40 : phoneStoryY,
          scale: compact ? 0.70 : 0.88,
          rotationY: compact ? 0 : 10,
          autoAlpha: compact ? 0 : 1,
          duration: 0.10,
          ease: "power1.inOut",
        }, 0.42)
        .to(transfer, {
          x: 0,
          y: 0,
          xPercent: compact ? -50 : -50,
          yPercent: compact ? -46 : -45,
          scale: compact ? 0.96 : 0.96,
          rotationZ: compact ? 0 : 2,
          rotationY: compact ? 0 : 4,
          autoAlpha: 1,
          duration: 0.10,
          ease: "power1.inOut",
        }, 0.42)

        // Phase C: Docking / Absorption into Partner Dashboard (0.52 → 0.56)
        .to(transfer, {
          x: 0,
          y: 0,
          xPercent: compact ? -50 : -50,
          yPercent: compact ? (browserStoryY + 4) : (browserStoryY + 2),
          scale: compact ? 0.62 : 0.65,
          autoAlpha: 0,
          duration: 0.04,
          ease: "power2.in",
        }, 0.52)
        .to(browser, {
          x: 0,
          y: 0,
          xPercent: -50,
          scale: 1,
          duration: 0.04,
          ease: "power2.out",
        }, 0.52)
        .to(phone, {
          x: 0,
          y: 0,
          xPercent: compact ? -50 : 95,
          scale: 0.70,
          autoAlpha: 0,
          duration: 0.04,
          ease: "power2.in",
        }, 0.52)
        .set(browser, { clearProps: "filter" }, 0.56)

        /* ───────────────────────────────────────────────────
         * ACT 4 — Dashboard lifecycle & continuous responsiveness
         * (0.56 → 1.0)
         * ─────────────────────────────────────────────────── */
        .addLabel("acte-4-espace-etablissement", 0.56)
        .addLabel("reception", 0.58)
        .addLabel("demandes-liste", 0.65)
        .addLabel("priorisation", 0.72)
        .addLabel("detail-demande", 0.79)
        .addLabel("traitement", 0.85)
        .addLabel("resolution", 0.91)
        .addLabel("cloture", 0.96)
        .addLabel("acte-5-action", 1)

        // Continuous subtle depth & breathing so every scroll increment moves the dashboard
        .to(browser, {
          x: 0,
          y: 0,
          xPercent: -50,
          scale: 1.012,
          yPercent: compact ? -44 : -46,
          ease: "sine.inOut",
          duration: 0.14,
        }, 0.56)
        .to(browser, {
          x: 0,
          y: 0,
          xPercent: -50,
          scale: 1.0,
          yPercent: compact ? -46 : -48,
          ease: "sine.inOut",
          duration: 0.14,
        }, 0.70)
        .to(browser, {
          x: 0,
          y: 0,
          xPercent: -50,
          scale: 1.008,
          yPercent: browserStoryY,
          ease: "sine.inOut",
          duration: 0.14,
        }, 0.84);

      const syncProgress = (progress: number) => {
        timeline.progress(progress);
        const next = stepFromProgress(progress);
        legends.forEach((legend, index) => {
          legend.setAttribute("aria-hidden", String(next !== STORY_ENTRIES[index].step));
        });
        if (next !== activeStep.current) {
          activeStep.current = next;
          setStep(next);
        }
      };

      const trigger = ScrollTrigger.create({
        trigger: track,
        start: "top top",
        end: "bottom bottom",
        invalidateOnRefresh: true,
        onUpdate: (self) => syncProgress(self.progress),
        onRefresh: (self) => syncProgress(self.progress),
      });
      syncProgress(trigger.progress);

      return () => {
        trigger.kill();
        timeline.kill();
      };
    };

    mm.add("(min-width: 900px)", () => createTimeline(false));
    mm.add("(max-width: 899px)", () => createTimeline(true));
    setReady(true);
    ScrollTrigger.refresh();
    dispose = () => mm.revert();

    return () => {
      dispose();
    };
  }, []);

  return (
    <div ref={trackRef} className="motion-story" id="experience">
      <section ref={stageRef} className="story-stage" data-step={step} data-story-ready={ready ? "true" : "false"} aria-label={`Le parcours ${brand.name} en une seule narration`}>
        <div ref={heroRef} className="hero-copy" id="top">
          <h1>
            {["Découvrez.", "Commandez.", "Réservez."].map((word) => (
              <span key={word}>
                <Highlighter
                  action="underline"
                  animationDuration={1}
                  color="#55c99b"
                  iterations={1}
                  multiline={false}
                  padding={[0, 4, 10, 4]}
                  strokeWidth={3}
                >
                  {word}
                </Highlighter>
              </span>
            ))}
          </h1>
          <p>Trouvez ce dont vous avez besoin autour de vous, puis agissez depuis une seule expérience.</p>
          <a href="#experience" className="scroll-cue">Découvrir le parcours <ArrowDown size={15} strokeWidth={2} /></a>
        </div>

        <StoryLegends />

        <div ref={phoneRef} className="device phone-device" aria-hidden={step < 1 || step >= 8}>
          <PhoneExperience step={step} timelineControlled />
        </div>
        <div ref={browserRef} className="device browser-device" aria-hidden={step < 8}>
          <ProDashboard step={step} />
        </div>
        <div ref={transferRef} className="transfer-card" aria-hidden={step !== 7}>
          <RequestCard floating />
        </div>
      </section>
      <span id="pro" className="story-anchor story-anchor-pro" aria-hidden="true" />
    </div>
  );
}

function ReducedMotionStory() {
  return (
    <div className="reduced-story" id="experience-static">
      <section className="reduced-hero">
        <p className="reduced-kicker">ToutCi</p>
        <h1>Découvrez.<br /><strong>Commandez.</strong><br /><strong>Réservez.</strong></h1>
        <p>Trouvez ce dont vous avez besoin autour de vous, puis agissez depuis une seule expérience.</p>
      </section>

      <section className="reduced-act">
        <div className="reduced-heading"><span>Expérience utilisateur</span><h2>De la découverte à la confirmation.</h2></div>
        <div className="reduced-phone-grid">
          {STORY_ENTRIES.map((entry, index) => (
            <article key={entry.step}>
              <div><span>{entry.label}</span><h3>{entry.title}</h3><p>{entry.body}</p></div>
              <PhoneExperience step={([1, 3, 5] as StoryStep[])[index]} />
            </article>
          ))}
        </div>
      </section>

      <section className="reduced-transfer">
        <div><span>Transmission</span><h2>La même demande poursuit son chemin.</h2></div>
        <RequestCard floating />
        <ArrowRight aria-hidden="true" />
      </section>

      <section className="reduced-dashboard">
        <div className="reduced-heading"><span>Espace établissement</span><h2>Reçue, traitée, terminée.</h2></div>
        <ProDashboard step={15} />
      </section>
    </div>
  );
}

export function LandingStory() {
  return <><MotionStage /><ReducedMotionStory /></>;
}
