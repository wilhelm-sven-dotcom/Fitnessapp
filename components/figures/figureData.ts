/* ===================== Figuren (animiert, datengetrieben). Grün = Wirbelsäule. ===================== */
/* Datenpunkte 1:1 aus dem Prototyp übernommen. */

export type Pt = [number, number];
export type Frame = Record<string, Pt>;
export type Bone = [string, string];

export interface EquipDef {
  kind: "db" | "goblet" | "kbHip" | "band" | "strap";
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
  side: ViewDef;
  front?: ViewDef;
}

export const SB: Bone[] = [["sh", "hip"], ["sh", "elbow"], ["elbow", "hand"], ["hip", "knee"], ["knee", "foot"]];
export const SB2: Bone[] = [...SB, ["hip", "knee2"], ["knee2", "foot2"]];
export const SBR: Bone[] = [...SB, ["sh", "elbow2"], ["elbow2", "hand2"]];
export const FB: Bone[] = [["sh", "hip"], ["sh", "elbowL"], ["elbowL", "handL"], ["sh", "elbowR"], ["elbowR", "handR"], ["hip", "kneeL"], ["kneeL", "footL"], ["hip", "kneeR"], ["kneeR", "footR"]];
export const SP: Bone[] = [["sh", "hip"]];
export const SPL: Bone[] = [["sh", "hip"], ["hip", "knee"], ["knee", "foot"]];

