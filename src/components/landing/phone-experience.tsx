"use client";

import { ArrowRight, Clock3, MapPin, Star } from "lucide-react";
import Image from "next/image";
import { BottomSheet } from "@/components/motion/bottom-sheet";
import { Iphone } from "@/components/ui/iphone";
import { brand, request, type StoryStep } from "./story-data";

function PhoneMap() {
  return (
    <div className="phone-map" aria-label="Carte des adresses disponibles autour de vous">
      {/* The map is deliberately static; interactive markers remain semantic DOM. */}
      <Image src="/landing/map.svg" alt="Carte stylisée du quartier" fill sizes="360px" loading="eager" />
      <div className="phone-search"><span /> Autour de vous…</div>
      <span className="map-marker marker-a" role="img" aria-label="Adresse disponible au nord" />
      <span className="map-marker marker-b" role="img" aria-label="Adresse disponible à l’ouest" />
      <span className="map-marker marker-c" role="img" aria-label={`${request.venue}, sélectionné`}>
        <span className="marker-pulse" />
      </span>
      <span className="selection-label">Sélection</span>
      <span className="time-label"><Clock3 size={11} /> 3 min</span>
    </div>
  );
}

function DetailsSheet({ step }: { step: StoryStep }) {
  const selected = step >= 3;
  const confirmed = step >= 5;
  return (
    <div className="phone-sheet-content">
      <div className="venue-row">
        <div>
          <strong>{request.venue}</strong>
          <p>{request.distance} <span>• Disponible maintenant</span></p>
        </div>
        <span className="rating"><Star size={12} fill="currentColor" /> {request.rating}</span>
      </div>

      {confirmed ? (
        <>
          <div className="selection-caption">Votre sélection <span>{request.option}</span></div>
          <div className="confirmation-card">
            <div className="confirmation-card-head">
              <span><i /> Demande confirmée</span>
            </div>
            <div className="confirmation-total">
              <span>#{request.id}<small>Aujourd’hui · {request.venue}</small></span>
              <strong>12 500 FCFA</strong>
            </div>
          </div>
        </>
      ) : (
        <>
          {selected ? <div className="selection-caption">Votre sélection</div> : null}
          <div className="selection-card">
            <div><span className="selection-dot" /> <strong>{request.option}</strong><em>Aujourd’hui</em></div>
            <div><span>Tarif total</span><strong>12 500 FCFA</strong></div>
          </div>
          <button className="continue-button" type="button">
            {selected ? "Continuer" : "Voir les détails"} <ArrowRight size={15} strokeWidth={2.25} />
          </button>
        </>
      )}
    </div>
  );
}

function TransferPhone() {
  return (
    <div className="transfer-phone">
      <div className="transfer-venue"><strong>{request.venue}</strong><span><Star size={11} fill="currentColor" /> {request.rating}</span><p>À {request.distance} · Disponible maintenant</p></div>
      <div className="transfer-slot"><MapPin size={18} /><span>Transmission de la demande…</span></div>
    </div>
  );
}

export function PhoneExperience({
  step,
  className,
  timelineControlled = false,
}: {
  step: StoryStep;
  className?: string;
  timelineControlled?: boolean;
}) {
  const transfer = step === 7;
  const sheetSnap = step >= 5 ? 2 : step >= 3 ? 1 : 0;

  return (
    <Iphone className={className} aria-label={`Application mobile ${brand.name}`}>
      <div className="phone-screen">
        <div className="phone-status"><strong>09:41</strong><span>● &nbsp;5G &nbsp;▰</span></div>
        {transfer ? (
          <TransferPhone />
        ) : (
          <>
            <PhoneMap />
            <BottomSheet
              embedded
              open
              onOpenChange={() => undefined}
              snapPoints={[0.36, 0.68, 0.84]}
              controlledSnap={sheetSnap}
              timelineControlled={timelineControlled}
              dismissible={false}
              className="phone-bottom-sheet"
            >
              <DetailsSheet step={step} />
            </BottomSheet>
          </>
        )}
      </div>
    </Iphone>
  );
}
