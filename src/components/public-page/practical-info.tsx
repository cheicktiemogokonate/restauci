import { Restaurant } from "@/types";
import { Check, ChefHat, Clock, Copy, MapPin, Phone } from "lucide-react";
import { useState } from "react";

interface PracticalInfoProps {
  restaurant: Restaurant;
}

export default function PracticalInfo({ restaurant }: PracticalInfoProps) {
  const [copiedPhone, setCopiedPhone] = useState(false);

  const copyPhoneToClipboard = () => {
    navigator.clipboard.writeText(restaurant.telephone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // Format cuisines array into a readable string
  const cuisinesLabel =
    restaurant.cuisines && restaurant.cuisines.length > 0
      ? restaurant.cuisines.join(" • ")
      : "Cuisine variée";

  return (
    <div className="relative -mt-16 sm:-mt-24 z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 divide-y md:divide-y-0 lg:divide-x divide-gray-100">
          {/* Card 1: Horaires */}
          <div className="flex items-start gap-4 pb-4 md:pb-0">
            <div className="bg-[#0b663b]/10 text-[#0b663b] p-3 rounded-2xl shrink-0">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Ouvert aujourd'hui
              </h4>
              <p className="text-sm font-bold text-gray-900 mt-1">
                {restaurant.enLigne ? "En service" : "Fermé actuellement"}
              </p>
              <span
                className={`text-xs font-semibold mt-0.5 inline-block ${restaurant.enLigne ? "text-emerald-600" : "text-red-500"}`}
              >
                {restaurant.accepteCommandes
                  ? "Commandes acceptées"
                  : "Commandes fermées"}
              </span>
            </div>
          </div>

          {/* Card 2: Telephone */}
          <div className="flex items-start gap-4 pt-4 md:pt-0 pb-4 md:pb-0 lg:pl-6">
            <div className="bg-[#0b663b]/10 text-[#0b663b] p-3 rounded-2xl shrink-0">
              <Phone className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Téléphone
              </h4>
              <button
                onClick={copyPhoneToClipboard}
                className="group flex items-center gap-1.5 hover:text-[#0b663b] text-left focus:outline-none w-full cursor-pointer mt-1"
              >
                <span className="text-sm font-bold text-gray-900 group-hover:text-[#0b663b] transition truncate">
                  {restaurant.telephone}
                </span>
                {copiedPhone ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition shrink-0" />
                )}
              </button>
              <span className="text-xs text-gray-400 font-medium mt-0.5 block">
                Cliquez pour copier
              </span>
            </div>
          </div>

          {/* Card 3: Adresse */}
          <div className="flex items-start gap-4 pt-4 md:pt-0 pb-4 md:pb-0 lg:pl-6">
            <div className="bg-[#0b663b]/10 text-[#0b663b] p-3 rounded-2xl shrink-0">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Adresse
              </h4>
              <p className="text-sm font-bold text-gray-900 mt-1 leading-snug">
                {restaurant.adresse}
              </p>
              <span className="text-xs text-gray-400 font-medium tracking-wide inline-block mt-0.5">
                {restaurant.ville ?? "Abidjan"},{" "}
                {restaurant.pays ?? "Côte d'Ivoire"}
              </span>
            </div>
          </div>

          {/* Card 4: Cuisine */}
          <div className="flex items-start gap-4 pt-4 md:pt-0 lg:pl-6">
            <div className="bg-[#0b663b]/10 text-[#0b663b] p-3 rounded-2xl shrink-0">
              <ChefHat className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Cuisine
              </h4>
              <p className="text-sm font-bold text-gray-900 mt-1">
                {cuisinesLabel}
              </p>
              {restaurant.tempsPreparationMoyen != null && (
                <span className="text-xs text-gray-400 font-medium block mt-0.5">
                  Préparation ~{restaurant.tempsPreparationMoyen} min
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
