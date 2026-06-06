import React, { useRef, useState, useEffect } from "react";
import { Locate, RefreshCw, Pin } from "lucide-react";

interface InteractiveMapProps {
  latitude: number;
  longitude: number;
  commune: string;
  onCoordinatesChange: (lat: number, lng: number, commune: string, quarter?: string, address?: string) => void;
}

// Communes definition with positions on our custom 600x300 SVG canvas
const COMMUNES_GEO = [
  { name: "Cocody", lat: 5.3484, lng: -3.9878, x: 380, y: 70, defaultQuarter: "Riviera 3" },
  { name: "Marcory", lat: 5.3115, lng: -4.0044, x: 350, y: 190, defaultQuarter: "Zone 4C" },
  { name: "Plateau", lat: 5.3248, lng: -4.0210, x: 260, y: 140, defaultQuarter: "Avenue Chardy" },
  { name: "Treichville", lat: 5.3087, lng: -4.0251, x: 250, y: 195, defaultQuarter: "Avenue 16" },
  { name: "Yopougon", lat: 5.3400, lng: -4.0800, x: 100, y: 100, defaultQuarter: "Zone Industrielle" },
  { name: "Koumassi", lat: 5.2974, lng: -3.9624, x: 440, y: 220, defaultQuarter: "Soweto" },
  { name: "Port-Bouët", lat: 5.2684, lng: -3.9612, x: 450, y: 280, defaultQuarter: "Phare" },
  { name: "Adjamé", lat: 5.3572, lng: -4.0244, x: 250, y: 80, defaultQuarter: "Mirador" }
];

