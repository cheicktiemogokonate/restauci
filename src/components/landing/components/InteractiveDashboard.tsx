"use client";
import { useState } from "react";
import { 
  DollarSign, ShoppingBag, Layers, Users, TrendingUp, CheckCircle2, 
  Clock, AlertTriangle, Play, RefreshCw, ChefHat, Map, Sparkles, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { dishesData } from "../data";

// Initial state data
const initialOrders = [
  { id: "101", customer: "Lucas M.", table: "Table 4", items: "1x Double Bacon Burger, 1x Frites", amount: 18.5, status: "En Cuisine", time: "13:05" },
  { id: "102", customer: "Sarah L.", table: "Emporter #3", items: "1x Pizza Pepperoni, 1x Fondant Chocolat", amount: 24.4, status: "Prêt", time: "13:10" },
  { id: "103", customer: "Marc P.", table: "Table 12", items: "1x Salade César, 1x Saumon Grillé", amount: 32.0, status: "Livré", time: "12:55" },
  { id: "104", customer: "Clarisse D.", table: "Livraison #18", items: "1x Plateau Sushi Premium", amount: 24.0, status: "En Cuisine", time: "13:15" },
  { id: "105", customer: "Gilles V.", table: "Table 9", items: "2x Double Bacon Burger, 2x Coca Cola", amount: 36.0, status: "En Cuisine", time: "13:18" }
];

const initialStocks = [
  { name: "Pains burgers artisanaux", qty: 14, max: 100, unit: "unités", status: "Critique", color: "bg-red-500" },
  { name: "Pavés de Saumon frais", qty: 8, max: 30, unit: "portions", status: "Attention", color: "bg-amber-500" },
  { name: "Steaks de boeuf BIO", qty: 85, max: 120, unit: "unités", status: "Normal", color: "bg-emerald-500" },
  { name: "Fromage Mozzarella di Bufala", qty: 5, max: 25, unit: "kg", status: "Critique", color: "bg-red-500" },
  { name: "Frites fraîches épluchées", qty: 90, max: 150, unit: "kg", status: "Normal", color: "bg-emerald-500" }
];

const initialTables = [
  { id: "T1", label: "Table 1", seats: 2, status: "libre" },
  { id: "T2", label: "Table 2", seats: 4, status: "libre" },
  { id: "T4", label: "Table 4", seats: 2, status: "occupe" },
  { id: "T6", label: "Table 6", seats: 6, status: "reserve" },
  { id: "T9", label: "Table 9", seats: 4, status: "occupe" },
  { id: "T12", label: "Table 12", seats: 4, status: "occupe" },
  { id: "T15", label: "Table 15", seats: 8, status: "libre" }
];

export default function InteractiveDashboard() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "orders" | "stocks" | "tables">("dashboard");
  const [orders, setOrders] = useState(initialOrders);
  const [stocks, setStocks] = useState(initialStocks);
  const [tables, setTables] = useState(initialTables);
  const [revenue, setRevenue] = useState(1425.80);
  const [addedOrdersCount, setAddedOrdersCount] = useState(0);

  // Status handlers
  const handleAdvanceStatus = (orderId: string) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        if (order.status === "En Cuisine") {
          return { ...order, status: "Prêt" };
        } else if (order.status === "Prêt") {
          // Increment revenue on completion
          setRevenue(prevRev => prevRev + order.amount);
          return { ...order, status: "Livré" };
        }
      }
      return order;
    }));
  };

  const handleCreateOrder = (dishId: string) => {
    const dish = dishesData.find(d => d.id === dishId);
    if (!dish) return;

    const newId = (106 + addedOrdersCount).toString();
    const newOrder = {
      id: newId,
      customer: `Client #${newId}`,
      table: "Table " + (tables.find(t => t.status === "libre")?.label || "1"),
      items: `1x ${dish.name}`,
      amount: dish.price,
      status: "En Cuisine",
      time: "Maintenant"
    };

    setOrders([newOrder, ...orders]);
    setAddedOrdersCount(prev => prev + 1);
  };

  const handleRestock = (itemName: string) => {
    setStocks(prev => prev.map(item => {
      if (item.name === itemName) {
        return { ...item, qty: item.max, status: "Normal", color: "bg-emerald-500" };
      }
      return item;
    }));
  };

  const handleTableToggle = (tableId: string) => {
    setTables(prev => prev.map(table => {
      if (table.id === tableId) {
        let nextStatus: "libre" | "occupe" | "reserve" = "libre";
        if (table.status === "libre") nextStatus = "occupe";
        else if (table.status === "occupe") nextStatus = "reserve";
        return { ...table, status: nextStatus };
      }
      return table;
    }));
  };

  // Derived stats
  const activeOrdersCount = orders.filter(o => o.status !== "Livré").length;
  const criticalStockCount = stocks.filter(s => s.status === "Critique").length;
  const occupiedTableCount = tables.filter(t => t.status === "occupe").length;

  return (
    <div className="w-full bg-white text-brand-dark rounded-2xl border border-gray-200/50 shadow-xl p-4 sm:p-6 overflow-hidden">
      
      {/* Dashboard Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-green/8 text-brand-green rounded-xl border border-brand-green/15">
            <ChefHat className="h-5.5 w-5.5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono py-0.5 px-2 bg-brand-green/8 text-brand-green border border-brand-green/20 rounded-full font-bold">
                PRO DEMO WORKSPACE
              </span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <h3 className="font-display font-bold text-lg text-brand-dark">Console Intelligente RestauCI</h3>
          </div>
        </div>

        {/* Console Nav Tabs */}
        <div className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] gap-1 bg-gray-50/80 p-1.5 rounded-lg border border-gray-200/50 w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
              activeTab === "dashboard" ? "bg-brand-green text-white shadow-xs" : "text-brand-dark/50 hover:text-brand-dark"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Synthèse
          </button>
          <button 
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all relative whitespace-nowrap ${
              activeTab === "orders" ? "bg-brand-green text-white shadow-xs" : "text-brand-dark/50 hover:text-brand-dark"
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Commandes ({activeOrdersCount})
            {activeOrdersCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-accent"></span>
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab("stocks")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
              activeTab === "stocks" ? "bg-brand-green text-white shadow-xs" : "text-brand-dark/50 hover:text-brand-dark"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Stocks ({criticalStockCount})
          </button>
          <button 
            onClick={() => setActiveTab("tables")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
              activeTab === "tables" ? "bg-brand-green text-white shadow-xs" : "text-brand-dark/50 hover:text-brand-dark"
            }`}
          >
            <Map className="h-3.5 w-3.5" />
            Salles ({occupiedTableCount}/{tables.length})
          </button>
        </div>
      </div>

      {/* Main Sandbox Interactive Screen */}
      <div className="py-4 mt-2">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: DASHBOARD SYNTHESE */}
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-4"
            >
              {/* Top Row: Mini Stats Panel */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50/50 p-3 sm:p-3.5 rounded-xl border border-gray-200/40">
                  <div className="flex items-center justify-between text-brand-dark/50 text-[11px] sm:text-xs font-medium">
                    <span className="truncate pr-1">Ventes</span>
                    <DollarSign className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  </div>
                  <div className="mt-1 text-base sm:text-xl font-mono font-bold text-brand-dark tracking-tight truncate">
                    {revenue.toFixed(2)} €
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5 max-w-full overflow-hidden truncate">
                    <TrendingUp className="h-3 w-3 flex-shrink-0" /> <span className="truncate">+18% Croissance</span>
                  </div>
                </div>

                <div className="bg-gray-50/50 p-3 sm:p-3.5 rounded-xl border border-gray-200/40">
                  <div className="flex items-center justify-between text-brand-dark/50 text-[11px] sm:text-xs font-medium">
                    <span className="truncate pr-1">Commandes</span>
                    <ShoppingBag className="h-4 w-4 text-brand-green flex-shrink-0" />
                  </div>
                  <div className="mt-1 text-base sm:text-xl font-mono font-bold text-brand-dark tracking-tight truncate">
                    {activeOrdersCount}
                  </div>
                  <div className="text-[10px] text-brand-dark/60 font-medium flex items-center gap-1 mt-0.5 max-w-full overflow-hidden truncate">
                    <Clock className="h-3 w-3 flex-shrink-0" /> <span className="truncate">Attente ~11m</span>
                  </div>
                </div>

                <div className="bg-gray-50/50 p-3 sm:p-3.5 rounded-xl border border-gray-200/40">
                  <div className="flex items-center justify-between text-brand-dark/50 text-[11px] sm:text-xs font-medium">
                    <span className="truncate pr-1">Alertes Stocks</span>
                    <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  </div>
                  <div className="mt-1 text-base sm:text-xl font-mono font-bold text-brand-dark tracking-tight truncate">
                    {criticalStockCount}
                  </div>
                  <div className="text-[10px] text-amber-650 font-semibold flex items-center gap-1 mt-0.5 max-w-full overflow-hidden truncate">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" /> <span className="truncate">Proche rupture</span>
                  </div>
                </div>

                <div className="bg-gray-50/50 p-3 sm:p-3.5 rounded-xl border border-gray-200/40">
                  <div className="flex items-center justify-between text-brand-dark/50 text-[11px] sm:text-xs font-medium">
                    <span className="truncate pr-1">Occupation</span>
                    <Users className="h-4 w-4 text-indigo-505 flex-shrink-0" />
                  </div>
                  <div className="mt-1 text-base sm:text-xl font-mono font-bold text-brand-dark tracking-tight truncate">
                    {Math.round((occupiedTableCount / tables.length) * 100)} %
                  </div>
                  <div className="text-[10px] text-brand-dark/60 font-medium flex items-center gap-1 mt-0.5 max-w-full overflow-hidden truncate">
                    <Users className="h-3 w-3 flex-shrink-0" /> <span className="truncate">{occupiedTableCount} tables occupées</span>
                  </div>
                </div>
              </div>

              {/* Middle Row: Revenue Graph and Interactive POS menu */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Custom SVG Line Chart */}
                <div className="bg-gray-50/30 p-4 rounded-xl border border-gray-200/40 lg:col-span-12 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pr-2">
                      <h4 className="text-sm font-semibold text-brand-dark/80">Performance Financiére (Aujourd'hui)</h4>
                      <span className="text-[10px] font-mono text-brand-green font-bold">TEMPS RÉEL SENSORS</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xl font-mono font-bold text-brand-dark">{revenue.toFixed(2)} €</span>
                      <span className="text-xs text-emerald-600 font-semibold">+ 240 € cet après-midi</span>
                    </div>
                  </div>

                  {/* Graphic */}
                  <div className="h-40 w-full mt-4 relative">
                    {/* Gridlines */}
                    <div className="absolute inset-0 flex flex-col justify-between opacity-15 pointer-events-none">
                      <div className="h-[1px] bg-gray-300 w-full" />
                      <div className="h-[1px] bg-gray-300 w-full" />
                      <div className="h-[1px] bg-gray-300 w-full" />
                      <div className="h-[1px] bg-gray-300 w-full" />
                    </div>
                    {/* SVG Curve */}
                    <svg className="h-full w-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#085a3c" stopOpacity="0.45" />
                          <stop offset="100%" stopColor="#085a3c" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* Gradient Fill */}
                      <motion.path 
                        d="M 0 130 C 50 125, 100 110, 150 90 C 200 70, 250 110, 300 65 C 350 20, 400 35, 450 15 L 500 15 L 500 150 L 0 150 Z" 
                        fill="url(#chartGrad)" 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1.2, delay: 0.6 }}
                      />
                      {/* Colored Stroke */}
                      <motion.path 
                        d="M 0 130 C 50 125, 100 110, 150 90 C 200 70, 250 110, 300 65 C 350 20, 400 35, 450 15 L 500 15" 
                        fill="none" 
                        stroke="#085a3c" 
                        strokeWidth="4" 
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.8, ease: "easeInOut" }}
                      />
                      {/* Decorative Circles */}
                      <motion.circle 
                        cx="150" 
                        cy="90" 
                        r="5.5" 
                        fill="#0b6b49" 
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.3, 1] }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                      />
                      <motion.circle 
                        cx="300" 
                        cy="65" 
                        r="5.5" 
                        fill="#0b6b49" 
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.3, 1] }}
                        transition={{ duration: 0.5, delay: 1.2 }}
                      />
                      <motion.circle 
                        cx="450" 
                        cy="15" 
                        r="7" 
                        fill="#FFFFFF" 
                        stroke="#085a3c" 
                        strokeWidth="3" 
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.4, 1] }}
                        transition={{ duration: 0.5, delay: 1.6 }}
                      />
                    </svg>

                  {/* Timeline indicators */}
                  <div className="flex justify-between text-[10px] font-mono text-brand-dark/40 mt-2 px-1">
                    <span>08:00</span>
                    <span>11:00</span>
                    <span>13:00 (Midi)</span>
                    <span>15:00</span>
                    <span>19:00 (Soirée)</span>
                  </div>
                </div>
              </div>

              {/* Simulated POS Mini-terminal (Click elements to trigger live commands!) */}
              <div className="bg-gray-50/30 p-4 rounded-xl border border-gray-200/40 lg:col-span-12 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <h4 className="text-xs font-bold text-brand-dark/80 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-brand-green" />
                      Simulateur Caisse POS
                    </h4>
                    <span className="text-[10px] bg-brand-green/8 text-brand-green py-0.5 px-2 rounded font-semibold border border-brand-green/15">
                      CLIQUEZ POUR AJOUTER
                    </span>
                  </div>
                  <p className="text-[11px] text-brand-dark/60 mt-2 leading-relaxed">
                    Saisissez une commande simulée ci-dessous. Elle s'ajoutera automatiquement dans l'écran de cuisine ci-contre.
                  </p>
                  
                  {/* Pickers */}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {dishesData.slice(0, 4).map(dish => (
                      <button
                        key={dish.id}
                        onClick={() => handleCreateOrder(dish.id)}
                        className="bg-white hover:bg-gray-100/50 text-left p-2.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-all flex flex-col justify-between group"
                      >
                        <span className="text-xs font-semibold text-brand-dark line-clamp-1 group-hover:text-brand-green transition-colors">
                          {dish.name}
                        </span>
                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-100">
                          <span className="text-[11px] font-mono text-[#15803d] font-bold">{dish.price.toFixed(2)} €</span>
                          <span className="text-[10px] text-brand-dark/40 font-medium">Ajouter +</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-brand-dark/50">
                  <span>Créations rapides de tickets de test</span>
                  <span className="font-mono text-brand-dark/70">Total : {orders.length}</span>
                </div>
              </div>
            </div>

            {/* Bottom section of synthesis: Order queue overview */}
            <div className="bg-emerald-50/10 p-4 rounded-xl border border-brand-green/10">
              <div className="flex items-center justify-between pb-3 border-b border-brand-green/10 mb-3">
                <h4 className="text-sm font-semibold text-brand-dark/90">Suivi des Plats en un clin d'œil</h4>
                <button 
                  onClick={() => setActiveTab("orders")}
                  className="text-xs text-brand-green hover:underline flex items-center gap-0.5 font-bold"
                >
                  Voir l'écran de cuisine <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
              
              <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-brand-dark/50 border-b border-gray-200/40 pb-2">
                      <th className="py-2.5 font-medium">NUMERO</th>
                      <th className="py-2.5 font-medium">DESTINATION</th>
                      <th className="py-2.5 font-medium">CONTENU DU TICKET</th>
                      <th className="py-2.5 font-medium font-mono text-center">STATUT ACTUEL</th>
                      <th className="py-2.5 font-medium text-right font-mono">PRIX TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="py-3 font-mono text-brand-dark/45">#{order.id}</td>
                        <td className="py-3 font-bold text-brand-dark">{order.table}</td>
                        <td className="py-3 text-brand-dark/80 break-words font-medium">{order.items}</td>
                        <td className="py-3 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                            order.status === "Livré" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/15" :
                            order.status === "Prêt" ? "bg-amber-500/10 text-amber-650 border border-amber-500/15" :
                            "bg-brand-green/10 text-brand-green border border-brand-green/15 animate-pulse"
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-brand-dark">{order.amount.toFixed(2)} €</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: COMMANDES DIRECT QUEUE */}
        {activeTab === "orders" && (
          <motion.div
            key="orders"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-4"
          >
            <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/40">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-gray-200/30">
                <div>
                  <h4 className="text-base font-bold text-brand-dark flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-brand-green" />
                    Moniteur de Cuisine RestauCI
                  </h4>
                  <p className="text-xs text-brand-dark/60 mt-1">
                    Visualisez et configurez l'évolution des commandes en direct. Cliquez sur les boutons pour simuler l'avancement.
                  </p>
                </div>
                
                <button 
                  onClick={() => {
                    setOrders(initialOrders);
                    setAddedOrdersCount(0);
                  }}
                  className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-xs py-1.5 px-3.5 rounded-lg border border-gray-200 text-brand-dark font-semibold shadow-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Réinitialiser
                </button>
              </div>

              {/* Adaptive grid lists */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                
                {/* Category 1: En cuisine */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-red-500/10 px-1">
                    <span className="text-xs font-bold text-red-650 tracking-wider flex items-center gap-1 uppercase">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-ping gap-0.5"></span>
                      En Préparation
                    </span>
                    <span className="text-xs font-mono bg-red-50 text-red-600 px-2 py-0.5 rounded-full border border-red-100">
                      {orders.filter(o => o.status === "En Cuisine").length}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-brand-green/20 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                    {orders.filter(o => o.status === "En Cuisine").length === 0 ? (
                      <div className="text-center py-8 text-brand-dark/40 border border-dashed border-gray-200 rounded-lg text-xs">
                        Aucun plat en cours de préparation.
                      </div>
                    ) : (
                      orders.filter(o => o.status === "En Cuisine").map(order => (
                        <motion.div 
                          key={order.id} 
                          layoutId={`order-${order.id}`}
                          className="bg-white p-3.5 rounded-lg border border-gray-200/50 hover:border-gray-300 transition-all shadow-xs"
                        >
                          <div className="flex justify-between items-center pb-2 border-b border-gray-100 mb-2">
                            <div>
                              <span className="text-xs font-bold text-brand-dark">{order.table}</span>
                              <span className="text-[10px] text-brand-dark/50 block mt-0.5">Saisi à {order.time}</span>
                            </div>
                            <span className="text-xs font-mono text-brand-dark/40 font-bold">#{order.id}</span>
                          </div>
                          <p className="text-xs text-brand-dark/80 font-medium py-1 break-words">{order.items}</p>
                          <div className="mt-3 flex justify-between items-center pt-2 border-t border-gray-100">
                            <span className="text-xs font-mono font-bold text-brand-dark">{order.amount.toFixed(2)} €</span>
                            <button
                              onClick={() => handleAdvanceStatus(order.id)}
                              className="bg-brand-green hover:bg-[#0c734e] text-white font-semibold text-[10px] px-2.5 py-1.5 rounded-md flex items-center gap-1 transition-all"
                            >
                              {order.status === "En Cuisine" ? "Prêt !" : "Terminé"}
                              <Play className="h-2 w-2 fill-current" />
                            </button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>

                {/* Category 2: Prêt à servir */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-amber-500/10 px-1">
                    <span className="text-xs font-bold text-amber-650 tracking-wider flex items-center gap-1 uppercase">
                      <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                      Prêt à servir
                    </span>
                    <span className="text-xs font-mono bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100">
                      {orders.filter(o => o.status === "Prêt").length}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-amber-500/15 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                    {orders.filter(o => o.status === "Prêt").length === 0 ? (
                      <div className="text-center py-8 text-brand-dark/40 border border-dashed border-gray-200 rounded-lg text-xs">
                        Aucun plat prêt en attente de service.
                      </div>
                    ) : (
                      orders.filter(o => o.status === "Prêt").map(order => (
                        <motion.div 
                          key={order.id} 
                          layoutId={`order-${order.id}`}
                          className="bg-white p-3.5 rounded-lg border border-amber-200/40 hover:border-amber-300 transition-all shadow-xs"
                        >
                          <div className="flex justify-between items-center pb-2 border-b border-gray-100 mb-2">
                            <div>
                              <span className="text-xs font-bold text-brand-dark">{order.table}</span>
                              <span className="text-[10px] text-brand-dark/50 block mt-0.5">Fini à {order.time}</span>
                            </div>
                            <span className="text-xs font-mono text-brand-dark/40 font-bold">#{order.id}</span>
                          </div>
                          <p className="text-xs text-amber-800 py-1 font-medium break-words">{order.items}</p>
                          <div className="mt-3 flex justify-between items-center pt-2 border-t border-gray-100">
                            <span className="text-xs font-mono font-bold text-brand-dark">{order.amount.toFixed(2)} €</span>
                            <button
                              onClick={() => handleAdvanceStatus(order.id)}
                              className="bg-[#22C55E]/10 text-emerald-700 hover:bg-[#22C55E] hover:text-white border border-[#22C55E]/30 font-semibold text-[10px] px-2.5 py-1.5 rounded-md flex items-center gap-1 transition-all"
                            >
                              Servir et Encaisser
                              <CheckCircle2 className="h-3 w-3" />
                            </button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>

                {/* Category 3: Livré & Payé */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-500/10 px-1">
                    <span className="text-xs font-bold text-emerald-600 tracking-wider flex items-center gap-1 uppercase">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      Servis (Payés)
                    </span>
                    <span className="text-xs font-mono bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">
                      {orders.filter(o => o.status === "Livré").length}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-emerald-600/15 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                    {orders.filter(o => o.status === "Livré").length === 0 ? (
                      <div className="text-center py-8 text-brand-dark/40 border border-dashed border-gray-200 rounded-lg text-xs">
                        Aucun ticket terminé sur ce service.
                      </div>
                    ) : (
                      orders.filter(o => o.status === "Livré").map(order => (
                        <motion.div 
                          key={order.id} 
                          layoutId={`order-${order.id}`}
                          className="bg-white p-3.5 rounded-lg border border-gray-200/40 hover:border-gray-300 transition-all opacity-75"
                        >
                          <div className="flex justify-between items-center pb-2 border-b border-gray-100 mb-1">
                            <div>
                              <span className="text-xs font-bold text-brand-dark/75">{order.table}</span>
                            </div>
                            <span className="text-xs font-mono text-brand-dark/45">#{order.id}</span>
                          </div>
                          <p className="text-xs text-brand-dark/50 line-through py-1 break-words">{order.items}</p>
                          <div className="flex justify-between items-center pt-2 border-t border-gray-100 text-[10px] text-brand-dark/50">
                            <span>Encaissé via RestauCI POS</span>
                            <span className="font-mono text-emerald-600 font-bold">{order.amount.toFixed(2)} €</span>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: GESTION DES STOCKS SCREEN */}
        {activeTab === "stocks" && (
          <motion.div
            key="stocks"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/40"
          >
            <div className="flex justify-between items-center pb-3 border-b border-gray-200/30 mb-4">
              <div>
                <h4 className="text-base font-bold text-brand-dark flex items-center gap-2">
                  <Layers className="h-5 w-5 text-brand-green" />
                  Inventaire & Réapprovisionnement Automatique
                </h4>
                <p className="text-xs text-brand-dark/60 mt-1">
                  L'algorithme RestauCI surveille vos stocks réels. Cliquez sur "Réapprovisionner" pour simuler une livraison de marchandises.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {stocks.map((item, idx) => {
                const percent = Math.round((item.qty / item.max) * 100);
                const isLow = percent < 25;
                return (
                  <div 
                    key={idx}
                    className="bg-white p-4 rounded-lg border border-gray-200/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 mb-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-brand-dark">{item.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isLow ? "bg-red-50 text-red-650 border border-red-100" :
                            percent < 50 ? "bg-amber-500/10 text-amber-650 border border-amber-500/15" :
                            "bg-emerald-500/10 text-emerald-600 border border-emerald-500/15"
                          }`}>
                            {item.status} ({percent}%)
                          </span>
                        </div>
                        <span className="text-xs font-mono text-brand-dark/50">
                          {item.qty} / {item.max} {item.unit}
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-200/50">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 0.5 }}
                          className={`h-full ${
                            isLow ? "bg-red-500" :
                            percent < 50 ? "bg-amber-500" :
                            "bg-brand-green"
                          }`} 
                        />
                      </div>
                    </div>

                    {/* Action trigger button */}
                    <div>
                      <button
                        onClick={() => handleRestock(item.name)}
                        disabled={!isLow && percent < 90}
                        className={`w-full sm:w-auto text-[11px] font-bold py-1.5 px-3.5 rounded-md transition-all ${
                          isLow || percent < 50
                            ? "bg-brand-green hover:bg-[#0c734e] text-white"
                            : "bg-gray-100 text-brand-dark/30 cursor-not-allowed border border-gray-200"
                        }`}
                      >
                        Réapprovisionner
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* TAB 4: PLAN DE SALLE SCREEN */}
        {activeTab === "tables" && (
          <motion.div
            key="tables"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/40"
          >
            <div className="flex justify-between items-center pb-3 border-b border-gray-200/30 mb-4">
              <div>
                <h4 className="text-base font-bold text-brand-dark flex items-center gap-2">
                  <Map className="h-5 w-5 text-brand-green" />
                  Plan de Salle & Disponibilité des Tables
                </h4>
                <p className="text-xs text-brand-dark/60 mt-1">
                  Visualisez les tables d'un seul coup d'œil. Cliquez sur n'importe quelle table pour changer son statut de réservation (libre ➜ occupée ➜ réservée ➜ libre).
                </p>
              </div>
            </div>

            {/* Graphical Layout representation */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4">
              {tables.map(table => (
                <button
                  key={table.id}
                  onClick={() => handleTableToggle(table.id)}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between items-center text-center group cursor-pointer ${
                    table.status === "occupe" 
                      ? "bg-red-50 border-red-200 text-red-650 hover:bg-red-100/50" 
                      : table.status === "reserve" 
                      ? "bg-amber-50 border-amber-200 text-amber-650 hover:bg-amber-100/50" 
                      : "bg-emerald-500/5 border-emerald-500/10 text-emerald-600 hover:border-emerald-500/30 hover:bg-emerald-500/10"
                  }`}
                >
                  <div className="text-xs font-bold font-mono tracking-wider mb-2">
                    {table.label}
                  </div>
                  
                  {/* Visual seats representation */}
                  <div className="flex gap-1.5 justify-center py-2">
                    {Array.from({ length: table.seats }).map((_, i) => (
                      <span 
                        key={i} 
                        className={`h-2.5 w-2.5 rounded-full ${
                          table.status === "occupe" ? "bg-red-500" :
                          table.status === "reserve" ? "bg-amber-500" :
                          "bg-brand-green"
                        } group-hover:scale-110 transition-transform`} 
                      />
                    ))}
                  </div>

                  <div className="mt-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest font-mono">
                      {table.status === "occupe" ? "Occupée" :
                       table.status === "reserve" ? "Réservée" :
                       "Libre"}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Salle status legend indicator */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-4 border-t border-gray-200/50 text-xs mt-3">
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-md bg-emerald-50 border border-emerald-300 inline-block" />
                <span className="text-brand-dark/70 font-medium">Libre ({tables.filter(t => t.status === "libre").length})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-md bg-red-50 border border-red-300 inline-block" />
                <span className="text-brand-dark/70 font-medium">Occupée ({tables.filter(t => t.status === "occupe").length})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-md bg-amber-50 border border-amber-300 inline-block" />
                <span className="text-brand-dark/70 font-medium">Réservée ({tables.filter(t => t.status === "reserve").length})</span>
              </div>
            </div>

          </motion.div>
        )}

      </AnimatePresence>
    </div>

  </div>
);
}
