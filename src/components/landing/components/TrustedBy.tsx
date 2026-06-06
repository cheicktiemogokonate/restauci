import { trustedLogos } from "../data";
import CurvedLoop from "./CurvedLoop";
import LogoLoop from "./LogoLoop";

export default function TrustedBy() {
  const brandLogos = trustedLogos.map((brand) => ({
    node: (
      <div 
        className="flex items-center gap-3 py-1 px-4 filter grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
      >
        <span className="text-3xl" role="img" aria-label={brand.name}>
          {brand.logo}
        </span>
        <span className="font-display font-black text-lg text-brand-dark tracking-tighter whitespace-nowrap">
          {brand.name}
        </span>
      </div>
    ),
    title: brand.name,
  }));

  return (
    <section className="py-12 border-y border-[#EAEAEA] bg-white bg-radial from-transparent to-gray-50/40 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h3 className="text-center text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-8">
          Ils propulsent leur croissance avec RestauCI
        </h3>
        
        {/* Continuous looping partner logos */}
        <div className="w-full relative mb-12 overflow-visible">
          <LogoLoop
            logos={brandLogos}
            speed={50}
            direction="left"
            logoHeight={36}
            gap={48}
            pauseOnHover={true}
            scaleOnHover={true}
            fadeOut={true}
            fadeOutColor="#ffffff"
            ariaLabel="Fiers partenaires installés"
          />
        </div>

        {/* Interactive Curved Loop Ribbon */}
        <div className="w-full relative mt-4 h-[120px] overflow-visible flex items-center justify-center">
          <CurvedLoop 
            marqueeText="RESTAUCI ✦ SMART POS ✦ GESTION SIMPLIFIÉE ✦ COMMANDE COMPTOIR ✦ PILOTAGE EN DIRECT ✦ FIABILITÉ ASSURÉE ✦"
            speed={1.5}
            curveAmount={100}
            interactive={true}
            className="fill-[#085a3c] font-display text-sm tracking-widest opacity-100 font-extrabold"
          />
        </div>
      </div>
    </section>
  );
}

