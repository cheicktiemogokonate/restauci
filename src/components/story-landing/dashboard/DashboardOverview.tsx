"use client";

import { chart } from "../story-data";
import { useStory } from "../animation-state";
import { KpiCard } from "../ui/KpiCard";
import BarChart from "../vendor/bar-chart";

/** Vue d'ensemble du mockup Safari : sidebar + 3 KPI + 1 graphique (spec §13). */
export function DashboardOverview() {
  const kpi = useStory((s) => s.kpi);
  const chartBump = useStory((s) => s.chartBump);

  return (
    <div className="flex h-full flex-col gap-5 p-6">
      <div>
        <h3 className="text-lg font-bold text-[#22312A]">Vue d'ensemble</h3>
        <p className="text-xs text-[#7A8A80]">
          Aujourd'hui, tout se passe bien.
        </p>
      </div>

      <div className="flex gap-4">
        <KpiCard label="Demandes aujourd'hui" value={kpi.requests} />
        <KpiCard label="Terminées" value={kpi.completed} />
        <KpiCard label="Revenus" value={kpi.revenue} suffix=" FCFA" />
      </div>

      <div className="flex flex-1 flex-col rounded-xl border border-[#E3EAE5] bg-white p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h4 className="text-sm font-bold text-[#22312A]">{chart.title}</h4>
          <span className="text-[11px] text-[#7A8A80]">7 jours</span>
        </div>
        <div className="flex min-h-0 flex-1 items-end">
          <BarChart
            className="h-full max-h-40"
            items={(chartBump ? chart.final : chart.initial).map(
              (progress, i) => ({
                progress,
                label: chart.days[i],
                // Le dernier jour (Dim) réagit à la demande traitée (§20).
                className: `rounded-[4px] ${
                  chartBump && i === chart.initial.length - 1
                    ? "bg-primary"
                    : "bg-primary/30"
                }`,
              }),
            )}
          />
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-[#9AA9A0]">
          {chart.days.map((day) => (
            <span key={day} className="flex-1 text-center">
              {day}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
