interface PlatStatsPanelProps {
  nombreCommandes: number;
  noteMoyenne: number;
  nombreAvis: number;
}

export default function PlatStatsPanel({
  nombreCommandes,
  noteMoyenne,
  nombreAvis,
}: PlatStatsPanelProps) {
  const stats = [
    { label: "Commandes", value: nombreCommandes },
    { label: "Note moyenne", value: `${noteMoyenne.toFixed(1)}/5` },
    { label: "Avis", value: nombreAvis },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Statistiques</h3>
      <div className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className="text-lg font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
