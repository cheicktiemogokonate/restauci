"use client";

import { useTransition } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resumeSubscriptionPaymentAction } from "@/lib/actions/partner-subscriptions";

export function ResumeSubscriptionPayment({ requestId }: { requestId: string }) {
  const [pending, startTransition] = useTransition();
  return <Button className="mt-3" size="sm" disabled={pending} onClick={() => startTransition(async () => {
    try {
      const result = await resumeSubscriptionPaymentAction(requestId);
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Paiement impossible");
    }
  })}>{pending ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}Reprendre le paiement</Button>;
}
