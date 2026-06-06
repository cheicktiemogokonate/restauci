// import { notFound, redirect } from "next/navigation";
// import { and, eq } from "drizzle-orm";
// import { db } from "@/lib/db";
// import { commandes, restaurants } from "@/lib/db/schema";
// import { getCurrentUser } from "@/lib/auth";
// import CommandeDetailsPageClient from "@/components/commandes/CommandeDetailsPageClient";
// import { commandeToDetailsView } from "@/components/commandes/map-commande-to-details";
// import type { Commande } from "@/types";

// export default async function CommandeDetailsPage({
//   params,
// }: {
//   params: Promise<{ id: string }>;
// }) {
//   const currentUser = await getCurrentUser();
//   if (!currentUser) redirect("/login");

//   const { id } = await params;

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

//   const commande = await db.query.commandes.findFirst({
//     where: and(eq(commandes.id, id), eq(commandes.restaurantId, restaurant.id)),
//   });

//   if (!commande) {
//     notFound();
//   }

//   const order = commandeToDetailsView(commande as Commande, restaurant);

//   return <CommandeDetailsPageClient order={order} />;
// }


"use client";

import ClientCard from "@/components/dashboard/ClientCard";
import DelivererCard from "@/components/dashboard/DelivererCard";
import DeliveryMap from "@/components/dashboard/DeliveryMap";
import Navbar from "@/components/dashboard/Navbar";
import OrderItemsTable from "@/components/dashboard/OrderItemsTable";
import OrderTracking from "@/components/dashboard/OrderTracking";

// import Navbar from "../components/Navbar";
// import OrderItemsTable from "../components/OrderItemsTable";
// import ClientCard from "../components/ClientCard";
// import OrderTracking from "../components/OrderTracking";
// import DeliveryMap from "../components/DeliveryMap";
// import DelivererCard from "../components/DelivererCard";

export default function OrderDetailPage() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-6 py-6">
        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors" onClick={() => history.back()}>
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Détails de la commande</h1>
          </div>
          <p className="text-sm text-gray-400 mt-1 ml-11">
            <span className="text-green-700 hover:underline cursor-pointer font-medium">Commandes</span>
            <span className="mx-1.5 text-gray-300">›</span>
            <span className="text-gray-500">Commande #ORD1028</span>
          </p>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">
          {/* Left column */}
          <div className="flex flex-col gap-5">
            {/* Order header card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900">Commande #ORD1028</h2>
                    <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      En cours
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                    Passée le 20 Oct. 2025 à 14:47
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                      En ligne
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                    </svg>
                    Imprimer
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    Plus d'actions
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Items table */}
            <OrderItemsTable />

            {/* Bottom row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <ClientCard />
              <OrderTracking />
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-5">
            <DeliveryMap />
            <DelivererCard />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white mt-6">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between text-xs text-gray-400">
          <span>Copyright © 2025 RestauCI</span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-gray-600 transition-colors">Politique de confidentialité</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Conditions d'utilisation</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            {["facebook", "twitter", "instagram", "youtube", "linkedin"].map((s) => (
              <a key={s} href="#" className="hover:text-gray-600 transition-colors capitalize text-xs font-medium">{s[0].toUpperCase()}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
