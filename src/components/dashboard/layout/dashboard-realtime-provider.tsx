"use client";

/**
 * DashboardRealtimeProvider
 *
 * Se connecte au flux SSE `/api/commandes/stream` une seule fois au niveau
 * du layout, et distribue les événements à toute l'application via
 * `RealtimeContext`. Aucun autre composant ne doit appeler
 * `useCommandesStream` directement — tout passe par `useRealtimeContext()`.
 *
 * Pour CHAQUE événement pertinent du restaurant, ce provider :
 *   1. Expose l'événement via `latestEvent` (consommateurs : liste commandes,
 *      navbar, page notifications).
 *   2. Joue un signal sonore différencié (double-bip).
 *   3. Affiche un toast Sonner avec les détails.
 *   4. Appelle `router.refresh()` (debounce 500ms) pour que les Server
 *      Components (liste des commandes, stats, etc.) se re-fetchent depuis
 *      la BDD — c'est la source de vérité unique pour la liste.
 *
 * L'AudioContext est créé/repris à la première interaction utilisateur pour
 * respecter la politique autoplay des navigateurs.
 *
 * `NotificationsClient` saute le son/toast pour tous ces types (via
 * `skipSoundFor`) pour éviter tout doublon — il ne gère que sa propre liste.
 */

import { useCommandesStream } from "@/hooks/use-commandes-stream";
import type { SseEvent } from "@/types/commandes";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

interface DashboardRealtimeProviderProps {
  restaurantId: string;
  children: React.ReactNode;
}

interface RealtimeContextValue {
  latestEvent: SseEvent | null;
  isConnected: boolean;
  retryCount: number;
}

// ─── Context ────────────────────────────────────────────────────────────────

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

/** Hook d'accès au contexte temps réel. Throw si utilisé hors provider. */
export function useRealtimeContext(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error(
      "useRealtimeContext doit être utilisé à l'intérieur d'un DashboardRealtimeProvider",
    );
  }
  return context;
}

// ─── Audio ──────────────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;

/** Déverrouille l'AudioContext lors de la première interaction utilisateur */
function unlockAudio() {
  if (audioUnlocked) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    audioCtx = new AudioCtx();
    // Un buffer vide suffit à lever la politique autoplay
    const buf = audioCtx.createBuffer(1, 1, 22050);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start(0);
    audioUnlocked = true;
  } catch {
    // silencieux
  }
}

/**
 * Joue un double-bip. `rising` → son " montant" pour une nouvelle commande,
 * `false` → son "descendant" pour un changement de statut / annulation.
 */
function playNotificationSound(rising = true) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = audioCtx ?? new AudioCtx();
    if (!audioCtx) audioCtx = ctx;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const beep = (startTime: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    };

    if (rising) {
      // Double-bip montant : nouvelle commande !
      beep(ctx.currentTime, 880);
      beep(ctx.currentTime + 0.35, 1100);
    } else {
      // Double-bip descendant : changement de statut / annulation
      beep(ctx.currentTime, 880);
      beep(ctx.currentTime + 0.35, 660);
    }
  } catch (e) {
    console.warn("[DashboardRealtime] Son impossible:", e);
  }
}

// Types d'événements qui doivent déclencher un `router.refresh()` pour
// re-fetcher les Server Components (liste des commandes, stats, etc.).
// La BDD reste la source de vérité unique : pas de mise à jour optimiste
// côté liste — on laisse le serveur renvoyer l'état frais.
const REFRESH_TRIGGER_TYPES = new Set([
  "nouvelle_commande",
  "commande_prete",
  "commande_annulee",
  "statut",
  "livreur_assigne",
  "restaurant_valide",
  "restaurant_rejete",
]);

// ─── Component ──────────────────────────────────────────────────────────────

