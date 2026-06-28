import { formatPrix } from "@/lib/utils/format";
import { Coffee, Info, Leaf, Search, Utensils, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Dish } from "../types";

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  dishes: Dish[];
}

export default function MenuModal({ isOpen, onClose, dishes }: MenuModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "plats" | "boissons" | "desserts"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDishes = dishes.filter((dish) => {
    const matchesCategory =
      selectedCategory === "all" || dish.category === selectedCategory;
    const matchesSearch =
      dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dish.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-4xl h-[85vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="bg-[#0b663b] px-6 py-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold tracking-tight">
                  Notre Carte Complète
                </h3>
                <p className="text-sm text-emerald-100/80 font-light mt-0.5">
                  Une immersion de saveurs authentiques ivoiriennes
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full bg-black/10 p-2 text-white/90 hover:bg-black/20 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Menu Filters / Search Subheader */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Category Toggles */}
              <div className="flex bg-gray-200/50 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
                {[
                  { id: "all", label: "Tout", icon: Utensils },
                  { id: "plats", label: "Plats Typiques", icon: Utensils },
                  {
                    id: "boissons",
                    label: "Boissons & Cocktails",
                    icon: Coffee,
                  },
                  { id: "desserts", label: "Desserts", icon: Leaf },
                ].map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() =>
                        setSelectedCategory(
                          cat.id as "all" | "plats" | "boissons" | "desserts",
                        )
                      }
                      className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
                        selectedCategory === cat.id
                          ? "bg-[#0b663b] text-white shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un plat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0b663b]/15 focus:border-[#0b663b] transition"
                />
              </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 bg-gray-50/20">
              {filteredDishes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredDishes.map((dish) => (
                    <div
                      key={dish.id}
                      className="bg-white p-4 rounded-2xl border border-gray-100/80 shadow-sm flex gap-4 hover:shadow-md transition hover:border-[#0b663b]/10 group"
                    >
                      {/* Image */}
                      <div className="h-24 w-24 rounded-xl overflow-hidden bg-gray-100 shrink-0 relative">
                        <img
                          src={dish.image}
                          alt={dish.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                          referrerPolicy="no-referrer"
                        />
                        {dish.isPopular && (
                          <span className="absolute top-1.5 left-1.5 bg-[#e2b34a] text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                            Populaire
                          </span>
                        )}
                      </div>

                      {/* Info text */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-gray-950 text-sm group-hover:text-[#0b663b] transition leading-tight">
                              {dish.name}
                            </h4>
                            <span className="font-bold text-[#0b663b] text-sm whitespace-nowrap">
                              {formatPrix(dish.price)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 font-light mt-1.5 line-clamp-2">
                            {dish.description}
                          </p>
                        </div>
                        {/* Tags or details */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                            {dish.category === "plats"
                              ? "Spécialité"
                              : dish.category === "boissons"
                                ? "Rafraîchissant"
                                : "Gourmand"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
                  <Utensils className="h-12 w-12 stroke-1 text-gray-300 mb-2" />
                  <p className="text-sm font-medium">
                    Aucun plat ne correspond à vos critères.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                    }}
                    className="text-xs font-semibold text-[#0b663b] hover:underline mt-2"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              )}
            </div>

            {/* Bottom notification */}
            <div className="bg-white border-t border-gray-100 p-4 text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
              <Info className="h-4 w-4 text-[#0b663b]" />
              <span>
                Nos plats sont préparés à la commande à partir de produits frais
                et locaux.
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
