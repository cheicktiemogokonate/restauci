"use client";

import { EmptyState } from "@/components/admin/ui/empty-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import {
  CenterMorphModal,
  CenterMorphModalContent,
} from "@/components/motion/center-morph-modal";
import { Input } from "@/components/motion/input";
import { StatefulButton } from "@/components/motion/stateful-button";
import { Table, type TableColumn } from "@/components/motion/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs";
import { CustomAvatar } from "@/components/shared/avatar-fallback";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  reactiverClientAction,
  reactiverUserAction,
  suspendreClientAction,
  suspendreUserAction,
} from "@/lib/actions/admin-users";
import { cn } from "@/lib/utils";
import { formatDate, formatPrix } from "@/lib/utils/format";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";

interface UsersAdminTableProps {
  type: string;
  data: {
    items: UserAdminRow[];
    total: number;
    page: number;
    totalPages: number;
  };
  search?: string;
}

interface UserAdminRow {
  id: string;
  nom: string;
  telephone: string;
  email: string | null;
  createdAt: Date;
  actif?: boolean;
  suspendu?: boolean;
  totalDepense?: number;
  restaurantId?: string | null;
  restaurantNom?: string | null;
  planNom?: string | null;
  statutAbonnement?: string | null;
  dateEcheance?: Date | null;
}

