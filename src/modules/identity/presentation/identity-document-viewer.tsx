"use client";

import Image from "next/image";
import { FileImage, FileText, ShieldCheck } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/motion/tabs";
import type { IdentityDocumentDTO } from "../contracts";

function documentLabel(
  side: IdentityDocumentDTO["side"],
  documentType: "national_id" | "passport" | null,
) {
  if (side === "back") return "Verso";
  return documentType === "passport" ? "Page d’identité" : "Recto";
}

export function IdentityDocumentViewer({
  documents,
  documentType,
}: {
  documents: IdentityDocumentDTO[];
  documentType: "national_id" | "passport" | null;
}) {
  const available = documents.filter((document) => document.scanStatus === "clean");
  if (available.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">
        Aucun justificatif assaini n’est disponible pour l’aperçu.
      </div>
    );
  }

  return (
    <Tabs defaultValue={available[0]!.id} variant="underline" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList className="max-w-full overflow-x-auto">
          {available.map((document) => {
            const Icon = document.contentType === "application/pdf" ? FileText : FileImage;
            return (
              <TabsTrigger key={document.id} value={document.id} className="gap-2">
                <Icon className="size-4" aria-hidden="true" />
                {documentLabel(document.side, documentType)}
              </TabsTrigger>
            );
          })}
        </TabsList>
        <p className="flex items-center gap-1.5 text-xs text-emerald-700">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Consultation privée, sans téléchargement
        </p>
      </div>

      {available.map((document) => {
        const source = `/api/admin/identity/documents/${document.id}`;
        const label = documentLabel(document.side, documentType);
        return (
          <TabsContent key={document.id} value={document.id} className="outline-none">
            <div className="overflow-hidden rounded-xl border bg-slate-100">
              {document.contentType === "application/pdf" ? (
                <iframe
                  src={`${source}#toolbar=0&navpanes=0`}
                  title={`Aperçu du justificatif — ${label}`}
                  className="h-[70vh] min-h-[32rem] w-full bg-white"
                />
              ) : (
                <div className="relative min-h-[32rem] h-[70vh] w-full">
                  <Image
                    src={source}
                    alt={`Justificatif d’identité — ${label}`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 800px"
                    className="object-contain"
                    unoptimized
                    priority
                  />
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {document.contentType} · {Math.ceil(document.sizeBytes / 1024)} Ko · analyse de sécurité validée
            </p>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
