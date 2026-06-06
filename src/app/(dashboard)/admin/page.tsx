import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {  ListChecks } from "lucide-react";

export default async function AdminDashboardPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Espace admin</p>
        <h1 className="text-3xl font-semibold text-slate-900">Dashboard Admin</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Gérez les restaurants, consultez les données de la plateforme et accédez aux outils de supervision.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-1 xl:grid-cols-2">
        <Card className="border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3 text-brand-500">
              <ListChecks className="h-5 w-5" />
              <CardTitle>Restaurants</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Voir et gérer tous les restaurants inscrits sur la plateforme.
            </CardDescription>
            <Link href="/admin/restaurants">
              <Button variant="secondary" className="mt-4">
                Voir les restaurants
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