export function DashboardRealtimeProvider({
  restaurantId,
  children,
}: DashboardRealtimeProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startRefreshTransition] = useTransition();
  // Éviter les doubles refresh trop rapprochés
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [latestEvent, setLatestEvent] = useState<SseEvent | null>(null);

  // Déverrouiller l'audio à la première interaction (clic, touche…)
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  const handleSseEvent = useCallback(
    (event: SseEvent) => {
      // 0. Exposer TOUS les événements aux consommateurs du Context
      setLatestEvent(event);

      if (!REFRESH_TRIGGER_TYPES.has(event.type)) return;

      // 1. Son différencié selon le type d'événement
      const rising =
        event.type === "nouvelle_commande" || event.type === "commande_prete";
      playNotificationSound(rising);

      // 2. Toast visuel Sonner adapté au type
      const data = (event.data ?? {}) as Record<string, unknown>;
      const numero = (data.numero as string | undefined) ?? "";
      const montant =
        data.total != null
          ? new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "XOF",
              maximumFractionDigits: 0,
            }).format(Number(data.total))
          : "";

      const commandeHref =
        data.lienId || data.id
          ? `/restaurateur/commandes/${(data.lienId as string) || (data.id as string)}`
          : "/restaurateur/commandes";

      if (event.type === "nouvelle_commande") {
        const modeLabel =
          data.modeCommande === "livraison"
            ? "🛵 Livraison"
            : data.modeCommande === "sur_place"
              ? "🍽️ Sur place"
              : "📦 À emporter";
        toast(`🛒 Nouvelle commande ${numero}`, {
          description: `${data.nomClient ?? "Client"} · ${modeLabel}${montant ? ` · ${montant}` : ""}`,
          duration: 8000,
          action: {
            label: "Voir",
            onClick: () => router.push(commandeHref),
          },
        });
      } else if (event.type === "commande_prete") {
        toast(`✅ Commande ${numero}`, {
          description: String(data.message ?? "La commande est prête."),
          duration: 7000,
        });
      } else if (event.type === "commande_annulee") {
        toast.error(`❌ Commande annulée ${numero}`, {
          description: String(data.message ?? "La commande a été annulée."),
          duration: 7000,
          action: {
            label: "Voir",
            onClick: () => router.push(commandeHref),
          },
        });
      } else if (event.type === "restaurant_valide") {
        toast.success("🎉 Restaurant validé", {
          description: String(
            data.message ?? "Votre restaurant est maintenant validé.",
          ),
          duration: 8000,
          action: {
            label: "Voir",
            onClick: () => router.push("/restaurateur"),
          },
        });
      } else if (event.type === "restaurant_rejete") {
        toast.error("📝 Demande à corriger", {
          description: String(
            data.message ?? "Consultez le motif puis corrigez votre dossier.",
          ),
          duration: 10000,
          action: {
            label: "Corriger",
            onClick: () => router.push("/restaurateur/profil"),
          },
        });
      } else if (event.type === "statut") {
        // Le geste vient déjà d'être confirmé dans l'interface. On diffuse
        // l'état aux autres vues sans ajouter un toast redondant.
      } else if (event.type === "livreur_assigne") {
        // Synchronisation discrète : la carte de commande indique déjà le
        // livreur assigné, sans interrompre l'opérateur avec un toast.
      } else {
        // statut : toast neutre (changement générique)
        const titreParam = data.titre as string | undefined;
        toast(titreParam ?? `🔄 Mise à jour ${numero}`.trim(), {
          description: String(data.message ?? ""),
          duration: 6000,
          action: {
            label: "Voir",
            onClick: () => router.push(commandeHref),
          },
        });
      }

      // 3. Réconciliation serveur. Les compteurs et commandes récentes du
      // dashboard sont déjà mis à jour localement dès la réception du flux.
      // Sur l'accueil, on attend donc une courte période calme avant de
      // réconcilier les graphiques et classements : cela évite de recréer tous
      // les blocs visibles à chaque commande tout en gardant une source de
      // vérité serveur. La transition conserve l'interface affichée.
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      // La liste des commandes applique elle-même les événements en temps
      // réel : sur cette route, un refresh RSC recréait toute la page et
      // introduisait le délai visible après chaque notification. Ailleurs,
      // les sections serveur du dashboard continuent d'être rafraîchies.
      if (pathname !== "/restaurateur/commandes") {
        const reconciliationDelay = pathname === "/restaurateur" ? 2_500 : 500;
        refreshTimeoutRef.current = setTimeout(() => {
          startRefreshTransition(() => router.refresh());
        }, reconciliationDelay);
      }
    },
    [pathname, router, startRefreshTransition],
  );

  // SSE toujours actif — seul appel à useCommandesStream de toute l'app
  const { isConnected, retryCount } = useCommandesStream(
    restaurantId,
    handleSseEvent,
  );

  return (
    <RealtimeContext.Provider value={{ latestEvent, isConnected, retryCount }}>
      {children}
    </RealtimeContext.Provider>
  );
}
