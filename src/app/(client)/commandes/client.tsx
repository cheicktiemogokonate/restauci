"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/lib/client-app/hooks/use-debounce";
import { clientApi, type ApiResult } from "@/lib/client-app/api-client";
import { useAuthStore } from "@/lib/client-app/stores/auth-store";
import { formatDate, formatHeure, formatPrix } from "@/lib/utils/format";
import { AlertCircle, ArrowLeft, ArrowRight, MapPin, Search, ShoppingBag, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

interface CommandeHistorique {
  id: string;
  numero: string;
  statut: string;
  total: number;
  modeCommande: string;
  createdAt: string;
}

type PaginationMeta = NonNullable<ApiResult<CommandeHistorique[]>["meta"]>;

const statusLabels: Record<string, string> = { recue: "Reçue", en_preparation: "En préparation", prete: "Prête", servie: "Terminée", annulee: "Annulée" };
const modeLabels: Record<string, string> = { livraison: "Livraison", emporter: "À emporter", sur_place: "Sur place" };

function dateGroupLabel(date: string) {
  const value = new Date(date);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const dateStart = new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const difference = Math.round((todayStart - dateStart) / 86_400_000);
  if (difference === 0) return "Aujourd’hui";
  if (difference === 1) return "Hier";
  return formatDate(value);
}

export default function HistoriqueCommandesPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [commandes, setCommandes] = useState<CommandeHistorique[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 350);
  const normalizedSearch = debouncedSearch.trim();
  const canSearch = normalizedSearch.length === 0 || normalizedSearch.length >= 3;

  const loadCommandes = useCallback(async (page: number, append: boolean, query: string) => {
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (query) params.set("search", query);
      const result = await clientApi.get<CommandeHistorique[]>(`/commandes?${params.toString()}`);
      if (!result.success || !result.data) {
        setError(result.error ?? "Impossible de charger vos commandes.");
        return;
      }
      setCommandes((current) => append ? [...current, ...result.data!] : result.data!);
      setMeta(result.meta ?? null);
    } catch {
      setError("Impossible de charger vos commandes.");
    } finally {
      if (append) setIsLoadingMore(false);
      else setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/client/login?redirect=%2Fcommandes");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!canSearch) return;
    const timer = window.setTimeout(() => {
      void loadCommandes(1, false, normalizedSearch);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [canSearch, isAuthenticated, loadCommandes, normalizedSearch]);

  const groupedCommandes = useMemo(() => {
    const groups: Array<{ label: string; commandes: CommandeHistorique[] }> = [];
    for (const commande of commandes) {
      const label = dateGroupLabel(commande.createdAt);
      const previous = groups.at(-1);
      if (previous?.label === label) previous.commandes.push(commande);
      else groups.push({ label, commandes: [commande] });
    }
    return groups;
  }, [commandes]);

  if (!isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-background pb-8">
      <header className="border-b px-4 py-4"><div className="mx-auto flex max-w-2xl items-start gap-3"><Button asChild variant="ghost" size="icon" className="mt-0.5"><Link href="/client" aria-label="Retour aux restaurants"><ArrowLeft /></Link></Button><div><p className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">Votre activité</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Mes commandes</h1><p className="mt-1 text-sm text-muted-foreground">Les commandes les plus récentes apparaissent en premier.</p></div></div></header>
      <div className="mx-auto max-w-2xl px-4">
        <div className="relative border-b py-4"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher avec le numéro de commande" className="h-10 pl-9" aria-label="Rechercher une commande par son numéro" />{!canSearch ? <p className="mt-2 text-xs text-muted-foreground">Saisissez au moins 3 caractères pour chercher dans l’historique.</p> : null}</div>
        {isLoading ? <div className="divide-y">{Array.from({ length: 4 }, (_, index) => <div key={index} className="flex items-center justify-between py-5"><div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-40" /></div><Skeleton className="h-6 w-20 rounded-full" /></div>)}</div> : null}
        {error ? <Alert variant="destructive" className="my-5"><AlertCircle /><AlertDescription>{error}</AlertDescription></Alert> : null}
        {!isLoading && !error && canSearch && commandes.length === 0 ? <section className="flex flex-col items-center py-20 text-center"><span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ShoppingBag className="size-6" /></span><h2 className="mt-4 text-lg font-semibold">{normalizedSearch ? "Aucune commande trouvée" : "Aucune commande pour le moment"}</h2><p className="mt-1 max-w-xs text-sm text-muted-foreground">{normalizedSearch ? "Vérifiez le numéro saisi puis réessayez." : "Votre prochaine commande apparaîtra ici dès sa validation."}</p>{!normalizedSearch ? <Button asChild className="mt-6"><Link href="/client">Découvrir les restaurants</Link></Button> : null}</section> : null}
        {!isLoading && !error && canSearch && groupedCommandes.length > 0 ? <div>{groupedCommandes.map((group) => <section key={group.label} aria-labelledby={`date-${group.label}`} className="border-b py-5 last:border-b-0"><h2 id={`date-${group.label}`} className="mb-2 text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">{group.label}</h2><div className="divide-y">{group.commandes.map((commande) => {
          const isCancelled = commande.statut === "annulee";
          const ModeIcon = commande.modeCommande === "livraison" ? MapPin : commande.modeCommande === "sur_place" ? Store : ShoppingBag;
          return <Link key={commande.id} href={`/commandes/${commande.id}`} className="group flex items-center gap-3 py-4 transition-colors hover:bg-muted/50"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${isCancelled ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}><ModeIcon className="size-4" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">Commande {commande.numero}</span><Badge variant={isCancelled ? "destructive" : "secondary"}>{statusLabels[commande.statut] ?? commande.statut}</Badge></span><span className="mt-1 block text-xs text-muted-foreground">{formatHeure(commande.createdAt)} · {modeLabels[commande.modeCommande] ?? commande.modeCommande}</span></span><span className="flex items-center gap-2 text-right"><span className="text-sm font-semibold">{formatPrix(commande.total)}</span><ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></span></Link>;
        })}</div></section>)}</div> : null}
        {meta?.hasNext && canSearch ? <div className="py-6 text-center"><Button type="button" variant="outline" disabled={isLoadingMore} onClick={() => void loadCommandes(meta.page + 1, true, normalizedSearch)}>{isLoadingMore ? "Chargement…" : "Afficher les commandes précédentes"}</Button></div> : null}
      </div>
    </main>
  );
}
