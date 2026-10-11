import type {
  Game,
  InitApi,
  RenderApi,
  UpdateApi,
} from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import * as C from "./constants";
export const BACKGROUND = "#020710";
export type Direction = "up" | "down" | "left" | "right";
export type Screen =
  | "title"
  | "howto"
  | "countdown"
  | "playing"
  | "paused"
  | "cleared"
  | "gameover";
type PState = "den" | "wander" | "chase" | "search";
interface Body {
  x: number;
  y: number;
  tx: number;
  ty: number;
  dir: Direction;
  moving: boolean;
}
interface Drifter {
  x: number;
  y: number;
  tx: number;
  ty: number;
  lit: boolean;
  mind: boolean;
  travel: boolean;
  dir: Direction;
}
interface Predator {
  kind: C.PredatorKind;
  x: number;
  y: number;
  tx: number;
  ty: number;
  dir: Direction;
  state: PState;
  released: boolean;
  mind: boolean;
  travel: boolean;
  speed: number;
  alert: boolean;
  lit: boolean;
  detectRange: number | null;
  hearingRange: number | null;
  hearingLock: boolean | null;
  flareCharging: boolean | null;
  flaring: boolean | null;
  flareRadius: number | null;
}
interface Pulse {
  source: "forager" | "gloamfin";
  tint: "cyan" | "violet" | "orange";
  ox: number;
  oy: number;
  front: number;
  range: number;
}
interface Images {
  [key: string]: ImageBitmap[];
}
export interface FathomState {
  version: 1;
  screen: Screen;
  menuIndex: number | null;
  titleIndex: number;
  depth: number;
  score: number;
  lives: number;
  muted: boolean;
  planktonRemaining: number;
  drifterIn: number;
  brightness: number;
  brightHold: number;
  visionRadius: number;
  windowRadius: number;
  sonar: { ready: boolean; cooldown: number; range: number };
  ink: { ready: boolean; cooldown: number };
  grid: {
    cols: number;
    rows: number;
    tile: number;
    originX: number;
    originY: number;
  };
  tiles: string[];
  plankton: string[];
  visibility: string[];
  forager: Body;
  drifters: Drifter[];
  predators: Predator[];
  pulses: Pulse[];
  inkClouds: { x: number; y: number; radius: number; remaining: number }[];
  simTime: number;
  images: Images;
  accumulator: number;
  timer: number;
  desired: Direction;
}
type R = { x: number; y: number; w: number; h: number };
type RO = DeepReadonly<FathomState>;
export interface FathomDebugApi {
  version: 1;
  reset(s: RO): FathomState;
  snapshot(s: RO): Record<string, unknown>;
  reconcile(s: RO): FathomState;
  setScreen(s: RO, v: Screen): FathomState;
  setMenuIndex(s: RO, n: number): FathomState;
  setTitleIndex(s: RO, n: number): FathomState;
  menuItemRect(s: RO, n: number): R | null;
  setScore(s: RO, n: number): FathomState;
  setLives(s: RO, n: number): FathomState;
  setDepth(s: RO, n: number): FathomState;
  setMaze(s: RO, r: string[]): FathomState;
  setPlankton(s: RO, x: number, y: number, p: boolean): FathomState;
  clearPlankton(s: RO): FathomState;
  clearFog(s: RO): FathomState;
  setForagerTile(s: RO, x: number, y: number): FathomState;
  setForagerDir(s: RO, d: Direction): FathomState;
  setBrightness(s: RO, g: number): FathomState;
  setBrightHold(s: RO, n: number): FathomState;
  clearPredators(s: RO): FathomState;
  addPredator(s: RO, k: C.PredatorKind, x: number, y: number): FathomState;
  setPredatorTile(s: RO, i: number, x: number, y: number): FathomState;
  setPredatorDir(s: RO, i: number, d: Direction): FathomState;
  setPredatorState(s: RO, i: number, v: Exclude<PState, "search">): FathomState;
  setPredatorReleased(s: RO, i: number, v: boolean): FathomState;
  setPredatorMind(s: RO, i: number, v: boolean): FathomState;
  setPredatorTravel(s: RO, i: number, v: boolean): FathomState;
  spawnDrifter(s: RO, x: number, y: number): FathomState;
  clearDrifters(s: RO): FathomState;
  setDrifterMind(s: RO, i: number, v: boolean): FathomState;
  setDrifterTravel(s: RO, i: number, v: boolean): FathomState;
  setDrifterIn(s: RO, n: number): FathomState;
  setSonarCooldown(s: RO, n: number): FathomState;
  setInkCooldown(s: RO, n: number): FathomState;
}
function cp(s: DeepReadonly<FathomState>): FathomState;
function cp(s: DeepReadonly<Body>): Body;
function cp(s: DeepReadonly<Predator>): Predator;
function cp(s: DeepReadonly<Drifter>): Drifter;
function cp(s: DeepReadonly<FathomState["sonar"]>): FathomState["sonar"];
function cp(s: DeepReadonly<FathomState["ink"]>): FathomState["ink"];
function cp(s: unknown): never {
  return structuredClone(s) as never;
}
const center = (x: number, y: number) => ({
  x: C.GRID_ORIGIN_X + x * C.TILE + 16,
  y: C.GRID_ORIGIN_Y + y * C.TILE + 16,
});
function maze() {
  return Array.from({ length: C.GRID_ROWS }, (_, y) =>
    Array.from({ length: C.GRID_COLS }, (_, x) =>
      y === 0 || y === 17 || x === 0 || x === 35
        ? "#"
        : y % 2 || x % 4 === 2
          ? "."
          : "#",
    ).join(""),
  );
}
function pred(k: C.PredatorKind, i: number): Predator {
  const p = center(16 + i, 8);
  return {
    ...p,
    tx: 16 + i,
    ty: 8,
    kind: k,
    dir: "up",
    state: "den",
    released: false,
    mind: true,
    travel: true,
    speed: k === "lanternjaw" ? C.DRIFTER_SPEED : C.PREDATOR_SPEED,
    alert: false,
    lit: false,
    detectRange: k === "gloamfin" ? null : C.LANTERN_RANGE_BASE,
    hearingRange: k === "gloamfin" ? C.GLOAMFIN_HEAR : null,
    hearingLock: k === "gloamfin" ? false : null,
    flareCharging: k === "flarefish" ? false : null,
    flaring: k === "flarefish" ? false : null,
    flareRadius: k === "flarefish" ? 0 : null,
  };
}
function rec(r: RO) {
  const s = cp(r);
  s.planktonRemaining = s.plankton.join("").split("*").length - 1;
  s.visionRadius = C.VISION_MIN + C.VISION_GAIN * s.brightness;
  s.windowRadius = C.KINDLE_VISION_MIN + C.KINDLE_VISION_GAIN * s.brightness;
  s.sonar.ready = s.sonar.cooldown === 0;
  s.sonar.range = Math.max(C.SONAR_RANGE_MIN, C.SONAR_RANGE_BASE - s.depth + 1);
  s.ink.ready = s.ink.cooldown === 0;
  s.predators = s.predators.map((p) => ({
    ...p,
    detectRange:
      p.kind === "gloamfin"
        ? null
        : C.LANTERN_RANGE_BASE + C.LANTERN_RANGE_GAIN * s.brightness,
  }));
  return s;
}
function base(images: Images, muted = false) {
  const tiles = maze(),
    p = center(2, 15);
  return rec({
    version: 1,
    screen: "title",
    menuIndex: 0,
    titleIndex: 0,
    depth: 1,
    score: 0,
    lives: C.START_LIVES,
    muted,
    planktonRemaining: 0,
    drifterIn: C.DRIFTER_INTERVAL,
    brightness: 0,
    brightHold: 0,
    visionRadius: C.VISION_MIN,
    windowRadius: C.KINDLE_VISION_MIN,
    sonar: { ready: true, cooldown: 0, range: 9 },
    ink: { ready: true, cooldown: 0 },
    grid: { cols: 36, rows: 18, tile: 32, originX: 64, originY: 80 },
    tiles,
    plankton: tiles.map((r) =>
      [...r].map((x) => (x === "." ? "*" : "-")).join(""),
    ),
    visibility: tiles.map(() => "u".repeat(36)),
    forager: { ...p, tx: 2, ty: 15, dir: "right", moving: false },
    drifters: [],
    predators: C.DEN_ORDER.map(pred),
    pulses: [],
    inkClouds: [],
    simTime: 0,
    images,
    accumulator: 0,
    timer: 0,
    desired: "right",
  });
}
const row = (a: readonly string[], x: number, y: number, c: string) =>
  a.map((r, i) => (i === y ? r.slice(0, x) + c + r.slice(x + 1) : r));
