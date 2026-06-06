"use client";

import { useState } from "react";

const weekData = [
  { day: "Lun", value: 14 },
  { day: "Mar", value: 12 },
  { day: "Mer", value: 9 },
  { day: "Jeu", value: 13 },
  { day: "Ven", value: 15 },
  { day: "Sam", value: 17 },
  { day: "Dim", value: 13 },
];

export default function OrdersChart() {
  const [period, setPeriod] = useState("Cette semaine");
  const max = Math.max(...weekData.map((d) => d.value));
  const yTicks = [0, 5, 10, 15, 20];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-gray-900">Aperçu des commandes</h3>
        <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          {period}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>

      {/* Chart */}
      <div className="flex items-end gap-0">
        {/* Y axis */}
        <div className="flex flex-col-reverse justify-between h-44 pr-3 pb-6">
          {yTicks.map((t) => (
            <span key={t} className="text-[10px] text-gray-400 leading-none">{t}</span>
          ))}
        </div>

        {/* Bars + x labels */}
        <div className="flex-1 flex flex-col gap-0">
          <div className="flex items-end gap-2 h-44">
            {weekData.map((d) => {
              const heightPct = (d.value / 20) * 100;
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1 group">
                  {/* Value label */}
                  <span className="text-[10px] font-semibold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.value}
                  </span>
                  {/* Value on top (always visible) */}
                  <div className="flex-1 flex flex-col justify-end w-full">
                    <div className="relative w-full flex flex-col items-center justify-end" style={{ height: "100%" }}>
                      {/* Static label above bar */}
                      <span className="absolute text-[10px] font-semibold text-gray-700" style={{ bottom: `calc(${heightPct}% + 4px)` }}>
                        {d.value}
                      </span>
                      <div
                        className="w-full rounded-t-lg bg-green-800 hover:bg-green-600 transition-colors cursor-pointer"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* X axis labels */}
          <div className="flex gap-2 mt-2">
            {weekData.map((d) => (
              <div key={d.day} className="flex-1 text-center">
                <span className="text-[11px] text-gray-400">{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}