import { Card, CardContent } from "@/components/ui/card";
import { request } from "@/lib/landing/story-data";

export function RequestCard({ floating = false }: { floating?: boolean }) {
  return (
    <Card className={floating ? "transfer-request-card" : "request-card"}>
      <CardContent className="p-0">
        <div className="request-card-title">
          <span><i /> Demande confirmée</span>
        </div>
        <div className="request-card-total">
          <span>#{request.id}<small>Aujourd’hui · {request.venue}</small></span>
          <strong>12 500 FCFA</strong>
        </div>
        {floating ? (
          <div className="request-sync"><span>{request.option}</span><strong><i /> Transmission vers l’établissement…</strong></div>
        ) : null}
      </CardContent>
    </Card>
  );
}
