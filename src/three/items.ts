// Wardrobe items on the 3D character (src/features/wardrobe; the catalogue is startng-be catalog.py).
// human.ts builds the body and hands its parts over as a Rig; this file adds whatever the style wears and returns
// an update for the moving ones (the cape sways, the aura flickers). Unknown keys draw nothing, so a game or an older
// site that doesn't know an item simply shows the character without it.
import * as THREE from "three";
import type { DressedStyle } from "../character";

const PI = Math.PI;

/** The body parts and helpers human.ts shares, so items sit on the body and follow its animation. */
export type Rig = {
  female: boolean;
  sitting?: boolean; // on a bench (the Hangout): long things stay clear of the seat
  sx: number; // the head's width
  lift: number; // how much higher hats sit (an afro)
  neckTop: number;
  shoulderY: number;
  torsoPts: number[][]; // the torso's outline: [radius, height] from the waist up, in the spine group
  torsoDepth: number; // the torso is this much flatter front to back
  root: THREE.Group;
  spine: THREE.Group;
  torso: THREE.Mesh;
  head: THREE.Group;
  arms: { sh: THREE.Group; elbow: THREE.Group; hand: THREE.Group }[];
  mat: (color: string, metal?: number, rough?: number) => THREE.MeshStandardMaterial;
  mesh: (geo: THREE.BufferGeometry, m: THREE.Material, x?: number, y?: number, z?: number) => THREE.Mesh;
  ball: (r: number, m: THREE.Material, x?: number, y?: number, z?: number, sx?: number, sy?: number, sz?: number) => THREE.Mesh;
  group: (parent: THREE.Object3D, x?: number, y?: number, z?: number) => THREE.Group;
  limb: (rTop: number, rBot: number, len: number, m: THREE.Material, bulge?: number) => THREE.Mesh;
  lathe: (pts: number[][], m: THREE.Material, depth: number) => THREE.Mesh;
};

export type Dressing = { update: (t: number) => void; dispose: () => void };

/** Every item the style wears: the worn list, plus a wardrobe item given as the hat or accessory. */
export function wornKeys(s: DressedStyle): Set<string> {
  const keys = new Set((s.items ?? []).map((i) => (typeof i === "string" ? i : i.key)));
  keys.add(s.hat);
  keys.add(s.accessory);
  return keys;
}

/** A small repeating picture for fabric (stripes, Ankara prints, embroidery). */
function pattern(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeatX = 1, repeatY = 1) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** The week of the year, which picks the streak scarf's colours (they change every Monday). */
function weekNumber(d = new Date()) {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - start) / (7 * 86400000));
}

