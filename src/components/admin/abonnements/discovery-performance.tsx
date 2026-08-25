import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DiscoveryPerformanceRow } from "@/modules/discovery/model";

const planLabels = {
  decouverte: "Découverte",
  croissance: "Croissance",
  partenaire_fier: "Partenaire Fier",
} as const;

function percent(bps: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(bps / 10_000);
}

export function DiscoveryPerformance({
  rows,
}: {
  rows: DiscoveryPerformanceRow[];
}) {
  const totals = rows.reduce(
    (current, row) => ({
      impressions: current.impressions + row.impressions,
      clicks: current.clicks + row.clicks,
      conversions: current.conversions + row.conversions,
    }),
    { impressions: 0, clicks: 0, conversions: 0 },
  );

  return (
    <Card className="shadow-none">
      <CardHeader className="border-b">
        <CardTitle>Performance de la découverte</CardTitle>
        <CardDescription>
          Résultats attribués sur les 30 derniers jours, sans position, adresse
          ni recherche client enregistrée en clair.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Impressions", totals.impressions],
            ["Clics", totals.clicks],
            ["Conversions", totals.conversions],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            Les premières données apparaîtront après les recherches et
            réservations des utilisateurs.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activité</TableHead>
                  <TableHead>Offre</TableHead>
                  <TableHead>Emplacement</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Clics</TableHead>
                  <TableHead className="text-right">Ouvertures</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Conversion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={`${row.activityType}:${row.planCode}:${row.placement}`}
                  >
                    <TableCell className="capitalize">{row.activityType}</TableCell>
                    <TableCell>{planLabels[row.planCode]}</TableCell>
                    <TableCell>
                      <Badge variant={row.placement === "promoted" ? "default" : "outline"}>
                        {row.placement === "promoted" ? "Mis en avant" : "Organique"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.impressions}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.clicks}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.detailOpens}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.conversions}</TableCell>
                    <TableCell className="text-right tabular-nums">{percent(row.clickThroughRateBps)}</TableCell>
                    <TableCell className="text-right tabular-nums">{percent(row.conversionRateBps)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
