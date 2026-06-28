import { formatEuro } from "@/lib/utils/format";
import {
  Activity,
  Bell,
  ClipboardList,
  Grid,
  Quote,
  Star,
  TrendingUp,
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
                  <span>Commandes aujourd&apos;hui</span>
                </div>
                <span className="text-[#0cfa9c] font-bold text-sm">128</span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2.5 text-white/80">
                  <Grid className="h-4 w-4 text-emerald-500/80" />
                  <span>Tables occupées</span>
                </div>
                <span className="text-[#0cfa9c] font-bold text-sm">24</span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2.5 text-white/80">
                  <TrendingUp className="h-4 w-4 text-emerald-500/80" />
                  <span>Chiffre d&apos;affaires</span>
                </div>
                <span className="text-[#0cfa9c] font-bold text-sm">
                  {formatEuro(2450)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2.5 text-white/80">
                  <Bell className="h-4 w-4 text-emerald-500/80" />
                  <span>Alertes de stock</span>
                </div>
                <span className="text-[#fca5a5] font-bold text-sm">3</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full flex justify-start relative max-w-[340px]">
          <div className="bg-[#042114]/94 backdrop-blur-md rounded-2xl p-5.5 border border-emerald-500/15 text-white shadow-2xl relative w-full mb-2">
            <div className="absolute top-0 left-5 -translate-y-1/2 h-8.5 w-8.5 rounded-full bg-[#0F8A5F] border border-emerald-500/35 flex items-center justify-center text-white shadow-md">
              <Quote className="h-4 w-4 text-white fill-white" />
            </div>

            <p className="text-[12px] leading-relaxed text-white/90 font-medium pt-1">
              &ldquo;RestauCI nous a permis de gagner en efficacité et
              d&apos;offrir une meilleure expérience à nos clients.&rdquo;
            </p>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2.5">
                <img
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=80"
                  alt="Sarah L."
                  width={80}
                  height={80}
                  className="h-8 w-8 rounded-full object-cover border border-emerald-500/20"
                />
                <div className="leading-tight">
                  <span className="text-xs font-extrabold text-white block">
                    Sarah L.
                  </span>
                  <span className="text-[9.5px] text-white/60 font-semibold block mt-0.5">
                    Gérante - Bistro Gourmet
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className="h-3.5 w-3.5 fill-[#eab308] text-[#eab308]"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
