"use client";

import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Building2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { brand } from "@/lib/landing/story-data";

import { MotionButton } from "@/components/ui/motion-button";

gsap.registerPlugin(ScrollTrigger, useGSAP);

function StoreDownloadButton({ store, href }: { store: "ios" | "android"; href: string }) {
  const [feedback, setFeedback] = useState(false);
  const isApple = store === "ios";
  const content = (
    <>
      <span className="footer-store-icon-wrap" aria-hidden="true">
        {isApple ? (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.62-.75 1.04-1.8.93-2.84-.9.04-1.99.6-2.63 1.35-.57.65-1.07 1.72-.94 2.74 1.01.08 2.02-.5 2.64-1.25z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24">
            <path fill="#4285F4" d="M3.609 1.813 13.793 12 3.61 22.187C3.245 21.802 3 21.233 3 20.5v-17c0-.733.245-1.302.609-1.687z" />
            <path fill="#34A853" d="M17.156 8.636 13.793 12l3.363 3.364 3.805-2.15c.781-.442.781-1.157 0-1.599l-3.805-2.979z" />
            <path fill="#FBBC05" d="M3.609 1.813c.245-.255.578-.413.966-.413s.745.144 1.096.342l11.485 6.494-3.363 3.364L3.609 1.813z" />
            <path fill="#EA4335" d="m13.793 12 3.363 3.364-11.485 6.494c-.351.198-.708.342-1.096.342s-.721-.158-.966-.413L13.793 12z" />
          </svg>
        )}
      </span>
      <span className="footer-store-text">
        <small>{feedback ? "Lancement imminent" : (isApple ? "Télécharger dans l’" : "Disponible sur")}</small>
        <strong>{isApple ? "App Store" : "Google Play"}</strong>
      </span>
    </>
  );
  const label = `Télécharger ${brand.name} sur ${isApple ? "l’App Store" : "Google Play"}`;

  const handlePending = () => {
    setFeedback(true);
    setTimeout(() => setFeedback(false), 2400);
  };

  return href ? (
    <a className="footer-store-button" href={href} aria-label={label} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  ) : (
    <button className="footer-store-button" type="button" onClick={handlePending} aria-label={label} title="Lien de téléchargement bientôt disponible">
      {content}
    </button>
  );
}

export function MotionFooter() {
  const rootRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const textElRef = useRef<SVGTextElement>(null);

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const panel = panelRef.current;
    const word = wordRef.current;
    if (!panel || !word) return;

    const reveal = gsap.fromTo(
      panel,
      { yPercent: -8, opacity: 0.8 },
      { yPercent: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: rootRef.current, start: "top bottom", end: "top 25%", scrub: 1 } },
    );
    const title = gsap.fromTo(
      word,
      { opacity: 0.35, scale: 0.97 },
      { opacity: 1, scale: 1, ease: "power2.out", scrollTrigger: { trigger: rootRef.current, start: "top 80%", end: "top 20%", scrub: 0.6 } },
    );
    return () => { reveal.kill(); title.kill(); };
  }, { scope: rootRef });

  /* Measure the rendered text bbox and set a tight viewBox so the text fills 100% width */
  useEffect(() => {
    const text = textElRef.current;
    const svg = svgRef.current;
    if (!text || !svg) return;
    const { x, y, width, height } = text.getBBox();
    svg.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
  }, []);

  return (
    <footer ref={rootRef} className="motion-footer" id="download">
      <div ref={panelRef} className="footer-panel">
        <div className="footer-topbar" style={{ border: "none" }} />

        <div className="footer-cta-card">
          <div className="footer-main-copy">
            <h2>L’expérience commence maintenant.</h2>
            <p className="footer-lead">Commandez, réservez et vivez chaque instant depuis une seule application mobile.</p>
            <div className="footer-store-row" aria-label={`Télécharger l’application ${brand.name}`}>
              <StoreDownloadButton store="ios" href={brand.downloadUrls.ios} />
              <StoreDownloadButton store="android" href={brand.downloadUrls.android} />
            </div>
          </div>
          <div className="footer-pro-card">
            <span className="footer-pro-tag">
              <Building2 size={13} />
              Espace Partenaire
            </span>
            <h3>Vous êtes un établissement ?</h3>
            <p>Digitalisez vos commandes, réservations et suivi en direct.</p>
            <MotionButton
              href="/partenaires"
              label="Espace Partenaire"
              classes="mt-2 w-fit bg-white/95 border-emerald-900/15"
            />
          </div>
        </div>
        <div className="footer-meta">
          <nav aria-label="Informations légales et publiques" className="footer-legal-nav">
            <span className="footer-legal-sep" aria-hidden="true">•</span>
            <Link href="/conditions-generales" className="footer-legal-link">
              Conditions générales
            </Link>
            <span className="footer-legal-sep" aria-hidden="true">•</span>
            <Link href="/mentions-legales" className="footer-legal-link">
              Mentions légales
            </Link>
            <span className="footer-legal-sep" aria-hidden="true">•</span>
            <Link href="/confidentialite" className="footer-legal-link">
              Confidentialité
            </Link>
            <span className="footer-legal-sep" aria-hidden="true">•</span>
            <Link href="/cookies" className="footer-legal-link">
              Cookies
            </Link>
          </nav>
          <small className="footer-copyright">
            © {new Date().getFullYear()} {brand.name}. Tous droits réservés. {brand.context}.
          </small>
        </div>
        <div ref={wordRef} className="footer-wordmark-container" aria-label={brand.name}>
          <svg
            ref={svgRef}
            viewBox="0 0 760 140"
            className="footer-wordmark-svg"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="footerBrandGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0b4229" />
                <stop offset="55%" stopColor="#0d5937" />
                <stop offset="100%" stopColor="#48aa7d" />
              </linearGradient>
            </defs>
            <text
              ref={textElRef}
              x="380"
              y="114"
              textAnchor="middle"
              className="footer-wordmark-text"
            >
              {brand.name.toUpperCase()}
            </text>
          </svg>
        </div>
      </div>
    </footer>
  );
}
