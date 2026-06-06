export default function MenuInfoPanel() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Informations</h3>
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Statut</span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            Actif
          </span>
        </div>
        <div className="border-t border-gray-50" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Ajouté le</span>
          <span className="text-sm font-semibold text-gray-800">15 Août 2024</span>
        </div>
        <div className="border-t border-gray-50" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Dernière mise à jour</span>
          <span className="text-sm font-semibold text-gray-800">18 Mai 2025</span>
        </div>
      </div>
    </div>
  );
}