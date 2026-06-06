

export const mockMenuItems: MenuItem[] = [
  {
    id: "1",
    name: "Smokey Supreme Pizza",
    category: "Pizza",
    image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&h=400&fit=crop",
    rating: 4.5,
    reviewCount: 128,
    price: 12.0,
    badges: [{ label: "Personnalisable", color: "green" }],
  },
  {
    id: "2",
    name: "Saumon grillé",
    category: "Poisson",
    image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&h=400&fit=crop",
    rating: 4.7,
    reviewCount: 96,
    price: 22.0,
    badges: [
      { label: "Personnalisable", color: "green" },
      { label: "-10%", color: "red" },
    ],
  },
  {
    id: "3",
    name: "Poulet grillé",
    category: "Poulet",
    image: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600&h=400&fit=crop",
    rating: 4.8,
    reviewCount: 112,
    price: 18.0,
  },
  {
    id: "4",
    name: "Salade de crevettes épicée",
    category: "Salade",
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop",
    rating: 4.4,
    reviewCount: 74,
    price: 8.0,
  },
  {
    id: "5",
    name: "Moelleux au chocolat",
    category: "Dessert",
    image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&h=400&fit=crop",
    rating: 4.9,
    reviewCount: 87,
    price: 10.0,
    badges: [{ label: "Personnalisable", color: "green" }],
  },
  {
    id: "6",
    name: "Cheeseburger classique",
    category: "Burger",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop",
    rating: 4.6,
    reviewCount: 103,
    price: 10.0,
    badges: [
      { label: "Promo", color: "orange" },
      { label: "1 acheté = 1 offert", color: "yellow" },
    ],
  },
  {
    id: "7",
    name: "Spaghetti Carbonara",
    category: "Pâtes",
    image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600&h=400&fit=crop",
    rating: 4.7,
    reviewCount: 89,
    price: 15.0,
    badges: [{ label: "Offre saisonnière", color: "blue" }],
  },
  {
    id: "8",
    name: "Cuisses de dinde rôties",
    category: "Poulet",
    image: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&h=400&fit=crop",
    rating: 4.5,
    reviewCount: 67,
    price: 8.0,
    badges: [{ label: "Personnalisable", color: "green" }],
  },
  {
    id: "9",
    name: "Gâteau agrumes",
    category: "Dessert",
    image: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=600&h=400&fit=crop",
    rating: 4.8,
    reviewCount: 59,
    price: 8.5,
    badges: [{ label: "Remise membre", color: "blue" }],
  },
];

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  image: string;
  rating: number;
  reviewCount: number;
  price: number;
  badges?: Array<{ label: string; color: "green" | "red" | "orange" | "blue" | "yellow" }>;
}

interface MenuCardProps {
  item: MenuItem;
}

const badgeStyles: Record<string, string> = {
  green: "bg-green-100 text-green-700 border-green-200",
  red: "bg-red-100 text-red-600 border-red-200",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = rating >= i;
        const half = !filled && rating >= i - 0.5;
        return (
          <svg key={i} className={`w-3.5 h-3.5 ${filled || half ? "text-amber-400" : "text-gray-200"}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        );
      })}
    </div>
  );
}

export default function MenuCard({ item }: MenuCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
      {/* Image */}
      <div className="relative h-52 overflow-hidden bg-gray-100">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/400x208/f3f4f6/9ca3af?text=🍽"; }}
        />
        {/* Badges */}
        {item.badges && item.badges.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {item.badges.map((badge, i) => (
              <span key={i} className={`text-xs font-semibold px-2.5 py-1 rounded-lg border backdrop-blur-sm bg-opacity-90 ${badgeStyles[badge.color]}`}>
                {badge.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">{item.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{item.category}</p>
          </div>
          <button className="p-1 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center gap-1.5">
            <StarRating rating={item.rating} />
            <span className="text-xs font-semibold text-gray-700">{item.rating}</span>
            <span className="text-xs text-gray-400">({item.reviewCount})</span>
          </div>
          <span className="text-sm font-bold text-gray-900">{item.price.toFixed(2)} €</span>
        </div>
      </div>
    </div>
  );
}