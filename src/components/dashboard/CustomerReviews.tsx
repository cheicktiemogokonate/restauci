"use client";

import { useState } from "react";

const reviews = [
  {
    name: "Sarah L.",
    date: "12 Oct. 2024",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
    text: "Absolument délicieux ! La mangue et la coco se marient parfaitement, très frais et équilibré.",
  },
  {
    name: "Michael T.",
    date: "10 Oct. 2024",
    rating: 4,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
    text: "Très bon et rafraîchissant. J'aurais aimé une portion un peu plus grande, mais excellent choix !",
  },
  {
    name: "Emma R.",
    date: "8 Oct. 2024",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face",
    text: "Mon bol préféré après le sport ! Léger, sain et plein de saveurs. Je recommande à 100%.",
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i <= count ? "text-amber-400" : "text-gray-200"}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default function CustomerReviews() {
  const [page, setPage] = useState(0);
  const totalPages = 2;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Avis clients</h3>
        <button className="flex items-center gap-1 text-sm text-green-700 font-semibold hover:text-green-800 transition-colors">
          Voir tous les avis
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>

      {/* Reviews grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reviews.map((r, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
            {/* Reviewer */}
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                <img
                  src={r.avatar}
                  alt={r.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&size=36`; }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{r.name}</p>
                <p className="text-xs text-gray-400">{r.date}</p>
              </div>
            </div>
            {/* Stars + rating */}
            <div className="flex items-center gap-1.5 mb-2">
              <Stars count={r.rating} />
              <span className="text-xs font-bold text-gray-700">{r.rating}</span>
            </div>
            {/* Text */}
            <p className="text-xs text-gray-600 leading-relaxed">{r.text}</p>
          </div>
        ))}
      </div>

      {/* Carousel dots */}
      <div className="flex items-center justify-center gap-1.5 mt-4">
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => setPage(i)}
            className={`rounded-full transition-all ${
              page === i ? "w-5 h-2 bg-green-700" : "w-2 h-2 bg-gray-300 hover:bg-gray-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}