import { CatalogueEditor } from "@/components/admin/abonnements/catalogue-editor";
import { AdminPage } from "@/components/admin/ui/admin-page";
import { PageHeader } from "@/components/admin/ui/page-header";
import { getAdminSession } from "@/lib/auth/get-admin-session";
import { db } from "@/lib/db";
import { withDatabaseReadRetry } from "@/lib/db/read-retry";
import { subscriptionPlans } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export default async function AdminSettingsPage() {
  await getAdminSession();
  const plans = await withDatabaseReadRetry(() =>
    db.select().from(subscriptionPlans).orderBy(asc(subscriptionPlans.ordre)),
  );

  return (
    <AdminPage>
      <PageHeader
        title="Paramètres"
        description="Configuration globale des offres et des règles commerciales de la plateforme."
      />

      {/* <section className="grid gap-4 sm:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader className="flex-row items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <CreditCard className="size-5" />
            </div>
            <div>
              <CardTitle>Catalogue d’offres</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Prix, commissions et limites commerciales.
              </p>
            </div>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="flex-row items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <CardTitle>Traçabilité</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Chaque modification est enregistrée dans le journal d’audit.
              </p>
            </div>
          </CardHeader>
          <CardContent />
        </Card>
      </section> */}

      <section className="space-y-4">
        {/* <div>
          <h2 className="text-base font-semibold">Offres d’abonnement</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Les changements s’appliquent aux futurs abonnements et aux
            commissions générées après leur mise à jour.
          </p>
        </div> */}
        <CatalogueEditor plans={plans} />
      </section>
    </AdminPage>
  );
}
