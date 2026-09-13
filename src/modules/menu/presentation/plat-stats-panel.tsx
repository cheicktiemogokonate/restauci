interface PlatStatsPanelProps {
  nombreCommandes: number;
}

export default function PlatStatsPanel({
  nombreCommandes,
}: PlatStatsPanelProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Statistiques</h3>
      <div className="rounded-xl bg-gray-50 p-3 text-center">
        <p className="mb-1 text-xs text-gray-500">Commandes</p>
        <p className="text-lg font-bold text-gray-900">{nombreCommandes}</p>
      </div>
    </div>
  );
}
