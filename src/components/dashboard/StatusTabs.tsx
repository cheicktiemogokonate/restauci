"use client";

import { OrderStatus } from "./OrderCard";

type Tab = "Toutes" | OrderStatus;

interface StatusTabsProps {
  activeTab: Tab;
  counts: Record<Tab, number>;
  onChange: (tab: Tab) => void;
}

const tabs: Tab[] = ["Toutes", "En préparation", "Prête", "Annulée"];

export default function StatusTabs({ activeTab, counts, onChange }: StatusTabsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              isActive
                ? "bg-brand-green text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab}
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {counts[tab]}
            </span>
          </button>
        );
      })}
    </div>
  );
}