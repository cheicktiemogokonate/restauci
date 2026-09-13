"use client";

import { useState, useTransition } from "react";
import { BadgeDollarSign, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  associatePaystackSubaccountAction,
  disablePaystackSubaccountAction,
} from "@/app/_actions/admin-provider-accounts";

export function PaystackProviderAccountCard(props: {
  resourceType: "restaurant" | "residence";
  resourceId: string;
  partnerAccountId: string;
  account: {
    providerAccountReference: string;
    status: "pending" | "active" | "disabled";
    verifiedAt: Date | null;
  } | null;
}) {
  const [code, setCode] = useState(props.account?.providerAccountReference ?? "");
  const [pending, startTransition] = useTransition();
  return (
    <section className="rounded-xl border bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><BadgeDollarSign className="size-5" /></span>
        <div><h2 className="font-semibold text-gray-900">Compte de règlement Paystack</h2><p className="text-sm text-gray-500">Outil de secours : l’association normale est créée par le partenaire après son KYC.</p></div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="ACCT_xxxxxxxxxx" disabled={pending} />
        <Button disabled={pending || !code.trim()} onClick={() => startTransition(async () => {
          try {
            await associatePaystackSubaccountAction({ resourceType: props.resourceType, resourceId: props.resourceId, partnerAccountId: props.partnerAccountId, code });
            toast.success("Subaccount vérifié et activé");
          } catch (error) { toast.error(error instanceof Error ? error.message : "Association impossible"); }
        })}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}Vérifier et associer</Button>
        {props.account?.status === "active" ? <Button variant="outline" disabled={pending} onClick={() => startTransition(async () => {
          try {
            await disablePaystackSubaccountAction({ resourceType: props.resourceType, resourceId: props.resourceId, partnerAccountId: props.partnerAccountId });
            toast.success("Subaccount désactivé");
          } catch (error) { toast.error(error instanceof Error ? error.message : "Désactivation impossible"); }
        })}>Désactiver</Button> : null}
      </div>
      <p className="mt-2 text-xs text-gray-500">Statut : {props.account?.status === "active" ? "actif" : props.account?.status === "pending" ? "validation Paystack en attente" : props.account ? "désactivé" : "non associé"}</p>
    </section>
  );
}
