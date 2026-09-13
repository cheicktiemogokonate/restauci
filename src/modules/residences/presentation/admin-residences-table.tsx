"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { Input } from "@/components/motion/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/motion/select";
import { Table, type TableColumn } from "@/components/motion/table";
import { Button } from "@/components/ui/button";
import type {
  AdminResidenceListItemWithPublicationDTO,
} from "../contracts";
import {
  getResidenceVisibilityMessage,
  ResidencePublicationStatusBadge,
} from "./residence-publication-status";
import { ResidenceStatusBadge } from "./residence-status-badge";

const statuses = [
  { value: "all", label: "Tous les statuts" },
  { value: "pending", label: "En vérification" },
  { value: "approved", label: "Validées" },
  { value: "rejected", label: "À corriger" },
  { value: "suspended", label: "Suspendues" },
  { value: "draft", label: "Brouillons" },
] as const;

export function AdminResidencesTable({
  items,
  page,
  totalPages,
  search,
  status,
}: {
  items: AdminResidenceListItemWithPublicationDTO[];
  page: number;
  totalPages: number;
  search?: string;
  status?: string;
}) {
  const router = useRouter();
  const currentParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(search ?? "");
  const [statusValue, setStatusValue] = useState(status ?? "all");

  const navigate = (nextPage = 1) => {
    const params = new URLSearchParams(currentParams.toString());
    const normalizedSearch = searchValue.trim();
    if (normalizedSearch) params.set("search", normalizedSearch);
    else params.delete("search");
    if (statusValue === "all") params.delete("status");
    else params.set("status", statusValue);
    if (nextPage > 1) params.set("page", String(nextPage));
    else params.delete("page");
    router.push(`?${params.toString()}`);
  };

  type ResidenceRow = AdminResidenceListItemWithPublicationDTO;
  const columns: TableColumn<ResidenceRow>[] = [
    {
      key: "title",
      header: "Résidence",
      sortable: true,
      width: "230px",
      cell: (residence) => (
        <div className="min-w-0">
          <Link
            href={`/admin/residences/${residence.id}`}
            className="block truncate font-semibold text-slate-950 hover:text-emerald-700"
          >
            {residence.title}
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {residence.city}
          </p>
        </div>
      ),
    },
    {
      key: "accountName",
      header: "Compte partenaire",
      sortable: true,
      width: "230px",
      cell: (residence) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{residence.accountName}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {residence.accountEmail}
          </p>
        </div>
      ),
    },
    {
      key: "moderationStatus",
      header: "Modération",
      sortable: true,
      width: "150px",
      cell: (residence) => (
        <ResidenceStatusBadge status={residence.moderationStatus} />
      ),
    },
    {
      key: "publication",
      header: "Publication",
      width: "260px",
      sortValue: (residence) =>
        residence.publication.isPubliclyVisible ? 1 : 0,
      cell: (residence) => {
        const message = getResidenceVisibilityMessage(residence.publication);
        return (
          <div className="min-w-0">
            <ResidencePublicationStatusBadge
              publication={residence.publication}
            />
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {message.title}
            </p>
          </div>
        );
      },
    },
    {
      key: "plan",
      header: "Offre partagée",
      width: "150px",
      cell: (residence) => (
        <div>
          <p className="font-medium capitalize">
            {residence.publication.quota.planCode}
          </p>
          <p className="text-xs text-muted-foreground">
            {residence.publication.quota.maxPublicResidences ?? "Illimité"} public
          </p>
        </div>
      ),
    },
    {
      key: "updatedAt",
      header: "Mise à jour",
      sortable: true,
      width: "150px",
      sortValue: (residence) => new Date(residence.updatedAt).getTime(),
      cell: (residence) =>
        new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
          new Date(residence.updatedAt),
        ),
    },
    {
      key: "action",
      header: "Action",
      align: "right",
      width: "110px",
      cell: (residence) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/residences/${residence.id}`}>Examiner</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border bg-white p-4 lg:grid-cols-[minmax(0,1fr)_240px_auto]">
        <Input
          aria-label="Rechercher une résidence"
          value={searchValue}
          onChange={setSearchValue}
          onKeyDown={(event) => {
            if (event.key === "Enter") navigate();
          }}
          placeholder="Résidence, ville ou partenaire"
          leftIcon={<Search />}
          classNames={{ field: "h-10 rounded-xl bg-white" }}
        />
        <Select value={statusValue} onValueChange={setStatusValue}>
          <SelectTrigger ariaLabel="Filtrer par statut" className="h-10 bg-white">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" onClick={() => navigate()}>
          <Search /> Filtrer
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title="Aucune résidence"
          description="Aucun logement ne correspond à ces filtres."
        />
      ) : (
        <Table
          data={items}
          columns={columns}
          getRowId={(residence) => residence.id}
          defaultSort={{ key: "updatedAt", direction: "desc" }}
          rowHeight={72}
          height={Math.min(624, Math.max(216, items.length * 72 + 48))}
          className="rounded-xl bg-white"
          emptyState="Aucune résidence ne correspond à ces filtres."
        />
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-3 text-sm">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => navigate(Math.max(1, page - 1))}
          >
            <ChevronLeft /> Précédent
          </Button>
          <span>
            Page {page} sur {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => navigate(Math.min(totalPages, page + 1))}
          >
            Suivant <ChevronRight />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
