import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge kennt die eigenen Tokens nicht von selbst: ohne diese
 * Erweiterung bleiben z. B. `tracking-gesperrt-2` UND `tracking-gesperrt`
 * oder `rounded-card` UND `rounded-pill` nebeneinander stehen, und die
 * Reihenfolge im Stylesheet entscheidet statt der `className`-Überschreibung.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      tracking: [{ tracking: ["gesperrt", "gesperrt-2", "gesperrt-3", "gesperrt-4"] }],
      rounded: [{ rounded: ["card", "pill", "xs"] }],
      "rounded-t": [{ "rounded-t": ["card", "pill", "xs"] }],
      "font-size": [{ text: ["2xs", "3xs", "4xs", "5xs", "titel", "readout", "readout-lg"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
