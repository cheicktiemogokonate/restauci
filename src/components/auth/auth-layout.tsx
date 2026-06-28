"use client";

import { Users } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

const foodImages = [
  {
    url: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&q=80&w=400",
    alt: "Burrata starter",
  },
  {
    url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=400",
    alt: "Gourmet Burger",
  },
  {
    url: "https://images.unsplash.com/photo-1546548970-71785318a17b?auto=format&fit=crop&q=80&w=400",
    alt: "Elegant Spaghetti Pasta",
  },
  {
    url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=400",
    alt: "Stone oven Pizza",
  },
  {
    url: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&q=80&w=400",
    alt: "Lava Chocolate Fondant",
  },
  {
    url: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=400",
    alt: "Chef seasoning dinner",
  },
  {
    url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=400",
    alt: "Raw vegetarian bowl",
  },
  {
    url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=400",
    alt: "Cozy bistro lounge",
  },
  {
    url: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&q=80&w=400",
    alt: "Fresh japanese Ramen",
  },
  {
    url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=400",
    alt: "Ribeye Steak meal",
  },
  {
    url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=400",
    alt: "Refreshing Mint Cocktail",
  },
  {
    url: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&q=80&w=400",
    alt: "Red berry Cheesecake biscuit",
  },
];

function RegisterVisual() {
  return (
    <div className="hidden md:block bg-gray-50/50 relative overflow-hidden h-screen">
      <div className="grid grid-cols-3 gap-2.5 p-3.5 h-full overflow-hidden select-none">
        {foodImages.map((image, i) => (
          <div
            key={i}
            className="relative aspect-square md:aspect-auto h-full w-full rounded-xl overflow-hidden shadow-2xs group"
          >
            <img
              src={image.url}
              alt={image.alt}
              width={400}
              height={400}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-107 group-hover:brightness-[1.03]"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
        <motion.div
          initial={{ transform: "scale(0.9) translateY(10px)", opacity: 0 }}
          animate={{ transform: "scale(1) translateY(0)", opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="bg-[#0A4D34] text-white px-7 py-5.5 rounded-2xl shadow-xl flex items-center gap-4.5 border border-[#0d5f41] pointer-events-auto max-w-[325px] transition-transform hover:scale-[1.032]"
        >
          <div className="h-11 w-11 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/15">
            <Users className="h-5.5 w-5.5 text-white" />
          </div>

          <div className="flex-1 leading-tight">
            <span className="text-lg font-extrabold block tracking-tight">
              +1 200 restaurants
            </span>
            <span className="text-[11px] text-white/75 font-semibold tracking-wide block mt-0.5">
              nous font confiance
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function AuthLayout({
  children,
  visual,
}: {
  children: ReactNode;
  visual?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="bg-white w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-gray-150 relative min-h-125 flex flex-col md:grid md:grid-cols-2"
      >
        {children}
        {visual ?? <RegisterVisual />}
      </motion.div>
    </div>
  );
}
