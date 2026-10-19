// My Dreamy RPG — sprite source, authored with pxl (https://github.com/crsolver/claude-pxl).
// Build: `npm run art` (renders out/ and packs it into js/pxl-art.js for the game).
//
// Player gear is drawn in the Knight colours; the game recolours those exact colours at load
// time for the other helmets / chests / boots (see GEAR_MASK in js/art.js).

pal({
  k: "#1a1326", K: "#0a0614",                                   // outline, deep shadow
  s: "#f6d2b5", S: "#d9a088", e: "#2b2140",                     // skin, eye
  y: "#f2c45a", Y: "#fff0a8", b: "#5a3b2e",                     // gold, belt
  H: "#cfd6ea", h: "#8e97b8", L: "#ffffff", R: "#e0475e",       // helm (knight), plume
  A: "#a9b4d4", a: "#6d779e", l: "#e6ecfa",                     // armour
  C: "#3b5bb5", c: "#263f86",                                   // cape
  P: "#4b4f6e", p: "#363a56",                                   // trousers
  O: "#b9c2dc", o: "#7d86a6",                                   // boots
  // flora
  v: "#1f4e4c", G: "#2b6b5a", g: "#3f8b63", V: "#62aa6c", z: "#94cf7f", Z: "#d2f0a6",
  T: "#1b4a5a", t: "#27686f", u: "#3a8b84", U: "#5cb19a", n: "#95d7b6",
  M: "#7a3a6e", m: "#b45a92", N: "#e184b6", w: "#f6b1d2", W: "#ffe0ee",
  x: "#3e2834", X: "#5e3d40", j: "#80594f",                     // bark
  // stone
  q: "#2c2844", r: "#45406a", Q: "#6a6596", i: "#9a95c4", I: "#d4d0f0",
  d: "#130c1d", D: "#241a36", f: "#3a2c55", F: "#57447c",
  // glow keys (each material its own key so glow() only lights it)
  "1": "#ffd27a", "2": "#fff4c8",                               // warm lantern flame
  "3": "#9ef0ff", "4": "#e6fbff",                               // cyan (mushroom / blue lantern)
  "5": "#3f6fd0", "6": "#6fb8ff", "7": "#b6ecff",               // blue crystal
  "8": "#6a33b0", "9": "#a46cf0", "0": "#dbb8ff",               // violet crystal
  // creatures
  B: "#5a4bc4", E: "#8b7cf6", J: "#e2dbff",                     // slime gel
  "+": "#271d3c", "-": "#3d2f58", "=": "#a05bd6", "^": "#ff6b9a", "&": "#efe8ff",   // hound
  "<": "#120b1e", ">": "#1f1433", "(": "#2e1f4a", ")": "#45306a", "[": "#5f4690", // boss cloak
  "]": "#4a4366", "{": "#7a7399", "}": "#b6b0d6", "@": "#ff7ae0", "%": "#c78bff", "$": "#07040c",
  // wood, straw, metal
  "|": "#6b4330", "/": "#9c6a45", "\\": "#c08a5a", "~": "#e8c06a", "!": "#b08a3a",
  "'": "#fff6d6", '"': "#d8c08c", ",": "#7fe6ff", ";": "#cfd9ff", ":": "#6c78b8",
})
ramps("kvGgVzZ", "kTtuUn", "kMmNwW", "kxXj", "kqrQiI", "KdDfF", "kBEJ", "<>()[", "]{}", "kpP", "kaAl", "khHL", "kcC", "koO", "kSs")

// ============================================================== hero (16x23 + outline)
// Torso is symmetric: write the left half once.
sprite("_torso_f", { mx: true }, `
  ........
  ........
  ........
  ........
  ........
  ........
  ........
  ........
  ........
  ........
  ......ss
  ...lAAAA
  ..ClAAAy
  ..CaAAAy
  ..saAAAA
  ..CbbbbY
  ..caAAAA
  ...aaAAA
  ....PPPP`)
sprite("_torso_b", { mx: true }, `
  ........
  ........
  ........
  ........
  ........
  ........
  ........
  ........
  ........
  ........
  ......SS
  ...lCCCC
  ..AlCCCC
  ..AaCCCc
  ..sACCcC
  ..CCcCCc
  ..cCcCcC
  ...cCcCc
  ....PPPP`)

