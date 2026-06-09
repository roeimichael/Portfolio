/* Wire downloaded mob + pet packs (LuizMelo "Monsters Creatures Fantasy" 1/2,
 * "Pet Dogs Pack") into the game. The packs ship one horizontal strip PNG per
 * animation with SQUARE frames, so we just copy the strips and record, per
 * actor: frame size, per-anim frame count, and the idle-frame bbox (for feet
 * alignment + uniform scaling — same trick the character pipeline uses).
 *
 * Source: ../../.assettmp/<extracted packs>   (extracted by the assistant)
 * Output: public/sprites/mobs/<id>/<anim>.png  + public/sprites/mobs/manifest.json
 *         public/sprites/pet/<id>/<anim>.png   + public/sprites/pet/manifest.json
 * Run: node src/animations/_mobs.cjs
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "../../");
const TMP = path.join(ROOT, ".assettmp");
const P1 = path.join(TMP, "Monsters_Creatures_Fantasy", "Monsters_Creatures_Fantasy");
const P2 = path.join(TMP, "Monsters Creatures Fantasy 2", "Monsters Creatures Fantasy 2");
const DOGS = path.join(TMP, "Pet Dogs Pack", "Pet Dogs Pack");
const CATS = path.join(TMP, "Pet Cats Pack", "Pet Cats Pack");

const MOBS = {
  mushroom:   { root: P1, folder: "Mushroom",   anims: { idle: "Idle.png", walk: "Run.png",   attack: "Attack.png", hit: "Take Hit.png", death: "Death.png" } },
  skeleton:   { root: P1, folder: "Skeleton",   anims: { idle: "Idle.png", walk: "Walk.png",  attack: "Attack.png", hit: "Take Hit.png", death: "Death.png" } },
  flying_eye: { root: P1, folder: "Flying eye", base: "walk", anims: { walk: "Flight.png", idle: "Flight.png", attack: "Attack.png", hit: "Take Hit.png", death: "Death.png" } },
  slime:      { root: P2, folder: "Slime",      anims: { idle: "idle.png", walk: "walk.png",  attack: "attack.png", hit: "hurt.png", death: "death.png" } },
};
const PET = {
  akita: { root: DOGS, folder: "Dog-2-Akita", anims: { idle: "Akita-Idle.png", walk: "Akita-walk.png", run: "Akita-run.png", sit: "Akita-sitting.png" } },
  golden: { root: DOGS, folder: "Dog-1-Golden-Retriever", anims: { idle: "Golden-Retriever-idle.png", walk: "Golden-Retriever-walk.png", run: "Golden-Retriever-run.png", sit: "Golden-Retriever-sitting.png" } },
  cat_calico: { root: CATS, folder: "Cat-1", anims: { idle: "Cat-1-Idle.png", walk: "Cat-1-Walk.png", run: "Cat-1-Run.png", sit: "Cat-1-Sitting.png" } },
  cat_tabby: { root: CATS, folder: "Cat-3", anims: { idle: "Cat-3-Idle.png", walk: "Cat-3-Walk.png", run: "Cat-3-Run.png", sit: "Cat-3-Sitting.png" } },
};

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

function build(set, outBase) {
  const manifest = {};
  fs.mkdirSync(outBase, { recursive: true });
  for (const [id, cfg] of Object.entries(set)) {
    const srcDir = path.join(cfg.root, cfg.folder), outDir = path.join(outBase, id);
    fs.mkdirSync(outDir, { recursive: true });
    const anims = {}; let frameH = 0;
    for (const [canon, file] of Object.entries(cfg.anims)) {
      const src = path.join(srcDir, file);
      if (!fs.existsSync(src)) { console.log(`!! ${id}/${canon}: missing ${file}`); continue; }
      const { w, h } = dims(src); frameH = h;
      fs.copyFileSync(src, path.join(outDir, canon + ".png"));
      anims[canon] = Math.max(1, Math.round(w / h));
    }
    const baseAnim = cfg.base || "idle";
    const bbox = bbox0(decode(path.join(srcDir, cfg.anims[baseAnim])));
    manifest[id] = { frameW: frameH, frameH, bbox, anims };
    console.log(`${id}: ${frameH}x${frameH}, bbox`, bbox, anims);
  }
  fs.writeFileSync(path.join(outBase, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("-> wrote", path.join(outBase, "manifest.json"), "\n");
}

build(MOBS, path.join(ROOT, "public/sprites/mobs"));
build(PET, path.join(ROOT, "public/sprites/pet"));
