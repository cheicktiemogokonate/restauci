import { ShoppingBag, Layers, Calendar, BarChart3, ChevronRight, Check } from "lucide-react";
import { featureGridData } from "../data";
import ScrollStack, { ScrollStackItem } from "./ScrollStack";

export default function FeatureGrid() {
  
  // Dynamic icon resolution helper
  const renderIcon = (iconName: string) => {
    const props = { className: "h-6 w-6 text-brand-green" };
    switch (iconName) {
      case "ShoppingBag":
        return <ShoppingBag {...props} />;
      case "Layers":
        return <Layers {...props} />;
      case "Calendar":
        return <Calendar {...props} />;
      case "BarChart3":
        return <BarChart3 {...props} />;
      default:
        return <ShoppingBag {...props} />;
    }
  };

  // Custom live visual demo content for each module
  const renderFeatureVisual = (featureId: string) => {
    switch (featureId) {
      case "f1":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
              <span className="text-xs font-bold text-brand-dark/40 tracking-wider">FILE DE CUISINE</span>
              <span className="text-xs bg-brand-green/10 text-brand-green px-2 py-0.5 rounded-full font-medium">3 Actives</span>
            </div>
            
            <div className="bg-[#FAFDF9] border border-brand-green/20 rounded-xl p-3 flex justify-between items-center shadow-xs">
              <div>
                <p className="text-xs font-bold text-brand-dark">Table 4 — Burger Maison</p>
                <p className="text-[10px] text-brand-dark/50 font-mono">1x Double Cheese, 1x Frites</p>
              </div>
              <span className="text-[10px] font-bold text-brand-green bg-brand-green/10 px-2 py-1 rounded">Prêt</span>
            </div>

            <div className="bg-white border border-gray-100 rounded-xl p-3 flex justify-between items-center shadow-xs">
              <div>
                <p className="text-xs font-bold text-brand-dark">Table 2 — Salade César</p>
                <p className="text-[10px] text-brand-dark/50 font-mono">2x Salade César, 1x Eau</p>
              </div>
              <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded">En cours</span>
            </div>

            <div className="bg-white/50 border border-gray-100/50 rounded-xl p-3 flex justify-between items-center opacity-70">
              <div>
                <p className="text-xs font-bold text-brand-dark/60">Livraison #4801</p>
                <p className="text-[10px] text-brand-dark/40 font-mono">1x Pizza Pepperoni, 1x Tiramisu</p>
              </div>
              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">En attente</span>
            </div>
          </div>
        );
      case "f2":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-brand-dark/40 tracking-wider">ALERTES STOCK</span>
              <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">1 Critique</span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-brand-dark">Steaks de Bœuf</span>
                  <span className="text-brand-dark/60 font-mono">92/100 kg</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-brand-green h-full rounded-full" style={{ width: "92%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-brand-dark">Pains Briochés</span>
                  <span className="text-red-500 font-bold font-mono">5/40 pcs (Critique)</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-red-500 h-full rounded-full animate-pulse" style={{ width: "12.5%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-brand-dark">Avocats Bio</span>
                  <span className="text-amber-500 font-semibold font-mono">18/40 pcs</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: "45%" }} />
                </div>
              </div>
            </div>
          </div>
        );
      case "f3":
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
              <span className="text-xs font-bold text-brand-dark/40 tracking-wider">PLAN DE SALLE</span>
              <span className="text-[10px] text-brand-dark/60 font-mono">Service de Midi</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="border border-brand-green/20 bg-brand-green/5 rounded-lg p-2.5 text-center shadow-xs">
                <span className="block text-[10px] font-bold text-brand-dark/40">T.1 (2p)</span>
                <span className="text-xs font-black text-brand-green block mt-1">Libre</span>
              </div>
              <div className="border border-red-100 bg-red-50/30 rounded-lg p-2.5 text-center shadow-xs">
                <span className="block text-[10px] font-bold text-brand-dark/40">T.2 (4p)</span>
                <span className="text-xs font-black text-red-500 block mt-1">Occupé</span>
              </div>
              <div className="border border-blue-100 bg-blue-50/20 rounded-lg p-2.5 text-center shadow-xs">
                <span className="block text-[10px] font-bold text-brand-dark/40">T.3 (6p)</span>
                <span className="text-xs font-black text-blue-500 block mt-1">19:30</span>
              </div>
              <div className="border border-red-100 bg-red-50/30 rounded-lg p-2.5 text-center shadow-xs">
                <span className="block text-[10px] font-bold text-brand-dark/40">T.4 (2p)</span>
                <span className="text-xs font-black text-red-500 block mt-1">Occupé</span>
              </div>
              <div className="border border-brand-green/20 bg-brand-green/5 rounded-lg p-2.5 text-center shadow-xs">
                <span className="block text-[10px] font-bold text-brand-dark/40">T.5 (4p)</span>
                <span className="text-xs font-black text-brand-green block mt-1">Libre</span>
              </div>
              <div className="border border-brand-green/20 bg-brand-green/5 rounded-lg p-2.5 text-center shadow-xs">
                <span className="block text-[10px] font-bold text-brand-dark/40">T.6 (2p)</span>
                <span className="text-xs font-black text-brand-green block mt-1">Libre</span>
              </div>
            </div>
          </div>
        );
      case "f4":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-xs font-bold text-brand-dark/40 tracking-wider">CHIFFRES DU JOUR</span>
              <span className="text-xs font-bold text-brand-dark font-mono bg-gray-100 px-1.5 py-0.5 rounded">Aujourd'hui</span>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-brand-dark/60 font-medium">Chiffre d'Affaires</span>
                <span className="font-bold text-brand-dark font-sans text-sm">1 425,50 €</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-brand-dark/60 font-medium font-sans">Panier Moyen</span>
                <span className="font-semibold text-brand-dark font-mono">24,58 €</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-dashed border-gray-100 pt-2.5">
                <span className="text-brand-dark/60 font-semibold text-[10px] uppercase">Top Ventes</span>
                <span className="text-brand-green font-bold text-xs bg-brand-green/10 px-2 py-0.5 rounded-full">Burger Bacon</span>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <section id="features" className="py-24 bg-white border-y border-[#EAEAEA] relative overflow-hidden">
      {/* Absolute subtle grids backgrounds */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Caption panel tag */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-brand-green uppercase tracking-widest block mb-3">
            FONCTIONNALITÉS ÉLITES
          </span>
          <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-brand-dark tracking-tight leading-[1.1] mb-6">
            Tout ce dont votre établissement a besoin pour réussir.
          </h2>
          <p className="text-sm sm:text-base text-brand-dark/70 font-sans leading-relaxed max-w-2xl mx-auto">
            Gagnez un temps précieux, simplifiez les opérations de vos équipes et maximisez l'efficacité opérationnelle de votre cuisine.
          </p>
        </div>

        {/* Feature Grid layout wrapped in beautiful ScrollStack */}
        <div className="w-full relative">
          <ScrollStack
            useWindowScroll={true}
            itemDistance={60}
            itemScale={0.03}
            itemStackDistance={35}
            baseScale={0.92}
            rotationAmount={1.5}
            blurAmount={1.5}
          >
            {featureGridData.map((feature, idx) => (
              <ScrollStackItem key={feature.id} itemClassName="!p-0 !h-auto !bg-transparent !shadow-none">
                <div 
                  className="bg-[#fafbfa] border border-[#EAEAEA] shadow-xl rounded-3xl p-8 sm:p-12 mb-8 flex flex-col md:flex-row gap-8 items-center max-w-4xl mx-auto hover:border-brand-green/10 transition-colors duration-300 relative overflow-hidden group"
                  style={{
                    // Gradient shading for the stack overlap effect
                    background: "linear-gradient(135deg, #ffffff 0%, #FAFBFA 100%)"
                  }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-brand-green/3 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none" />
                  
                  {/* Left Column - Copy & Badge details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-brand-green/8 flex items-center justify-center border border-brand-green/5">
                          {renderIcon(feature.iconName)}
                        </div>
                        <span className="text-xs font-mono font-bold text-brand-green tracking-wider bg-brand-green/5 px-2.5 py-1 rounded-md">
                          MODULE 0{idx + 1}
                        </span>
                      </div>
                      
                      <h3 className="font-display font-black text-2xl sm:text-3xl text-brand-dark mb-4 tracking-tight group-hover:text-brand-green transition-colors duration-300">
                        {feature.title}
                      </h3>
                      
                      <p className="text-sm sm:text-base text-brand-dark/70 font-sans leading-relaxed mb-6">
                        {feature.description}
                      </p>

                      {/* Custom premium details listed per card */}
                      <ul className="space-y-2.5 mb-8">
                        {idx === 0 && (
                          <>
                            <li className="flex items-center gap-2 text-xs font-medium text-brand-dark/75"><Check className="h-4 w-4 text-brand-green" /> Écrans tactiles synchronisés</li>
                            <li className="flex items-center gap-2 text-xs font-medium text-brand-dark/75"><Check className="h-4 w-4 text-brand-green" /> Option emporter / livraison instantanée</li>
                            <li className="flex items-center gap-2 text-xs font-medium text-brand-dark/75"><Check className="h-4 w-4 text-brand-green" /> Billetterie cuisine dynamique</li>
                          </>
                        )}
                        {idx === 1 && (
                          <>
                            <li className="flex items-center gap-2 text-xs font-medium text-brand-dark/75"><Check className="h-4 w-4 text-brand-green" /> Décompte d'ingrédients à la portion</li>
                            <li className="flex items-center gap-2 text-xs font-medium text-brand-dark/75"><Check className="h-4 w-4 text-brand-green" /> Alertes de rupture instantanées</li>
                            <li className="flex items-center gap-2 text-xs font-medium text-brand-dark/75"><Check className="h-4 w-4 text-brand-green" /> Commande fournisseurs assistée par IA</li>
                          </>
                        )}
                        {idx === 2 && (
                          <>
                            <li className="flex items-center gap-2 text-xs font-medium text-brand-dark/75"><Check className="h-4 w-4 text-brand-green" /> Formulaire de réservation en ligne intégré</li>
                            <li className="flex items-center gap-2 text-xs font-medium text-brand-dark/75"><Check className="h-4 w-4 text-brand-green" /> Plan de salle coloré et vivant</li>
                            <li className="flex items-center gap-2 text-xs font-medium text-brand-dark/75"><Check className="h-4 w-4 text-brand-green" /> Rappels par SMS automatiques</li>
                          </>
                        )}
                        {idx === 3 && (
                          <>
                            <li className="flex items-center gap-2 text-xs font-medium text-brand-dark/75"><Check className="h-4 w-4 text-brand-green" /> Graphiques de performances directs</li>
                            <li className="flex items-center gap-2 text-xs font-medium text-brand-dark/75"><Check className="h-4 w-4 text-brand-green" /> Identification des plats à haute marge</li>
                            <li className="flex items-center gap-2 text-xs font-medium text-brand-dark/75"><Check className="h-4 w-4 text-brand-green" /> Suivi d'affluence prédictif</li>
                          </>
                        )}
                      </ul>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-brand-green font-bold group/link cursor-pointer">
                      <span>Explorer le module</span>
                      <ChevronRight className="h-4 w-4 group-hover/link:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Right Column - Beautiful live interactive visual representation */}
                  <div className="flex-1 w-full max-w-sm bg-white border border-[#EAEAEA] rounded-2xl p-6 shadow-xl shadow-brand-dark/1 pointer-events-none group-hover:scale-[1.02] transition-transform duration-500">
                    {renderFeatureVisual(feature.id)}
                  </div>
                </div>
              </ScrollStackItem>
            ))}
          </ScrollStack>
        </div>

      </div>
    </section>
  );
}

