import { useEffect, useRef, useState } from "react";
import { ArrowLeft, X, ChevronLeft, ChevronRight, Play, Volume2, VolumeX } from "lucide-react";
import { experience, education, profile } from "../data";

/* ------------------------------------------------------------------ *
 * /animated — playable pixel side-scroller with a fighting-game style
 * character select (live world backdrop, hero on stage, ◀ ▶ to cycle).
 *
 * ART POLICY: visuals come from DOWNLOADED sprite/tile packs, not hand-
 * drawn code. Characters load from /sprites/chars (see manifest); the map
 * is a downloaded parallax pack in /sprites/bg. Buildings/objects, NPC
 * bodies, mobs and pets are drop-in PNGs — see public/sprites/HOW_TO_ADD_ASSETS.md.
 * Until those packs are dropped in, NPCs show a neutral waypoint marker.
 *
 * Controls: A/D move · Space/W jump (×2) · L slash · R special ·
 *           L+R finisher · Shift roll · S/↓ crouch (drop through) · E read scroll.
 * ------------------------------------------------------------------ */

type Station = { id: string; chapter: string; title: string; subtitle: string; period: string; bullets: string[] };

const stations: Station[] = [
  ...experience.map((e) => ({ id: `${e.org}-${e.period}`, chapter: "Experience", title: e.role, subtitle: e.org, period: e.period, bullets: e.bullets })),
  ...education.map((ed) => ({ id: ed.degree, chapter: "Education", title: ed.degree, subtitle: ed.school, period: ed.period, bullets: [`GPA ${ed.gpa}`, ...ed.notes] })),
];

// ---- world / buffer ----
const W = 320, H = 180, GROUND_Y = 157, SCALE = 4; // GROUND_Y = solid ground line
const STATION_X = (i: number) => 300 + i * 300; // compact spacing → NPCs closer together
const WORLD = STATION_X(stations.length - 1) + 380;
// climbable "buildings" (compact zig-zag balcony towers) replace the old long
// staircases; base x derived from stations so they stay between NPCs.
const BUILDINGS = [0, 2, 4].map((i) => STATION_X(i) + 150);

// ---- physics ----
const MOVE = 96, GRAV = 1350, JUMP_V = 380, ROLL_SPEED = 150, NEAR = 34;
const ACCEL = 1200, DECEL = 1500, AIR_ACCEL = 700, JUMP_CUT = 0.45;
const COYOTE = 0.1, JUMP_BUFFER = 0.12; // grace windows (standard platformer feel)
const CHAR_H = 28;        // in-game character height (design px)
const PREVIEW_H = 52;     // select-stage character height
const PREVIEW_LIFT = 40;  // how far above the ground line the preview hero stands
const PREVIEW_CAM = 150;  // bg scroll position on the select stage

// animation playback modes: LOOP cycles, HOLD plays once then freezes on
// the last frame, ONESHOT plays once over a fixed duration (attacks/roll).
const ONESHOT = new Set(["atk1", "atk2", "atk3", "sp_atk", "air_atk", "roll"]);
const ONESHOT_FPS: Record<string, number> = { atk1: 16, atk2: 16, atk3: 16, sp_atk: 15, air_atk: 16, roll: 18 };
const LOOP = new Set(["idle", "run"]);
const ATTACKS = new Set<Action>(["atk1", "atk2", "atk3", "sp_atk", "air_atk"]); // hit mobs
const ACTIONS = ["idle", "run", "jump_up", "jump_down", "air_atk", "atk1", "atk2", "atk3", "sp_atk", "roll"] as const;
type Action = (typeof ACTIONS)[number];

const P = { petal: "#f4a8c8" };

// Parallax layer stack: [logical key, parallax factor (0 = far … 1 = ground), drift].
// `gras` is the foreground grass, drawn IN FRONT of the hero, so it's separate.
// OPEN-MAP build: only the wide natural layers (sky/clouds/fuji/mountains/ground)
// are drawn. The pack's busy mid layers — bgtrees/house/shrine/trees — are left
// out so the view reads open; buildings come back as placed PROPS, not a wall of
// background art. (To restore the cluttered look, re-add those keys here.)
const FACTORS: [string, number, number][] = [
  ["sky", 0, 0], ["clouds", 0.06, 2], ["fuji", 0.1, 0], ["mtn_back", 0.18, 0],
  ["mtn_mid", 0.3, 0], ["mtn_front", 0.45, 0], ["ground", 1, 0],
];

// Downloaded parallax map pack (swap this path / add zones to change the map —
// see HOW_TO_ADD_ASSETS.md). logical layer key -> PNG url.
const DAY_SRC: Record<string, string> = {
  sky: "/sprites/bg/japan/sky.png", clouds: "/sprites/bg/japan/clouds.png", fuji: "/sprites/bg/japan/fuji.png",
  mtn_back: "/sprites/bg/japan/mtn_back.png", mtn_mid: "/sprites/bg/japan/mtn_mid.png", mtn_front: "/sprites/bg/japan/mtn_front.png",
  bgtrees: "/sprites/bg/japan/bgtrees.png", house: "/sprites/bg/japan/house.png", shrine: "/sprites/bg/japan/shrine.png",
  trees: "/sprites/bg/japan/trees.png", ground: "/sprites/bg/japan/ground.png", gras: "/sprites/bg/japan/gras.png",
};

// ---- switchable backgrounds (press B in-game to cycle, for previewing) ----
// A set is either PARALLAX (layers: [url, factor, drift], optional `sky` for the
// moon/stars layer) or a single full SCENE image stretched to fill.
type BgSet = { name: string; layers?: [string, number, number][]; sky?: string; scene?: string };
const BG_SETS: BgSet[] = [
  { name: "Tiny Japan", sky: DAY_SRC.sky, layers: FACTORS.map(([k, f, d]) => [DAY_SRC[k], f, d] as [string, number, number]) },
  { name: "Mountain Dusk", sky: "/sprites/bg/mountaindusk/sky.png", layers: [
    ["/sprites/bg/mountaindusk/sky.png", 0, 0], ["/sprites/bg/mountaindusk/far-clouds.png", 0.1, 3],
    ["/sprites/bg/mountaindusk/far-mountains.png", 0.22, 0], ["/sprites/bg/mountaindusk/mountains.png", 0.42, 0],
    ["/sprites/bg/mountaindusk/near-clouds.png", 0.55, 6], ["/sprites/bg/mountaindusk/trees.png", 0.85, 0],
  ] },
  { name: "Magical Road", layers: [
    ["/sprites/bg/magicalroad/back.png", 0.15, 0], ["/sprites/bg/magicalroad/middle.png", 0.45, 0], ["/sprites/bg/magicalroad/tree.png", 0.85, 0],
  ] },
  { name: "Church (scene)", scene: "/sprites/props/church_scene.png" },
  { name: "Japan scene 1", scene: "/sprites/props/japan_scene1.png" },
  { name: "Japan scene 3", scene: "/sprites/props/japan_scene3.png" },
];
let bgIndex = 0;

// ---- continuous time-of-day ----
// The backdrop art never changes — only the colour grade does, interpolating
// CONTINUOUSLY with distance walked (p = focus/WORLD). No seam, no cut.
type Rgba = [number, number, number, number];
type TodKey = { at: number; top: Rgba; bot: Rgba; night: number };
const TOD: TodKey[] = [
  { at: 0.00, top: [255, 244, 224, 0.06], bot: [255, 232, 200, 0.04], night: 0 }, // morning
  { at: 0.34, top: [255, 244, 224, 0.04], bot: [255, 236, 206, 0.03], night: 0 }, // midday
  { at: 0.64, top: [54, 22, 70, 0.36], bot: [255, 116, 44, 0.24], night: 0.15 },  // dusk
  { at: 1.00, top: [7, 9, 38, 0.66], bot: [16, 22, 68, 0.46], night: 1 },         // night
];
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerpRgba = (a: Rgba, b: Rgba, k: number): Rgba => [Math.round(lerp(a[0], b[0], k)), Math.round(lerp(a[1], b[1], k)), Math.round(lerp(a[2], b[2], k)), lerp(a[3], b[3], k)];
const rgbaStr = (c: Rgba) => `rgba(${c[0]},${c[1]},${c[2]},${c[3].toFixed(3)})`;
function sampleTod(p: number): { top: Rgba; bot: Rgba; night: number } {
  p = Math.max(0, Math.min(1, p));
  let i = 0; while (i < TOD.length - 1 && p > TOD[i + 1].at) i++;
  const a = TOD[i], b = TOD[Math.min(TOD.length - 1, i + 1)];
  const k = b.at === a.at ? 0 : (p - a.at) / (b.at - a.at);
  return { top: lerpRgba(a.top, b.top, k), bot: lerpRgba(a.bot, b.bot, k), night: lerp(a.night, b.night, k) };
}

