import React, { useState } from "react";
import { motion } from "motion/react";
import { Plus, Trash2, Utensils, ChevronRight, ChevronLeft } from "lucide-react";
import { MenuItem } from "./types";

interface StepMenuProps {
  menu: MenuItem[];
  updateMenu: (newMenu: MenuItem[]) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function StepMenu({ menu, updateMenu, onNext, onPrev }: StepMenuProps) {
  const [newItem, setNewItem] = useState<Partial<MenuItem>>({ name: "", price: 0, category: "", description: "" });

  const handleAddItem = () => {
    if (!newItem.name || !newItem.price || !newItem.category) return;
    const newMenu = [...menu, { ...newItem, id: Math.random().toString(36).substr(2, 9) } as MenuItem];
    updateMenu(newMenu);
    setNewItem({ name: "", price: 0, category: "", description: "" });
  };

  const handleRemoveItem = (id: string) => {
    updateMenu(menu.filter(m => m.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      <div className="flex-1 overflow-y-auto px-10 py-12 pb-32">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-black tracking-tight text-gray-900">
              Votre Carte (Optionnel)
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Ajoutez quelques plats ou produits phares pour démarrer. Vous pourrez toujours enrichir votre carte plus tard depuis votre tableau de bord.
            </p>
          </div>

          <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Nom du plat</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="Ex: Garba Royal"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Catégorie</label>
                <input
                  type="text"
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  placeholder="Ex: Plats principaux"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Description courte</label>
                <input
                  type="text"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Description appétissante..."
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Prix (FCFA)</label>
                <input
                  type="number"
                  value={newItem.price || ""}
                  onChange={(e) => setNewItem({ ...newItem, price: parseInt(e.target.value) || 0 })}
                  placeholder="Ex: 5000"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!newItem.name || !newItem.price || !newItem.category}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl px-4 py-3 text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              </div>
            </div>
          </div>

          {menu.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Utensils className="w-4 h-4 text-brand-600" />
                Plats ajoutés ({menu.length})
              </h3>
              <div className="space-y-2">
                {menu.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-white shadow-xs"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">{item.name}</h4>
                      <p className="text-xs text-gray-500">{item.category} • {item.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-brand-600 text-sm">{item.price} FCFA</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-6 flex justify-between items-center z-10 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
        <button
          type="button"
          onClick={onPrev}
          className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Retour</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="flex items-center space-x-2 bg-brand-900 hover:bg-black text-white font-semibold px-8 py-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-brand-900/20"
        >
          <span>Continuer</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
