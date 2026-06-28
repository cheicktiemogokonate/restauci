import { formatDate } from "@/lib/utils/format";

interface MenuInfoPanelProps {
  disponible: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export default function MenuInfoPanel({
  disponible,
  createdAt,
  updatedAt,
}: MenuInfoPanelProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Informations</h3>
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Statut</span>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
              disponible
                ? "text-green-700 bg-green-50 border-green-200"
                : "text-zinc-600 bg-zinc-100 border-zinc-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full inline-block ${
                disponible ? "bg-green-500" : "bg-zinc-400"
              }`}
            />
            {disponible ? "Disponible" : "Indisponible"}
          </span>
        </div>
        <div className="border-t border-gray-50" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Ajouté le</span>
          <span className="text-sm font-semibold text-gray-800">
            {formatDate(createdAt)}
          </span>
        </div>
        <div className="border-t border-gray-50" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Dernière mise à jour</span>
          <span className="text-sm font-semibold text-gray-800">
            {formatDate(updatedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
