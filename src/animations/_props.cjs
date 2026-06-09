/* Extract EVERY uploaded prop/scenery source into individual transparent PNGs +
 * a manifest the review gallery reads. Source kinds:
 *   loose  - one object PNG            -> trim + downscale
 *   grid   - sheet of equal cells      -> each cell trimmed
 *   flood  - packed sheet of objects   -> connected-component islands, trimmed
 *   anim   - folder of frames          -> frame 0 of each, trimmed
 *   scene  - a full scene / map image  -> downscaled thumbnail (kept whole)
 * Output: public/sprites/props/<name>.png + public/sprites/props/manifest.json
 * Run: node src/animations/_props.cjs
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "../../");
const SRC = path.join(ROOT, "src/animations");
const PEEK = path.join(ROOT, ".assettmp/peek");
const PEEK2 = path.join(ROOT, ".assettmp/peek2");
const MOSSY = path.join(ROOT, ".assettmp/mossy");
const PLANTS = path.join(ROOT, ".assettmp/plants");
const OUT = path.join(ROOT, "public/sprites/props");

const SOURCES = [
  { group: "Misc buildings & trees", kind: "loose", file: path.join(SRC, "House1.png"), name: "house_timber" },
  { group: "Misc buildings & trees", kind: "loose", file: path.join(SRC, "Tree1.png"), name: "tree_round" },
  { group: "Misc buildings & trees", kind: "loose", file: path.join(SRC, "house1 (1).png"), name: "house_japanese", note: "3/4 angle" },
  { group: "Trees", kind: "grid", file: path.join(PEEK, "trees.png"), cols: 4, rows: 4, rowNames: ["green", "autumn", "yellow", "sakura"], prefix: "tree" },
  { group: "Cainos village props", kind: "flood", file: path.join(PEEK, "cainos_props.png"), prefix: "cainos", minSide: 10, minArea: 120, max: 90 },
  { group: "Grass & bushes", kind: "flood", file: path.join(PEEK, "grass.png"), prefix: "grass", minSide: 6, minArea: 40, max: 30 },
  { group: "Mossy decorations", kind: "flood", file: path.join(MOSSY, "Mossy - Decorations&Hazards.png"), prefix: "mossy_d", minSide: 12, minArea: 200, max: 70 },
  { group: "Mossy hanging plants", kind: "flood", file: path.join(MOSSY, "Mossy - Hanging Plants.png"), prefix: "mossy_h", minSide: 12, minArea: 200, max: 50 },
  { group: "Mossy background decor", kind: "flood", file: path.join(MOSSY, "Mossy - BackgroundDecoration.png"), prefix: "mossy_bg", minSide: 14, minArea: 300, max: 50 },
  { group: "Tileset props", kind: "flood", file: path.join(SRC, "TileSet-36x36.png"), prefix: "tile", minSide: 10, minArea: 120, max: 30 },
  { group: "Plants (HD — may clash)", kind: "anim", dir: PLANTS, prefix: "plant" },
  { group: "Scenes (NOT placeable)", kind: "scene", file: path.join(PEEK2, "church001.png"), name: "church_scene", note: "1 of 15 full scenes (4000x2500, baked bg + scanlines)" },
  { group: "Maps / backgrounds", kind: "scene", file: path.join(PEEK2, "magicalroad_preview.png"), name: "magical_road", note: "parallax map pack, not a prop" },
  { group: "Maps / backgrounds", kind: "scene", file: path.join(ROOT, ".assettmp/scenes/japan1.png"), name: "japan_scene1", note: "Japanese background scene" },
  { group: "Maps / backgrounds", kind: "scene", file: path.join(ROOT, ".assettmp/scenes/japan3.png"), name: "japan_scene3", note: "Japanese background scene" },
];

// ---------- PNG decode/encode ----------
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
  if (bd !== 8) throw new Error("bit depth " + bd + " unsupported");
  const stride = w * ch, cur = Buffer.alloc(stride), prev = Buffer.alloc(stride), px = Buffer.alloc(w * h * ch);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[pos++];
    for (let x = 0; x < stride; x++) {
      const rb = raw[pos++], aa = x - ch >= 0 ? cur[x - ch] : 0, bb = prev[x], cc = x - ch >= 0 ? prev[x - ch] : 0;
      let v; switch (ft) { case 1: v = rb + aa; break; case 2: v = rb + bb; break; case 3: v = rb + ((aa + bb) >> 1); break; case 4: v = rb + paeth(aa, bb, cc); break; default: v = rb; }
      cur[x] = v & 255;
    }
    cur.copy(px, y * stride); cur.copy(prev);
  }
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    let r, g, b, al;
    if (ct === 6) { r = px[i * 4]; g = px[i * 4 + 1]; b = px[i * 4 + 2]; al = px[i * 4 + 3]; }
    else if (ct === 2) { r = px[i * 3]; g = px[i * 3 + 1]; b = px[i * 3 + 2]; al = 255; }
    else if (ct === 0) { r = g = b = px[i]; al = 255; }
    else if (ct === 4) { r = g = b = px[i * 2]; al = px[i * 2 + 1]; }
    else { const idx = px[i]; r = plte[idx * 3]; g = plte[idx * 3 + 1]; b = plte[idx * 3 + 2]; al = trns && idx < trns.length ? trns[idx] : 255; }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = al;
  }
  return { w, h, rgba };
}
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const t = Buffer.from(type, "ascii"); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, crc]); }
function encode(w, h, rgba) {
  const stride = w * 4, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// ---------- ops ----------
function crop(dec, ox, oy, cw, chh) {
  const out = Buffer.alloc(cw * chh * 4);
  for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) {
    const s = ((oy + y) * dec.w + (ox + x)) * 4, dp = (y * cw + x) * 4;
    out[dp] = dec.rgba[s]; out[dp + 1] = dec.rgba[s + 1]; out[dp + 2] = dec.rgba[s + 2]; out[dp + 3] = dec.rgba[s + 3];
  }
  return { w: cw, h: chh, rgba: out };
}
function trim(dec) {
  let x0 = dec.w, y0 = dec.h, x1 = -1, y1 = -1;
  for (let y = 0; y < dec.h; y++) for (let x = 0; x < dec.w; x++) if (dec.rgba[(y * dec.w + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < x0 ? null : crop(dec, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
}
function downscale(dec, maxDim) {
  const m = Math.max(dec.w, dec.h); if (m <= maxDim) return dec;
  const s = maxDim / m, nw = Math.max(1, Math.round(dec.w * s)), nh = Math.max(1, Math.round(dec.h * s)), out = Buffer.alloc(nw * nh * 4);
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
    const sx = Math.min(dec.w - 1, Math.floor(x / s)), sy = Math.min(dec.h - 1, Math.floor(y / s)), si = (sy * dec.w + sx) * 4, di = (y * nw + x) * 4;
    out[di] = dec.rgba[si]; out[di + 1] = dec.rgba[si + 1]; out[di + 2] = dec.rgba[si + 2]; out[di + 3] = dec.rgba[si + 3];
  }
  return { w: nw, h: nh, rgba: out };
}
// connected-component islands (8-connected, alpha>16)
function islands(dec, { minSide, minArea, max }) {
  const { w, h, rgba } = dec, vis = new Uint8Array(w * h), stack = new Int32Array(w * h), found = [];
  for (let i = 0; i < w * h; i++) {
    if (vis[i] || rgba[i * 4 + 3] <= 16) continue;
    let sp = 0; stack[sp++] = i; vis[i] = 1;
    let x0 = w, y0 = h, x1 = 0, y1 = 0, area = 0;
    while (sp > 0) {
      const p = stack[--sp], px = p % w, py = (p / w) | 0; area++;
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = px + dx, ny = py + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const np = ny * w + nx; if (!vis[np] && rgba[np * 4 + 3] > 16) { vis[np] = 1; stack[sp++] = np; }
      }
    }
    if (x1 - x0 + 1 >= minSide && y1 - y0 + 1 >= minSide && area >= minArea) found.push({ x0, y0, x1, y1, area });
  }
  found.sort((a, b) => b.area - a.area);
  return found.slice(0, max);
}

const items = [];
function save(name, dec, group, note) {
  fs.writeFileSync(path.join(OUT, name + ".png"), encode(dec.w, dec.h, dec.rgba));
  items.push({ group, name, file: name + ".png", w: dec.w, h: dec.h, ...(note ? { note } : {}) });
}

fs.mkdirSync(OUT, { recursive: true });
for (const s of SOURCES) {
  try {
    if (s.kind === "loose") {
      if (!fs.existsSync(s.file)) { console.log(`skip (missing) ${s.name}`); continue; }
      const t = trim(decode(s.file)); if (t) save(s.name, downscale(t, 220), s.group, s.note);
    } else if (s.kind === "grid") {
      const dec = decode(s.file), cw = (dec.w / s.cols) | 0, chh = (dec.h / s.rows) | 0;
      for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) {
        const t = trim(crop(dec, c * cw, r * chh, cw, chh)); if (t) save(`${s.prefix}_${s.rowNames[r]}_${c}`, downscale(t, 220), s.group);
      }
    } else if (s.kind === "flood") {
      if (!fs.existsSync(s.file)) { console.log(`skip (missing) ${s.prefix}`); continue; }
      const dec = decode(s.file), isl = islands(dec, s);
      isl.forEach((b, i) => { const t = trim(crop(dec, b.x0, b.y0, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1)); if (t) save(`${s.prefix}_${i}`, downscale(t, 200), s.group); });
      console.log(`flood ${s.prefix}: ${isl.length} props`);
    } else if (s.kind === "anim") {
      for (const f of fs.readdirSync(s.dir).filter((x) => x.endsWith(".png"))) {
        const t = trim(decode(path.join(s.dir, f))); if (t) save(`${s.prefix}_${f.replace(/\.png$/, "")}`, downscale(t, 180), s.group, "HD art");
      }
    } else if (s.kind === "scene") {
      if (!fs.existsSync(s.file)) { console.log(`skip (missing) ${s.name}`); continue; }
      save(s.name, downscale(decode(s.file), 320), s.group, s.note);
    }
  } catch (e) { console.log(`!! ${s.group}/${s.name || s.prefix}: ${e.message}`); }
}

fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify({ items }, null, 2));
console.log(`\n-> ${items.length} props in ${OUT}`);
