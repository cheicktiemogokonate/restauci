import React from "react";
import { getRestaurateurSession } from "@/lib/auth/get-restaurateur-session";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { 
  subscriptionPlans,
  subscriptionRequests, 
  restaurants 
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrix } from "@/lib/utils/format";
import { getEffectivePlan } from "@/lib/subscription-plans";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { RestaurateurSubscriptionButton } from "@/components/restaurateur/restaurateur-subscription-button";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Facturation et Abonnement | Adon",
};

export default async function FacturationPage() {
  const { session } = await getRestaurateurSession();
  
  if (!session || session.role !== "restaurateur") {
    redirect("/auth/login");
  }

  const restaurantData = await db.query.restaurants.findFirst({
    where: eq(restaurants.userId, session.userId as string),
    columns: { id: true, actif: true, suspendu: true },
  });

  if (!restaurantData) {
    return (
      <div className="p-6">
        Veuillez d'abord compléter la configuration de votre restaurant.
      </div>
    );
  }

  // 1. Offre actuelle
  const effectivePlan = await getEffectivePlan(restaurantData.id);

  // 2. Demande en attente (s'il y en a une)
  const pendingRequest = await db.query.subscriptionRequests.findFirst({
    where: and(
      eq(subscriptionRequests.restaurantId, restaurantData.id),
      eq(subscriptionRequests.statut, "en_attente")
    ),
    orderBy: desc(subscriptionRequests.createdAt)
  });

  // 3. Catalogue des offres
  const plans = await db.query.subscriptionPlans.findMany({
    where: eq(subscriptionPlans.actif, true),
    orderBy: (p, { asc }) => [asc(p.ordre)],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Facturation & Abonnement</h1>
        <p className="text-muted-foreground">
          Gérez votre formule d'abonnement et visualisez l'historique de vos factures.
        </p>
      </div>

      {pendingRequest && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900">Demande en cours de traitement</h3>
            <p className="text-sm mt-1">
              Vous avez demandé à souscrire à l'offre <span className="font-medium capitalize">{pendingRequest.planCode.replace('_', ' ')}</span>. 
              Votre demande est en attente de validation. Une fois le règlement reçu, votre nouvelle période s'activera.
            </p>
          </div>
        </div>
      )}

      {!restaurantData.actif && !restaurantData.suspendu && (
         <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 flex items-start gap-3">
           <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
           <div>
             <h3 className="font-semibold text-blue-900">En attente d'activation</h3>
             <p className="text-sm mt-1">
               Votre restaurant est en cours de validation par notre équipe.
             </p>
           </div>
         </div>
      )}

      {/* Offre actuelle */}
      <Card>
        <CardHeader>
          <CardTitle>Mon offre actuelle</CardTitle>
          <CardDescription>Les détails de votre abonnement en cours.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold capitalize text-primary">
              {effectivePlan.plan?.nom || "Non défini"}
            </div>
            {effectivePlan.period?.statut === "active" && (
              <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Actif
              </Badge>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Taux de commission appliqué</span>
              <p className="text-lg font-medium">{((effectivePlan.period?.tauxCommissionBpsFige ?? effectivePlan.plan?.tauxCommissionBps ?? 0) / 100).toFixed(1)}%</p>
            </div>
            {effectivePlan.period?.dateEcheance ? (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Prochaine échéance</span>
                <p className="text-lg font-medium">{format(effectivePlan.period.dateEcheance, 'dd MMMM yyyy', { locale: fr })}</p>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Prochaine échéance</span>
                <p className="text-lg font-medium">Sans engagement</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Catalogue */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Changer d'offre</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = effectivePlan.plan?.code === plan.code;
            const isPending = pendingRequest?.planCode === plan.code;

            return (
              <Card key={plan.id} className={`flex flex-col relative ${isCurrent ? 'border-primary ring-1 ring-primary/20' : ''}`}>
                {isCurrent && (
                  <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                    <Badge className="bg-primary text-primary-foreground shadow-sm">
                      Offre Actuelle
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="capitalize text-xl">{plan.nom}</CardTitle>
                  <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="text-3xl font-bold">
                    {formatPrix(plan.prixAnnuelFcfa)}
                    <span className="text-sm font-normal text-muted-foreground"> / an</span>
                  </div>
                  
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Commission de {(plan.tauxCommissionBps / 100).toFixed(1)}%</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>{plan.maxPlats === null ? 'Plats illimités' : `Jusqu'à ${plan.maxPlats} plats`}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>{plan.maxCategories === null ? 'Catégories illimitées' : `Jusqu'à ${plan.maxCategories} catégories`}</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <RestaurateurSubscriptionButton 
                    planCode={plan.code} 
                    isCurrent={isCurrent}
                    isPending={isPending}
                    hasAnyPending={!!pendingRequest}
                    disabled={!restaurantData.actif || restaurantData.suspendu}
                  />
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