// legs: idle, left step, right step (rows 18..22)
const LEGS = [
  [".....PP..PP.....", ".....Pp..pP.....", ".....OO..OO.....", "....OOo..oOO...."],
  [".....PP..PP.....", "....OOo..pP.....", "....kkk..OO.....", ".........oOO...."],
  [".....PP..PP.....", ".....Pp..oOO....", ".....OO..kkk....", "....OOo........."],
]
const legs = (n) => grid(0, 19, LEGS[n].join("\n"))

// heads (16 wide, rows 0..10), front and back
const HEADS = {
  knighthelm: {
    f: `
  ..RR............
  ...RRR..........
  ...RR.HHHH......
  .....HLLHHh.....
  ....HLHHHHHh....
  ....yyyyyyyy....
  ....HssssssH....
  ....HseSSesH....
  ....hSssssSh....
  .....hSSSSh.....`,
    b: `
  ..RR............
  ...RRR..........
  ...RR.HHHH......
  .....HHHHHh.....
  ....HHHHHHHh....
  ....yyyyyyyy....
  ....HHHHHHHh....
  ....hHHHHHhh....
  ....hhHHHhhh....
  .....hhhhhh.....`,
  },
  arcanecowl: {
    f: `
  .........HH.....
  ........HHh.....
  .......HHHh.....
  ......HLHHh.....
  ...hHHHHHHHHHh..
  ....yyyyyyyy....
  ....hssssssh....
  ....hseSSesh....
  ....hSssssSh....
  .....hSSSSh.....`,
    b: `
  .........HH.....
  ........HHh.....
  .......HHHh.....
  ......HHHHh.....
  ...hHHHHHHHHHh..
  ....yyyyyyyy....
  ....hhhhhhhh....
  ....hhhhhhhh....
  ....hhhhhhhh....
  .....hhhhhh.....`,
  },
  wardenhood: {
    f: `
  ................
  ................
  ......HHHH......
  ....HHHHHHHH....
  ...HLLHHHHHHh...
  ...HLHHHHHHHh...
  ...HssssssssH...
  ...HsseSSessh...
  ...hSssssssSh...
  ....hSSSSSSh....`,
    b: `
  ................
  ................
  ......HHHH......
  ....HHHHHHHH....
  ...HHHHHHHHHh...
  ...HHHHHHHHHh...
  ...HHHHHHHHHh...
  ...hHHHHHHHhh...
  ...hhHHHHHhhh...
  ....hhhhhhhh....`,
  },
}
for (const id in HEADS) {
  for (const side of ["f", "b"]) {
    sprite("_head_" + id + "_" + side, HEADS[id][side])
    // 4-frame walk: idle, left, idle, right — with a 1px body bob on the step frames
    anim("hero_" + id + "_" + side, { w: 16, h: 23, outline: "k", fps: 8 },
      frame({}, stamp("_torso_" + side, 0, 0), legs(0), stamp("_head_" + id + "_" + side, 0, 0)),
      frame({}, stamp("_torso_" + side, 0, 1), legs(1), stamp("_head_" + id + "_" + side, 0, 1)),
      frame({}, stamp("_torso_" + side, 0, 0), legs(0), stamp("_head_" + id + "_" + side, 0, 0)),
      frame({}, stamp("_torso_" + side, 0, 1), legs(2), stamp("_head_" + id + "_" + side, 0, 1)))
  }
}

// ============================================================== weapons (pointing right)
sprite("sword", { outline: "k" }, `
  ..y.............
  bbyy''''''''''''.
  ..y."""""""""".`)
sprite("staff", { w: 20, h: 5 },
  line(0, 2, 15, 2, "|"), px(15, 2, "y"), circ(17, 2, 2, ","), px(17, 1, "4"), px(16, 2, "4"),
  glow(",4", { r: 2, strength: 0.6 }))
sprite("bow", { w: 7, h: 19 }, (c) => {
  for (let t = -1; t <= 1.0001; t += 0.02) {
    const x = 1 + Math.round(4.2 * (1 - t * t)), y = Math.round(9 + t * 9)
    c.px(x, y, ";"); c.px(x + 1, y, ":")
  }
  c.vline(1, 0, 19, "4"); c.px(5, 9, "y"); c.px(6, 9, "y")
})
sprite("arrow", `
  ;.........
  ||||||||''
  ;.........`)

