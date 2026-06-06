// import { redirect } from "next/navigation"
// import { asc, eq } from "drizzle-orm"
// import { db } from "@/lib/db"
// import { categories, creneauxHoraires, plats, restaurants } from "@/lib/db/schema"
// import { getCurrentUser } from "@/lib/auth"
// import MenuManager from "@/components/dashboard/MenuManager"
// import type { Categorie, CreneauHoraire, Plat } from "@/types"

// export default async function RestaurateurMenuPage() {
//   const currentUser = await getCurrentUser()
//   if (!currentUser) {
//     redirect("/login")
//   }

//   const [restaurant] = await db
//     .select()
//     .from(restaurants)
//     .where(eq(restaurants.userId, currentUser.userId))
//     .limit(1)

//   if (!restaurant) {
//     return <div>Restaurant introuvable.</div>
//   }

//   const [categoriesList, creneauxList, platsList] = await Promise.all([
//     db.select().from(categories).where(eq(categories.restaurantId, restaurant.id)).orderBy(asc(categories.nom)),
//     db.select().from(creneauxHoraires).where(eq(creneauxHoraires.restaurantId, restaurant.id)).orderBy(asc(creneauxHoraires.nom)),
//     db.select().from(plats).where(eq(plats.restaurantId, restaurant.id)).orderBy(asc(plats.nom)),
//   ])

//   return (
//     <MenuManager
//       categories={categoriesList as Categorie[]}
//       creneaux={creneauxList as CreneauHoraire[]}
//       initialPlats={platsList as Plat[]}
//     />
//   )
// }


"use client";

import MenuCard, { mockMenuItems } from "@/components/dashboard/MenuCard";
import Navbar from "@/components/dashboard/Navbar";
import { useState } from "react";
import Link from "next/link";
// import Navbar from "../../components/Navbar";
// import FilterSidebar from "../../components/FilterSidebar";
// import MenuCard from "../../components/MenuCard";
// import { mockMenuItems } from "../../data/menu";

const TOTAL = 56;
const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48];

export default function MenuPage() {
  const [search, setSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(TOTAL / itemsPerPage);

  const filtered = mockMenuItems.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  const getPageNumbers = (): (number | "...")[] => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    return [1, 2, 3, "...", totalPages];
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-6">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            <span className="text-green-700 hover:underline cursor-pointer font-medium">Dashboard</span>
            <span className="mx-1.5 text-gray-300">›</span>
            <span className="text-gray-500">Menu</span>
          </p>
        </div>

        <div className="flex items-start gap-5">
          {/* Sidebar */}
          <div className="w-64 hidden lg:block">
            {/* Minimal placeholder for now */}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col gap-5">
            {/* Search + Add */}
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  placeholder="Rechercher un plat ou ingrédient..."
                  className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-gray-400 text-gray-700"
                />
              </div>
              <button className="px-5 py-2.5 rounded-xl bg-green-700 text-white text-sm font-semibold hover:bg-green-800 transition-colors shadow-sm">
                Rechercher
              </button>
              <button className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors shadow-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Ajouter un plat
              </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((item) => (
                <Link href={`/restaurateur/menu/${item.id}`} key={item.id}>
                  <MenuCard key={item.id} item={item} />
                </Link>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Affichage</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 bg-white focus:outline-none"
                >
                  {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span>sur {TOTAL} plats</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>

                {getPageNumbers().map((page, i) =>
                  page === "..." ? (
                    <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-sm text-gray-400">...</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page as number)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                        currentPage === page
                          ? "bg-gray-900 text-white"
                          : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white mt-6">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-gray-400 flex-wrap gap-3">
          <span>Copyright © 2025 RestauCI</span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-gray-600 transition-colors">Politique de confidentialité</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Conditions d'utilisation</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            {["F", "X", "IG", "YT", "in"].map((s) => (
              <a key={s} href="#" className="hover:text-gray-600 transition-colors text-xs font-bold">{s}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}