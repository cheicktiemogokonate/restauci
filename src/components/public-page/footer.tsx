import { Restaurant } from "@/types";
import {
  ArrowUpRight,
  Compass,
  Mail,
  MapPin,
  Phone,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useState } from "react";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
} from "@/components/ui/map";

interface FooterProps {
  restaurant: Restaurant;
}

export default function Footer({ restaurant }: FooterProps) {
  const [copiedLink, setCopiedLink] = useState<string | false>(false);

  const handleSocialClick = (platform: string) => {
    setCopiedLink(platform);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Build Google Maps URL from restaurant coordinates or address
  const mapsUrl =
    restaurant.latitude && restaurant.longitude
      ? `https://maps.google.com/?q=${restaurant.latitude},${restaurant.longitude}`
      : `https://maps.google.com/?q=${encodeURIComponent(restaurant.adresse + ", " + (restaurant.ville ?? "") + ", " + (restaurant.pays ?? "Côte d'Ivoire"))}`;

  return (
    <footer
      id="contact"
      className="bg-[#fafaf8] border-t border-gray-100 py-16"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Dynamic Map and info splits */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Map display column - left (7 of 12 fields) */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xs uppercase font-extrabold text-[#0b663b] tracking-widest flex items-center gap-1.5">
              <span className="w-6 h-0.5 bg-[#0b663b] inline-block" />
              Nous localiser
            </h3>

            {/* Elegant Map container with Google Maps styled navigation layout */}
            <div className="relative rounded-3xl overflow-hidden shadow-lg aspect-video w-full border border-gray-100 group">
              <Map
                viewport={{
                  center: [
                    restaurant.longitude ?? -4.0083,
                    restaurant.latitude ?? 5.3096,
                  ],
                  zoom: 14,
                }}
                className="w-full h-full z-0"
              >
                {restaurant.longitude !== null && restaurant.latitude !== null && (
                  <MapMarker
                    longitude={restaurant.longitude}
                    latitude={restaurant.latitude}
                  >
                    <MarkerContent>
                      <div className="relative flex items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-[#0b663b] opacity-45"></span>
                        <div className="relative h-10 w-10 rounded-full bg-white shadow-xl flex items-center justify-center border border-gray-100">
                          <MapPin className="h-5 w-5 text-[#0b663b] fill-[#0b663b]/10" />
                        </div>
                      </div>
                    </MarkerContent>
                  </MapMarker>
                )}
                <MapControls position="bottom-right" />
              </Map>

              {/* Floating controls on Map top left */}
              <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-gray-100 shadow-md text-[10px] font-bold text-gray-800 flex items-center gap-1.5 pointer-events-none">
                <MapPin className="h-3.5 w-3.5 text-[#0b663b] animate-bounce" />
                <span>{restaurant.adresse}</span>
              </div>

              {/* Open in Google Maps link button bottom left */}
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-4 left-4 bg-gray-900/90 hover:bg-gray-950 text-white/95 text-[10px] font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md backdrop-blur-xs transition"
              >
                <span>Ouvrir dans Google Maps</span>
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Restaurant details column - right (5 of 12 fields) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="bg-[#0b663b] text-white p-2 rounded-xl">
                  <Compass className="h-5 w-5 text-[#e2b34a] transform rotate-45" />
                </div>
                <h3 className="text-xl font-extrabold text-gray-950 font-serif tracking-tight">
                  {restaurant.nom}
                </h3>
              </div>
              {restaurant.description && (
                <p className="text-sm text-gray-500 font-light leading-relaxed">
                  {restaurant.description}
                </p>
              )}
            </div>

            {/* Practical list infos */}
            <div className="space-y-3 text-xs text-gray-700 font-semibold">
              {restaurant.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-[#0b663b]" />
                  <a
                    href={`mailto:${restaurant.email}`}
                    className="hover:text-[#0b663b] hover:underline font-bold"
                  >
                    {restaurant.email}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-[#0b663b]" />
                <a
                  href={`tel:${restaurant.telephone}`}
                  className="hover:text-[#0b663b] hover:underline font-bold"
                >
                  {restaurant.telephone}
                </a>
              </div>
            </div>

            {/* Social channels */}
            {(restaurant.whatsapp ||
              restaurant.instagram ||
              restaurant.facebook) && (
              <div className="space-y-2.5">
                <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
                  Suivez-nous sur les réseaux
                </h4>
                <div className="flex items-center gap-2.5 relative">
                  {restaurant.whatsapp && (
                    <a
                      href={`https://wa.me/${restaurant.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      WhatsApp
                    </a>
                  )}
                  {restaurant.instagram && (
                    <a
                      href={
                        restaurant.instagram.startsWith("http")
                          ? restaurant.instagram
                          : `https://instagram.com/${restaurant.instagram}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-pink-50 hover:bg-pink-100 text-pink-800 border border-pink-100 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Instagram
                    </a>
                  )}
                  {restaurant.facebook && (
                    <a
                      href={
                        restaurant.facebook.startsWith("http")
                          ? restaurant.facebook
                          : `https://facebook.com/${restaurant.facebook}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-100 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Facebook
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom footer links metadata block */}
        <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-400 font-medium">
          <p>© 2026 RestauCI. Tous droits réservés.</p>
          <div className="flex flex-wrap gap-4 sm:gap-6 justify-center">
            {[
              "Mentions légales",
              "Politique de confidentialité",
              "Conditions d'utilisation",
            ].map((term) => (
              <a
                key={term}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert(`Affichage des : ${term}`);
                }}
                className="hover:text-gray-900 hover:underline transition"
              >
                {term}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
