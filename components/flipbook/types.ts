import type { ReactNode } from "react";

/** Typ einer Daumenkino-Tafel-Sammlung (Boot-Animation). */
export interface FlipConcept {
  id: string;
  title: string;
  sub: string;
  /** Vollbild-Hintergrund hinter den Tafeln. */
  bg: string;
  /** Textfarbe für Überschriften im Kontaktbogen. */
  fg: string;
  frames: ReactNode[];
  end: ReactNode;
  /** Index des repräsentativen Frames für den „Splash-Moment"-Screenshot. */
  heroIndex: number;
}
