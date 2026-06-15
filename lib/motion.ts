/** Shared motion constants so spring values stop being copy-pasted. */
export const SPRING = {
  press: { type: "spring", stiffness: 400, damping: 30 },
  panel: { type: "spring", stiffness: 360, damping: 36 },
  pop: { type: "spring", stiffness: 500, damping: 30 },
} as const;

export const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number];
