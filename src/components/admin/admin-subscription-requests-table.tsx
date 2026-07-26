"use client";

import { EmptyState } from "@/components/admin/ui/empty-state";
import {
  CenterMorphModal,
  CenterMorphModalContent,
} from "@/components/motion/center-morph-modal";
import { StatefulButton } from "@/components/motion/stateful-button";
import { Table, type TableColumn } from "@/components/motion/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/motion/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select";
import { Textarea } from "@/components/ui/textarea";
import {
  rejectSubscriptionRequest,
  validateSubscriptionRequest,
} from "@/lib/actions/admin-subscriptions";
import { formatPrix } from "@/lib/utils/format";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ClipboardCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface RequestRow {
  id: string;
  restaurantId: string;
  restaurantNom: string;
  planCode: string;
  prixFigeFcfa: number;
  statut: string;
  createdAt: Date;
}

type MoyenReglement = "mobile_money" | "virement" | "especes" | "cheque";

export function AdminSubscriptionRequestsTable({
  requests,
}: {
  requests: RequestRow[];
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [validateId, setValidateId] = useState<string | null>(null);
  const [moyenReglement, setMoyenReglement] =
    useState<MoyenReglement>("mobile_money");
  const [referenceReglement, setReferenceReglement] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [motifRefus, setMotifRefus] = useState("");

  const onValidate = async () => {
    if (!validateId) return;
    const request = requests.find((item) => item.id === validateId);
    if (!request) return;
    const isPaid = request.prixFigeFcfa > 0;
    if (isPaid && referenceReglement.trim().length < 3) {
      toast.error("Saisissez une référence de règlement valide");
      return;
    }
    setLoadingId(validateId);
    try {
      await validateSubscriptionRequest(
        validateId,
        isPaid ? moyenReglement : undefined,
        isPaid ? referenceReglement.trim() : undefined,
      );
      toast.success("Demande validée avec succès");
      setValidateId(null);
      setMoyenReglement("mobile_money");
      setReferenceReglement("");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la validation",
      );
    } finally {
      setLoadingId(null);
    }
  };

  const onReject = async () => {
    if (!rejectId || !motifRefus.trim()) return;
    setLoadingId(rejectId);
    try {
      await rejectSubscriptionRequest(rejectId, motifRefus);
      toast.success("Demande refusée");
      setRejectId(null);
      setMotifRefus("");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur lors du refus",
      );
    } finally {
      setLoadingId(null);
    }
  };

  const columns: TableColumn<RequestRow>[] = [
    {
      key: "createdAt",
      header: "Date",
      sortable: true,
      width: "140px",
      sortValue: (request) => new Date(request.createdAt).getTime(),
      cell: (request) =>
        format(new Date(request.createdAt), "dd MMM yyyy", { locale: fr }),
    },
    {
      key: "restaurantNom",
      header: "Restaurant",
      sortable: true,
      width: "220px",
      cell: (request) => (
        <span className="font-medium">{request.restaurantNom}</span>
      ),
    },
    {
      key: "planCode",
      header: "Offre demandée",
      sortable: true,
      width: "170px",
      cell: (request) => (
        <span className="capitalize">{request.planCode.replace("_", " ")}</span>
      ),
    },
    {
      key: "prixFigeFcfa",
      header: "Montant",
      sortable: true,
      width: "150px",
      cell: (request) => formatPrix(request.prixFigeFcfa),
    },
    {
      key: "actions",
      header: "Actions",
      width: "210px",
      align: "right",
      cell: (request) => (
        <div className="inline-flex gap-2">
          <Button
            size="sm"
            onClick={() => setValidateId(request.id)}
            disabled={loadingId === request.id}
          >
            Valider
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setRejectId(request.id)}
            disabled={loadingId === request.id}
          >
            Refuser
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Table
        data={requests}
        columns={columns}
        getRowId={(request) => request.id}
        defaultSort={{ key: "createdAt", direction: "desc" }}
        resizable
        reorderable
        rowHeight={64}
        height={Math.min(Math.max(requests.length * 64 + 48, 180), 520)}
        className="rounded-xl"
        emptyState={
          <EmptyState
            icon={<ClipboardCheck className="size-7" />}
            title="Aucune demande en attente"
            description="Les nouvelles demandes apparaîtront ici."
          />
        }
      />

      <CenterMorphModal
        open={Boolean(validateId)}
        onOpenChange={(open) => !open && setValidateId(null)}
      >
        <CenterMorphModalContent
          ariaLabel="Valider l’abonnement"
          ariaDescribedBy="validate-subscription-description"
          className="max-w-md rounded-2xl"
        >
          <div className="space-y-5 p-6">
            <div className="space-y-2 pr-8">
              <h2 className="text-lg font-semibold">Valider l’abonnement</h2>
              <p
                id="validate-subscription-description"
                className="text-sm text-muted-foreground"
              >
                Confirmez le règlement. Une période d’un an sera activée.
              </p>
            </div>
            {requests.find((request) => request.id === validateId)?.prixFigeFcfa ? (
              <>
                <div className="space-y-2">
                  <span className="text-sm font-medium">
                    Moyen de règlement
                  </span>
                  <Select
                    value={moyenReglement}
                    onValueChange={(value) =>
                      setMoyenReglement(value as MoyenReglement)
                    }
                  >
                    <SelectTrigger aria-label="Moyen de règlement">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="virement">Virement</SelectItem>
                      <SelectItem value="especes">Espèces</SelectItem>
                      <SelectItem value="cheque">Chèque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="subscription-payment-reference">
                    Référence du règlement
                  </label>
                  <Input
                    id="subscription-payment-reference"
                    value={referenceReglement}
                    onChange={setReferenceReglement}
                    placeholder="Ex. OM-2026-001 ou reçu caisse"
                    maxLength={255}
                  />
                </div>
              </>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setValidateId(null)}>
                Annuler
              </Button>
              <StatefulButton
                state={loadingId === validateId ? "loading" : "idle"}
                loadingText="Validation…"
                disabled={
                  Boolean(
                    requests.find((request) => request.id === validateId)
                      ?.prixFigeFcfa,
                  ) && referenceReglement.trim().length < 3
                }
                onClick={onValidate}
              >
                Confirmer la validation
              </StatefulButton>
            </div>
          </div>
        </CenterMorphModalContent>
      </CenterMorphModal>

      <CenterMorphModal
        open={Boolean(rejectId)}
        onOpenChange={(open) => !open && setRejectId(null)}
      >
        <CenterMorphModalContent
          ariaLabel="Refuser la demande"
          ariaDescribedBy="reject-subscription-description"
          className="max-w-md rounded-2xl"
        >
          <div className="space-y-5 p-6">
            <div className="space-y-2 pr-8">
              <h2 className="text-lg font-semibold">Refuser la demande</h2>
              <p
                id="reject-subscription-description"
                className="text-sm text-muted-foreground"
              >
                Le restaurant recevra le motif dans une notification.
              </p>
            </div>
            <Textarea
              value={motifRefus}
              onChange={(event) => setMotifRefus(event.target.value)}
              placeholder="Motif du refus…"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectId(null)}>
                Annuler
              </Button>
              <StatefulButton
                variant="destructive"
                state={loadingId === rejectId ? "loading" : "idle"}
                loadingText="Refus…"
                disabled={!motifRefus.trim()}
                onClick={onReject}
              >
                Confirmer le refus
              </StatefulButton>
            </div>
          </div>
        </CenterMorphModalContent>
      </CenterMorphModal>
    </>
  );
}
