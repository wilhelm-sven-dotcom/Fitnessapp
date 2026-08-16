/* ===================== Figuren (animiert, datengetrieben). Grün = Wirbelsäule. ===================== */
/* Seit dem Video-Umbau zeigen NUR noch Aufwärm-Player, Muskel-Heatmap und
 * Wochen-Poster Figuren — die Übungs-Ausführung erklärt das eigene Video.
 * `squat_bw` ist der Heatmap-/Poster-Körper (Frame A bleibt byte-stabil). */

export type Pt = [number, number];
export type Frame = Record<string, Pt>;
export type Bone = [string, string];

export interface EquipDef {
  kind: "db" | "band" | "band2";
  hands?: string[];
  at?: string;
  from?: Pt;
  to?: string;
  lines?: [Pt, string][];
}

export interface StaticLine {
  t: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  c?: string;
  w?: number;
}
export interface StaticRect {
  t: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
}
export type StaticShape = StaticLine | StaticRect;

export interface ViewDef {
  bones: Bone[];
  spine: Bone[];
  equip?: EquipDef;
  static?: StaticShape[];
  head?: string;
  /** Optional multi-pose sequence (full range of motion). Falls back to [A, B]. */
  frames?: Frame[];
  A: Frame;
  B: Frame;
}

export interface FigureDef {
  ground: number | null;
  vb?: string;
  /** Frames bilden einen geschlossenen Kreis (Sägezahn statt Ping-Pong) —
   *  z. B. Pedaltritt oder Schulterkreisen. Eigenschaft der Zeichnung. */
  cycle?: boolean;
  side: ViewDef;
  front?: ViewDef;
}

export const SB: Bone[] = [["sh", "hip"], ["sh", "elbow"], ["elbow", "hand"], ["hip", "knee"], ["knee", "foot"]];
export const SB2: Bone[] = [...SB, ["hip", "knee2"], ["knee2", "foot2"]];
export const FB: Bone[] = [["sh", "hip"], ["sh", "elbowL"], ["elbowL", "handL"], ["sh", "elbowR"], ["elbowR", "handR"], ["hip", "kneeL"], ["kneeL", "footL"], ["hip", "kneeR"], ["kneeR", "footR"]];
export const SP: Bone[] = [["sh", "hip"]];
export const SPL: Bone[] = [["sh", "hip"], ["hip", "knee"], ["knee", "foot"]];

/** Limb thickness: torso > thigh/upper-arm > shin/forearm. Lebt bei den
 *  Posen-Daten, weil auch das Canvas-Poster mit genau diesen Stärken zeichnet. */
export function boneWidth([a, b]: Bone): number {
  if (a === "sh" && b === "hip") return 18;
  if (a.startsWith("elbow") || a.startsWith("knee")) return 10;
  return 13;
}

/** A view's pose sequence — the authored `frames`, or [A, B] for legacy 2-pose figures.
 * Drops any undefined/null entry (a hole in an authored sequence) and always returns
 * at least one frame, so frameAt/lerpPts downstream can never index into nothing. */
export function framesOf(v: ViewDef): Frame[] {
  const seq = v.frames && v.frames.length >= 2 ? v.frames : [v.A, v.B];
  const clean = seq.filter((fr): fr is Frame => !!fr);
  return clean.length ? clean : [v.A ?? v.B ?? {}];
}

/**
 * Interpolation indices for phase `f` (0..1) across `n` poses: `f` maps linearly
 * over the sequence so the figure travels pose 0 → … → pose N-1. The caller's
 * cosine phase ping-pongs `f`, giving a natural down-and-up rep. For n=2 this is
 * identical to the old A→B lerp (backward compatible).
 */
export function frameAt(n: number, f: number): { i: number; next: number; t: number } {
  if (n <= 1) return { i: 0, next: 0, t: 0 };
  const cf = f < 0 ? 0 : f > 1 ? 1 : f;
  const pos = cf * (n - 1);
  let i = Math.floor(pos);
  if (i > n - 2) i = n - 2;
  if (i < 0) i = 0;
  return { i, next: i + 1, t: pos - i };
}

/* Autoren-Regeln: Frame 0 = die charakteristische Pose (reduced motion friert
 * dort ein); Ping-Pong macht die Reihenfolge sonst egal. Jeder Frame trägt das
 * IDENTISCHE Punkt-Key-Set; A/B bleiben frames[0]/frames[last] (ViewDef). */
