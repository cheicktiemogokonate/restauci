import { pricingPlans } from "../data";
import { PricingCard } from "./animated-glassy-pricing";
import ShapeGrid from "./ShapeGrid";

export default function Pricing() {

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      {/* ShapeGrid Interactive Ambient Background */}
      <div className="absolute inset-0 pointer-events-auto -z-20 opacity-55">
        <ShapeGrid
          direction="diagonal"
          speed={0.2}
          borderColor="rgba(11,107,73,0.06)"
          hoverFillColor="rgba(11,107,73,0.1)"
          squareSize={55}
          shape="hexagon"
          hoverTrailAmount={6}
        />
      </div>

      {/* Background radial glowing circles behind pricing section */}
      <div
        className="absolute top-[10%] left-[-10%] w-[550px] h-[550px] pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-[15%] right-[-10%] w-[600px] h-[600px] pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)",
        }}
      />

      {/* SVG Background Decorations */}
      {/* <BackgroundDecoration
        src="/backgrounds/chef-hat-outline.svg"
        className="absolute top-[8%] left-[-90px] opacity-25"
        size={330}
      />
      <BackgroundDecoration
        src="/backgrounds/pizza-outline.svg"
        className="absolute top-[40%] right-[-140px] opacity-20"
        size={380}
      />
      <BackgroundDecoration
        src="/backgrounds/coffee-outline.svg"
        className="absolute top-[55%] left-[-80px] opacity-20"
        size={270}
      />
      <BackgroundDecoration
        src="/backgrounds/vegetables-outline.svg"
        className="absolute bottom-[10%] left-[-110px] opacity-25"
        size={350}
      />
      <BackgroundDecoration
        src="/backgrounds/fork-spoon-outline.svg"
        className="absolute bottom-[2%] right-[-90px] opacity-30"
        size={300}
      /> */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Caption Panel */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-brand-green uppercase tracking-widest block mb-3">
            TARIFS TRANSPARENTS
          </span>
          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-brand-dark tracking-tight leading-[1.1] mb-6">
            Un abonnement adapté à votre restaurant.
          </h2>
          <p className="text-sm sm:text-base text-brand-dark/70 font-sans leading-relaxed max-w-2xl mx-auto">
            Choisissez le plan qui correspond à votre ambition. Pas de frais cachés.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {pricingPlans.map((plan, index) => {
            const currentPrice = plan.priceYearly;
            return (
              <PricingCard
                key={index}
                planName={plan.name}
                description={plan.description}
                price={String(currentPrice)}
                features={plan.features}
                buttonText={plan.ctaText}
                isPopular={plan.popular}
                buttonVariant={plan.popular ? "primary" : "secondary"}
                // billingLabel={"/ table / an"}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
