// Utility: cn() — Tailwind class merging (shadcn/ui convention)
// DO NOT move or rename this file — shadcn CLI expects it at src/lib/utils.ts

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
