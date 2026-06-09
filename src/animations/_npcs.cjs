/* Wire the "Lively NPCs" pack (front-facing idle townsfolk) into the game as
 * standing NPC guides. Each sheet is one horizontal idle strip with SQUARE
 * frames (side = strip height), so we copy the strip and record, per NPC:
 * frame size, frame count, and the frame-0 bbox (for feet alignment + scaling
 * — same trick the mob/char pipelines use).
 *
 * Source: ../../.assettmp/Lively_NPCs/medieval/<id>.png  (extracted by the assistant)
 * Output: public/sprites/npcs/<id>/idle.png  +  public/sprites/npcs/manifest.json
 * Run: node src/animations/_npcs.cjs
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "../../");
const SRC = path.join(ROOT, ".assettmp", "Lively_NPCs", "medieval");
const OUT = path.join(ROOT, "public/sprites/npcs");

// curated standing guides (front-facing idle). order = assignment order in-game.
const NPCS = ["elder", "merchant", "blacksmith", "king", "princess", "guard", "seer", "minstrel", "captain", "priestess"];

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
function dims(file) { const d = fs.readFileSync(file); return { w: d.readUInt32BE(16), h: d.readUInt32BE(20) }; }
// bbox of frame 0 (square frame, side = strip height) from alpha
function bbox0(dec) {
  const { w, h, rgba } = dec, fw = h; let x0 = fw, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < fw; x++) if (rgba[(y * w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1 };
}

const manifest = { order: NPCS, npcs: {} };
fs.mkdirSync(OUT, { recursive: true });
for (const id of NPCS) {
  const src = path.join(SRC, id + ".png");
  if (!fs.existsSync(src)) { console.log(`!! ${id}: missing ${src}`); continue; }
  const outDir = path.join(OUT, id); fs.mkdirSync(outDir, { recursive: true });
  const { w, h } = dims(src);
  fs.copyFileSync(src, path.join(outDir, "idle.png"));
  const bbox = bbox0(decode(src));
  manifest.npcs[id] = { frameW: h, frameH: h, bbox, anims: { idle: Math.max(1, Math.round(w / h)) } };
  console.log(`${id}: ${h}x${h}, frames ${Math.round(w / h)}, bbox`, bbox);
}
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("\n-> wrote", path.join(OUT, "manifest.json"));
