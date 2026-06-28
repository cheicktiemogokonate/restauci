import { Quote, Star } from "lucide-react";
import { testimonialData } from "../data";
import BackgroundDecoration from "./BackgroundDecoration";
import LogoLoop from "./LogoLoop";

interface TestimonialCardProps {
  testimonial: (typeof testimonialData)[0];
}

function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <div className="w-full bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-xs hover:border-brand-green/30 hover:shadow-lg hover:shadow-gray-100 transition-all duration-300 flex flex-col justify-between mb-4">
      <div>
        {/* Micro elements */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-amber-500 text-amber-500" />
            ))}
          </div>
          <Quote className="h-5 w-5 text-gray-200" />
        </div>

        <h4 className="font-display font-extrabold text-[13px] sm:text-[14px] text-brand-dark leading-snug mb-2">
          &quot;{testimonial.title}&quot;
        </h4>

        <p className="text-xs sm:text-sm text-brand-dark/75 leading-relaxed font-sans mb-6">
          {testimonial.text}
        </p>
      </div>

      {/* Author metadata */}
      <div className="flex items-center gap-3.5 pt-4 border-t border-gray-50 mt-auto">
        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-gray-100 border border-gray-100">
          <img
            src={testimonial.avatar}
            alt={testimonial.name}
            width={100}
            height={100}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div>
          <h5 className="font-display font-bold text-xs text-brand-dark font-sans">
            {testimonial.name}
          </h5>
          <p className="text-[10px] text-gray-400 font-semibold">
            {testimonial.role} •{" "}
            <strong className="text-brand-green font-bold">
              {testimonial.restaurant}
            </strong>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Testimonials() {
  const col1 = testimonialData
    .filter((_, idx) => idx % 3 === 0)
    .map((t) => ({
      node: <TestimonialCard testimonial={t} />,
      title: t.name,
    }));

  const col2 = testimonialData
    .filter((_, idx) => idx % 3 === 1)
    .map((t) => ({
      node: <TestimonialCard testimonial={t} />,
      title: t.name,
    }));

  const col3 = testimonialData
    .filter((_, idx) => idx % 3 === 2)
    .map((t) => ({
      node: <TestimonialCard testimonial={t} />,
      title: t.name,
    }));

  return (
    <section
      id="testimonials"
      className="py-24 bg-[#FAFBFA] relative overflow-hidden"
    >
      {/* Absolute decor grids & premium radial glows */}
      <div
        className="absolute top-[10%] right-[-5%] w-[450px] h-[450px] pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-[5%] left-[-10%] w-125 h-125 pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Food-themed line illustrations */}
      <BackgroundDecoration
        src="/backgrounds/tomato-outline.svg"
        className="absolute top-[15%] left-[-120px] opacity-25"
        size={320}
      />
      <BackgroundDecoration
        src="/backgrounds/herbs-outline.svg"
        className="absolute bottom-[20%] -right-25 opacity-30"
        size={350}
      />
      <BackgroundDecoration
        src="/backgrounds/mushroom-outline.svg"
        className="absolute bottom-[5%] left-[-90px] opacity-20"
        size={280}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Caption Panel */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-brand-green uppercase tracking-widest block mb-3 font-sans">
            TEMOIGNAGES CLIENTS
          </span>
          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-brand-dark tracking-tight leading-[1.1] mb-6 font-sans">
            Ce que disent nos restaurateurs partenaires.
          </h2>
          <p className="text-sm sm:text-base text-brand-dark/70 font-sans leading-relaxed max-w-2xl mx-auto">
            Découvrez les retours authentiques de chefs de cuisine, de gérants
            de fast-food et de propriétaires de boulangerie qui ont digitalisé
            leurs ventes avec RestauCI.
          </p>
        </div>

        {/* Dynamic Infinite Scroll Columns */}
        <div className="relative h-[650px] overflow-hidden w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Column 1 - Upward */}
          <div className="h-full overflow-hidden">
            <LogoLoop
              logos={col1}
              speed={35}
              direction="up"
              gap={16}
              width="100%"
              pauseOnHover={true}
              fadeOut={true}
              fadeOutColor="#FAFBFA"
              ariaLabel="Avis clients colonne 1"
            />
          </div>

          {/* Column 2 - Downward (Hidden on mobile) */}
          <div className="h-full overflow-hidden hidden sm:block">
            <LogoLoop
              logos={col2}
              speed={40}
              direction="down"
              gap={16}
              width="100%"
              pauseOnHover={true}
              fadeOut={true}
              fadeOutColor="#FAFBFA"
              ariaLabel="Avis clients colonne 2"
            />
          </div>

          {/* Column 3 - Upward (Hidden on mobile/tablet) */}
          <div className="h-full overflow-hidden hidden lg:block">
            <LogoLoop
              logos={col3}
              speed={32}
              direction="up"
              gap={16}
              width="100%"
              pauseOnHover={true}
              fadeOut={true}
              fadeOutColor="#FAFBFA"
              ariaLabel="Avis clients colonne 3"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
