"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createServiceMarketAction,
  createServiceMarketVersionAction,
  publishServiceMarketVersionAction,
  setServiceMarketCapabilityAction,
} from "@/lib/actions/admin-service-markets";
import {
  ServiceMarketBoundaryMap,
  type ServiceMarketBoundaryFeature,
} from "@/components/admin/service-market-boundary-map";

type CapabilityStatus = "disabled" | "prelaunch" | "active" | "paused";
type ActivityType = "restaurant" | "residence" | "event";

interface MarketView {
  id: string;
  code: string;
  name: string;
  countryCode: string;
  status: "draft" | "published" | "archived";
  activeVersionId: string | null;
  capabilities: Array<{ activityType: ActivityType; status: CapabilityStatus }>;
  versions: Array<{
    id: string;
    version: number;
    geometryChecksum: string;
    publishedAt: string | null;
    retiredAt: string | null;
    areaNames: string[];
  }>;
}

interface SourceAreaView {
  id: string;
  name: string;
  sourceRef: string;
  sourceVersion: string;
  adminLevel: string | null;
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  restaurant: "Restaurants",
  residence: "Résidences",
  event: "Événements",
};

const CAPABILITY_LABELS: Record<CapabilityStatus, string> = {
  disabled: "Désactivée",
  prelaunch: "Pré-lancement",
  active: "Active",
  paused: "Suspendue",
};

function resultToast(
  result: { success: true } | { success: false; error: string },
  success: string,
) {
  if (result.success) toast.success(success);
  else toast.error(result.error);
}

export function ServiceMarketAdmin({
  markets,
  sourceAreas,
  boundaryFeatures,
}: {
  markets: MarketView[];
  sourceAreas: SourceAreaView[];
  boundaryFeatures: ServiceMarketBoundaryFeature[];
}) {
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [selectedAreas, setSelectedAreas] = useState<Record<string, string[]>>(
    {},
  );

  const createMarket = () => {
    startTransition(async () => {
      const result = await createServiceMarketAction({
        code,
        name,
        countryCode: "CI",
      });
      resultToast(result, "Marché brouillon créé et audité.");
      if (result.success) {
        setCode("");
        setName("");
      }
    });
  };

  const toggleArea = (marketId: string, areaId: string) => {
    setSelectedAreas((current) => {
      const selected = new Set(current[marketId] ?? []);
      if (selected.has(areaId)) selected.delete(areaId);
      else selected.add(areaId);
      return { ...current, [marketId]: [...selected] };
    });
  };

  return (
    <div className="space-y-6">
      <ServiceMarketBoundaryMap features={boundaryFeatures} />
      <Card>
        <CardHeader>
          <CardTitle>Nouveau marché de service</CardTitle>
          <CardDescription>
            Le marché reste en brouillon jusqu'à la publication d'une frontière validée.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
          <Input
            aria-label="Code du marché"
            placeholder="abidjan"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            disabled={isPending}
          />
          <Input
            aria-label="Nom du marché"
            placeholder="Grand Abidjan"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isPending}
          />
          <Button onClick={createMarket} disabled={isPending || !code || !name}>
            Créer
          </Button>
        </CardContent>
      </Card>

      {markets.length === 0 ? (
        <Card><CardContent>Aucun marché configuré.</CardContent></Card>
      ) : null}

      {markets.map((market) => (
        <Card key={market.id}>
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{market.name}</CardTitle>
              <Badge variant={market.status === "published" ? "default" : "secondary"}>
                {market.status}
              </Badge>
              <span className="text-xs text-muted-foreground">{market.code} · {market.countryCode}</span>
            </div>
            <CardDescription>
              La frontière et les capacités commerciales évoluent indépendamment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h3 className="mb-3 font-medium">Capacités par activité</h3>
              <div className="grid gap-3 md:grid-cols-3">
                {market.capabilities.map((capability) => (
                  <label key={capability.activityType} className="space-y-1.5 text-sm">
                    <span className="font-medium">{ACTIVITY_LABELS[capability.activityType]}</span>
                    <select
                      className="h-9 w-full rounded-lg border bg-background px-2"
                      value={capability.status}
                      disabled={isPending}
                      onChange={(event) => {
                        const status = event.target.value as CapabilityStatus;
                        startTransition(async () => {
                          resultToast(
                            await setServiceMarketCapabilityAction({
                              serviceMarketId: market.id,
                              activityType: capability.activityType,
                              status,
                            }),
                            `${ACTIVITY_LABELS[capability.activityType]} : ${CAPABILITY_LABELS[status]}.`,
                          );
                        });
                      }}
                    >
                      {(Object.keys(CAPABILITY_LABELS) as CapabilityStatus[]).map((status) => (
                        <option key={status} value={status}>{CAPABILITY_LABELS[status]}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </section>

            <section>
              <h3 className="font-medium">Créer une version depuis les unités OSM</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Sélectionnez uniquement des unités vérifiées visuellement. Les inclusions sont fusionnées par PostGIS.
              </p>
              <div className="mt-3 grid max-h-52 gap-2 overflow-auto rounded-lg border p-3 sm:grid-cols-2">
                {sourceAreas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Importez d'abord des unités OSM validées.</p>
                ) : sourceAreas.map((area) => (
                  <label key={area.id} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={(selectedAreas[market.id] ?? []).includes(area.id)}
                      onChange={() => toggleArea(market.id, area.id)}
                      disabled={isPending}
                    />
                    <span>
                      <span className="font-medium">{area.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        OSM {area.sourceRef} · v{area.sourceVersion}{area.adminLevel ? ` · niveau ${area.adminLevel}` : ""}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <Button
                variant="outline"
                className="mt-3"
                disabled={isPending || (selectedAreas[market.id]?.length ?? 0) === 0}
                onClick={() => startTransition(async () => {
                  const result = await createServiceMarketVersionAction({
                    serviceMarketId: market.id,
                    includeSourceAreaIds: selectedAreas[market.id] ?? [],
                  });
                  resultToast(result, "Version brouillon créée et auditée.");
                  if (result.success) setSelectedAreas((current) => ({ ...current, [market.id]: [] }));
                })}
              >
                Composer une version
              </Button>
            </section>

            <section>
              <h3 className="mb-3 font-medium">Historique des versions</h3>
              <div className="space-y-2">
                {market.versions.length === 0 ? <p className="text-sm text-muted-foreground">Aucune version.</p> : null}
                {market.versions.map((version) => (
                  <div key={version.id} className="flex flex-col justify-between gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-medium">Version {version.version}{market.activeVersionId === version.id ? " · active" : ""}</p>
                      <p className="text-xs text-muted-foreground">
                        {version.areaNames.join(", ") || "Provenance indisponible"} · checksum {version.geometryChecksum.slice(0, 12)}…
                      </p>
                    </div>
                    {!version.retiredAt && market.activeVersionId !== version.id ? (
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => {
                          if (!window.confirm(`Publier ${market.name} version ${version.version} ? La version active actuelle sera retirée.`)) return;
                          startTransition(async () => resultToast(
                            await publishServiceMarketVersionAction({
                              serviceMarketId: market.id,
                              serviceMarketVersionId: version.id,
                            }),
                            `Version ${version.version} publiée.`,
                          ));
                        }}
                      >
                        Publier
                      </Button>
                    ) : <Badge variant="secondary">{version.retiredAt ? "retirée" : "publiée"}</Badge>}
                  </div>
                ))}
              </div>
            </section>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
