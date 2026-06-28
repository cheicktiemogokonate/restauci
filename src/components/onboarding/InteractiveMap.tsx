import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
} from "@/components/ui/map";
import { Locate, MapPin, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface InteractiveMapProps {
  latitude: number;
  longitude: number;
  commune: string;
  onCoordinatesChange: (
    lat: number,
    lng: number,
    commune: string,
    quarter?: string,
    address?: string,
  ) => void;
}

export default function InteractiveMap({
  latitude,
  longitude,
  commune,
  onCoordinatesChange,
}: InteractiveMapProps) {
  const [pinPos, setPinPos] = useState({
    lat: latitude || 5.3484,
    lng: longitude || -3.9878,
  });

  useEffect(() => {
    if (latitude && longitude) {
      Promise.resolve().then(() => {
        setPinPos({ lat: latitude, lng: longitude });
      });
    }
  }, [latitude, longitude]);

  const handleDragEnd = (lngLat: { lng: number; lat: number }) => {
    const finalLat = Number(lngLat.lat.toFixed(5));
    const finalLng = Number(lngLat.lng.toFixed(5));
    setPinPos({ lat: finalLat, lng: finalLng });
    // Minimal reverse geocoding approximation for demonstration
    onCoordinatesChange(
      finalLat,
      finalLng,
      commune,
      "Quartier",
      "Adresse sélectionnée",
    );
  };

  const handleRecentrer = () => {
    const marcory = { lat: 5.3065, lng: -4.0133 };
    setPinPos(marcory);
    onCoordinatesChange(
      marcory.lat,
      marcory.lng,
      "Marcory",
      "Zone 4",
      "Rue des Jardins, Immeuble 12, Marcory Zone 4, Abidjan, Côte d'Ivoire",
    );
  };

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-xs relative bg-sky-50/20 h-75">
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button
          type="button"
          onClick={handleRecentrer}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 rounded-lg shadow-sm transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
          <span>Recentrer</span>
        </button>
      </div>

      <Map
        className="absolute inset-0 w-full h-full"
        viewport={{ center: [pinPos.lng, pinPos.lat], zoom: 12 }}
      >
        <MapControls showZoom showLocate position="bottom-right" />
        <MapMarker
          longitude={pinPos.lng}
          latitude={pinPos.lat}
          draggable
          onDragEnd={handleDragEnd}
        >
          <MarkerContent>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10b981]/20 border border-[#10b981] animate-pulse relative">
              <div className="absolute h-6 w-6 rounded-full bg-[#10b981] flex items-center justify-center text-white shadow-md">
                <MapPin className="h-4 w-4" />
              </div>
            </div>
          </MarkerContent>
        </MapMarker>
      </Map>

      <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-100 text-[10px] font-mono text-gray-700 shadow-sm flex items-center space-x-2">
        <Locate className="w-3 h-3 text-emerald-600 animate-pulse" />
        <span>
          GPS: {pinPos.lat.toFixed(4)}°, {pinPos.lng.toFixed(4)}° ({commune})
        </span>
      </div>

      <div className="absolute top-4 left-4 z-20 bg-brand-50/90 text-brand-700 font-sans border border-brand-100 font-semibold px-2.5 py-1 text-[10px] uppercase rounded-md tracking-wider">
        Carte Interactive
      </div>
    </div>
  );
}