/** A view's pose sequence — the authored `frames`, or [A, B] for legacy 2-pose figures. */
export function framesOf(v: ViewDef): Frame[] {
  return v.frames && v.frames.length >= 2 ? v.frames : [v.A, v.B];
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

export const FIG: Record<string, FigureDef> = {
  goblet: { ground: 150,
    side: { bones: SB, spine: SP, equip: { kind: "goblet", hands: ["hand"] },
      frames: [
        { head: [101, 30], sh: [100, 50], hip: [100, 93], elbow: [114, 72], hand: [101, 84], knee: [100, 121], foot: [100, 148] },
        { head: [108, 54], sh: [105, 73], hip: [100, 114], elbow: [118, 92], hand: [104, 103], knee: [126, 123], foot: [119, 148] },
        { head: [112, 66], sh: [108, 84], hip: [100, 124], elbow: [120, 102], hand: [106, 113], knee: [134, 124], foot: [119, 148] },
      ],
      A: { head: [101, 30], sh: [100, 50], hip: [100, 93], elbow: [114, 72], hand: [101, 84], knee: [100, 121], foot: [100, 148] },
      B: { head: [108, 54], sh: [105, 73], hip: [100, 114], elbow: [118, 92], hand: [104, 103], knee: [126, 123], foot: [119, 148] } },
    front: { bones: FB, spine: SP, equip: { kind: "goblet", hands: ["handL", "handR"] },
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [84, 68], handL: [96, 80], elbowR: [116, 68], handR: [104, 80], kneeL: [92, 121], footL: [90, 148], kneeR: [108, 121], footR: [110, 148] },
      B: { head: [100, 52], sh: [100, 72], hip: [100, 113], elbowL: [84, 90], handL: [96, 102], elbowR: [116, 90], handR: [104, 102], kneeL: [84, 124], footL: [84, 148], kneeR: [116, 124], footR: [116, 148] } } },

  floorpress: { ground: 150, vb: "0 90 200 75",
    side: { bones: SB, spine: SP, equip: { kind: "db", hands: ["hand"] },
      A: { head: [58, 146], sh: [76, 146], hip: [126, 146], knee: [150, 130], foot: [166, 150], elbow: [98, 150], hand: [104, 138] },
      B: { head: [58, 146], sh: [76, 146], hip: [126, 146], knee: [150, 130], foot: [166, 150], elbow: [100, 126], hand: [103, 106] } } },

  glutebridge: { ground: 150, vb: "0 90 200 75",
    side: { bones: SB, spine: SP, equip: { kind: "kbHip", at: "hip" },
      A: { head: [58, 146], sh: [72, 146], hip: [114, 140], knee: [150, 120], foot: [158, 150] },
      B: { head: [58, 146], sh: [72, 146], hip: [120, 115], knee: [150, 118], foot: [158, 150] } } },

  ohp_seat: { ground: 150,
    side: { bones: SB, spine: SP, equip: { kind: "db", hands: ["hand"] }, static: [{ t: "rect", x: 86, y: 120, w: 46, h: 12 }],
      A: { head: [100, 30], sh: [100, 50], hip: [100, 118], knee: [128, 118], foot: [128, 148], elbow: [100, 68], hand: [104, 54] },
      B: { head: [100, 30], sh: [100, 50], hip: [100, 118], knee: [128, 118], foot: [128, 148], elbow: [100, 46], hand: [101, 28] } },
    front: { bones: FB, spine: SP, equip: { kind: "db", hands: ["handL", "handR"] }, static: [{ t: "rect", x: 86, y: 120, w: 46, h: 12 }],
      A: { head: [100, 30], sh: [100, 50], hip: [100, 118], kneeL: [92, 118], footL: [90, 148], kneeR: [108, 118], footR: [110, 148], elbowL: [82, 52], handL: [80, 36], elbowR: [118, 52], handR: [120, 36] },
      B: { head: [100, 30], sh: [100, 50], hip: [100, 118], kneeL: [92, 118], footL: [90, 148], kneeR: [108, 118], footR: [110, 148], elbowL: [88, 44], handL: [88, 26], elbowR: [112, 44], handR: [112, 26] } } },

  plank: { ground: 150, vb: "0 90 200 75",
    side: { bones: SB, spine: SPL,
      A: { head: [58, 118], sh: [70, 121], hip: [120, 134], knee: [150, 141], foot: [180, 148], elbow: [72, 150], hand: [58, 150] },
      B: { head: [58, 116], sh: [70, 119], hip: [120, 133], knee: [150, 140], foot: [180, 147], elbow: [72, 150], hand: [58, 150] } } },

  bss: { ground: 150,
    side: { bones: SB2, spine: SP, equip: { kind: "db", hands: ["hand"] }, static: [{ t: "rect", x: 150, y: 120, w: 44, h: 30 }],
      A: { head: [100, 28], sh: [100, 48], hip: [100, 96], knee: [96, 123], foot: [92, 148], knee2: [130, 118], foot2: [158, 122], elbow: [100, 72], hand: [100, 92] },
      B: { head: [102, 46], sh: [102, 66], hip: [100, 114], knee: [100, 128], foot: [96, 148], knee2: [126, 128], foot2: [158, 122], elbow: [101, 90], hand: [101, 110] } },
    front: { bones: FB, spine: SP, equip: { kind: "db", hands: ["handL", "handR"] },
      A: { head: [100, 30], sh: [100, 50], hip: [100, 94], kneeL: [94, 122], footL: [92, 148], kneeR: [106, 122], footR: [108, 148], elbowL: [84, 72], handL: [84, 93], elbowR: [116, 72], handR: [116, 93] },
      B: { head: [100, 46], sh: [100, 66], hip: [100, 110], kneeL: [90, 128], footL: [88, 148], kneeR: [110, 128], footR: [112, 148], elbowL: [84, 88], handL: [84, 109], elbowR: [116, 88], handR: [116, 109] } } },

  pullup: { ground: null,
    side: { bones: SB, spine: SP, static: [{ t: "line", x1: 58, y1: 22, x2: 148, y2: 22, c: "#737373", w: 5 }],
      A: { head: [100, 46], sh: [100, 58], hip: [100, 104], knee: [100, 128], foot: [100, 150], elbow: [101, 40], hand: [100, 26] },
      B: { head: [100, 30], sh: [100, 42], hip: [100, 88], knee: [100, 112], foot: [100, 134], elbow: [104, 32], hand: [100, 26] } },
    front: { bones: FB, spine: SP, static: [{ t: "line", x1: 55, y1: 22, x2: 145, y2: 22, c: "#737373", w: 5 }],
      A: { head: [100, 46], sh: [100, 58], hip: [100, 104], elbowL: [88, 40], handL: [80, 26], elbowR: [112, 40], handR: [120, 26], kneeL: [94, 128], footL: [94, 150], kneeR: [106, 128], footR: [106, 150] },
      B: { head: [100, 30], sh: [100, 42], hip: [100, 88], elbowL: [90, 32], handL: [80, 26], elbowR: [110, 32], handR: [120, 26], kneeL: [96, 112], footL: [96, 134], kneeR: [104, 112], footR: [104, 134] } } },

  row1: { ground: 150,
    side: { bones: SBR, spine: SP, equip: { kind: "db", hands: ["hand2"] }, static: [{ t: "rect", x: 56, y: 112, w: 40, h: 38 }],
      A: { head: [92, 80], sh: [104, 82], hip: [150, 98], elbow: [98, 96], hand: [80, 112], knee: [156, 124], foot: [156, 150], elbow2: [150, 104], hand2: [150, 120] },
      B: { head: [92, 80], sh: [104, 82], hip: [150, 98], elbow: [98, 96], hand: [80, 112], knee: [156, 124], foot: [156, 150], elbow2: [150, 88], hand2: [150, 104] } } },

  curl: { ground: 150,
    side: { bones: SB, spine: SP, equip: { kind: "db", hands: ["hand"] },
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [101, 72], hand: [103, 92] },
      B: { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [101, 72], hand: [112, 60] } },
    front: { bones: FB, spine: SP, equip: { kind: "db", hands: ["handL", "handR"] },
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [86, 70], handL: [84, 92], elbowR: [114, 70], handR: [116, 92], kneeL: [92, 121], footL: [91, 148], kneeR: [108, 121], footR: [109, 148] },
      B: { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [86, 70], handL: [90, 58], elbowR: [114, 70], handR: [110, 58], kneeL: [92, 121], footL: [91, 148], kneeR: [108, 121], footR: [109, 148] } } },

  pallof: { ground: 150,
    side: { bones: SB, spine: SP, equip: { kind: "band", from: [186, 84], to: "hand" }, static: [{ t: "rect", x: 182, y: 72, w: 8, h: 40 }],
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [112, 66], hand: [120, 72] },
      B: { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [130, 72], hand: [150, 76] } } },

  stepup: { ground: 150,
    side: { bones: SB2, spine: SP, equip: { kind: "db", hands: ["hand"] }, static: [{ t: "rect", x: 128, y: 116, w: 58, h: 34 }],
      A: { head: [100, 36], sh: [100, 56], hip: [100, 100], knee: [122, 120], foot: [146, 118], knee2: [96, 126], foot2: [92, 148], elbow: [100, 78], hand: [100, 98] },
      B: { head: [100, 16], sh: [100, 36], hip: [100, 78], knee: [140, 110], foot: [146, 118], knee2: [122, 104], foot2: [126, 118], elbow: [100, 56], hand: [100, 76] } },
    front: { bones: FB, spine: SP, equip: { kind: "db", hands: ["handL", "handR"] }, static: [{ t: "rect", x: 80, y: 116, w: 40, h: 34 }],
      A: { head: [100, 38], sh: [100, 58], hip: [100, 100], kneeL: [92, 126], footL: [90, 148], kneeR: [108, 118], footR: [104, 118], elbowL: [84, 78], handL: [82, 98], elbowR: [116, 78], handR: [118, 98] },
      B: { head: [100, 20], sh: [100, 40], hip: [100, 80], kneeL: [92, 108], footL: [92, 120], kneeR: [108, 108], footR: [104, 118], elbowL: [84, 58], handL: [82, 78], elbowR: [116, 58], handR: [118, 78] } } },

  dips: { ground: null,
    side: { bones: SB, spine: SP, equip: { kind: "strap", lines: [[[96, 18], "hand"]] },
      A: { head: [100, 62], sh: [100, 80], hip: [100, 118], knee: [112, 128], foot: [120, 116], elbow: [96, 96], hand: [96, 82] },
      B: { head: [100, 44], sh: [100, 62], hip: [100, 100], knee: [112, 112], foot: [120, 100], elbow: [96, 80], hand: [96, 82] } },
    front: { bones: FB, spine: SP, equip: { kind: "strap", lines: [[[88, 18], "handL"], [[112, 18], "handR"]] },
      A: { head: [100, 60], sh: [100, 78], hip: [100, 116], elbowL: [86, 92], handL: [86, 80], elbowR: [114, 92], handR: [114, 80], kneeL: [92, 128], footL: [88, 140], kneeR: [108, 128], footR: [112, 140] },
      B: { head: [100, 44], sh: [100, 62], hip: [100, 100], elbowL: [86, 78], handL: [86, 80], elbowR: [114, 78], handR: [114, 80], kneeL: [92, 112], footL: [88, 124], kneeR: [108, 112], footR: [112, 124] } } },

  ringrow: { ground: 150,
    side: { bones: SB, spine: SPL, equip: { kind: "strap", lines: [[[126, 18], "hand"]] },
      A: { head: [102, 108], sh: [112, 112], hip: [150, 130], knee: [168, 139], foot: [186, 148], elbow: [120, 100], hand: [126, 90] },
      B: { head: [102, 94], sh: [112, 98], hip: [150, 122], knee: [168, 135], foot: [186, 148], elbow: [122, 92], hand: [126, 90] } } },

  lateral: { ground: 150,
    side: { bones: SB, spine: SP, equip: { kind: "db", hands: ["hand"] },
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [103, 70], hand: [104, 90] },
      B: { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [112, 56], hand: [122, 50] } },
    front: { bones: FB, spine: SP, equip: { kind: "db", hands: ["handL", "handR"] },
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [88, 68], handL: [86, 90], elbowR: [112, 68], handR: [114, 90], kneeL: [92, 121], footL: [91, 148], kneeR: [108, 121], footR: [109, 148] },
      B: { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [78, 54], handL: [64, 50], elbowR: [122, 54], handR: [136, 50], kneeL: [92, 121], footL: [91, 148], kneeR: [108, 121], footR: [109, 148] } } },

  sideplank: { ground: 150, vb: "0 90 200 75",
    side: { bones: SB, spine: SPL,
      A: { head: [82, 118], sh: [92, 121], hip: [134, 138], knee: [164, 144], foot: [188, 150], elbow: [92, 150], hand: [80, 150] },
      B: { head: [82, 114], sh: [92, 118], hip: [134, 132], knee: [164, 140], foot: [188, 148], elbow: [92, 150], hand: [80, 150] } } },

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

  reverse_lunge: { ground: 150,
    side: { bones: SB2, spine: SP, equip: { kind: "db", hands: ["hand"] },
      A: { head: [100, 28], sh: [100, 48], hip: [100, 93], knee: [100, 120], foot: [100, 148], knee2: [104, 120], foot2: [104, 148], elbow: [100, 70], hand: [100, 90] },
      B: { head: [100, 42], sh: [100, 62], hip: [100, 100], knee: [96, 124], foot: [92, 148], knee2: [122, 128], foot2: [144, 148], elbow: [100, 84], hand: [100, 104] } },
    front: { bones: FB, spine: SP, equip: { kind: "db", hands: ["handL", "handR"] },
      A: { head: [100, 28], sh: [100, 48], hip: [100, 93], elbowL: [84, 70], handL: [84, 90], elbowR: [116, 70], handR: [116, 90], kneeL: [94, 120], footL: [92, 148], kneeR: [106, 120], footR: [108, 148] },
      B: { head: [100, 40], sh: [100, 60], hip: [100, 103], elbowL: [84, 82], handL: [84, 102], elbowR: [116, 82], handR: [116, 102], kneeL: [94, 126], footL: [92, 150], kneeR: [104, 124], footR: [104, 138] } } },

  hip_thrust: { ground: 150, vb: "0 90 200 75",
    side: { bones: SB, spine: SP, equip: { kind: "kbHip", at: "hip" }, static: [{ t: "rect", x: 40, y: 116, w: 34, h: 34 }],
      A: { head: [52, 120], sh: [66, 120], hip: [110, 142], knee: [150, 122], foot: [158, 150] },
      B: { head: [52, 118], sh: [66, 118], hip: [118, 118], knee: [150, 118], foot: [158, 150] } } },

  rdl_db: { ground: 150,
    side: { bones: SB, spine: SP, equip: { kind: "db", hands: ["hand"] },
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [100, 70], hand: [100, 90] },
      B: { head: [128, 66], sh: [120, 72], hip: [96, 96], knee: [100, 120], foot: [100, 148], elbow: [120, 92], hand: [120, 112] } } },

  pushup: { ground: 150, vb: "0 90 200 75",
    side: { bones: SB, spine: SPL,
      frames: [
        { head: [58, 114], sh: [72, 118], hip: [120, 132], knee: [150, 139], foot: [182, 148], elbow: [72, 133], hand: [72, 150] },
        { head: [58, 122], sh: [72, 125], hip: [120, 137], knee: [150, 143], foot: [182, 149], elbow: [66, 137], hand: [76, 150] },
        { head: [58, 130], sh: [72, 132], hip: [120, 141], knee: [150, 146], foot: [182, 150], elbow: [60, 143], hand: [80, 150] },
      ],
      A: { head: [58, 114], sh: [72, 118], hip: [120, 132], knee: [150, 139], foot: [182, 148], elbow: [72, 133], hand: [72, 150] },
      B: { head: [58, 130], sh: [72, 132], hip: [120, 141], knee: [150, 146], foot: [182, 150], elbow: [60, 143], hand: [80, 150] } } },

  ohp_stand: { ground: 150,
    side: { bones: SB, spine: SP, equip: { kind: "db", hands: ["hand"] },
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [100, 68], hand: [104, 54] },
      B: { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [100, 46], hand: [101, 28] } },
    front: { bones: FB, spine: SP, equip: { kind: "db", hands: ["handL", "handR"] },
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [84, 66], handL: [82, 52], elbowR: [116, 66], handR: [118, 52], kneeL: [92, 121], footL: [91, 148], kneeR: [108, 121], footR: [109, 148] },
      B: { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [88, 44], handL: [88, 26], elbowR: [112, 44], handR: [112, 26], kneeL: [92, 121], footL: [91, 148], kneeR: [108, 121], footR: [109, 148] } } },

  pike_pushup: { ground: 150,
    side: { bones: SB, spine: SP,
      A: { head: [84, 120], sh: [96, 112], hip: [120, 96], knee: [140, 118], foot: [158, 148], elbow: [88, 128], hand: [78, 140] },
      B: { head: [80, 134], sh: [94, 124], hip: [120, 98], knee: [140, 120], foot: [158, 148], elbow: [82, 138], hand: [76, 150] } } },

  band_row: { ground: 150,
    side: { bones: SB, spine: SP, equip: { kind: "band", from: [188, 74], to: "hand" }, static: [{ t: "rect", x: 184, y: 58, w: 8, h: 40 }],
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [120, 68], hand: [150, 72] },
      B: { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [88, 70], hand: [78, 74] } } },

  chinup: { ground: null,
    side: { bones: SB, spine: SP, static: [{ t: "line", x1: 58, y1: 22, x2: 148, y2: 22, c: "#737373", w: 5 }],
      A: { head: [100, 46], sh: [100, 58], hip: [100, 104], knee: [100, 128], foot: [100, 150], elbow: [101, 40], hand: [100, 26] },
      B: { head: [100, 30], sh: [100, 42], hip: [100, 88], knee: [100, 112], foot: [100, 134], elbow: [104, 32], hand: [100, 26] } },
    front: { bones: FB, spine: SP, static: [{ t: "line", x1: 55, y1: 22, x2: 145, y2: 22, c: "#737373", w: 5 }],
      A: { head: [100, 46], sh: [100, 58], hip: [100, 104], elbowL: [92, 40], handL: [88, 26], elbowR: [108, 40], handR: [112, 26], kneeL: [94, 128], footL: [94, 150], kneeR: [106, 128], footR: [106, 150] },
      B: { head: [100, 30], sh: [100, 42], hip: [100, 88], elbowL: [94, 32], handL: [88, 26], elbowR: [106, 32], handR: [112, 26], kneeL: [96, 112], footL: [96, 134], kneeR: [104, 112], footR: [104, 134] } } },

  band_pulldown: { ground: 150,
    side: { bones: SB, spine: SP, equip: { kind: "band", from: [100, 18], to: "hand" }, static: [{ t: "line", x1: 80, y1: 18, x2: 120, y2: 18, c: "#737373", w: 4 }],
      A: { head: [100, 32], sh: [100, 52], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [108, 40], hand: [108, 24] },
      B: { head: [100, 32], sh: [100, 52], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [112, 72], hand: [112, 58] } } },

  hammer_curl: { ground: 150,
    side: { bones: SB, spine: SP, equip: { kind: "db", hands: ["hand"] },
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [101, 72], hand: [103, 92] },
      B: { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [101, 72], hand: [112, 60] } },
    front: { bones: FB, spine: SP, equip: { kind: "db", hands: ["handL", "handR"] },
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [86, 70], handL: [84, 92], elbowR: [114, 70], handR: [116, 92], kneeL: [92, 121], footL: [91, 148], kneeR: [108, 121], footR: [109, 148] },
      B: { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [86, 70], handL: [90, 58], elbowR: [114, 70], handR: [110, 58], kneeL: [92, 121], footL: [91, 148], kneeR: [108, 121], footR: [109, 148] } } },

  tri_oh: { ground: 150,
    side: { bones: SB, spine: SP, equip: { kind: "db", hands: ["hand"] },
      A: { head: [100, 32], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [100, 46], hand: [112, 58] },
      B: { head: [100, 32], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [100, 46], hand: [100, 28] } } },

  face_pull: { ground: 150,
    side: { bones: SB, spine: SP, equip: { kind: "band", from: [188, 42], to: "hand" }, static: [{ t: "rect", x: 184, y: 26, w: 8, h: 36 }],
      A: { head: [100, 32], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [120, 52], hand: [150, 44] },
      B: { head: [100, 32], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [112, 52], hand: [96, 44] } } },

  birddog: { ground: 150, vb: "0 90 200 75",
    side: { bones: [["sh", "hip"], ["sh", "hand"], ["sh", "handS"], ["hip", "foot"], ["hip", "kneeS"]], spine: SP,
      A: { head: [86, 116], sh: [96, 116], hip: [130, 118], hand: [96, 132], handS: [100, 150], foot: [132, 132], kneeS: [134, 150] },
      B: { head: [84, 112], sh: [96, 116], hip: [130, 118], hand: [62, 108], handS: [100, 150], foot: [170, 108], kneeS: [134, 150] } } },

  deadbug: { ground: 150, vb: "0 90 200 75",
    side: { bones: SB, spine: SP,
      A: { head: [64, 146], sh: [80, 146], hip: [120, 146], elbow: [80, 127], hand: [80, 108], knee: [120, 120], foot: [120, 108] },
      B: { head: [64, 146], sh: [80, 146], hip: [120, 146], elbow: [68, 128], hand: [58, 140], knee: [140, 126], foot: [166, 140] } } },

  gb_march: { ground: 150, vb: "0 90 200 75",
    side: { bones: SB2, spine: SP,
      A: { head: [52, 146], sh: [66, 146], hip: [112, 118], knee: [150, 118], foot: [158, 150], knee2: [150, 118], foot2: [158, 150] },
      B: { head: [52, 146], sh: [66, 146], hip: [112, 118], knee: [150, 118], foot: [158, 150], knee2: [118, 102], foot2: [126, 118] } } },

  suitcase: { ground: 150,
    side: { bones: SB, spine: SP, equip: { kind: "db", hands: ["hand"] },
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [112, 72], hand: [112, 92] },
      B: { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [96, 121], foot: [88, 148], elbow: [112, 72], hand: [112, 93] } },
    front: { bones: FB, spine: SP, equip: { kind: "db", hands: ["handR"] },
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], elbowL: [86, 72], handL: [84, 92], elbowR: [114, 72], handR: [116, 92], kneeL: [94, 121], footL: [92, 148], kneeR: [106, 121], footR: [108, 148] },
      B: { head: [100, 30], sh: [100, 50], hip: [100, 92], elbowL: [86, 72], handL: [84, 92], elbowR: [114, 72], handR: [116, 93], kneeL: [94, 121], footL: [92, 148], kneeR: [106, 121], footR: [108, 148] } } },

  // ===== Aufwärm-Drills (mehrere Posen) =====
  cat_cow: { ground: 150, vb: "0 90 200 75",
    side: { bones: [["sh", "mid"], ["mid", "hip"], ["sh", "hand"], ["hip", "knee"]], spine: [["sh", "mid"], ["mid", "hip"]],
      frames: [
        { head: [84, 124], sh: [96, 116], mid: [113, 106], hip: [130, 116], hand: [96, 150], knee: [130, 150] },
        { head: [84, 116], sh: [96, 116], mid: [113, 115], hip: [130, 116], hand: [96, 150], knee: [130, 150] },
        { head: [84, 108], sh: [96, 116], mid: [113, 124], hip: [130, 116], hand: [96, 150], knee: [130, 150] },
      ],
      A: { head: [84, 124], sh: [96, 116], mid: [113, 106], hip: [130, 116], hand: [96, 150], knee: [130, 150] },
      B: { head: [84, 108], sh: [96, 116], mid: [113, 124], hip: [130, 116], hand: [96, 150], knee: [130, 150] } } },

  hip_circles: { ground: 150,
    side: { bones: SB, spine: SP,
      frames: [
        { head: [100, 30], sh: [100, 50], hip: [110, 92], knee: [104, 121], foot: [100, 148], elbow: [100, 72], hand: [100, 92] },
        { head: [100, 28], sh: [100, 50], hip: [100, 86], knee: [100, 121], foot: [100, 148], elbow: [100, 72], hand: [100, 92] },
        { head: [100, 30], sh: [100, 50], hip: [90, 92], knee: [96, 121], foot: [100, 148], elbow: [100, 72], hand: [100, 92] },
      ],
      A: { head: [100, 30], sh: [100, 50], hip: [110, 92], knee: [104, 121], foot: [100, 148], elbow: [100, 72], hand: [100, 92] },
      B: { head: [100, 30], sh: [100, 50], hip: [90, 92], knee: [96, 121], foot: [100, 148], elbow: [100, 72], hand: [100, 92] } } },

  ankle_rocks: { ground: 150,
    side: { bones: SB, spine: SP,
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [100, 72], hand: [100, 92] },
      B: { head: [104, 32], sh: [103, 52], hip: [104, 96], knee: [120, 120], foot: [100, 148], elbow: [103, 74], hand: [103, 94] } } },

  shoulder_circles: { ground: 150,
    side: { bones: SB, spine: SP,
      frames: [
        { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [112, 66], hand: [120, 82] },
        { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [104, 40], hand: [108, 24] },
        { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [88, 60], hand: [80, 78] },
      ],
      A: { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [112, 66], hand: [120, 82] },
      B: { head: [100, 30], sh: [100, 50], hip: [100, 93], knee: [100, 121], foot: [100, 148], elbow: [88, 60], hand: [80, 78] } } },

  thoracic_open: { ground: 150, vb: "0 90 200 75",
    side: { bones: [["sh", "hip"], ["sh", "hand"], ["sh", "handR"], ["hip", "knee"]], spine: SP,
      A: { head: [86, 118], sh: [96, 116], hip: [130, 118], hand: [92, 150], handR: [104, 138], knee: [130, 150] },
      B: { head: [88, 110], sh: [96, 116], hip: [130, 118], hand: [92, 150], handR: [98, 100], knee: [130, 150] } } },

  bike_easy: { ground: 150,
    side: { bones: SB2, spine: SP, static: [{ t: "line", x1: 122, y1: 126, x2: 122, y2: 150, c: "#737373", w: 4 }],
      frames: [
        { head: [86, 42], sh: [92, 62], hip: [102, 100], elbow: [108, 78], hand: [122, 84], knee: [114, 110], foot: [124, 116], knee2: [118, 118], foot2: [112, 136] },
        { head: [86, 42], sh: [92, 62], hip: [102, 100], elbow: [108, 78], hand: [122, 84], knee: [118, 118], foot: [124, 138], knee2: [114, 110], foot2: [130, 116] },
      ],
      A: { head: [86, 42], sh: [92, 62], hip: [102, 100], elbow: [108, 78], hand: [122, 84], knee: [114, 110], foot: [124, 116], knee2: [118, 118], foot2: [112, 136] },
      B: { head: [86, 42], sh: [92, 62], hip: [102, 100], elbow: [108, 78], hand: [122, 84], knee: [118, 118], foot: [124, 138], knee2: [114, 110], foot2: [130, 116] } } },
};

export function lerp(a: number, b: number, f: number) {
  return a + (b - a) * f;
}

export function lerpPts(A: Frame, B: Frame, f: number): Frame {
  const o: Frame = {};
  for (const k in A) {
    const b = B[k] || A[k];
    o[k] = [lerp(A[k][0], b[0], f), lerp(A[k][1], b[1], f)];
  }
  return o;
}
