const items = [
  {
    name: "Smokey Supreme Pizza",
    category: "Pizza",
    qty: 1,
    note: "Extra cheese",
    unitPrice: 12.0,
    total: 12.0,
    image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=80&h=80&fit=crop",
  },
  {
    name: "Garlic Bread",
    category: "Boulangerie",
    qty: 1,
    note: "Légèrement grillé",
    unitPrice: 5.0,
    total: 5.0,
    image: "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=80&h=80&fit=crop",
  },
  {
    name: "Caesar Salad",
    category: "Salade",
    qty: 2,
    note: "Sauce à part",
    unitPrice: 8.0,
    total: 16.0,
    image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=80&h=80&fit=crop",
  },
  {
    name: "Chocolate Lava Cake",
    category: "Dessert",
    qty: 1,
    note: "Extra chocolat",
    unitPrice: 10.0,
    total: 10.0,
    image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=80&h=80&fit=crop",
  },
];

export default function OrderItemsTable() {
  const subtotal = items.reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-gray-900">Articles commandés</h3>
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3">Article</th>
            <th className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3">Qté</th>
            <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3">Notes</th>
            <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3">Prix unitaire</th>
            <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.map((item, i) => (
            <tr key={i} className="group">
              <td className="py-3.5 pr-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/44x44/f3f4f6/9ca3af?text=🍽"; }}
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 leading-tight">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.category}</p>
                  </div>
                </div>
              </td>
              <td className="py-3.5 text-center">
                <span className="text-gray-700 font-medium">{item.qty}</span>
              </td>
              <td className="py-3.5 pr-4">
                <span className="inline-block text-xs text-gray-600 bg-gray-100 rounded-lg px-2.5 py-1 font-medium">
                  {item.note}
                </span>
              </td>
              <td className="py-3.5 text-right text-gray-600">{item.unitPrice.toFixed(2)} €</td>
              <td className="py-3.5 text-right font-semibold text-gray-800">{item.total.toFixed(2)} €</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="border-t border-gray-100 mt-2 pt-4 space-y-2">
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Sous-total</span>
              <span>{subtotal.toFixed(2)} €</span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-2">
              <span className="font-semibold text-gray-900">Total à payer</span>
              <span className="text-lg font-bold text-green-700">{subtotal.toFixed(2)} €</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}