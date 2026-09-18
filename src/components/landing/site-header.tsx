import Link from "next/link";
import StaggeredMenu from "@/components/StaggeredMenu";
import { BrandLogo } from "@/components/landing/brand-logo";
import { brand } from "@/lib/landing/story-data";

export function SiteHeader() {
  return (
    <>
      <header className="site-header hidden min-[1100px]:flex">
        <nav aria-label="Navigation principale" className="main-nav">
          <Link href="/partenaires" className="font-semibold text-[#087a50] hover:text-[#0d3d28] transition-colors">
            Partenaires
          </Link>
        </nav>
        <Link href="/" aria-label={`${brand.name} — accueil`} className="brand-link">
          <BrandLogo />
        </Link>
        <nav aria-label="Navigation principale" className="main-nav">
          <Link href="/#download">Télécharger</Link>
        </nav>
      </header>

      <div className="staggered-mobile min-[1100px]:hidden">
        <StaggeredMenu
          isFixed
          className="toutci-staggered"
          position="right"
          logoUrl="/brand/toutci-logo.png"
          colors={["#bfe8d3", "#087a50"]}
          items={[
            // { label: "Explorer", ariaLabel: `Explorer l’expérience ${brand.name}`, link: "/#experience" },
            // { label: "Aperçu Pro", ariaLabel: "Découvrir l’espace établissement", link: "/#pro" },
            { label: "Partenaires", ariaLabel: "Découvrir les offres partenaires Toutci", link: "/partenaires" },
            { label: "Télécharger", ariaLabel: `Télécharger l’application ${brand.name}`, link: "/#download" },
          ]}
          displaySocials={false}
          displayItemNumbering={false}
          menuButtonColor="#0d3d28"
          openMenuButtonColor="#ffffff"
          accentColor="#5ee5ad"
        />
      </div>
    </>
  );
}