// ============================================================== monsters
sprite("slime", { mx: true, outline: "k" }, `
  .....BB
  ...BEEE
  ..BEEEE
  .BEEEJJ
  .BEJeEE
  BEEJeEE
  BEEEEEE
  BEEEEEk
  BBEEEEE
  .BBBBBB`,
  light([4, 2, 3], 1), glow("J", { r: 2, strength: 0.4 }))

const hound = `
  ...........k..k...
  ..........k-k.k-k.
  .==......k---k---k
  =--=...k-----^--k.
  .=--===----------k
  ..k-----------+&&k
  ..k------------kk.
  ..k+----------+k..
  ..k+-kk----kk-+k..`
anim("hound", { outline: "K", fps: 8 },
  hound,
  frame(grid(2, 9, "k+k.k+kk+k.k+k\nkkk.kkkkkk.kkk")),
  frame(grid(1, 9, "k+k..k+kk+k..k+k\nkkk..kkkkkk..kkk")),
  light([8, 4, 4], 1, 0.5), glow("^", { r: 3, strength: 0.7 }))

// The Gloam Warden: a towering hooded wraith with horns and a burning rune.
sprite("boss", { w: 44, h: 58, outline: "$" },
  // robe flaring to a tattered hem
  poly([9, 20, 35, 20, 40, 52, 4, 52], "("),
  (c) => { const r = c.rng(5); for (let x = 4; x < 40; x += 3) { const d = 2 + Math.floor(r() * 5); c.poly([x, 51, x + 3, 51, x + 1.5, 51 + d], "(") } },
  // folds: vertical shading bands that follow the drape
  clip([4, 20, 36, 38], (c) => { for (let x = 8; x < 40; x += 5) c.line(x, 22, x + (x - 22) / 6, 55, ">") }),
  shade([22, 20, 22, 38]), shade([30, 20, 14, 38], 1),
  light([4, 20, 12, 34], 1, 0.5),
  // pauldrons
  ellipse(9, 21, 6, 4, "{"), ellipse(35, 21, 6, 4, "{"), light([7, 19, 3]), light([33, 19, 3]), shade([4, 22, 10, 3]), shade([30, 22, 10, 3]),
  // hood and void face
  ellipse(22, 15, 8, 8, ")"), light([19, 11, 4], 1), shade([24, 16, 6], 1),
  ellipse(22, 16, 5, 5, "$"),
  rect(19, 15, 2, 1, "@"), rect(24, 15, 2, 1, "@"), px(19, 16, "&"), px(24, 16, "&"),
  // horns sweeping up and out from the hood
  ...[-1, 1].map((s) => poly([22 + s * 3, 12, 22 + s * 8, 11, 22 + s * 13, 6, 22 + s * 16, 0, 22 + s * 11, 3, 22 + s * 5, 7].map((v, i) => i % 2 ? v : Math.max(0, Math.min(44, v))), "}")),
  ...[-1, 1].map((s) => poly([22 + s * 6, 10, 22 + s * 8, 11, 22 + s * 13, 6, 22 + s * 16, 0, 22 + s * 12, 6].map((v, i) => i % 2 ? v : Math.max(0, Math.min(44, v))), "{")),
  // chest rune
  hline(18, 30, 9, "%"), vline(22, 26, 9, "%"), px(20, 28, "%"), px(24, 32, "%"), px(24, 28, "%"), px(20, 32, "%"), px(22, 30, "&"),
  glow("@%", { r: 4, strength: 0.6 }))

sprite("dummy", { outline: "k" }, `
  ...~~~~...
  ..~~!~!~..
  ..~~~~~~..
  ...~~~~...
  ////|/////
  ~~~~|~~~~~
  ////|/////
  ...~|~....
  ..~~|~~...
  ..~!|!~...
  ..~~|~~...
  ...~|~....
  ....|.....
  ....|.....
  ...|||....`)

// ============================================================== flora
sprite("_leaf0", "g.\nVg"); sprite("_leaf1", ".z\nzV"); sprite("_leaf2", "VV\n.g")
sprite("_tleaf0", "u.\nUu"); sprite("_tleaf1", ".n\nnU")
sprite("_petal0", "N.\nwN"); sprite("_petal1", ".W\nwW")

