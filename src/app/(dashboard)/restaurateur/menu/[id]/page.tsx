"use client";

import CustomerReviews from "@/components/dashboard/CustomerReviews";
import MenuInfoPanel from "@/components/dashboard/MenuInfoPanel";
import OrdersChart from "@/components/dashboard/OrdersChart";
import SimilarDishes from "@/components/dashboard/SimilarDishes";

const tags = ["Boissons", "Dessert", "Personnalisable"];
const values = [
  "Tropical & Rafraîchissant",
  "Crémeux & Gourmand",
  "Riche en nutriments",
  "Naturellement sucré",
  "Énergisant",
  "Polyvalent & Personnalisable",
];
const ingredients = [
  "Mangue",
  "Lait de coco",
  "Banane",
  "Ananas",
  "Flocons de noix de coco",
  "Fraises fraîches, myrtilles",
  "Granola",
];
const nutrition = [
  { label: "Calories", value: "320", unit: "kcal" },
  { label: "Protéines", value: "5", unit: "g" },
  { label: "Lipides", value: "12", unit: "g" },
  { label: "Glucides", value: "50", unit: "g" },
];

export default function MenuDetailPage() {
  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* Left sidebar */}
      {/* <Sidebar /> */}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* <TopNav /> */}

        <div className="flex-1 px-6 py-6 flex flex-col gap-0">
          {/* Page header */}
          <div className="mb-5">
            <div className="flex items-center gap-3">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Détail du menu</h1>
            </div>
            <p className="text-sm text-gray-400 mt-1 ml-11">
              <span className="text-green-700 hover:underline cursor-pointer font-medium">Dashboard</span>
              <span className="mx-1.5 text-gray-300">›</span>
              <span className="text-green-700 hover:underline cursor-pointer font-medium">Menu</span>
              <span className="mx-1.5 text-gray-300">›</span>
              <span className="text-gray-500">Détail du menu</span>
            </p>
          </div>

          {/* Two-column layout */}
          <div className="flex gap-5 items-start">
            {/* ── LEFT / CENTRE COLUMN ── */}
            <div className="flex-1 min-w-0 flex flex-col gap-5">

              {/* Hero image card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="relative h-72 bg-gray-100">
                  <img
                    src="https://images.unsplash.com/photo-1590301157890-4810ed352733?w=900&h=400&fit=crop"
                    alt="Mango Coconut Smoothie Bowl"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=900&h=400&fit=crop"; }}
                  />
                  {/* Badge */}
                  <div className="absolute top-4 left-4">
                    <span className="flex items-center gap-1.5 text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700 px-2.5 py-1 rounded-lg backdrop-blur-sm">
                      ✦ Personnalisable
                    </span>
                  </div>
                  {/* Edit button */}
                  <button className="absolute top-4 right-4 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-sm hover:bg-white transition-colors">
                    <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                </div>

                {/* Title row */}
                <div className="px-6 pt-5 pb-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Mango Coconut Smoothie Bowl</h2>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                              tag === "Personnalisable"
                                ? "bg-green-100 text-green-700"
                                : "text-gray-600 bg-gray-100"
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-2xl font-extrabold text-green-700">9,00 €</span>
                      <button className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                        </svg>
                      </button>
                      <button className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-5 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <span className="text-sm font-bold text-gray-700">4.6/5</span>
                      <span className="text-sm text-gray-400">(85 avis)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                      </svg>
                      <span className="font-semibold text-gray-700">120</span> commandes
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                      </svg>
                      <span className="font-semibold text-gray-700">45</span> favoris
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="font-semibold text-gray-700">320</span> vues
                    </div>
                  </div>
                </div>
              </div>

              {/* Description + Ingrédients row */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-5">
                {/* Description */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 flex flex-col gap-5">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">Description</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Bol de smoothie rafraîchissant et tropical avec une touche de noix de coco, garni de fruits frais. Parfait pour un repas léger ou un dessert gourmand.
                    </p>
                  </div>

                  {/* Valeurs */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Valeurs</h3>
                    <div className="flex flex-wrap gap-2">
                      {values.map((v) => (
                        <span key={v} className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-100 px-2.5 py-1.5 rounded-lg">
                          <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Nutrition */}
                  <div className="grid grid-cols-4 gap-3">
                    {nutrition.map((n) => (
                      <div key={n.label} className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-gray-500 mb-1">{n.label}</p>
                        <p className="text-lg font-bold text-gray-900">{n.value}</p>
                        <p className="text-xs text-gray-400">{n.unit}</p>
                      </div>
                    ))}
                  </div>

                  {/* Modify button */}
                  <button className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold transition-colors shadow-sm">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                    Modifier le plat
                  </button>
                </div>

                {/* Ingrédients */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-800">Ingrédients</h3>
                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                      </svg>
                    </button>
                  </div>
                  <ul className="space-y-2.5">
                    {ingredients.map((ing) => (
                      <li key={ing} className="flex items-center gap-2.5 text-sm text-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                        {ing}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Customer reviews */}
              <CustomerReviews />
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div className="w-80 flex-shrink-0 flex flex-col gap-5">
              <OrdersChart />
              <SimilarDishes />
              <MenuInfoPanel />
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-100 bg-white mt-6">
          <div className="px-6 py-4 flex items-center justify-between text-xs text-gray-400 flex-wrap gap-3">
            <span>Copyright © 2025 RestauCI</span>
            <div className="flex items-center gap-4">
              {["Politique de confidentialité", "Conditions d'utilisation", "Contact"].map((l) => (
                <a key={l} href="#" className="hover:text-gray-600 transition-colors">{l}</a>
              ))}
            </div>
            <div className="flex items-center gap-3">
              {["F", "X", "IG", "YT", "in"].map((s) => (
                <a key={s} href="#" className="hover:text-gray-600 transition-colors font-bold text-xs">{s}</a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}