// celestial layer — drawn just behind the mountains, fading in with `night`
const STARS = Array.from({ length: 46 }, () => ({ x: Math.random() * W, y: Math.random() * (H * 0.5), r: Math.random() < 0.25 ? 2 : 1, p: Math.random() * 6.28 }));
function skyNight(ctx: CanvasRenderingContext2D, t: number, night: number) {
  if (night <= 0.02) return;
  for (const s of STARS) { const a = night * (0.35 + 0.4 * Math.sin(t * 2 + s.p)); px(ctx, s.x, s.y, s.r, s.r, `rgba(222,230,255,${a.toFixed(3)})`); }
  ctx.fillStyle = `rgba(236,240,255,${(0.10 * night).toFixed(3)})`; ctx.beginPath(); ctx.arc(W - 50, 28, 13, 0, 6.283); ctx.fill(); // halo
  ctx.fillStyle = `rgba(236,240,255,${(0.95 * night).toFixed(3)})`; ctx.beginPath(); ctx.arc(W - 50, 28, 8, 0, 6.283); ctx.fill();  // moon
}

// Placed objects/buildings — DROP a PNG in public/sprites/props/ and add an
// entry. Drawn ONCE at world x (not tiled), parallax-scrolled by `factor`,
// bottom resting on `bottom`, scaled by `scale`. (Empty until you add packs.)
type Prop = { src: string; worldX: number; factor: number; bottom: number; scale: number };
const prop = (name: string, worldX: number, scale: number, factor = 1): Prop => ({ src: `/sprites/props/${name}.png`, worldX, factor, bottom: GROUND_Y, scale });
// scenery scattered across the world (sliced from downloaded packs by _props.cjs).
// Drawn behind the hero, resting on the ground. Tune worldX / scale freely.
const PROPS: Prop[] = [
  prop("tree_green_0", 180, 0.55), prop("tree_sakura_3", 380, 0.62),
  prop("house_timber", 720, 0.3), prop("tree_green_2", 800, 0.5),
  prop("tree_sakura_1", 980, 0.64), prop("tree_round", 1160, 0.42),
  prop("tree_sakura_0", 1320, 0.58), prop("tree_green_3", 1420, 0.5),
  prop("house_timber", 1740, 0.28), prop("tree_sakura_2", 1800, 0.6),
];

// One-way platforms = the balcony ledges of each BUILDING. Jump up through
// them, land on top when falling. Zig-zag ~18px steps so each floor is reachable.
type Platform = { x: number; y: number; w: number; hidden?: boolean };
function buildingLedges(bx: number): Platform[] {
  return [
    { x: bx, y: 138, w: 38 }, { x: bx + 22, y: 120, w: 34 },
    { x: bx, y: 102, w: 34 }, { x: bx + 22, y: 84, w: 34 },
  ];
}
const PLATFORMS: Platform[] = BUILDINGS.flatMap(buildingLedges);

type BBox = { x0: number; y0: number; x1: number; y1: number };
type CharMeta = { name: string; blurb: string; stats: Record<string, number>; frameW: number; frameH: number; bbox: BBox; anims: Record<string, number>; hitboxes?: Record<string, BBox[]> };
type Manifest = { order: string[]; ground_y: number; chars: Record<string, CharMeta> };
type Petal = { x: number; y: number; vy: number; sway: number; sp: number };
type Imgs = Record<string, HTMLImageElement | null>;
type Player = {
  x: number; y: number; vx: number; vy: number; onGround: boolean; facing: 1 | -1;
  busyUntil: number; busyStart: number; busyAction: Action | null; comboStep: number;
  jumps: number;
  coyoteUntil: number; jumpBufferUntil: number; dropUntil: number; anim: Action | null; animStart: number;
};

// world state lives in one bag passed to drawGame (so new entity kinds — mobs,
// pet, etc., once their sprite packs are added — won't churn signatures).
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; grav: number };
type Npc = { x: number; station: number; name: string; role: string; sprite: string };
type Coin = { x: number; y: number; bob: number; taken: boolean };
// downloaded sprite actors (mobs + pet + npcs), aligned via manifest bbox
type ActorMeta = { frameW: number; frameH: number; bbox: BBox; anims: Record<string, number> };
type Mob = { id: string; x: number; y: number; vx: number; home: number; range: number; hp: number; maxHp: number; facing: 1 | -1; fly: boolean; hitUntil: number; dead: boolean; deadStart: number; respawnAt: number; lastSwing: number };
type Pet = { x: number; facing: 1 | -1; anim: string; animStart: number };
type World = {
  particles: Particle[]; npcs: Npc[]; coins: Coin[]; coinsGot: number;
  region: number; bannerText: string; bannerUntil: number;
  mobs: Mob[]; pet: Pet | null; petId: string; swing: number;
  mobImgs: Record<string, HTMLImageElement>; petImgs: Record<string, HTMLImageElement>; npcImgs: Record<string, HTMLImageElement>;
  mobsMeta: Record<string, ActorMeta> | null; petMeta: Record<string, ActorMeta> | null; npcMeta: Record<string, ActorMeta> | null;
};
const REGION_NAMES = ["Dawn Village", "Dusk Pass", "Night Shrine"];
// NPC guide sprites (Lively NPCs pack) assigned per station, cycling this roster
const NPC_ROSTER = ["elder", "merchant", "blacksmith", "king", "princess", "guard", "seer", "minstrel", "captain", "priestess"];
const NPC_H = 30; // on-screen NPC height

// downloaded mobs to fight (LuizMelo packs). Spawns are ROLLED at random each
// playthrough (random type + position across the world) so encounters vary, and
// re-rolled to a new type/spot whenever a mob respawns.
const MOB_IDS = ["mushroom", "slime", "skeleton", "flying_eye"] as const;
const MOB_HP: Record<string, number> = { mushroom: 3, slime: 3, skeleton: 5, flying_eye: 3 };
const MOB_H: Record<string, number> = { mushroom: 22, slime: 16, skeleton: 28, flying_eye: 20 };
const rollMobId = () => MOB_IDS[(Math.random() * MOB_IDS.length) | 0];
function rollMobSpawns() {
  const out: { id: string; home: number; fly: boolean }[] = [];
  for (let x = 320; x < WORLD - 200; x += 110 + Math.random() * 120) {
    const id = rollMobId();
    out.push({ id, home: Math.round(x), fly: id === "flying_eye" });
  }
  return out;
}
// companion follower: a random dog or cat (kind chosen on the select screen)
const DOG_IDS = ["akita", "golden"], CAT_IDS = ["cat_calico", "cat_tabby"];
const PET_H = 10;   // on-screen follower height (shrunk ~37% from 16)
const PET_GAP = 26; // horizontal distance the follower trails behind the hero

