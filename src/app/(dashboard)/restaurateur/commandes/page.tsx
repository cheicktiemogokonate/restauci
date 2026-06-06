// import { redirect } from "next/navigation";
// import { and, desc, eq, gte } from "drizzle-orm";
// import { db } from "@/lib/db";
// import { commandes, restaurants } from "@/lib/db/schema";
// import { getCurrentUser } from "@/lib/auth";
// import CommandesPageClient from "@/components/commandes/CommandesPageClient";
// import type { Commande } from "@/types";

// const getStartOfDay = () => {
//   const now = new Date();
//   now.setHours(0, 0, 0, 0);
//   return now;
// };

// export default async function CommandesPage() {
//   const currentUser = await getCurrentUser();
//   if (!currentUser) redirect("/login");

//   const restaurant = await db.query.restaurants.findFirst({
//     where: eq(restaurants.userId, currentUser.userId),
//   });

//   if (!restaurant) {
//     return (
//       <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
//         Restaurant introuvable.
//       </div>
//     );
//   }

//   const initialCommandes = await db
//     .select()
//     .from(commandes)
//     .where(
//       and(eq(commandes.restaurantId, restaurant.id), gte(commandes.createdAt, getStartOfDay()))
//     )
//     .orderBy(desc(commandes.createdAt));

//   return (
//     <CommandesPageClient
//       initialCommandes={initialCommandes as Commande[]}
//       restaurantId={restaurant.id}
//     />
//   );
// }



"use client";

import Navbar from "@/components/dashboard/Navbar";
import OrderCard, { mockOrders, OrderStatus } from "@/components/dashboard/OrderCard";
import StatusTabs from "@/components/dashboard/StatusTabs";
import { useState, useMemo } from "react";
// import Navbar from "../components/Navbar";
// import StatusTabs from "../components/StatusTabs";
// import OrderCard, { OrderStatus } from "../components/OrderCard";
// import { mockOrders } from "../data/orders";

type Tab = "Toutes" | OrderStatus;

const ITEMS_PER_PAGE_OPTIONS = [6, 12, 24];
const TOTAL_ORDERS = 512;

export default function CommandesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Toutes");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

  const counts = useMemo(() => {
    return {
      Toutes: 128,
      "En préparation": 36,
      Prête: 52,
      Annulée: 8,
    } as Record<Tab, number>;
  }, []);

  const filteredOrders = useMemo(() => {
    if (activeTab === "Toutes") return mockOrders;
    return mockOrders.filter((o) => o.status === activeTab);
  }, [activeTab]);

  const totalPages = Math.ceil(TOTAL_ORDERS / itemsPerPage);

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    pages.push(1, 2, 3, "...", totalPages);
    return pages;
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navbar />

      <main className="max-w-screen-xl mx-auto px-6 py-6">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            <span className="hover:underline cursor-pointer">Accueil</span>
            <span className="mx-1.5 text-gray-300">›</span>
            <span className="text-gray-500">Commandes clients</span>
          </p>
        </div>

        {/* Filters row */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <StatusTabs activeTab={activeTab} counts={counts} onChange={(tab) => { setActiveTab(tab); setCurrentPage(1); }} />

          <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            Filtres
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-8">
          {/* Items per page */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Affichage</span>
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            >
              {ITEMS_PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>sur {TOTAL_ORDERS.toLocaleString()} commandes</span>
          </div>

          {/* Page buttons */}
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
                <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-sm text-gray-400">
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page as number)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                    currentPage === page
                      ? "bg-gray-900 text-white shadow-sm"
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
      </main>
    </div>
  );
}

