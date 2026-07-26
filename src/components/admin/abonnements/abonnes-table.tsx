"use client";

import { EmptyState } from "@/components/admin/ui/empty-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import {
  CenterMorphModal,
  CenterMorphModalContent,
} from "@/components/motion/center-morph-modal";
import { StatefulButton } from "@/components/motion/stateful-button";
import { Table, type TableColumn } from "@/components/motion/table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  reactiverAbonnementAction,
  suspendreAbonnementAction,
} from "@/lib/actions/admin-subscriptions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarClock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface Subscriber {
  restaurantId: string;
  restaurantNom: string;
  planCode: string;
  statut: string;
  dateDebut: Date;
  dateEcheance: Date | null;
  tauxCommissionBpsFige: number;
}

const planLabels: Record<string, string> = {
  decouverte: "Découverte",
  croissance: "Croissance",
  partenaire_fier: "Partenaire Fier",
};

export function AbonnesTable({ subscribers }: { subscribers: Subscriber[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Subscriber | null>(null);
  const [motif, setMotif] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  const suspend = async () => {
    if (!selected || !motif.trim()) return;
    setIsSubmitting(true);
    try {
      await suspendreAbonnementAction(selected.restaurantId, motif);
      toast.success("Abonnement suspendu et restaurant notifié");
      setSelected(null);
      setMotif("");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de suspendre l’abonnement",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const reactivate = async (subscriber: Subscriber) => {
    setReactivatingId(subscriber.restaurantId);
    try {
      await reactiverAbonnementAction(subscriber.restaurantId);
      toast.success("Abonnement réactivé et restaurant notifié");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de réactiver l’abonnement",
      );
    } finally {
      setReactivatingId(null);
    }
  };

  const columns: TableColumn<Subscriber>[] = [
    {
      key: "restaurantNom",
      header: "Restaurant",
      sortable: true,
      width: "220px",
      cell: (subscriber) => (
        <span className="font-medium">{subscriber.restaurantNom}</span>
      ),
    },
    {
      key: "planCode",
      header: "Offre",
      sortable: true,
      width: "160px",
      cell: (subscriber) =>
        planLabels[subscriber.planCode] ?? subscriber.planCode,
    },
    {
      key: "dateDebut",
      header: "Date de début",
      sortable: true,
      width: "150px",
      sortValue: (subscriber) => new Date(subscriber.dateDebut).getTime(),
      cell: (subscriber) =>
        format(new Date(subscriber.dateDebut), "dd MMM yyyy", { locale: fr }),
    },
    {
      key: "dateEcheance",
      header: "Échéance",
      sortable: true,
      width: "150px",
      sortValue: (subscriber) =>
        subscriber.dateEcheance
          ? new Date(subscriber.dateEcheance).getTime()
          : 0,
      cell: (subscriber) =>
        subscriber.dateEcheance
          ? format(new Date(subscriber.dateEcheance), "dd MMM yyyy", {
              locale: fr,
            })
          : "Illimitée",
    },
    {
      key: "statut",
      header: "Statut",
      sortable: true,
      width: "120px",
      cell: (subscriber) => (
        <StatusBadge
          variant={subscriber.statut === "active" ? "success" : "warning"}
        >
          {subscriber.statut === "active" ? "Actif" : "Suspendu"}
        </StatusBadge>
      ),
    },
    {
      key: "tauxCommissionBpsFige",
      header: "Taux effectif",
      sortable: true,
      width: "130px",
      cell: (subscriber) =>
        `${(subscriber.tauxCommissionBpsFige / 100).toFixed(1)} %`,
    },
    {
      key: "action",
      header: "Action",
      width: "130px",
      align: "right",
      cell: (subscriber) => (
        subscriber.statut === "suspendue" ? (
          <Button
            variant="outline"
            size="sm"
            disabled={reactivatingId === subscriber.restaurantId}
            onClick={() => reactivate(subscriber)}
          >
            {reactivatingId === subscriber.restaurantId
              ? "Réactivation…"
              : "Réactiver"}
          </Button>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setSelected(subscriber)}
          >
            Suspendre
          </Button>
        )
      ),
    },
  ];

  return (
    <>
      <Table
        data={subscribers}
        columns={columns}
        getRowId={(subscriber) => subscriber.restaurantId}
        defaultSort={{ key: "dateEcheance", direction: "asc" }}
        resizable
        reorderable
        rowHeight={64}
        height={Math.min(Math.max(subscribers.length * 64 + 48, 180), 520)}
        emptyState={
          <EmptyState
            icon={<CalendarClock className="size-7" />}
            title="Aucun abonnement actif ou suspendu"
            description="Les abonnements suivis apparaîtront ici."
          />
        }
      />

      <CenterMorphModal
        open={Boolean(selected)}
        onOpenChange={(open) =>
          !open && !isSubmitting && setSelected(null)
        }
      >
        <CenterMorphModalContent
          ariaLabel="Suspendre l’abonnement"
          ariaDescribedBy="suspend-subscription-description"
          className="max-w-md rounded-2xl"
        >
          <div className="space-y-5 p-6">
            <div className="space-y-2 pr-8">
              <h2 className="text-lg font-semibold">
                Suspendre l’abonnement
              </h2>
              <p
                id="suspend-subscription-description"
                className="text-sm text-muted-foreground"
              >
                {selected
                  ? `${selected.restaurantNom} sera notifié de cette suspension.`
                  : ""}
              </p>
            </div>
            <Textarea
              value={motif}
              onChange={(event) => setMotif(event.target.value)}
              placeholder="Motif de la suspension…"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setSelected(null)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <StatefulButton
                variant="destructive"
                state={isSubmitting ? "loading" : "idle"}
                loadingText="Suspension…"
                disabled={!motif.trim()}
                onClick={suspend}
              >
                Confirmer la suspension
              </StatefulButton>
            </div>
          </div>
        </CenterMorphModalContent>
      </CenterMorphModal>
    </>
  );
}
