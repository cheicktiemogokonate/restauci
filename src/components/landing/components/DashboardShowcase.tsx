"use client";
import { formatEuro } from "@/lib/utils/format";
import {
  Activity,
  Award,
  BarChart2,
  ClipboardList,
  Plus,
  TrendingUp,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { dishesData } from "../data";

export default function DashboardShowcase() {
  const [activeTab, setActiveTab] = useState<
    "menu" | "analytics" | "staff" | "rules"
  >("menu");
  const [localDishes, setLocalDishes] = useState(dishesData);
  const [hoveredDishId, setHoveredDishId] = useState<string | null>(null);

  // Toggle dish availability
  const toggleAvailable = (dishId: string) => {
    setLocalDishes((prev) =>
      prev.map((dish) => {
        if (dish.id === dishId) {
          return { ...dish, salesCount: dish.salesCount + 1 }; // simulate raising demand on click
        }
        return dish;
      }),
    );
  };

  const handlePriceUpdate = (dishId: string, amount: number) => {
    setLocalDishes((prev) =>
      prev.map((dish) => {
        if (dish.id === dishId) {
          return { ...dish, price: Math.max(5, dish.price + amount) };
        }
        return dish;
      }),
    );
  };

  // Staff members mock
  const staffMembers = [
    {
      name: "Chef Marc Dubois",
      role: "Chef de Cuisine",
      status: "En cuisine",
      avatar:
        "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=100&h=100&fit=crop&q=80",
      efficiency: "98%",
    },
    {
      name: "Sophie Laurent",
      role: "Responsable de Salle",
      status: "En service",
      avatar:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&q=80",
      efficiency: "94%",
    },
    {
      name: "Jérôme Chevalier",
      role: "Sous-Chef de Partie",
      status: "En cuisine",
      avatar:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&q=80",
      efficiency: "96%",
    },
    {
      name: "Léna Bernard",
      role: "Serveuse Senior",
      status: "Pause",
      avatar:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&q=80",
      efficiency: "91%",
    },
  ];

  return (
    <section
      id="showcase"
      className="py-24 bg-brand-bg relative overflow-hidden"
    >
      {/* Absolute blurry overlay shadows */}
      <div className="absolute top-[30%] left-[-10%] w-100 h-100 bg-brand-green/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Caption Header */}
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-xs font-bold text-brand-green uppercase tracking-widest block mb-3">
            DÉMONSTRATION INTERACTIVE
          </span>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-brand-dark tracking-tight leading-[1.1] mb-6">
            Prenez le contrôle de vos modules essentiels.
          </h2>
          <p className="text-sm sm:text-base text-brand-dark/70 font-sans leading-relaxed max-w-2xl mx-auto">
            Explorez notre interface d&apos;administration en sélectionnant les
            différents modules. Modifiez les prix ou simulez des ventes pour
            tester la réactivité.
          </p>
        </motion.div>

        {/* Dashboard Frame Header Links */}
        <motion.div
          className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xl overflow-hidden max-w-5xl mx-auto"
          initial={{ opacity: 0, scale: 0.98, y: 40 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ type: "spring", damping: 24, stiffness: 85 }}
        >
          {/* Internal Dashboard Tabs */}
          <div className="bg-gray-50/70 border-b border-[#EAEAEA] px-6 py-4 flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => setActiveTab("menu")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                  activeTab === "menu"
                    ? "bg-white text-brand-green shadow-xs border border-[#EAEAEA]"
                    : "text-gray-400 hover:text-brand-dark"
                }`}
              >
                <UtensilsCrossed className="h-4 w-4" />
                Gestion de la Carte (Menu)
              </button>

              <button
                onClick={() => setActiveTab("analytics")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                  activeTab === "analytics"
                    ? "bg-white text-brand-green shadow-xs border border-[#EAEAEA]"
                    : "text-gray-400 hover:text-brand-dark"
                }`}
              >
                <BarChart2 className="h-4 w-4" />
                Ventes & Rentabilités
              </button>

              <button
                onClick={() => setActiveTab("staff")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                  activeTab === "staff"
                    ? "bg-white text-brand-green shadow-xs border border-[#EAEAEA]"
                    : "text-gray-400 hover:text-brand-dark"
                }`}
              >
                <Users className="h-4 w-4" />
                Equipes & Staff (Service)
              </button>

              <button
                onClick={() => setActiveTab("rules")}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                  activeTab === "rules"
                    ? "bg-white text-brand-green shadow-xs border border-[#EAEAEA]"
                    : "text-gray-400 hover:text-brand-dark"
                }`}
              >
                <ClipboardList className="h-4 w-4" />
                Contrôle des Recettes
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-450 font-mono font-bold">
              <span className="h-2 w-2 rounded-full bg-brand-green" />
              <span>LIVE INTEGRATOR</span>
            </div>
          </div>

          {/* Interactive Screen Container */}
          <div className="p-6 bg-white min-h-110">
            <AnimatePresence mode="wait">
              {/* TAB 1: MENU MANAGEMENT */}
              {activeTab === "menu" && (
                <motion.div
                  key="menu"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-gray-50">
                    <div>
                      <h3 className="font-display font-bold text-lg text-brand-dark">
                        Gestion de la Carte des Mets
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Cliquez sur les touches{" "}
                        <span className="font-bold text-brand-green">+</span> ou{" "}
                        <span className="font-bold text-red-500">-</span> pour
                        ajuster les prix affichés sur les tablettes en salle.
                      </p>
                    </div>
                    <button className="bg-brand-green hover:bg-[#0c734e] text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-2 transition-all">
                      <Plus className="h-4 w-4" /> Ajouter un Plat
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {localDishes.slice(0, 6).map((dish) => (
                      <div
                        key={dish.id}
                        className="border border-[#EAEAEA] p-3 rounded-2xl flex gap-3.5 hover:shadow-lg hover:shadow-gray-100 transition-all select-none group"
                        onMouseEnter={() => setHoveredDishId(dish.id)}
                        onMouseLeave={() => setHoveredDishId(null)}
                      >
                        {/* Realistic food photo wrapper */}
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-50">
                          <img
                            src={dish.image}
                            alt={dish.name}
                            width={400}
                            height={400}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute top-1 left-1 bg-white/90 backdrop-blur-xs px-1 rounded text-[9px] font-mono font-bold text-brand-dark">
                            ⭐ {dish.rating}
                          </div>
                        </div>

                        {/* Text and interaction controls */}
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between">
                              <span className="text-[10px] text-brand-green font-bold tracking-wider block">
                                {dish.category}
                              </span>
                              <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold font-mono">
                                Vol. {dish.salesCount}
                              </span>
                            </div>
                            <h4 className="font-display font-bold text-xs text-brand-dark line-clamp-1 mt-0.5">
                              {dish.name}
                            </h4>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-gray-50 mt-1">
                            {/* Adjusted Interactive Price display */}
                            <div>
                              <span className="text-xs font-mono font-extrabold text-brand-green">
                                {formatEuro(dish.price)}
                              </span>
                            </div>

                            {/* Set adjustment triggers */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handlePriceUpdate(dish.id, -0.5)}
                                className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 text-brand-dark flex items-center justify-center text-xs font-bold font-mono cursor-pointer"
                              >
                                -
                              </button>
                              <button
                                onClick={() => handlePriceUpdate(dish.id, 0.5)}
                                className="w-5 h-5 rounded bg-brand-green/10 hover:bg-brand-green hover:text-white text-brand-green flex items-center justify-center text-xs font-bold font-mono cursor-pointer"
                              >
                                +
                              </button>
                              <button
                                onClick={() => toggleAvailable(dish.id)}
                                className="text-[10px] ms-1 text-gray-400 hover:text-brand-green font-semibold"
                                title="Prunir une vente test"
                              >
                                Tester
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* TAB 2: SALES ANALYTICS */}
              {activeTab === "analytics" && (
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="pb-4 border-b border-gray-50">
                    <h3 className="font-display font-bold text-lg text-brand-dark flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-[#22C55E]" />
                      Statistiques de Vente & Popularité des Plats
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Distribution statistique volumique d&apos;après les
                      commandes encaissées en temps réel.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Charts */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-brand-dark uppercase tracking-wider">
                        Top Plats vendus
                      </h4>

                      <div className="space-y-3">
                        {localDishes.slice(0, 4).map((dish) => {
                          const maxSalesCount = Math.max(
                            ...localDishes.map((d) => d.salesCount),
                          );
                          const percentage = Math.round(
                            (dish.salesCount / maxSalesCount) * 100,
                          );
                          return (
                            <div key={dish.id} className="space-y-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-brand-dark">
                                  {dish.name}
                                </span>
                                <span className="font-mono font-bold text-brand-green">
                                  {dish.salesCount} ventes
                                </span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{ duration: 0.6 }}
                                  className="bg-brand-green h-full rounded-full"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Financial stats summaries */}
                    <div className="bg-gray-50 p-6 rounded-2xl border border-[#EAEAEA] flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-[#EAEAEA]">
                          <span className="text-xs font-bold text-gray-400">
                            CHIFFRE GLOBAL ESTIMÉ
                          </span>
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-1.5 py-0.5 rounded">
                            Recommandé
                          </span>
                        </div>

                        <div className="space-y-2">
                          <span className="text-[11px] text-gray-400 font-bold">
                            PROFIT REEEL EN SEMAINE
                          </span>
                          <h4 className="font-mono font-black text-3xl text-brand-dark">
                            {formatEuro(18425.5)}
                          </h4>
                          <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                            <Activity className="h-3.5 w-3.5" /> + 8.4% de marge
                            nette sur les desserts
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[#EAEAEA] flex justify-between items-center text-xs text-brand-dark/65 mt-4">
                        <div className="flex items-center gap-1">
                          <Award className="h-4 w-4 text-amber-500" />
                          <span>
                            Meilleur Plat : <strong>Fondant au Chocolat</strong>
                          </span>
                        </div>
                        <span className="font-mono text-gray-400">
                          {localDishes[5]?.salesCount || 184} tirs
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: STAFF MANAGEMENT */}
              {activeTab === "staff" && (
                <motion.div
                  key="staff"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="pb-4 border-b border-gray-50 flex justify-between items-center">
                    <div>
                      <h3 className="font-display font-bold text-lg text-brand-dark">
                        Contrôle de Présence des Équipes
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5 font-sans">
                        Suivi actif des plannings et du rendement du personnel
                        de votre restaurant.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {staffMembers.map((member, index) => (
                      <div
                        key={index}
                        className="border border-[#EAEAEA] p-4 rounded-2xl flex flex-col items-center text-center bg-white hover:border-brand-green/30 transition-all shadow-xs"
                      >
                        <div className="w-14 h-14 rounded-full overflow-hidden mb-3 border border-gray-100">
                          <img
                            src={member.avatar}
                            alt={member.name}
                            width={100}
                            height={100}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <h4 className="font-display font-bold text-xs text-brand-dark">
                          {member.name}
                        </h4>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                          {member.role}
                        </p>

                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold mt-3 ${
                            member.status === "Pause"
                              ? "bg-amber-50 text-amber-600 border border-amber-100"
                              : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          }`}
                        >
                          {member.status}
                        </span>

                        <div className="mt-4 pt-3 border-t border-gray-50 w-full flex justify-between items-center text-[10px] text-gray-450 font-mono">
                          <span>Efficacité service</span>
                          <span className="font-bold text-brand-green">
                            {member.efficiency}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* TAB 4: RULES / RECIPES MODULE */}
              {activeTab === "rules" && (
                <motion.div
                  key="rules"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="pb-4 border-b border-gray-50">
                    <h3 className="font-display font-bold text-lg text-brand-dark">
                      Fiches Recettes & Contrôle des Marges
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Associez chaque plat à son coût d&apos;ingrédients exact
                      (food cost) pour des calculs budgétaires fiables.
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl border border-[#EAEAEA] grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2 p-4 bg-white rounded-xl border border-gray-100">
                      <span className="text-[10px] font-bold font-mono text-brand-green block">
                        PRESTATION COMMERCIALE
                      </span>
                      <h4 className="text-sm font-bold text-brand-dark">
                        Calculateur Marge Majeure
                      </h4>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        RestauCI détecte si le prix de vente est trop bas par
                        rapport aux prix fluctuants des fournisseurs
                        d&apos;ingrédients.
                      </p>
                    </div>

                    <div className="space-y-2 p-4 bg-white rounded-xl border border-gray-100">
                      <span className="text-[10px] font-bold font-mono text-brand-green block">
                        GASTRONOMIE STANDARD
                      </span>
                      <h4 className="text-sm font-bold text-brand-dark">
                        Recettes Synchronisées
                      </h4>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        Chaque fois qu&apos;un plat est vendu, les portions
                        correspondantes de vos bouteilles et sacs de vrac
                        s&apos;évaporent de l&apos;inventaire.
                      </p>
                    </div>

                    <div className="space-y-2 p-4 bg-white rounded-xl border border-gray-100">
                      <span className="text-[10px] font-bold font-mono text-brand-green block">
                        FOURNISSEURS INTÉGRÉS
                      </span>
                      <h4 className="text-sm font-bold text-brand-dark">
                        Rapports d&apos;Achats Directs
                      </h4>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed font-sans">
                        Passez commande auprès de Metro, Transgourmet ou vos
                        distributeurs locaux en un clic grâce à nos bons de
                        commandes auto-générés.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