// A canopy is a cluster of round blobs; leaves are brushed on, then lit from the upper left.
const canopy = (c, cx, cy, n, spread, rmin, rmax, key, seed, sy = 0.8) => {
  const r = c.rng(seed)
  c.circ(cx, cy, rmax, key)
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = r() * spread
    c.circ(Math.round(cx + Math.cos(a) * d * 1.1), Math.round(cy + Math.sin(a) * d * sy), Math.round(rmin + r() * (rmax - rmin)), key)
  }
}
const trunk = (x, y, h) => [rect(x, y, 3, h, "X"), vline(x, y, h, "j"), vline(x + 2, y, h, "x"), px(x - 1, y + h - 1, "X"), px(x + 3, y + h - 1, "x")]

for (let i = 0; i < 4; i++) {
  sprite("tree_round_" + i, { w: 30, h: 42, outline: "k" },
    ...trunk(13, 26, 16),
    (c) => canopy(c, 15, 16, 6, 6, 5, 9, "g", 10 + i),
    scatter("_leaf*", 2, 2, 26, 26, 70, { on: "g", clip: true, rflip: "x", seed: i }),
    shade([22, 22, 12], 1), shade([24, 26, 8], 1), light([10, 10, 7], 1), light([9, 8, 4], 1),
    scatter("_leaf*", 2, 20, 26, 10, 12, { on: "G", clip: true, rflip: "x", seed: i + 9 }))
  sprite("tree_poplar_" + i, { w: 18, h: 50, outline: "k" },
    ...trunk(7, 38, 12),
    (c) => { c.ellipse(9, 22, 7, 17, "t"); c.ellipse(9, 12 - i, 5, 9, "t") },
    scatter("_tleaf*", 1, 2, 16, 38, 50, { on: "t", clip: true, rflip: "x", seed: i + 3 }),
    shade([12, 18, 8, 22], 1), shade((x, y) => x > 11 && y > 28), light([6, 14, 5], 1), light([5, 10, 3], 1))
  sprite("tree_blossom_" + i, { w: 32, h: 42, outline: "k" },
    ...trunk(14, 25, 17), line(15, 27, 9, 20, "X", 2), line(16, 27, 22, 19, "X", 2),
    (c) => canopy(c, 16, 15, 7, 7, 5, 9, "N", 30 + i, 0.7),
    scatter("_petal*", 2, 2, 28, 26, 60, { on: "N", clip: true, rflip: "x", seed: i + 5 }),
    shade([24, 20, 12], 1), light([11, 9, 7], 1), light([10, 8, 3], 1))
  sprite("tree_teal_" + i, { w: 26, h: 38, outline: "k" },
    ...trunk(11, 24, 14),
    (c) => canopy(c, 13, 14, 5, 5, 4, 8, "u", 50 + i),
    scatter("_tleaf*", 2, 2, 22, 24, 50, { on: "u", clip: true, rflip: "x", seed: i + 7 }),
    shade([20, 20, 10], 1), light([9, 9, 6], 1))
  sprite("tree_dead_" + i, { w: 28, h: 44, outline: "K" }, (c) => {
    const r = c.rng(70 + i)
    const branch = (x, y, a, len, w, d) => {
      const nx = x + Math.cos(a) * len, ny = y + Math.sin(a) * len
      c.line(Math.round(x), Math.round(y), Math.round(nx), Math.round(ny), "f", Math.max(1, Math.round(w)))
      if (d > 0) { branch(nx, ny, a - 0.3 - r() * 0.4, len * 0.7, w * 0.65, d - 1); branch(nx, ny, a + 0.3 + r() * 0.4, len * 0.7, w * 0.65, d - 1) }
    }
    branch(14, 43, -Math.PI / 2 + (r() - 0.5) * 0.2, 14, 4, 3)
  }, light((x, y) => x < 13, 1), shade((x, y) => x > 16, 1))
}
for (let i = 0; i < 3; i++) sprite("bush_" + i, { w: 16, h: 11, outline: "k" },
  (c) => canopy(c, 8, 7, 3, 3, 3, 4, "g", 90 + i, 0.5),
  scatter("_leaf*", 0, 0, 16, 11, 14, { on: "g", clip: true, seed: i }),
  shade([0, 7, 16, 4], 1), light([5, 4, 3], 1), px(4 + i * 3, 3, "w"), px(11 - i, 5, "W"))
