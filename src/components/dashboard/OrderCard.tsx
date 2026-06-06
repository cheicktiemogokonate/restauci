import Image from "next/image";
import Link from "next/link";

export type OrderStatus = "Prête" | "Annulée" | "En préparation";
export type OrderType = "Sur place" | "À emporter";

// import { Order } from "../components/OrderCard";

export const mockOrders: Order[] = [
  {
    id: "#ORD1023",
    date: "20 Oct. 2025",
    time: "14:47",
    customer: "Alice Johnson",
    status: "Prête",
    orderType: "Sur place",
    tableNumber: "Table 12",
    items: [
      {
        name: "Penne à la crème",
        quantity: 1,
        price: 18.0,
        image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=80&h=80&fit=crop",
      },
      {
        name: "Salade César",
        quantity: 1,
        price: 8.0,
        image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=80&h=80&fit=crop",
      },
    ],
    total: 26.0,
  },
  {
    id: "#ORD1024",
    date: "20 Oct. 2025",
    time: "12:47",
    customer: "Bob Smith",
    status: "Annulée",
    orderType: "À emporter",
    items: [
      {
        name: "Pizza Pepperoni",
        quantity: 2,
        price: 24.0,
        image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=80&h=80&fit=crop",
      },
      {
        name: "Pain à l'ail",
        quantity: 1,
        price: 5.0,
        image: "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=80&h=80&fit=crop",
      },
      {
        name: "Tarte au citron",
        quantity: 1,
        price: 4.0,
        image: "https://images.unsplash.com/photo-1519915028121-7d3463d5b1ff?w=80&h=80&fit=crop",
        cancelled: true,
      },
    ],
    total: 37.0,
  },
  {
    id: "#ORD1026",
    date: "23 Oct. 2025",
    time: "13:47",
    customer: "Dana White",
    status: "En préparation",
    orderType: "Sur place",
    tableNumber: "Table 8",
    items: [
      {
        name: "Sushi saumon",
        quantity: 3,
        price: 30.0,
        image: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=80&h=80&fit=crop",
      },
      {
        name: "Edamame",
        quantity: 1,
        price: 6.0,
        image: "https://images.unsplash.com/photo-1608500218890-c4f9d86d9a83?w=80&h=80&fit=crop",
      },
    ],
    total: 36.0,
  },
  {
    id: "#ORD1027",
    date: "26 Oct. 2025",
    time: "15:47",
    customer: "Eve Carter",
    status: "En préparation",
    orderType: "Sur place",
    tableNumber: "Table 7",
    items: [
      {
        name: "Spaghetti Carbonara",
        quantity: 1,
        price: 15.0,
        image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=80&h=80&fit=crop",
      },
      {
        name: "Pain à l'ail",
        quantity: 1,
        price: 5.0,
        image: "https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=80&h=80&fit=crop",
      },
    ],
    total: 20.0,
  },
  {
    id: "#ORD1029",
    date: "27 Oct. 2025",
    time: "09:47",
    customer: "Grace Lee",
    status: "Prête",
    orderType: "À emporter",
    items: [
      {
        name: "Buddha Bowl végétarien",
        quantity: 2,
        price: 22.0,
        image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=80&h=80&fit=crop",
      },
      {
        name: "Iced Caramel Macchiato",
        quantity: 1,
        price: 5.0,
        image: "https://images.unsplash.com/photo-1561047029-3000c68339ca?w=80&h=80&fit=crop",
      },
    ],
    total: 27.0,
  },
  {
    id: "#ORD1030",
    date: "26 Oct. 2025",
    time: "08:47",
    customer: "Hannah Gold",
    status: "Annulée",
    orderType: "Sur place",
    tableNumber: "Table 4",
    items: [
      {
        name: "Poulet grillé",
        quantity: 1,
        price: 8.0,
        image: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=80&h=80&fit=crop",
      },
      {
        name: "Pizza Smokey",
        quantity: 2,
        price: 24.0,
        image: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=80&h=80&fit=crop",
      },
      {
        name: "Tiramisu",
        quantity: 1,
        price: 4.0,
        image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=80&h=80&fit=crop",
        cancelled: true,
      },
    ],
    total: 36.0,
  },
];

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  image: string;
  cancelled?: boolean;
}

export interface Order {
  id: string;
  date: string;
  time: string;
  customer: string;
  status: OrderStatus;
  orderType: OrderType;
  tableNumber?: string;
  items: OrderItem[];
  total: number;
}

interface OrderCardProps {
  order: Order;
}

const statusConfig: Record<OrderStatus, { label: string; className: string; icon: React.ReactNode }> = {
  Prête: {
    label: "Prête",
    className: "bg-green-100 text-green-700",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  Annulée: {
    label: "Annulée",
    className: "bg-red-100 text-red-600",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  "En préparation": {
    label: "En préparation",
    className: "bg-amber-100 text-amber-700",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

export default function OrderCard({ order }: OrderCardProps) {
  const status = statusConfig[order.status];
  const isActionable = order.status !== "Annulée";

  return (
    <div className="bg-background rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-1">
            {order.date} &nbsp; {order.time}
          </p>
          <h2 className="text-xl font-bold text-gray-900 leading-tight">{order.customer}</h2>
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${status.className}`}>
          {status.icon}
          {status.label}
        </span>
      </div>

      {/* Order meta */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-green-700">{order.id}</span>
        <span className="text-xs text-gray-500 bg-gray-100 rounded-md px-2 py-0.5">{order.orderType}</span>
        {order.tableNumber && (
          <span className="text-xs text-gray-500 bg-gray-100 rounded-md px-2 py-0.5">
            {order.tableNumber}
          </span>
        )}
      </div>

      {/* Items */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Articles</p>
        <div className="flex flex-col gap-2.5">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://via.placeholder.com/40x40/f3f4f6/9ca3af?text=🍽";
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium leading-tight ${item.cancelled ? "line-through text-gray-400" : "text-gray-800"}`}>
                  {item.name}
                </p>
                <p className="text-xs text-gray-400">x{item.quantity}</p>
              </div>
              <p className={`text-sm font-semibold flex-shrink-0 ${item.cancelled ? "line-through text-gray-400" : "text-gray-700"}`}>
                {item.price.toFixed(2)} €
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Total */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">Total</span>
        <span className="text-base font-bold text-green-700">{order.total.toFixed(2)} €</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-1">
      
            <Link href={`/restaurateur/commandes/${order.id.replace("#", "")}`} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          Voir détails
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
            </Link>
        <button
          disabled={!isActionable}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            isActionable
              ? "bg-brand-green text-white hover:bg-brand-green/90"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          Encaisser
          {isActionable ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}