export function dress(r: Rig, s: DressedStyle): Dressing {
  const worn = wornKeys(s);
  const has = (k: string) => worn.has(k);
  const { female, sx, lift, neckTop, shoulderY, spine, head, arms, mat, mesh, ball, group, limb, lathe } = r;
  const owned: { dispose: () => void }[] = []; // textures and materials made here
  const updates: ((t: number) => void)[] = [];

  // A material this file owns (patterned, see-through or two-sided), freed with the character.
  const cloth = (opts: THREE.MeshStandardMaterialParameters) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide, ...opts });
    owned.push(m);
    if (opts.map) owned.push(opts.map);
    return m;
  };
  const gold = mat("#e8b84a", 0.85, 0.28);

  // The body and every layer of clothes over it, as lathe outlines: necklaces and pins lie on the outermost.
  const layers: { pts: number[][]; depth: number }[] = [{ pts: r.torsoPts, depth: r.torsoDepth }];
  const frontOf = (p: number[][], depth: number, y: number) => {
    const sorted = [...p].sort((a, b) => a[1] - b[1]);
    if (y < sorted[0][1] || y > sorted[sorted.length - 1][1]) return 0;
    for (let i = 1; i < sorted.length; i++) {
      if (y <= sorted[i][1]) {
        const k = (y - sorted[i - 1][1]) / (sorted[i][1] - sorted[i - 1][1] || 1);
        return (sorted[i - 1][0] + (sorted[i][0] - sorted[i - 1][0]) * k) * depth;
      }
    }
    return 0;
  };
  /** How far the chest (with its clothes) sticks out at height y in the spine group. */
  const chestZ = (y: number) => Math.max(...layers.map((l) => frontOf(l.pts, l.depth, y)));

  /** A layer over the torso (and the chest on the female body), following its breathing. */
  const overTorso = (m: THREE.Material, grow = 0.01, below = 0) => {
    let pts = r.torsoPts.map(([rad, y]) => [rad + grow, y]);
    if (below) {
      // Down over the hips: wide enough that the swaying hips never poke through.
      const hipR = female ? 0.19 : 0.178;
      pts = [[hipR, -0.03 - below], [hipR, 0.0], [hipR - 0.015, 0.04], ...pts.filter(([, y]) => y >= 0.07)];
    }
    const layer = lathe(pts, m, r.torsoDepth);
    layers.push({ pts, depth: r.torsoDepth });
    spine.add(layer);
    updates.push(() => (layer.scale.y = r.torso.scale.y));
    if (female) for (const side of [-1, 1]) spine.add(ball(0.058 + grow, m, side * 0.056, 0.325, 0.045, 1, 0.88, 0.75));
    return layer;
  };
  /** Sleeves: upper arm, and the forearm too when long. */
  const sleeves = (m: THREE.Material, long: boolean, wide = 1) => {
    for (const { sh, elbow } of arms) {
      sh.add(limb((female ? 0.062 : 0.071) * wide, (female ? 0.046 : 0.052) * wide, 0.3, m));
      if (long) elbow.add(limb(0.046 * wide, 0.034 * wide, 0.235, m));
    }
  };

  // ---------------------------------------------------------------- hats (on the head; higher on an afro)
  if (has("bucket_hat")) {
    const m = cloth({ color: "#d8c7a0", roughness: 0.95 });
    const h = group(head, 0, 0.05 + lift, -0.006);
    const dome = lathe([[0.104, 0], [0.104, 0.035], [0.098, 0.07], [0.08, 0.095], [0.04, 0.105], [0, 0.107]], m, 1);
    dome.scale.x = sx + 0.06;
    h.add(dome);
    const brim = lathe([[0.104, 0.002], [0.13, -0.014], [0.158, -0.036]], m, 1);
    brim.scale.x = sx + 0.08;
    h.add(brim);
    const band = mesh(new THREE.CylinderGeometry(0.106, 0.106, 0.018, 32, 1, true), cloth({ color: "#6b5a3a" }), 0, 0.012, 0);
    band.scale.x = sx + 0.06;
    h.add(band);
  }
  if (has("kufi")) {
    const tex = pattern(64, 32, (g) => {
      g.fillStyle = "#f3eee2";
      g.fillRect(0, 0, 64, 32);
      g.strokeStyle = "#c9a14a";
      g.lineWidth = 2;
      for (let x = 0; x < 64; x += 8) { g.beginPath(); g.moveTo(x, 8); g.lineTo(x + 4, 16); g.lineTo(x + 8, 8); g.stroke(); }
      g.fillStyle = "#c9a14a";
      g.fillRect(0, 22, 64, 3);
    }, 6, 1);
    const m = cloth({ map: tex, roughness: 0.9, side: THREE.FrontSide });
    const h = group(head, 0, 0.078 + lift, -0.01);
    h.scale.x = sx + 0.06;
    h.add(mesh(new THREE.CylinderGeometry(0.1, 0.106, 0.08, 36, 1, true), m));
    h.add(ball(0.1, m, 0, 0.04, 0, 1, 0.3, 1));
  }
  if (has("gele")) {
    // A tall Nigerian head-tie: a wrap round the head and pleats fanned up at the back, in shimmering gold.
    const m = mat("#e39b1b", 0.35, 0.38);
    const deep = mat("#c2185b", 0.25, 0.45);
    const g = group(head, 0, 0.03 + lift, -0.01);
    g.scale.x = sx + 0.06;
    const band = mesh(new THREE.TorusGeometry(0.104, 0.026, 14, 40), m, 0, 0.012, 0);
    band.rotation.x = PI / 2;
    g.add(band);
    g.add(ball(0.12, m, 0, 0.055, -0.01, 1, 0.82, 1.02));
    const fan = group(g, 0, 0.1, -0.035);
    fan.rotation.x = -0.35;
    for (let i = 0; i < 7; i++) {
      const a = -0.95 + (i / 6) * 1.9;
      const pleat = ball(0.06, i % 2 ? deep : m, Math.sin(a) * 0.09, Math.cos(a) * 0.05, 0, 0.32, 1.25, 0.95);
      pleat.rotation.z = -a;
      fan.add(pleat);
    }
    g.add(ball(0.035, deep, 0, 0.03, -0.12, 1.3, 1, 0.8)); // the knot at the back
  }
  if (has("explorer_cap")) {
    // A safari helmet with a dark band and a little top button.
    const m = cloth({ color: "#c8b58a", roughness: 0.85 });
    const h = group(head, 0, 0.04 + lift, -0.006);
    h.scale.x = sx + 0.07;
    h.add(lathe([[0.106, 0], [0.106, 0.03], [0.097, 0.075], [0.07, 0.11], [0.03, 0.125], [0, 0.128]], m, 1.04));
    h.add(lathe([[0.104, 0.004], [0.14, -0.012], [0.165, -0.03]], m, 1.06));
    h.add(mesh(new THREE.CylinderGeometry(0.108, 0.108, 0.022, 36, 1, true), cloth({ color: "#4a3a26" }), 0, 0.016, 0));
    h.add(ball(0.012, m, 0, 0.128, 0));
  }
  const crown = (metal: THREE.Material, points: number, height: number, gems: string[], top?: string) => {
    const c = group(head, 0, 0.1 + lift, -0.005);
    c.add(mesh(new THREE.CylinderGeometry(0.086, 0.081, height, 36, 1, true), metal));
    const rim = mesh(new THREE.TorusGeometry(0.085, 0.006, 8, 36), metal, 0, -height / 2, 0);
    rim.rotation.x = PI / 2;
    c.add(rim);
    for (let i = 0; i < points; i++) {
      const a = (i / points) * PI * 2;
      c.add(mesh(new THREE.ConeGeometry(0.017, height + 0.01, 12), metal, Math.sin(a) * 0.083, height * 0.95, Math.cos(a) * 0.083));
      c.add(ball(0.007, metal, Math.sin(a) * 0.083, height * 1.5 + 0.005, Math.cos(a) * 0.083));
      const gem = gems[i % gems.length];
      const stone = mesh(new THREE.OctahedronGeometry(0.0095), mat(gem, 0.2, 0.12), Math.sin(a) * 0.088, 0, Math.cos(a) * 0.088);
      stone.rotation.y = a;
      c.add(stone);
    }
    if (top) {
      const diamond = mesh(new THREE.OctahedronGeometry(0.02), cloth({ color: top, emissive: top, emissiveIntensity: 0.35, metalness: 0.3, roughness: 0.05, side: THREE.FrontSide }), 0, height * 1.5 + 0.035, 0.05);
      diamond.scale.y = 1.4;
      c.add(diamond);
      updates.push((t) => (diamond.rotation.y = t * 1.2));
    }
    return c;
  };
  if (has("silver_crown")) crown(mat("#e4e9ef", 0.7, 0.25), 5, 0.05, ["#2f6fe0"]);
  if (has("gem_crown")) crown(gold, 8, 0.065, ["#d6263b", "#1e9e5a", "#2f6fe0", "#8e4fd6"], "#bff4ff");
  if (has("detty_december_hat")) {
    // A Santa hat with a floppy tip.
    const red = cloth({ color: "#c8202f", roughness: 0.9, side: THREE.FrontSide });
    const white = mat("#f7f4ee", 0, 1);
    const h = group(head, 0, 0.06 + lift, -0.01);
    h.scale.x = sx + 0.05;
    const fur = mesh(new THREE.TorusGeometry(0.103, 0.022, 12, 36), white, 0, 0, 0);
    fur.rotation.x = PI / 2;
    h.add(fur);
    h.add(lathe([[0.104, 0], [0.09, 0.06], [0.065, 0.11], [0.04, 0.15]], red, 1));
    const tip = group(h, 0, 0.145, 0);
    tip.rotation.z = -1.1;
    tip.add(lathe([[0.042, 0], [0.025, 0.06], [0.004, 0.12]], red, 1));
    tip.add(ball(0.028, white, 0, 0.125, 0));
    updates.push((t) => (tip.rotation.z = -1.1 + Math.sin(t * 2.1) * 0.08));
  }

  // ---------------------------------------------------------------- extras (face and wrists)
  if (has("sunglasses")) {
    const lens = mat("#151619", 0.7, 0.12);
    const frame = mat("#2b2b2e", 0.5, 0.3);
    for (const side of [-1, 1]) {
      head.add(ball(0.027, lens, side * 0.036, 0.012, 0.096, 1.25, 0.85, 0.35));
      head.add(mesh(new THREE.BoxGeometry(0.004, 0.005, 0.1), frame, side * 0.083 * (sx / 0.88), 0.016, 0.05));
    }
    head.add(mesh(new THREE.BoxGeometry(0.03, 0.005, 0.006), frame, 0, 0.022, 0.104));
  }
  if (has("wristband")) {
    const colours = ["#1dd1a1", "#d8fd71"];
    arms.forEach(({ elbow }, i) => {
      const band = mesh(new THREE.TorusGeometry(0.031, 0.011, 10, 24), mat(colours[i], 0, 0.9), 0, -0.21, 0);
      band.rotation.x = PI / 2;
      elbow.add(band);
    });
  }
  if (has("headphones")) {
    const dark = mat("#232327", 0.3, 0.4);
    const accent = mat("#d8fd71", 0, 0.5);
    const big = 1 + lift * 2.4; // over an afro
    const band = mesh(new THREE.TorusGeometry(0.118, 0.012, 10, 40, PI), dark, 0, -0.005, 0);
    band.scale.set((sx / 0.88) * 0.92 * big, 1.22 * big, 1);
    head.add(band);
    for (const side of [-1, 1]) {
      const cup = mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.03, 24), dark, side * 0.1 * (sx / 0.88) * big, -0.008, 0);
      cup.rotation.z = PI / 2;
      head.add(cup);
      const ring = mesh(new THREE.TorusGeometry(0.03, 0.005, 8, 24), accent, side * 0.116 * (sx / 0.88) * big, -0.008, 0);
      ring.rotation.y = PI / 2;
      head.add(ring);
    }
  }

  // ---------------------------------------------------------------- outfits (over the top)
  if (has("plain_hoodie")) {
    const m = cloth({ color: "#8e9196", roughness: 0.95, side: THREE.FrontSide });
    overTorso(m, 0.012, 0.12);
    sleeves(m, true, 1.12);
    const hood = mesh(new THREE.TorusGeometry(0.075, 0.03, 12, 28, PI * 1.25), m, 0, neckTop - 0.12, -0.03);
    hood.rotation.set(PI / 2, 0, -PI * 0.125 + PI / 2);
    spine.add(hood);
    spine.add(ball(0.08, m, 0, neckTop - 0.1, -0.1 - (female ? 0 : 0.01), 1.1, 0.8, 0.55));
    const pocketY = 0.02;
    spine.add(ball(0.08, m, 0, pocketY, chestZ(pocketY) - 0.004, 1.35, 0.5, 0.12));
    for (const side of [-1, 1]) {
      const y = neckTop - 0.2;
      spine.add(mesh(new THREE.CapsuleGeometry(0.004, 0.08, 4, 6), mat("#f2f2f2", 0, 0.8), side * 0.03, y, chestZ(y) + 0.012));
    }
  }
  if (has("ankara_top")) {
    const tex = pattern(64, 64, (g) => {
      g.fillStyle = "#f08a24";
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = "#13857a";
      for (const [x, y] of [[16, 16], [48, 48]]) { g.beginPath(); g.arc(x, y, 12, 0, PI * 2); g.fill(); }
      g.fillStyle = "#f7d046";
      for (const [x, y] of [[16, 16], [48, 48]]) { g.beginPath(); g.arc(x, y, 5, 0, PI * 2); g.fill(); }
      g.fillStyle = "#6a2c91";
      for (const [x, y] of [[48, 16], [16, 48]]) { g.beginPath(); g.moveTo(x, y - 11); g.lineTo(x + 11, y); g.lineTo(x, y + 11); g.lineTo(x - 11, y); g.fill(); }
    }, 5, 3);
    const m = cloth({ map: tex, roughness: 0.85, side: THREE.FrontSide });
    overTorso(m, 0.008, 0.05);
    sleeves(m, false, 1.08);
  }
  if (has("agbada")) {
    // A flowing robe from the shoulders to below the knees, wide enough to drape over the arms, with a gold collar
    // and embroidery down the chest.
    const folds = pattern(128, 8, (g) => {
      const grad = g.createLinearGradient(0, 0, 128, 0);
      for (let i = 0; i <= 8; i++) grad.addColorStop(i / 8, i % 2 ? "#ded2b8" : "#f6efdf");
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 8);
    }, 3, 1);
    const m = cloth({ map: folds, roughness: 0.75 });
    const w = female ? 0.25 : 0.28; // past the shoulders, so the arms are under the drape
    const top = shoulderY + 0.085;
    const robePts = [[w + 0.1, -0.62], [w + 0.08, -0.3], [w + 0.05, 0.0], [w + 0.03, shoulderY - 0.25], [w, shoulderY - 0.06],
      [w - 0.03, shoulderY + 0.02], [0.16, top - 0.015], [0.1, top], [0.055, top + 0.005]];
    const depth = 0.7;
    spine.add(lathe(robePts, m, depth));
    layers.push({ pts: robePts, depth });
    const hem = mesh(new THREE.TorusGeometry(w + 0.1, 0.008, 8, 48), gold, 0, -0.6, 0);
    hem.rotation.x = PI / 2;
    hem.scale.y = depth;
    spine.add(hem);
    const collar = mesh(new THREE.TorusGeometry(0.068, 0.011, 10, 32), gold, 0, neckTop - 0.125, 0.005);
    collar.rotation.x = PI / 2 - 0.15;
    spine.add(collar);
    const tex = pattern(32, 64, (g) => {
      g.fillStyle = "#efe6d2";
      g.fillRect(0, 0, 32, 64);
      g.strokeStyle = "#c9a14a";
      g.lineWidth = 3;
      for (let y = 4; y < 64; y += 12) { g.beginPath(); g.arc(16, y, 6, 0, PI * 2); g.stroke(); }
    }, 1, 2);
    const patchY = shoulderY - 0.13;
    spine.add(ball(0.06, cloth({ map: tex, roughness: 0.6, side: THREE.FrontSide }), 0, patchY, chestZ(patchY) - 0.004, 1, 2.3, 0.12));
  }
  if (has("veteran_jacket")) {
    const m = cloth({ color: "#4b5a3a", roughness: 0.8, side: THREE.FrontSide });
    overTorso(m, 0.012, 0.08);
    sleeves(m, true, 1.1);
    const collar = mesh(new THREE.TorusGeometry(0.07, 0.016, 10, 28), m, 0, neckTop - 0.13, 0.004);
    collar.rotation.x = PI / 2 - 0.15;
    spine.add(collar);
    for (const { sh } of arms) sh.add(mesh(new THREE.BoxGeometry(0.07, 0.012, 0.06), gold, 0, 0.05, 0)); // epaulettes
    // medals on the left chest (the character's left is +x): a ribbon and a disc each
    const ribbons = ["#b3122e", "#2f6fe0", "#e8b84a"];
    ribbons.forEach((c, i) => {
      const x = 0.035 + i * 0.026;
      const y = shoulderY - 0.07;
      const z = chestZ(y) + 0.016;
      spine.add(mesh(new THREE.BoxGeometry(0.02, 0.026, 0.005), mat(c, 0, 0.6), x, y, z));
      const disc = mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.004, 16), i === 1 ? mat("#d3dae2", 0.9, 0.25) : gold, x, y - 0.026, z + 0.002);
      disc.rotation.x = PI / 2;
      spine.add(disc);
    });
  }

  // ---------------------------------------------------------------- neck
  /** Points round the neck that dip down the chest at the front, lying on the clothes. */
  const necklace = (n: number, dip: number, place: (p: THREE.Vector3, a: number, i: number) => void) => {
    const y0 = neckTop - 0.14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2;
      const front = Math.max(0, Math.cos(a));
      const y = y0 - dip * front * front;
      const z = Math.cos(a) * 0.062 + 0.005;
      place(new THREE.Vector3(Math.sin(a) * 0.072, y, front > 0.2 ? Math.max(z, chestZ(y) + 0.01) : z), a, i);
    }
  };
  if (has("bead_necklace")) {
    const colours = ["#e2583e", "#2bb3a3", "#e8b84a"].map((c) => mat(c, 0.15, 0.35));
    necklace(22, 0.06, (p, _a, i) => spine.add(ball(0.0105, colours[i % 3], p.x, p.y, p.z)));
  }
  if (has("gold_chain")) {
    necklace(30, 0.1, (p, a, i) => {
      const link = mesh(new THREE.TorusGeometry(0.0075, 0.0026, 6, 12), gold, p.x, p.y, p.z);
      link.rotation.set(i % 2 ? PI / 2 : 0, a, 0);
      spine.add(link);
    });
    const y = neckTop - 0.26;
    const pendant = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.006, 24), gold, 0, y, chestZ(y) + 0.014);
    pendant.rotation.x = PI / 2;
    spine.add(pendant);
    spine.add(mesh(new THREE.OctahedronGeometry(0.008), mat("#bff4ff", 0.3, 0.05), 0, y, chestZ(y) + 0.019));
  }
  if (has("streak_scarf")) {
    // Stripes in two colours that change every week.
    const hue = (weekNumber() * 53) % 360;
    const tex = pattern(64, 8, (g) => {
      for (let x = 0; x < 64; x += 16) {
        g.fillStyle = `hsl(${hue} 70% 50%)`;
        g.fillRect(x, 0, 8, 8);
        g.fillStyle = `hsl(${(hue + 150) % 360} 65% 45%)`;
        g.fillRect(x + 8, 0, 8, 8);
      }
    }, 3, 1);
    const sc = cloth({ map: tex, roughness: 0.95, side: THREE.FrontSide });
    const ring = mesh(new THREE.TorusGeometry(0.068, 0.032, 14, 28), sc, 0, neckTop - 0.13, 0.005);
    ring.rotation.x = PI / 2 - 0.15;
    ring.scale.set(1.08, 0.85, 1);
    spine.add(ring);
    for (const [x, len, rot] of [[0.055, 0.2, 0.06], [0.02, 0.15, -0.05]]) {
      const tail = mesh(new THREE.CapsuleGeometry(0.027, len, 6, 12), sc, x, neckTop - 0.17 - len / 2, chestZ(neckTop - 0.25) + 0.02);
      tail.scale.z = 0.4;
      tail.rotation.z = rot;
      spine.add(tail);
    }
  }
  if (has("champion_sash")) {
    // A red sash from the right shoulder to the left hip, edged in gold, with a medal on the chest.
    const tex = pattern(8, 32, (g) => {
      g.fillStyle = "#b3122e";
      g.fillRect(0, 0, 8, 32);
      g.fillStyle = "#e8b84a";
      g.fillRect(0, 0, 8, 4);
      g.fillRect(0, 28, 8, 4);
    }, 12, 1);
    const radius = (female ? 0.158 : 0.18);
    const sash = group(spine, 0, shoulderY - 0.17, 0);
    sash.rotation.z = -0.78;
    sash.scale.z = r.torsoDepth + 0.08;
    sash.add(mesh(new THREE.CylinderGeometry(radius, radius, 0.065, 48, 1, true), cloth({ map: tex, roughness: 0.6 })));
    const medalY = shoulderY - 0.17;
    const medal = mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.008, 24), gold, 0, medalY, chestZ(medalY) + 0.03);
    medal.rotation.x = PI / 2;
    spine.add(medal);
    spine.add(mesh(new THREE.OctahedronGeometry(0.01), mat("#d6263b", 0.2, 0.15), 0, medalY, chestZ(medalY) + 0.036));
  }
  if (has("pioneer_pin")) {
    const y = shoulderY - 0.05;
    const pin = mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.006, 20), mat("#e0457b", 0.2, 0.4), 0.075, y, chestZ(y) + 0.008);
    pin.rotation.x = PI / 2;
    spine.add(pin);
    const star = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * PI * 2 - PI / 2;
      const rad = i % 2 ? 0.0045 : 0.011;
      if (i === 0) star.moveTo(Math.cos(a) * rad, -Math.sin(a) * rad);
      else star.lineTo(Math.cos(a) * rad, -Math.sin(a) * rad);
    }
    spine.add(mesh(new THREE.ExtrudeGeometry(star, { depth: 0.003, bevelEnabled: false }), gold, 0.075, y, chestZ(y) + 0.011));
  }

  // ---------------------------------------------------------------- back
  if (has("tournament_cape")) {
    // A royal purple cape from the shoulders to the knees, gold along the edges, that sways as the character moves.
    const tex = pattern(64, 64, (g) => {
      g.fillStyle = "#5b1aa6";
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = "#e8b84a";
      g.fillRect(0, 0, 5, 64);
      g.fillRect(59, 0, 5, 64);
      g.fillRect(0, 58, 64, 6);
    });
    const len = r.sitting ? 0.42 : female ? 0.95 : 1.0; // sitting, it stops at the bench
    const geo = new THREE.PlaneGeometry(0.4, len, 10, 18);
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const down = 0.5 - p.getY(i) / len; // 0 at the shoulders, 1 at the hem
      const wx = x * (1 + down * 0.6); // wider at the bottom
      p.setXYZ(i, wx, -down * len, wx * wx * 1.4 * (1 - down * 0.5) - down * 0.05); // the edges wrap forward round the body
    }
    geo.computeVertexNormals();
    const back = -chestZ(shoulderY) - 0.025;
    const cape = group(spine, 0, shoulderY + 0.03, back);
    const m = cloth({ map: tex, roughness: 0.7 });
    owned.push(geo);
    const sheet = new THREE.Mesh(geo, m);
    sheet.castShadow = true;
    cape.add(sheet);
    for (const side of [-1, 1]) spine.add(ball(0.014, gold, side * 0.07, neckTop - 0.15, chestZ(neckTop - 0.15) + 0.01)); // clasps
    updates.push((t) => (cape.rotation.x = 0.06 + Math.sin(t * 1.3) * 0.035 - spine.rotation.x));
  }

  // ---------------------------------------------------------------- aura (round the whole body)
  if (has("flame_aura")) {
    const aura = group(r.root);
    const flames: { m: THREE.Mesh; mat: THREE.MeshBasicMaterial; phase: number; h: number }[] = [];
    const n = 12;
    for (let i = 0; i < n; i++) {
      const inner = i % 2 === 1;
      // Plain see-through colour (not added light), so the flames stay orange on start.ng's light pages too.
      const fm = new THREE.MeshBasicMaterial({ color: inner ? "#ffc21a" : "#ff5a12", transparent: true, opacity: 0.7, depthWrite: false });
      owned.push(fm);
      const h = inner ? 0.3 : 0.46;
      const wide = inner ? 0.045 : 0.065;
      // a teardrop flame: round at the bottom, licking up to a point
      const geo = new THREE.LatheGeometry([[0, 0], [wide * 0.8, h * 0.08], [wide, h * 0.25], [wide * 0.7, h * 0.55], [wide * 0.25, h * 0.85], [0, h]]
        .map(([x, y]) => new THREE.Vector2(Math.max(x, 0.0001), y)), 12);
      owned.push(geo);
      const flame = new THREE.Mesh(geo, fm);
      const a = (i / n) * PI * 2;
      const rad = inner ? 0.26 : 0.34;
      flame.position.set(Math.sin(a) * rad, 0, Math.cos(a) * rad);
      aura.add(flame);
      flames.push({ m: flame, mat: fm, phase: i * 1.7, h });
    }
    const glowTex = pattern(64, 64, (g) => {
      const grad = g.createRadialGradient(32, 32, 4, 32, 32, 32);
      grad.addColorStop(0, "rgba(255,140,40,.9)");
      grad.addColorStop(1, "rgba(255,80,20,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
    });
    const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    owned.push(glowMat, glowTex);
    const glowGeo = new THREE.PlaneGeometry(1.1, 1.1);
    owned.push(glowGeo);
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = -PI / 2;
    glow.position.y = 0.004;
    aura.add(glow);
    updates.push((t) => {
      aura.rotation.y = t * 0.5;
      for (const f of flames) {
        const k = Math.sin(t * 5 + f.phase);
        f.m.scale.set(1 - k * 0.12, 0.85 + 0.35 * k * k, 1 - k * 0.12);
        f.mat.opacity = 0.55 + 0.25 * (0.5 + 0.5 * Math.sin(t * 7 + f.phase * 2));
      }
    });
  }

  return {
    update: (t) => { for (const u of updates) u(t); },
    dispose: () => owned.forEach((o) => o.dispose()),
  };
}
