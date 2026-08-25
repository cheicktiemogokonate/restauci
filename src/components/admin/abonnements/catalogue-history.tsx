"use client";

import { RotateCcw } from "lucide-react";

import { StatefulButton } from "@/components/motion/stateful-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CatalogueHistory({
  revisions,
  restoringId,
  disabled,
  onRestore,
}: {
  revisions: { id: string; version: number; publishedByAdminId: string; publishedAt: string }[];
  restoringId: string | null;
  disabled: boolean;
  onRestore: (revisionId: string, version: number) => Promise<void>;
}) {
  if (revisions.length === 0) {
    return (
      <Card className="shadow-none">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          La première version apparaîtra ici après publication.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden shadow-none">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Publication</TableHead>
              <TableHead>Administrateur</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {revisions.map((revision, index) => (
              <TableRow key={revision.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium tabular-nums">Version {revision.version}</span>
                    {index === 0 ? <Badge variant="outline">Dernière</Badge> : null}
                  </div>
                </TableCell>
                <TableCell>{formatDate(revision.publishedAt)}</TableCell>
                <TableCell className="max-w-52 truncate font-mono text-xs text-muted-foreground">
                  {revision.publishedByAdminId}
                </TableCell>
                <TableCell className="text-right">
                  <StatefulButton
                    state={restoringId === revision.id ? "loading" : "idle"}
                    variant="ghost"
                    size="sm"
                    icon={<RotateCcw />}
                    loadingText="Restauration…"
                    disabled={disabled}
                    onClick={() => onRestore(revision.id, revision.version)}
                  >
                    Restaurer en brouillon
                  </StatefulButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