sprite("grass_0", { w: 9, h: 8 }, line(1, 7, 1, 3, "g"), line(3, 7, 4, 1, "V"), line(5, 7, 5, 2, "z"), line(7, 7, 8, 3, "g"))
sprite("grass_1", { w: 9, h: 8 }, line(1, 7, 0, 3, "g"), line(3, 7, 3, 1, "V"), line(5, 7, 6, 2, "z"), line(7, 7, 7, 3, "g"))

// ============================================================== props
for (const [name, f1, f2] of [["lantern", "1", "2"], ["lantern_blue", "3", "4"]]) {
  sprite(name, { outline: "k" }, `
  .xxx.
  x${f1}${f2}${f1}x
  x${f2}${f2}${f2}x
  x${f1}${f1}${f1}x
  .xxx.
  ..X..
  ..X..
  ..X..
  ..X..
  ..X..
  ..X..
  ..X..
  ..X..
  .XXX.`, glow(f1 + f2, { r: 3, strength: 0.6 }))
}
sprite("mushroom", { mx: "c", outline: "k" }, `
  ..33
  .343
  3333
  ..II
  ..II`, glow("34", { r: 2, strength: 0.5 }))
const crystal = (name, a, b, c2) => sprite(name, { w: 16, h: 22, outline: "k" },
  poly([6, 21, 8, 1, 10, 21], b), poly([6, 21, 8, 1, 8, 21], c2),
  poly([2, 21, 2, 13, 4, 10, 6, 21], b), poly([2, 21, 2, 13, 4, 10, 4, 21], a),
  poly([10, 21, 12, 9, 14, 12, 14, 21], b), poly([12, 21, 12, 9, 14, 12, 14, 21], a),
  glow(b + c2, { r: 3, strength: 0.5 }))
crystal("crystal", "5", "6", "7")
crystal("crystal_violet", "8", "9", "0")
for (let i = 0; i < 3; i++) sprite("rock_" + i, { w: 12 + i * 2, h: 8 + i, outline: "k" },
  ellipse(6 + i, 5 + i, 6 + i, 4 + i, "Q"), shade([8 + i, 6 + i, 6 + i, 4], 1), light([3 + i, 3, 3], 1),
  line(5 + i, 3, 7 + i, 6, "r"))
for (let i = 0; i < 2; i++) sprite("rock_dark_" + i, { w: 12 + i * 3, h: 9 + i, outline: "K" },
  ellipse(6 + i, 5 + i, 6 + i, 4 + i, "D"), shade([8 + i, 6 + i, 7, 4], 1), light([3 + i, 3, 3], 1))
sprite("sign", { outline: "k" }, `
  ////////////
  /XX/X/XX//\\
  ////////////
  .....|......
  .....|......
  .....|......
  .....|......
  ....|||.....`)
sprite("brazier", { mx: "c", outline: "K" }, `
  ]]]]]
  .{{{{
  ..]]]
  ...]]
  ...]]
  ...]]
  ..]]]
  .]]]]`, light([0, 1, 9, 1], 1))
sprite("shrine", { mx: "c", outline: "k" }, `
  ...ii
  ..iII
  .iiIi
  .iiii
  ..iii
  ..iii
  ..iii
  .iiii
  iiiii`, shade([6, 4, 5, 6], 1))

