"use client";

/**
 * État narratif de la landing + registre « forward-only » (spec §26-27).
 *
 * Deux mécanismes cohabitent :
 * - les latches : chaque événement narratif ne peut être déclenché qu'UNE
 *   seule fois par chargement de page (jamais persisté — un refresh
 *   réinitialise tout) ;
 * - le store : l'état React (KPI, vue courante, statut, toasts) ne peut
 *   évoluer que vers l'avant. Les composants s'y abonnent via useStory().
 *
 * Les positions/transformations visuelles restent quant à elles pilotées par
 * GSAP dans story-landing.tsx ; ce module ne touche jamais au DOM.
 */

import { useSyncExternalStore } from "react";
import { dashboard, request } from "./story-data";

const requestLabel = `${request.amount.toLocaleString("fr-FR")} ${request.currency}`;
const balanceLabel = `+${requestLabel}`;

/** Identifiants des battements narratifs (un latch par battement). */
export type BeatId =
  | "markersIn"
  | "markerSelect"
  | "sheetOpen"
  | "sheetExtend"
  | "flowOptions"
  | "confirmCta"
  | "requestCreated"
  | "safariEnter"
  | "cardArrive"
  | "newRequest"
  | "switchRequests"
  | "relief"
  | "openDetail"
  | "processing"
  | "done"
  | "backOverview";

export type StoryToastInput = {
  id: string;
  title: string;
  description?: string;
  status?: "neutral" | "info" | "loading" | "success" | "error";
  duration?: number;
};

export interface StoryState {
  markersIn: boolean;
  markerSelected: boolean;
  sheet: "closed" | "peek" | "extended";
  flow: "hidden" | "options" | "confirm" | "confirmed";
  /** Vrai quand la demande est visuellement arrivée dans Safari. */
  arrived: boolean;
  kpi: { requests: number; completed: number; revenue: number };
  badge: number;
  view: "overview" | "requests" | "detail";
  status: "recue" | "traitement" | "terminee";
  toasts: StoryToastInput[];
  chartBump: boolean;
}

const initialState: StoryState = {
  markersIn: false,
  markerSelected: false,
  sheet: "closed",
  flow: "hidden",
  arrived: false,
  kpi: {
    requests: dashboard.initialRequests,
    completed: dashboard.initialCompleted,
    revenue: dashboard.initialRevenue,
  },
  badge: 0,
  view: "overview",
  status: "recue",
  toasts: [],
  chartBump: false,
};

/** État final — utilisé uniquement pour prefers-reduced-motion (spec §28). */
const finalState: StoryState = {
  markersIn: true,
  markerSelected: true,
  sheet: "extended",
  flow: "confirmed",
  arrived: true,
  kpi: {
    requests: dashboard.finalRequests,
    completed: dashboard.finalCompleted,
    revenue: dashboard.finalRevenue,
  },
  badge: 1,
  view: "overview",
  status: "terminee",
  toasts: [],
  chartBump: true,
};

let state: StoryState = initialState;

const listeners = new Set<() => void>();

function emit(next: Partial<StoryState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useStory<T>(selector: (s: StoryState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(initialState),
  );
}

/**
 * Actions narrativas — forward-only. Chaque action correspond à un battement
 * déjà latché par l'orchestrateur ; elles ne rejouent donc jamais deux fois.
 */
export const storyActions = {
  showMarkers: () => emit({ markersIn: true }),
  selectMarker: () => emit({ markerSelected: true }),
  openSheet: () => emit({ sheet: "peek" }),
  extendSheet: () => emit({ sheet: "extended" }),
  showOptions: () => emit({ flow: "options" }),
  showConfirm: () => emit({ flow: "confirm" }),
  confirmRequest: () => emit({ flow: "confirmed" }),
  arriveCard: () => emit({ arrived: true }),
  receiveRequest: () =>
    emit({
      kpi: { ...state.kpi, requests: dashboard.finalRequests },
      badge: 1,
      toasts: [
        ...state.toasts,
        {
          id: "toast-new-request",
          title: "Nouvelle demande reçue",
          description: `#${request.id} · ${requestLabel}`,
          status: "info" as const,
          duration: 6000,
        },
      ],
    }),
  switchToRequests: () => emit({ view: "requests" }),
  openDetail: () => emit({ view: "detail" }),
  markProcessing: () =>
    emit({
      status: "traitement",
      toasts: [
        ...state.toasts,
        {
          id: "toast-processing",
          title: "Demande acceptée",
          description: "La prise en charge a commencé.",
          status: "info" as const,
          duration: 5000,
        },
      ],
    }),
  markDone: () =>
    emit({
      status: "terminee",
      toasts: [
        ...state.toasts,
        {
          id: "toast-done",
          title: "Demande terminée",
          description: "Le traitement est terminé.",
          status: "success" as const,
          duration: 5000,
        },
      ],
    }),
  backToOverview: () =>
    emit({
      view: "overview",
      kpi: {
        requests: dashboard.finalRequests,
        completed: dashboard.finalCompleted,
        revenue: dashboard.finalRevenue,
      },
      chartBump: true,
      toasts: [
        ...state.toasts,
        {
          id: "toast-balance",
          title: "Solde mis à jour",
          description: balanceLabel,
          status: "success" as const,
          duration: 5000,
        },
      ],
    }),
  dismissToast: (id: string) =>
    emit({ toasts: state.toasts.filter((toast) => toast.id !== id) }),
  /** État final direct — réservé à prefers-reduced-motion. */
  applyFinalState: () => emit(finalState),
};

/* ------------------------------------------------------------------ */
/* Latches — un déclenchement unique par chargement de page (§26)      */
/* ------------------------------------------------------------------ */

const latched = new Set<BeatId>();

export const latch = {
  has: (id: BeatId) => latched.has(id),
  set: (id: BeatId) => latched.add(id),
  resetForTests: () => latched.clear(),
};
