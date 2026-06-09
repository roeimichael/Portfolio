/* Compose Chierit per-frame PNG folders into horizontal strip sheets +
 * a manifest (frame size, idle bbox for alignment, per-anim frame counts,
 * fake stats). Run: node src/animations/_compose.cjs
 * Output: public/sprites/chars/<id>/<action>.png  +  manifest.json
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "../../");
const SRC = path.join(ROOT, "src/animations/_chars");
const OUT = path.join(ROOT, "public/sprites/chars");

// canonical action -> folder name, per character
const CHARS = {
  crystal_mauler: {
    name: "Crystal Mauler",
    blurb: "Earthshaking crystal bruiser.",
    stats: { POWER: 9, SPEED: 4, DEFENSE: 8, SKILL: 5 },
    map: a("idle","run","j_up","j_down","air_atk","1_atk","2_atk","3_atk","sp_atk","roll","defend"),
  },
  ground_monk: {
    name: "Ground Monk",
    blurb: "Disciplined master of the earth.",
    stats: { POWER: 6, SPEED: 7, DEFENSE: 6, SKILL: 8 },
    map: a("idle","run","j_up","j_down","air_atk","1_atk","2_atk","3_atk","sp_atk","roll","defend"),
  },
  leaf_ranger: {
    name: "Leaf Ranger",
    blurb: "Swift blade of the forest.",
    stats: { POWER: 5, SPEED: 9, DEFENSE: 4, SKILL: 7 },
    map: a("idle","run","jump_up","jump_down","air_atk","1_atk","2_atk","3_atk","sp_atk","roll","defend"),
  },
  metal_bladekeeper: {
    name: "Metal Bladekeeper",
    blurb: "Iron-willed guardian of steel.",
    stats: { POWER: 8, SPEED: 5, DEFENSE: 9, SKILL: 6 },
    map: a("01_idle","02_run","03_jump_up","03_jump_down","air_atk","07_1_atk","08_2_atk","09_3_atk","10_sp_atk","04_roll","11_defend"),
  },
  water_priestess: {
    name: "Water Priestess",
    blurb: "Tidal mystic and healer.",
    stats: { POWER: 5, SPEED: 6, DEFENSE: 5, SKILL: 9 },
    map: a("01_idle","02_walk","04_j_up","05_j_down","air_atk","07_1_atk","08_2_atk","09_3_atk","10_sp_atk","06_tumble","12_defend"),
  },
  fire_knight: {
    name: "Fire Knight",
    blurb: "Blazing blade of the ember court.",
    stats: { POWER: 8, SPEED: 6, DEFENSE: 7, SKILL: 7 },
    map: a("01_idle","02_run","03_jump_up","03_jump_down","air_atk","05_1_atk","06_2_atk","07_3_atk","08_sp_atk","04_roll","09_defend"),
  },
  wind_hashashin: {
    name: "Wind Hashashin",
    blurb: "Silent gale, swift as the storm.",
    stats: { POWER: 6, SPEED: 9, DEFENSE: 4, SKILL: 8 },
    map: a("idle","run","j_up","j_down","air_atk","1_atk","2_atk","3_atk","sp_atk","roll","defend"),
  },
};
// helper: pair canonical keys with the given folder names (same order)
function a(idle, run, jump_up, jump_down, air_atk, atk1, atk2, atk3, sp_atk, roll, defend) {
  return { idle, run, jump_up, jump_down, air_atk, atk1, atk2, atk3, sp_atk, roll, defend };
}
const ORDER = ["crystal_mauler","metal_bladekeeper","ground_monk","leaf_ranger","water_priestess","fire_knight","wind_hashashin"];

// ---------- PNG decode (-> {w,h,rgba}) ----------
function paeth(a, b, c) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
function decode(file) {
  const d = fs.readFileSync(file);
  let p = 8, w, h, bd, ct, idat = [], plte = null, trns = null;
  while (p < d.length) {
    const len = d.readUInt32BE(p), type = d.toString("ascii", p + 4, p + 8), cs = p + 8;
    if (type === "IHDR") { w = d.readUInt32BE(cs); h = d.readUInt32BE(cs + 4); bd = d[cs + 8]; ct = d[cs + 9]; }
    else if (type === "PLTE") plte = d.subarray(cs, cs + len);
    else if (type === "tRNS") trns = d.subarray(cs, cs + len);
    else if (type === "IDAT") idat.push(d.subarray(cs, cs + len));
    else if (type === "IEND") break;
    p = cs + len + 4;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct];
  if (bd !== 8) throw new Error("bit depth " + bd + " unsupported (" + file + ")");
  const stride = w * ch;
  const cur = Buffer.alloc(stride), prev = Buffer.alloc(stride);
  const px = Buffer.alloc(w * h * ch);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[pos++];
    for (let x = 0; x < stride; x++) {
      const rb = raw[pos++];
      const aa = x - ch >= 0 ? cur[x - ch] : 0, bb = prev[x], cc = x - ch >= 0 ? prev[x - ch] : 0;
      let v; switch (ft) { case 1: v = rb + aa; break; case 2: v = rb + bb; break; case 3: v = rb + ((aa + bb) >> 1); break; case 4: v = rb + paeth(aa, bb, cc); break; default: v = rb; }
      cur[x] = v & 255;
    }
    cur.copy(px, y * stride); cur.copy(prev);
  }
  // -> rgba
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    let r, g, b, al;
    if (ct === 6) { r = px[i * 4]; g = px[i * 4 + 1]; b = px[i * 4 + 2]; al = px[i * 4 + 3]; }
    else if (ct === 2) { r = px[i * 3]; g = px[i * 3 + 1]; b = px[i * 3 + 2]; al = 255; }
    else if (ct === 0) { r = g = b = px[i]; al = 255; }
    else if (ct === 4) { r = g = b = px[i * 2]; al = px[i * 2 + 1]; }
    else if (ct === 3) { const idx = px[i]; r = plte[idx * 3]; g = plte[idx * 3 + 1]; b = plte[idx * 3 + 2]; al = trns && idx < trns.length ? trns[idx] : 255; }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = al;
  }
  return { w, h, rgba };
}

// ---------- PNG encode (RGBA 8-bit) ----------
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const t = Buffer.from(type, "ascii"); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, crc]); }
function encode(w, h, rgba) {
  const stride = w * 4; const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

function findDir(base, name) { let r = null; (function f(d) { for (const x of fs.readdirSync(d)) { const p = path.join(d, x); if (fs.statSync(p).isDirectory()) { if (x.toLowerCase() === name.toLowerCase()) r = p; else f(p); } } })(base); return r; }
function frameNum(f) { const m = f.match(/(\d+)\.png$/i); return m ? parseInt(m[1]) : 0; }

// attack anims get a PER-FRAME alpha bbox so the game can hit mobs using the
// actual drawn extent of each swing frame (synced hitbox), not a fixed reach.
const HIT_ANIMS = new Set(["atk1", "atk2", "atk3", "sp_atk", "air_atk"]);
function frameBbox(fr) {
  let x0 = fr.w, y0 = fr.h, x1 = 0, y1 = 0, any = false;
  for (let y = 0; y < fr.h; y++) for (let x = 0; x < fr.w; x++) if (fr.rgba[(y * fr.w + x) * 4 + 3] > 24) { any = true; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return any ? { x0, y0, x1, y1 } : { x0: 0, y0: 0, x1: 0, y1: 0 };
}

const manifest = { order: ORDER, ground_y: 151, chars: {} };
fs.mkdirSync(OUT, { recursive: true });

for (const id of ORDER) {
  const cfg = CHARS[id];
  const cbase = path.join(SRC, id);
  const outDir = path.join(OUT, id);
  fs.mkdirSync(outDir, { recursive: true });
  const anims = {};
  const hitboxes = {};
  let frameW = 0, frameH = 0, bbox = null;

  for (const [action, folder] of Object.entries(cfg.map)) {
    const dir = findDir(cbase, folder);
    if (!dir) { console.log(`!! ${id}/${action}: folder "${folder}" missing`); continue; }
    const files = fs.readdirSync(dir).filter((x) => x.toLowerCase().endsWith(".png")).sort((p, q) => frameNum(p) - frameNum(q));
    if (!files.length) { console.log(`!! ${id}/${action}: no frames`); continue; }
    const frames = files.map((f) => decode(path.join(dir, f)));
    const fw = frames[0].w, fh = frames[0].h;
    if (!frameW) { frameW = fw; frameH = fh; }
    // compose strip
    const strip = Buffer.alloc(fw * frames.length * fh * 4);
    const sw = fw * frames.length;
    frames.forEach((fr, i) => {
      for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
        const s = (y * fr.w + x) * 4, dst = (y * sw + i * fw + x) * 4;
        if (x < fr.w && y < fr.h) { strip[dst] = fr.rgba[s]; strip[dst + 1] = fr.rgba[s + 1]; strip[dst + 2] = fr.rgba[s + 2]; strip[dst + 3] = fr.rgba[s + 3]; }
      }
    });
    fs.writeFileSync(path.join(outDir, action + ".png"), encode(sw, fh, strip));
    anims[action] = frames.length;
    if (HIT_ANIMS.has(action)) hitboxes[action] = frames.map(frameBbox); // per-frame swing extent
    // bbox from idle frame 0
    if (action === "idle") {
      const fr = frames[0]; let x0 = fr.w, y0 = fr.h, x1 = 0, y1 = 0;
      for (let y = 0; y < fr.h; y++) for (let x = 0; x < fr.w; x++) if (fr.rgba[(y * fr.w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      bbox = { x0, y0, x1, y1 };
    }
  }
  manifest.chars[id] = { name: cfg.name, blurb: cfg.blurb, stats: cfg.stats, frameW, frameH, bbox, anims, hitboxes };
  console.log(`${id}: frame ${frameW}x${frameH}, bbox`, bbox, Object.keys(anims).length, "anims");
}

fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("\nmanifest written ->", path.join(OUT, "manifest.json"));