// tiny synthesized SFX (no audio files) — created on the Play gesture
function makeSfx() {
  let ac: AudioContext | null = null;
  const ensure = () => { const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!ac) ac = new AC(); if (ac.state === "suspended") ac.resume(); return ac; };
  const tone = (freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) => {
    const c = ensure(), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + dur);
  };
  return {
    ensure,
    jump: () => tone(300, 0.15, "square", 0.04, 600),
    coin: () => { tone(880, 0.07, "square", 0.045); setTimeout(() => tone(1320, 0.09, "square", 0.045), 70); },
    hit: () => tone(190, 0.09, "square", 0.05, 70),
    thud: () => tone(110, 0.22, "sawtooth", 0.05, 50),
  };
}

// open-map build: a light scatter of petals (was 22 — too busy for the clean look)
const newPetals = () => Array.from({ length: 7 }, () => ({ x: Math.random() * W, y: Math.random() * H, vy: 0.12 + Math.random() * 0.22, sway: Math.random() * 6.28, sp: 0.01 + Math.random() * 0.02 }));

export default function AnimatedJourney() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgRef = useRef<Imgs>({});
  const idleCacheRef = useRef<Imgs>({});
  const previewIdxRef = useRef(0);
  const openRef = useRef<number | null>(null);
  const nearbyRef = useRef<number | null>(null);
  const mutedRef = useRef(false);
  const companionRef = useRef<"dog" | "cat">("dog"); // pet kind chosen on the select screen

  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [companion, setCompanion] = useState<"dog" | "cat">("dog");

  const setOpenStation = (v: number | null) => { openRef.current = v; setOpen(v); };
  useEffect(() => { previewIdxRef.current = previewIdx; }, [previewIdx]);
  useEffect(() => { companionRef.current = companion; }, [companion]);

  // manifest + background (load once)
  useEffect(() => {
    fetch("/sprites/chars/manifest.json").then((r) => r.json()).then(setManifest).catch(() => {});
    const bgUrls = new Set<string>([DAY_SRC.gras]);
    BG_SETS.forEach((s) => { if (s.scene) bgUrls.add(s.scene); s.layers?.forEach(([u]) => bgUrls.add(u)); });
    bgUrls.forEach((u) => { const img = new Image(); img.onload = () => (bgRef.current[u] = img); img.src = u; });
  }, []);

  // ---- SELECT screen: live backdrop + hero on stage ----
  useEffect(() => {
    if (!manifest || selected) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    document.title = "Roei Michael — Choose your hero";
    const n = manifest.order.length;
    const petals = newPetals();

    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") setPreviewIdx((i) => (i - 1 + n) % n);
      else if (k === "arrowright" || k === "d") setPreviewIdx((i) => (i + 1) % n);
      else if (k === "enter" || k === " ") { e.preventDefault(); setSelected(manifest.order[previewIdxRef.current]); }
    };
    window.addEventListener("keydown", onKey);

    let raf = 0;
    const loop = (ms: number) => {
      const t = ms / 1000;
      const id = manifest.order[previewIdxRef.current];
      const meta = manifest.chars[id];
      let sheet = idleCacheRef.current[id];
      if (!sheet) { sheet = new Image(); sheet.src = `/sprites/chars/${id}/idle.png`; idleCacheRef.current[id] = sheet; }
      drawStage(ctx, t, bgRef.current, petals, sheet, meta);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); };
  }, [manifest, selected]);

  // ---- PLAY: full game ----
  useEffect(() => {
    if (!selected || !manifest) return;
    const meta = manifest.chars[selected];
    const canvas = canvasRef.current; if (!canvas || !meta) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    document.title = `Roei Michael — The Journey (${meta.name})`;
    setShowIntro(true); const introTimer = window.setTimeout(() => setShowIntro(false), 2800);

    const sheets: Imgs = {};
    ACTIONS.forEach((act) => { const img = new Image(); img.onload = () => (sheets[act] = img); img.src = `/sprites/chars/${selected}/${act}.png`; });
    const props: Imgs = {};
    PROPS.forEach((p) => { if (!props[p.src]) { const img = new Image(); img.onload = () => (props[p.src] = img); img.src = p.src; } });
    const dur = (action: Action) => (meta.anims[action] || 4) / (ONESHOT_FPS[action] || 14);
    const player: Player = { x: 70, y: GROUND_Y, vx: 0, vy: 0, onGround: true, facing: 1, busyUntil: 0, busyStart: 0, busyAction: null, comboStep: 0, jumps: 0, coyoteUntil: 0, jumpBufferUntil: 0, dropUntil: 0, anim: null, animStart: 0 };
    const keys = new Set<string>();
    const petals = newPetals();
    const petPool = companionRef.current === "cat" ? CAT_IDS : DOG_IDS;
    const petId = petPool[(Math.random() * petPool.length) | 0]; // random dog/cat each playthrough
    const world: World = {
      particles: [], npcs: [], coins: [], coinsGot: 0, region: -1, bannerText: "", bannerUntil: 0,
      mobs: [], pet: null, petId, swing: 0, mobImgs: {}, petImgs: {}, npcImgs: {}, mobsMeta: null, petMeta: null, npcMeta: null,
    };
    const sfx = makeSfx();
    const S = (fn: () => void) => { if (!mutedRef.current) fn(); };
    // NPC guides — one per chapter, standing at its station (waypoint marker for now)
    world.npcs = stations.map((s, i) => ({ x: STATION_X(i), station: i, name: s.subtitle, role: s.title, sprite: NPC_ROSTER[i % NPC_ROSTER.length] }));
    // coins reward climbing — perched above each building's balconies
    world.coins = BUILDINGS.flatMap((bx) => [{ x: bx + 22, y: 72 }, { x: bx, y: 92 }])
      .map(({ x, y }) => ({ x, y, bob: (x % 7) * 0.9, taken: false }));
    // downloaded sprite actors: mobs + a random follower pet (dog/cat)
    world.mobs = rollMobSpawns().map((s) => ({ id: s.id, x: s.home, y: GROUND_Y, vx: 0, home: s.home, range: 44, hp: MOB_HP[s.id] || 3, maxHp: MOB_HP[s.id] || 3, facing: 1 as 1 | -1, fly: s.fly, hitUntil: 0, dead: false, deadStart: 0, respawnAt: 0, lastSwing: -1 }));
    world.pet = { x: 56, facing: 1, anim: "idle", animStart: 0 };
    fetch("/sprites/mobs/manifest.json").then((r) => r.json()).then((m) => { world.mobsMeta = m; }).catch(() => {});
    fetch("/sprites/pet/manifest.json").then((r) => r.json()).then((m) => { world.petMeta = m; }).catch(() => {});
    fetch("/sprites/npcs/manifest.json").then((r) => r.json()).then((m) => { world.npcMeta = m.npcs || m; }).catch(() => {});
    const startBusy = (a: Action) => { const now = performance.now() / 1000; player.busyStart = now; player.busyUntil = now + dur(a); player.busyAction = a; if (ATTACKS.has(a)) world.swing++; };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!mutedRef.current) sfx.ensure();
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
      if (k === "escape") { setOpenStation(null); return; }
      const busy = performance.now() / 1000 < player.busyUntil;
      if (k === "e" && nearbyRef.current !== null) setOpenStation(nearbyRef.current); // open the NPC's scroll
      if (k === " " || k === "w" || k === "arrowup") player.jumpBufferUntil = performance.now() / 1000 + JUMP_BUFFER;
      if (k === "shift" && player.onGround && !busy) startBusy("roll");
      // S / Down drops through a one-way platform (no effect on the main ground)
      if ((k === "s" || k === "arrowdown") && player.onGround && player.y < GROUND_Y - 1) {
        player.dropUntil = performance.now() / 1000 + 0.2; player.onGround = false; player.y += 2;
      }
      // B cycles the background (preview the downloaded scenes / map packs)
      if (k === "b") { bgIndex = (bgIndex + 1) % BG_SETS.length; world.bannerText = "BG · " + BG_SETS[bgIndex].name; world.bannerUntil = performance.now() / 1000 + 1.8; }
      keys.add(k);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      // variable jump height — releasing early cuts the rise
      if ((k === " " || k === "w" || k === "arrowup") && player.vy < 0) player.vy *= JUMP_CUT;
      keys.delete(k);
    };
    // L = quick slash, R = special, L+R together (within ~50ms) = finisher.
    // Ground presses are buffered one beat so "both buttons" can be detected
    // before a single button resolves; air clicks fire the air attack at once.
    let lDown = false, rDown = false, pressPending = false, pressAt = 0;
    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      if (!mutedRef.current) sfx.ensure();
      if (e.button === 0) lDown = true; else if (e.button === 2) rDown = true; else return;
      const now = performance.now() / 1000;
      if (!player.onGround) { if (now >= player.busyUntil) startBusy("air_atk"); return; }
      pressPending = true; pressAt = now;
    };
    const onMouseUp = (e: MouseEvent) => { if (e.button === 0) lDown = false; else if (e.button === 2) rDown = false; };
    const onBlur = () => { keys.clear(); lDown = false; rDown = false; pressPending = false; };
    window.addEventListener("blur", onBlur);
    const onCtx = (e: Event) => e.preventDefault();
    window.addEventListener("keydown", onKeyDown); window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousedown", onMouseDown); window.addEventListener("mouseup", onMouseUp); canvas.addEventListener("contextmenu", onCtx);

    let raf = 0, last = performance.now();
    let cam = Math.max(0, Math.min(WORLD - W, player.x - W / 2)); // smoothed camera
    const loop = (ms: number) => {
      const t = ms / 1000; let dt = (ms - last) / 1000; last = ms; if (dt > 0.05) dt = 0.05;
      if (player.onGround) player.coyoteUntil = t + COYOTE;
      const busy = t < player.busyUntil;
      const left = keys.has("a") || keys.has("arrowleft"), right = keys.has("d") || keys.has("arrowright");
      // hold Down on the SOLID ground (where you can't drop through) = crouch,
      // which reuses the "drop" pose since there's no dedicated crouch art.
      const crouching = (keys.has("s") || keys.has("arrowdown")) && player.onGround && player.y >= GROUND_Y - 1 && !busy;

      // jump — buffered press + coyote grace + one air (double) jump
      if (player.jumpBufferUntil > t && !busy && player.jumps < 2) {
        const grounded = player.onGround || t < player.coyoteUntil;
        if (grounded || player.jumps >= 1) {
          const first = player.jumps === 0;
          player.vy = -(first ? JUMP_V : JUMP_V * 0.86); player.onGround = false; player.jumpBufferUntil = 0; player.coyoteUntil = 0;
          player.jumps = first ? 1 : player.jumps + 1;
          if (first) spawn(world.particles, player.x, player.y, 5, { spd: 28, up: 2, life: 0.28, size: 1, color: ["#d8c8a8", "#cabfa0"], grav: 50 });
          else spawn(world.particles, player.x, player.y - 12, 10, { spd: 48, up: 0, life: 0.34, size: 1, color: ["#bfe8ff", "#ffffff"], grav: 20 }); // air-jump ring
          S(sfx.jump);
        }
      }

      // resolve a buffered ground attack — L+R together = finisher (atk3),
      // else L = quick slash (alternates atk1/atk2), R = special (sp_atk)
      if (pressPending && player.onGround && t >= player.busyUntil) {
        if (lDown && rDown) { startBusy("atk3"); pressPending = false; }
        else if (t - pressAt > 0.05) {
          if (lDown) { startBusy(player.comboStep ? "atk2" : "atk1"); player.comboStep = player.comboStep ? 0 : 1; }
          else if (rDown) startBusy("sp_atk");
          pressPending = false;
        }
      }

      // horizontal movement
      const rolling = busy && player.busyAction === "roll";
      const airAtk = busy && !player.onGround;    // air attack: keep jump momentum
      const groundLock = busy && player.onGround; // ground attacks root you
      if (rolling) player.vx = player.facing * ROLL_SPEED;
      else if (!airAtk) {
        let target = 0;
        if (!groundLock && !crouching) { if (left && !right) { target = -MOVE; player.facing = -1; } else if (right && !left) { target = MOVE; player.facing = 1; } }
        const acc = (player.onGround ? (Math.abs(target) > Math.abs(player.vx) ? ACCEL : DECEL) : AIR_ACCEL) * dt;
        player.vx += Math.max(-acc, Math.min(acc, target - player.vx));
      }
      player.x = Math.max(20, Math.min(WORLD - 20, player.x + player.vx * dt));

      // gravity + landing (solid ground line OR a one-way platform top)
      const prevFeet = player.y, wasAir = !player.onGround;
      player.vy += GRAV * dt; player.y += player.vy * dt;
      const fallV = player.vy;
      player.onGround = false;
      if (player.y >= GROUND_Y) { player.y = GROUND_Y; player.vy = 0; player.onGround = true; }
      else if (player.vy >= 0 && t >= player.dropUntil) {
        for (const pf of PLATFORMS) {
          if (player.x > pf.x - pf.w / 2 - 4 && player.x < pf.x + pf.w / 2 + 4 &&
              prevFeet <= pf.y + 1 && player.y >= pf.y) {
            player.y = pf.y; player.vy = 0; player.onGround = true; break;
          }
        }
      }
      if (player.onGround) player.jumps = 0; // refresh jumps on the ground
      // landing dust (no screen shake)
      if (player.onGround && wasAir && fallV > 130)
        spawn(world.particles, player.x, player.y, 6, { spd: 46, up: 6, life: 0.34, size: 2, color: ["#d8c8a8", "#bfae8c"], grav: 130 });
      // run dust off the back foot
      if (player.onGround && Math.abs(player.vx) > 64 && Math.random() < 0.35)
        spawn(world.particles, player.x - player.facing * 5, player.y - 1, 1, { spd: 14, up: 4, life: 0.3, size: 1, color: "#c9bda0", grav: 40 });

      // mobs: patrol within range, knockback friction, respawn
      for (const m of world.mobs) {
        m.y = m.fly ? GROUND_Y - 24 : GROUND_Y;
        if (m.dead) {
          if (t >= m.respawnAt) { // respawn as a fresh random type at a new spot
            const nid = rollMobId();
            m.id = nid; m.fly = nid === "flying_eye"; m.maxHp = MOB_HP[nid] || 3; m.hp = m.maxHp;
            m.home = Math.round(280 + Math.random() * (WORLD - 480)); m.x = m.home; m.vx = 0; m.dead = false;
          }
          continue;
        }
        m.vx *= Math.exp(-7 * dt);
        if (t > m.hitUntil) {
          if (m.x > m.home + m.range) m.facing = -1; else if (m.x < m.home - m.range) m.facing = 1;
          m.vx = m.facing * (m.fly ? 26 : 18);
        }
        m.x = Math.max(20, Math.min(WORLD - 20, m.x + m.vx * dt));
      }
      // melee hits — the hitbox IS the current attack frame's drawn extent
      // (per-frame alpha bbox baked into the manifest), mapped to world coords
      // exactly as drawHero draws the sprite, so damage syncs with what you see.
      if (busy && player.busyAction && ATTACKS.has(player.busyAction) && meta.hitboxes) {
        const act = player.busyAction, hbFrames = meta.hitboxes[act];
        if (hbFrames && hbFrames.length) {
          const scale = CHAR_H / Math.max(1, meta.bbox.y1 - meta.bbox.y0), cx = (meta.bbox.x0 + meta.bbox.x1) / 2;
          const fps = ONESHOT_FPS[act] || 14;
          const hb = hbFrames[Math.min(hbFrames.length - 1, Math.max(0, Math.floor((t - player.busyStart) * fps)))];
          // map frame bbox -> world AABB (feet-aligned to idle bbox.y1, mirrored on facing)
          let hl: number, hr: number;
          if (player.facing === 1) { hl = Math.max(player.x - 6, player.x + (hb.x0 - cx) * scale); hr = player.x + (hb.x1 - cx) * scale; }
          else { hl = player.x - (hb.x1 - cx) * scale; hr = Math.min(player.x + 6, player.x - (hb.x0 - cx) * scale); }
          const htop = player.y + (hb.y0 - meta.bbox.y1) * scale, hbot = player.y + (hb.y1 - meta.bbox.y1) * scale;
          const sp = act === "sp_atk";
          for (const m of world.mobs) {
            if (m.dead || m.lastSwing === world.swing) continue;
            const mm = world.mobsMeta ? world.mobsMeta[m.id] : null; if (!mm) continue;
            const ms = (MOB_H[m.id] || 20) / Math.max(1, mm.bbox.y1 - mm.bbox.y0);
            const mhw = ((mm.bbox.x1 - mm.bbox.x0) / 2) * ms, mh = (mm.bbox.y1 - mm.bbox.y0) * ms;
            if (hr >= m.x - mhw && hl <= m.x + mhw && hbot >= m.y - mh && htop <= m.y) {
              m.lastSwing = world.swing; m.hp -= sp ? 3 : 1; m.hitUntil = t + 0.28; m.vx = player.facing * (sp ? 150 : 80);
              S(sfx.hit);
              spawn(world.particles, m.x, m.y - mh / 2, sp ? 12 : 7, { spd: 70, up: 20, life: 0.4, size: 2, color: ["#ffd24a", "#ff9a6a", "#ffffff"], grav: 110 });
              if (m.hp <= 0) {
                m.dead = true; m.deadStart = t; m.respawnAt = t + 3 + Math.random() * 3; S(sfx.thud);
                world.coins.push({ x: m.x, y: m.y - 10, bob: Math.random() * 6.28, taken: false });
                spawn(world.particles, m.x, m.y - mh / 2, 16, { spd: 92, up: 32, life: 0.6, size: 2, color: ["#ffffff", "#ffd24a", "#bfe8d8"], grav: 70 });
              }
            }
          }
        }
      }
      // pet follows behind the hero (trails by PET_GAP). When it stops it sits,
      // then relaxes to the idle animation after sitting for 2s.
      if (world.pet) {
        const pet = world.pet, tx = player.x - player.facing * PET_GAP, dx = tx - pet.x, adx = Math.abs(dx);
        pet.x += dx * Math.min(1, 7 * dt);
        if (adx > 4) pet.facing = dx >= 0 ? 1 : -1;
        if (adx > 48) { if (pet.anim !== "run") { pet.anim = "run"; pet.animStart = t; } }
        else if (adx > 6) { if (pet.anim !== "walk") { pet.anim = "walk"; pet.animStart = t; } }
        else if (pet.anim !== "sit" && pet.anim !== "idle") { pet.anim = "sit"; pet.animStart = t; }
        else if (pet.anim === "sit" && t - pet.animStart > 2) { pet.anim = "idle"; pet.animStart = t; }
      }

      // collect coins on touch
      for (const c of world.coins) {
        if (c.taken) continue;
        if (Math.abs(player.x - c.x) < 12 && Math.abs(player.y - 14 - c.y) < 16) {
          c.taken = true; world.coinsGot++; S(sfx.coin);
          spawn(world.particles, c.x, c.y, 8, { spd: 50, up: 22, life: 0.5, size: 1, color: ["#ffe34a", "#fff2a8"], grav: 36 });
        }
      }
      // region banner when entering a new stretch of the world
      const reg = Math.max(0, Math.min(2, Math.floor(player.x / (WORLD / 3))));
      if (reg !== world.region) { world.region = reg; world.bannerText = REGION_NAMES[reg]; world.bannerUntil = t + 2.6; }

      const camTarget = Math.max(0, Math.min(WORLD - W, player.x - W / 2 + player.facing * 22));
      cam += (camTarget - cam) * Math.min(1, 6 * dt);
      const camX = Math.round(cam);
      let near: number | null = null;
      for (let i = 0; i < stations.length; i++) if (Math.abs(player.x - STATION_X(i)) < NEAR) { near = i; break; }
      nearbyRef.current = near;
      // close the open scroll once you walk away from that NPC
      if (openRef.current !== null && Math.abs(player.x - STATION_X(openRef.current)) > NEAR + 16) setOpenStation(null);

      // animation state (reset start time on change so loops/holds begin at frame 0)
      const moving = Math.abs(player.vx) > 8;
      let action: Action;
      if (busy) action = player.busyAction!;
      else if (!player.onGround) action = player.vy < 0 ? "jump_up" : "jump_down";
      else if (crouching) action = "jump_down"; // crouch reuses the drop pose
      else if (moving) action = "run";
      else action = "idle";
      if (action !== player.anim) { player.anim = action; player.animStart = t; }

      updateParticles(world.particles, dt);
      drawGame(ctx, t, camX, player, petals, bgRef.current, props, near, action, sheets, meta, world);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf); window.clearTimeout(introTimer);
      window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousedown", onMouseDown); window.removeEventListener("mouseup", onMouseUp); canvas.removeEventListener("contextmenu", onCtx);
      window.removeEventListener("blur", onBlur);
    };
  }, [selected, manifest]);

  const n = manifest?.order.length ?? 0;
  const previewMeta = manifest && !selected ? manifest.chars[manifest.order[previewIdx]] : null;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0a0e1a] select-none">
      <canvas ref={canvasRef} width={W * SCALE} height={H * SCALE} className="absolute inset-0 h-full w-full" style={{ imageRendering: "pixelated", cursor: selected ? "crosshair" : "default" }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(135% 100% at 50% 40%, transparent 64%, rgba(20,26,16,0.42) 100%)" }} />

      <a href="/" className="absolute left-5 top-5 z-30 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3.5 py-1.5 text-xs font-mono text-white/85 backdrop-blur hover:border-accent/70 hover:text-white transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to portfolio
      </a>

      {selected && (
        <>
          <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/15 bg-black/35 px-4 py-2 font-mono text-[11px] text-white/75 backdrop-blur">
            <span className="text-accent-soft">A D</span> move · <span className="text-accent-soft">Space</span> jump ×2 · <span className="text-accent-soft">L</span> slash · <span className="text-accent-soft">R</span> special · <span className="text-accent-soft">L+R</span> finisher · <span className="text-accent-soft">Shift</span> roll · <span className="text-accent-soft">S/↓</span> crouch/drop · <span className="text-accent-soft">E</span> read · <span className="text-accent-soft">B</span> background
          </div>
          <div className="absolute right-5 top-5 z-30 flex items-center gap-2">
            <button onClick={() => setMuted((m) => { const v = !m; mutedRef.current = v; return v; })} aria-label="Toggle sound"
              className="inline-flex items-center rounded-full border border-white/15 bg-black/30 p-2 text-white/85 backdrop-blur hover:border-accent/70 hover:text-white transition-colors">
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => { setSelected(null); setOpenStation(null); }} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3.5 py-1.5 text-xs font-mono text-white/85 backdrop-blur hover:border-accent/70 hover:text-white transition-colors">
              ⟲ Change hero
            </button>
          </div>
          <div className={`pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center text-center transition-opacity duration-700 ${showIntro ? "opacity-100" : "opacity-0"}`}>
            <p className="font-mono text-xs uppercase tracking-[0.4em] text-accent-soft">{manifest?.chars[selected!]?.name}</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-6xl" style={{ textShadow: "0 4px 24px rgba(0,0,0,0.9)" }}>THE JOURNEY</h1>
            <p className="mt-3 font-mono text-[11px] text-white/60">A · D move · Space jump · click to attack · E read</p>
          </div>
        </>
      )}

      {!selected && !manifest && (
        <div className="absolute inset-0 z-20 flex items-center justify-center font-mono text-sm text-white/60">loading heroes…</div>
      )}

      {previewMeta && (
        <>
          {/* title */}
          <div className="absolute left-1/2 top-12 z-20 -translate-x-1/2 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#e8b15a]" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>{profile.name}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-4xl" style={{ textShadow: "0 2px 18px rgba(0,0,0,0.8)" }}>Choose your hero</h1>
          </div>

          {/* prev / next */}
          <button onClick={() => setPreviewIdx((i) => (i - 1 + n) % n)} aria-label="Previous"
            className="group absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-[#e8b15a]/25 bg-black/30 p-3 text-[#f4ecd8]/80 backdrop-blur transition-colors hover:border-[#e8b15a]/70 hover:bg-[#e8b15a]/20 hover:text-white sm:left-12">
            <ChevronLeft className="h-7 w-7" />
          </button>
          <button onClick={() => setPreviewIdx((i) => (i + 1) % n)} aria-label="Next"
            className="group absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-[#e8b15a]/25 bg-black/30 p-3 text-[#f4ecd8]/80 backdrop-blur transition-colors hover:border-[#e8b15a]/70 hover:bg-[#e8b15a]/20 hover:text-white sm:right-12">
            <ChevronRight className="h-7 w-7" />
          </button>

          {/* bottom panel: name + stats + play — themed warm "Japanese" glass */}
          <div className="absolute bottom-6 left-1/2 z-20 w-[min(92vw,440px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-[#e8b15a]/25 bg-[#141a12]/85 px-6 py-3.5 shadow-[0_12px_44px_rgba(0,0,0,0.5)] backdrop-blur-md">
            {/* gold hairline + soft top glow */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e8b15a]/80 to-transparent" />
            <div className="pointer-events-none absolute inset-x-10 -top-px h-8 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(232,177,90,0.16),transparent)]" />
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-[#f4ecd8]">{previewMeta.name}</h2>
                <p className="text-xs text-[#f4ecd8]/55">{previewMeta.blurb}</p>
              </div>
              <button onClick={() => setSelected(manifest!.order[previewIdx])}
                className="inline-flex items-center gap-2 rounded-full bg-[#d2553f] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_3px_16px_rgba(210,85,63,0.45)] transition-colors hover:bg-[#c0492f]">
                <Play className="h-4 w-4" /> Play
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
              {Object.entries(previewMeta.stats).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-16 text-left font-mono text-[9px] uppercase tracking-wider text-[#e8b15a]/70">{k}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/35">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#e8b15a] to-[#f3d08a]" style={{ width: `${v * 10}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {/* companion picker — a random dog or cat of this kind joins you */}
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#e8b15a]/70">Companion</span>
              {(["dog", "cat"] as const).map((c) => (
                <button key={c} onClick={() => setCompanion(c)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${companion === c ? "border-[#e8b15a] bg-[#e8b15a]/15 text-[#f4ecd8]" : "border-[#f4ecd8]/15 text-[#f4ecd8]/55 hover:text-[#f4ecd8]"}`}>
                  {c === "dog" ? "🐕 Dog" : "🐈 Cat"}
                </button>
              ))}
            </div>
            {/* roster dots */}
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {manifest!.order.map((id, i) => (
                <button key={id} onClick={() => setPreviewIdx(i)} aria-label={id}
                  className={`h-1.5 rounded-full transition-all ${i === previewIdx ? "w-5 bg-[#e8b15a]" : "w-1.5 bg-[#f4ecd8]/25 hover:bg-[#f4ecd8]/50"}`} />
              ))}
            </div>
          </div>
          <p className="absolute bottom-1.5 left-1/2 z-20 -translate-x-1/2 font-mono text-[9px] text-white/30">character art © chierit · CC-BY 4.0</p>
        </>
      )}

      {open !== null && <ScrollCard s={stations[open]} onClose={() => setOpenStation(null)} />}
    </div>
  );
}

/* ============================ rendering ============================ */

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
function tileLayer(ctx: CanvasRenderingContext2D, img: HTMLImageElement, off: number) { const iw = img.width || W; let x = -(((off % iw) + iw) % iw); while (x < W) { ctx.drawImage(img, Math.round(x), 0, iw, H); x += iw; } }

// ---- particles / fx ----
function spawn(arr: Particle[], x: number, y: number, n: number, opt: { spd?: number; up?: number; life?: number; size?: number; color?: string | string[]; grav?: number }) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, s = (opt.spd ?? 40) * (0.4 + Math.random() * 0.6);
    const color = Array.isArray(opt.color) ? opt.color[(Math.random() * opt.color.length) | 0] : (opt.color ?? "#ffffff");
    const life = (opt.life ?? 0.5) * (0.7 + Math.random() * 0.6);
    arr.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (opt.up ?? 0), life, max: life, size: opt.size ?? 2, color, grav: opt.grav ?? 60 });
  }
}
function updateParticles(arr: Particle[], dt: number) {
  for (let i = arr.length - 1; i >= 0; i--) { const p = arr[i]; p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) arr.splice(i, 1); }
}
function drawParticles(ctx: CanvasRenderingContext2D, arr: Particle[], camX: number) {
  for (const p of arr) { const sx = p.x - camX; if (sx < -8 || sx > W + 8) continue; ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max)); px(ctx, sx, p.y, p.size, p.size, p.color); }
  ctx.globalAlpha = 1;
}

// the active background (parallax stack with time-of-day grade, OR a full scene)
function bg(ctx: CanvasRenderingContext2D, imgs: Imgs, cam: number, t: number) {
  const set = BG_SETS[bgIndex] || BG_SETS[0];
  if (set.scene) { // single full image stretched to fill — a static backdrop
    const im = imgs[set.scene];
    if (im) ctx.drawImage(im, 0, 0, W, H);
    else { ctx.fillStyle = "#1a1410"; ctx.fillRect(0, 0, W, H); }
    return;
  }
  const layers = set.layers!;
  if (!imgs[layers[0][0]]) { ctx.fillStyle = "#27365f"; ctx.fillRect(0, 0, W, H); return; }
  const tod = sampleTod((cam + W / 2) / WORLD);
  for (const [url, f, drift] of layers) {
    const im = imgs[url]; if (im) tileLayer(ctx, im, cam * f + drift * t);
    if (set.sky && url === set.sky) skyNight(ctx, t, tod.night); // moon/stars behind mountains
  }
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, rgbaStr(tod.top)); g.addColorStop(1, rgbaStr(tod.bot));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// foreground grass (only the Tiny-Japan pack has one), darkened to match the hour
function drawForeground(ctx: CanvasRenderingContext2D, imgs: Imgs, cam: number) {
  if (BG_SETS[bgIndex]?.scene) return; // scenes are a full backdrop, no foreground
  const g = imgs[DAY_SRC.gras]; if (g && bgIndex === 0) tileLayer(ctx, g, cam);
  const tod = sampleTod((cam + W / 2) / WORLD);
  if (tod.bot[3] > 0.05) { ctx.fillStyle = rgbaStr([tod.bot[0], tod.bot[1], tod.bot[2], tod.bot[3] * 0.85]); ctx.fillRect(0, H - 30, W, 30); }
}
function petalsFog(ctx: CanvasRenderingContext2D, petals: Petal[]) {
  for (const pt of petals) { pt.y += pt.vy; pt.sway += pt.sp; pt.x += Math.sin(pt.sway) * 0.4 - 0.12; if (pt.y > H) { pt.y = -2; pt.x = Math.random() * W; } if (pt.x < -2) pt.x = W; px(ctx, pt.x, pt.y, 2, 2, P.petal); }
  const fog = ctx.createLinearGradient(0, H - 26, 0, H); fog.addColorStop(0, "rgba(10,14,26,0)"); fog.addColorStop(1, "rgba(10,14,26,0.55)"); ctx.fillStyle = fog; ctx.fillRect(0, H - 26, W, 26);
}

function drawStage(ctx: CanvasRenderingContext2D, t: number, japan: Imgs, petals: Petal[], sheet: HTMLImageElement, meta: CharMeta) {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); ctx.imageSmoothingEnabled = false;
  bg(ctx, japan, PREVIEW_CAM, t);
  // hero is lifted off the ground line so the info panel never covers him; a
  // soft oval shadow keeps him grounded on his little rise.
  const hx = W * 0.5, feet = GROUND_Y - PREVIEW_LIFT;
  ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(hx, feet + 1, PREVIEW_H * 0.32, 2.5, 0, 0, 6.283); ctx.fill(); ctx.restore();
  drawHero(ctx, hx, feet, t, 1, "idle", 0, { idle: sheet }, meta, PREVIEW_H, feet);
  drawForeground(ctx, japan, PREVIEW_CAM);
  petalsFog(ctx, petals);
}

function drawGame(ctx: CanvasRenderingContext2D, t: number, camX: number, player: Player, petals: Petal[], japan: Imgs, props: Imgs, near: number | null, action: Action, sheets: Imgs, meta: CharMeta, world: World) {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); ctx.imageSmoothingEnabled = false;
  bg(ctx, japan, camX, t);
  // placed objects/buildings (drop-in PNGs)
  for (const p of PROPS) {
    const im = props[p.src]; if (!im) continue;
    const w = im.width * p.scale, h = im.height * p.scale, sx = p.worldX - camX * p.factor;
    if (sx + w / 2 > -10 && sx - w / 2 < W + 10) ctx.drawImage(im, Math.round(sx - w / 2), Math.round(p.bottom - h), Math.round(w), Math.round(h));
  }
  // climbable buildings: body first, then the balcony ledges in front of it
  for (const bx of BUILDINGS) { const sx = bx - camX; if (sx > -50 && sx < W + 50) drawBuilding(ctx, sx); }
  for (const pf of PLATFORMS) {
    if (pf.hidden) continue;
    const sx = pf.x - camX;
    if (sx + pf.w / 2 > -10 && sx - pf.w / 2 < W + 10) drawPlatform(ctx, sx, pf.y, pf.w);
  }
  // coins
  for (const c of world.coins) { if (c.taken) continue; const sx = c.x - camX; if (sx < -8 || sx > W + 8) continue; drawCoin(ctx, sx, c.y, t, c.bob); }
  // mobs to fight — behind the hero so attacks read "over" them
  if (world.mobsMeta) for (const m of world.mobs) {
    const meta = world.mobsMeta[m.id]; if (!meta) continue;
    const sx = m.x - camX; if (sx < -32 || sx > W + 32) continue;
    let anim: string, start: number, loop: boolean;
    if (m.dead) { anim = "death"; start = m.deadStart; loop = false; }
    else if (t < m.hitUntil) { anim = "hit"; start = m.hitUntil - 0.28; loop = false; }
    else { anim = meta.anims.walk ? "walk" : "idle"; start = 0; loop = true; }
    const sheet = sheetFrom(world.mobImgs, "/sprites/mobs", m.id, anim); if (!sheet) continue;
    if (!m.fly) px(ctx, sx - 7, GROUND_Y + 1, 15, 1, "rgba(0,0,0,0.28)");
    drawActor(ctx, sheet, meta, anim, sx, m.y, t, start, m.facing, MOB_H[m.id] || 20, loop);
  }
  // NPC guides — front-facing standing townsfolk (Lively NPCs pack); the
  // waypoint beam is only a fallback for the first frames before the sprite loads
  for (const npc of world.npcs) {
    const sx = npc.x - camX; if (sx < -24 || sx > W + 24) continue;
    const nm = world.npcMeta && world.npcMeta[npc.sprite];
    const sheet = nm ? sheetFrom(world.npcImgs, "/sprites/npcs", npc.sprite, "idle") : null;
    if (nm && sheet) {
      px(ctx, sx - 7, GROUND_Y + 1, 15, 1, "rgba(0,0,0,0.28)");
      drawActor(ctx, sheet, nm, "idle", sx, GROUND_Y, t, 0, 1, NPC_H, true);
    } else drawNpcMarker(ctx, sx, t);
    if (near === npc.station) drawTalkHint(ctx, sx, GROUND_Y - NPC_H - 8, t);
  }
  drawHero(ctx, player.x - camX, player.y, t, player.facing, action, player.animStart, sheets, meta);
  // follower pet (random dog/cat) — in front of the hero
  if (world.pet && world.petMeta && world.petMeta[world.petId]) {
    const sheet = sheetFrom(world.petImgs, "/sprites/pet", world.petId, world.pet.anim);
    if (sheet) { px(ctx, world.pet.x - camX - 4, GROUND_Y + 1, 9, 1, "rgba(0,0,0,0.25)"); drawActor(ctx, sheet, world.petMeta[world.petId], world.pet.anim, world.pet.x - camX, GROUND_Y, t, world.pet.animStart, world.pet.facing, PET_H, world.pet.anim !== "sit"); }
  }
  drawParticles(ctx, world.particles, camX);
  drawForeground(ctx, japan, camX);
  petalsFog(ctx, petals);
  drawHud(ctx, world, t);
}

function drawHero(ctx: CanvasRenderingContext2D, screenX: number, feetY: number, t: number, facing: 1 | -1, action: Action, animStart: number, sheets: Imgs, meta: CharMeta, charH = CHAR_H, shadowY = GROUND_Y) {
  const sheet = sheets[action] || sheets.idle; const ix = Math.round(screenX);
  px(ctx, ix - 7, shadowY + 1, 16, 1, "rgba(0,0,0,0.3)");
  if (!sheet) return;
  const count = meta.anims[action] || meta.anims.idle || 1;
  const fw = meta.frameW, fh = meta.frameH, bh = meta.bbox.y1 - meta.bbox.y0, cx = (meta.bbox.x0 + meta.bbox.x1) / 2, scale = charH / bh;
  // LOOP wraps; HOLD + ONESHOT play once and freeze on the last frame
  const fps = ONESHOT.has(action) ? (ONESHOT_FPS[action] || 14) : action === "run" ? 12 : action === "idle" ? 7 : 12;
  let frame = Math.floor(Math.max(0, t - animStart) * fps);
  frame = LOOP.has(action) ? frame % count : Math.min(count - 1, frame);
  const dx = Math.round(ix - cx * scale), dy = Math.round(feetY - meta.bbox.y1 * scale);
  ctx.save();
  if (facing === -1) { ctx.translate(ix * 2, 0); ctx.scale(-1, 1); }
  ctx.drawImage(sheet, frame * fw, 0, fw, fh, dx, dy, fw * scale, fh * scale);
  ctx.restore();
}

// generic downloaded-sprite actor (mob/pet/critter): bbox feet-aligned + scaled
function sheetFrom(cache: Record<string, HTMLImageElement>, base: string, id: string, anim: string): HTMLImageElement | null {
  const k = id + "/" + anim; let im = cache[k];
  if (!im) { im = new Image(); im.src = `${base}/${id}/${anim}.png`; cache[k] = im; }
  return im.complete && im.naturalWidth ? im : null;
}
function drawActor(ctx: CanvasRenderingContext2D, sheet: HTMLImageElement, meta: ActorMeta, anim: string, sx: number, feetY: number, t: number, animStart: number, facing: 1 | -1, targetH: number, loop: boolean) {
  const count = meta.anims[anim] || 1;
  const bh = Math.max(1, meta.bbox.y1 - meta.bbox.y0), cx = (meta.bbox.x0 + meta.bbox.x1) / 2, scale = targetH / bh;
  const fps = anim === "idle" ? 6 : anim === "run" ? 12 : anim === "death" ? 9 : anim === "hit" ? 12 : 10;
  let frame = Math.floor(Math.max(0, t - animStart) * fps);
  frame = loop ? frame % count : Math.min(count - 1, frame);
  const ix = Math.round(sx), dx = Math.round(ix - cx * scale), dy = Math.round(feetY - meta.bbox.y1 * scale);
  ctx.save();
  if (facing === -1) { ctx.translate(ix * 2, 0); ctx.scale(-1, 1); }
  ctx.drawImage(sheet, frame * meta.frameW, 0, meta.frameW, meta.frameH, dx, dy, meta.frameW * scale, meta.frameH * scale);
  ctx.restore();
}

function drawPlatform(ctx: CanvasRenderingContext2D, cx: number, top: number, w: number) {
  const x = Math.round(cx - w / 2), y = Math.round(top);
  px(ctx, x, y, w, 1, "#caa472");        // lit top edge
  px(ctx, x, y + 1, w, 3, "#7c5a36");    // plank body
  px(ctx, x, y + 4, w, 1, "#4a3420");    // underside shadow
  for (let i = 8; i < w - 2; i += 12) px(ctx, x + i, y + 1, 1, 3, "#5e4327"); // seams
  px(ctx, x + 1, y + 5, 2, 4, "#3a2a18"); px(ctx, x + w - 3, y + 5, 2, 4, "#3a2a18"); // end posts
}

// The wooden tower body behind a building's balcony ledges (drawn before the
// ledges). Same plank palette so the ledges read as balconies of this building.
// Swap for a real building PNG later via PROPS — the ledges are the collision.
function drawBuilding(ctx: CanvasRenderingContext2D, sx: number) {
  const left = Math.round(sx - 22), top = 76, w = 62, h = GROUND_Y - top;
  px(ctx, left, top, w, h, "#574029");                  // wall
  for (let x = left + 7; x < left + w - 1; x += 11) px(ctx, x, top, 1, h, "#47331f");   // vertical plank seams
  for (let y = top + 8; y < GROUND_Y; y += 18) px(ctx, left, y, w, 1, "#42301d");        // floor lines
  px(ctx, left, top, w, 2, "#6b4e30");                  // top trim
  px(ctx, left, top, 2, h, "#3a2a18"); px(ctx, left + w - 2, top, 2, h, "#3a2a18");      // corner posts
  // little tiled roof eave (vermillion) so it reads as a building/pagoda
  px(ctx, left - 5, top - 4, w + 10, 4, "#9a463b");
  px(ctx, left - 2, top - 7, w + 4, 3, "#b15246");
  px(ctx, left - 5, top, w + 10, 1, "#5a2a24");          // eave shadow
}

// ---- NPC waypoint marker (placeholder until NPC sprite packs are dropped in) ----
function drawNpcMarker(ctx: CanvasRenderingContext2D, sx: number, t: number) {
  const g = ctx.createLinearGradient(0, GROUND_Y - 46, 0, GROUND_Y);
  g.addColorStop(0, "rgba(120,180,255,0)"); g.addColorStop(1, "rgba(120,180,255,0.16)");
  ctx.fillStyle = g; ctx.fillRect(Math.round(sx - 5), GROUND_Y - 46, 10, 46);
  const oy = GROUND_Y - 40 + Math.sin(t * 2) * 2;
  ctx.save(); ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 3); ctx.fillStyle = "#9ec8ff";
  ctx.beginPath(); ctx.arc(sx, oy, 3, 0, 6.283); ctx.fill(); ctx.restore();
  px(ctx, sx - 1, oy - 1, 2, 2, "#eaf3ff");
  px(ctx, sx - 4, GROUND_Y - 1, 8, 1, "rgba(150,190,255,0.4)");
}
function drawTalkHint(ctx: CanvasRenderingContext2D, sx: number, y: number, t: number) {
  const yb = y + Math.round(Math.sin(t * 4) * 1.5);
  roundRect(ctx, sx - 4, yb, 9, 8, 2); ctx.fillStyle = "#fdfdfd"; ctx.fill();
  ctx.beginPath(); ctx.moveTo(sx - 1, yb + 8); ctx.lineTo(sx + 2, yb + 8); ctx.lineTo(sx, yb + 11); ctx.closePath(); ctx.fillStyle = "#fdfdfd"; ctx.fill();
  px(ctx, sx, yb + 2, 1, 3, "#d23b3b"); px(ctx, sx, yb + 6, 1, 1, "#d23b3b"); // "!"
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
// ---- coins + HUD ----
function drawCoin(ctx: CanvasRenderingContext2D, sx: number, y: number, t: number, bob: number) {
  const yy = y + Math.sin(t * 3 + bob) * 1.5, w = Math.max(1, 1 + Math.abs(Math.sin(t * 4 + bob)) * 4);
  ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.arc(sx, yy, 5, 0, 6.283); ctx.fill(); ctx.restore();
  px(ctx, sx - w / 2, yy - 4, w, 8, "#ffd23f"); px(ctx, sx - w / 2, yy - 4, Math.max(1, w / 3), 8, "#fff2b0");
}
function drawHud(ctx: CanvasRenderingContext2D, world: World, t: number) {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  const cx = 11, cy = 13;
  ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 6.283); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(cx - 1, cy - 2, 2, 4);
  ctx.font = "bold 8px ui-monospace, monospace"; ctx.textBaseline = "middle"; ctx.textAlign = "left";
  ctx.fillStyle = "#fff"; ctx.fillText("× " + world.coinsGot, cx + 7, cy + 1);
  // region name banner when entering a new stretch of the world
  if (t < world.bannerUntil) {
    const left = world.bannerUntil - t, age = 2.6 - left, a = Math.min(1, age / 0.4, left / 0.6);
    ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.textAlign = "center";
    ctx.font = "bold 15px ui-monospace, monospace"; ctx.fillStyle = "#fff"; ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 4;
    ctx.fillText(world.bannerText, W / 2, H * 0.32);
    ctx.shadowBlur = 0; px(ctx, W / 2 - 18, H * 0.32 + 6, 36, 1, "#ffd24a"); ctx.restore();
  }
  ctx.textAlign = "left";
}

// An unrolling parchment scroll holding the dossier the NPC "carries" — opens
// on E, closes on Escape / × / walking away. (CSS unroll = `.scroll-open`.)
const ROD = "linear-gradient(180deg,#b9844a 0%,#8a5e30 45%,#6f4a24 100%)";
function ScrollRod({ flip }: { flip?: boolean }) {
  return (
    <div className="relative mx-auto h-3.5 w-[102%] rounded-full"
      style={{ background: ROD, transform: flip ? "rotate(180deg)" : undefined, boxShadow: flip ? "0 -3px 8px rgba(0,0,0,0.45)" : "0 3px 8px rgba(0,0,0,0.45)" }}>
      <span className="absolute left-[-4px] top-1/2 h-5 w-3 -translate-y-1/2 rounded-full" style={{ background: "#5e3f20" }} />
      <span className="absolute right-[-4px] top-1/2 h-5 w-3 -translate-y-1/2 rounded-full" style={{ background: "#5e3f20" }} />
    </div>
  );
}
function ScrollCard({ s, onClose }: { s: Station; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/45" />
      <div className="scroll-open relative z-10 w-[min(92vw,430px)]" onClick={(e) => e.stopPropagation()}>
        <ScrollRod />
        <div className="relative -my-0.5 overflow-hidden border-x-2 px-7 py-5"
          style={{ background: "linear-gradient(180deg,#f6ead0 0%,#efdcb8 55%,#e7d0a4 100%)", borderColor: "rgba(140,103,58,0.45)", boxShadow: "inset 0 0 30px rgba(150,110,60,0.28)" }}>
          <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 text-[#7a532b]/70 transition-colors hover:text-[#7a532b]"><X className="h-4 w-4" /></button>
          <div className="scroll-content">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#9a5b2e]">{s.chapter} · {s.period}</p>
            <h3 className="mt-1.5 text-xl font-bold leading-tight text-[#3a2c18]">{s.title}</h3>
            <p className="text-sm font-semibold text-[#7a4a22]">{s.subtitle}</p>
            <div className="my-3 h-px w-full" style={{ background: "linear-gradient(90deg,transparent,rgba(140,103,58,0.55),transparent)" }} />
            <ul className="space-y-2 text-sm leading-relaxed text-[#4a3a22]">
              {s.bullets.map((b, i) => (
                <li key={i} className="flex gap-2"><span className="mt-[2px] text-[#a85a2c]">◆</span><span>{b}</span></li>
              ))}
            </ul>
          </div>
        </div>
        <ScrollRod flip />
      </div>
    </div>
  );
}
