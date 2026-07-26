import {
  Activity,
  ClipboardList,
  MapPin,
  ShieldCheck,
  UtensilsCrossed,
} from "lucide-react";

export function LoginVisual() {
  return (
    <div className="hidden md:block relative overflow-hidden h-screen bg-[#03150D]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=800')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-linear-to-tr from-[#02110a]/95 via-transparent to-black/20" />
      </div>

      <div className="relative inset-0 flex flex-col justify-between h-full z-10 p-8 lg:p-12">
        <div className="w-full flex justify-end">
          <div className="bg-[#042114]/94 backdrop-blur-md rounded-2xl p-5.5 border border-emerald-500/15 text-white shadow-2xl max-w-[340px] w-full">
            <div className="flex items-start gap-3 mb-4 select-none text-emerald-400">
              <div className="h-9.5 w-9.5 rounded-full bg-emerald-950/70 border border-emerald-800/40 flex items-center justify-center">
                <Activity className="h-4.5 w-4.5 text-emerald-400" />
              </div>
              <div className="flex-1 leading-tight">
                <h4 className="text-[13px] font-extrabold text-white tracking-wide">
                  Pilotez. Analysez. Développez.
                </h4>
                <p className="text-[10px] text-white/55 font-semibold mt-0.5">
                  Toutes vos opérations au même endroit.
                </p>
              </div>
            </div>

            <div className="border-t border-emerald-500/10 mb-4" />

            <div className="space-y-3 select-none">
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2.5 text-white/80">
                  <ClipboardList className="h-4 w-4 text-emerald-500/80" />
                  <span>Commandes et suivi en temps réel</span>
                </div>
                <ShieldCheck className="size-4 text-[#0cfa9c]" />
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2.5 text-white/80">
                  <UtensilsCrossed className="h-4 w-4 text-emerald-500/80" />
                  <span>Menu et disponibilités</span>
                </div>
                <ShieldCheck className="size-4 text-[#0cfa9c]" />
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2.5 text-white/80">
                  <Activity className="h-4 w-4 text-emerald-500/80" />
                  <span>Indicateurs de votre activité</span>
                </div>
                <ShieldCheck className="size-4 text-[#0cfa9c]" />
              </div>
            </div>
          </div>
        </div>

        <div className="w-full flex justify-start relative max-w-[340px]">
          <div className="bg-[#042114]/94 backdrop-blur-md rounded-2xl p-5.5 border border-emerald-500/15 text-white shadow-2xl relative w-full mb-2">
            <div className="absolute top-0 left-5 -translate-y-1/2 h-8.5 w-8.5 rounded-full bg-[#0F8A5F] border border-emerald-500/35 flex items-center justify-center text-white shadow-md">
              <MapPin className="h-4 w-4 text-white" />
            </div>

            <p className="text-[12px] leading-relaxed text-white/90 font-medium pt-1">
              Centralisez la carte, les commandes et le suivi de votre
              établissement dans un même espace.
            </p>

            <div className="mt-4 leading-tight">
              <span className="text-xs font-extrabold text-white block">
                Toutci — une app pour tout
              </span>
              <span className="text-[9.5px] text-white/60 font-semibold block mt-0.5">
                Pensée pour les établissements de Côte d’Ivoire
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
