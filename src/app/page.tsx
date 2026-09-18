import { LandingStory } from "@/components/landing/landing-story";
import { MotionFooter } from "@/components/landing/motion-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { LenisProvider } from "@/components/providers/lenis-provider";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <LenisProvider>
      <a className="skip-link" href="#main-content">Aller au contenu</a>
      <SiteHeader />
      <main id="main-content">
        <LandingStory />
      </main>
      <MotionFooter />
    </LenisProvider>
  );
}
