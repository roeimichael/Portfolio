# /animated — asset guide (downloadable packs only)

The game uses **downloaded sprite/tile packs**, not hand-drawn code. This file
lists where to get good free/cheap pixel packs and exactly where to drop them so
I can wire each one in. I can't download from itch.io (it's gated) — **you grab
the pack, unzip it into the folder below, tell me, and I wire it.**

Pixel-style tip: pick packs that share a similar pixel density / outline style so
the hero, mobs, NPCs and map read as one world. The current hero set (Chierit)
and the current map (Tiny Pixel Japan) are the style references.

---

## 1. Maps / parallax backgrounds  → `public/sprites/bg/<name>/`
Layered side-scroller parallax (sky / mountains / trees / ground as separate PNGs).

| Source | Link | Notes |
|--------|------|-------|
| **ansimuz** | https://ansimuz.itch.io | "Mountain Dusk Parallax" (free), "Sunny Land", "Warped City" — CC0 |
| **edermunizz** | https://edermunizz.itch.io | "Free Pixel Art Forest / Hill / Mountains" — beautiful layered parallax |
| **CraftPix (free)** | https://craftpix.net/freebies/ | filter *Backgrounds* — forest/mountains/winter/japanese, free w/ attribution |
| **OpenGameArt** | https://opengameart.org | search "parallax" — Vnitti "Glacial Mountains", "Country Side" (CC0) |
| **Japanese theme** | https://itch.io/game-assets/free/tag-japanese | add "parallax" — Edo/temple/sakura sets |

**Drop-in:** unzip the layers into `public/sprites/bg/<name>/` and tell me the
layer order far→near. I'll point the map at it (and can set up **multiple maps
that crossfade** as you walk, or just swap the current one).

## 2. Playable characters  → `public/sprites/chars/<id>/` (via compose script)
Need these anims: idle, run, jump-up, jump-down, air-attack, 3 ground attacks,
special, roll, defend.

| Source | Link | Notes |
|--------|------|-------|
| **Chierit** | https://chierit.itch.io | same artist as the current 5 heroes — perfect match |
| **LuizMelo** | https://luizmelo.itch.io | "Hero Knight", "Martial Hero 1-3", "Wizard", "Huntress" — free, full anim sets |

**Drop-in:** unzip per-frame folders into `src/animations/_chars/<id>/`, add an
entry to `src/animations/_compose.cjs`, run `node src/animations/_compose.cjs`.
(Full steps were in the previous version of this file — ask me and I'll do it.)

## 3. Mobs / enemies / bosses  → `public/sprites/mobs/<id>/`
| Source | Link | Notes |
|--------|------|-------|
| **LuizMelo** | https://luizmelo.itch.io | "Monsters Creatures Fantasy", "Evil Wizard", "Wraith", "Skeleton" — free |
| **Penusbmic** | https://penusbmic.itch.io | "The Dark Series" enemy packs (some free) |
| **CraftPix (free)** | https://craftpix.net/freebies/ | enemy character sprites (orc/skeleton/slime) |

**Drop-in:** unzip into `public/sprites/mobs/<id>/` (sheet PNGs or per-frame
folders). Tell me frame size + which anims exist (idle/walk/hurt/death) and I'll
add a sprite-based enemy with patrol + hit reactions.

## 4. NPCs (townsfolk)  → `public/sprites/npcs/<id>/`
**WIRED** — uses the **Lively NPCs** pack (front-facing idle townsfolk). They
stand at each station and talk; front-facing reads fine since they don't walk.
Front-facing OR side-view both work. Only an **idle** strip is needed.
Pipeline: `src/animations/_npcs.cjs` (extract a pack into
`.assettmp/Lively_NPCs/medieval/`, list the ids in `NPCS`, run it). The in-game
roster + count is `NPC_ROSTER` in `AnimatedJourney.tsx`.

| Source | Link | Notes |
|--------|------|-------|
| **Chierit / LuizMelo** | https://chierit.itch.io · https://luizmelo.itch.io | ★ best match — reuse a *hero-style* character as a standing NPC; same art as our heroes |
| **CraftPix (free)** | https://craftpix.net/freebies/ | "2D character sprites" side-view |
| **itch search** | https://itch.io/game-assets/free/tag-side-scroller | "npc", "villager", "townsfolk" + side-view |

Search terms: `side view npc pixel`, `platformer townsfolk pixel`, `side scroller villager`.

**Drop-in:** an idle (and optional talk) strip per NPC into
`public/sprites/npcs/<id>/`. I'll draw it at each station in place of the current
glowing waypoint marker (the talk + speech-bubble + dossier already work).

## 5. Pet / companion  → `public/sprites/pet/<id>/`
| Source | Link | Notes |
|--------|------|-------|
| **itch animals** | https://itch.io/game-assets/free/tag-animals | "cat", "shiba", "fox", "familiar" |
| **CraftPix (free)** | https://craftpix.net/freebies/ | small creature sprites |

**Drop-in:** idle + run (or fly) sheet into `public/sprites/pet/<id>/`. I'll add
a follower that trails the hero.

## 6. Buildings / objects  → `public/sprites/props/`
Single PNGs placed in the world (already supported via the `PROPS` array).

**Drop-in:** put a PNG in `public/sprites/props/`, tell me its world x; I add a
`PROPS` entry (and walkable collision on top if you want to stand on it).

---

## Licensing
Keep attribution for every pack. The select screen credits the current art; I'll
add credits for any new packs you bring.
