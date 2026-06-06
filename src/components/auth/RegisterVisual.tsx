import React from "react";
import { motion } from "motion/react";
import { Users } from "lucide-react";
import { FoodImage } from "./types";

interface RegisterVisualProps {
  foodImages: FoodImage[];
}

export default function RegisterVisual({ foodImages }: RegisterVisualProps) {
  return (
    <motion.div
      key="register-visual"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35 }}
      className="h-full flex flex-col justify-between"
    >
      {/* Photo collage layout */}
      <div className="grid grid-cols-3 gap-2.5 p-3.5 h-[680px] overflow-hidden select-none">
        {foodImages.map((image, i) => (
          <div
            key={i}
            className="relative aspect-square md:aspect-auto h-full w-full rounded-xl overflow-hidden shadow-2xs group"
          >
            <img
              src={image.url}
              alt={image.alt}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-107 group-hover:brightness-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ))}
      </div>

      {/* Centered Floating Banner */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
        <motion.div
          key="register-badge"
          initial={{ scale: 0.9, y: 10, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="bg-[#0A4D34] text-white px-7 py-5.5 rounded-2xl shadow-xl flex items-center gap-4.5 border border-[#0d5f41] pointer-events-auto max-w-[325px] transition-transform hover:scale-[1.032]"
        >
          <div className="h-11 w-11 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 border border-white/15">
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
    </motion.div>
  );
}