export function UsersAdminTable({ type, data, search }: UsersAdminTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [motifModal, setMotifModal] = useState<{
    id: string;
    nom: string;
    type: "user" | "client";
  } | null>(null);
  const [motif, setMotif] = useState("");

  const navigate = (params: URLSearchParams) =>
    router.push(`?${params.toString()}`);

  const changeType = (newType: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", newType);
    params.delete("page");
    navigate(params);
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("search") ?? "").trim();
    const params = new URLSearchParams(searchParams.toString());

    if (query) params.set("search", query);
    else params.delete("search");
    params.delete("page");
    navigate(params);
  };

  const handleSuspendre = () => {
    if (!motifModal || motif.trim().length < 5) return;

    startTransition(async () => {
      try {
        const result =
          motifModal.type === "user"
            ? await suspendreUserAction(motifModal.id, motif)
            : await suspendreClientAction(motifModal.id, motif);
        if (result.error) throw new Error(result.error);
        toast.success(`${motifModal.nom} a été suspendu.`);
        setMotifModal(null);
        setMotif("");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "La suspension a échoué.",
        );
      }
    });
  };

  const handleReactiver = (id: string, targetType: "user" | "client") => {
    startTransition(async () => {
      try {
        if (targetType === "user") await reactiverUserAction(id);
        else await reactiverClientAction(id);
        toast.success("Compte réactivé.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "La réactivation a échoué.",
        );
      }
    });
  };

  const isClient = type === "clients";
  const columns: TableColumn<UserAdminRow>[] = [
    {
      key: "nom",
      header: "Utilisateur",
      sortable: true,
      width: "220px",
      cell: (item) => {
        const suspendu = isClient ? !item.actif : item.suspendu;
        return (
          <div className="flex items-center gap-3">
            <CustomAvatar
              fallbackText={item.nom}
              alt={item.nom}
              size="sm"
              className="shrink-0"
              fallbackClassName={cn(
                "font-semibold",
                suspendu
                  ? "bg-red-100 text-red-600"
                  : "bg-blue-100 text-blue-700",
              )}
            />
            <span className="truncate font-semibold text-gray-900">
              {item.nom}
            </span>
          </div>
        );
      },
    },
    {
      key: "contact",
      header: "Contact",
      width: "220px",
      sortValue: (item) => item.email ?? item.telephone ?? "",
      cell: (item) => (
        <div>
          <p className="truncate text-gray-700">{item.telephone}</p>
          {item.email ? (
            <p className="mt-0.5 truncate text-xs text-gray-400">
              {item.email}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: isClient ? "totalDepense" : "restaurantNom",
      header: isClient ? "Total dépensé" : "Restaurant & offre",
      sortable: true,
      width: isClient ? "150px" : "280px",
      align: isClient ? "right" : "left",
      cell: (item) =>
        isClient ? (
          <span className="font-semibold text-gray-900">
            {formatPrix(item.totalDepense ?? 0)}
          </span>
        ) : item.restaurantId ? (
          <div className="space-y-1">
            <Link
              href={`/admin/restaurants/${item.restaurantId}`}
              className="block truncate font-semibold text-gray-900 hover:text-emerald-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              title={`Voir ${item.restaurantNom}`}
            >
              {item.restaurantNom}
            </Link>
            <div className="flex items-center gap-1.5 overflow-hidden">
              <StatusBadge variant={item.planNom ? "info" : "neutral"}>
                {item.planNom ?? "Aucune offre active"}
              </StatusBadge>
              {item.statutAbonnement ? (
                <StatusBadge variant="success">Abonnement actif</StatusBadge>
              ) : null}
            </div>
            {item.dateEcheance ? (
              <p className="truncate text-xs text-gray-400">
                Échéance : {formatDate(item.dateEcheance)}
              </p>
            ) : null}
          </div>
        ) : (
          <span className="text-xs text-gray-400">
            Aucun restaurant associé
          </span>
        ),
    },
    {
      key: "statut",
      header: "Statut",
      sortable: true,
      width: "125px",
      sortValue: (item) =>
        isClient
          ? item.actif
            ? "actif"
            : "suspendu"
          : item.suspendu
            ? "suspendu"
            : "actif",
      cell: (item) => {
        const suspendu = isClient ? !item.actif : item.suspendu;
        return (
          <StatusBadge variant={suspendu ? "danger" : "success"}>
            {suspendu ? "Suspendu" : "Actif"}
          </StatusBadge>
        );
      },
    },
    {
      key: "createdAt",
      header: "Inscrit le",
      sortable: true,
      width: "130px",
      sortValue: (item) => new Date(item.createdAt).getTime(),
      cell: (item) => (
        <span className="text-xs text-gray-400">
          {formatDate(item.createdAt)}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      width: "130px",
      align: "right",
      cell: (item) => {
        const suspendu = isClient ? !item.actif : item.suspendu;
        return suspendu ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() =>
              handleReactiver(item.id, isClient ? "client" : "user")
            }
            className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900"
          >
            Réactiver
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={() =>
              setMotifModal({
                id: item.id,
                nom: item.nom,
                type: isClient ? "client" : "user",
              })
            }
          >
            Suspendre
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <Tabs
          value={type}
          onValueChange={changeType}
          variant="underline"
          className="max-w-full overflow-x-auto scrollbar-hide"
        >
          <TabsList className="h-11 min-w-max gap-0">
            {[
              {
                value: "restaurateurs",
                label: "Restaurateurs",
                icon: UserCheck,
              },
              { value: "clients", label: "Clients", icon: Users },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="h-11 gap-1.5 px-4 text-sm"
                  indicatorClassName="h-0.5 bg-emerald-600"
                >
                  <Icon className="size-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <form onSubmit={handleSearch} className="flex w-full gap-2 sm:w-auto">
          <Input
            id="users-search"
            name="search"
            type="search"
            aria-label="Rechercher un utilisateur"
            defaultValue={search ?? ""}
            placeholder="Nom, email ou téléphone"
            leftIcon={<Search />}
            className="min-w-0 flex-1 sm:w-64"
            classNames={{ field: "h-10 rounded-xl bg-white shadow-sm" }}
          />
          <Button className="h-auto" type="submit">
            Rechercher
          </Button>
        </form>
      </div>

      <Table
        data={data.items}
        columns={columns}
        getRowId={(item) => item.id}
        defaultSort={{ key: "createdAt", direction: "desc" }}
        resizable
        reorderable
        rowHeight={isClient ? 64 : 92}
        height={Math.min(
          Math.max(data.items.length * (isClient ? 64 : 92) + 48, 180),
          520,
        )}
        className="rounded-xl bg-white"
        emptyState={
          <EmptyState
            icon={<Users className="size-7" aria-hidden="true" />}
            title="Aucun utilisateur trouvé"
            description="Essayez de modifier votre recherche."
          />
        }
      />

      {data.totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500" aria-live="polite">
            <span className="font-medium text-gray-800">{data.total}</span>{" "}
            résultats · page{" "}
            <span className="font-medium text-gray-800">{data.page}</span> /{" "}
            {data.totalPages}
          </p>
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="default"
              disabled={data.page <= 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(data.page - 1));
                navigate(params);
              }}
            >
              <ChevronLeft aria-hidden="true" /> Précédent
            </Button>
            <Button
              type="button"
              size="default"
              disabled={data.page >= data.totalPages}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(data.page + 1));
                navigate(params);
              }}
            >
              Suivant <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      <CenterMorphModal
        open={Boolean(motifModal)}
        onOpenChange={(open) => {
          if (!open) {
            setMotifModal(null);
            setMotif("");
          }
        }}
      >
        <CenterMorphModalContent
          ariaLabel="Suspendre ce compte"
          ariaDescribedBy="suspension-account-description"
          className="max-w-md rounded-2xl"
        >
          <div className="space-y-4 p-6">
            <div className="flex items-start gap-3 pr-8">
              <div className="rounded-xl bg-red-100 p-2.5">
                <AlertTriangle
                  className="size-5 text-red-600"
                  aria-hidden="true"
                />
              </div>
              <div className="space-y-1">
                <h2 className="font-bold text-gray-900">Suspendre ce compte</h2>
                <p className="text-sm text-muted-foreground">
                  {motifModal?.nom}
                </p>
              </div>
            </div>
            <p
              id="suspension-account-description"
              className="text-sm text-gray-500"
            >
              Ce compte sera immédiatement suspendu. Un motif est obligatoire.
            </p>
            <div className="space-y-2">
              <label
                htmlFor="suspension-reason"
                className="text-sm font-medium text-gray-700"
              >
                Motif de la suspension
              </label>
              <Textarea
                id="suspension-reason"
                value={motif}
                onChange={(event) => setMotif(event.target.value)}
                placeholder="Minimum 5 caractères..."
                disabled={isPending}
                aria-describedby="suspension-reason-help"
              />
              <p id="suspension-reason-help" className="text-xs text-gray-400">
                {motif.trim().length}/5 caractères minimum
              </p>
            </div>
            <div className="-mx-6 -mb-6 flex justify-end gap-2 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  setMotifModal(null);
                  setMotif("");
                }}
              >
                Annuler
              </Button>
              <StatefulButton
                variant="destructive"
                state={isPending ? "loading" : "idle"}
                loadingText="Suspension…"
                disabled={isPending || motif.trim().length < 5}
                onClick={handleSuspendre}
              >
                Confirmer la suspension
              </StatefulButton>
            </div>
          </div>
        </CenterMorphModalContent>
      </CenterMorphModal>
    </div>
  );
}
