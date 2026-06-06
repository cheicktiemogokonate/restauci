const similar = [
  {
    name: "Nuts Berries Oatmeal",
    category: "Dessert",
    rating: 4.7,
    price: 10.0,
    image: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=100&h=100&fit=crop",
  },
  {
    name: "Pineapple Paradise Smoothie",
    category: "Boissons",
    rating: 4.5,
    price: 8.0,
    image: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=100&h=100&fit=crop",
  },
  {
    name: "Green Detox Juice",
    category: "Boissons",
    rating: 4.2,
    price: 7.0,
    image: "https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=100&h=100&fit=crop",
  },
  {
    name: "Tropical Fruit Salad",
    category: "Dessert",
    rating: 4.6,
    price: 7.0,
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=100&h=100&fit=crop",
  },
];

export default function SimilarDishes() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Plats similaires</h3>
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        {similar.map((item, i) => (
          <div key={i} className="flex items-center gap-3 group cursor-pointer">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/56x56/f3f4f6/9ca3af?text=🍽"; }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{item.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.category}</p>
              <div className="flex items-center gap-1 mt-1">
                <svg className="w-3 h-3 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="text-xs font-semibold text-gray-600">{item.rating}</span>
              </div>
            </div>
            <span className="text-sm font-bold text-gray-900 flex-shrink-0">{item.price.toFixed(2)} €</span>
          </div>
        ))}
      </div>
    </div>
  );
}