export const FIG: Record<string, FigureDef> = {
  glutebridge: { ground: 150, vb: "0 90 200 75",
    side: { bones: SB, spine: SP,
      frames: [
        { head: [58, 146], sh: [72, 146], hip: [120, 112], knee: [150, 116], foot: [158, 150] },
        { head: [58, 146], sh: [72, 146], hip: [118, 126], knee: [150, 118], foot: [158, 150] },
        { head: [58, 146], sh: [72, 146], hip: [114, 140], knee: [150, 120], foot: [158, 150] },
      ],
      A: { head: [58, 146], sh: [72, 146], hip: [120, 112], knee: [150, 116], foot: [158, 150] },
      B: { head: [58, 146], sh: [72, 146], hip: [114, 140], knee: [150, 120], foot: [158, 150] } } },

  pallof: { ground: 150,
    side: { bones: SB, spine: SP, equip: { kind: "band", from: [186, 84], to: "hand" }, static: [{ t: "rect", x: 182, y: 72, w: 8, h: 40 }],
      frames: [
        { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [130, 72], hand: [150, 76] },
        { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [121, 69], hand: [135, 74] },
        { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [112, 66], hand: [120, 72] },
      ],
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [130, 72], hand: [150, 76] },
      B: { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [112, 66], hand: [120, 72] } } },

  sideplank: { ground: 150, vb: "0 90 200 75",
    side: { bones: SB, spine: SPL,
      frames: [
        { head: [82, 110], sh: [92, 114], hip: [134, 128], knee: [164, 138], foot: [188, 148], elbow: [92, 150], hand: [80, 150] },
        { head: [82, 114], sh: [92, 118], hip: [134, 135], knee: [164, 141], foot: [188, 149], elbow: [92, 150], hand: [80, 150] },
        { head: [82, 118], sh: [92, 122], hip: [134, 142], knee: [164, 144], foot: [188, 150], elbow: [92, 150], hand: [80, 150] },
      ],
      A: { head: [82, 110], sh: [92, 114], hip: [134, 128], knee: [164, 138], foot: [188, 148], elbow: [92, 150], hand: [80, 150] },
      B: { head: [82, 118], sh: [92, 122], hip: [134, 142], knee: [164, 144], foot: [188, 150], elbow: [92, 150], hand: [80, 150] } } },

  // Heatmap-/Poster-Körper + Referenz-Kniebeuge — Frame A NICHT anfassen
  // (MuscleHeatmapCard und lib/share-card zeichnen exakt diese Punkte).
  squat_bw: { ground: 150,
    side: { bones: SB, spine: SP,
      frames: [
        { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [112, 60], hand: [124, 60] },
        { head: [108, 52], sh: [104, 70], hip: [100, 112], knee: [126, 122], foot: [120, 148], elbow: [116, 80], hand: [128, 80] },
        { head: [114, 66], sh: [108, 84], hip: [100, 124], knee: [136, 124], foot: [120, 148], elbow: [120, 92], hand: [132, 92] },
      ],
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [112, 60], hand: [124, 60] },
      B: { head: [108, 52], sh: [104, 70], hip: [100, 112], knee: [126, 122], foot: [120, 148], elbow: [116, 80], hand: [128, 80] } },
    front: { bones: FB, spine: SP,
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [86, 62], handL: [80, 62], elbowR: [114, 62], handR: [120, 62], kneeL: [92, 121], footL: [90, 148], kneeR: [108, 121], footR: [110, 148] },
      B: { head: [100, 50], sh: [100, 68], hip: [100, 110], elbowL: [86, 80], handL: [80, 80], elbowR: [114, 80], handR: [120, 80], kneeL: [84, 124], footL: [84, 148], kneeR: [116, 124], footR: [116, 148] } } },

  birddog: { ground: 150, vb: "0 90 200 75",
    side: { bones: [["sh", "hip"], ["sh", "hand"], ["sh", "handS"], ["hip", "foot"], ["hip", "kneeS"]], spine: SP,
      frames: [
        { head: [84, 112], sh: [96, 116], hip: [130, 118], hand: [62, 108], handS: [100, 150], foot: [170, 108], kneeS: [134, 150] },
        { head: [85, 114], sh: [96, 116], hip: [130, 118], hand: [78, 120], handS: [100, 150], foot: [152, 120], kneeS: [134, 150] },
        { head: [86, 116], sh: [96, 116], hip: [130, 118], hand: [96, 132], handS: [100, 150], foot: [132, 132], kneeS: [134, 150] },
      ],
      A: { head: [84, 112], sh: [96, 116], hip: [130, 118], hand: [62, 108], handS: [100, 150], foot: [170, 108], kneeS: [134, 150] },
      B: { head: [86, 116], sh: [96, 116], hip: [130, 118], hand: [96, 132], handS: [100, 150], foot: [132, 132], kneeS: [134, 150] } } },

  deadbug: { ground: 150, vb: "0 90 200 75",
    side: { bones: SB, spine: SP,
      frames: [
        { head: [64, 146], sh: [80, 146], hip: [120, 146], elbow: [68, 128], hand: [58, 140], knee: [140, 126], foot: [166, 140] },
        { head: [64, 146], sh: [80, 146], hip: [120, 146], elbow: [73, 127], hand: [67, 126], knee: [130, 123], foot: [144, 120] },
        { head: [64, 146], sh: [80, 146], hip: [120, 146], elbow: [80, 127], hand: [80, 108], knee: [120, 120], foot: [120, 108] },
      ],
      A: { head: [64, 146], sh: [80, 146], hip: [120, 146], elbow: [68, 128], hand: [58, 140], knee: [140, 126], foot: [166, 140] },
      B: { head: [64, 146], sh: [80, 146], hip: [120, 146], elbow: [80, 127], hand: [80, 108], knee: [120, 120], foot: [120, 108] } } },

  gb_march: { ground: 150, vb: "0 90 200 75",
    side: { bones: SB2, spine: SP,
      frames: [
        { head: [52, 146], sh: [66, 146], hip: [112, 118], knee: [118, 102], foot: [126, 118], knee2: [150, 118], foot2: [158, 150] },
        { head: [52, 146], sh: [66, 146], hip: [112, 118], knee: [150, 118], foot: [158, 150], knee2: [150, 118], foot2: [158, 150] },
        { head: [52, 146], sh: [66, 146], hip: [112, 118], knee: [150, 118], foot: [158, 150], knee2: [118, 102], foot2: [126, 118] },
      ],
      A: { head: [52, 146], sh: [66, 146], hip: [112, 118], knee: [118, 102], foot: [126, 118], knee2: [150, 118], foot2: [158, 150] },
      B: { head: [52, 146], sh: [66, 146], hip: [112, 118], knee: [150, 118], foot: [158, 150], knee2: [118, 102], foot2: [126, 118] } } },

  // ===== Aufwärm-Drills (mehrere Posen) =====
  cat_cow: { ground: 150, vb: "0 90 200 75",
    side: { bones: [["sh", "mid"], ["mid", "hip"], ["sh", "elbow"], ["elbow", "hand"], ["hip", "knee"], ["knee", "foot"]], spine: [["sh", "mid"], ["mid", "hip"]],
      frames: [
        { head: [86, 126], sh: [94, 116], mid: [110, 104], hip: [126, 116], elbow: [94, 134], hand: [94, 150], knee: [126, 134], foot: [126, 150] },
        { head: [86, 118], sh: [94, 116], mid: [110, 116], hip: [126, 116], elbow: [94, 134], hand: [94, 150], knee: [126, 134], foot: [126, 150] },
        { head: [86, 108], sh: [94, 116], mid: [110, 126], hip: [126, 116], elbow: [94, 134], hand: [94, 150], knee: [126, 134], foot: [126, 150] },
      ],
      A: { head: [86, 126], sh: [94, 116], mid: [110, 104], hip: [126, 116], elbow: [94, 134], hand: [94, 150], knee: [126, 134], foot: [126, 150] },
      B: { head: [86, 108], sh: [94, 116], mid: [110, 126], hip: [126, 116], elbow: [94, 134], hand: [94, 150], knee: [126, 134], foot: [126, 150] } } },

  hip_circles: { ground: 150, cycle: true,
    side: { bones: SB2, spine: SP,
      frames: [
        { head: [106, 33], sh: [106, 52], hip: [110, 94], elbow: [118, 74], hand: [112, 92], knee: [92, 121], foot: [90, 148], knee2: [110, 121], foot2: [112, 148] },
        { head: [100, 30], sh: [100, 50], hip: [100, 88], elbow: [114, 72], hand: [104, 88], knee: [92, 121], foot: [90, 148], knee2: [110, 121], foot2: [112, 148] },
        { head: [94, 33], sh: [94, 52], hip: [90, 94], elbow: [104, 74], hand: [96, 92], knee: [92, 121], foot: [90, 148], knee2: [110, 121], foot2: [112, 148] },
        { head: [100, 36], sh: [100, 55], hip: [100, 99], elbow: [112, 76], hand: [104, 94], knee: [92, 121], foot: [90, 148], knee2: [110, 121], foot2: [112, 148] },
      ],
      A: { head: [106, 33], sh: [106, 52], hip: [110, 94], elbow: [118, 74], hand: [112, 92], knee: [92, 121], foot: [90, 148], knee2: [110, 121], foot2: [112, 148] },
      B: { head: [100, 36], sh: [100, 55], hip: [100, 99], elbow: [112, 76], hand: [104, 94], knee: [92, 121], foot: [90, 148], knee2: [110, 121], foot2: [112, 148] } } },

  ankle_rocks: { ground: 150,
    side: { bones: SB2, spine: SP,
      frames: [
        { head: [100, 30], sh: [100, 50], hip: [100, 93], elbow: [100, 72], hand: [100, 92], knee: [94, 121], foot: [92, 148], knee2: [108, 121], foot2: [110, 148] },
        { head: [102, 31], sh: [101, 51], hip: [101, 95], elbow: [101, 73], hand: [101, 93], knee: [104, 120], foot: [92, 148], knee2: [108, 121], foot2: [110, 148] },
        { head: [104, 32], sh: [102, 52], hip: [102, 96], elbow: [102, 74], hand: [102, 94], knee: [116, 120], foot: [92, 148], knee2: [108, 121], foot2: [110, 148] },
      ],
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], elbow: [100, 72], hand: [100, 92], knee: [94, 121], foot: [92, 148], knee2: [108, 121], foot2: [110, 148] },
      B: { head: [104, 32], sh: [102, 52], hip: [102, 96], elbow: [102, 74], hand: [102, 94], knee: [116, 120], foot: [92, 148], knee2: [108, 121], foot2: [110, 148] } } },

  shoulder_circles: { ground: 150, cycle: true,
    side: { bones: SB2, spine: SP,
      frames: [
        { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [92, 121], foot: [90, 148], knee2: [110, 121], foot2: [112, 148], elbow: [112, 66], hand: [122, 82] },
        { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [92, 121], foot: [90, 148], knee2: [110, 121], foot2: [112, 148], elbow: [104, 40], hand: [106, 22] },
        { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [92, 121], foot: [90, 148], knee2: [110, 121], foot2: [112, 148], elbow: [90, 46], hand: [80, 32] },
        { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [92, 121], foot: [90, 148], knee2: [110, 121], foot2: [112, 148], elbow: [92, 72], hand: [82, 90] },
      ],
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [92, 121], foot: [90, 148], knee2: [110, 121], foot2: [112, 148], elbow: [112, 66], hand: [122, 82] },
      B: { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [92, 121], foot: [90, 148], knee2: [110, 121], foot2: [112, 148], elbow: [92, 72], hand: [82, 90] } } },

  thoracic_open: { ground: 150, vb: "0 90 200 75",
    side: { bones: [["sh", "hip"], ["sh", "elbow"], ["elbow", "hand"], ["sh", "elbowR"], ["elbowR", "handR"], ["hip", "knee"], ["knee", "foot"]], spine: SP,
      frames: [
        { head: [88, 118], sh: [98, 116], hip: [130, 118], elbow: [96, 134], hand: [94, 150], elbowR: [104, 134], handR: [108, 148], knee: [130, 134], foot: [130, 150] },
        { head: [89, 114], sh: [98, 116], hip: [130, 118], elbow: [96, 134], hand: [94, 150], elbowR: [100, 120], handR: [104, 114], knee: [130, 134], foot: [130, 150] },
        { head: [90, 110], sh: [98, 116], hip: [130, 118], elbow: [96, 134], hand: [94, 150], elbowR: [94, 104], handR: [96, 92], knee: [130, 134], foot: [130, 150] },
      ],
      A: { head: [88, 118], sh: [98, 116], hip: [130, 118], elbow: [96, 134], hand: [94, 150], elbowR: [104, 134], handR: [108, 148], knee: [130, 134], foot: [130, 150] },
      B: { head: [90, 110], sh: [98, 116], hip: [130, 118], elbow: [96, 134], hand: [94, 150], elbowR: [94, 104], handR: [96, 92], knee: [130, 134], foot: [130, 150] } } },

  // Warmup v2 (RAMP): Puls- und Mobilitäts-Muster ohne bestehendes Pendant.
  jumping_jacks: { ground: 150,
    side: { bones: FB, spine: SP,
      frames: [
        { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [78, 36], handL: [66, 18], elbowR: [122, 36], handR: [134, 18], kneeL: [84, 122], footL: [72, 148], kneeR: [116, 122], footR: [128, 148] },
        { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [82, 48], handL: [66, 44], elbowR: [118, 48], handR: [134, 44], kneeL: [90, 122], footL: [82, 148], kneeR: [110, 122], footR: [118, 148] },
        { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [86, 66], handL: [90, 84], elbowR: [114, 66], handR: [110, 84], kneeL: [95, 121], footL: [94, 148], kneeR: [105, 121], footR: [106, 148] },
      ],
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [78, 36], handL: [66, 18], elbowR: [122, 36], handR: [134, 18], kneeL: [84, 122], footL: [72, 148], kneeR: [116, 122], footR: [128, 148] },
      B: { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [86, 66], handL: [90, 84], elbowR: [114, 66], handR: [110, 84], kneeL: [95, 121], footL: [94, 148], kneeR: [105, 121], footR: [106, 148] } } },

  march_high: { ground: 150,
    side: { bones: SB2, spine: SP,
      frames: [
        { head: [100, 30], sh: [100, 50], hip: [100, 93], elbow: [112, 58], hand: [124, 46], knee: [98, 121], foot: [96, 148], knee2: [118, 96], foot2: [112, 120] },
        { head: [100, 30], sh: [100, 50], hip: [100, 93], elbow: [102, 70], hand: [106, 88], knee: [99, 121], foot: [97, 148], knee2: [104, 119], foot2: [106, 146] },
        { head: [100, 30], sh: [100, 50], hip: [100, 93], elbow: [90, 60], hand: [80, 48], knee: [118, 96], foot: [112, 120], knee2: [102, 121], foot2: [104, 148] },
      ],
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], elbow: [112, 58], hand: [124, 46], knee: [98, 121], foot: [96, 148], knee2: [118, 96], foot2: [112, 120] },
      B: { head: [100, 30], sh: [100, 50], hip: [100, 93], elbow: [90, 60], hand: [80, 48], knee: [118, 96], foot: [112, 120], knee2: [102, 121], foot2: [104, 148] } } },

  worlds_greatest: { ground: 150,
    side: { bones: [["sh", "hip"], ["sh", "elbow"], ["elbow", "hand"], ["sh", "elbow2"], ["elbow2", "hand2"], ["hip", "knee"], ["knee", "foot"], ["hip", "knee2"], ["knee2", "foot2"]], spine: SP,
      frames: [
        { head: [72, 74], sh: [84, 82], hip: [116, 100], elbow: [78, 102], hand: [74, 126], elbow2: [90, 66], hand2: [94, 46], knee: [84, 124], foot: [80, 148], knee2: [136, 124], foot2: [152, 146] },
        { head: [74, 78], sh: [84, 84], hip: [116, 100], elbow: [78, 104], hand: [74, 126], elbow2: [88, 84], hand2: [92, 66], knee: [84, 124], foot: [80, 148], knee2: [136, 124], foot2: [152, 146] },
        { head: [76, 84], sh: [84, 88], hip: [116, 100], elbow: [80, 106], hand: [76, 124], elbow2: [88, 108], hand2: [86, 126], knee: [84, 124], foot: [80, 148], knee2: [136, 124], foot2: [152, 146] },
        { head: [78, 88], sh: [84, 90], hip: [116, 100], elbow: [80, 108], hand: [76, 126], elbow2: [88, 110], hand2: [86, 130], knee: [84, 124], foot: [80, 148], knee2: [136, 124], foot2: [152, 146] },
      ],
      A: { head: [72, 74], sh: [84, 82], hip: [116, 100], elbow: [78, 102], hand: [74, 126], elbow2: [90, 66], hand2: [94, 46], knee: [84, 124], foot: [80, 148], knee2: [136, 124], foot2: [152, 146] },
      B: { head: [78, 88], sh: [84, 90], hip: [116, 100], elbow: [80, 108], hand: [76, 126], elbow2: [88, 110], hand2: [86, 130], knee: [84, 124], foot: [80, 148], knee2: [136, 124], foot2: [152, 146] } } },

  leg_swings: { ground: 150,
    side: { bones: SB2, spine: SP,
      frames: [
        { head: [104, 31], sh: [103, 51], hip: [100, 93], elbow: [112, 64], hand: [124, 58], knee: [100, 121], foot: [100, 148], knee2: [114, 114], foot2: [130, 134] },
        { head: [100, 30], sh: [100, 50], hip: [100, 93], elbow: [112, 64], hand: [124, 58], knee: [100, 121], foot: [100, 148], knee2: [101, 119], foot2: [102, 144] },
        { head: [96, 31], sh: [97, 51], hip: [100, 93], elbow: [112, 64], hand: [124, 58], knee: [100, 121], foot: [100, 148], knee2: [86, 104], foot2: [68, 112] },
      ],
      A: { head: [104, 31], sh: [103, 51], hip: [100, 93], elbow: [112, 64], hand: [124, 58], knee: [100, 121], foot: [100, 148], knee2: [114, 114], foot2: [130, 134] },
      B: { head: [96, 31], sh: [97, 51], hip: [100, 93], elbow: [112, 64], hand: [124, 58], knee: [100, 121], foot: [100, 148], knee2: [86, 104], foot2: [68, 112] } } },

  arm_crossswings: { ground: 150,
    side: { bones: FB, spine: SP,
      frames: [
        { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [78, 52], handL: [58, 50], elbowR: [122, 52], handR: [142, 50], kneeL: [93, 121], footL: [92, 148], kneeR: [107, 121], footR: [108, 148] },
        { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [86, 56], handL: [72, 56], elbowR: [114, 56], handR: [128, 56], kneeL: [93, 121], footL: [92, 148], kneeR: [107, 121], footR: [108, 148] },
        { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [92, 60], handL: [112, 52], elbowR: [108, 62], handR: [88, 54], kneeL: [93, 121], footL: [92, 148], kneeR: [107, 121], footR: [108, 148] },
      ],
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [78, 52], handL: [58, 50], elbowR: [122, 52], handR: [142, 50], kneeL: [93, 121], footL: [92, 148], kneeR: [107, 121], footR: [108, 148] },
      B: { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [92, 60], handL: [112, 52], elbowR: [108, 62], handR: [88, 54], kneeL: [93, 121], footL: [92, 148], kneeR: [107, 121], footR: [108, 148] } } },

  side_steps: { ground: 150,
    side: { bones: FB, spine: SP,
      frames: [
        { head: [112, 44], sh: [112, 62], hip: [112, 101], elbowL: [100, 78], handL: [98, 94], elbowR: [124, 78], handR: [126, 94], kneeL: [106, 125], footL: [104, 148], kneeR: [118, 125], footR: [120, 148] },
        { head: [100, 46], sh: [100, 64], hip: [100, 103], elbowL: [86, 80], handL: [84, 96], elbowR: [114, 80], handR: [116, 96], kneeL: [80, 126], footL: [70, 148], kneeR: [120, 126], footR: [130, 148] },
        { head: [88, 44], sh: [88, 62], hip: [88, 101], elbowL: [76, 78], handL: [74, 94], elbowR: [100, 78], handR: [102, 94], kneeL: [82, 125], footL: [80, 148], kneeR: [94, 125], footR: [96, 148] },
      ],
      A: { head: [112, 44], sh: [112, 62], hip: [112, 101], elbowL: [100, 78], handL: [98, 94], elbowR: [124, 78], handR: [126, 94], kneeL: [106, 125], footL: [104, 148], kneeR: [118, 125], footR: [120, 148] },
      B: { head: [100, 46], sh: [100, 64], hip: [100, 103], elbowL: [86, 80], handL: [84, 96], elbowR: [114, 80], handR: [116, 96], kneeL: [80, 126], footL: [70, 148], kneeR: [120, 126], footR: [130, 148] } } },

  bike_easy: { ground: 150, cycle: true,
    side: { bones: SB2, spine: SP, static: [{ t: "line", x1: 120, y1: 128, x2: 120, y2: 150, c: "#737373", w: 4 }, { t: "line", x1: 120, y1: 84, x2: 120, y2: 128, c: "#525252", w: 3 }],
      frames: [
        { head: [84, 44], sh: [90, 62], hip: [100, 100], elbow: [106, 78], hand: [120, 84], knee: [112, 112], foot: [121, 118], knee2: [117, 121], foot2: [121, 140] },
        { head: [84, 44], sh: [90, 62], hip: [100, 100], elbow: [106, 78], hand: [120, 84], knee: [116, 116], foot: [132, 129], knee2: [111, 116], foot2: [110, 129] },
        { head: [84, 44], sh: [90, 62], hip: [100, 100], elbow: [106, 78], hand: [120, 84], knee: [117, 121], foot: [121, 140], knee2: [112, 112], foot2: [121, 118] },
        { head: [84, 44], sh: [90, 62], hip: [100, 100], elbow: [106, 78], hand: [120, 84], knee: [111, 116], foot: [110, 129], knee2: [116, 116], foot2: [132, 129] },
      ],
      A: { head: [84, 44], sh: [90, 62], hip: [100, 100], elbow: [106, 78], hand: [120, 84], knee: [112, 112], foot: [121, 118], knee2: [117, 121], foot2: [121, 140] },
      B: { head: [84, 44], sh: [90, 62], hip: [100, 100], elbow: [106, 78], hand: [120, 84], knee: [111, 116], foot: [110, 129], knee2: [116, 116], foot2: [132, 129] } } },

  // Warmup v3: eigene Zeichnungen statt geliehener Übungs-Posen.
  squat_pry: { ground: 150,
    side: { bones: SB, spine: SP,
      frames: [
        { head: [112, 68], sh: [108, 86], hip: [100, 126], knee: [142, 122], foot: [119, 148], elbow: [122, 104], hand: [114, 113] },
        { head: [112, 66], sh: [108, 84], hip: [100, 124], knee: [134, 124], foot: [119, 148], elbow: [118, 102], hand: [112, 112] },
        { head: [108, 54], sh: [105, 73], hip: [100, 114], knee: [126, 123], foot: [119, 148], elbow: [114, 90], hand: [108, 102] },
        { head: [101, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [110, 72], hand: [106, 88] },
      ],
      A: { head: [112, 68], sh: [108, 86], hip: [100, 126], knee: [142, 122], foot: [119, 148], elbow: [122, 104], hand: [114, 113] },
      B: { head: [101, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [110, 72], hand: [106, 88] } } },

  hip_flexor_dyn: { ground: 150,
    side: { bones: SB2, spine: SP,
      frames: [
        { head: [96, 38], sh: [97, 56], hip: [100, 102], knee: [88, 124], foot: [84, 148], knee2: [126, 130], foot2: [148, 148], elbow: [100, 78], hand: [102, 96] },
        { head: [100, 40], sh: [100, 58], hip: [104, 104], knee: [90, 125], foot: [84, 148], knee2: [128, 131], foot2: [148, 148], elbow: [103, 80], hand: [104, 98] },
        { head: [104, 42], sh: [103, 60], hip: [108, 106], knee: [92, 126], foot: [84, 148], knee2: [130, 132], foot2: [148, 148], elbow: [106, 82], hand: [106, 100] },
      ],
      A: { head: [96, 38], sh: [97, 56], hip: [100, 102], knee: [88, 124], foot: [84, 148], knee2: [126, 130], foot2: [148, 148], elbow: [100, 78], hand: [102, 96] },
      B: { head: [104, 42], sh: [103, 60], hip: [108, 106], knee: [92, 126], foot: [84, 148], knee2: [130, 132], foot2: [148, 148], elbow: [106, 82], hand: [106, 100] } } },

  scap_pushup: { ground: 150, vb: "0 90 200 75",
    side: { bones: SB, spine: SPL,
      frames: [
        { head: [58, 112], sh: [72, 116], hip: [120, 131], knee: [150, 138], foot: [182, 148], elbow: [72, 133], hand: [72, 150] },
        { head: [58, 118], sh: [72, 122], hip: [120, 134], knee: [150, 140], foot: [182, 148], elbow: [72, 136], hand: [72, 150] },
      ],
      A: { head: [58, 112], sh: [72, 116], hip: [120, 131], knee: [150, 138], foot: [182, 148], elbow: [72, 133], hand: [72, 150] },
      B: { head: [58, 118], sh: [72, 122], hip: [120, 134], knee: [150, 140], foot: [182, 148], elbow: [72, 136], hand: [72, 150] } } },

  band_pullapart: { ground: 150,
    side: { bones: FB, spine: SP, equip: { kind: "band2", hands: ["handL", "handR"] },
      frames: [
        { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [80, 52], handL: [62, 52], elbowR: [120, 52], handR: [138, 52], kneeL: [93, 121], footL: [92, 148], kneeR: [107, 121], footR: [108, 148] },
        { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [88, 54], handL: [78, 54], elbowR: [112, 54], handR: [122, 54], kneeL: [93, 121], footL: [92, 148], kneeR: [107, 121], footR: [108, 148] },
        { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [94, 56], handL: [90, 58], elbowR: [106, 56], handR: [110, 58], kneeL: [93, 121], footL: [92, 148], kneeR: [107, 121], footR: [108, 148] },
      ],
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [80, 52], handL: [62, 52], elbowR: [120, 52], handR: [138, 52], kneeL: [93, 121], footL: [92, 148], kneeR: [107, 121], footR: [108, 148] },
      B: { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [94, 56], handL: [90, 58], elbowR: [106, 56], handR: [110, 58], kneeL: [93, 121], footL: [92, 148], kneeR: [107, 121], footR: [108, 148] } } },

  wall_slides: { ground: 150,
    side: { bones: FB, spine: SP,
      frames: [
        { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [88, 36], handL: [86, 18], elbowR: [112, 36], handR: [114, 18], kneeL: [93, 121], footL: [92, 148], kneeR: [107, 121], footR: [108, 148] },
        { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [84, 44], handL: [84, 28], elbowR: [116, 44], handR: [116, 28], kneeL: [93, 121], footL: [92, 148], kneeR: [107, 121], footR: [108, 148] },
        { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [80, 52], handL: [78, 34], elbowR: [120, 52], handR: [122, 34], kneeL: [93, 121], footL: [92, 148], kneeR: [107, 121], footR: [108, 148] },
      ],
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [88, 36], handL: [86, 18], elbowR: [112, 36], handR: [114, 18], kneeL: [93, 121], footL: [92, 148], kneeR: [107, 121], footR: [108, 148] },
      B: { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [80, 52], handL: [78, 34], elbowR: [120, 52], handR: [122, 34], kneeL: [93, 121], footL: [92, 148], kneeR: [107, 121], footR: [108, 148] } } },

  pogo_calf: { ground: 150,
    side: { bones: SB, spine: SP,
      frames: [
        { head: [100, 32], sh: [100, 52], hip: [100, 95], knee: [100, 122], foot: [100, 148], elbow: [104, 74], hand: [106, 92] },
        { head: [100, 26], sh: [100, 46], hip: [100, 89], knee: [100, 116], foot: [100, 143], elbow: [104, 68], hand: [106, 86] },
        { head: [100, 18], sh: [100, 38], hip: [100, 81], knee: [100, 110], foot: [100, 138], elbow: [104, 60], hand: [106, 78] },
      ],
      A: { head: [100, 32], sh: [100, 52], hip: [100, 95], knee: [100, 122], foot: [100, 148], elbow: [104, 74], hand: [106, 92] },
      B: { head: [100, 18], sh: [100, 38], hip: [100, 81], knee: [100, 110], foot: [100, 138], elbow: [104, 60], hand: [106, 78] } } },
};

export function lerp(a: number, b: number, f: number) {
  return a + (b - a) * f;
}

export function lerpPts(A: Frame | undefined, B: Frame | undefined, f: number): Frame {
  // Total over partial/missing poses: a degenerate sequence (e.g. an authored
  // `frames` with a hole, or a view missing one end) must never throw — it just
  // renders the pose it does have. `cap()` skips any point that's still absent.
  const a = A ?? B ?? {};
  const b = B ?? A ?? {};
  const o: Frame = {};
  for (const k in a) {
    const pa = a[k];
    const pb = b[k] || pa;
    if (!pa || !pb) continue;
    o[k] = [lerp(pa[0], pb[0], f), lerp(pa[1], pb[1], f)];
  }
  return o;
}