function dbg(images: Images): FathomDebugApi {
  const setP = (s: RO, i: number, f: (p: Predator) => Predator) => {
      const n = cp(s);
      if (!n.predators[i]) throw Error("invalid predator");
      n.predators[i] = f(n.predators[i]);
      return rec(n);
    },
    setD = (s: RO, i: number, f: (p: Drifter) => Drifter) => {
      const n = cp(s);
      if (!n.drifters[i]) throw Error("invalid drifter");
      n.drifters[i] = f(n.drifters[i]);
      return n;
    };
  return {
    version: 1,
    reset: (s) => base(images, s.muted),
    snapshot: (s) => {
      const { images, accumulator, timer, desired, ...v } = s;
      void images;
      void accumulator;
      void timer;
      void desired;
      return structuredClone(v) as Record<string, unknown>;
    },
    reconcile: rec,
    setScreen: (s, v) => ({
      ...cp(s),
      screen: v,
      menuIndex:
        v === "title"
          ? s.titleIndex
          : v === "paused" || v === "gameover"
            ? 0
            : null,
    }),
    setMenuIndex: (s, n) => ({ ...cp(s), menuIndex: n }),
    setTitleIndex: (s, n) => ({ ...cp(s), titleIndex: n }),
    menuItemRect: (s, n) =>
      n >= 0 && n < (s.screen === "paused" ? 3 : 2)
        ? { x: 440, y: 390 + n * 58, w: 400, h: 46 }
        : null,
    setScore: (s, n) => ({ ...cp(s), score: n }),
    setLives: (s, n) => ({ ...cp(s), lives: n }),
    setDepth: (s, n) => rec({ ...cp(s), depth: n }),
    setMaze: (s, r) => ({ ...cp(s), tiles: [...r] }),
    setPlankton: (s, x, y, p) =>
      rec({ ...cp(s), plankton: row(s.plankton, x, y, p ? "*" : "-") }),
    clearPlankton: (s) =>
      rec({ ...cp(s), plankton: s.plankton.map(() => "-".repeat(36)) }),
    clearFog: (s) => ({
      ...cp(s),
      visibility: s.visibility.map(() => "u".repeat(36)),
    }),
    setForagerTile: (s, x, y) => ({
      ...cp(s),
      forager: {
        ...cp(s.forager),
        ...center(x, y),
        tx: x,
        ty: y,
        moving: false,
      },
    }),
    setForagerDir: (s, d) => ({
      ...cp(s),
      forager: { ...cp(s.forager), dir: d, moving: false },
    }),
    setBrightness: (s, g) => rec({ ...cp(s), brightness: g }),
    setBrightHold: (s, n) => ({ ...cp(s), brightHold: n }),
    clearPredators: (s) => ({ ...cp(s), predators: [] }),
    addPredator: (s, k, x, y) => {
      const n = cp(s),
        p = {
          ...pred(k, n.predators.length),
          ...center(x, y),
          tx: x,
          ty: y,
          state: "wander" as const,
          released: true,
        };
      n.predators.push(p);
      return n;
    },
    setPredatorTile: (s, i, x, y) =>
      setP(s, i, (p) => ({ ...p, ...center(x, y), tx: x, ty: y })),
    setPredatorDir: (s, i, d) => setP(s, i, (p) => ({ ...p, dir: d })),
    setPredatorState: (s, i, v) => setP(s, i, (p) => ({ ...p, state: v })),
    setPredatorReleased: (s, i, v) =>
      setP(s, i, (p) => ({ ...p, released: v })),
    setPredatorMind: (s, i, v) => setP(s, i, (p) => ({ ...p, mind: v })),
    setPredatorTravel: (s, i, v) => setP(s, i, (p) => ({ ...p, travel: v })),
    spawnDrifter: (s, x, y) => {
      const n = cp(s);
      n.drifters.push({
        ...center(x, y),
        tx: x,
        ty: y,
        dir: "up",
        lit: false,
        mind: true,
        travel: true,
      });
      return n;
    },
    clearDrifters: (s) => ({ ...cp(s), drifters: [] }),
    setDrifterMind: (s, i, v) => setD(s, i, (p) => ({ ...p, mind: v })),
    setDrifterTravel: (s, i, v) => setD(s, i, (p) => ({ ...p, travel: v })),
    setDrifterIn: (s, n) => ({ ...cp(s), drifterIn: n }),
    setSonarCooldown: (s, n) =>
      rec({ ...cp(s), sonar: { ...cp(s.sonar), cooldown: n } }),
    setInkCooldown: (s, n) =>
      rec({ ...cp(s), ink: { ...cp(s.ink), cooldown: n } }),
  };
}
function txt(
  c: CanvasRenderingContext2D,
  t: string,
  x: number,
  y: number,
  z = 24,
  col = "#dfffff",
) {
  c.font = `${z}px monospace`;
  c.textAlign = "center";
  c.fillStyle = col;
  c.fillText(t, x, y);
}
export const game: Game<FathomState, FathomDebugApi> = {
  async initialize(api: InitApi<FathomState>) {
    for (const a of C.ACTIONS)
      api.input.register(a, { keys: [...C.BINDINGS[a]] });
    Object.values(C.CUES).forEach((n, i) =>
      api.audio.define(n, {
        freq: 180 + i * 95,
        freqTo: 400 + i * 40,
        durationMs: 180,
        gain: 0.12,
      }),
    );
    const load = (f: string, n: number) =>
      Promise.all(
        Array.from({ length: n }, (_, i) =>
          api.assets.loadImage(`${f}/${i}.png`),
        ),
      );
    const names = [
      ["glimmerfin", 8],
      ["lanternjaw", 16],
      ["gloamfin", 8],
      ["flarefish", 8],
      ["drifter", 8],
      ["flare-bloom", 8],
      ["trench-walls", 19],
    ] as const;
    const images: object = Object.fromEntries(
      await Promise.all(names.map(async ([n, k]) => [n, await load(n, k)])),
    );
    for (const n of [
      "screen",
      "depth",
      "score",
      "lives",
      "brightness",
      "visionRadius",
      "windowRadius",
      "planktonRemaining",
    ])
      api.diagnostics.register(
        n,
        (s) => s[n as keyof FathomState] as string | number | boolean,
      );
    const st = base(images as Images);
    return [st, dbg(images as Images)];
  },
  update(r: RO, api: UpdateApi, dt) {
    const s = cp(r);
    if (api.input.pressed("mute")) api.audio.setMuted(!api.audio.muted());
    s.muted = api.audio.muted();
    s.accumulator += dt;
    while (s.accumulator >= C.TICK_DT) {
      s.accumulator -= C.TICK_DT;
      s.simTime += C.TICK_DT;
      if (s.screen === "playing") {
        s.sonar.cooldown = Math.max(0, s.sonar.cooldown - C.TICK_DT);
        s.ink.cooldown = Math.max(0, s.ink.cooldown - C.TICK_DT);
        if (s.brightHold > 0) s.brightHold -= C.TICK_DT;
        else s.brightness *= Math.pow(0.5, C.TICK_DT / C.BRIGHT_HALFLIFE);
      }
    }
    if (s.screen === "title" && api.input.pressed("confirm")) {
      s.screen = s.menuIndex === 1 ? "howto" : "countdown";
      s.timer = 2;
      s.menuIndex = null;
    } else if (
      s.screen === "howto" &&
      (api.input.pressed("confirm") || api.input.pressed("back"))
    ) {
      s.screen = "title";
      s.menuIndex = s.titleIndex;
    } else if (s.screen === "countdown") {
      s.timer -= dt;
      if (s.timer <= 0) s.screen = "playing";
    } else if (s.screen === "playing" && api.input.pressed("pause")) {
      s.screen = "paused";
      s.menuIndex = 0;
    } else if (
      s.screen === "paused" &&
      (api.input.pressed("pause") || api.input.pressed("back"))
    ) {
      s.screen = "playing";
      s.menuIndex = null;
    }
    return rec(s);
  },
  render(s: RO, api: RenderApi) {
    const c = api.ctx;
    c.imageSmoothingEnabled = false;
    c.fillStyle = BACKGROUND;
    c.fillRect(0, 0, C.STAGE_W, C.STAGE_H);
    if (s.screen === "title") {
      txt(c, "FATHOM", 640, 220, 92);
      txt(c, "HUNT IN THE DARK", 640, 275, 20, "#6ba7b0");
      txt(c, "DIVE", 640, 420, 28);
      txt(c, "HOW TO PLAY", 640, 480, 24);
      return;
    }
    if (s.screen === "howto") {
      txt(c, "HOW TO PLAY", 640, 100, 44);
      txt(c, "SWIM: ARROWS / WASD   SONAR: SPACE   INK: SHIFT", 640, 220, 20);
      txt(c, "LIGHT REVEALS. SONAR REMEMBERS. DARKNESS HIDES.", 640, 310, 18);
      txt(c, "LANTERNJAW HUNTS LIGHT • GLOAMFIN HUNTS SOUND", 640, 390, 18);
      txt(c, "FLAREFISH HUNTS IN ITS OWN FLASH", 640, 430, 18);
      return;
    }
    for (let y = 0; y < 18; y++)
      for (let x = 0; x < 36; x++) {
        const px = 64 + x * 32,
          py = 80 + y * 32,
          t = s.tiles[y][x];
        c.globalAlpha = s.visibility[y][x] === "u" ? 0.15 : 1;
        c.drawImage(s.images["trench-walls"][t === "#" ? 15 : 16], px, py);
        if (s.plankton[y][x] === "*") {
          c.fillStyle = "#8ff";
          c.fillRect(px + 14, py + 14, 5, 5);
        }
      }
    c.globalAlpha = 1;
    c.drawImage(s.images.glimmerfin[6], s.forager.x - 16, s.forager.y - 16);
    txt(c, String(s.score).padStart(6, "0"), 150, 52, 38);
    txt(c, `DEPTH ${s.depth}`, 640, 700, 18);
    if (s.screen === "countdown") txt(c, "DIVE", 640, 380, 64);
    if (s.screen === "paused") txt(c, "PAUSED", 640, 360, 54);
  },
};