// ============================================================== the cottage (2x2 iso tiles)
// Canvas origin: the footprint's north corner sits at (40, 50). Walls 24px, roof 22px.
const OX = 40, OY = 50, WH = 24, RH = 22
const P = (wx, wy, z) => [Math.round(OX + (wx - wy) * 16), Math.round(OY + (wx + wy) * 8 - z)]
const quad = (pts, c) => poly(pts.flatMap(([x, y, z]) => P(x, y, z)), c)
sprite("house", { w: 80, h: 104 },
  // chimney behind the roof
  quad([[0.4, 0.5, WH + 10], [0.75, 0.5, WH + 10], [0.75, 0.5, WH + 30], [0.4, 0.5, WH + 30]], "r"),
  quad([[0.75, 0.5, WH + 10], [0.75, 0.85, WH + 10], [0.75, 0.85, WH + 30], [0.75, 0.5, WH + 30]], "q"),
  quad([[0.4, 0.5, WH + 30], [0.75, 0.5, WH + 30], [0.75, 0.85, WH + 30], [0.4, 0.85, WH + 30]], "Q"),
  // back roof plane
  quad([[-0.15, -0.15, WH - 2], [2.15, -0.15, WH - 2], [2.15, 1, WH + RH], [-0.15, 1, WH + RH]], "5"),
  // walls: lit SW face, shaded SE face + gable
  quad([[0, 2, 0], [2, 2, 0], [2, 2, WH], [0, 2, WH]], "W"),
  quad([[2, 2, 0], [2, 0, 0], [2, 0, WH], [2, 2, WH]], "i"),
  quad([[2, 0, WH], [2, 2, WH], [2, 1, WH + RH]], "Q"),
  // stone plinth with offset course joints
  quad([[0, 2, 0], [2, 2, 0], [2, 2, 5], [0, 2, 5]], "Q"),
  quad([[2, 2, 0], [2, 0, 0], [2, 0, 5], [2, 2, 5]], "r"),
  (c) => { for (let u = 0.25; u < 2; u += 0.5) { const [x0, y0] = P(u, 2, 0); c.vline(x0, y0 - 5, 5, "q") } },
  // timber frame
  (c) => {
    const L = (a, b) => { const A = P(...a), B = P(...b); c.line(A[0], A[1], B[0], B[1], "X") }
    for (const u of [0, 1, 2]) L([u, 2, 5], [u, 2, WH])
    for (const v of [0, 2]) L([2, v, 5], [2, v, WH])
    L([0, 2, WH], [2, 2, WH]); L([2, 2, WH], [2, 0, WH]); L([0, 2, 14], [2, 2, 14])
    L([2, 0, WH], [2, 1, WH + RH]); L([2, 2, WH], [2, 1, WH + RH])
    // rain stains under the window sills
    for (const u0 of [0.4, 1.35]) { const [sx, sy] = P(u0 + 0.12, 2, 8); c.vline(sx, sy, 3, "I") }
  },
  // glowing windows + door
  ...[0.3, 1.25].map((u0) => quad([[u0, 2, 9], [u0 + 0.45, 2, 9], [u0 + 0.45, 2, 18], [u0, 2, 18]], "x")),
  ...[0.3, 1.25].map((u0) => quad([[u0 + 0.07, 2, 10], [u0 + 0.38, 2, 10], [u0 + 0.38, 2, 17], [u0 + 0.07, 2, 17]], "1")),
  ...[0.3, 1.25].map((u0) => { const [x, y] = P(u0 + 0.225, 2, 17); return vline(x, y, 7, "j") }),
  quad([[2, 1.35, 0], [2, 0.65, 0], [2, 0.65, 15], [2, 1.35, 15]], "x"),
  quad([[2, 1.27, 0], [2, 0.73, 0], [2, 0.73, 13], [2, 1.27, 13]], "2"),
  (c) => { const [x, y] = P(2, 1, WH + 8); c.rect(x - 1, y - 2, 3, 4, "2") },
  // front roof plane with shingle courses
  quad([[-0.15, 2.15, WH - 2], [2.15, 2.15, WH - 2], [2.15, 1, WH + RH], [-0.15, 1, WH + RH]], "6"),
  (c) => {
    const r0 = P(-0.15, 2.15, WH - 2), r1 = P(2.15, 2.15, WH - 2), r2 = P(2.15, 1, WH + RH), r3 = P(-0.15, 1, WH + RH)
    for (let k = 1; k < 6; k++) {
      const t = k / 6
      c.line(Math.round(r0[0] + (r3[0] - r0[0]) * t), Math.round(r0[1] + (r3[1] - r0[1]) * t), Math.round(r1[0] + (r2[0] - r1[0]) * t), Math.round(r1[1] + (r2[1] - r1[1]) * t), k % 2 ? "5" : "7")
    }
    c.line(r3[0], r3[1], r2[0], r2[1], "7"); c.line(r0[0], r0[1], r1[0], r1[1], "q"); c.line(r1[0], r1[1], r2[0], r2[1], "q")
  },
  glow("12", { r: 4, strength: 0.45 }))