export default function InteractiveMap({ latitude, longitude, commune, onCoordinatesChange }: InteractiveMapProps) {
  const mapRef = useRef<SVGSVGElement | null>(null);
  const [pinPos, setPinPos] = useState({ x: 350, y: 190 }); // Default in Marcory

  // Sync incoming Coordinates to Pin Position
  useEffect(() => {
    // Find closest commune to map back to x,y visually
    const currentCommune = COMMUNES_GEO.find(c => c.name.toLowerCase() === commune.toLowerCase());
    if (currentCommune) {
      setPinPos({ x: currentCommune.x, y: currentCommune.y });
    } else {
      // Interpolate coordinates roughly onto visual canvas
      // Lat range: 5.25 (y=290) to 5.37 (y=40)
      // Lng range: -4.10 (x=50) to -3.93 (x=550)
      const y = 290 - ((latitude - 5.25) / (5.37 - 5.25)) * 250;
      const x = 50 + ((longitude - (-4.10)) / (-3.93 - (-4.10))) * 500;
      setPinPos({ x: Math.max(20, Math.min(580, x)), y: Math.max(20, Math.min(280, y)) });
    }
  }, [latitude, longitude, commune]);

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert pixel coordinates to aspect ratio based coordinates inside our 600x300 viewbox
    const viewBoxWidth = 600;
    const viewBoxHeight = 300;
    const x = (clickX / rect.width) * viewBoxWidth;
    const y = (clickY / rect.height) * viewBoxHeight;

    // Find the closest commune to coordinate click
    let closest = COMMUNES_GEO[0];
    let minDist = Infinity;

    COMMUNES_GEO.forEach((com) => {
      const dist = Math.hypot(com.x - x, com.y - y);
      if (dist < minDist) {
        minDist = dist;
        closest = com;
      }
    });

    // Make the pin slightly snap to click area but compute realistic offset
    const finalLat = Number((closest.lat + (Math.random() * 0.004 - 0.002)).toFixed(5));
    const finalLng = Number((closest.lng + (Math.random() * 0.004 - 0.002)).toFixed(5));

    setPinPos({ x, y });
    
    // Address template auto-generator in French
    const address = `Rue de l'Étoile, Immeuble ${Math.floor(Math.random() * 45) + 1}, ${closest.name} ${closest.defaultQuarter}, Abidjan, Côte d'Ivoire`;

    onCoordinatesChange(finalLat, finalLng, closest.name, closest.defaultQuarter, address);
  };

  const handleRecentrer = () => {
    // Resets back to Marcory Zone 4 (default)
    const marcory = COMMUNES_GEO[1];
    setPinPos({ x: marcory.x, y: marcory.y });
    onCoordinatesChange(5.3065, -4.0133, "Marcory", "Zone 4", "Rue des Jardins, Immeuble 12, Marcory Zone 4, Abidjan, Côte d'Ivoire");
  };

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-xs relative bg-sky-50/20">
      {/* Map controller bars */}
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

      {/* SVG Premium Minimalist Map of Abidjan */}
      <svg
        ref={mapRef}
        viewBox="0 0 600 300"
        className="w-full h-auto cursor-crosshair select-none bg-emerald-50/10"
        onClick={handleMapClick}
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="lagoon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#7dd3fc" />
          </linearGradient>
          <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        {/* Ebrié Lagoon (Waterbody) in beautiful geometric shapes */}
        <path
          d="M 0 160 Q 150 140 220 180 T 360 160 T 520 220 T 600 240 L 600 300 L 0 300 Z"
          fill="url(#lagoon)"
          opacity="0.8"
        />
        <path
          d="M 50 180 Q 120 230 180 180 T 300 210 T 450 160"
          fill="none"
          stroke="#93c5fd"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Bridges of Abidjan (Stunning detail) */}
        {/* Pont Houphouët-Boigny & Pont De Gaulle */}
        <line x1="255" y1="140" x2="250" y2="195" stroke="#94a3b8" strokeWidth="4" strokeDasharray="2 1" />
        <line x1="265" y1="140" x2="260" y2="195" stroke="#94a3b8" strokeWidth="4" strokeDasharray="2 1" />
        {/* Pont Henri Konan Bédié */}
        <line x1="375" y1="120" x2="350" y2="190" stroke="#cbd5e1" strokeWidth="3" />
        {/* New 5th Bridge (Plateau - Cocody) */}
        <line x1="260" y1="140" x2="360" y2="100" stroke="#e2e8f0" strokeWidth="2" />

        {/* Land highlights / grids for aesthetic technical feel */}
        <g stroke="#f1f5f9" strokeWidth="1">
          <line x1="100" y1="0" x2="100" y2="300" strokeDasharray="4 4" />
          <line x1="300" y1="0" x2="300" y2="300" strokeDasharray="4 4" />
          <line x1="500" y1="0" x2="500" y2="300" strokeDasharray="4 4" />
          <line x1="0" y1="100" x2="600" y2="100" strokeDasharray="4 4" />
          <line x1="0" y1="200" x2="600" y2="200" strokeDasharray="4 4" />
        </g>

        {/* Neighborhood visual anchors (Communes) */}
        {COMMUNES_GEO.map((com) => {
          const isSelected = commune.toLowerCase() === com.name.toLowerCase();
          return (
            <g key={com.name}>
              {/* Soft pulsing hub under selection */}
              {isSelected && (
                <circle cx={com.x} cy={com.y} r="18" fill="#10b981" className="animate-ping" opacity="0.15" />
              )}
              {/* Main anchor circle */}
              <circle
                cx={com.x}
                cy={com.y}
                r={isSelected ? "6" : "4"}
                fill={isSelected ? "#10b981" : "#94a3b8"}
                className="transition-all duration-300"
              />
              {/* Text label */}
              <text
                x={com.x}
                y={com.y - 10}
                className={`text-[10px] font-sans font-semibold tracking-wider text-center select-none cursor-pointer transition-all ${
                  isSelected ? "fill-emerald-700 text-xs font-black scale-105" : "fill-gray-400"
                }`}
                textAnchor="middle"
              >
                {com.name.toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* Draggable Active Pointer Pin - styled with green and light halo */}
        <g transform={`translate(${pinPos.x}, ${pinPos.y})`} className="transition-all duration-200">
          <circle cx="0" cy="0" r="14" fill="#15803d" opacity="0.2" />
          <circle cx="0" cy="0" r="6" fill="#ffffff" stroke="#15803d" strokeWidth="3" />
          <path
            d="M 0 0 L -8 -18 A 9 9 0 0 1 8 -18 Z"
            fill="#15803d"
            stroke="#ffffff"
            strokeWidth="1"
            transform="translate(0, -2)"
          />
          {/* Inner white circle in localizer */}
          <circle cx="0" cy="-11" r="3" fill="#ffffff" />
        </g>
      </svg>

      {/* Map Footer showing coordinates instantly */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-100 text-[10px] font-mono text-gray-700 shadow-sm flex items-center space-x-2">
        <Locate className="w-3 h-3 text-emerald-600 animate-pulse" />
        <span>GPS: {latitude.toFixed(4)}°, {longitude.toFixed(4)}° ({commune})</span>
      </div>

      <div className="absolute top-4 left-4 z-20 bg-brand-50/90 text-brand-700 font-sans border border-brand-100 font-semibold px-2.5 py-1 text-[10px] uppercase rounded-md tracking-wider">
        Carte Interactive d'Abidjan
      </div>
    </div>
  );
}
