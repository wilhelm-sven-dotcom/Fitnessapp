import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge kennt die eigenen Tokens nicht von selbst: ohne diese
 * Erweiterung bleiben z. B. `rounded-card` UND `rounded-pill` oder
 * `text-3xs` UND `text-sm` nebeneinander stehen, und die Reihenfolge im
 * Stylesheet entscheidet statt der `className`-Überschreibung. Jedes neue
 * Größen-, Radius- oder Sperrungs-Token gehört hier dazu.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      tracking: [{ tracking: ["label"] }],
      rounded: [{ rounded: ["card", "inner", "kachel", "pill", "xs"] }],
      "rounded-t": [{ "rounded-t": ["card", "inner", "kachel", "pill", "xs"] }],
      "border-w": [{ border: ["dick"] }],
      "border-w-x": [{ "border-x": ["dick"] }],
      "border-w-y": [{ "border-y": ["dick"] }],
      "border-w-t": [{ "border-t": ["dick"] }],
      "border-w-r": [{ "border-r": ["dick"] }],
      "border-w-b": [{ "border-b": ["dick"] }],
      "border-w-l": [{ "border-l": ["dick"] }],
      shadow: [{ shadow: ["hart", "hart-sm"] }],
      "font-size": [{ text: ["2xs", "3xs", "4xs", "5xs", "titel", "readout", "readout-lg"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
