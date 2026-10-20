'use strict';
// The game world: maps, triggers (logic) and tuning. Edit it visually with editor.html,
// which can publish straight back to this file on GitHub.
const WORLD_DATA = {
 "version": 1,
 "start": "vale",
 "maps": {
  "vale": {
   "name": "Whispering Vale",
   "sub": "A dream drifting above the clouds",
   "theme": "vale",
   "W": 80,
   "H": 80,
   "tiles": [
    "................................................................................",
    "................................................................................",
    ".............g..................................................................",
    "..........gggggg................................................................",
    "..........gggggg....................................ggg.........................",
    ".........ggggggg..................................ggggggggff....................",
    ".........ggggggg...............................gggggggggggggggg.................",
    "..........gggggg..............................gggfffggggggggggggg...............",
    "...........ggggg..............................gggffgggggggggggggff..............",
    "............bb................................ggggggggggggggggggggg.............",
    "............bbg...............................gggggggggggggggfggggg.............",
    "...........gbbggg............................gggggggggppgggggfgggggg............",
    "..........ggbbgggg..........................ggggggggggpppgggggggggggg...........",
    ".........gggbbggggg................fff......gggggggggpppppgggggggggggg..........",
    ".........gggpppggggg.............gffffff....gggggggggpppppgpppgggggggff.........",
    ".........gggppppggggffffff......gfffffff....ggxxxggggppppppxpxxppggggff.........",
    ".........gggggpppgggffffffgg...gfffffffff...gxxxxxgggpppppxxxxxxxpgggff.........",
    "....gggggggggggpppggfffffgggggggfffffffggg..xxxxxxgggppxppxxxxxxxxpggffg........",
    "...gggggggggggggpppgggfffgggggggfffffffggfffxxxxxxgppppxppxxxxxxxxpggfgg........",
    "..ggggggfggggggggpppggggggggfffffffffffffffffxxxxgggppxxppxxxxxxxxxpgffg........",
    "..ffffffpfffffffffgggggfggggffffffffffffffffffxxggggpxxxppxxxxxxxxdpgff.........",
    "..ffffffppffffffffggggfffgggfffffffffffffffgggggggggpxxxppxxxxxxxxxpgff.........",
    "..fffffffpppffffffgggffffgggffffffffffffffffggggggggppppppdxxxxxxxxpgfg.........",
    "..ggfggggfpppffffggfffffffgggpffffffffffffffffggggggpdddddddxxxxxxxgggg.........",
    "...gggggggggpggfffffffffffgggppffffffffffffffggggggggpppdxxxxxxxxxpggfff........",
    "....ggggggggggggffffffffffggggpffffffffffffggggggggggpxxxxxxxxxpxxpggff.........",
    "..........ggggggffffffffffggggggffffffffggggggggggggggpxxxxxxxxxdpggggg.........",
    "..........gggggggfffffffffggggggggffffgpgggggggggggggggpxxxxxxxxxpggff..........",
    "...........gggggggfffffffffggggggfffffppggggggggggggggsgpxxxxxxppgffff..........",
    "............gggggggggfffffggggggggffffppggggggggggggggpsgppppppgggffff..........",
    ".............gggggggggfffggggggggggfffpppggg..gggggggsspggggggggggggg...........",
    "..............ggggggggggggggggggggggfgpppggg...ggggggssggffggggggggg............",
    "................gggggggggggggggg...gggppgggg..ggggggpppffffgggggggg.............",
    ".................gggggggggggggg....gggppggg...ggggppppfffffgggggg...............",
    "...................ggggggggggg.....gggppggg..gggsspppfffffggggg.................",
    ".....................ggggggggg....ggggppgggggggppssfppffggggggg.................",
    "........................gggg......gggpppgggggggssffffpffgggggggg.......ppxxxpp..",
    "..................................gggpppggg.gggsspffffffgggggggggg....pxxxxxxxp.",
    "..................................gggppggg...gggppffffffffffggggggg..pxxxxxxxxp.",
    "..................................ffpppgf....gggppfffffffffffgggggg.pxxxrrrrxxx.",
    "..................................ffpppfff...gggppggggfffffgfpppbbbbbxxxrrrrxxx.",
    "..................................ffpppffffggggpppgggppffgggppppbbbbbxxxrrrrxxx.",
    ".................................fffgggggffggggpppgpppppppppppggggg..xxxrrrrxxp.",
    "................................fffppxxxppggggpppppppggppppppgggggg..pxxxxxxxxp.",
    "................................ffgpxxxxxxpgpppppppggggggpggggggggg...pxxxxxxp..",
    "....................g..........fffpxxxxxxxxppppppgggggggggggggggggg....pxxxxp...",
    "............ggggggggggg........fffpxxxxxxxxpgppgggggggggwwwwgggggggf.....ppp....",
    "..........gggggggggfgggg.......fffpddxxxxxxpggggggggfgwwwwwwwggggggff...........",
    ".........fggggggggfffgggg.....fgffpxxdppxxdpppggggfffwwwwwwwwwggffggg...........",
    "........ggggggggggffffgfgff..ggggfgpddppxxxppppgfffffwwwwwwwwwwffffgg...........",
    ".......gggggggggggffffgggfffgggggggpxxxxxxpgppppfffffwwwwwwwwwwgffgggg..........",
    ".......gggggggggggfffffppfffggfgggfgpxxxppgggppppffffwwwwwwwwwwggggggg..........",
    "......gggggggwwwgggffffpppfffggfffgggpppggggggpppgfffwwwwwwwwwwgggfggg..........",
    "......ggggggwwwwwggffffffpffgggfffgggggggggggggpppggggwwwwwwwwwgggggg...........",
    "......ggggggwwwwwwgfffffffgggggggggggggggggggggpppggggwwwwwwwwwgggggg...........",
    "......fffgggwwwwwwgffffgggggggggggggg..gggggggggppgggggwwwwwwwgggggg............",
    "......ffffggwwwwwwgfffggggggggggggggg..gggggggppppgggggggggggggggggg............",
    ".......fffggwwwwwwggffgggggggggggggggggggggpppppppggggggggggggggggg.............",
    "........ffgggwwwwggggfggggggggggggggggggggppppppggggggggggggggggggg.............",
    "........ggggggggggggff..ggggggggppgggggggppppgggggg.gggggggggggggggg............",
    "..........ggggggggggf...fffggggppppggggggpppfggggg...ggggggggggggggggg..........",
    "..........gggggggggf.....fggggggpppgggggggpggggggg...gggggggggggggggggg.........",
    "............ggggggf...........gggpggggggggggggggggg......gggggggggggggggg.......",
    "...............................ggggggggggfggggggggggg....gggggggfffgggggggg.....",
    "...............................gggggggggfffgggggggggggggggggggggffffggggggg.....",
    "...............................fgggggggggfgpgggggggggggggggggggfffffgggggggg....",
    ".................................gggggggggppppgppppgggggggggffgfffggggggggggg...",
    "..................................ggggggggpppppxxxxppgggggggfffffffgggggggggg...",
    "...................................gggggggggpgpxxxxpppppppggggggfffwwwwwwggggf..",
    "...................................gggggggggggpxxxxppppppppppggggggwwwwwwgggff..",
    "....................................ggggg..ffgpxddxpffggpppppgggggwwwwwwwggffff.",
    "....................................gggg...ffggppppgffggggggggggggwwwwwwwgfffff.",
    ".....................................g.....ffgggggffffgggggggggggggwwwwwwgfffff.",
    "...........................................fffffffffgg.gggggggggggggwwwwwgggfff.",
    ".............................................fffffggg..........gggfggggggggggg..",
    "...............................................ffggg...........ggggggggggggggg..",
    "................................................................gggggggggggggg..",
    ".................................................................gggggggggggg...",
    "....................................................................ggggg.......",
    "................................................................................"
   ],
   "heights": [
    "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "00000000000000000000000000000000000000000000000000006660000000000000000000000000",
    "00000000000000000000000000000000000000000000000000766666666700000000000000000000",
    "00000000000000000000000000000000000000000000000766666444446667700000000000000000",
    "00000000000000000000000000000000000000000000007766644444444466666000000000000000",
    "00000000000000000000000000000000000000000000007664444444444444466600000000000000",
    "00000000000000000000000000000000000000000000006644444444444444444660000000000000",
    "00000000000000000000000000000000000000000000007644444444444444444460000000000000",
    "00000000000000000000000000000000000000000000044449944477444444444446000000000000",
    "00000000000000000200000000000000000000000000004999999477744444444446600000000000",
    "00000000000000000220000000000000000222000000009999999777774444444446660000000000",
    "00000000000000000222000000000000022222220000099999999776664444444444666000000000",
    "0000000000000000000222222200000022220022000099eee9999886664444444444466000000000",
    "000000000000000000002222222200022200000030009eeeee999886664444444444444000000000",
    "00002223332000000000000000022222200000002300eeeeee999884554444444444444600000000",
    "00000000222000000000000000000020000000002230eeeeee999994554444444444440600000000",
    "002000000000000000000000000000000000000000200eeee9999944554444444444444600000000",
    "0020000000000000000000000000000000000000002200ee99994444444444444444444000000000",
    "00200000000000000000000000000000000000000000000000044444444444444444444000000000",
    "00200000000000000000000000000000000000000000000000004444444444444444444000000000",
    "00220000000000000000000000000000000000000000000000004444444444444444444000000000",
    "00022000000000000000000000000000000000000000000000044444444444444444444400000000",
    "00002200000000000000000000000000000000000000000000004444444444444444444000000000",
    "00000000003200000000000000000000000000000000000000004444444444444444444000000000",
    "00000000003200000000000000000000000000000000000000004444444444444444440000000000",
    "00000000000300000000000000000000000000000000000000044434444444444444440000000000",
    "00000000000000000000000000000000000000000000000002224433444444444444440000000000",
    "00000000000000000000000000000000000000000000002222222333444444444444400000000000",
    "00000000000000000000000000000000000000000000000444222222444444444044000000000000",
    "00000000000000000000000000000000000220000000004442222222222244444040000000000000",
    "00000000000000000000000000000000000220000000004222222222222224444000000000000000",
    "00000000000000000000000000000000000220000000022212222222222222200000000000000000",
    "00000000000000000000000000000000002200000000032111222222222222200000000000000000",
    "00000000000000000000000000000000003200000000220110222222222222220000000000000000",
    "00000000000000000000000000000000003200000000220000022222222220000000000000000000",
    "00000000000000000000000000000000003000000000030000002222222220000000000000000000",
    "00000000000000000000000000000000002000000000022000000222222200000000000000000000",
    "00000000000000000000000000000000002000000000020000000000000000000000000000000000",
    "00000000000000000000000000000000002000000002220000000000000000000000000000000000",
    "00000000000000000000000000000000000000000000200000000000000000000000000000000000",
    "00000000000000000000000000000000200000000000000000000000000000000000000000000000",
    "00000000000000000000000000000000200000000000000000000000000000000000000000000000",
    "00000000000000000000200000000002200000000000000000000000000000000000000000000000",
    "00000000000022222222222000000002200000000000000000000000000000000002000000000000",
    "00000000002222222220000000000003000000000000000000000000000000000002200000000000",
    "00000000032200000000000000000000000000000000000000000000000000000002200000000000",
    "00000000322000000000000000000000000000000000000000000000000000000000200000000000",
    "00000003220000000000000000000000000000000000000000000000000000000000020000000000",
    "00000002200000000000000000000000000000000000000000000000000000000000020000000000",
    "00000032000000000000000000000000000000000000000000000000000000000000020000000000",
    "00000032000000000000000000000000000000000000000000000000000000000000000000000000",
    "00000032000000000000000000000000000000000000000000000000000000000000000000000000",
    "00000032000000000000000000000000000000022200000000000000000000000000000000000000",
    "00000032000000000000000000000000000000032200000000000000000000000000000000000000",
    "00000002200000000000000000000000000000332000000000000000000000000000000000000000",
    "00000000220000000000000000000000000000000000000000000000000000000000000000000000",
    "00000000220000000000000000000000000000000000000000002200000000000003000000000000",
    "00000000000000000000000000000000000000000000000000000220000000000002330000000000",
    "00000000000000000000000000000000000000000000000000000220000000000000022000000000",
    "00000000000022200000000000000000000000000000000000200000022200000000002220000000",
    "00000000000000000000000000000000000000000000000000222000022000000000000222200000",
    "00000000000000000000000000000002200000000000000000022222220000000000000222200000",
    "00000000000000000000000000000002200000000000000000000222200000000000000002220000",
    "00000000000000000000000000000000000000000000000000000022000000000000000000022000",
    "00000000000000000000000000000000000000000000000000000000000000000000000000022000",
    "00000000000000000000000000000000000300000000000000000000000000000000000000002300",
    "00000000000000000000000000000000000220000000000000000000000000000000000000000200",
    "00000000000000000000000000000000000022000002000000000000000000000000000000000220",
    "00000000000000000000000000000000000022000002200000000000000000000000000000000020",
    "00000000000000000000000000000000000002000002200000000000000000000000000000000000",
    "00000000000000000000000000000000000000000002200000000000000000000000000000000000",
    "00000000000000000000000000000000000000000000032200000000000000000000000000000000",
    "00000000000000000000000000000000000000000000000322000000000000000000000000000000",
    "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "00000000000000000000000000000000000000000000000000000000000000000000000000000000"
   ],
   "start": {
    "x": 28.8,
    "y": 57.2
   },
   "portals": [
    {
     "x": 56.5,
     "y": 20,
     "to": "ruins",
     "open": true,
     "marker": true,
     "id": "ruins"
    },
    {
     "x": 63.8,
     "y": 19.4,
     "to": "grotto",
     "open": false,
     "marker": false,
     "id": "grotto"
    },
    {
     "x": 57.4,
     "y": 25.8,
     "to": "caldera",
     "open": false,
     "marker": false,
     "id": "caldera"
    },
    {
     "x": 63.8,
     "y": 25.4,
     "to": "spire",
     "open": false,
     "marker": false,
     "id": "spire"
    },
    {
     "x": 49,
     "y": 69.3,
     "to": "pinewood",
     "open": false,
     "marker": false,
     "id": "pine"
    }
   ],
   "objects": [
    {
     "t": "house",
     "x": 20,
     "y": 23
    },
    {
     "t": "tablet",
     "x": 39,
     "y": 47.5,
     "role": "elder_stone",
     "title": "Elder Stone",
     "label": "elder stone",
     "text": "Past the cottage, where the path ends, a light waits."
    },
    {
     "t": "crystal",
     "x": 38.89,
     "y": 50.48
    },
    {
     "t": "crystal",
     "x": 36.19,
     "y": 48.24
    },
    {
     "t": "lantern",
     "x": 41.73,
     "y": 52.02
    },
    {
     "t": "lantern",
     "x": 36.39,
     "y": 52.05
    },
    {
     "t": "lantern",
     "x": 33.86,
     "y": 47.61
    },
    {
     "t": "lantern",
     "x": 41.52,
     "y": 42.89
    },
    {
     "t": "shrine",
     "x": 32,
     "y": 54.2,
     "id": "shrine_start",
     "name": "The Dreamer's bed",
     "label": "checkpoint",
     "warp": true
    },
    {
     "t": "shrine",
     "x": 54,
     "y": 26.6,
     "id": "shrine_terrace",
     "name": "Rift terrace",
     "label": "checkpoint",
     "warp": true
    },
    {
     "t": "chest",
     "x": 21,
     "y": 51,
     "role": "chest",
     "label": "tutorial-chest",
     "tier": "wood",
     "starter": true,
     "loot": "ring"
    },
    {
     "t": "crystal_violet",
     "x": 6,
     "y": 21,
     "role": "gem_cache",
     "label": "secret gem cache"
    },
    {
     "t": "chest",
     "x": 57,
     "y": 36,
     "role": "chest_silver",
     "tier": "silver",
     "label": "ledge-chest"
    },
    {
     "t": "fishspot",
     "x": 18.5,
     "y": 54.5,
     "role": "fishspot",
     "pool": "vale_a"
    },
    {
     "t": "fishspot",
     "x": 52.5,
     "y": 49.5,
     "role": "fishspot",
     "pool": "vale_b"
    },
    {
     "t": "fishspot",
     "x": 69.5,
     "y": 67.5,
     "role": "fishspot",
     "pool": "vale_moon"
    },
    {
     "t": "tablet",
     "x": 25.2,
     "y": 28.4,
     "role": "tablet",
     "label": "lore",
     "title": "Tablet",
     "text": "Four Wardens. One would not wake."
    },
    {
     "t": "lantern_blue",
     "x": 7.3,
     "y": 21.9,
     "label": "lost-lantern"
    },
    {
     "t": "lantern",
     "x": 37.05,
     "y": 67.26
    },
    {
     "t": "lantern",
     "x": 37,
     "y": 60.83
    },
    {
     "t": "lantern",
     "x": 22.44,
     "y": 33.19
    },
    {
     "t": "lantern",
     "x": 22.33,
     "y": 18.9
    },
    {
     "t": "lantern_blue",
     "x": 67.88,
     "y": 22.05
    },
    {
     "t": "lantern_blue",
     "x": 64.23,
     "y": 28.63
    },
    {
     "t": "lantern_blue",
     "x": 52.06,
     "y": 21.49
    },
    {
     "t": "lantern_blue",
     "x": 63.8,
     "y": 15.06
    },
    {
     "t": "lantern",
     "x": 47.36,
     "y": 71.82
    },
    {
     "t": "brazier",
     "x": 46.4,
     "y": 17.1
    },
    {
     "t": "crystal_violet",
     "x": 47.9,
     "y": 17.5
    },
    {
     "t": "crystal",
     "x": 45.7,
     "y": 18.4
    },
    {
     "t": "tablet",
     "x": 47.4,
     "y": 18.9,
     "role": "tablet",
     "label": "lore",
     "title": "The Stone's Crown",
     "text": "The first light was set here, where the dream could see itself."
    },
    {
     "t": "lantern_blue",
     "x": 11.4,
     "y": 6.4
    },
    {
     "t": "lantern_blue",
     "x": 14.7,
     "y": 5.8
    },
    {
     "t": "lantern_blue",
     "x": 13.1,
     "y": 4.3
    },
    {
     "t": "chest",
     "x": 13.2,
     "y": 7.2,
     "role": "chest_silver",
     "tier": "silver",
     "label": "lanterns-chest"
    },
    {
     "t": "brazier",
     "x": 77.94,
     "y": 43.29
    },
    {
     "t": "brazier",
     "x": 71.91,
     "y": 45
    },
    {
     "t": "brazier",
     "x": 70.03,
     "y": 38.74
    },
    {
     "t": "brazier",
     "x": 75.78,
     "y": 37.05
    },
    {
     "t": "lantern_blue",
     "x": 75.49,
     "y": 43.7
    },
    {
     "t": "lantern_blue",
     "x": 71.29,
     "y": 42.51
    },
    {
     "t": "lantern_blue",
     "x": 72.61,
     "y": 38.33
    },
    {
     "t": "lantern_blue",
     "x": 76.89,
     "y": 39.67
    },
    {
     "t": "tablet",
     "x": 72,
     "y": 43.6,
     "role": "tablet",
     "label": "lore",
     "title": "Dream Arena",
     "text": "Pip keeps the score. Later, when the nights are longer."
    },
    {
     "t": "keydoor",
     "x": 13,
     "y": 13.6,
     "role": "keydoor",
     "id": "bridge_lanterns",
     "key": "key_spire",
     "ang": 1.57,
     "len": 2
    },
    {
     "t": "keydoor",
     "x": 64.4,
     "y": 41,
     "role": "keydoor",
     "id": "bridge_arena",
     "key": "key_dream",
     "ang": 0,
     "len": 2
    },
    {
     "t": "keydoor",
     "x": 58.82,
     "y": 69.7,
     "role": "keydoor",
     "id": "gate_moon",
     "key": "key_act4",
     "ang": 0.08,
     "len": 2.2
    },
    {
     "t": "lantern_blue",
     "x": 62.8,
     "y": 65.6
    },
    {
     "t": "lantern_blue",
     "x": 69.4,
     "y": 65.8
    },
    {
     "t": "lantern_blue",
     "x": 65.8,
     "y": 64.4
    },
    {
     "t": "brazier",
     "x": 66.4,
     "y": 66.8
    },
    {
     "t": "tablet",
     "x": 63.4,
     "y": 69.6,
     "role": "tablet",
     "label": "lore",
     "title": "Moon Pond",
     "text": "Pearls rise when the moon is full. Bring a lantern and patience."
    },
    {
     "t": "tree_poplar",
     "x": 18.55,
     "y": 60.04,
     "v": 4
    },
    {
     "t": "tree_poplar",
     "x": 19.3,
     "y": 61.42,
     "v": 2
    },
    {
     "t": "tree_poplar",
     "x": 52.87,
     "y": 4.56,
     "v": 11
    },
    {
     "t": "tree_poplar",
     "x": 66.45,
     "y": 59.2,
     "v": 3
    },
    {
     "t": "tree_poplar",
     "x": 67.23,
     "y": 60.56,
     "v": 6
    },
    {
     "t": "tree_poplar",
     "x": 45.12,
     "y": 13.6,
     "v": 10
    },
    {
     "t": "tree_poplar",
     "x": 44.27,
     "y": 14.39,
     "v": 11
    },
    {
     "t": "tree_poplar",
     "x": 43.5,
     "y": 22.24,
     "v": 5
    },
    {
     "t": "tree_poplar",
     "x": 44.95,
     "y": 22.78,
     "v": 9
    },
    {
     "t": "tree_poplar",
     "x": 19.78,
     "y": 15.77,
     "v": 9
    },
    {
     "t": "tree_poplar",
     "x": 27.53,
     "y": 61.48,
     "v": 3
    },
    {
     "t": "tree_poplar",
     "x": 63.76,
     "y": 7.59,
     "v": 5
    },
    {
     "t": "tree_poplar",
     "x": 62.39,
     "y": 7.95,
     "v": 6
    },
    {
     "t": "tree_poplar",
     "x": 15.92,
     "y": 3.82,
     "v": 7
    },
    {
     "t": "tree_poplar",
     "x": 69.18,
     "y": 28.53,
     "v": 2
    },
    {
     "t": "tree_poplar",
     "x": 68.5,
     "y": 27.33,
     "v": 3
    },
    {
     "t": "tree_poplar",
     "x": 55.9,
     "y": 5.75,
     "v": 8
    },
    {
     "t": "tree_poplar",
     "x": 46.28,
     "y": 39.69,
     "v": 3
    },
    {
     "t": "tree_poplar",
     "x": 41.4,
     "y": 18.94,
     "v": 1
    },
    {
     "t": "tree_poplar",
     "x": 15.49,
     "y": 60.52,
     "v": 9
    },
    {
     "t": "tree_poplar",
     "x": 15.87,
     "y": 59.59,
     "v": 5
    },
    {
     "t": "tree_poplar",
     "x": 14.38,
     "y": 59.79
    },
    {
     "t": "tree_poplar",
     "x": 66.47,
     "y": 38.6,
     "v": 6
    },
    {
     "t": "tree_poplar",
     "x": 33.21,
     "y": 31.97,
     "v": 11
    },
    {
     "t": "tree_poplar",
     "x": 32.24,
     "y": 30.9,
     "v": 6
    },
    {
     "t": "tree_poplar",
     "x": 43.58,
     "y": 25.33,
     "v": 2
    },
    {
     "t": "tree_poplar",
     "x": 42.68,
     "y": 24.86,
     "v": 6
    },
    {
     "t": "tree_poplar",
     "x": 56.73,
     "y": 32.9,
     "v": 6
    },
    {
     "t": "tree_poplar",
     "x": 58.02,
     "y": 32.37,
     "v": 10
    },
    {
     "t": "tree_poplar",
     "x": 45.98,
     "y": 28.86,
     "v": 5
    },
    {
     "t": "tree_poplar",
     "x": 68.46,
     "y": 18.2,
     "v": 8
    },
    {
     "t": "tree_poplar",
     "x": 47.38,
     "y": 75.76,
     "v": 7
    },
    {
     "t": "tree_poplar",
     "x": 39,
     "y": 58.09,
     "v": 8
    },
    {
     "t": "tree_poplar",
     "x": 40.1,
     "y": 57.91,
     "v": 10
    },
    {
     "t": "tree_poplar",
     "x": 38.45,
     "y": 58.94,
     "v": 11
    },
    {
     "t": "tree_poplar",
     "x": 16.25,
     "y": 61.51,
     "v": 3
    },
    {
     "t": "tree_poplar",
     "x": 17.22,
     "y": 60.82,
     "v": 11
    },
    {
     "t": "tree_poplar",
     "x": 69.45,
     "y": 18.51,
     "v": 6
    },
    {
     "t": "tree_poplar",
     "x": 68.28,
     "y": 17.09,
     "v": 9
    },
    {
     "t": "tree_poplar",
     "x": 48.47,
     "y": 26.88,
     "v": 1
    },
    {
     "t": "tree_poplar",
     "x": 48.95,
     "y": 25.54,
     "v": 2
    },
    {
     "t": "tree_poplar",
     "x": 77.67,
     "y": 68.15
    },
    {
     "t": "tree_poplar",
     "x": 76.54,
     "y": 68.69,
     "v": 11
    },
    {
     "t": "tree_poplar",
     "x": 49.3,
     "y": 60.64
    },
    {
     "t": "tree_poplar",
     "x": 45.03,
     "y": 38.02,
     "v": 1
    },
    {
     "t": "tree_poplar",
     "x": 46.2,
     "y": 7.89,
     "v": 9
    },
    {
     "t": "tree_poplar",
     "x": 46.55,
     "y": 8.87,
     "v": 2
    },
    {
     "t": "tree_poplar",
     "x": 21.26,
     "y": 57.13,
     "v": 3
    },
    {
     "t": "tree_poplar",
     "x": 19.97,
     "y": 57.73,
     "v": 2
    },
    {
     "t": "tree_poplar",
     "x": 46.16,
     "y": 36.97,
     "v": 4
    },
    {
     "t": "tree_poplar",
     "x": 46.1,
     "y": 38.09,
     "v": 5
    },
    {
     "t": "tree_poplar",
     "x": 31.22,
     "y": 47.6,
     "v": 10
    },
    {
     "t": "tree_poplar",
     "x": 18.2,
     "y": 32.41,
     "v": 1
    },
    {
     "t": "tree_poplar",
     "x": 11.95,
     "y": 11.91,
     "v": 6
    },
    {
     "t": "tree_poplar",
     "x": 10.63,
     "y": 12.51,
     "v": 7
    },
    {
     "t": "tree_poplar",
     "x": 37.35,
     "y": 13.72,
     "v": 6
    },
    {
     "t": "tree_poplar",
     "x": 67.02,
     "y": 27.21,
     "v": 10
    },
    {
     "t": "tree_poplar",
     "x": 43.36,
     "y": 19.07,
     "v": 7
    },
    {
     "t": "tree_poplar",
     "x": 70.07,
     "y": 25.22,
     "v": 6
    },
    {
     "t": "tree_poplar",
     "x": 78.41,
     "y": 73.74
    },
    {
     "t": "tree_poplar",
     "x": 76.88,
     "y": 73.64,
     "v": 7
    },
    {
     "t": "tree_poplar",
     "x": 3.66,
     "y": 24.96,
     "v": 4
    },
    {
     "t": "tree_poplar",
     "x": 64.33,
     "y": 9.03,
     "v": 7
    },
    {
     "t": "tree_poplar",
     "x": 65.27,
     "y": 42.9,
     "v": 5
    },
    {
     "t": "tree_poplar",
     "x": 66.77,
     "y": 43.22,
     "v": 11
    },
    {
     "t": "tree_poplar",
     "x": 49.22,
     "y": 30.43,
     "v": 5
    },
    {
     "t": "tree_poplar",
     "x": 49.2,
     "y": 31.7
    },
    {
     "t": "tree_poplar",
     "x": 42.34,
     "y": 19.98,
     "v": 6
    },
    {
     "t": "tree_poplar",
     "x": 11.98,
     "y": 27.94,
     "v": 1
    },
    {
     "t": "tree_poplar",
     "x": 13.12,
     "y": 28.6,
     "v": 8
    },
    {
     "t": "tree_poplar",
     "x": 18.62,
     "y": 15.49,
     "v": 2
    },
    {
     "t": "tree_poplar",
     "x": 17.97,
     "y": 14.7,
     "v": 10
    },
    {
     "t": "tree_poplar",
     "x": 13.94,
     "y": 61.61,
     "v": 7
    },
    {
     "t": "tree_poplar",
     "x": 12.64,
     "y": 60.93,
     "v": 2
    },
    {
     "t": "tree_poplar",
     "x": 27.4,
     "y": 16.78,
     "v": 6
    },
    {
     "t": "tree_poplar",
     "x": 29.81,
     "y": 17.79,
     "v": 5
    },
    {
     "t": "tree_poplar",
     "x": 28.62,
     "y": 17.35,
     "v": 1
    },
    {
     "t": "tree_poplar",
     "x": 30.79,
     "y": 18.72,
     "v": 9
    },
    {
     "t": "tree_poplar",
     "x": 11.72,
     "y": 25.72,
     "v": 5
    },
    {
     "t": "tree_poplar",
     "x": 25.71,
     "y": 35.23,
     "v": 6
    },
    {
     "t": "tree_poplar",
     "x": 26.73,
     "y": 35.15,
     "v": 11
    },
    {
     "t": "tree_poplar",
     "x": 52.01,
     "y": 26.77,
     "v": 3
    },
    {
     "t": "tree_poplar",
     "x": 52.95,
     "y": 26.13,
     "v": 6
    },
    {
     "t": "tree_poplar",
     "x": 50.72,
     "y": 26.88,
     "v": 4
    },
    {
     "t": "tree_poplar",
     "x": 46.33,
     "y": 33.08,
     "v": 8
    },
    {
     "t": "tree_poplar",
     "x": 46.85,
     "y": 28.04,
     "v": 9
    },
    {
     "t": "tree_poplar",
     "x": 30.43,
     "y": 48.47,
     "v": 1
    },
    {
     "t": "tree_poplar",
     "x": 29.27,
     "y": 49.01,
     "v": 6
    },
    {
     "t": "tree_poplar",
     "x": 22.35,
     "y": 56.13,
     "v": 9
    },
    {
     "t": "tree_poplar",
     "x": 21.48,
     "y": 55.16,
     "v": 1
    },
    {
     "t": "tree_poplar",
     "x": 21.8,
     "y": 59.61,
     "v": 5
    },
    {
     "t": "tree_poplar",
     "x": 20.66,
     "y": 59.89,
     "v": 11
    },
    {
     "t": "tree_poplar",
     "x": 72.36,
     "y": 76.36,
     "v": 5
    },
    {
     "t": "tree_poplar",
     "x": 72.09,
     "y": 75.37,
     "v": 7
    },
    {
     "t": "tree_poplar",
     "x": 56.71,
     "y": 65.79,
     "v": 2
    },
    {
     "t": "tree_poplar",
     "x": 57.84,
     "y": 65.4,
     "v": 6
    },
    {
     "t": "tree_poplar",
     "x": 27.51,
     "y": 34.02,
     "v": 7
    },
    {
     "t": "tree_poplar",
     "x": 47.23,
     "y": 31.42,
     "v": 6
    },
    {
     "t": "tree_poplar",
     "x": 66.19,
     "y": 10.48,
     "v": 6
    },
    {
     "t": "tree_poplar",
     "x": 66.78,
     "y": 9.67,
     "v": 3
    },
    {
     "t": "tree_poplar",
     "x": 15.5,
     "y": 6.68,
     "v": 5
    },
    {
     "t": "tree_poplar",
     "x": 34.55,
     "y": 30.68,
     "v": 3
    },
    {
     "t": "tree_poplar",
     "x": 43.23,
     "y": 71.21,
     "v": 5
    },
    {
     "t": "tree_poplar",
     "x": 74.58,
     "y": 63.32
    },
    {
     "t": "tree_poplar",
     "x": 74.39,
     "y": 64.46,
     "v": 5
    },
    {
     "t": "tree_poplar",
     "x": 12.76,
     "y": 51.51,
     "v": 1
    },
    {
     "t": "tree_poplar",
     "x": 59,
     "y": 7.51,
     "v": 11
    },
    {
     "t": "tree_poplar",
     "x": 57.89,
     "y": 7.79
    },
    {
     "t": "tree_poplar",
     "x": 12.01,
     "y": 61.97,
     "v": 8
    },
    {
     "t": "tree_poplar",
     "x": 13.74,
     "y": 8.51,
     "v": 10
    },
    {
     "t": "tree_poplar",
     "x": 15.08,
     "y": 7.99,
     "v": 8
    },
    {
     "t": "tree_poplar",
     "x": 43.33,
     "y": 51.83,
     "v": 6
    },
    {
     "t": "tree_poplar",
     "x": 42.67,
     "y": 53.2,
     "v": 7
    },
    {
     "t": "tree_poplar",
     "x": 39.17,
     "y": 56.7,
     "v": 3
    },
    {
     "t": "tree_poplar",
     "x": 32.7,
     "y": 45.46,
     "v": 1
    },
    {
     "t": "tree_poplar",
     "x": 31.46,
     "y": 45.94,
     "v": 3
    },
    {
     "t": "tree_poplar",
     "x": 70.35,
     "y": 75.05,
     "v": 4
    },
    {
     "t": "tree_poplar",
     "x": 70.09,
     "y": 76.48,
     "v": 9
    },
    {
     "t": "tree_poplar",
     "x": 46.64,
     "y": 12.35,
     "v": 6
    },
    {
     "t": "tree_poplar",
     "x": 47.01,
     "y": 11.16,
     "v": 5
    },
    {
     "t": "tree_poplar",
     "x": 63.73,
     "y": 30.59,
     "v": 6
    },
    {
     "t": "tree_poplar",
     "x": 63.7,
     "y": 32.04
    },
    {
     "t": "tree_poplar",
     "x": 65.18,
     "y": 30.52,
     "v": 3
    },
    {
     "t": "tree_poplar",
     "x": 44.65,
     "y": 26.72,
     "v": 7
    },
    {
     "t": "tree_poplar",
     "x": 43.75,
     "y": 27.56,
     "v": 4
    },
    {
     "t": "tree_poplar",
     "x": 45.4,
     "y": 26.02,
     "v": 11
    },
    {
     "t": "tree_poplar",
     "x": 10.09,
     "y": 49.48,
     "v": 8
    },
    {
     "t": "tree_poplar",
     "x": 11.47,
     "y": 48.92,
     "v": 5
    },
    {
     "t": "tree_poplar",
     "x": 10.56,
     "y": 48.25,
     "v": 3
    },
    {
     "t": "tree_poplar",
     "x": 61.83,
     "y": 6.78,
     "v": 3
    },
    {
     "t": "tree_poplar",
     "x": 33.14,
     "y": 14.64
    },
    {
     "t": "tree_poplar",
     "x": 58.28,
     "y": 59.52,
     "v": 1
    },
    {
     "t": "tree_poplar",
     "x": 57.77,
     "y": 58.25,
     "v": 3
    },
    {
     "t": "tree_poplar",
     "x": 51.88,
     "y": 74.62,
     "v": 4
    },
    {
     "t": "tree_poplar",
     "x": 64.99,
     "y": 10.22,
     "v": 8
    },
    {
     "t": "tree_poplar",
     "x": 64.4,
     "y": 37.5,
     "v": 3
    },
    {
     "t": "tree_poplar",
     "x": 32.88,
     "y": 48.18,
     "v": 4
    },
    {
     "t": "tree_poplar",
     "x": 32.08,
     "y": 48.93,
     "v": 9
    },
    {
     "t": "tree_poplar",
     "x": 66.06,
     "y": 14.73,
     "v": 9
    },
    {
     "t": "tree_poplar",
     "x": 28.98,
     "y": 35.27,
     "v": 9
    },
    {
     "t": "tree_poplar",
     "x": 58.07,
     "y": 5.83,
     "v": 4
    },
    {
     "t": "tree_poplar",
     "x": 41.29,
     "y": 20.51,
     "v": 10
    },
    {
     "t": "tree_poplar",
     "x": 68.89,
     "y": 30.95
    },
    {
     "t": "tree_poplar",
     "x": 65.78,
     "y": 8.8,
     "v": 4
    },
    {
     "t": "tree_poplar",
     "x": 69.74,
     "y": 51.21,
     "v": 4
    },
    {
     "t": "tree_poplar",
     "x": 69.85,
     "y": 52.31,
     "v": 1
    },
    {
     "t": "tree_poplar",
     "x": 68.65,
     "y": 50.15,
     "v": 6
    },
    {
     "t": "tree_poplar",
     "x": 67.8,
     "y": 29.59,
     "v": 9
    },
    {
     "t": "tree_poplar",
     "x": 68.97,
     "y": 29.72,
     "v": 8
    },
    {
     "t": "tree_poplar",
     "x": 13.8,
     "y": 49.21,
     "v": 10
    },
    {
     "t": "tree_poplar",
     "x": 14.73,
     "y": 48.79
    },
    {
     "t": "tree_poplar",
     "x": 13.7,
     "y": 50.49,
     "v": 2
    },
    {
     "t": "tree_poplar",
     "x": 46.15,
     "y": 24.03,
     "v": 1
    },
    {
     "t": "tree_poplar",
     "x": 46.61,
     "y": 25.19,
     "v": 10
    },
    {
     "t": "tree_poplar",
     "x": 42.73,
     "y": 26.38,
     "v": 8
    },
    {
     "t": "tree_poplar",
     "x": 51.14,
     "y": 64.66,
     "v": 2
    },
    {
     "t": "tree_teal",
     "x": 56.2,
     "y": 6.72
    },
    {
     "t": "tree_teal",
     "x": 16.48,
     "y": 11.66,
     "v": 2
    },
    {
     "t": "tree_teal",
     "x": 15.21,
     "y": 12.15
    },
    {
     "t": "tree_teal",
     "x": 49.82,
     "y": 59.41,
     "v": 8
    },
    {
     "t": "tree_teal",
     "x": 43.23,
     "y": 32.37,
     "v": 10
    },
    {
     "t": "tree_teal",
     "x": 39.53,
     "y": 17.13,
     "v": 10
    },
    {
     "t": "tree_teal",
     "x": 39.17,
     "y": 15.6,
     "v": 4
    },
    {
     "t": "tree_teal",
     "x": 38.06,
     "y": 17.7,
     "v": 8
    },
    {
     "t": "tree_teal",
     "x": 52.32,
     "y": 55.28,
     "v": 1
    },
    {
     "t": "tree_teal",
     "x": 7.92,
     "y": 17.7,
     "v": 4
    },
    {
     "t": "tree_teal",
     "x": 6.74,
     "y": 18.14,
     "v": 9
    },
    {
     "t": "tree_teal",
     "x": 45.03,
     "y": 12.52,
     "v": 8
    },
    {
     "t": "tree_teal",
     "x": 47.26,
     "y": 29.66,
     "v": 9
    },
    {
     "t": "tree_teal",
     "x": 32.03,
     "y": 65.32,
     "v": 2
    },
    {
     "t": "tree_teal",
     "x": 32.71,
     "y": 64.19,
     "v": 10
    },
    {
     "t": "tree_teal",
     "x": 15.58,
     "y": 48.04,
     "v": 10
    },
    {
     "t": "tree_teal",
     "x": 16.38,
     "y": 46.75,
     "v": 4
    },
    {
     "t": "tree_teal",
     "x": 66.12,
     "y": 12.61
    },
    {
     "t": "tree_teal",
     "x": 67.27,
     "y": 14.12,
     "v": 3
    },
    {
     "t": "tree_teal",
     "x": 61.05,
     "y": 8.51,
     "v": 11
    },
    {
     "t": "tree_teal",
     "x": 65.27,
     "y": 45.28,
     "v": 1
    },
    {
     "t": "tree_teal",
     "x": 64.95,
     "y": 44.14,
     "v": 11
    },
    {
     "t": "tree_teal",
     "x": 66.08,
     "y": 45.95,
     "v": 9
    },
    {
     "t": "tree_teal",
     "x": 63.8,
     "y": 13.25,
     "v": 1
    },
    {
     "t": "tree_teal",
     "x": 61.92,
     "y": 36.64
    },
    {
     "t": "tree_teal",
     "x": 62.41,
     "y": 35.22,
     "v": 5
    },
    {
     "t": "tree_teal",
     "x": 43.91,
     "y": 70.42,
     "v": 10
    },
    {
     "t": "tree_teal",
     "x": 72.88,
     "y": 62.78
    },
    {
     "t": "tree_teal",
     "x": 72.17,
     "y": 63.76,
     "v": 2
    },
    {
     "t": "tree_teal",
     "x": 51.8,
     "y": 57.8,
     "v": 2
    },
    {
     "t": "tree_teal",
     "x": 50.94,
     "y": 58.44,
     "v": 1
    },
    {
     "t": "tree_teal",
     "x": 14.32,
     "y": 11.08,
     "v": 10
    },
    {
     "t": "tree_teal",
     "x": 76.37,
     "y": 72.42,
     "v": 10
    },
    {
     "t": "tree_teal",
     "x": 8.99,
     "y": 17.36,
     "v": 7
    },
    {
     "t": "tree_teal",
     "x": 9.94,
     "y": 16.77
    },
    {
     "t": "tree_teal",
     "x": 7.29,
     "y": 24.61
    },
    {
     "t": "tree_teal",
     "x": 6.09,
     "y": 24.76,
     "v": 10
    },
    {
     "t": "tree_teal",
     "x": 9.35,
     "y": 13.29,
     "v": 9
    },
    {
     "t": "tree_teal",
     "x": 9.77,
     "y": 14.52,
     "v": 8
    },
    {
     "t": "tree_teal",
     "x": 20.23,
     "y": 47.72,
     "v": 1
    },
    {
     "t": "tree_teal",
     "x": 24.6,
     "y": 58.61,
     "v": 6
    },
    {
     "t": "tree_teal",
     "x": 25.4,
     "y": 59.24,
     "v": 7
    },
    {
     "t": "tree_teal",
     "x": 9.09,
     "y": 19.29,
     "v": 11
    },
    {
     "t": "tree_teal",
     "x": 73.12,
     "y": 75.59,
     "v": 4
    },
    {
     "t": "tree_teal",
     "x": 14.54,
     "y": 3.42
    },
    {
     "t": "tree_teal",
     "x": 42.13,
     "y": 31.06,
     "v": 6
    },
    {
     "t": "tree_teal",
     "x": 42.75,
     "y": 29.68,
     "v": 5
    },
    {
     "t": "tree_teal",
     "x": 41.61,
     "y": 32.32,
     "v": 2
    },
    {
     "t": "tree_teal",
     "x": 18.03,
     "y": 62.4,
     "v": 10
    },
    {
     "t": "tree_teal",
     "x": 32.79,
     "y": 50.76,
     "v": 11
    },
    {
     "t": "tree_teal",
     "x": 33.16,
     "y": 49.78,
     "v": 10
    },
    {
     "t": "tree_teal",
     "x": 31.6,
     "y": 50.01,
     "v": 5
    },
    {
     "t": "tree_teal",
     "x": 45.76,
     "y": 74.26,
     "v": 5
    },
    {
     "t": "tree_teal",
     "x": 33.02,
     "y": 30.11,
     "v": 10
    },
    {
     "t": "tree_teal",
     "x": 10.94,
     "y": 59.13,
     "v": 11
    },
    {
     "t": "tree_teal",
     "x": 10.74,
     "y": 60.11,
     "v": 6
    },
    {
     "t": "tree_teal",
     "x": 12.3,
     "y": 59.47,
     "v": 7
    },
    {
     "t": "tree_teal",
     "x": 18.07,
     "y": 46.7,
     "v": 11
    },
    {
     "t": "tree_teal",
     "x": 18.74,
     "y": 48.11,
     "v": 7
    },
    {
     "t": "tree_teal",
     "x": 72.77,
     "y": 77.42,
     "v": 10
    },
    {
     "t": "tree_teal",
     "x": 19.87,
     "y": 54.29,
     "v": 6
    },
    {
     "t": "tree_teal",
     "x": 10.88,
     "y": 61.7,
     "v": 8
    },
    {
     "t": "tree_teal",
     "x": 31.53,
     "y": 16.31,
     "v": 5
    },
    {
     "t": "tree_teal",
     "x": 32.22,
     "y": 17.08,
     "v": 2
    },
    {
     "t": "tree_teal",
     "x": 60.02,
     "y": 12.17,
     "v": 6
    },
    {
     "t": "tree_teal",
     "x": 23.72,
     "y": 55.03,
     "v": 1
    },
    {
     "t": "tree_teal",
     "x": 26.71,
     "y": 33.11,
     "v": 4
    },
    {
     "t": "tree_teal",
     "x": 55.35,
     "y": 72.24,
     "v": 9
    },
    {
     "t": "tree_teal",
     "x": 53.87,
     "y": 71.92
    },
    {
     "t": "tree_teal",
     "x": 48.43,
     "y": 10.58,
     "v": 7
    },
    {
     "t": "tree_teal",
     "x": 37.8,
     "y": 57.26,
     "v": 1
    },
    {
     "t": "tree_teal",
     "x": 71.61,
     "y": 77.21,
     "v": 1
    },
    {
     "t": "tree_teal",
     "x": 33.05,
     "y": 18.16,
     "v": 9
    },
    {
     "t": "tree_teal",
     "x": 71.16,
     "y": 63.79,
     "v": 1
    },
    {
     "t": "tree_teal",
     "x": 12.74,
     "y": 46.28,
     "v": 6
    },
    {
     "t": "tree_teal",
     "x": 12.26,
     "y": 47.35,
     "v": 8
    },
    {
     "t": "tree_teal",
     "x": 70.75,
     "y": 19.55,
     "v": 11
    },
    {
     "t": "tree_teal",
     "x": 59.78,
     "y": 5.55,
     "v": 9
    },
    {
     "t": "tree_teal",
     "x": 44.55,
     "y": 29.95,
     "v": 8
    },
    {
     "t": "tree_teal",
     "x": 69.65,
     "y": 14.04,
     "v": 6
    },
    {
     "t": "tree_teal",
     "x": 68.49,
     "y": 14.26,
     "v": 7
    },
    {
     "t": "tree_teal",
     "x": 63.25,
     "y": 36.16,
     "v": 7
    },
    {
     "t": "tree_teal",
     "x": 63.1,
     "y": 37.36,
     "v": 4
    },
    {
     "t": "tree_teal",
     "x": 60.98,
     "y": 35.92,
     "v": 8
    },
    {
     "t": "tree_teal",
     "x": 41.76,
     "y": 38.6,
     "v": 5
    },
    {
     "t": "tree_teal",
     "x": 48.06,
     "y": 60.29,
     "v": 1
    },
    {
     "t": "tree_teal",
     "x": 29.12,
     "y": 20.6,
     "v": 11
    },
    {
     "t": "tree_teal",
     "x": 55.9,
     "y": 64.48,
     "v": 6
    },
    {
     "t": "tree_teal",
     "x": 11.51,
     "y": 50.01
    },
    {
     "t": "tree_teal",
     "x": 13.24,
     "y": 48.27,
     "v": 3
    },
    {
     "t": "tree_teal",
     "x": 58.49,
     "y": 72.63,
     "v": 5
    },
    {
     "t": "tree_teal",
     "x": 69.87,
     "y": 20.08
    },
    {
     "t": "tree_teal",
     "x": 29.31,
     "y": 33.87,
     "v": 7
    },
    {
     "t": "tree_teal",
     "x": 68.61,
     "y": 19.76,
     "v": 1
    },
    {
     "t": "tree_teal",
     "x": 45.91,
     "y": 34.65,
     "v": 7
    },
    {
     "t": "tree_teal",
     "x": 51.87,
     "y": 27.77
    },
    {
     "t": "tree_teal",
     "x": 66.46,
     "y": 50.55,
     "v": 9
    },
    {
     "t": "tree_teal",
     "x": 67.44,
     "y": 51.42,
     "v": 10
    },
    {
     "t": "tree_teal",
     "x": 16.15,
     "y": 49.23,
     "v": 5
    },
    {
     "t": "tree_teal",
     "x": 14.1,
     "y": 4.51,
     "v": 10
    },
    {
     "t": "tree_teal",
     "x": 41.34,
     "y": 41.6,
     "v": 11
    },
    {
     "t": "tree_teal",
     "x": 20.82,
     "y": 34.17,
     "v": 3
    },
    {
     "t": "tree_teal",
     "x": 31.55,
     "y": 31.65,
     "v": 11
    },
    {
     "t": "tree_teal",
     "x": 51.85,
     "y": 25.57,
     "v": 2
    },
    {
     "t": "tree_teal",
     "x": 50.43,
     "y": 25.57,
     "v": 1
    },
    {
     "t": "tree_teal",
     "x": 40.1,
     "y": 18.42,
     "v": 2
    },
    {
     "t": "tree_teal",
     "x": 67.47,
     "y": 77.63,
     "v": 7
    },
    {
     "t": "tree_teal",
     "x": 66.77,
     "y": 76.85,
     "v": 11
    },
    {
     "t": "tree_teal",
     "x": 55.74,
     "y": 60.53,
     "v": 6
    },
    {
     "t": "tree_teal",
     "x": 10.83,
     "y": 14.48,
     "v": 3
    },
    {
     "t": "tree_teal",
     "x": 30.42,
     "y": 50.86,
     "v": 9
    },
    {
     "t": "tree_teal",
     "x": 23.02,
     "y": 58.62,
     "v": 3
    },
    {
     "t": "tree_teal",
     "x": 67.89,
     "y": 15.55,
     "v": 8
    },
    {
     "t": "tree_teal",
     "x": 69.2,
     "y": 15.03
    },
    {
     "t": "tree_teal",
     "x": 15.08,
     "y": 61.47,
     "v": 8
    },
    {
     "t": "tree_teal",
     "x": 61.41,
     "y": 63.23,
     "v": 2
    },
    {
     "t": "tree_teal",
     "x": 17.49,
     "y": 33.48,
     "v": 9
    },
    {
     "t": "tree_teal",
     "x": 67.38,
     "y": 75.24,
     "v": 8
    },
    {
     "t": "tree_teal",
     "x": 68.72,
     "y": 75.65,
     "v": 6
    },
    {
     "t": "tree_teal",
     "x": 68.64,
     "y": 78.14
    },
    {
     "t": "tree_teal",
     "x": 69.61,
     "y": 78.86,
     "v": 4
    },
    {
     "t": "tree_teal",
     "x": 45.82,
     "y": 27.46,
     "v": 10
    },
    {
     "t": "tree_teal",
     "x": 67.98,
     "y": 48,
     "v": 10
    },
    {
     "t": "tree_teal",
     "x": 53.46,
     "y": 55.34,
     "v": 3
    },
    {
     "t": "tree_teal",
     "x": 77.85,
     "y": 76.13,
     "v": 9
    },
    {
     "t": "tree_teal",
     "x": 78.28,
     "y": 72.47,
     "v": 2
    },
    {
     "t": "tree_teal",
     "x": 18.55,
     "y": 56.39
    },
    {
     "t": "tree_round",
     "x": 65.75,
     "y": 77.94,
     "v": 1
    },
    {
     "t": "tree_round",
     "x": 59.52,
     "y": 59.87,
     "v": 7
    },
    {
     "t": "tree_round",
     "x": 59.11,
     "y": 58.33,
     "v": 10
    },
    {
     "t": "tree_round",
     "x": 37.14,
     "y": 72.72
    },
    {
     "t": "tree_round",
     "x": 64.98,
     "y": 48.42,
     "v": 3
    },
    {
     "t": "tree_round",
     "x": 9.16,
     "y": 59.52,
     "v": 7
    },
    {
     "t": "tree_round",
     "x": 76.25,
     "y": 76.51,
     "v": 6
    },
    {
     "t": "tree_round",
     "x": 64.43,
     "y": 12.09,
     "v": 3
    },
    {
     "t": "tree_round",
     "x": 52.78,
     "y": 46.72,
     "v": 2
    },
    {
     "t": "tree_round",
     "x": 20.93,
     "y": 15.26,
     "v": 4
    },
    {
     "t": "tree_round",
     "x": 38.58,
     "y": 14.01,
     "v": 5
    },
    {
     "t": "tree_round",
     "x": 70.8,
     "y": 26.51
    },
    {
     "t": "tree_round",
     "x": 25.96,
     "y": 16.55,
     "v": 4
    },
    {
     "t": "tree_round",
     "x": 61.98,
     "y": 13.85
    },
    {
     "t": "tree_round",
     "x": 49.86,
     "y": 11.68,
     "v": 5
    },
    {
     "t": "tree_round",
     "x": 68.71,
     "y": 12.47,
     "v": 4
    },
    {
     "t": "tree_round",
     "x": 19.89,
     "y": 32.53,
     "v": 5
    },
    {
     "t": "tree_round",
     "x": 14.45,
     "y": 46.63
    },
    {
     "t": "tree_round",
     "x": 57.77,
     "y": 56.64,
     "v": 11
    },
    {
     "t": "tree_round",
     "x": 43.78,
     "y": 54.23,
     "v": 7
    },
    {
     "t": "tree_round",
     "x": 26.4,
     "y": 60.05,
     "v": 1
    },
    {
     "t": "tree_round",
     "x": 66.62,
     "y": 47.49,
     "v": 5
    },
    {
     "t": "tree_round",
     "x": 9.26,
     "y": 6.71,
     "v": 10
    },
    {
     "t": "tree_round",
     "x": 71.94,
     "y": 17.55,
     "v": 5
    },
    {
     "t": "tree_round",
     "x": 70.66,
     "y": 16.5,
     "v": 4
    },
    {
     "t": "tree_round",
     "x": 51.61,
     "y": 29.74,
     "v": 5
    },
    {
     "t": "tree_round",
     "x": 20.25,
     "y": 45.7
    },
    {
     "t": "tree_round",
     "x": 40.08,
     "y": 69.26,
     "v": 1
    },
    {
     "t": "tree_round",
     "x": 62.54,
     "y": 33.59
    },
    {
     "t": "tree_round",
     "x": 44.68,
     "y": 41.05,
     "v": 5
    },
    {
     "t": "tree_round",
     "x": 58.59,
     "y": 73.93,
     "v": 10
    },
    {
     "t": "tree_round",
     "x": 76.35,
     "y": 70.69,
     "v": 8
    },
    {
     "t": "tree_round",
     "x": 54.54,
     "y": 64.23,
     "v": 1
    },
    {
     "t": "tree_round",
     "x": 40.26,
     "y": 19.76,
     "v": 7
    },
    {
     "t": "tree_round",
     "x": 35.85,
     "y": 30.85,
     "v": 9
    },
    {
     "t": "tree_round",
     "x": 71.05,
     "y": 62.33,
     "v": 10
    },
    {
     "t": "tree_round",
     "x": 65.06,
     "y": 75.41,
     "v": 2
    },
    {
     "t": "tree_round",
     "x": 36.2,
     "y": 56.38
    },
    {
     "t": "tree_round",
     "x": 30.03,
     "y": 29.6,
     "v": 5
    },
    {
     "t": "tree_round",
     "x": 51.65,
     "y": 63.07,
     "v": 4
    },
    {
     "t": "tree_round",
     "x": 70.78,
     "y": 22.02,
     "v": 9
    },
    {
     "t": "tree_round",
     "x": 66.51,
     "y": 53.21,
     "v": 5
    },
    {
     "t": "tree_round",
     "x": 16.75,
     "y": 52.56,
     "v": 2
    },
    {
     "t": "tree_round",
     "x": 11.05,
     "y": 4.44,
     "v": 6
    },
    {
     "t": "tree_round",
     "x": 67.59,
     "y": 56.69,
     "v": 8
    },
    {
     "t": "tree_round",
     "x": 66.02,
     "y": 56.43,
     "v": 3
    },
    {
     "t": "tree_round",
     "x": 8.25,
     "y": 25.92,
     "v": 6
    },
    {
     "t": "tree_round",
     "x": 35.92,
     "y": 33.07,
     "v": 10
    },
    {
     "t": "tree_round",
     "x": 46.71,
     "y": 26.58,
     "v": 10
    },
    {
     "t": "tree_round",
     "x": 47.67,
     "y": 73.92,
     "v": 10
    },
    {
     "t": "tree_round",
     "x": 51.53,
     "y": 56.48,
     "v": 9
    },
    {
     "t": "tree_round",
     "x": 53.22,
     "y": 57.12,
     "v": 6
    },
    {
     "t": "tree_round",
     "x": 66.11,
     "y": 31.38,
     "v": 10
    },
    {
     "t": "tree_round",
     "x": 49.74,
     "y": 63.62,
     "v": 7
    },
    {
     "t": "tree_round",
     "x": 70.3,
     "y": 23.86,
     "v": 10
    },
    {
     "t": "tree_round",
     "x": 24.2,
     "y": 56.39
    },
    {
     "t": "tree_round",
     "x": 66.94,
     "y": 49.37
    },
    {
     "t": "tree_round",
     "x": 68.14,
     "y": 54.93,
     "v": 11
    },
    {
     "t": "tree_round",
     "x": 48.45,
     "y": 8.2,
     "v": 4
    },
    {
     "t": "tree_round",
     "x": 51.73,
     "y": 72.58,
     "v": 4
    },
    {
     "t": "tree_round",
     "x": 49.21,
     "y": 28.17,
     "v": 7
    },
    {
     "t": "tree_round",
     "x": 58.43,
     "y": 62.92,
     "v": 11
    },
    {
     "t": "tree_round",
     "x": 59.65,
     "y": 8.97,
     "v": 3
    },
    {
     "t": "tree_round",
     "x": 19.14,
     "y": 34.72,
     "v": 2
    },
    {
     "t": "tree_round",
     "x": 61.67,
     "y": 31.98,
     "v": 6
    },
    {
     "t": "tree_round",
     "x": 65.06,
     "y": 46.87
    },
    {
     "t": "tree_round",
     "x": 50.05,
     "y": 62.06,
     "v": 5
    },
    {
     "t": "tree_round",
     "x": 5.97,
     "y": 17.02,
     "v": 7
    },
    {
     "t": "tree_round",
     "x": 63.27,
     "y": 10.35,
     "v": 4
    },
    {
     "t": "tree_round",
     "x": 33.48,
     "y": 16.85,
     "v": 2
    },
    {
     "t": "tree_blossom",
     "x": 44.51,
     "y": 42.76
    },
    {
     "t": "tree_blossom",
     "x": 10.38,
     "y": 18.5,
     "v": 10
    },
    {
     "t": "tree_blossom",
     "x": 33.12,
     "y": 28.62,
     "v": 5
    },
    {
     "t": "tree_blossom",
     "x": 43.23,
     "y": 37,
     "v": 8
    },
    {
     "t": "tree_blossom",
     "x": 24.25,
     "y": 16.97,
     "v": 6
    },
    {
     "t": "tree_blossom",
     "x": 8.36,
     "y": 50.53,
     "v": 6
    },
    {
     "t": "tree_blossom",
     "x": 62.26,
     "y": 73.5,
     "v": 10
    },
    {
     "t": "tree_blossom",
     "x": 10.03,
     "y": 26.12,
     "v": 1
    },
    {
     "t": "tree_blossom",
     "x": 6.56,
     "y": 52.25,
     "v": 5
    },
    {
     "t": "tree_blossom",
     "x": 61.04,
     "y": 38.97,
     "v": 4
    },
    {
     "t": "tree_blossom",
     "x": 45.86,
     "y": 55.11,
     "v": 3
    },
    {
     "t": "tree_blossom",
     "x": 23.33,
     "y": 34.42,
     "v": 8
    },
    {
     "t": "tree_blossom",
     "x": 14.18,
     "y": 22.87,
     "v": 8
    },
    {
     "t": "tree_blossom",
     "x": 56.08,
     "y": 45.4,
     "v": 10
    },
    {
     "t": "tree_blossom",
     "x": 49.51,
     "y": 74.23,
     "v": 8
    },
    {
     "t": "tree_blossom",
     "x": 26.54,
     "y": 18.34,
     "v": 11
    },
    {
     "t": "tree_blossom",
     "x": 68.44,
     "y": 52.92,
     "v": 6
    },
    {
     "t": "tree_blossom",
     "x": 45.11,
     "y": 71.72,
     "v": 2
    },
    {
     "t": "tree_blossom",
     "x": 48.21,
     "y": 65.27,
     "v": 2
    },
    {
     "t": "tree_blossom",
     "x": 63.59,
     "y": 51.44,
     "v": 1
    },
    {
     "t": "tree_blossom",
     "x": 72.77,
     "y": 66.29,
     "v": 2
    },
    {
     "t": "tree_blossom",
     "x": 14.48,
     "y": 20,
     "v": 6
    },
    {
     "t": "tree_blossom",
     "x": 13.65,
     "y": 30.91,
     "v": 11
    },
    {
     "t": "tree_blossom",
     "x": 56.31,
     "y": 40.6,
     "v": 4
    },
    {
     "t": "tree_blossom",
     "x": 40.57,
     "y": 70.9,
     "v": 7
    },
    {
     "t": "tree_blossom",
     "x": 33.78,
     "y": 66.54,
     "v": 2
    },
    {
     "t": "tree_blossom",
     "x": 35.25,
     "y": 14.02,
     "v": 10
    },
    {
     "t": "tree_blossom",
     "x": 41.85,
     "y": 40.25,
     "v": 10
    },
    {
     "t": "tree_blossom",
     "x": 41.87,
     "y": 57.2,
     "v": 6
    },
    {
     "t": "tree_blossom",
     "x": 75.41,
     "y": 73.88
    },
    {
     "t": "tree_blossom",
     "x": 20.1,
     "y": 17.14,
     "v": 2
    },
    {
     "t": "tree_blossom",
     "x": 53.98,
     "y": 58.71,
     "v": 9
    },
    {
     "t": "tree_blossom",
     "x": 31.74,
     "y": 27.36,
     "v": 2
    },
    {
     "t": "tree_blossom",
     "x": 34.37,
     "y": 58.32,
     "v": 10
    },
    {
     "t": "tree_blossom",
     "x": 63.3,
     "y": 45.58,
     "v": 11
    },
    {
     "t": "tree_blossom",
     "x": 28.79,
     "y": 60.28,
     "v": 2
    },
    {
     "t": "tree_blossom",
     "x": 59.81,
     "y": 45.21,
     "v": 6
    },
    {
     "t": "tree_blossom",
     "x": 34.56,
     "y": 53.8,
     "v": 6
    },
    {
     "t": "tree_blossom",
     "x": 65.99,
     "y": 29.17
    },
    {
     "t": "tree_blossom",
     "x": 39.84,
     "y": 40.99
    },
    {
     "t": "tree_blossom",
     "x": 53.24,
     "y": 73.82,
     "v": 9
    },
    {
     "t": "tree_blossom",
     "x": 56.72,
     "y": 59.31,
     "v": 2
    },
    {
     "t": "tree_blossom",
     "x": 61.56,
     "y": 10.6,
     "v": 2
    },
    {
     "t": "tree_blossom",
     "x": 17.31,
     "y": 59.21,
     "v": 11
    },
    {
     "t": "tree_blossom",
     "x": 27.36,
     "y": 36.57,
     "v": 11
    },
    {
     "t": "bush",
     "x": 9.76,
     "y": 23.62,
     "v": 2,
     "f": 1
    },
    {
     "t": "bush",
     "x": 59.97,
     "y": 63.89
    },
    {
     "t": "bush",
     "x": 50.46,
     "y": 72.14,
     "v": 2,
     "f": 1
    },
    {
     "t": "bush",
     "x": 36.15,
     "y": 54.12,
     "v": 2
    },
    {
     "t": "bush",
     "x": 74.75,
     "y": 69.09,
     "v": 1,
     "f": 1
    },
    {
     "t": "bush",
     "x": 12.39,
     "y": 3.63,
     "f": 1
    },
    {
     "t": "bush",
     "x": 8.8,
     "y": 56.53,
     "f": 1
    },
    {
     "t": "bush",
     "x": 9.71,
     "y": 57.65,
     "v": 1
    },
    {
     "t": "bush",
     "x": 29.79,
     "y": 50.03
    },
    {
     "t": "bush",
     "x": 9.87,
     "y": 52.9,
     "v": 2
    },
    {
     "t": "bush",
     "x": 28.85,
     "y": 50.02,
     "v": 1,
     "f": 1
    },
    {
     "t": "bush",
     "x": 34.98,
     "y": 29.39,
     "v": 2
    },
    {
     "t": "bush",
     "x": 43.35,
     "y": 50.58,
     "v": 2
    },
    {
     "t": "bush",
     "x": 56.88,
     "y": 5.07,
     "v": 1
    },
    {
     "t": "bush",
     "x": 36.78,
     "y": 70.83,
     "v": 2,
     "f": 1
    },
    {
     "t": "bush",
     "x": 36.9,
     "y": 31.61,
     "v": 1
    },
    {
     "t": "bush",
     "x": 69.27,
     "y": 21.2,
     "f": 1
    },
    {
     "t": "bush",
     "x": 38.16,
     "y": 70.4
    },
    {
     "t": "bush",
     "x": 37.55,
     "y": 69.62,
     "v": 1,
     "f": 1
    },
    {
     "t": "bush",
     "x": 27.89,
     "y": 18.04,
     "f": 1
    },
    {
     "t": "bush",
     "x": 67.22,
     "y": 30.47,
     "v": 2,
     "f": 1
    },
    {
     "t": "bush",
     "x": 61.19,
     "y": 37.39,
     "f": 1
    },
    {
     "t": "bush",
     "x": 59.38,
     "y": 35.09,
     "v": 2
    },
    {
     "t": "bush",
     "x": 36.69,
     "y": 35.48,
     "v": 2
    },
    {
     "t": "bush",
     "x": 52.5,
     "y": 70.2
    },
    {
     "t": "bush",
     "x": 44.05,
     "y": 69.32,
     "f": 1
    },
    {
     "t": "bush",
     "x": 37.31,
     "y": 53.74,
     "f": 1
    },
    {
     "t": "bush",
     "x": 59.77,
     "y": 73.33
    },
    {
     "t": "bush",
     "x": 61.88,
     "y": 71.49,
     "v": 1,
     "f": 1
    },
    {
     "t": "bush",
     "x": 18.57,
     "y": 16.59,
     "v": 2
    },
    {
     "t": "bush",
     "x": 59.67,
     "y": 31.93,
     "v": 2
    },
    {
     "t": "bush",
     "x": 54.96,
     "y": 4.23
    },
    {
     "t": "bush",
     "x": 10.33,
     "y": 15.89,
     "v": 1,
     "f": 1
    },
    {
     "t": "bush",
     "x": 58.46,
     "y": 13.4
    },
    {
     "t": "bush",
     "x": 68.57,
     "y": 51.25,
     "v": 1
    },
    {
     "t": "bush",
     "x": 46.68,
     "y": 35.79,
     "f": 1
    },
    {
     "t": "bush",
     "x": 41.13,
     "y": 30.17,
     "f": 1
    },
    {
     "t": "bush",
     "x": 50.56,
     "y": 28.75,
     "v": 2,
     "f": 1
    },
    {
     "t": "bush",
     "x": 74.61,
     "y": 71.68,
     "v": 2,
     "f": 1
    },
    {
     "t": "bush",
     "x": 74.87,
     "y": 70.77
    },
    {
     "t": "bush",
     "x": 64.6,
     "y": 39.49,
     "v": 1
    },
    {
     "t": "bush",
     "x": 17.63,
     "y": 12.32,
     "v": 2
    },
    {
     "t": "bush",
     "x": 11.97,
     "y": 21.45,
     "v": 1,
     "f": 1
    },
    {
     "t": "bush",
     "x": 31.77,
     "y": 28.98,
     "v": 1,
     "f": 1
    },
    {
     "t": "bush",
     "x": 51.61,
     "y": 47.27,
     "v": 1
    },
    {
     "t": "bush",
     "x": 31.36,
     "y": 19.52,
     "f": 1
    },
    {
     "t": "bush",
     "x": 53.85,
     "y": 65.33,
     "v": 2
    },
    {
     "t": "bush",
     "x": 40.17,
     "y": 55.36,
     "f": 1
    },
    {
     "t": "bush",
     "x": 36.56,
     "y": 14.95,
     "v": 1
    },
    {
     "t": "bush",
     "x": 53.77,
     "y": 66.5
    },
    {
     "t": "bush",
     "x": 12.43,
     "y": 17.06
    },
    {
     "t": "bush",
     "x": 70.44,
     "y": 15.06,
     "v": 2,
     "f": 1
    },
    {
     "t": "bush",
     "x": 2.88,
     "y": 23.16,
     "v": 1
    },
    {
     "t": "bush",
     "x": 43.13,
     "y": 69.87,
     "v": 1
    },
    {
     "t": "bush",
     "x": 16.29,
     "y": 32.53,
     "v": 2
    },
    {
     "t": "bush",
     "x": 34.95,
     "y": 41.77,
     "v": 1,
     "f": 1
    },
    {
     "t": "bush",
     "x": 33.5,
     "y": 63.38,
     "v": 2,
     "f": 1
    },
    {
     "t": "bush",
     "x": 22.43,
     "y": 47.1,
     "v": 1
    },
    {
     "t": "bush",
     "x": 26.26,
     "y": 61.51
    },
    {
     "t": "bush",
     "x": 66.21,
     "y": 44.24,
     "v": 1,
     "f": 1
    },
    {
     "t": "bush",
     "x": 35,
     "y": 39.35,
     "v": 2,
     "f": 1
    },
    {
     "t": "bush",
     "x": 24.66,
     "y": 36.97,
     "v": 2
    },
    {
     "t": "bush",
     "x": 5.18,
     "y": 24.5,
     "v": 2
    },
    {
     "t": "bush",
     "x": 69.33,
     "y": 60.63,
     "v": 1,
     "f": 1
    },
    {
     "t": "bush",
     "x": 68.72,
     "y": 61.3,
     "v": 2
    },
    {
     "t": "bush",
     "x": 12.57,
     "y": 26.2,
     "v": 1,
     "f": 1
    },
    {
     "t": "bush",
     "x": 29.76,
     "y": 31.13,
     "v": 2
    },
    {
     "t": "bush",
     "x": 12.45,
     "y": 16.03,
     "v": 2,
     "f": 1
    },
    {
     "t": "bush",
     "x": 66.86,
     "y": 58.19,
     "f": 1
    },
    {
     "t": "bush",
     "x": 49.76,
     "y": 46.22
    },
    {
     "t": "bush",
     "x": 45.29,
     "y": 35.77,
     "v": 2,
     "f": 1
    },
    {
     "t": "bush",
     "x": 60.87,
     "y": 6.55,
     "v": 1,
     "f": 1
    },
    {
     "t": "bush",
     "x": 54.5,
     "y": 60.42,
     "v": 2,
     "f": 1
    },
    {
     "t": "bush",
     "x": 56.6,
     "y": 29.81,
     "f": 1
    },
    {
     "t": "bush",
     "x": 44.3,
     "y": 61.93
    },
    {
     "t": "bush",
     "x": 22.01,
     "y": 47.96,
     "v": 2,
     "f": 1
    },
    {
     "t": "bush",
     "x": 49.73,
     "y": 7.96,
     "f": 1
    },
    {
     "t": "bush",
     "x": 48.65,
     "y": 32.94,
     "f": 1
    },
    {
     "t": "bush",
     "x": 40.33,
     "y": 39.7,
     "v": 2
    },
    {
     "t": "bush",
     "x": 23.8,
     "y": 48.58
    },
    {
     "t": "bush",
     "x": 23.82,
     "y": 47.59,
     "v": 2
    },
    {
     "t": "bush",
     "x": 52.97,
     "y": 63.77,
     "v": 1
    },
    {
     "t": "bush",
     "x": 31.66,
     "y": 30.15,
     "f": 1
    },
    {
     "t": "bush",
     "x": 64.08,
     "y": 74.06,
     "v": 2
    },
    {
     "t": "bush",
     "x": 45.45,
     "y": 73.04,
     "v": 2
    },
    {
     "t": "bush",
     "x": 33.68,
     "y": 45.79,
     "v": 2
    },
    {
     "t": "bush",
     "x": 49.36,
     "y": 51.74,
     "v": 2,
     "f": 1
    },
    {
     "t": "bush",
     "x": 45.02,
     "y": 34.11,
     "v": 1,
     "f": 1
    },
    {
     "t": "bush",
     "x": 32.98,
     "y": 19.76,
     "v": 1
    },
    {
     "t": "bush",
     "x": 17.01,
     "y": 62.73,
     "f": 1
    },
    {
     "t": "bush",
     "x": 42.38,
     "y": 54.9,
     "v": 2
    },
    {
     "t": "bush",
     "x": 2.95,
     "y": 19.17
    },
    {
     "t": "bush",
     "x": 3.42,
     "y": 20,
     "v": 1,
     "f": 1
    },
    {
     "t": "bush",
     "x": 16.61,
     "y": 15.68
    },
    {
     "t": "bush",
     "x": 55.56,
     "y": 67.12,
     "v": 1,
     "f": 1
    },
    {
     "t": "bush",
     "x": 15.95,
     "y": 13.47,
     "v": 1,
     "f": 1
    },
    {
     "t": "bush",
     "x": 64.79,
     "y": 7.15,
     "v": 2
    },
    {
     "t": "bush",
     "x": 6.4,
     "y": 56.81,
     "v": 1
    },
    {
     "t": "bush",
     "x": 54.05,
     "y": 40.5,
     "v": 2,
     "f": 1
    },
    {
     "t": "bush",
     "x": 22.19,
     "y": 35.15
    },
    {
     "t": "bush",
     "x": 40.45,
     "y": 37.09,
     "f": 1
    },
    {
     "t": "bush",
     "x": 63.36,
     "y": 8.81,
     "f": 1
    },
    {
     "t": "bush",
     "x": 28.01,
     "y": 35.34,
     "v": 1,
     "f": 1
    },
    {
     "t": "bush",
     "x": 47.32,
     "y": 7.51,
     "v": 1
    },
    {
     "t": "bush",
     "x": 7.55,
     "y": 19.81,
     "v": 1
    },
    {
     "t": "bush",
     "x": 12.39,
     "y": 6.27,
     "v": 1
    },
    {
     "t": "bush",
     "x": 62.72,
     "y": 6.32,
     "f": 1
    },
    {
     "t": "bush",
     "x": 54.78,
     "y": 44.06
    },
    {
     "t": "rock",
     "x": 28.81,
     "y": 32.24,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 11.09,
     "y": 55.98
    },
    {
     "t": "rock",
     "x": 49.03,
     "y": 49.24,
     "v": 2
    },
    {
     "t": "rock",
     "x": 58.74,
     "y": 40.23,
     "v": 2
    },
    {
     "t": "rock",
     "x": 78.88,
     "y": 70.38,
     "v": 1
    },
    {
     "t": "rock",
     "x": 74.59,
     "y": 77.74
    },
    {
     "t": "rock",
     "x": 54.27,
     "y": 45.72
    },
    {
     "t": "rock",
     "x": 52.47,
     "y": 39.46,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 3.96,
     "y": 21.58,
     "f": 1
    },
    {
     "t": "rock",
     "x": 64.53,
     "y": 59.54,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 17.16,
     "y": 50.69,
     "f": 1
    },
    {
     "t": "rock",
     "x": 63.75,
     "y": 54.78,
     "v": 2
    },
    {
     "t": "rock",
     "x": 16.85,
     "y": 20.79,
     "v": 2
    },
    {
     "t": "rock",
     "x": 8.25,
     "y": 52.52,
     "v": 2
    },
    {
     "t": "rock",
     "x": 56.27,
     "y": 31.44,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 60.73,
     "y": 72.22
    },
    {
     "t": "rock",
     "x": 34.08,
     "y": 42.61,
     "v": 1
    },
    {
     "t": "rock",
     "x": 34.98,
     "y": 16.26,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 35.04,
     "y": 68.66,
     "v": 1
    },
    {
     "t": "rock",
     "x": 61.96,
     "y": 47.14,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 15.63,
     "y": 30.18,
     "v": 2
    },
    {
     "t": "rock",
     "x": 74.21,
     "y": 67.8,
     "v": 1
    },
    {
     "t": "rock",
     "x": 61.07,
     "y": 58.64,
     "v": 1
    },
    {
     "t": "rock",
     "x": 53.87,
     "y": 6.72,
     "v": 1,
     "f": 1
    },
    {
     "t": "mushroom",
     "x": 41.34,
     "y": 26.79
    },
    {
     "t": "mushroom",
     "x": 51.94,
     "y": 51.51
    },
    {
     "t": "mushroom",
     "x": 12.18,
     "y": 8.22
    },
    {
     "t": "mushroom",
     "x": 12.3,
     "y": 7.59
    },
    {
     "t": "mushroom",
     "x": 67.69,
     "y": 12.74
    },
    {
     "t": "mushroom",
     "x": 66.98,
     "y": 12.8
    },
    {
     "t": "mushroom",
     "x": 66.68,
     "y": 20.33
    },
    {
     "t": "mushroom",
     "x": 61.87,
     "y": 37.9
    },
    {
     "t": "mushroom",
     "x": 9.39,
     "y": 24.64
    },
    {
     "t": "mushroom",
     "x": 53.28,
     "y": 20.83
    },
    {
     "t": "mushroom",
     "x": 38.11,
     "y": 67.2
    },
    {
     "t": "mushroom",
     "x": 37.73,
     "y": 67.73
    },
    {
     "t": "mushroom",
     "x": 10.65,
     "y": 24.11
    },
    {
     "t": "mushroom",
     "x": 51.69,
     "y": 20.13
    },
    {
     "t": "mushroom",
     "x": 40.63,
     "y": 32.22
    },
    {
     "t": "mushroom",
     "x": 74.66,
     "y": 38.57
    },
    {
     "t": "mushroom",
     "x": 74.09,
     "y": 38.1
    },
    {
     "t": "mushroom",
     "x": 4.12,
     "y": 19.06
    },
    {
     "t": "mushroom",
     "x": 10.96,
     "y": 13.68
    },
    {
     "t": "mushroom",
     "x": 34.31,
     "y": 56.81
    },
    {
     "t": "mushroom",
     "x": 38.71,
     "y": 34.04
    },
    {
     "t": "mushroom",
     "x": 39.32,
     "y": 33.88
    },
    {
     "t": "mushroom",
     "x": 38.28,
     "y": 33.56
    },
    {
     "t": "mushroom",
     "x": 38.02,
     "y": 34.23
    },
    {
     "t": "mushroom",
     "x": 44.25,
     "y": 20.62
    },
    {
     "t": "mushroom",
     "x": 43.89,
     "y": 21.3
    },
    {
     "t": "mushroom",
     "x": 44.51,
     "y": 20.07
    },
    {
     "t": "mushroom",
     "x": 22.3,
     "y": 32.55
    },
    {
     "t": "mushroom",
     "x": 66.11,
     "y": 23.41
    },
    {
     "t": "mushroom",
     "x": 65.59,
     "y": 23.1
    },
    {
     "t": "mushroom",
     "x": 4.15,
     "y": 25.93
    },
    {
     "t": "mushroom",
     "x": 57.53,
     "y": 18.51
    },
    {
     "t": "mushroom",
     "x": 25.45,
     "y": 31.72
    },
    {
     "t": "mushroom",
     "x": 64.28,
     "y": 23.17
    },
    {
     "t": "mushroom",
     "x": 32.91,
     "y": 57.88
    },
    {
     "t": "mushroom",
     "x": 33.05,
     "y": 58.55
    },
    {
     "t": "mushroom",
     "x": 8.62,
     "y": 24.15
    },
    {
     "t": "mushroom",
     "x": 66.09,
     "y": 42.31
    },
    {
     "t": "mushroom",
     "x": 41.95,
     "y": 24.16
    },
    {
     "t": "mushroom",
     "x": 41.27,
     "y": 23.96
    },
    {
     "t": "mushroom",
     "x": 41.64,
     "y": 24.71
    },
    {
     "t": "mushroom",
     "x": 42.22,
     "y": 23.48
    },
    {
     "t": "mushroom",
     "x": 50.35,
     "y": 24.5
    },
    {
     "t": "mushroom",
     "x": 51.04,
     "y": 17.37
    },
    {
     "t": "mushroom",
     "x": 51.55,
     "y": 16.8
    },
    {
     "t": "mushroom",
     "x": 34.5,
     "y": 15.18
    },
    {
     "t": "mushroom",
     "x": 33.46,
     "y": 60.97
    },
    {
     "t": "mushroom",
     "x": 33.74,
     "y": 60.31
    },
    {
     "t": "mushroom",
     "x": 72.24,
     "y": 39.14
    },
    {
     "t": "mushroom",
     "x": 33.09,
     "y": 64.92
    },
    {
     "t": "mushroom",
     "x": 48.15,
     "y": 21.87
    },
    {
     "t": "mushroom",
     "x": 47.48,
     "y": 21.71
    },
    {
     "t": "mushroom",
     "x": 48.18,
     "y": 21.07
    },
    {
     "t": "mushroom",
     "x": 37.73,
     "y": 61.2
    },
    {
     "t": "mushroom",
     "x": 27.96,
     "y": 33.33
    },
    {
     "t": "mushroom",
     "x": 49.98,
     "y": 49.87
    },
    {
     "t": "mushroom",
     "x": 69.68,
     "y": 26.14
    },
    {
     "t": "mushroom",
     "x": 41.62,
     "y": 65.22
    },
    {
     "t": "mushroom",
     "x": 40.93,
     "y": 65.56
    },
    {
     "t": "mushroom",
     "x": 19.04,
     "y": 58.47
    },
    {
     "t": "mushroom",
     "x": 18.84,
     "y": 59.04
    },
    {
     "t": "mushroom",
     "x": 60.69,
     "y": 31.34
    },
    {
     "t": "mushroom",
     "x": 5.86,
     "y": 22.14
    },
    {
     "t": "mushroom",
     "x": 6.43,
     "y": 22.57
    },
    {
     "t": "mushroom",
     "x": 76.57,
     "y": 37.05
    },
    {
     "t": "mushroom",
     "x": 42.52,
     "y": 22.71
    },
    {
     "t": "mushroom",
     "x": 48.21,
     "y": 24.55
    },
    {
     "t": "mushroom",
     "x": 47.93,
     "y": 25.13
    },
    {
     "t": "mushroom",
     "x": 42.75,
     "y": 27.57
    },
    {
     "t": "mushroom",
     "x": 51.14,
     "y": 75.25
    },
    {
     "t": "mushroom",
     "x": 51.68,
     "y": 75.53
    },
    {
     "t": "mushroom",
     "x": 66.77,
     "y": 24.66
    },
    {
     "t": "mushroom",
     "x": 66.12,
     "y": 24.73
    },
    {
     "t": "mushroom",
     "x": 18.62,
     "y": 17.63
    },
    {
     "t": "mushroom",
     "x": 11.77,
     "y": 24.43
    },
    {
     "t": "mushroom",
     "x": 11.22,
     "y": 11.16
    },
    {
     "t": "mushroom",
     "x": 28.29,
     "y": 25.36
    },
    {
     "t": "mushroom",
     "x": 29.05,
     "y": 25.54
    },
    {
     "t": "mushroom",
     "x": 4.86,
     "y": 19.71
    },
    {
     "t": "mushroom",
     "x": 4.8,
     "y": 19.01
    },
    {
     "t": "mushroom",
     "x": 57.94,
     "y": 38.39
    },
    {
     "t": "mushroom",
     "x": 57.16,
     "y": 38.29
    },
    {
     "t": "mushroom",
     "x": 7.19,
     "y": 25.75
    },
    {
     "t": "mushroom",
     "x": 58.51,
     "y": 42.78
    },
    {
     "t": "grass",
     "x": 16.21,
     "y": 19.53
    },
    {
     "t": "grass",
     "x": 17.2,
     "y": 19.5,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 23.33,
     "y": 17.79,
     "v": 1
    },
    {
     "t": "grass",
     "x": 23.69,
     "y": 18.22,
     "f": 1
    },
    {
     "t": "grass",
     "x": 36.33,
     "y": 55.1,
     "v": 1
    },
    {
     "t": "grass",
     "x": 31.93,
     "y": 24.31,
     "f": 1
    },
    {
     "t": "grass",
     "x": 31.6,
     "y": 23.67,
     "v": 1
    },
    {
     "t": "grass",
     "x": 65.52,
     "y": 51.93
    },
    {
     "t": "grass",
     "x": 67.04,
     "y": 52.14,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 33.7,
     "y": 18.84
    },
    {
     "t": "grass",
     "x": 76.35,
     "y": 42.34,
     "f": 1
    },
    {
     "t": "grass",
     "x": 77.22,
     "y": 42.59,
     "v": 1
    },
    {
     "t": "grass",
     "x": 77.22,
     "y": 43.23
    },
    {
     "t": "grass",
     "x": 32.88,
     "y": 43.36,
     "v": 1
    },
    {
     "t": "grass",
     "x": 64.8,
     "y": 53.57,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 65.54,
     "y": 54.31
    },
    {
     "t": "grass",
     "x": 64.13,
     "y": 53.34
    },
    {
     "t": "grass",
     "x": 6.99,
     "y": 22.71,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 54.47,
     "y": 55.2,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 35.19,
     "y": 42.63,
     "f": 1
    },
    {
     "t": "grass",
     "x": 35.34,
     "y": 43.56,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 37.05,
     "y": 21.98
    },
    {
     "t": "grass",
     "x": 36.76,
     "y": 22.41,
     "v": 1
    },
    {
     "t": "grass",
     "x": 37.3,
     "y": 21.16,
     "v": 1
    },
    {
     "t": "grass",
     "x": 5.83,
     "y": 18.13,
     "v": 1
    },
    {
     "t": "grass",
     "x": 55.33,
     "y": 8.9
    },
    {
     "t": "grass",
     "x": 56.33,
     "y": 8.21,
     "v": 1
    },
    {
     "t": "grass",
     "x": 54.19,
     "y": 8.32,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 47.79,
     "y": 41.85,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 47.34,
     "y": 41.05,
     "f": 1
    },
    {
     "t": "grass",
     "x": 46.57,
     "y": 41.78,
     "v": 1
    },
    {
     "t": "grass",
     "x": 48.07,
     "y": 40.6,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 48.34,
     "y": 41.54,
     "f": 1
    },
    {
     "t": "grass",
     "x": 45.48,
     "y": 56.53,
     "v": 1
    },
    {
     "t": "grass",
     "x": 49.61,
     "y": 38.3,
     "f": 1
    },
    {
     "t": "grass",
     "x": 48.5,
     "y": 38.86,
     "v": 1
    },
    {
     "t": "grass",
     "x": 37.78,
     "y": 22.2,
     "v": 1
    },
    {
     "t": "grass",
     "x": 48.5,
     "y": 39.64,
     "f": 1
    },
    {
     "t": "grass",
     "x": 48.74,
     "y": 40.41
    },
    {
     "t": "grass",
     "x": 55.14,
     "y": 32.1,
     "v": 1
    },
    {
     "t": "grass",
     "x": 55.65,
     "y": 33.07
    },
    {
     "t": "grass",
     "x": 54.76,
     "y": 32.47,
     "f": 1
    },
    {
     "t": "grass",
     "x": 73.01,
     "y": 42.15,
     "v": 1
    },
    {
     "t": "grass",
     "x": 73.92,
     "y": 41.6,
     "f": 1
    },
    {
     "t": "grass",
     "x": 72.13,
     "y": 41.68
    },
    {
     "t": "grass",
     "x": 40.22,
     "y": 56.22,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 34.07,
     "y": 26.02,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 33.81,
     "y": 25.55,
     "f": 1
    },
    {
     "t": "grass",
     "x": 34.34,
     "y": 26.86
    },
    {
     "t": "grass",
     "x": 11.38,
     "y": 60.67,
     "f": 1
    },
    {
     "t": "grass",
     "x": 46.81,
     "y": 20.34,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 48.05,
     "y": 20.19,
     "f": 1
    },
    {
     "t": "grass",
     "x": 28.48,
     "y": 52.69,
     "v": 1
    },
    {
     "t": "grass",
     "x": 27.78,
     "y": 52.37,
     "f": 1
    },
    {
     "t": "grass",
     "x": 49.5,
     "y": 41.58,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 49.36,
     "y": 42.16,
     "f": 1
    },
    {
     "t": "grass",
     "x": 50.17,
     "y": 41.54,
     "f": 1
    },
    {
     "t": "grass",
     "x": 17.26,
     "y": 17.14
    },
    {
     "t": "grass",
     "x": 17.74,
     "y": 16.48,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 37.85,
     "y": 60.07,
     "f": 1
    },
    {
     "t": "grass",
     "x": 72.09,
     "y": 74.37,
     "v": 1
    },
    {
     "t": "grass",
     "x": 44,
     "y": 19.59
    },
    {
     "t": "grass",
     "x": 44.63,
     "y": 19.39,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 37.55,
     "y": 48.45,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 37.36,
     "y": 47.94
    },
    {
     "t": "grass",
     "x": 55.94,
     "y": 14.51,
     "v": 1
    },
    {
     "t": "grass",
     "x": 55.77,
     "y": 15.61
    },
    {
     "t": "grass",
     "x": 40.01,
     "y": 29.12,
     "v": 1
    },
    {
     "t": "grass",
     "x": 40.05,
     "y": 28.61
    },
    {
     "t": "grass",
     "x": 40.86,
     "y": 28.27,
     "v": 1
    },
    {
     "t": "grass",
     "x": 10.88,
     "y": 57.73,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 11.65,
     "y": 57.97
    },
    {
     "t": "grass",
     "x": 50.67,
     "y": 44.58,
     "v": 1
    },
    {
     "t": "grass",
     "x": 50.43,
     "y": 44.01
    },
    {
     "t": "grass",
     "x": 15.1,
     "y": 26.99,
     "f": 1
    },
    {
     "t": "grass",
     "x": 16.09,
     "y": 26.81,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 58.53,
     "y": 44.41,
     "f": 1
    },
    {
     "t": "grass",
     "x": 39.77,
     "y": 62.82
    },
    {
     "t": "grass",
     "x": 40.26,
     "y": 62.97,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 40.05,
     "y": 62.33,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 19.13,
     "y": 57.35,
     "v": 1
    },
    {
     "t": "grass",
     "x": 53.6,
     "y": 7.77,
     "f": 1
    },
    {
     "t": "grass",
     "x": 53.08,
     "y": 7.8,
     "v": 1
    },
    {
     "t": "grass",
     "x": 54.2,
     "y": 7.73,
     "f": 1
    },
    {
     "t": "grass",
     "x": 51.05,
     "y": 36.33,
     "v": 1
    },
    {
     "t": "grass",
     "x": 51.18,
     "y": 35.54
    },
    {
     "t": "grass",
     "x": 51.93,
     "y": 35.51,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 65.52,
     "y": 53.44
    },
    {
     "t": "grass",
     "x": 48.14,
     "y": 51.22
    },
    {
     "t": "grass",
     "x": 47.12,
     "y": 51.39,
     "v": 1
    },
    {
     "t": "grass",
     "x": 38.22,
     "y": 24.29,
     "f": 1
    },
    {
     "t": "grass",
     "x": 38.59,
     "y": 23.62,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 12,
     "y": 11.07,
     "v": 1
    },
    {
     "t": "grass",
     "x": 61.54,
     "y": 35.36,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 61.78,
     "y": 34.6
    },
    {
     "t": "grass",
     "x": 60.65,
     "y": 34.7,
     "f": 1
    },
    {
     "t": "grass",
     "x": 44.65,
     "y": 47.83,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 44.5,
     "y": 48.33,
     "f": 1
    },
    {
     "t": "grass",
     "x": 45.33,
     "y": 48.02
    },
    {
     "t": "grass",
     "x": 45.66,
     "y": 47.28,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 56.9,
     "y": 42.02,
     "v": 1
    },
    {
     "t": "grass",
     "x": 58.04,
     "y": 41.45
    },
    {
     "t": "grass",
     "x": 2.06,
     "y": 23.85
    },
    {
     "t": "grass",
     "x": 3.43,
     "y": 24.17,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 18.84,
     "y": 25.37,
     "f": 1
    },
    {
     "t": "grass",
     "x": 18.22,
     "y": 25.5,
     "v": 1
    },
    {
     "t": "grass",
     "x": 19.03,
     "y": 26.02,
     "v": 1
    },
    {
     "t": "grass",
     "x": 18.39,
     "y": 25.98
    },
    {
     "t": "grass",
     "x": 16.09,
     "y": 62.61,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 47.03,
     "y": 10.05,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 35.68,
     "y": 51.51,
     "f": 1
    },
    {
     "t": "grass",
     "x": 34.62,
     "y": 51.55,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 67.08,
     "y": 11.55
    },
    {
     "t": "grass",
     "x": 66.41,
     "y": 11.64,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 66.81,
     "y": 11.07,
     "v": 1
    },
    {
     "t": "grass",
     "x": 48.01,
     "y": 61.35,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 41.18,
     "y": 63.37
    },
    {
     "t": "grass",
     "x": 42.06,
     "y": 64.24,
     "v": 1
    },
    {
     "t": "grass",
     "x": 40.52,
     "y": 64.11,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 65.47,
     "y": 55.22,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 57.6,
     "y": 44.42,
     "v": 1
    },
    {
     "t": "grass",
     "x": 30.57,
     "y": 53.53
    },
    {
     "t": "grass",
     "x": 29.55,
     "y": 53.01,
     "f": 1
    },
    {
     "t": "grass",
     "x": 60.7,
     "y": 43.21,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 60.02,
     "y": 43.01
    },
    {
     "t": "grass",
     "x": 60.91,
     "y": 42.42,
     "f": 1
    },
    {
     "t": "grass",
     "x": 61.39,
     "y": 43.98,
     "f": 1
    },
    {
     "t": "grass",
     "x": 60.51,
     "y": 43.72,
     "f": 1
    },
    {
     "t": "grass",
     "x": 19.01,
     "y": 46.96,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 41.35,
     "y": 55.8,
     "f": 1
    },
    {
     "t": "grass",
     "x": 50.48,
     "y": 57.68
    },
    {
     "t": "grass",
     "x": 49.89,
     "y": 57.15,
     "v": 1
    },
    {
     "t": "grass",
     "x": 17,
     "y": 48.13,
     "f": 1
    },
    {
     "t": "grass",
     "x": 16.53,
     "y": 48.3,
     "v": 1
    },
    {
     "t": "grass",
     "x": 45.52,
     "y": 53.74,
     "f": 1
    },
    {
     "t": "grass",
     "x": 46.66,
     "y": 54.18,
     "v": 1
    },
    {
     "t": "grass",
     "x": 45.72,
     "y": 53.26,
     "v": 1
    },
    {
     "t": "grass",
     "x": 44.76,
     "y": 53.96,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 37.76,
     "y": 41.57,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 37.8,
     "y": 42.72,
     "f": 1
    },
    {
     "t": "grass",
     "x": 51.72,
     "y": 11.86,
     "f": 1
    },
    {
     "t": "grass",
     "x": 52.28,
     "y": 11.75,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 52.65,
     "y": 30.19,
     "v": 1
    },
    {
     "t": "grass",
     "x": 52.92,
     "y": 30.81,
     "f": 1
    },
    {
     "t": "grass",
     "x": 59.66,
     "y": 62.77,
     "f": 1
    },
    {
     "t": "grass",
     "x": 60.32,
     "y": 61.8,
     "v": 1
    },
    {
     "t": "grass",
     "x": 53,
     "y": 50.57
    },
    {
     "t": "grass",
     "x": 54.39,
     "y": 29.69
    },
    {
     "t": "grass",
     "x": 14.16,
     "y": 25.55,
     "v": 1
    },
    {
     "t": "grass",
     "x": 13.99,
     "y": 25,
     "f": 1
    },
    {
     "t": "grass",
     "x": 37.24,
     "y": 20.56
    },
    {
     "t": "grass",
     "x": 36.58,
     "y": 21.39,
     "f": 1
    },
    {
     "t": "grass",
     "x": 55.58,
     "y": 65.7,
     "f": 1
    },
    {
     "t": "grass",
     "x": 54.68,
     "y": 65.62,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 41.69,
     "y": 61.57
    },
    {
     "t": "grass",
     "x": 40.6,
     "y": 61.56
    },
    {
     "t": "grass",
     "x": 42.69,
     "y": 61.17,
     "v": 1
    },
    {
     "t": "grass",
     "x": 41.23,
     "y": 62.52,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 24.78,
     "y": 29.52
    },
    {
     "t": "grass",
     "x": 24.52,
     "y": 30.09,
     "v": 1
    },
    {
     "t": "grass",
     "x": 25.28,
     "y": 30.66,
     "f": 1
    },
    {
     "t": "grass",
     "x": 23.58,
     "y": 29.19,
     "v": 1
    },
    {
     "t": "grass",
     "x": 46.26,
     "y": 23.18,
     "f": 1
    },
    {
     "t": "grass",
     "x": 47.47,
     "y": 23.61,
     "v": 1
    },
    {
     "t": "grass",
     "x": 46.4,
     "y": 22.65,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 33.48,
     "y": 26.96,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 34.6,
     "y": 27.33,
     "v": 1
    },
    {
     "t": "grass",
     "x": 20.94,
     "y": 31.81,
     "v": 1
    },
    {
     "t": "grass",
     "x": 40.02,
     "y": 26.92,
     "f": 1
    },
    {
     "t": "grass",
     "x": 39.21,
     "y": 27.12,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 24.41,
     "y": 32.41,
     "v": 1
    },
    {
     "t": "grass",
     "x": 25.47,
     "y": 33.03
    },
    {
     "t": "grass",
     "x": 24.64,
     "y": 33.49,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 23.95,
     "y": 31.39
    },
    {
     "t": "grass",
     "x": 23.59,
     "y": 33.16,
     "f": 1
    },
    {
     "t": "grass",
     "x": 48.31,
     "y": 42.53
    },
    {
     "t": "grass",
     "x": 25.75,
     "y": 21.93,
     "f": 1
    },
    {
     "t": "grass",
     "x": 26.38,
     "y": 21.46,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 25.04,
     "y": 21.64,
     "v": 1
    },
    {
     "t": "grass",
     "x": 26.26,
     "y": 22.3,
     "v": 1
    },
    {
     "t": "grass",
     "x": 20.69,
     "y": 55.53
    },
    {
     "t": "grass",
     "x": 21.14,
     "y": 55.96,
     "v": 1
    },
    {
     "t": "grass",
     "x": 46.52,
     "y": 14.27,
     "v": 1
    },
    {
     "t": "grass",
     "x": 46.27,
     "y": 13.35
    },
    {
     "t": "grass",
     "x": 45.84,
     "y": 14.01
    },
    {
     "t": "grass",
     "x": 30.43,
     "y": 19.5,
     "v": 1
    },
    {
     "t": "grass",
     "x": 32.16,
     "y": 19.6,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 15.07,
     "y": 31.87,
     "f": 1
    },
    {
     "t": "grass",
     "x": 15.94,
     "y": 50.58
    },
    {
     "t": "grass",
     "x": 57.17,
     "y": 71.9,
     "f": 1
    },
    {
     "t": "grass",
     "x": 56.77,
     "y": 72.45,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 54.23,
     "y": 57.24,
     "f": 1
    },
    {
     "t": "grass",
     "x": 66.1,
     "y": 75.7
    },
    {
     "t": "grass",
     "x": 52.15,
     "y": 16.04
    },
    {
     "t": "grass",
     "x": 53.11,
     "y": 16.07,
     "v": 1
    },
    {
     "t": "grass",
     "x": 22.3,
     "y": 52.83,
     "v": 1
    },
    {
     "t": "grass",
     "x": 22.55,
     "y": 52.28
    },
    {
     "t": "grass",
     "x": 23.38,
     "y": 53.21
    },
    {
     "t": "grass",
     "x": 21.22,
     "y": 53.55
    },
    {
     "t": "grass",
     "x": 22.72,
     "y": 53.37,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 36.02,
     "y": 37.96
    },
    {
     "t": "grass",
     "x": 36.27,
     "y": 37.43,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 36.61,
     "y": 38.09,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 42.69,
     "y": 20.74,
     "v": 1
    },
    {
     "t": "grass",
     "x": 56.52,
     "y": 44.19,
     "f": 1
    },
    {
     "t": "grass",
     "x": 56.05,
     "y": 43.91,
     "v": 1
    },
    {
     "t": "grass",
     "x": 45.91,
     "y": 43.49
    },
    {
     "t": "grass",
     "x": 46.22,
     "y": 42.92,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 70.41,
     "y": 64.02,
     "v": 1
    },
    {
     "t": "grass",
     "x": 36.15,
     "y": 43.91,
     "f": 1
    },
    {
     "t": "grass",
     "x": 46.95,
     "y": 69.44,
     "v": 1
    },
    {
     "t": "grass",
     "x": 47.55,
     "y": 69.13,
     "f": 1
    },
    {
     "t": "grass",
     "x": 46.57,
     "y": 69.93,
     "f": 1
    },
    {
     "t": "grass",
     "x": 46.29,
     "y": 68.61
    },
    {
     "t": "grass",
     "x": 59.29,
     "y": 13.05
    },
    {
     "t": "grass",
     "x": 20.13,
     "y": 50.96,
     "v": 1
    },
    {
     "t": "grass",
     "x": 19.46,
     "y": 51.11,
     "f": 1
    },
    {
     "t": "grass",
     "x": 19.88,
     "y": 51.94,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 49.35,
     "y": 72.5
    },
    {
     "t": "grass",
     "x": 50.19,
     "y": 72.81,
     "v": 1
    },
    {
     "t": "grass",
     "x": 49.35,
     "y": 71.73,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 66.05,
     "y": 17.89,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 66.87,
     "y": 18.21,
     "f": 1
    },
    {
     "t": "grass",
     "x": 65.42,
     "y": 17.63
    },
    {
     "t": "grass",
     "x": 67.45,
     "y": 18.16,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 27.42,
     "y": 55.24,
     "f": 1
    },
    {
     "t": "grass",
     "x": 26.86,
     "y": 55.35,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 28.31,
     "y": 55.88,
     "v": 1
    },
    {
     "t": "grass",
     "x": 63.39,
     "y": 24.42
    },
    {
     "t": "grass",
     "x": 35.33,
     "y": 50.32,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 35.99,
     "y": 50.36,
     "f": 1
    },
    {
     "t": "grass",
     "x": 34.45,
     "y": 49.45
    },
    {
     "t": "grass",
     "x": 42.25,
     "y": 37.61,
     "v": 1
    },
    {
     "t": "grass",
     "x": 46.76,
     "y": 57.42
    },
    {
     "t": "grass",
     "x": 46.15,
     "y": 58.06,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 37.51,
     "y": 45.46,
     "v": 1
    },
    {
     "t": "grass",
     "x": 38.28,
     "y": 45.18
    },
    {
     "t": "grass",
     "x": 41.92,
     "y": 29.15,
     "f": 1
    },
    {
     "t": "grass",
     "x": 42.21,
     "y": 28.67,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 42.77,
     "y": 28.8
    },
    {
     "t": "grass",
     "x": 36.09,
     "y": 41.33,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 52.58,
     "y": 72.05,
     "f": 1
    },
    {
     "t": "grass",
     "x": 52.23,
     "y": 71.42,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 46.83,
     "y": 40.85,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 53.42,
     "y": 71.24,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 65.96,
     "y": 76.4,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 65.5,
     "y": 76.86
    },
    {
     "t": "grass",
     "x": 35.67,
     "y": 55.24
    },
    {
     "t": "grass",
     "x": 54.54,
     "y": 5.58,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 35.2,
     "y": 23.73,
     "f": 1
    },
    {
     "t": "grass",
     "x": 34.75,
     "y": 24.04,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 34.43,
     "y": 23.63
    },
    {
     "t": "grass",
     "x": 51.43,
     "y": 65.8,
     "f": 1
    },
    {
     "t": "grass",
     "x": 51.84,
     "y": 65.49,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 57.11,
     "y": 22.93,
     "f": 1
    },
    {
     "t": "grass",
     "x": 57.07,
     "y": 21.64,
     "v": 1
    },
    {
     "t": "grass",
     "x": 55.94,
     "y": 22.68,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 16.06,
     "y": 18.95,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 52.08,
     "y": 65.99
    },
    {
     "t": "grass",
     "x": 53.34,
     "y": 67.08,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 18.03,
     "y": 60.97
    },
    {
     "t": "grass",
     "x": 18.81,
     "y": 62.33,
     "v": 1
    },
    {
     "t": "grass",
     "x": 34.55,
     "y": 18.45,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 34.86,
     "y": 19.16,
     "f": 1
    },
    {
     "t": "grass",
     "x": 55.01,
     "y": 66.06,
     "f": 1
    },
    {
     "t": "grass",
     "x": 74.75,
     "y": 42.88,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 73.46,
     "y": 42.87
    },
    {
     "t": "grass",
     "x": 21.08,
     "y": 49.37,
     "f": 1
    },
    {
     "t": "grass",
     "x": 21.55,
     "y": 50.12,
     "v": 1
    },
    {
     "t": "grass",
     "x": 65.34,
     "y": 37.32,
     "v": 1
    },
    {
     "t": "grass",
     "x": 52.36,
     "y": 52.05,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 52.9,
     "y": 52.17
    },
    {
     "t": "grass",
     "x": 52.78,
     "y": 51.37
    },
    {
     "t": "grass",
     "x": 52.49,
     "y": 52.67,
     "f": 1
    },
    {
     "t": "grass",
     "x": 35.91,
     "y": 47.47,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 51.57,
     "y": 70.45
    },
    {
     "t": "crystal",
     "x": 26.91,
     "y": 49.59
    },
    {
     "t": "crystal",
     "x": 61.51,
     "y": 56.26
    },
    {
     "t": "brazier",
     "x": 46.5,
     "y": 62.01
    },
    {
     "t": "log",
     "x": 47.8,
     "y": 62.41,
     "f": 1
    },
    {
     "t": "log",
     "x": 45.3,
     "y": 62.71
    },
    {
     "t": "stump",
     "x": 46.7,
     "y": 60.71
    },
    {
     "t": "brazier",
     "x": 52.07,
     "y": 37.5
    },
    {
     "t": "log",
     "x": 53.37,
     "y": 37.9,
     "f": 1
    },
    {
     "t": "log",
     "x": 50.87,
     "y": 38.2
    },
    {
     "t": "stump",
     "x": 52.27,
     "y": 36.2
    },
    {
     "t": "brazier",
     "x": 43.02,
     "y": 35.62
    },
    {
     "t": "log",
     "x": 44.32,
     "y": 36.02,
     "f": 1
    },
    {
     "t": "log",
     "x": 41.82,
     "y": 36.32
    },
    {
     "t": "stump",
     "x": 42.93,
     "y": 34.37
    },
    {
     "t": "rock",
     "x": 30.87,
     "y": 20.4
    },
    {
     "t": "rock",
     "x": 31.57,
     "y": 20.8,
     "v": 1
    },
    {
     "t": "rock",
     "x": 30.37,
     "y": 21.1,
     "v": 2
    },
    {
     "t": "lantern_blue",
     "x": 29.47,
     "y": 19.9
    },
    {
     "t": "pine_giant",
     "x": 67.2,
     "y": 27.1,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 65.3,
     "y": 30.9,
     "v": 2
    },
    {
     "t": "sunbeam",
     "x": 65,
     "y": 28.5
    },
    {
     "t": "pine_giant",
     "x": 43.81,
     "y": 52.23,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 41.91,
     "y": 56.03,
     "v": 2
    },
    {
     "t": "sunbeam",
     "x": 41.61,
     "y": 53.63
    },
    {
     "t": "pine_giant",
     "x": 44.68,
     "y": 61.41
    },
    {
     "t": "pine_giant",
     "x": 48.88,
     "y": 62.01,
     "v": 1
    },
    {
     "t": "sunbeam",
     "x": 46.68,
     "y": 63.41
    },
    {
     "t": "root_ladder",
     "id": "cairn_roots",
     "x": 50.2,
     "y": 18.5,
     "to": {
      "x": 49.2,
      "y": 18.5
     },
     "h": 5
    },
    {
     "t": "root_ladder",
     "id": "cairn_roots_top",
     "x": 49.2,
     "y": 18.5,
     "to": {
      "x": 50.2,
      "y": 18.5
     },
     "h": -5
    }
   ],
   "objective": "Hit the training dummies",
   "sigil": {
    "x": 74,
    "y": 41
   },
   "level": [
    1,
    3
   ],
   "sections": [
    {
     "id": "hub",
     "name": "Whispering Vale",
     "kind": "outer",
     "x": 0,
     "y": 0,
     "w": 80,
     "h": 80
    },
    {
     "id": "moon",
     "name": "Moon Pond",
     "kind": "outer",
     "x": 54,
     "y": 58,
     "w": 26,
     "h": 22,
     "ambient": "#9fb4ff",
     "dark": 0.25
    },
    {
     "id": "lanterns",
     "name": "Pip's Lanterns",
     "kind": "outer",
     "x": 6,
     "y": 0,
     "w": 16,
     "h": 12,
     "ambient": "#ffe2b0",
     "dark": 0.15
    },
    {
     "id": "arena",
     "name": "Dream Arena",
     "kind": "arena",
     "x": 66,
     "y": 34,
     "w": 14,
     "h": 14
    }
   ],
   "drops": [
    [
     47,
     21,
     5,
     2
    ]
   ],
   "rock": [
    [
     54,
     7,
     3
    ],
    [
     52,
     8,
     7
    ],
    [
     50,
     9,
     10
    ],
    [
     49,
     10,
     12
    ],
    [
     49,
     11,
     12
    ],
    [
     47,
     12,
     15
    ],
    [
     46,
     13,
     17
    ],
    [
     45,
     14,
     18
    ],
    [
     44,
     15,
     19
    ],
    [
     44,
     16,
     19
    ],
    [
     44,
     17,
     19
    ],
    [
     44,
     18,
     18
    ],
    [
     45,
     19,
     17
    ],
    [
     46,
     20,
     14
    ],
    [
     47,
     21,
     4
    ],
    [
     54,
     21,
     4
    ]
   ],
   "triggers": [
    {
     "id": "crown",
     "name": "The Stone's Crown",
     "when": {
      "type": "enter_area",
      "x": 47,
      "y": 18,
      "r": 1.9
     },
     "actions": [
      {
       "type": "vantage",
       "id": "crown",
       "r": 40,
       "title": "The Stone's Crown",
       "sub": "Three rifts, two islets, and the cloud sea"
      },
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "So that is the whole dream. It looked bigger from the bed."
       ]
      }
     ]
    },
    {
     "id": "cairn_ledge",
     "name": "The garden ledge",
     "when": {
      "type": "enter_area",
      "x": 49.6,
      "y": 20.4,
      "r": 1.6
     },
     "actions": [
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "Straight down is the garden. A short way home, if you trust your knees."
       ]
      }
     ]
    },
    {
     "id": "bridge_lanterns_hint",
     "name": "Pip's Lanterns bridge",
     "when": {
      "type": "enter_area",
      "x": 13,
      "y": 13.6,
      "r": 3.4
     },
     "actions": [
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "Those are my lanterns. The bridge wants a Spire key."
       ]
      }
     ]
    },
    {
     "id": "bridge_arena_hint",
     "name": "Dream Arena bridge",
     "when": {
      "type": "enter_area",
      "x": 64.4,
      "y": 41,
      "r": 3.4
     },
     "actions": [
      {
       "type": "message",
       "text": "The Dream Arena bridge is sealed. Finish the Pinewood first."
      }
     ]
    },
    {
     "id": "lanterns_islet",
     "name": "Pip's Lanterns",
     "when": {
      "type": "enter_area",
      "x": 13,
      "y": 6,
      "r": 3
     },
     "actions": [
      {
       "type": "banner",
       "title": "Pip's Lanterns",
       "sub": "Three lights wait for the Spire"
      },
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "Still unlit. I was saving them for a bad night."
       ]
      }
     ]
    },
    {
     "id": "arena_islet",
     "name": "Dream Arena",
     "when": {
      "type": "enter_area",
      "x": 74,
      "y": 41,
      "r": 4
     },
     "actions": [
      {
       "type": "banner",
       "title": "Dream Arena",
       "sub": "A ring of dream-glass, waiting for you"
      }
     ]
    },
    {
     "id": "moon_gate_hint",
     "name": "The fallen tree",
     "when": {
      "type": "enter_area",
      "x": 58.82,
      "y": 69.7,
      "r": 3.4
     },
     "actions": [
      {
       "type": "message",
       "text": "A fallen tree blocks the road. It will not move until the fourth Shard is lit."
      }
     ]
    },
    {
     "id": "moon_pond",
     "name": "Moon Pond",
     "when": {
      "type": "enter_area",
      "x": 66,
      "y": 68,
      "r": 4.5
     },
     "actions": [
      {
       "type": "banner",
       "title": "Moon Pond",
       "sub": "Night fishing and the pearl ritual"
      },
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "Quiet water. Even I whisper here."
       ]
      }
     ]
    },
    {
     "id": "banner",
     "name": "Zone banner",
     "when": {
      "type": "map_enter"
     },
     "actions": [
      {
       "type": "dialogue",
       "id": "vale_banner"
      }
     ]
    },
    {
     "id": "dummies",
     "name": "Training dummies",
     "when": {
      "type": "map_enter"
     },
     "actions": [
      {
       "type": "spawn",
       "enemy": "dummy",
       "count": 1,
       "x": 38.2,
       "y": 63.4,
       "instant": true
      },
      {
       "type": "spawn",
       "enemy": "dummy",
       "count": 1,
       "x": 39.8,
       "y": 64.8,
       "instant": true
      }
     ]
    },
    {
     "id": "wake",
     "name": "Pip wakes Aerin",
     "when": {
      "type": "enter_area",
      "x": 30,
      "y": 56,
      "r": 7
     },
     "actions": [
      {
       "type": "wait",
       "seconds": 3
      },
      {
       "type": "noun",
       "noun": "move"
      },
      {
       "type": "dialogue",
       "id": "vale_wake"
      },
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "Training dummies are south-east. Hit one."
       ]
      },
      {
       "type": "objective",
       "text": "Hit the training dummies",
       "x": 37.5,
       "y": 60
      }
     ]
    },
    {
     "id": "days",
     "name": "Pip: three days",
     "opening": true,
     "when": {
      "type": "timer",
      "after": "wake",
      "seconds": 20
     },
     "requires": [
      "wake"
     ],
     "actions": [
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "Three days. You've been asleep three days."
       ]
      },
      {
       "type": "noun",
       "noun": "vale"
      }
     ]
    },
    {
     "id": "sword",
     "name": "The sword in the grass",
     "when": {
      "type": "map_enter"
     },
     "actions": [
      {
       "type": "gear",
       "item": "rustyblade",
       "x": 37.5,
       "y": 60
      }
     ]
    },
    {
     "id": "cottage_cap",
     "name": "The cap on the child's bed",
     "when": {
      "type": "map_enter"
     },
     "actions": [
      {
       "type": "gear",
       "item": "ironcap",
       "x": 21.2,
       "y": 25.4
      }
     ]
    },
    {
     "id": "shrine",
     "name": "Dreamer's bed",
     "when": {
      "type": "enter_area",
      "x": 32,
      "y": 54.2,
      "r": 2.2
     },
     "actions": [
      {
       "type": "checkpoint",
       "text": "Checkpoint: Whispering Vale"
      },
      {
       "type": "heal",
       "pct": 100
      }
     ],
     "once": false
    },
    {
     "id": "shrine_terrace",
     "name": "Rift terrace shrine",
     "when": {
      "type": "enter_area",
      "x": 54,
      "y": 26.6,
      "r": 2.2
     },
     "actions": [
      {
       "type": "checkpoint",
       "text": "Checkpoint: Rift terrace"
      },
      {
       "type": "heal",
       "pct": 100
      }
     ],
     "once": false
    },
    {
     "id": "yard_teach",
     "name": "Dummy yard lesson",
     "when": {
      "type": "enter_area",
      "x": 39,
      "y": 64,
      "r": 3.6
     },
     "actions": [
      {
       "type": "noun",
       "noun": "dodge"
      },
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "Swing. Then dodge. Then try your Q skill.",
        "The dummy never hits back. Lucky thing."
       ]
      },
      {
       "type": "objective",
       "text": "Open the chest west of the bed",
       "x": 21,
       "y": 51
      }
     ]
    },
    {
     "id": "elder",
     "name": "The Elder Stone",
     "when": {
      "type": "enter_area",
      "x": 39,
      "y": 47.5,
      "r": 3
     },
     "actions": [
      {
       "type": "dialogue",
       "id": "vale_elder"
      },
      {
       "type": "dialogue",
       "speaker": "Elder Stone",
       "lines": [
        "The Stone lost a light. Past the cottage, a path ends."
       ]
      },
      {
       "type": "quest",
       "id": "vale_lantern",
       "step": 0
      },
      {
       "type": "objective",
       "text": "Find the lost lantern past the cottage",
       "x": 22,
       "y": 26
      }
     ]
    },
    {
     "id": "chest",
     "name": "Tutorial chest",
     "when": {
      "type": "enter_area",
      "x": 21,
      "y": 51,
      "r": 2.6
     },
     "actions": [
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "A chest! Interact to open it."
       ]
      },
      {
       "type": "wait",
       "seconds": 4
      },
      {
       "type": "dialogue",
       "id": "vale_chest"
      },
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "Open your bag and equip it."
       ]
      },
      {
       "type": "objective",
       "text": "Follow the path to the Elder Stone",
       "x": 39,
       "y": 47.5
      }
     ]
    },
    {
     "id": "fish_hint",
     "name": "Fishing spot",
     "when": {
      "type": "enter_area",
      "x": 18.5,
      "y": 54.5,
      "r": 3.4
     },
     "actions": [
      {
       "type": "message",
       "text": "Ripples in the water. Interact to cast."
      }
     ]
    },
    {
     "id": "gems",
     "name": "Hidden gem cache",
     "when": {
      "type": "enter_area",
      "x": 6,
      "y": 21,
      "r": 2.2
     },
     "actions": [
      {
       "type": "message",
       "text": "A hidden gem cache!"
      },
      {
       "type": "loot",
       "rarity": "uncommon",
       "count": 1,
       "x": 6,
       "y": 21,
       "gem": true
      }
     ]
    },
    {
     "id": "tablet",
     "name": "Cottage tablet",
     "when": {
      "type": "enter_area",
      "x": 25.2,
      "y": 28.4,
      "r": 2.4
     },
     "actions": [
      {
       "type": "dialogue",
       "id": "vale_tablet"
      }
     ]
    },
    {
     "id": "garden_ambush",
     "name": "Gloom in the garden",
     "when": {
      "type": "enter_area",
      "x": 36,
      "y": 23,
      "r": 3.6
     },
     "requires": [
      "elder"
     ],
     "actions": [
      {
       "type": "noun",
       "noun": "potion"
      },
      {
       "type": "banner",
       "title": "Gloom in the garden",
       "sub": "Slimes ooze out of the flowers"
      },
      {
       "type": "spawn",
       "enemy": "gloomslime",
       "count": 1,
       "x": 34.4,
       "y": 22.4,
       "radius": 1.2
      },
      {
       "type": "spawn",
       "enemy": "gloomslime",
       "count": 1,
       "x": 37.8,
       "y": 23.4,
       "radius": 1.2
      },
      {
       "type": "spawn",
       "enemy": "gloomslime",
       "count": 1,
       "x": 36,
       "y": 24.8,
       "radius": 1.2
      }
     ]
    },
    {
     "id": "garden_done",
     "name": "Garden cleared",
     "when": {
      "type": "all_enemies_dead"
     },
     "requires": [
      "garden_ambush"
     ],
     "actions": [
      {
       "type": "message",
       "text": "The garden is quiet. Something hums in the south."
      },
      {
       "type": "heal",
       "pct": 40
      },
      {
       "type": "loot",
       "item": "ironboots",
       "rarity": "common",
       "x": 36,
       "y": 23
      },
      {
       "type": "open_portal",
       "index": 4
      },
      {
       "type": "sound",
       "name": "portal"
      },
      {
       "type": "banner",
       "title": "The Pinewood rift opens",
       "sub": "South of the yard"
      },
      {
       "type": "dialogue",
       "id": "vale_rift"
      },
      {
       "type": "quest",
       "id": "shard_root",
       "step": 0
      },
      {
       "type": "objective",
       "text": "Take the rift to the Pinewood"
      }
     ]
    },
    {
     "id": "lantern_found",
     "name": "The lost lantern",
     "when": {
      "type": "enter_area",
      "x": 7.3,
      "y": 21.9,
      "r": 2.2
     },
     "requires": [
      "elder"
     ],
     "actions": [
      {
       "type": "message",
       "text": "The Stone's lantern, still warm."
      },
      {
       "type": "quest",
       "id": "vale_lantern",
       "step": 1
      },
      {
       "type": "objective",
       "text": "Return the lantern to the Stone"
      }
     ]
    },
    {
     "id": "lantern_return",
     "name": "Lantern returned",
     "when": {
      "type": "enter_area",
      "x": 39,
      "y": 47.5,
      "r": 3
     },
     "requires": [
      "lantern_found"
     ],
     "actions": [
      {
       "type": "dialogue",
       "speaker": "Elder Stone",
       "lines": [
        "The Stone is lit. The Stone remembers kindness."
       ]
      },
      {
       "type": "quest",
       "id": "vale_lantern",
       "done": true
      },
      {
       "type": "loot",
       "rarity": "rare",
       "count": 1,
       "x": 39,
       "y": 47.5,
       "gem": true,
       "item": "socket_rune"
      },
      {
       "type": "message",
       "text": "Reward: a gem and a Socket Rune."
      }
     ]
    }
   ]
  },
  "ruins": {
   "name": "Gloomspire Ruins",
   "sub": "Where the dream turns to nightmare",
   "theme": "ruins",
   "W": 22,
   "H": 22,
   "tiles": [
    "......................",
    "......dddddddddd......",
    "....dddxxxxxxxxddd....",
    "...dddxxcxxxxcxxdd....",
    "...dxxxxxxxxxxxxxxd...",
    "..ddxcxxxxxxxxxxcxdd..",
    "..dxxxxxxxxxxxxxxxxd..",
    "..xxxxxxxxxxxxxxxxxxd.",
    ".dxcxxxxxrrrrxxxxxcxd.",
    ".dxxxxxxrrrrrrxxxxxxd.",
    "ddxxxxxxrrrrrrxxxxxxd.",
    "ddxxxxxxrrrrrrxxxxxxd.",
    ".dxxxxxxrrrrrrxxxxxxdd",
    ".dxcxxxxxrrrrxxxxxcxd.",
    ".dxxxxxxxxxxxxxxxxxxd.",
    "..dxxxxxxxxxxxxxxxxdd.",
    "...dxcxxxxxxxxxxcxdd..",
    "...dxxxxxxxxxxxxxxd...",
    "....ddxxcxxxxcxxdd....",
    "....dddxxxxxxxxdd.....",
    "......dddddddd.d......",
    "......................"
   ],
   "heights": [
    "0000000000000000000000",
    "0000000000000000000000",
    "0000000000000000000000",
    "0000000080000400000000",
    "0000000000000000000000",
    "0000080000000000800000",
    "0000000000000000000000",
    "0000000000000000000000",
    "0004000000000000002000",
    "0000000000000000000000",
    "0000000000000000000000",
    "0000000000000000000000",
    "0000000000000000000000",
    "0008000000000000002000",
    "0000000000000000000000",
    "0000000000000000000000",
    "0000080000000000200000",
    "0000000000000000000000",
    "0000000020000200000000",
    "0000000000000000000000",
    "0000000000000000000000",
    "0000000000000000000000"
   ],
   "start": {
    "x": 6.2,
    "y": 16.2
   },
   "portals": [
    {
     "x": 4.6,
     "y": 17.6,
     "to": "vale",
     "open": false,
     "marker": false
    }
   ],
   "objects": [
    {
     "t": "brazier",
     "x": 14.96,
     "y": 14.96
    },
    {
     "t": "brazier",
     "x": 7.04,
     "y": 14.96
    },
    {
     "t": "brazier",
     "x": 7.04,
     "y": 7.04
    },
    {
     "t": "brazier",
     "x": 14.96,
     "y": 7.04
    },
    {
     "t": "tree_dead",
     "x": 16.375,
     "y": 18.565,
     "v": 3
    },
    {
     "t": "rock_dark",
     "x": 20.257,
     "y": 8.554,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 20.03,
     "y": 13.03,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 12.87,
     "y": 19.858,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 1.128,
     "y": 11.647,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 19.587,
     "y": 5.748,
     "v": 3
    },
    {
     "t": "rock_dark",
     "x": 6.111,
     "y": 1.517,
     "v": 1
    },
    {
     "t": "lantern_blue",
     "x": 2.945,
     "y": 15.846
    },
    {
     "t": "lantern_blue",
     "x": 4.856,
     "y": 3.886
    },
    {
     "t": "lantern_blue",
     "x": 18.29,
     "y": 5.066
    }
   ],
   "objective": "Brace yourself...",
   "sigil": {
    "x": 11,
    "y": 11
   },
   "triggers": [
    {
     "id": "wave1",
     "name": "Wave 1",
     "when": {
      "type": "timer",
      "seconds": 2.6,
      "after": "map"
     },
     "actions": [
      {
       "type": "banner",
       "title": "Wave 1 / 3",
       "sub": "Gloom slimes ooze from the cracks"
      },
      {
       "type": "objective",
       "text": "Survive the waves (1/3)"
      },
      {
       "type": "spawn",
       "enemy": "slime",
       "count": 6
      }
     ]
    },
    {
     "id": "clear1",
     "name": "Wave 1 cleared",
     "when": {
      "type": "all_enemies_dead"
     },
     "requires": [
      "wave1"
     ],
     "actions": [
      {
       "type": "banner",
       "title": "Wave cleared",
       "sub": "Catch your breath..."
      },
      {
       "type": "heal",
       "pct": 25
      },
      {
       "type": "loot",
       "rarity": "uncommon",
       "count": 1
      }
     ]
    },
    {
     "id": "wave2",
     "name": "Wave 2",
     "when": {
      "type": "timer",
      "seconds": 3,
      "after": "clear1"
     },
     "actions": [
      {
       "type": "banner",
       "title": "Wave 2 / 3",
       "sub": "Wisps join the swarm"
      },
      {
       "type": "objective",
       "text": "Survive the waves (2/3)"
      },
      {
       "type": "spawn",
       "enemy": "slime",
       "count": 5
      },
      {
       "type": "spawn",
       "enemy": "wisp",
       "count": 4
      }
     ]
    },
    {
     "id": "clear2",
     "name": "Wave 2 cleared",
     "when": {
      "type": "all_enemies_dead"
     },
     "requires": [
      "wave2"
     ],
     "actions": [
      {
       "type": "banner",
       "title": "Wave cleared",
       "sub": "Catch your breath..."
      },
      {
       "type": "heal",
       "pct": 25
      },
      {
       "type": "loot",
       "rarity": "uncommon",
       "count": 1
      }
     ]
    },
    {
     "id": "wave3",
     "name": "Wave 3",
     "when": {
      "type": "timer",
      "seconds": 3,
      "after": "clear2"
     },
     "actions": [
      {
       "type": "banner",
       "title": "Wave 3 / 3",
       "sub": "Shade hounds on the hunt"
      },
      {
       "type": "objective",
       "text": "Survive the waves (3/3)"
      },
      {
       "type": "spawn",
       "enemy": "hound",
       "count": 4
      },
      {
       "type": "spawn",
       "enemy": "wisp",
       "count": 3
      },
      {
       "type": "spawn",
       "enemy": "slime",
       "count": 4
      }
     ]
    },
    {
     "id": "bossintro",
     "name": "Boss intro",
     "when": {
      "type": "all_enemies_dead"
     },
     "requires": [
      "wave3"
     ],
     "actions": [
      {
       "type": "banner",
       "title": "The Gloam Warden",
       "sub": "Keeper of the Nightmare",
       "boss": true
      },
      {
       "type": "objective",
       "text": "Defeat the Gloam Warden"
      },
      {
       "type": "checkpoint",
       "text": "Checkpoint: before the Warden"
      }
     ]
    },
    {
     "id": "boss",
     "name": "Boss appears",
     "when": {
      "type": "timer",
      "seconds": 3.2,
      "after": "bossintro"
     },
     "actions": [
      {
       "type": "spawn_boss"
      }
     ]
    },
    {
     "id": "victory",
     "name": "Victory",
     "when": {
      "type": "all_enemies_dead"
     },
     "requires": [
      "boss"
     ],
     "actions": [
      {
       "type": "clear_enemies"
      },
      {
       "type": "banner",
       "title": "Victory",
       "sub": "The nightmare fades. A rift home opens to the west."
      },
      {
       "type": "objective",
       "text": "Return through the rift (W)"
      },
      {
       "type": "open_portal",
       "index": -1
      }
     ]
    }
   ],
   "level": [
    10,
    17
   ]
  },
  "pinewood": {
   "name": "Misty Pinewood",
   "sub": "The trees are leaning away from something",
   "theme": "forest",
   "W": 112,
   "H": 112,
   "tiles": [
    "........................................................kkkk....................................................",
    ".......................d.ddddddddddddddggggg............kkkk....................................................",
    "......................dddddddddddppppppppgggg...........kkkk.....................................dddd...........",
    ".....................gdddppppdddpppppppppppggggg........kkkk.................ddgg..............ddddddd..........",
    ".........ggg........gggggppppppppddddddddpppggggd.......kkkk...dggd........dgggggg............ddddddddd.........",
    ".....dddgggggg.....ggggggppddpppdddddddgggppgggggg......kkkk..dddddd......ggggdddggddd.......dddddxdddggd.......",
    "...dddddgggggggggggggggggpsspddddddddddgggpppppggggggd..kkkk.dddgggdd.....gdddddddddddd.ddd.dddddxxdddggg.......",
    "...dggddgppgggggggggspgggpsspsddddddddddppxxxxxcpdgggdd.kkkkdddggggdd.....gddddddddddddddddddppdddxddddgg.......",
    "..dgggggpppppddddgggsspggggpsdddddddddddpxxxxxxxxpdddddgkkkkddggggggd...ddddxdddxxxddddddppppppdddxddddgg.......",
    ".ddgggggppppddddddsppsggggggdddddddddddspxxrrrrxxpdgggddkkkkdddgggggdddddpppdddddddddddppppppppddddddddgg.......",
    ".ddggggggggdddddddsspgg...ggddddddddddpspxxrrrrxxpdgggddkkkkddddggggpddpppppddddddddddpppppddddddddddddgg.......",
    ".ddgggggdggdddddddsssgg...ggdddddddddspppxxrrrrxxppgggddkkkk.dddgggppppppppgddxddddddppppddddddddddddddgg.......",
    ".ddggggddggddddxxxdgspggggggddddxxxdsspddpxxxxxxpppdddddkkkk...ddddpppppddgdxxxxxxxddppdddd...ddddddddggg.......",
    "..ddddddddggdddddxdgpppggggggddddxxdspdddpcxxxxppdddddddkkkk...ddddddddddddgddxddddddddd......dddddddggg........",
    "..ddddddddggddddddgggpgggggggggddddggdddddppxcpdddddddd.kkkk......dddddd..dgddddddddd..........ddddddgg.........",
    "...ddddddgggddddddggggggggggggggddgggdd..dddddddddd.....kkkk...............ddddddddd............dddddd..........",
    "...........ddgdddgggggggggg..gggggggggg...ddddddd.......kkkk................dddddd..............................",
    "............dgdddgg.ggggggg....gggggggg.....ddd.........kkkk.................ddd................................",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
    "vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv",
    ".......................................................................ff.gdd.................dddfffffffgggg....",
    "......................................................................ffffgdd................gdddfffffffgggg....",
    ".....................................................................ffffgggdd..............gggdpcppppppggggg...",
    "....................................................................dddggggggdd............gggppxxxxxxxxppgggg..",
    ".............................gggg......................g............ddggggggggfd.........ggggpxxxxxxxxxxxxpggg..",
    ".........gg.................fgggggg...................gggfggg.......ddggggggggdd.........gggpxxxxxxxxxxxxxxpggg.",
    "........gggg...............ggggggggg.................ggggffgg.......ddgggggggggg........ggggpxxxxxxxxxxxxxxpggg.",
    "........gggf..............ggggggggggg...............ggggffffggg.....ddgggggggppgg.....ggggggxxxxxxrrrrxxxxxcggd.",
    "........gggf..............gggggggggggg............ggggggfffggggg....ddgggggggppggg...gggggggxxxxxrrrrrrxxxxxpdd.",
    "........gggf..............ggggggggggggg..........ggggpgfffggggg......gggggggggppggggggpppgggxxxxxrrrrrrxxxxxpdd.",
    ".........gg...............ggggggggggggggggggg...gggpppfffgggggg.......ggggggggppgggggppppppfxxxxxrrrrrrxxxxxpdd.",
    ".........bb...............ggggggggggggggggggggggggpppfffgggggg.....gggggggggggppggggpppppppppxxxxrrrrrrxxxxpdd..",
    ".........bb...............ggggggggpppppppgggggggggppffffgggggg...ggggggggggggggppgggpppfffpppxxxxxrrrrxxxxxpdd..",
    ".........bbg..............gggggggpppggppppgggggggppgffffggggg...ggggggggggg.gggppggggpffffgpppxxxxxxxxxxxxxddd..",
    ".......ggbbg................gggggggggggggggggggggppgffffffgg...ggggggggggggggggpppgggggg..ggppxxxxxxxxxxxxpddd..",
    "......gggbbgg.................gggggggggggpgggggggppfffffffgg...ggpppggggggggggggppgggggg...gpppxxxxxxxxxxpddd...",
    "......gggddggg....................g...gggpgggggggppfffgffgg.bbbbpppgggggggggggggggpggpgff..ggpppxxxxxxxxpddd....",
    "......gggddgggg.......................dggppppggggppfff...gppbbbbppppppppppggggggggggpppggg.ggggppxxxxxcpgddd....",
    ".....ggggddgggggg.....................dggppppgggppfffg....ppbbbbpppppppppppgggggggggppppggf.gggggdppppggddd.....",
    ".....gggggddgggggggg..................fffppppggpppgffg...ppp....pppppppppppggggggggggpppggg..gggggdddggggd......",
    "......ggggddddggggggg.................ffffpppgpppggggg...pp......pppppppppggppppgggggppggggg.ggggggdddddg.......",
    "......ggggggddddgggdgg.................ffffpppppppggggg.ppp.........gggg..ggppppppfgpppgdddgggggggggdddggg......",
    ".......gggggggddggggddd.......dddf......fffppppppppggggppp......fff..ggggggppppppppppddddddddddggggggddgggd.....",
    "........gggggggddggggdd.....dddddfffff..fffpppddppppggppp.....gffffggggggggpppgggppppdddddddddddggggffddggggg...",
    "...........ggggddggggdd....ddddddffdddddddfpppddggpppppp.....ggffpggggddgggpppgggggppggdddddddddgggffffddgddgg..",
    "............ggggddggpdd....ddpppppdddddddddppddggffppppg....gggpppppddddddggppggggggppggdddddddddggfffffdgddgg..",
    ".............gggddddppd...ddppppppppppddddpppfggffffppggg..gggppppdddddddddgppggggggppgggdddddddddwfffffggggg...",
    ".............ggggdddppd...ddppdddppppppdggppfffgffffppgggggggpppgdddddddddddppggggggppgggggddgggwwwwfffffggggg..",
    "...........ggggggdddppddddddpppddddddpppppppfff..fffpppgggggpppgddddddddddddppggggggppgggggggggggwwffffffgggggg.",
    ".........ggggggggdddppdddddddppdddddddpppppffff..ffffppggggpppddddxxxdddddddppggggggpppggggggggggfffffffffgffgg.",
    ".........ggggggggddggggggddddggggddddddgppffff...fffgpppggpppdddddxdddddddxdppgggggggpgggggggggggfffffffffggggg.",
    "........ggggggggggddppppppppppppgdd...dgfffff.....fffgppppppddddddxddddddxxdppggg..ggggggggggggggfggggfggggggggg",
    "........ggggggggggggpxxxxxxxxxxpgdd.....gggg.......ffgpppppddddgddddddxdddddpgggg..ggggggggggggggggggggggggggggg",
    "........ffggggggggggpxxxxxxxxxxppdd..d...g.........fggggdddddddgddddddxdddddggggg..gggggggggggggggggffgwwwwwwwwg",
    ".ff.g...fffgggpppppppxxxxxxxxxxppddddddgg..........fggggdddd..dggdddddddddddggggggggffffffgggggggggfwwwwwwwwwwwg",
    ".fgggg..ffffggggpppppxxxxxxxxxxpppddfpfggg..........ggg.......ggdddddxdddddfggggggggfffffffgggggggwwwwwwggggwwwg",
    "ggggggfffffffffggfggpxxxxxxxppppppdfppppgg..........ggg.......gddddppddddgffggggggggffffffffgggggwwwwfffgggggggg",
    "gggffggffffff....fggpxxxxxxxppdppddpppppggg.......ffgggg......dddggpppppppppgpppppppfffffffffggwwwwffffggggggggg",
    "gffffgggfffff....fggpxxxxxxxpxxpgdpppfpppgg.....gfffggggg...gdddggggdggpppppppgggpppffffffffffwwwwgfffgggggggggg",
    "gwwwwwwwggffff.ffgggpxxxxxxxddxpgpppdggppdg...ggffffgppggggggdddggggdgffffgbbwwwwwggfffffffffwwwgggffgggggggggg.",
    "fwwwwwwwwwffffggpppgpxxxxxxxppxpgppggggppdg..gggfffpppppggggggddgfgdggfffwwbbwwwwwwwwwwwwwwwwwwgggggggggggggggg.",
    "ggfggfwwwwwggggppppppxppxxxxxpxpgpgggggppdgggggggppppppppggggggddddgggffwwbbwggggwwwwwwwwwwwwwggggggggggggggggg.",
    "ggggffffwwwwggppggggppppppppppppgggggggpppggggppppppggppggggggggdddggfwwwbbpggggggggffwwwwwwfgggggggg.gg........",
    "ggggfffffwwwwpppggggggggggggppppggggggggppggppppppggggppggggggggddgggwwwwbpggggggggggffffffffggggg..............",
    ".gggffffffwwwbpggggggggggggggggggggggggdpppppppggwwwwwbbwwwwwggggggwwwwwppgggggggggggfffffgffffgg...............",
    ".ggggffffffwwbbwggggggggggwwgggggggggggddppppggwwwwwwbbbwwwwwwwwwwwwwwwfppggggggggggffffffgfff..................",
    ".gggggfffffdwbbwwgggggggggwwwwggggggggggddddwwwwwwwwwpppggwwwwwwwwwwwwfffppggggggggggffffg......................",
    ".gggggggfffddgbbwwwwwgggwwwwwwwwwwggggggdwwwwwwwwffffssgggggggggwwwggffffgppgggggggggffff.......................",
    ".gggggggddddgggbbwwwwwwwggggwwwwwwwwwwwwwwwwwgggffffpssggggggggggggggggffggppggggg..............................",
    ".....g.ggddggggppgwwwwgggggggggwwwwwwwwwwwdddddgffffpppggggggggggggggggffggppggggg..............................",
    "........ggggggpppgggggggggggggggggggggggddddddddffffpppggppppgggggppgggggggppgggggg.............................",
    "........ggggspppggggggggggggggggdgggggggdddddddfffffppgpppppppgggsssspgggggpppppggggg...........................",
    "........ggppssgggggggggggggggggggdddgggdddddddfffffdppppppggpppggssdppppggppppppppggg...........................",
    "........ggspgggggggggggggggg..gggddddggddddd....ffffppppggggpppggppdddppppppggggssgggf..........................",
    "........ggsgggggggggggggggg....gg................ggggggggggggppggppdddddpppgggggsspgf...........................",
    ".......gggppggggggggggggggg.....................gggppggggggggpppgppdddddgggg...ggppgg...........................",
    ".......gggppppsspsspggggggg....................fggppppppppgggpppgppdd..dggg....ggssgg..ffffgggg.................",
    "........gggpppsspsspggfgggg...................ffgpppppppppppppppgppdd...........gssgggggfffggggggggg............",
    "........gggppgggggggggggggg....................fggppgppppppppppgpppd............ggppppppppppggggggggf...........",
    ".......ggggppgggg.gggggggg.....................gggpppppggpppppppppgg.............ggpppppppppppgggggggg..........",
    ".......gggpppgg.....ggggg......................gggppppgffffffgggggg...............gfffffgdggppgggggggg..........",
    "......ggggppggg......gggg...............d..ddd.gggpppgffffffffgggg.....................ggddggfggggggggg.........",
    "......gggppggg........................ddddfddggggggppgffff.................................fffggggggggg.........",
    "......gggppggg.......................fddpppfffgggggppfff...................................ffffgggggggg.........",
    ".....ggggppggg.....................gfffgppgfffffggpppfff...................................ffffgggggggg.........",
    ".....ggggppgggg...................ggffgggpgfffpppppppfff...................................ffffgggggggg.........",
    ".....ggggppggggggg...............gggffgggggfffpppppppggf....................................fffggggggg..........",
    "......ggggppgggggggg............gggfffgggggfffgpppppggg......................................ffgggg.............",
    ".......gggppssgggggggfffff.....gggfffffggggfffgpppppgd..........................................................",
    ".......ggggpsspssggggfffffg...gggfffgggggggffffggpgggg..........................................................",
    ".......ggggggggsspgggffffggggggggfffgggggggffffffgggg...........................................................",
    "........gggggggggpgppppppppggggggffgggggggfffffffgg.............................................................",
    ".........ggggggggppppppppppppppggffgggfffffffffffgg.............................................................",
    "...........ggggggpppgffffpppppssssggffffffffffffggg.............................................................",
    "............ggggpppggggggggggsspssgfffffffffffffggg.............................................................",
    "....ggggg...gdgpppgggggggggggggdsssfffffffffffffgg..............................................................",
    "...ggggddddddddpppggg.......gdddddsffffffffffffg................................................................",
    "...gggdddddddddppggg..........dddfssfffffffffff.................................................................",
    "..ggggdggdddddpppggg...........ddfpsffffffffff..................................................................",
    ".ggggggggggdddpppggg...........ddfpfffffffff....................................................................",
    ".gggggggggggddpppggg..........dddppfg.fffff.....................................................................",
    ".fggggggggggdfpppfgg.......ggggddppd............................................................................",
    ".ggggggggggggfpppffg......gggffgdpdd............................................................................",
    ".gggggggggggppppffff.....ggggffgppdd............................................................................",
    ".ggggggggggfppppfff.....gggffffpppdd............................................................................",
    ".ggggggggggfffffff.....gfffffffggdd.............................................................................",
    ".ggggggggggffffgf......gffffffffgdd.............................................................................",
    ".ggggggggggff..g.......gfffffffffff.............................................................................",
    "..ggggggggff...........ffffffffffff.............................................................................",
    "...ggggggg..............gffffffffff.............................................................................",
    "................................................................................................................"
   ],
   "heights": [
    "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000040445444422222222222200000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000552222224222222222222220000000000000000000000000000000000000000000000000000444400000000000",
    "0000000000000000000002222222222222222222222224440000000000000000000000000000044440000000000000055222440000000000",
    "0000000002230000000022222222222226666222222246665000000000000000000000000002222222000000000000552000222000000000",
    "0000000000245500000222222222622266666622442222446700000000000000000000000022000000222200000005520000002440000000",
    "0000000000224454444222222223366444466664422222222475550000000000000000000000000000002220233022200000000240000000",
    "0000000000022200024222222223334444446666222222222246445000002000000000000000000000000222000220000000000240000000",
    "0000000000000000002212222663344444444666222222222244222200002000000000002200000000000022200000000000000020000000",
    "0000000000000000001111022666444444444663222222222242222200002000000000002000000000000020000000000000000020000000",
    "0000000002000000000112000066444444444633222222222222222200002000000000000000000000000000000222000000000020000000",
    "0000000022000000000112000066444444444333222222222222222200000000000000000000000000000000000222000000000220000000",
    "0000000022200000000200000666444444444336222222222224222200000000000000002220000000000002000000200000000220000000",
    "0000000022200000000200000666444444443366422222222442222200000000000000002220000000000222000000220000002200000000",
    "0000000002220000000220000066664444433664422222224442202000000000000000000020000000002000000000022200222000000000",
    "0000000002220000002220000066666444333660044222244420000000000000000000000002000000020000000000005442220000000000",
    "0000000000022000002220000000066666333640004444442000000000000000000000000000220002000000000000000000000000000000",
    "0000000000002222222000000000000666633440000044200000000000000000000000000000022200000000000000000000000000000000",
    "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000000000000000000000000000000000066066600000000000000000688888888892220000",
    "0000000000000000000000000000000000000000000000000000000000000000000000664444400000000000000008866444446668820000",
    "0000000000000000000000000000000000000000000000000000000000000000000004444444440000000000000066444444444446686000",
    "0000000000000000000000000000000000000000000000000000000000000000000064444444444000000000000664444444444444468700",
    "0000000000000000000000000000066660000000000000000000000400000000000064444444444400000000068644444444444444446800",
    "0000000004400000000000000000444444400000000000000000004444444000000064444444444400000000068644444444444444446870",
    "0000000044440000000000000004444444460000000000000000044444444000000064444444444400000000668444444444444444444620",
    "0000000044440000000000000044444444466000000000000000444444444460000074444444444440000066688444444444444444444680",
    "0000000044440000000000000044444444446600000000000044444444444466000064444444444444000444466444444444444444444660",
    "0000000044440000000000000044444444444660000000000444444444444440000004444444444444444444466444444444444444444660",
    "0000000004400000000000000044444444444466666660006444444444444440000000444444444444444444444444444444444444444660",
    "0000000004400000000000000044444444444444444446666444444444444400000444444444444444444444444444444444444444444600",
    "000000000440000000000000004444444444444444444446444444444444440004ggggg44444444444444444444444444444444444444600",
    "00000000044400000000000000444444444444444444444444444444444440004gggggggg440444444444444446444444444444444446600",
    "00000004444400000000000000004444444444444444444444444444444400044gggggggdd44444444444444004644444444444444446400",
    "00000044444440000000000000000076644444444444444444444444444400044fggggggddd4444444444444000644444444444444466000",
    "0000004444444400000000000000000000400066444444444444444444406666fffgggggdaa4444444444444400464444444444444660000",
    "00000044444444700000000000000000000000664444444444444400045566666eeddcccbbaa444444444444460446644444444446640000",
    "00000664444446677000000000000000000000664444444444444400005566666eeddcccbbaa444444444444466044664444444666400000",
    "000006644444444667770000000000000000006644444444444444000445000077778889aaaa044444444444466004466644466664000000",
    "000000666444444446667000000000000000006644444444444444000440000006778889a9a4444444444444446704444664446440000000",
    "0000007664444444444444000000000000000007644444444444444044400000000044440044444444444444444677444444444446000000",
    "0000000766444444444444600000007766000000764444444444444444000000666006666664444444444444444444444444444446600000",
    "0000000066644444444444600000444466667700764444444444444440000044466666666664444444444444444444444444444444666000",
    "0000000000066644444444600004444444466677744444444444444400000446646664444464444444444444444444444444444444466600",
    "0000000000007644444444400004444444444446444444444444444400004464444444444446444444444444444444444444444444444600",
    "0000000000000764444444400074444444444444444444444444444460044644444444444444446444444444444444444444444444444000",
    "0000000000000764444444400074444444444444444444444444444466444444444444444444446444444444444444444444444444444600",
    "0000000000066764444444476664444444444444444444400664444444444446444444444444446444444444444444444444444444444660",
    "0000000006666664444444444464444444444444444444400664444444444466444444444444446444444444444444444444444444444660",
    "0000000004444444444444444444444444444444444444000666444444444666444444444444446444444444444444444444444444444460",
    "0000000074444444444444444444444444400044444440000076444444444666444444444444446440064444444444444444444444444044",
    "0000000074444444444444444444444444400000666400000006644444444664444444444444466440064444444444444444444444444444",
    "0000000074444444444444444444444444400400060000000006644444444666444444444444466440064444444444444444444000000000",
    "0660600074444444444444444444444444444444400000000006664444440086444444444444466447664444444444444444000000000004",
    "0666660066444444444444444444444444444444440000000000664000000088644444444444666446644444444444444400000044440004",
    "6646666666444444444444444444444444444444440000000000666000000088666444444466666444444444444444444000044444444444",
    "6646466666444000044444444444444444444444446000000066664400000066644444444444644444444444444444400004444444444444",
    "4444444444444000044444444444444444444444446000006666444440006664444466644444444444444444444444000044244444444444",
    "4444444444444404444444444444444444444444446000446644444447666664444466666644422222444444444440004442244444444440",
    "4444444444444444444444444444444444444444444004444444444444666644444444444224422222222222222220044006644444422440",
    "4444444444444444444444444444444444444444444444444444444444664444444444442244244442222222222220444466444444444440",
    "6664444444444444444444444444444444444444444444444444444444424444244444222444444444444422222244444464404400000000",
    "6644444444444444444444444444444444444444444444444444444444422222222442222444444444444444444444444400000000000000",
    "0664444444444444444444444444444444444444444444444444444444422222222222224444444444444444444444444000000000000000",
    "0664444444444444444444444444444444444444444444444444433344442222222222244444444444444444444444000000000000000000",
    "0664444444444444444444444444444444444444444444444444433344422222222222444444444444444444440000000000000000000000",
    "0664444444444444444444444444444444444444444444444444233224222222222224444444444444444444400000000000000000000000",
    "0664444442244444444444444444444444444444444444444442222224222222222224444444444444000000000000000000000000000000",
    "0000040744444444444444444444444444444444444444444422222222222222224444444444444444000000000000000000000000000000",
    "0000000054644444444444444444444444444444444444444422222222222222223344444444444444400000000000000000000000000000",
    "0000000052444444440000000044444444444444444424444422222222222222233344444444444444466000000000000000000000000000",
    "0000000052333444440000000000444444444444444422222222222222222222222444444444444444466000000000000000000000000000",
    "0000000042334444400000000000002644444444444200004422222222222222222444444444444444446600000000000000000000000000",
    "0000000042224400000000000000000260000000000000000422222222222222222244444444444433322000000000000000000000000000",
    "0000000442222222200000000000000000000000000000002222222222222222222224444444000443322000000000000000000000000000",
    "0000000442222221110000000000000000000000000000042222222222222222222220076640000223322005555554400000000000000000",
    "0000000042222221110000000000000000000000000000442222222222222222222220000000000022222222222224444444000000000000",
    "0000000044222200022000000000000000000000000000042222222222222222222200000000000022222222222222244444600000000000",
    "0000000442222200000000000000000000000000000000042222222222222222222200000000000002222222222222222222670000000000",
    "0000000442222200000000000000000000000000000000022222222222222222222000000000000000222222222222222222660000000000",
    "0000004422222220000000000000000000000000200555022222222222222222220000000000000000000002222222222222267000000000",
    "0000004422222200000000000000000000000042222222222222222222000000000000000000000000000000000422222222246000000000",
    "0000004422222200000000000000000000000442222222222222222200000000000000000000000000000000000422222222244000000000",
    "0000044222222200000000000000000000022222222222222222222200000000000000000000000000000000000422222222224000000000",
    "0000044222222240000000000000000000222222222222222222222200000000000000000000000000000000000522222222222000000000",
    "0000044222222244220000000000000002222222222222222222222200000000000000000000000000000000000002222222220000000000",
    "0000004422222222222200000000000022222222222222222222222000000000000000000000000000000000000002222220000000000000",
    "0000000442222120002222222200000222222222222222222222220000000000000000000000000000000000000000000000000000000000",
    "0000000442222111000222222220002222222222222222222222220000000000000000000000000000000000000000000000000000000000",
    "0000000444222221000000000000222222222222222222222222200000000000000000000000000000000000000000000000000000000000",
    "0000000044422220000000000000000022222222222222222220000000000000000000000000000000000000000000000000000000000000",
    "0000000006642220000000000000000002222222222222222220000000000000000000000000000000000000000000000000000000000000",
    "0000000000074000000000000000000112222222222222222220000000000000000000000000000000000000000000000000000000000000",
    "0000000000002000000000000000001112222222222222222220000000000000000000000000000000000000000000000000000000000000",
    "0000333330000000000000000000000012122222222222222200000000000000000000000000000000000000000000000000000000000000",
    "0003300000000000000000000000322220112222222222220000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000005420012222222222200000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000220002222222222000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000300000222222200000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000003300000022222000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000002223200000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000022222000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000220000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000002200000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000022000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000022000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000022200000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000032200000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000003200000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
   ],
   "start": {
    "x": 7.5,
    "y": 104.8
   },
   "portals": [
    {
     "x": 5,
     "y": 106.6,
     "to": "vale",
     "open": true,
     "marker": false,
     "arrive": {
      "x": 50.41,
      "y": 70.71
     },
     "id": "home"
    },
    {
     "x": 102.5,
     "y": 27,
     "to": "vale",
     "open": false,
     "marker": false,
     "arrive": {
      "x": 50.41,
      "y": 70.71
     },
     "id": "home_arena"
    },
    {
     "x": 97.5,
     "y": 27,
     "to": "ruins",
     "open": false,
     "marker": true,
     "id": "next"
    }
   ],
   "objects": [
    {
     "t": "lantern",
     "x": 8.2,
     "y": 101.4
    },
    {
     "t": "sign",
     "x": 11.2,
     "y": 100.6,
     "label": "sign",
     "text": "North: the Root Hollow. Mind the creek."
    },
    {
     "t": "sign",
     "x": 35.5,
     "y": 86.5,
     "label": "sign",
     "text": "Danger: ogres in the clearing"
    },
    {
     "t": "shrine",
     "x": 44,
     "y": 86,
     "id": "shrine1",
     "name": "The road to the plaza",
     "label": "checkpoint",
     "warp": true
    },
    {
     "t": "shrine",
     "x": 66,
     "y": 60,
     "id": "shrine2",
     "name": "The creek ford",
     "label": "checkpoint",
     "warp": true
    },
    {
     "t": "shrine",
     "x": 67.6,
     "y": 34,
     "id": "shrine3",
     "name": "Hawk's Rest",
     "label": "checkpoint",
     "warp": true
    },
    {
     "t": "shrine",
     "x": 23.5,
     "y": 6,
     "id": "hollow_shrine",
     "name": "Root Hollow midpoint",
     "label": "midpoint checkpoint",
     "warp": false
    },
    {
     "t": "tablet",
     "x": 30,
     "y": 107.2,
     "role": "tablet",
     "label": "lore",
     "title": "Warden stone",
     "text": "Bramblehorn kept the roots. He loved the roots too much."
    },
    {
     "t": "chest",
     "x": 31.3,
     "y": 108.6,
     "role": "chest",
     "label": "tablet-chest",
     "tier": "wood"
    },
    {
     "t": "chest",
     "x": 96,
     "y": 83.6,
     "role": "chest_silver",
     "tier": "silver",
     "label": "elite-chest"
    },
    {
     "t": "lantern",
     "x": 46.11,
     "y": 92.14
    },
    {
     "t": "lantern",
     "x": 36.98,
     "y": 86.98
    },
    {
     "t": "lantern",
     "x": 25.73,
     "y": 63.97
    },
    {
     "t": "lantern",
     "x": 20.04,
     "y": 58.17
    },
    {
     "t": "lantern",
     "x": 26.48,
     "y": 52.05
    },
    {
     "t": "rock_dark",
     "x": 25.63,
     "y": 64.61,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 19.38,
     "y": 58.18,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 25.86,
     "y": 51.47
    },
    {
     "t": "stump",
     "x": 42.16,
     "y": 97.5
    },
    {
     "t": "stump",
     "x": 35.14,
     "y": 88.86
    },
    {
     "t": "log",
     "x": 44.77,
     "y": 93.84
    },
    {
     "t": "sunbeam",
     "x": 42.2,
     "y": 93.4
    },
    {
     "t": "sunbeam",
     "x": 10.2,
     "y": 105.4
    },
    {
     "t": "pine_giant",
     "x": 67.2,
     "y": 68.1,
     "v": 1
    },
    {
     "t": "sunbeam",
     "x": 65,
     "y": 69.5
    },
    {
     "t": "fox",
     "x": 17.96,
     "y": 98.59
    },
    {
     "t": "rabbit",
     "x": 15.42,
     "y": 95.77
    },
    {
     "t": "rabbit",
     "x": 13.37,
     "y": 97.36
    },
    {
     "t": "fox",
     "x": 36.83,
     "y": 92.28
    },
    {
     "t": "rabbit",
     "x": 39.83,
     "y": 94.61
    },
    {
     "t": "rabbit",
     "x": 38.39,
     "y": 96.77
    },
    {
     "t": "fox",
     "x": 52.83,
     "y": 79.48
    },
    {
     "t": "rabbit",
     "x": 49.03,
     "y": 79.49
    },
    {
     "t": "rabbit",
     "x": 48.86,
     "y": 82.09
    },
    {
     "t": "fox",
     "x": 51.11,
     "y": 72
    },
    {
     "t": "rabbit",
     "x": 54.83,
     "y": 71.25
    },
    {
     "t": "rabbit",
     "x": 55.53,
     "y": 73.75
    },
    {
     "t": "fox",
     "x": 36.54,
     "y": 55.79
    },
    {
     "t": "rabbit",
     "x": 36.92,
     "y": 59.56
    },
    {
     "t": "rabbit",
     "x": 39.52,
     "y": 59.49
    },
    {
     "t": "fox",
     "x": 30.98,
     "y": 45.21
    },
    {
     "t": "rabbit",
     "x": 32.33,
     "y": 48.76
    },
    {
     "t": "rabbit",
     "x": 29.97,
     "y": 49.85
    },
    {
     "t": "fox",
     "x": 60.93,
     "y": 52.65
    },
    {
     "t": "rabbit",
     "x": 59.29,
     "y": 49.22
    },
    {
     "t": "rabbit",
     "x": 56.87,
     "y": 50.17
    },
    {
     "t": "fox",
     "x": 83.56,
     "y": 42.04
    },
    {
     "t": "rabbit",
     "x": 86.26,
     "y": 44.7
    },
    {
     "t": "rabbit",
     "x": 84.57,
     "y": 46.68
    },
    {
     "t": "fishspot",
     "x": 51.5,
     "y": 68.5,
     "role": "fishspot",
     "pool": "pinewood_a"
    },
    {
     "t": "fishspot",
     "x": 83.5,
     "y": 60.5,
     "role": "fishspot",
     "pool": "pinewood_b"
    },
    {
     "t": "lantern",
     "x": 28.66,
     "y": 32.86
    },
    {
     "t": "lantern",
     "x": 30.48,
     "y": 27.91
    },
    {
     "t": "lantern",
     "x": 59.77,
     "y": 32.31
    },
    {
     "t": "lantern",
     "x": 56.81,
     "y": 28.02
    },
    {
     "t": "lantern",
     "x": 71.64,
     "y": 28.87
    },
    {
     "t": "lantern",
     "x": 73.51,
     "y": 24.04
    },
    {
     "t": "lantern",
     "x": 91.7,
     "y": 54.26
    },
    {
     "t": "lantern",
     "x": 86.7,
     "y": 54.74
    },
    {
     "t": "lantern",
     "x": 88.84,
     "y": 49.94
    },
    {
     "t": "hidden",
     "x": 18.11,
     "y": 78.01,
     "role": "hidden",
     "id": "wall_crack",
     "ang": 0,
     "len": 2.4
    },
    {
     "t": "lantern",
     "x": 15.92,
     "y": 76.4,
     "label": "crack-lantern",
     "pointsAt": "wall_crack"
    },
    {
     "t": "crystal_violet",
     "x": 22,
     "y": 78,
     "role": "gem_cache",
     "label": "secret gem cache"
    },
    {
     "t": "gate",
     "x": 10,
     "y": 36.6,
     "role": "gate",
     "id": "bridge_gate",
     "ang": 1.57,
     "len": 2
    },
    {
     "t": "lever",
     "x": 19.6,
     "y": 46.2,
     "role": "lever",
     "label": "bridge-lever",
     "id": "lever_bridge",
     "gate": "bridge_gate"
    },
    {
     "t": "chest",
     "x": 10.9,
     "y": 29.6,
     "role": "chest_gold",
     "tier": "gold",
     "label": "secret-gold-chest"
    },
    {
     "t": "tablet",
     "x": 9.1,
     "y": 28.5,
     "role": "tablet",
     "label": "lore",
     "title": "Islet stone",
     "text": "The Wardens left a rune where the water cannot reach it."
    },
    {
     "t": "chest",
     "x": 99.4,
     "y": 47.8,
     "role": "chest_silver",
     "tier": "silver",
     "label": "detour-chest"
    },
    {
     "t": "fishspot",
     "x": 100.5,
     "y": 47.5,
     "role": "fishspot",
     "pool": "pinewood_hidden",
     "hidden": true
    },
    {
     "t": "lantern_blue",
     "x": 97.05,
     "y": 46.54,
     "label": "detour-lantern"
    },
    {
     "t": "hidden",
     "x": 103.84,
     "y": 45.58,
     "role": "hidden",
     "id": "wall_env",
     "ang": 0.96,
     "len": 1.8
    },
    {
     "t": "keydoor",
     "x": 14.99,
     "y": 55.35,
     "role": "keydoor",
     "id": "door_cache",
     "key": "key_rootcache",
     "ang": -2.75,
     "len": 1.8
    },
    {
     "t": "chest",
     "x": 12,
     "y": 54,
     "role": "chest_gold",
     "tier": "gold",
     "label": "cache-chest"
    },
    {
     "t": "shrine",
     "x": 46.2,
     "y": 37.4,
     "id": "door_shrine",
     "name": "The root door",
     "label": "checkpoint",
     "warp": true
    },
    {
     "t": "gate",
     "x": 40.54,
     "y": 9.04,
     "role": "gate",
     "id": "gate_h_r2",
     "ang": -0.93,
     "len": 2.4
    },
    {
     "t": "gate",
     "x": 25.7,
     "y": 4.19,
     "role": "gate",
     "id": "gate_h_short",
     "ang": 2.54,
     "len": 1.8
    },
    {
     "t": "lever",
     "x": 36,
     "y": 16.2,
     "role": "lever",
     "label": "gate-lever",
     "id": "lever_h_r2",
     "gate": "gate_h_r2"
    },
    {
     "t": "lever",
     "x": 47.4,
     "y": 12.9,
     "role": "lever",
     "label": "shortcut-lever",
     "id": "lever_h_short",
     "gate": "gate_h_short"
    },
    {
     "t": "chest",
     "x": 45,
     "y": 9.5,
     "role": "chest_gold",
     "tier": "gold",
     "label": "mini-boss-chest",
     "guaranteed": "epic"
    },
    {
     "t": "crystal_violet",
     "x": 24,
     "y": 15.5,
     "role": "rune_cache",
     "label": "secret socket rune"
    },
    {
     "t": "hidden",
     "x": 21.74,
     "y": 13.66,
     "role": "hidden",
     "id": "wall_h_crack",
     "ang": 0.94,
     "len": 2.2
    },
    {
     "t": "lantern",
     "x": 21.64,
     "y": 11,
     "label": "crack-lantern",
     "pointsAt": "wall_h_crack"
    },
    {
     "t": "tablet",
     "x": 16.5,
     "y": 9.2,
     "role": "tablet",
     "label": "lore",
     "title": "Warden stone",
     "text": "The first Warden sealed Mossjaw here to keep the Gloam from the pines."
    },
    {
     "t": "crystal",
     "x": 12.87,
     "y": 15.32
    },
    {
     "t": "crystal",
     "x": 30.75,
     "y": 14.53
    },
    {
     "t": "crystal",
     "x": 45,
     "y": 15.01
    },
    {
     "t": "shrine",
     "x": 37.82,
     "y": 10.69,
     "id": "den_shrine",
     "name": "Mossjaw's gate",
     "label": "checkpoint",
     "warp": true
    },
    {
     "t": "crystal_violet",
     "x": 31.5,
     "y": 8.04,
     "label": "ceiling-tell"
    },
    {
     "t": "chest",
     "x": 99,
     "y": 9,
     "role": "chest_gold",
     "tier": "gold",
     "label": "warrens-chest",
     "guaranteed": "epic",
     "loot": "belt"
    },
    {
     "t": "crystal",
     "x": 79.99,
     "y": 14.83
    },
    {
     "t": "crystal",
     "x": 80.37,
     "y": 5.2
    },
    {
     "t": "crystal",
     "x": 103.14,
     "y": 9.68
    },
    {
     "t": "crystal",
     "x": 98.79,
     "y": 13.57
    },
    {
     "t": "crystal",
     "x": 98.89,
     "y": 5.48
    },
    {
     "t": "gate",
     "x": 95.06,
     "y": 37.51,
     "role": "gate",
     "id": "arena_gate",
     "ang": 0.65,
     "len": 2.4
    },
    {
     "t": "brazier",
     "x": 103.83,
     "y": 34.43
    },
    {
     "t": "brazier",
     "x": 96.23,
     "y": 34.51
    },
    {
     "t": "brazier",
     "x": 96.18,
     "y": 27.35
    },
    {
     "t": "brazier",
     "x": 103.58,
     "y": 27.05
    },
    {
     "t": "chest",
     "x": 104.68,
     "y": 26.33,
     "role": "chest_gold",
     "tier": "gold",
     "label": "boss-chest",
     "loot": "amulet"
    },
    {
     "t": "pine_giant",
     "x": 67.4,
     "y": 34.6,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 74.8,
     "y": 42.2
    },
    {
     "t": "rock_dark",
     "x": 76.4,
     "y": 40.8
    },
    {
     "t": "rock",
     "x": 9.1,
     "y": 53.75,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 45.16,
     "y": 50.35,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 36.55,
     "y": 99.06,
     "v": 1
    },
    {
     "t": "rock",
     "x": 94.7,
     "y": 48.74,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 98.97,
     "y": 86.3,
     "f": 1
    },
    {
     "t": "rock",
     "x": 33.81,
     "y": 43.76,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 28.47,
     "y": 26.18,
     "v": 1
    },
    {
     "t": "rock",
     "x": 77.96,
     "y": 70.04
    },
    {
     "t": "rock",
     "x": 100.62,
     "y": 54.02,
     "v": 2
    },
    {
     "t": "rock",
     "x": 7.38,
     "y": 87.44,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 14.77,
     "y": 86.96,
     "f": 1
    },
    {
     "t": "rock",
     "x": 53.22,
     "y": 36.47,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 77.17,
     "y": 62.97,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 31.86,
     "y": 34.81,
     "v": 2
    },
    {
     "t": "rock",
     "x": 98.17,
     "y": 60.85,
     "f": 1
    },
    {
     "t": "rock",
     "x": 72.55,
     "y": 45.55,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 18.89,
     "y": 41.04,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 45.65,
     "y": 72.67,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 45.1,
     "y": 84.31,
     "f": 1
    },
    {
     "t": "rock",
     "x": 107.46,
     "y": 57.82,
     "f": 1
    },
    {
     "t": "rock",
     "x": 70.79,
     "y": 71.65
    },
    {
     "t": "rock",
     "x": 35.87,
     "y": 73.21,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 7.05,
     "y": 41.58,
     "v": 1
    },
    {
     "t": "rock",
     "x": 32.36,
     "y": 90.16,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 99.29,
     "y": 55.41
    },
    {
     "t": "rock",
     "x": 33.97,
     "y": 110.5,
     "v": 1
    },
    {
     "t": "rock",
     "x": 2.15,
     "y": 55.21,
     "v": 1
    },
    {
     "t": "rock",
     "x": 87.81,
     "y": 33.97,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 82.42,
     "y": 50.95,
     "f": 1
    },
    {
     "t": "rock",
     "x": 34.61,
     "y": 107.48
    },
    {
     "t": "rock",
     "x": 39.06,
     "y": 40.02
    },
    {
     "t": "rock",
     "x": 63.43,
     "y": 63.05,
     "v": 2
    },
    {
     "t": "rock",
     "x": 21.71,
     "y": 74.67,
     "f": 1
    },
    {
     "t": "rock",
     "x": 99.84,
     "y": 81.25
    },
    {
     "t": "rock",
     "x": 8.37,
     "y": 64.54,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 99.84,
     "y": 59.7,
     "v": 1
    },
    {
     "t": "rock",
     "x": 69.87,
     "y": 60.06
    },
    {
     "t": "rock",
     "x": 101.91,
     "y": 60.11
    },
    {
     "t": "rock",
     "x": 8.15,
     "y": 37.94,
     "v": 1
    },
    {
     "t": "rock",
     "x": 46.74,
     "y": 98,
     "v": 1
    },
    {
     "t": "rock",
     "x": 43.17,
     "y": 73.99,
     "v": 2
    },
    {
     "t": "rock",
     "x": 19.08,
     "y": 72.46,
     "v": 2
    },
    {
     "t": "rock",
     "x": 60.06,
     "y": 26.22,
     "v": 2
    },
    {
     "t": "rock",
     "x": 13.44,
     "y": 57.42,
     "f": 1
    },
    {
     "t": "rock",
     "x": 26.97,
     "y": 109.21,
     "v": 1
    },
    {
     "t": "rock",
     "x": 35.9,
     "y": 28.83
    },
    {
     "t": "rock",
     "x": 62.93,
     "y": 44.31,
     "v": 1
    },
    {
     "t": "rock",
     "x": 34.59,
     "y": 72.78,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 34.32,
     "y": 37.16
    },
    {
     "t": "rock",
     "x": 57.02,
     "y": 35.03,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 25.61,
     "y": 50.2
    },
    {
     "t": "rock",
     "x": 40.98,
     "y": 68.73,
     "f": 1
    },
    {
     "t": "rock",
     "x": 28.29,
     "y": 102.35,
     "v": 2
    },
    {
     "t": "rock",
     "x": 68.92,
     "y": 28.48,
     "v": 1
    },
    {
     "t": "rock",
     "x": 45.5,
     "y": 32.39,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 43.48,
     "y": 31.52,
     "f": 1
    },
    {
     "t": "rock",
     "x": 102.18,
     "y": 63.59,
     "f": 1
    },
    {
     "t": "rock",
     "x": 15.25,
     "y": 88.85,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 85.9,
     "y": 63.91
    },
    {
     "t": "rock",
     "x": 17.82,
     "y": 89.18,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 110.92,
     "y": 53.35,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 59.4,
     "y": 74.61,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 90.35,
     "y": 47.75,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 44.41,
     "y": 52.61,
     "v": 2
    },
    {
     "t": "rock",
     "x": 2.52,
     "y": 56.65,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 74.92,
     "y": 32.61,
     "f": 1
    },
    {
     "t": "rock",
     "x": 25.76,
     "y": 79.78,
     "v": 1
    },
    {
     "t": "rock",
     "x": 70.12,
     "y": 68.83,
     "v": 1
    },
    {
     "t": "rock",
     "x": 92.83,
     "y": 57.96
    },
    {
     "t": "rock",
     "x": 72.37,
     "y": 21.63,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 59.28,
     "y": 68.75,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 18.23,
     "y": 88.04,
     "v": 1
    },
    {
     "t": "rock",
     "x": 91.63,
     "y": 82.21,
     "v": 2
    },
    {
     "t": "rock",
     "x": 98.91,
     "y": 79.5,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 42.96,
     "y": 100.73,
     "v": 1
    },
    {
     "t": "rock",
     "x": 46.15,
     "y": 34.03
    },
    {
     "t": "rock",
     "x": 80.05,
     "y": 56.48,
     "v": 1
    },
    {
     "t": "rock",
     "x": 52.6,
     "y": 38.57,
     "f": 1
    },
    {
     "t": "rock",
     "x": 86.31,
     "y": 66.59,
     "v": 2
    },
    {
     "t": "rock",
     "x": 72.29,
     "y": 22.99
    },
    {
     "t": "rock",
     "x": 25.04,
     "y": 90.11,
     "f": 1
    },
    {
     "t": "rock",
     "x": 16.19,
     "y": 87.88,
     "v": 2
    },
    {
     "t": "rock",
     "x": 86.2,
     "y": 58.06,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 13.93,
     "y": 94.66
    },
    {
     "t": "rock",
     "x": 9.42,
     "y": 56.23
    },
    {
     "t": "rock",
     "x": 40.86,
     "y": 44.56,
     "v": 1
    },
    {
     "t": "rock",
     "x": 82.38,
     "y": 63.42
    },
    {
     "t": "rock",
     "x": 27.9,
     "y": 31.32,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 23.81,
     "y": 89.8,
     "v": 1
    },
    {
     "t": "rock",
     "x": 81.09,
     "y": 38.7,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 9.39,
     "y": 44.31,
     "f": 1
    },
    {
     "t": "rock",
     "x": 79.16,
     "y": 63.94,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 83.05,
     "y": 67.59,
     "v": 2
    },
    {
     "t": "log",
     "x": 22.88,
     "y": 44.4
    },
    {
     "t": "log",
     "x": 23.74,
     "y": 108.46
    },
    {
     "t": "log",
     "x": 102.38,
     "y": 84.08
    },
    {
     "t": "log",
     "x": 70.64,
     "y": 31.81
    },
    {
     "t": "log",
     "x": 4.72,
     "y": 108.13,
     "f": 1
    },
    {
     "t": "log",
     "x": 78.99,
     "y": 68.08,
     "f": 1
    },
    {
     "t": "log",
     "x": 2.35,
     "y": 105.71
    },
    {
     "t": "log",
     "x": 107.7,
     "y": 46.45
    },
    {
     "t": "log",
     "x": 61.95,
     "y": 31.65
    },
    {
     "t": "log",
     "x": 8.98,
     "y": 69.79
    },
    {
     "t": "log",
     "x": 33.82,
     "y": 26.82,
     "f": 1
    },
    {
     "t": "log",
     "x": 110.15,
     "y": 60.47,
     "f": 1
    },
    {
     "t": "log",
     "x": 7.47,
     "y": 110.29,
     "f": 1
    },
    {
     "t": "log",
     "x": 105.52,
     "y": 61.29,
     "f": 1
    },
    {
     "t": "log",
     "x": 64.06,
     "y": 55.05,
     "f": 1
    },
    {
     "t": "log",
     "x": 92.83,
     "y": 85.24,
     "f": 1
    },
    {
     "t": "log",
     "x": 7.34,
     "y": 98.37,
     "f": 1
    },
    {
     "t": "log",
     "x": 94.74,
     "y": 88.09
    },
    {
     "t": "log",
     "x": 101.86,
     "y": 87.12
    },
    {
     "t": "log",
     "x": 62.17,
     "y": 60.65
    },
    {
     "t": "log",
     "x": 69.82,
     "y": 62.38,
     "f": 1
    },
    {
     "t": "log",
     "x": 95.46,
     "y": 51.14,
     "f": 1
    },
    {
     "t": "log",
     "x": 23.68,
     "y": 66.95
    },
    {
     "t": "log",
     "x": 40.91,
     "y": 73.51,
     "f": 1
    },
    {
     "t": "log",
     "x": 84.43,
     "y": 55.43,
     "f": 1
    },
    {
     "t": "log",
     "x": 48.83,
     "y": 95.05,
     "f": 1
    },
    {
     "t": "log",
     "x": 61.22,
     "y": 28.5
    },
    {
     "t": "log",
     "x": 110.47,
     "y": 50.98,
     "f": 1
    },
    {
     "t": "log",
     "x": 104.73,
     "y": 50.7
    },
    {
     "t": "log",
     "x": 11.03,
     "y": 59.87,
     "f": 1
    },
    {
     "t": "log",
     "x": 78.1,
     "y": 25.88
    },
    {
     "t": "log",
     "x": 91.87,
     "y": 77.01,
     "f": 1
    },
    {
     "t": "log",
     "x": 54.3,
     "y": 26.65
    },
    {
     "t": "stump",
     "x": 25.77,
     "y": 106.45
    },
    {
     "t": "stump",
     "x": 4.07,
     "y": 56.02
    },
    {
     "t": "stump",
     "x": 89.99,
     "y": 59.13
    },
    {
     "t": "stump",
     "x": 55.68,
     "y": 55.29
    },
    {
     "t": "stump",
     "x": 75.59,
     "y": 30.09
    },
    {
     "t": "stump",
     "x": 11.93,
     "y": 67.91
    },
    {
     "t": "stump",
     "x": 50.87,
     "y": 59.15
    },
    {
     "t": "stump",
     "x": 39.71,
     "y": 66.38
    },
    {
     "t": "stump",
     "x": 52.97,
     "y": 42.37
    },
    {
     "t": "stump",
     "x": 3.93,
     "y": 67.81
    },
    {
     "t": "stump",
     "x": 65.38,
     "y": 64.85
    },
    {
     "t": "stump",
     "x": 107.24,
     "y": 52.23
    },
    {
     "t": "stump",
     "x": 17.84,
     "y": 65.38
    },
    {
     "t": "stump",
     "x": 1.76,
     "y": 59.33
    },
    {
     "t": "stump",
     "x": 9.54,
     "y": 79.6
    },
    {
     "t": "stump",
     "x": 13.17,
     "y": 102.32
    },
    {
     "t": "stump",
     "x": 99.39,
     "y": 50.38
    },
    {
     "t": "stump",
     "x": 104.24,
     "y": 53.51
    },
    {
     "t": "stump",
     "x": 61.77,
     "y": 82.29
    },
    {
     "t": "stump",
     "x": 89.44,
     "y": 67.48
    },
    {
     "t": "stump",
     "x": 28.97,
     "y": 73.7
    },
    {
     "t": "stump",
     "x": 29.61,
     "y": 34.65
    },
    {
     "t": "stump",
     "x": 2.47,
     "y": 62.44
    },
    {
     "t": "stump",
     "x": 54.64,
     "y": 58.11
    },
    {
     "t": "stump",
     "x": 29.68,
     "y": 103.64
    },
    {
     "t": "stump",
     "x": 78.4,
     "y": 56.1
    },
    {
     "t": "stump",
     "x": 2.08,
     "y": 66.74
    },
    {
     "t": "stump",
     "x": 59.06,
     "y": 61.92
    },
    {
     "t": "stump",
     "x": 17.77,
     "y": 43.03
    },
    {
     "t": "stump",
     "x": 31.69,
     "y": 103.26
    },
    {
     "t": "stump",
     "x": 48.41,
     "y": 73.79
    },
    {
     "t": "stump",
     "x": 11.06,
     "y": 92.9
    },
    {
     "t": "stump",
     "x": 96.76,
     "y": 54.8
    },
    {
     "t": "stump",
     "x": 58.28,
     "y": 76.26
    },
    {
     "t": "stump",
     "x": 9.44,
     "y": 65.91
    },
    {
     "t": "stump",
     "x": 91.79,
     "y": 51.57
    },
    {
     "t": "stump",
     "x": 35.67,
     "y": 71.52
    },
    {
     "t": "stump",
     "x": 37.23,
     "y": 35.65
    },
    {
     "t": "stump",
     "x": 33.23,
     "y": 108.71
    },
    {
     "t": "stump",
     "x": 105.78,
     "y": 44.08
    },
    {
     "t": "stump",
     "x": 12.87,
     "y": 61.63
    },
    {
     "t": "stump",
     "x": 60.4,
     "y": 33.98
    },
    {
     "t": "stump",
     "x": 14.79,
     "y": 49.8
    },
    {
     "t": "stump",
     "x": 48.55,
     "y": 33.04
    },
    {
     "t": "stump",
     "x": 27.87,
     "y": 110.58
    },
    {
     "t": "moss",
     "x": 32.15,
     "y": 63.25,
     "v": 1
    },
    {
     "t": "moss",
     "x": 76.72,
     "y": 57.32,
     "v": 1
    },
    {
     "t": "moss",
     "x": 31.52,
     "y": 29.76,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 36.04,
     "y": 97.18,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 26.9,
     "y": 96.06
    },
    {
     "t": "moss",
     "x": 9.29,
     "y": 81.79,
     "v": 2
    },
    {
     "t": "moss",
     "x": 5.47,
     "y": 85.4,
     "v": 1
    },
    {
     "t": "moss",
     "x": 61.09,
     "y": 72.57,
     "f": 1
    },
    {
     "t": "moss",
     "x": 64.91,
     "y": 35.39
    },
    {
     "t": "moss",
     "x": 76.73,
     "y": 47.38,
     "f": 1
    },
    {
     "t": "moss",
     "x": 62.1,
     "y": 65.76,
     "v": 2
    },
    {
     "t": "moss",
     "x": 74,
     "y": 75.4
    },
    {
     "t": "moss",
     "x": 77.21,
     "y": 33.98,
     "f": 1
    },
    {
     "t": "moss",
     "x": 48.21,
     "y": 77.22,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 24.78,
     "y": 93.7,
     "v": 2
    },
    {
     "t": "moss",
     "x": 89,
     "y": 46.87,
     "v": 1
    },
    {
     "t": "moss",
     "x": 41.01,
     "y": 96.61,
     "v": 1
    },
    {
     "t": "moss",
     "x": 17.21,
     "y": 101.89,
     "v": 1
    },
    {
     "t": "moss",
     "x": 35.2,
     "y": 49.08,
     "v": 1
    },
    {
     "t": "moss",
     "x": 18.07,
     "y": 63.28,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 70.81,
     "y": 38.8,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 43.38,
     "y": 71.45,
     "v": 2
    },
    {
     "t": "moss",
     "x": 35.74,
     "y": 101.52,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 71.37,
     "y": 50.78,
     "v": 1
    },
    {
     "t": "moss",
     "x": 40.78,
     "y": 37.7,
     "v": 1,
     "f": 1
    },
    {
     "t": "moss",
     "x": 98.24,
     "y": 44.49,
     "f": 1
    },
    {
     "t": "moss",
     "x": 23.14,
     "y": 56.92
    },
    {
     "t": "moss",
     "x": 51.09,
     "y": 87.31,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 12.77,
     "y": 108.5,
     "v": 1,
     "f": 1
    },
    {
     "t": "moss",
     "x": 31.9,
     "y": 97.34
    },
    {
     "t": "moss",
     "x": 35.34,
     "y": 61.98,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 44.47,
     "y": 66.38,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 26.4,
     "y": 60.65,
     "v": 1
    },
    {
     "t": "moss",
     "x": 68.64,
     "y": 52.86,
     "f": 1
    },
    {
     "t": "moss",
     "x": 43.35,
     "y": 41.14,
     "v": 1
    },
    {
     "t": "moss",
     "x": 95.49,
     "y": 63.29,
     "v": 1
    },
    {
     "t": "moss",
     "x": 75.03,
     "y": 66.48
    },
    {
     "t": "moss",
     "x": 67.23,
     "y": 61.72,
     "f": 1
    },
    {
     "t": "moss",
     "x": 65.4,
     "y": 78.19,
     "f": 1
    },
    {
     "t": "moss",
     "x": 7.04,
     "y": 83.91,
     "v": 2
    },
    {
     "t": "moss",
     "x": 81.82,
     "y": 79.67,
     "f": 1
    },
    {
     "t": "moss",
     "x": 14.29,
     "y": 70.45,
     "f": 1
    },
    {
     "t": "moss",
     "x": 84.2,
     "y": 31.56,
     "v": 1
    },
    {
     "t": "moss",
     "x": 32.36,
     "y": 53.22,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 52.47,
     "y": 33.48,
     "v": 2
    },
    {
     "t": "moss",
     "x": 53.46,
     "y": 53.08,
     "v": 1
    },
    {
     "t": "moss",
     "x": 19.95,
     "y": 62.32
    },
    {
     "t": "moss",
     "x": 84.84,
     "y": 76.41,
     "v": 2
    },
    {
     "t": "moss",
     "x": 102.79,
     "y": 61.49
    },
    {
     "t": "moss",
     "x": 69.46,
     "y": 36.65,
     "f": 1
    },
    {
     "t": "moss",
     "x": 55.43,
     "y": 81.21,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 92.08,
     "y": 60.37
    },
    {
     "t": "moss",
     "x": 61.63,
     "y": 46.01,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 25.92,
     "y": 76.52,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 3.05,
     "y": 97.4,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 98.59,
     "y": 63.3
    },
    {
     "t": "pine_giant",
     "x": 32.55,
     "y": 73.82
    },
    {
     "t": "pine_giant",
     "x": 8.92,
     "y": 89.76
    },
    {
     "t": "pine_giant",
     "x": 70.76,
     "y": 24.98
    },
    {
     "t": "pine_giant",
     "x": 80.76,
     "y": 28.91
    },
    {
     "t": "pine_giant",
     "x": 39.28,
     "y": 42.25,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 9.03,
     "y": 50.06
    },
    {
     "t": "pine_giant",
     "x": 6.93,
     "y": 58.5
    },
    {
     "t": "pine_giant",
     "x": 12.31,
     "y": 46.81,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 13.7,
     "y": 84.2,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 40.35,
     "y": 100.8
    },
    {
     "t": "pine_giant",
     "x": 33.03,
     "y": 87.43,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 26.51,
     "y": 28.02,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 25.04,
     "y": 70.59,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 24.62,
     "y": 82.84,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 41.97,
     "y": 57.28,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 93.35,
     "y": 66.13
    },
    {
     "t": "pine_giant",
     "x": 84.93,
     "y": 73.68,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 76.05,
     "y": 22.33,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 38.39,
     "y": 30.09,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 21.14,
     "y": 82.62
    },
    {
     "t": "pine_giant",
     "x": 2.87,
     "y": 100.99,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 17.53,
     "y": 105.49,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 17.41,
     "y": 74.67,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 13.96,
     "y": 38.72,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 1.1,
     "y": 108.78,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 41.13,
     "y": 54.05
    },
    {
     "t": "pine_giant",
     "x": 29.95,
     "y": 71.18
    },
    {
     "t": "pine_giant",
     "x": 57.73,
     "y": 82.87,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 16.68,
     "y": 40.46
    },
    {
     "t": "pine_giant",
     "x": 8.95,
     "y": 35.14,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 18.41,
     "y": 80.92,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 69.24,
     "y": 45.39,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 5.78,
     "y": 64.4
    },
    {
     "t": "pine_giant",
     "x": 51.19,
     "y": 91.58,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 88.57,
     "y": 77.08,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 87.99,
     "y": 56.71,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 50.38,
     "y": 29.09,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 12.31,
     "y": 51.57,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 74.88,
     "y": 77.85,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 47.92,
     "y": 46.81,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 45.79,
     "y": 82.15,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 1.6,
     "y": 69.36,
     "v": 2
    },
    {
     "t": "tree_oak",
     "x": 100.53,
     "y": 51.85,
     "v": 10
    },
    {
     "t": "tree_oak",
     "x": 29.31,
     "y": 27.58,
     "v": 5
    },
    {
     "t": "tree_oak",
     "x": 86.98,
     "y": 60.62,
     "v": 8
    },
    {
     "t": "tree_oak",
     "x": 54.95,
     "y": 34.23,
     "v": 9
    },
    {
     "t": "tree_oak",
     "x": 54.95,
     "y": 35.83,
     "v": 10
    },
    {
     "t": "tree_oak",
     "x": 71.82,
     "y": 77.1
    },
    {
     "t": "tree_oak",
     "x": 77.32,
     "y": 64.8,
     "v": 2
    },
    {
     "t": "tree_oak",
     "x": 91.4,
     "y": 64.6,
     "v": 5
    },
    {
     "t": "tree_oak",
     "x": 87.87,
     "y": 66.28,
     "v": 8
    },
    {
     "t": "tree_oak",
     "x": 100.18,
     "y": 85.45,
     "v": 3
    },
    {
     "t": "tree_oak",
     "x": 43.67,
     "y": 53.9,
     "v": 5
    },
    {
     "t": "tree_oak",
     "x": 101.91,
     "y": 49.25
    },
    {
     "t": "tree_oak",
     "x": 56.75,
     "y": 47.23,
     "v": 5
    },
    {
     "t": "tree_oak",
     "x": 1.33,
     "y": 103.24,
     "v": 6
    },
    {
     "t": "tree_oak",
     "x": 96.48,
     "y": 61.21,
     "v": 7
    },
    {
     "t": "tree_oak",
     "x": 62.39,
     "y": 68.58,
     "v": 11
    },
    {
     "t": "tree_oak",
     "x": 100.51,
     "y": 61.39,
     "v": 7
    },
    {
     "t": "tree_oak",
     "x": 81.34,
     "y": 40.19,
     "v": 10
    },
    {
     "t": "tree_oak",
     "x": 27.35,
     "y": 105.15
    },
    {
     "t": "tree_oak",
     "x": 45.72,
     "y": 99.44,
     "v": 11
    },
    {
     "t": "tree_oak",
     "x": 53.91,
     "y": 40.83,
     "v": 11
    },
    {
     "t": "tree_oak",
     "x": 87.31,
     "y": 48.47,
     "v": 1
    },
    {
     "t": "tree_oak",
     "x": 108.73,
     "y": 44.02,
     "v": 1
    },
    {
     "t": "tree_oak",
     "x": 4.97,
     "y": 99.07
    },
    {
     "t": "tree_oak",
     "x": 103.86,
     "y": 63.15,
     "v": 11
    },
    {
     "t": "tree_oak",
     "x": 47.44,
     "y": 69.42,
     "v": 5
    },
    {
     "t": "tree_oak",
     "x": 6.2,
     "y": 69.16,
     "v": 1
    },
    {
     "t": "tree_oak",
     "x": 7.54,
     "y": 66.49,
     "v": 11
    },
    {
     "t": "tree_oak",
     "x": 38.34,
     "y": 37.46,
     "v": 8
    },
    {
     "t": "tree_oak",
     "x": 83.06,
     "y": 39.6,
     "v": 4
    },
    {
     "t": "tree_oak",
     "x": 21.47,
     "y": 72.24,
     "v": 9
    },
    {
     "t": "tree_oak",
     "x": 13.92,
     "y": 60.12,
     "v": 3
    },
    {
     "t": "tree_oak",
     "x": 35.38,
     "y": 30.55
    },
    {
     "t": "tree_oak",
     "x": 99.54,
     "y": 58.29,
     "v": 5
    },
    {
     "t": "tree_oak",
     "x": 105.6,
     "y": 57,
     "v": 9
    },
    {
     "t": "tree_oak",
     "x": 43.4,
     "y": 98.3,
     "v": 8
    },
    {
     "t": "tree_oak",
     "x": 108.28,
     "y": 61.87
    },
    {
     "t": "tree_oak",
     "x": 5.95,
     "y": 87.57,
     "v": 10
    },
    {
     "t": "tree_oak",
     "x": 98.51,
     "y": 53.95
    },
    {
     "t": "tree_oak",
     "x": 11.64,
     "y": 98.97,
     "v": 10
    },
    {
     "t": "tree_oak",
     "x": 26.48,
     "y": 33.65
    },
    {
     "t": "tree_oak",
     "x": 68.84,
     "y": 26.9,
     "v": 6
    },
    {
     "t": "tree_oak",
     "x": 88.84,
     "y": 60.71,
     "v": 3
    },
    {
     "t": "tree_oak",
     "x": 98.55,
     "y": 78.1,
     "v": 9
    },
    {
     "t": "tree_oak",
     "x": 68.86,
     "y": 29.98,
     "v": 1
    },
    {
     "t": "tree_oak",
     "x": 58.45,
     "y": 26.78,
     "v": 4
    },
    {
     "t": "tree_oak",
     "x": 26.05,
     "y": 31.33,
     "v": 10
    },
    {
     "t": "tree_oak",
     "x": 23.96,
     "y": 74.82,
     "v": 9
    },
    {
     "t": "tree_oak",
     "x": 91.42,
     "y": 49.52,
     "v": 4
    },
    {
     "t": "tree_oak",
     "x": 73.97,
     "y": 31.13,
     "v": 1
    },
    {
     "t": "tree_oak",
     "x": 31.68,
     "y": 110.67,
     "v": 11
    },
    {
     "t": "tree_oak",
     "x": 31.06,
     "y": 36.75,
     "v": 6
    },
    {
     "t": "tree_oak",
     "x": 11.16,
     "y": 57.31,
     "v": 1
    },
    {
     "t": "tree_oak",
     "x": 48.17,
     "y": 84.31,
     "v": 7
    },
    {
     "t": "tree_oak",
     "x": 10.07,
     "y": 98.41,
     "v": 4
    },
    {
     "t": "tree_oak",
     "x": 29.97,
     "y": 25.42,
     "v": 6
    },
    {
     "t": "tree_oak",
     "x": 93.19,
     "y": 52.74,
     "v": 2
    },
    {
     "t": "tree_oak",
     "x": 84.54,
     "y": 66.67,
     "v": 4
    },
    {
     "t": "tree_oak",
     "x": 20.14,
     "y": 65.9,
     "v": 6
    },
    {
     "t": "tree_birch",
     "x": 109.82,
     "y": 46.89,
     "v": 1
    },
    {
     "t": "tree_birch",
     "x": 12.59,
     "y": 49.49,
     "v": 7
    },
    {
     "t": "tree_birch",
     "x": 57.56,
     "y": 67.67,
     "v": 1
    },
    {
     "t": "tree_birch",
     "x": 44.39,
     "y": 73.03,
     "v": 5
    },
    {
     "t": "tree_birch",
     "x": 14.59,
     "y": 47.72,
     "v": 1
    },
    {
     "t": "tree_birch",
     "x": 89.53,
     "y": 64.29,
     "v": 4
    },
    {
     "t": "tree_birch",
     "x": 30.51,
     "y": 101.16,
     "v": 9
    },
    {
     "t": "tree_birch",
     "x": 42.96,
     "y": 59.89,
     "v": 7
    },
    {
     "t": "tree_birch",
     "x": 102.46,
     "y": 53.26
    },
    {
     "t": "tree_birch",
     "x": 9.18,
     "y": 108.7
    },
    {
     "t": "tree_birch",
     "x": 74.11,
     "y": 33.85,
     "v": 7
    },
    {
     "t": "tree_birch",
     "x": 4.66,
     "y": 58.43,
     "v": 8
    },
    {
     "t": "tree_birch",
     "x": 37.38,
     "y": 85.97,
     "v": 2
    },
    {
     "t": "tree_birch",
     "x": 30.7,
     "y": 67.01,
     "v": 5
    },
    {
     "t": "tree_birch",
     "x": 92.7,
     "y": 50.14,
     "v": 1
    },
    {
     "t": "tree_birch",
     "x": 93.2,
     "y": 51.03,
     "v": 2
    },
    {
     "t": "tree_birch",
     "x": 98.9,
     "y": 87.96,
     "v": 7
    },
    {
     "t": "tree_birch",
     "x": 97.99,
     "y": 87.19,
     "v": 6
    },
    {
     "t": "tree_birch",
     "x": 46.14,
     "y": 69.15,
     "v": 11
    },
    {
     "t": "tree_birch",
     "x": 107.07,
     "y": 56.41,
     "v": 8
    },
    {
     "t": "tree_birch",
     "x": 5.44,
     "y": 67.29,
     "v": 7
    },
    {
     "t": "tree_birch",
     "x": 67.55,
     "y": 64.29,
     "v": 5
    },
    {
     "t": "tree_birch",
     "x": 8.17,
     "y": 60.94,
     "v": 5
    },
    {
     "t": "tree_birch",
     "x": 2.63,
     "y": 103.04,
     "v": 10
    },
    {
     "t": "tree_birch",
     "x": 4.48,
     "y": 102.38,
     "v": 3
    },
    {
     "t": "tree_birch",
     "x": 110.06,
     "y": 57.02,
     "v": 4
    },
    {
     "t": "tree_birch",
     "x": 7.95,
     "y": 42.72,
     "v": 11
    },
    {
     "t": "tree_birch",
     "x": 7.73,
     "y": 43.81,
     "v": 4
    },
    {
     "t": "tree_birch",
     "x": 20.42,
     "y": 73.78,
     "v": 1
    },
    {
     "t": "tree_birch",
     "x": 15.32,
     "y": 74.51,
     "v": 3
    },
    {
     "t": "tree_birch",
     "x": 3.95,
     "y": 62.17,
     "v": 9
    },
    {
     "t": "tree_birch",
     "x": 5.28,
     "y": 62.01,
     "v": 3
    },
    {
     "t": "tree_birch",
     "x": 71.03,
     "y": 67.12,
     "v": 2
    },
    {
     "t": "tree_birch",
     "x": 23.12,
     "y": 106.56,
     "v": 10
    },
    {
     "t": "tree_birch",
     "x": 6.94,
     "y": 67.71,
     "v": 8
    },
    {
     "t": "tree_birch",
     "x": 46.48,
     "y": 70.74
    },
    {
     "t": "tree_birch",
     "x": 102.69,
     "y": 51.07,
     "v": 8
    },
    {
     "t": "tree_birch",
     "x": 47.39,
     "y": 71.75,
     "v": 6
    },
    {
     "t": "tree_birch",
     "x": 48.32,
     "y": 72.2,
     "v": 4
    },
    {
     "t": "tree_birch",
     "x": 111.29,
     "y": 55.99
    },
    {
     "t": "tree_birch",
     "x": 36.47,
     "y": 65.21,
     "v": 1
    },
    {
     "t": "tree_birch",
     "x": 37.42,
     "y": 64.13,
     "v": 3
    },
    {
     "t": "tree_birch",
     "x": 52.88,
     "y": 39.97,
     "v": 10
    },
    {
     "t": "tree_birch",
     "x": 53.97,
     "y": 38.9,
     "v": 1
    },
    {
     "t": "tree_birch",
     "x": 7.62,
     "y": 91.71,
     "v": 9
    },
    {
     "t": "tree_birch",
     "x": 14.82,
     "y": 81.91,
     "v": 10
    },
    {
     "t": "tree_birch",
     "x": 13.61,
     "y": 81.74,
     "v": 8
    },
    {
     "t": "tree_birch",
     "x": 70.85,
     "y": 70.28,
     "v": 9
    },
    {
     "t": "tree_birch",
     "x": 69.7,
     "y": 70.16,
     "v": 2
    },
    {
     "t": "tree_birch",
     "x": 4.15,
     "y": 69.74
    },
    {
     "t": "tree_birch",
     "x": 78.64,
     "y": 62.96,
     "v": 3
    },
    {
     "t": "tree_birch",
     "x": 79.05,
     "y": 65.74,
     "v": 4
    },
    {
     "t": "tree_birch",
     "x": 31.45,
     "y": 67.69,
     "v": 6
    },
    {
     "t": "tree_birch",
     "x": 5.25,
     "y": 70.7,
     "v": 5
    },
    {
     "t": "tree_birch",
     "x": 57.53,
     "y": 55.71,
     "v": 1
    },
    {
     "t": "tree_birch",
     "x": 66.44,
     "y": 63.78,
     "v": 4
    },
    {
     "t": "tree_birch",
     "x": 65.35,
     "y": 62.86,
     "v": 11
    },
    {
     "t": "tree_birch",
     "x": 26.7,
     "y": 69.15,
     "v": 3
    },
    {
     "t": "tree_birch",
     "x": 55.75,
     "y": 37.3,
     "v": 2
    },
    {
     "t": "tree_birch",
     "x": 70.27,
     "y": 29.04,
     "v": 5
    },
    {
     "t": "tree_birch",
     "x": 82.7,
     "y": 65.01,
     "v": 2
    },
    {
     "t": "tree_birch",
     "x": 83.88,
     "y": 64.27,
     "v": 5
    },
    {
     "t": "tree_birch",
     "x": 102.43,
     "y": 58.96,
     "v": 10
    },
    {
     "t": "tree_birch",
     "x": 103.03,
     "y": 59.83,
     "v": 7
    },
    {
     "t": "tree_birch",
     "x": 25.67,
     "y": 104.07,
     "v": 1
    },
    {
     "t": "tree_birch",
     "x": 24.84,
     "y": 105.23,
     "v": 9
    },
    {
     "t": "tree_birch",
     "x": 31.28,
     "y": 100.43,
     "v": 7
    },
    {
     "t": "tree_birch",
     "x": 38.31,
     "y": 99.89,
     "v": 7
    },
    {
     "t": "tree_birch",
     "x": 26.97,
     "y": 103.16,
     "v": 7
    },
    {
     "t": "tree_birch",
     "x": 23.03,
     "y": 73.33,
     "v": 7
    },
    {
     "t": "tree_birch",
     "x": 34.84,
     "y": 108.83,
     "v": 7
    },
    {
     "t": "tree_birch",
     "x": 105.79,
     "y": 53.88,
     "v": 9
    },
    {
     "t": "tree_birch",
     "x": 93.03,
     "y": 63.86,
     "v": 8
    },
    {
     "t": "tree_birch",
     "x": 38.72,
     "y": 73.04
    },
    {
     "t": "tree_birch",
     "x": 38.67,
     "y": 74.2,
     "v": 5
    },
    {
     "t": "tree_birch",
     "x": 41.4,
     "y": 42.22,
     "v": 3
    },
    {
     "t": "tree_birch",
     "x": 3.77,
     "y": 103.26,
     "v": 9
    },
    {
     "t": "tree_birch",
     "x": 90.32,
     "y": 65.5,
     "v": 10
    },
    {
     "t": "tree_birch",
     "x": 108.55,
     "y": 50.13
    },
    {
     "t": "tree_birch",
     "x": 111.28,
     "y": 57,
     "v": 5
    },
    {
     "t": "tree_birch",
     "x": 30.94,
     "y": 90.74,
     "v": 1
    },
    {
     "t": "pine",
     "x": 86.01,
     "y": 67.82,
     "v": 2
    },
    {
     "t": "pine",
     "x": 79.72,
     "y": 62.88,
     "v": 2
    },
    {
     "t": "pine",
     "x": 80.51,
     "y": 69.95
    },
    {
     "t": "pine",
     "x": 9.46,
     "y": 109.83,
     "v": 2
    },
    {
     "t": "pine",
     "x": 12.99,
     "y": 44,
     "v": 3
    },
    {
     "t": "pine",
     "x": 97.07,
     "y": 52.63,
     "v": 4
    },
    {
     "t": "pine",
     "x": 27.54,
     "y": 72.79,
     "v": 1
    },
    {
     "t": "pine",
     "x": 8.24,
     "y": 44.7,
     "v": 2
    },
    {
     "t": "pine",
     "x": 69.18,
     "y": 76.46
    },
    {
     "t": "pine",
     "x": 68.56,
     "y": 75.52,
     "v": 4
    },
    {
     "t": "pine",
     "x": 88.08,
     "y": 68.13,
     "v": 3
    },
    {
     "t": "pine",
     "x": 39.69,
     "y": 38.87,
     "v": 5
    },
    {
     "t": "pine",
     "x": 43.42,
     "y": 32.84
    },
    {
     "t": "pine",
     "x": 31.96,
     "y": 101.19,
     "v": 4
    },
    {
     "t": "pine",
     "x": 77.32,
     "y": 75.24,
     "v": 2
    },
    {
     "t": "pine",
     "x": 78.74,
     "y": 75.44,
     "v": 1
    },
    {
     "t": "pine",
     "x": 88.31,
     "y": 49.3,
     "v": 1
    },
    {
     "t": "pine",
     "x": 54.21,
     "y": 37.15,
     "v": 2
    },
    {
     "t": "pine",
     "x": 17.08,
     "y": 59.53,
     "v": 1
    },
    {
     "t": "pine",
     "x": 73.37,
     "y": 32.53,
     "v": 4
    },
    {
     "t": "pine",
     "x": 31.55,
     "y": 26.79,
     "v": 4
    },
    {
     "t": "pine",
     "x": 47.16,
     "y": 32.27,
     "v": 2
    },
    {
     "t": "pine",
     "x": 37.37,
     "y": 100.75
    },
    {
     "t": "pine",
     "x": 9.87,
     "y": 91.77,
     "v": 5
    },
    {
     "t": "pine",
     "x": 58.11,
     "y": 60.72
    },
    {
     "t": "pine",
     "x": 20.96,
     "y": 89.84,
     "v": 4
    },
    {
     "t": "pine",
     "x": 19.97,
     "y": 90.9
    },
    {
     "t": "pine",
     "x": 19.92,
     "y": 89.04,
     "v": 1
    },
    {
     "t": "pine",
     "x": 8.15,
     "y": 76.43,
     "v": 2
    },
    {
     "t": "pine",
     "x": 8.44,
     "y": 74.92,
     "v": 4
    },
    {
     "t": "pine",
     "x": 59.72,
     "y": 54.86,
     "v": 3
    },
    {
     "t": "pine",
     "x": 58.26,
     "y": 54.87,
     "v": 5
    },
    {
     "t": "pine",
     "x": 89.16,
     "y": 66
    },
    {
     "t": "pine",
     "x": 41.95,
     "y": 60.45
    },
    {
     "t": "pine",
     "x": 3.95,
     "y": 104.44,
     "v": 1
    },
    {
     "t": "pine",
     "x": 0.65,
     "y": 62.63,
     "v": 1
    },
    {
     "t": "pine",
     "x": 91.2,
     "y": 83.71,
     "v": 2
    },
    {
     "t": "pine",
     "x": 19.86,
     "y": 104.56
    },
    {
     "t": "pine",
     "x": 19.48,
     "y": 103.31,
     "v": 4
    },
    {
     "t": "pine",
     "x": 47.19,
     "y": 35.02,
     "v": 3
    },
    {
     "t": "pine",
     "x": 30.05,
     "y": 97.77,
     "v": 1
    },
    {
     "t": "pine",
     "x": 76.26,
     "y": 32.64,
     "v": 5
    },
    {
     "t": "pine",
     "x": 75.75,
     "y": 33.59
    },
    {
     "t": "pine",
     "x": 54.22,
     "y": 56.07,
     "v": 4
    },
    {
     "t": "pine",
     "x": 85.55,
     "y": 65.58
    },
    {
     "t": "pine",
     "x": 84.32,
     "y": 65.33,
     "v": 3
    },
    {
     "t": "pine",
     "x": 50.92,
     "y": 41.86
    },
    {
     "t": "pine",
     "x": 50.71,
     "y": 40.72,
     "v": 4
    },
    {
     "t": "pine",
     "x": 7.46,
     "y": 82.23,
     "v": 3
    },
    {
     "t": "pine",
     "x": 28.2,
     "y": 35.21,
     "v": 1
    },
    {
     "t": "pine",
     "x": 82.53,
     "y": 56.15,
     "v": 2
    },
    {
     "t": "pine",
     "x": 82.2,
     "y": 57.25,
     "v": 3
    },
    {
     "t": "pine",
     "x": 63.72,
     "y": 29.07,
     "v": 5
    },
    {
     "t": "pine",
     "x": 9.18,
     "y": 92.62,
     "v": 2
    },
    {
     "t": "pine",
     "x": 8.03,
     "y": 67.71,
     "v": 5
    },
    {
     "t": "pine",
     "x": 80.1,
     "y": 66.41
    },
    {
     "t": "pine",
     "x": 90.38,
     "y": 60.9,
     "v": 2
    },
    {
     "t": "pine",
     "x": 45.15,
     "y": 69.35,
     "v": 5
    },
    {
     "t": "pine",
     "x": 45.82,
     "y": 61.44,
     "v": 1
    },
    {
     "t": "pine",
     "x": 22.63,
     "y": 46.58,
     "v": 5
    },
    {
     "t": "pine",
     "x": 83.14,
     "y": 72.43,
     "v": 2
    },
    {
     "t": "pine",
     "x": 12.57,
     "y": 86.82,
     "v": 4
    },
    {
     "t": "pine",
     "x": 13.17,
     "y": 88.18,
     "v": 5
    },
    {
     "t": "pine",
     "x": 64.05,
     "y": 44.09,
     "v": 4
    },
    {
     "t": "pine",
     "x": 85.54,
     "y": 53.63
    },
    {
     "t": "pine",
     "x": 16.37,
     "y": 64.95,
     "v": 5
    },
    {
     "t": "pine",
     "x": 42.42,
     "y": 70.05,
     "v": 1
    },
    {
     "t": "pine",
     "x": 43.92,
     "y": 67.93
    },
    {
     "t": "pine",
     "x": 34.73,
     "y": 54.42
    },
    {
     "t": "pine",
     "x": 110.86,
     "y": 58.16,
     "v": 2
    },
    {
     "t": "pine",
     "x": 19.5,
     "y": 89.97,
     "v": 2
    },
    {
     "t": "pine",
     "x": 86.38,
     "y": 81.94,
     "v": 3
    },
    {
     "t": "pine",
     "x": 5.11,
     "y": 57.31
    },
    {
     "t": "pine",
     "x": 27.06,
     "y": 73.87,
     "v": 3
    },
    {
     "t": "pine",
     "x": 57.98,
     "y": 63.01,
     "v": 2
    },
    {
     "t": "pine",
     "x": 91.53,
     "y": 86.98,
     "v": 1
    },
    {
     "t": "pine",
     "x": 99.73,
     "y": 82.44,
     "v": 2
    },
    {
     "t": "pine",
     "x": 37.21,
     "y": 45.72,
     "v": 4
    },
    {
     "t": "pine",
     "x": 35.79,
     "y": 45.09,
     "v": 2
    },
    {
     "t": "pine",
     "x": 37.8,
     "y": 44.91
    },
    {
     "t": "pine",
     "x": 90.54,
     "y": 82.76
    },
    {
     "t": "pine",
     "x": 21.79,
     "y": 42.43,
     "v": 1
    },
    {
     "t": "pine",
     "x": 20.95,
     "y": 43.14,
     "v": 3
    },
    {
     "t": "pine",
     "x": 3.75,
     "y": 65.28,
     "v": 1
    },
    {
     "t": "pine",
     "x": 22.65,
     "y": 89.55,
     "v": 5
    },
    {
     "t": "pine",
     "x": 69,
     "y": 77.64,
     "v": 5
    },
    {
     "t": "pine",
     "x": 69.78,
     "y": 75.58,
     "v": 1
    },
    {
     "t": "pine",
     "x": 47.19,
     "y": 79.88,
     "v": 1
    },
    {
     "t": "pine",
     "x": 46.55,
     "y": 78.68
    },
    {
     "t": "pine",
     "x": 63.61,
     "y": 82.25,
     "v": 1
    },
    {
     "t": "pine",
     "x": 70.67,
     "y": 76.45,
     "v": 2
    },
    {
     "t": "pine",
     "x": 8.54,
     "y": 77.99
    },
    {
     "t": "pine",
     "x": 10.55,
     "y": 109.68,
     "v": 3
    },
    {
     "t": "pine",
     "x": 26.98,
     "y": 30.29,
     "v": 5
    },
    {
     "t": "pine",
     "x": 90.67,
     "y": 66.6,
     "v": 5
    },
    {
     "t": "pine",
     "x": 11.4,
     "y": 34.49
    },
    {
     "t": "pine",
     "x": 30.1,
     "y": 91.94,
     "v": 4
    },
    {
     "t": "pine",
     "x": 25.77,
     "y": 108.09,
     "v": 5
    },
    {
     "t": "pine",
     "x": 27.52,
     "y": 107.96,
     "v": 3
    },
    {
     "t": "pine",
     "x": 48.77,
     "y": 31.18,
     "v": 1
    },
    {
     "t": "pine",
     "x": 109.49,
     "y": 62.57
    },
    {
     "t": "pine",
     "x": 45.38,
     "y": 71.15
    },
    {
     "t": "pine",
     "x": 5.93,
     "y": 96.37,
     "v": 5
    },
    {
     "t": "pine",
     "x": 14.46,
     "y": 51.98,
     "v": 5
    },
    {
     "t": "pine",
     "x": 10.52,
     "y": 107.99,
     "v": 5
    },
    {
     "t": "pine",
     "x": 33.31,
     "y": 50.02,
     "v": 1
    },
    {
     "t": "pine",
     "x": 60.73,
     "y": 68.61,
     "v": 5
    },
    {
     "t": "pine",
     "x": 33.28,
     "y": 45.44,
     "v": 1
    },
    {
     "t": "pine",
     "x": 80.87,
     "y": 54.46,
     "v": 1
    },
    {
     "t": "pine",
     "x": 82.08,
     "y": 55.13,
     "v": 5
    },
    {
     "t": "pine",
     "x": 79.37,
     "y": 54.51
    },
    {
     "t": "pine",
     "x": 85.07,
     "y": 60.95,
     "v": 1
    },
    {
     "t": "pine",
     "x": 2.14,
     "y": 57.8,
     "v": 5
    },
    {
     "t": "pine",
     "x": 2.67,
     "y": 65.04,
     "v": 3
    },
    {
     "t": "pine",
     "x": 101.31,
     "y": 81.16
    },
    {
     "t": "pine",
     "x": 27.21,
     "y": 71.03,
     "v": 5
    },
    {
     "t": "pine",
     "x": 55.37,
     "y": 83.54,
     "v": 5
    },
    {
     "t": "pine",
     "x": 50.37,
     "y": 93.67
    },
    {
     "t": "pine",
     "x": 35.53,
     "y": 74.6,
     "v": 2
    },
    {
     "t": "pine",
     "x": 83.54,
     "y": 53.08,
     "v": 2
    },
    {
     "t": "pine",
     "x": 84.76,
     "y": 52.94,
     "v": 4
    },
    {
     "t": "pine",
     "x": 41.78,
     "y": 32.13,
     "v": 3
    },
    {
     "t": "pine",
     "x": 53.25,
     "y": 90.79
    },
    {
     "t": "pine",
     "x": 35.85,
     "y": 36.87,
     "v": 2
    },
    {
     "t": "pine",
     "x": 68.57,
     "y": 25.46,
     "v": 4
    },
    {
     "t": "pine",
     "x": 93.59,
     "y": 59.48,
     "v": 2
    },
    {
     "t": "pine",
     "x": 60.68,
     "y": 69.88,
     "v": 1
    },
    {
     "t": "pine",
     "x": 24.64,
     "y": 73.26,
     "v": 2
    },
    {
     "t": "pine",
     "x": 58.88,
     "y": 34.81,
     "v": 4
    },
    {
     "t": "pine",
     "x": 108.8,
     "y": 57.1,
     "v": 3
    },
    {
     "t": "pine",
     "x": 96.48,
     "y": 64.42,
     "v": 3
    },
    {
     "t": "pine",
     "x": 8.9,
     "y": 59.83,
     "v": 2
    },
    {
     "t": "pine",
     "x": 32.54,
     "y": 92.94,
     "v": 3
    },
    {
     "t": "pine",
     "x": 5.59,
     "y": 39.11,
     "v": 1
    },
    {
     "t": "pine",
     "x": 28.97,
     "y": 91.11,
     "v": 3
    },
    {
     "t": "pine",
     "x": 66.63,
     "y": 65.78,
     "v": 5
    },
    {
     "t": "pine",
     "x": 71.67,
     "y": 69.05,
     "v": 1
    },
    {
     "t": "pine",
     "x": 27.93,
     "y": 103.65,
     "v": 1
    },
    {
     "t": "pine",
     "x": 12.86,
     "y": 93.97,
     "v": 1
    },
    {
     "t": "pine",
     "x": 46.96,
     "y": 50.38,
     "v": 3
    },
    {
     "t": "pine",
     "x": 95.68,
     "y": 65.55,
     "v": 1
    },
    {
     "t": "pine",
     "x": 41.65,
     "y": 31.02,
     "v": 4
    },
    {
     "t": "pine",
     "x": 49.35,
     "y": 75.28
    },
    {
     "t": "pine",
     "x": 58.18,
     "y": 36.13,
     "v": 2
    },
    {
     "t": "pine",
     "x": 7.67,
     "y": 40.49,
     "v": 4
    },
    {
     "t": "pine",
     "x": 108.04,
     "y": 59.5
    },
    {
     "t": "pine",
     "x": 108.89,
     "y": 58.33,
     "v": 4
    },
    {
     "t": "pine",
     "x": 106.53,
     "y": 59.03,
     "v": 1
    },
    {
     "t": "pine",
     "x": 52.89,
     "y": 58.09,
     "v": 1
    },
    {
     "t": "pine",
     "x": 102.96,
     "y": 54.53,
     "v": 1
    },
    {
     "t": "pine",
     "x": 28.82,
     "y": 44.96,
     "v": 1
    },
    {
     "t": "pine",
     "x": 27.66,
     "y": 45.26,
     "v": 5
    },
    {
     "t": "pine",
     "x": 14.82,
     "y": 53.16
    },
    {
     "t": "pine",
     "x": 78.51,
     "y": 53.85,
     "v": 2
    },
    {
     "t": "pine",
     "x": 18.14,
     "y": 59.71,
     "v": 2
    },
    {
     "t": "pine",
     "x": 44.62,
     "y": 70.44,
     "v": 2
    },
    {
     "t": "pine",
     "x": 79.1,
     "y": 76.7
    },
    {
     "t": "pine",
     "x": 20.62,
     "y": 41.34,
     "v": 4
    },
    {
     "t": "pine",
     "x": 6.89,
     "y": 42.8,
     "v": 3
    },
    {
     "t": "pine",
     "x": 48.53,
     "y": 60.2,
     "v": 3
    },
    {
     "t": "pine",
     "x": 28.55,
     "y": 29.95
    },
    {
     "t": "pine",
     "x": 18.76,
     "y": 71.36,
     "v": 4
    },
    {
     "t": "pine",
     "x": 34.55,
     "y": 45.52,
     "v": 3
    },
    {
     "t": "pine",
     "x": 8.35,
     "y": 41.67,
     "v": 2
    },
    {
     "t": "pine",
     "x": 11.38,
     "y": 62.72,
     "v": 1
    },
    {
     "t": "pine",
     "x": 25.7,
     "y": 109.99,
     "v": 4
    },
    {
     "t": "pine",
     "x": 81.93,
     "y": 65.82,
     "v": 1
    },
    {
     "t": "pine",
     "x": 1.01,
     "y": 64.53,
     "v": 2
    },
    {
     "t": "pine",
     "x": 62.17,
     "y": 62.99,
     "v": 4
    },
    {
     "t": "pine",
     "x": 11.68,
     "y": 35.92,
     "v": 1
    },
    {
     "t": "pine",
     "x": 106.66,
     "y": 49.77,
     "v": 5
    },
    {
     "t": "pine",
     "x": 107.2,
     "y": 48.71
    },
    {
     "t": "pine",
     "x": 55.75,
     "y": 84.75
    },
    {
     "t": "pine",
     "x": 28.6,
     "y": 104.69,
     "v": 2
    },
    {
     "t": "pine",
     "x": 110.63,
     "y": 62.45,
     "v": 1
    },
    {
     "t": "pine",
     "x": 11.35,
     "y": 43.66,
     "v": 4
    },
    {
     "t": "pine",
     "x": 20,
     "y": 98.76
    },
    {
     "t": "pine",
     "x": 4.67,
     "y": 66.25,
     "v": 2
    },
    {
     "t": "pine",
     "x": 15.89,
     "y": 51.57,
     "v": 1
    },
    {
     "t": "pine",
     "x": 31.47,
     "y": 89.41,
     "v": 3
    },
    {
     "t": "pine",
     "x": 43.3,
     "y": 82.86
    },
    {
     "t": "pine",
     "x": 100.71,
     "y": 79.85,
     "v": 5
    },
    {
     "t": "pine",
     "x": 100.08,
     "y": 83.83,
     "v": 3
    },
    {
     "t": "pine",
     "x": 68.6,
     "y": 64.09
    },
    {
     "t": "pine",
     "x": 14.35,
     "y": 61.35,
     "v": 2
    },
    {
     "t": "pine",
     "x": 17.4,
     "y": 53.28,
     "v": 2
    },
    {
     "t": "pine",
     "x": 102.63,
     "y": 57.65,
     "v": 2
    },
    {
     "t": "pine",
     "x": 3.65,
     "y": 58.13,
     "v": 1
    },
    {
     "t": "pine",
     "x": 4.88,
     "y": 59.63,
     "v": 2
    },
    {
     "t": "pine",
     "x": 25.62,
     "y": 73.6,
     "v": 4
    },
    {
     "t": "pine",
     "x": 65.77,
     "y": 44.19,
     "v": 1
    },
    {
     "t": "pine",
     "x": 52.09,
     "y": 55.61
    },
    {
     "t": "pine",
     "x": 10.4,
     "y": 67.3
    },
    {
     "t": "pine",
     "x": 30.06,
     "y": 102.09,
     "v": 5
    },
    {
     "t": "pine",
     "x": 10.47,
     "y": 44.68,
     "v": 5
    },
    {
     "t": "pine",
     "x": 19.93,
     "y": 42.06,
     "v": 5
    },
    {
     "t": "pine",
     "x": 64.4,
     "y": 62.53,
     "v": 5
    },
    {
     "t": "pine",
     "x": 97.31,
     "y": 88.23,
     "v": 1
    },
    {
     "t": "pine",
     "x": 32.17,
     "y": 71.25,
     "v": 5
    },
    {
     "t": "pine",
     "x": 13.05,
     "y": 95.84,
     "v": 3
    },
    {
     "t": "pine",
     "x": 41.88,
     "y": 43.88
    },
    {
     "t": "pine",
     "x": 56.95,
     "y": 59.97,
     "v": 2
    },
    {
     "t": "pine",
     "x": 6.35,
     "y": 40.72,
     "v": 5
    },
    {
     "t": "pine",
     "x": 36.48,
     "y": 85.46,
     "v": 4
    },
    {
     "t": "pine",
     "x": 51.08,
     "y": 54.04,
     "v": 2
    },
    {
     "t": "pine",
     "x": 32.12,
     "y": 25.56,
     "v": 5
    },
    {
     "t": "pine",
     "x": 71.07,
     "y": 21.25
    },
    {
     "t": "pine",
     "x": 42.78,
     "y": 99.64,
     "v": 5
    },
    {
     "t": "pine",
     "x": 33.27,
     "y": 65.21,
     "v": 2
    },
    {
     "t": "pine",
     "x": 59.21,
     "y": 60.41,
     "v": 5
    },
    {
     "t": "pine",
     "x": 104.52,
     "y": 59.22,
     "v": 3
    },
    {
     "t": "pine",
     "x": 55.79,
     "y": 25.2,
     "v": 3
    },
    {
     "t": "pine",
     "x": 56.38,
     "y": 26.48,
     "v": 2
    },
    {
     "t": "pine",
     "x": 36.56,
     "y": 74.18,
     "v": 4
    },
    {
     "t": "pine",
     "x": 57.04,
     "y": 36.92,
     "v": 3
    },
    {
     "t": "pine",
     "x": 56.24,
     "y": 36.25,
     "v": 4
    },
    {
     "t": "pine",
     "x": 59.63,
     "y": 36.21,
     "v": 5
    },
    {
     "t": "pine",
     "x": 6.69,
     "y": 36.24,
     "v": 1
    },
    {
     "t": "pine",
     "x": 53.8,
     "y": 88.85,
     "v": 1
    },
    {
     "t": "pine",
     "x": 41.69,
     "y": 67.68,
     "v": 2
    },
    {
     "t": "pine",
     "x": 12.5,
     "y": 95,
     "v": 4
    },
    {
     "t": "pine",
     "x": 85.97,
     "y": 68.97,
     "v": 4
    },
    {
     "t": "pine",
     "x": 92.82,
     "y": 83.08,
     "v": 3
    },
    {
     "t": "pine",
     "x": 37.39,
     "y": 73.07,
     "v": 3
    },
    {
     "t": "pine",
     "x": 47.61,
     "y": 97.05,
     "v": 2
    },
    {
     "t": "pine",
     "x": 94.55,
     "y": 53.29,
     "v": 3
    },
    {
     "t": "pine",
     "x": 95.74,
     "y": 53.35,
     "v": 5
    },
    {
     "t": "pine",
     "x": 81.14,
     "y": 55.73,
     "v": 4
    },
    {
     "t": "pine",
     "x": 63.51,
     "y": 64.81,
     "v": 1
    },
    {
     "t": "pine",
     "x": 23.99,
     "y": 106.02,
     "v": 3
    },
    {
     "t": "pine",
     "x": 45.77,
     "y": 51.54,
     "v": 2
    },
    {
     "t": "pine",
     "x": 11.51,
     "y": 49.07
    },
    {
     "t": "pine",
     "x": 5.1,
     "y": 40.22,
     "v": 2
    },
    {
     "t": "pine",
     "x": 14.28,
     "y": 107.83,
     "v": 4
    },
    {
     "t": "pine",
     "x": 15.42,
     "y": 106.71,
     "v": 5
    },
    {
     "t": "pine",
     "x": 68.03,
     "y": 76.49,
     "v": 3
    },
    {
     "t": "pine",
     "x": 68.41,
     "y": 78.94,
     "v": 2
    },
    {
     "t": "pine",
     "x": 5.73,
     "y": 56.13,
     "v": 5
    },
    {
     "t": "pine",
     "x": 99.22,
     "y": 84.4,
     "v": 4
    },
    {
     "t": "pine",
     "x": 65.89,
     "y": 82.9,
     "v": 5
    },
    {
     "t": "pine",
     "x": 7.13,
     "y": 96.32
    },
    {
     "t": "pine",
     "x": 47.75,
     "y": 78.7,
     "v": 2
    },
    {
     "t": "pine",
     "x": 50.33,
     "y": 74.49,
     "v": 2
    },
    {
     "t": "pine",
     "x": 16.59,
     "y": 89.22,
     "v": 3
    },
    {
     "t": "pine",
     "x": 15.29,
     "y": 107.7,
     "v": 1
    },
    {
     "t": "pine",
     "x": 40.03,
     "y": 55.92,
     "v": 4
    },
    {
     "t": "pine",
     "x": 18.67,
     "y": 53.84,
     "v": 3
    },
    {
     "t": "pine",
     "x": 48.22,
     "y": 92.46,
     "v": 3
    },
    {
     "t": "pine",
     "x": 35.59,
     "y": 104.55,
     "v": 4
    },
    {
     "t": "pine",
     "x": 35.95,
     "y": 103.46,
     "v": 5
    },
    {
     "t": "pine",
     "x": 74.16,
     "y": 45.85
    },
    {
     "t": "pine",
     "x": 34.98,
     "y": 35.89
    },
    {
     "t": "pine",
     "x": 87.34,
     "y": 64.49,
     "v": 3
    },
    {
     "t": "pine",
     "x": 44.62,
     "y": 31.5,
     "v": 5
    },
    {
     "t": "pine",
     "x": 18.99,
     "y": 100.85,
     "v": 1
    },
    {
     "t": "pine",
     "x": 97.34,
     "y": 60.08,
     "v": 3
    },
    {
     "t": "pine",
     "x": 25.9,
     "y": 67.8,
     "v": 3
    },
    {
     "t": "pine",
     "x": 53.73,
     "y": 29.12,
     "v": 5
    },
    {
     "t": "pine",
     "x": 44.22,
     "y": 99.99,
     "v": 3
    },
    {
     "t": "pine",
     "x": 60.33,
     "y": 59.37,
     "v": 2
    },
    {
     "t": "pine",
     "x": 84.85,
     "y": 58.2,
     "v": 4
    },
    {
     "t": "pine",
     "x": 42.98,
     "y": 61.34,
     "v": 4
    },
    {
     "t": "pine",
     "x": 9.03,
     "y": 42.93,
     "v": 1
    },
    {
     "t": "pine",
     "x": 34.38,
     "y": 65.5
    },
    {
     "t": "pine",
     "x": 34.55,
     "y": 64.23,
     "v": 3
    },
    {
     "t": "pine",
     "x": 80.57,
     "y": 63.42,
     "v": 3
    },
    {
     "t": "pine",
     "x": 33.54,
     "y": 71.55
    },
    {
     "t": "pine",
     "x": 77.51,
     "y": 54.72,
     "v": 1
    },
    {
     "t": "pine",
     "x": 37.21,
     "y": 62.27,
     "v": 4
    },
    {
     "t": "pine",
     "x": 99.84,
     "y": 78.33
    },
    {
     "t": "pine",
     "x": 41.03,
     "y": 71.17,
     "v": 5
    },
    {
     "t": "pine",
     "x": 39.77,
     "y": 71.17,
     "v": 3
    },
    {
     "t": "pine",
     "x": 10.13,
     "y": 42.99
    },
    {
     "t": "pine",
     "x": 12.83,
     "y": 36.35,
     "v": 5
    },
    {
     "t": "pine",
     "x": 6.82,
     "y": 39.07
    },
    {
     "t": "pine",
     "x": 56.18,
     "y": 48.45
    },
    {
     "t": "pine",
     "x": 73.55,
     "y": 22.89,
     "v": 5
    },
    {
     "t": "pine",
     "x": 13.73,
     "y": 92.73
    },
    {
     "t": "pine",
     "x": 38.75,
     "y": 71.54,
     "v": 1
    },
    {
     "t": "pine",
     "x": 30.74,
     "y": 74.97
    },
    {
     "t": "pine",
     "x": 71.91,
     "y": 61.79,
     "v": 3
    },
    {
     "t": "pine",
     "x": 32.77,
     "y": 36.03,
     "v": 5
    },
    {
     "t": "pine",
     "x": 18.26,
     "y": 103.4,
     "v": 5
    },
    {
     "t": "pine",
     "x": 45.45,
     "y": 97.91,
     "v": 5
    },
    {
     "t": "pine",
     "x": 52.05,
     "y": 54.31,
     "v": 3
    },
    {
     "t": "pine",
     "x": 53.39,
     "y": 54.64,
     "v": 1
    },
    {
     "t": "pine",
     "x": 14.7,
     "y": 80.12
    },
    {
     "t": "pine",
     "x": 15.89,
     "y": 80.17,
     "v": 4
    },
    {
     "t": "pine",
     "x": 35.05,
     "y": 105.82,
     "v": 2
    },
    {
     "t": "pine",
     "x": 46.48,
     "y": 48.97,
     "v": 4
    },
    {
     "t": "pine",
     "x": 6.81,
     "y": 86.34
    },
    {
     "t": "pine",
     "x": 101.8,
     "y": 54.92,
     "v": 3
    },
    {
     "t": "pine",
     "x": 7.32,
     "y": 70.97,
     "v": 4
    },
    {
     "t": "pine",
     "x": 36.09,
     "y": 87.57,
     "v": 5
    },
    {
     "t": "pine",
     "x": 19.69,
     "y": 101.79,
     "v": 2
    },
    {
     "t": "pine",
     "x": 34.25,
     "y": 55.71,
     "v": 1
    },
    {
     "t": "pine",
     "x": 34.65,
     "y": 56.8,
     "v": 3
    },
    {
     "t": "pine",
     "x": 39.97,
     "y": 31.76,
     "v": 5
    },
    {
     "t": "pine",
     "x": 91.44,
     "y": 58.44,
     "v": 5
    },
    {
     "t": "pine",
     "x": 40.18,
     "y": 67.8,
     "v": 4
    },
    {
     "t": "pine",
     "x": 94.11,
     "y": 62.57,
     "v": 4
    },
    {
     "t": "pine",
     "x": 88.43,
     "y": 82.62,
     "v": 1
    },
    {
     "t": "pine",
     "x": 0.57,
     "y": 60.36,
     "v": 2
    },
    {
     "t": "pine",
     "x": 51.26,
     "y": 55.04,
     "v": 4
    },
    {
     "t": "pine",
     "x": 20.93,
     "y": 97.75,
     "v": 5
    },
    {
     "t": "pine",
     "x": 19.94,
     "y": 71.35,
     "v": 5
    },
    {
     "t": "pine",
     "x": 12.76,
     "y": 63.28,
     "v": 5
    },
    {
     "t": "pine",
     "x": 68.72,
     "y": 69.66,
     "v": 2
    },
    {
     "t": "pine",
     "x": 89.46,
     "y": 82.51,
     "v": 5
    },
    {
     "t": "pine",
     "x": 46.31,
     "y": 73.77,
     "v": 5
    },
    {
     "t": "pine",
     "x": 17.57,
     "y": 71.94,
     "v": 3
    },
    {
     "t": "pine",
     "x": 58.06,
     "y": 69.29,
     "v": 3
    },
    {
     "t": "pine",
     "x": 50.9,
     "y": 52.95,
     "v": 1
    },
    {
     "t": "pine",
     "x": 34.07,
     "y": 68.05,
     "v": 3
    },
    {
     "t": "pine",
     "x": 33.7,
     "y": 89.58,
     "v": 2
    },
    {
     "t": "pine",
     "x": 27.41,
     "y": 106.87
    },
    {
     "t": "pine",
     "x": 59.06,
     "y": 33.18,
     "v": 2
    },
    {
     "t": "pine",
     "x": 66.42,
     "y": 81.75,
     "v": 2
    },
    {
     "t": "pine",
     "x": 101.39,
     "y": 62.76,
     "v": 3
    },
    {
     "t": "pine",
     "x": 51.75,
     "y": 40.04,
     "v": 1
    },
    {
     "t": "pine",
     "x": 59.29,
     "y": 55.9
    },
    {
     "t": "pine",
     "x": 109.47,
     "y": 45.35,
     "v": 1
    },
    {
     "t": "pine",
     "x": 49.16,
     "y": 59.34,
     "v": 4
    },
    {
     "t": "pine",
     "x": 64.89,
     "y": 43.46,
     "v": 5
    },
    {
     "t": "pine",
     "x": 20.01,
     "y": 75.86,
     "v": 3
    },
    {
     "t": "pine",
     "x": 9.02,
     "y": 73.53,
     "v": 5
    },
    {
     "t": "pine",
     "x": 86.78,
     "y": 47.09,
     "v": 2
    },
    {
     "t": "pine",
     "x": 27.12,
     "y": 102.01,
     "v": 4
    },
    {
     "t": "pine",
     "x": 75.84,
     "y": 75.73,
     "v": 4
    },
    {
     "t": "pine",
     "x": 36.58,
     "y": 44.46,
     "v": 5
    },
    {
     "t": "pine",
     "x": 84.55,
     "y": 30.03,
     "v": 2
    },
    {
     "t": "pine",
     "x": 85.73,
     "y": 29.29,
     "v": 4
    },
    {
     "t": "pine",
     "x": 92.25,
     "y": 87.93,
     "v": 5
    },
    {
     "t": "pine",
     "x": 6.84,
     "y": 37.72,
     "v": 3
    },
    {
     "t": "pine",
     "x": 12.89,
     "y": 99.83,
     "v": 2
    },
    {
     "t": "pine",
     "x": 9.31,
     "y": 58.03,
     "v": 4
    },
    {
     "t": "pine",
     "x": 26.7,
     "y": 78.82
    },
    {
     "t": "pine",
     "x": 60.32,
     "y": 63.05
    },
    {
     "t": "pine",
     "x": 58.77,
     "y": 64.02,
     "v": 1
    },
    {
     "t": "pine",
     "x": 11.96,
     "y": 110,
     "v": 4
    },
    {
     "t": "pine",
     "x": 12.7,
     "y": 92.33,
     "v": 2
    },
    {
     "t": "pine",
     "x": 109.41,
     "y": 53.17,
     "v": 1
    },
    {
     "t": "pine",
     "x": 71.83,
     "y": 60.75,
     "v": 1
    },
    {
     "t": "pine",
     "x": 19.85,
     "y": 100.12,
     "v": 3
    },
    {
     "t": "pine",
     "x": 46.76,
     "y": 72.64,
     "v": 1
    },
    {
     "t": "pine",
     "x": 26.12,
     "y": 90.96,
     "v": 4
    },
    {
     "t": "pine",
     "x": 59.85,
     "y": 64.89,
     "v": 5
    },
    {
     "t": "pine",
     "x": 60.65,
     "y": 62,
     "v": 3
    },
    {
     "t": "pine",
     "x": 38.76,
     "y": 36.22
    },
    {
     "t": "pine",
     "x": 85.15,
     "y": 63.03,
     "v": 5
    },
    {
     "t": "pine",
     "x": 8.47,
     "y": 39.69,
     "v": 1
    },
    {
     "t": "pine",
     "x": 46.36,
     "y": 96.54
    },
    {
     "t": "pine",
     "x": 10.99,
     "y": 97.18,
     "v": 5
    },
    {
     "t": "pine",
     "x": 89.38,
     "y": 48.74
    },
    {
     "t": "pine",
     "x": 86.75,
     "y": 59.15,
     "v": 3
    },
    {
     "t": "pine",
     "x": 87.87,
     "y": 36.12,
     "v": 3
    },
    {
     "t": "pine",
     "x": 97.5,
     "y": 79.24,
     "v": 1
    },
    {
     "t": "pine",
     "x": 27.94,
     "y": 74.99,
     "v": 2
    },
    {
     "t": "pine",
     "x": 35.37,
     "y": 64.91,
     "v": 1
    },
    {
     "t": "pine",
     "x": 35.8,
     "y": 63.91,
     "v": 5
    },
    {
     "t": "pine",
     "x": 90.37,
     "y": 57.21,
     "v": 4
    },
    {
     "t": "pine",
     "x": 6.57,
     "y": 88.81,
     "v": 1
    },
    {
     "t": "pine",
     "x": 3.19,
     "y": 109.56,
     "v": 2
    },
    {
     "t": "pine",
     "x": 3.13,
     "y": 110.86,
     "v": 5
    },
    {
     "t": "pine",
     "x": 1.96,
     "y": 63.94
    },
    {
     "t": "pine",
     "x": 100.06,
     "y": 87.99,
     "v": 3
    },
    {
     "t": "pine",
     "x": 11.57,
     "y": 44.66,
     "v": 1
    },
    {
     "t": "pine",
     "x": 49.95,
     "y": 96.84,
     "v": 4
    },
    {
     "t": "pine",
     "x": 49.58,
     "y": 76.27,
     "v": 4
    },
    {
     "t": "pine",
     "x": 16.69,
     "y": 107.93,
     "v": 2
    },
    {
     "t": "pine",
     "x": 27.3,
     "y": 32.47,
     "v": 3
    },
    {
     "t": "pine",
     "x": 11.86,
     "y": 85.76
    },
    {
     "t": "pine",
     "x": 1.05,
     "y": 57.58
    },
    {
     "t": "pine",
     "x": 3.78,
     "y": 63.52,
     "v": 4
    },
    {
     "t": "pine",
     "x": 52.51,
     "y": 28.06,
     "v": 1
    },
    {
     "t": "pine",
     "x": 51.11,
     "y": 75.16,
     "v": 3
    },
    {
     "t": "pine",
     "x": 101.19,
     "y": 57.31,
     "v": 4
    },
    {
     "t": "pine",
     "x": 108.25,
     "y": 53.94,
     "v": 3
    },
    {
     "t": "pine",
     "x": 34.45,
     "y": 28.82,
     "v": 3
    },
    {
     "t": "pine",
     "x": 69.88,
     "y": 23.04,
     "v": 1
    },
    {
     "t": "pine",
     "x": 35.38,
     "y": 85.38,
     "v": 1
    },
    {
     "t": "pine",
     "x": 42.68,
     "y": 52.47,
     "v": 2
    },
    {
     "t": "pine",
     "x": 44.36,
     "y": 51.46,
     "v": 1
    },
    {
     "t": "pine",
     "x": 98.48,
     "y": 80.66,
     "v": 3
    },
    {
     "t": "pine",
     "x": 13.41,
     "y": 48.82,
     "v": 4
    },
    {
     "t": "pine",
     "x": 15.7,
     "y": 60.18,
     "v": 4
    },
    {
     "t": "pine",
     "x": 79.91,
     "y": 77.39,
     "v": 2
    },
    {
     "t": "pine",
     "x": 7.03,
     "y": 77.39,
     "v": 5
    },
    {
     "t": "pine",
     "x": 54.54,
     "y": 82.43,
     "v": 1
    },
    {
     "t": "pine",
     "x": 44.86,
     "y": 73.96,
     "v": 2
    },
    {
     "t": "pine",
     "x": 86.92,
     "y": 35.48,
     "v": 1
    },
    {
     "t": "pine",
     "x": 36.17,
     "y": 66.6,
     "v": 2
    },
    {
     "t": "pine",
     "x": 62.97,
     "y": 52.74,
     "v": 4
    },
    {
     "t": "pine",
     "x": 12.05,
     "y": 37.44
    },
    {
     "t": "pine",
     "x": 98.2,
     "y": 88.82,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 10.77,
     "y": 91.1,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 96.6,
     "y": 87.73,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 99.76,
     "y": 86.83,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 60.98,
     "y": 64.59,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 103.06,
     "y": 48.76,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 58.41,
     "y": 34.09,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 84.65,
     "y": 51.63,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 18.68,
     "y": 58,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 18.76,
     "y": 57.3,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 107.04,
     "y": 53.74
    },
    {
     "t": "pine_young",
     "x": 100.57,
     "y": 82.61,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 67.62,
     "y": 63.15,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 32.85,
     "y": 110.24,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 97.86,
     "y": 51.57
    },
    {
     "t": "pine_young",
     "x": 46.87,
     "y": 38.49
    },
    {
     "t": "pine_young",
     "x": 4.98,
     "y": 97.52,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 3.71,
     "y": 66.49,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 42.95,
     "y": 67.84,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 95.07,
     "y": 61.22
    },
    {
     "t": "pine_young",
     "x": 28.37,
     "y": 105.61,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 91.63,
     "y": 57.13
    },
    {
     "t": "pine_young",
     "x": 12.19,
     "y": 97.93,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 101.53,
     "y": 59.23,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 90.26,
     "y": 48.85,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 36.41,
     "y": 31.63,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 19.64,
     "y": 74.62
    },
    {
     "t": "pine_young",
     "x": 59.66,
     "y": 63.52
    },
    {
     "t": "pine_young",
     "x": 56.67,
     "y": 68.57
    },
    {
     "t": "pine_young",
     "x": 98.27,
     "y": 59.53,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 89.41,
     "y": 49.54,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 4.32,
     "y": 57.47,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 38.05,
     "y": 40.06
    },
    {
     "t": "pine_young",
     "x": 89.92,
     "y": 56.04,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 9.08,
     "y": 67.65,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 8.58,
     "y": 66.95
    },
    {
     "t": "pine_young",
     "x": 108.25,
     "y": 60.43,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 26,
     "y": 89.37,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 16.08,
     "y": 107.29,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 93.81,
     "y": 64.27,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 93.82,
     "y": 63.63,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 13.41,
     "y": 86.41,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 11.34,
     "y": 107.13
    },
    {
     "t": "pine_young",
     "x": 12.05,
     "y": 106.9,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 45.09,
     "y": 48.47
    },
    {
     "t": "pine_young",
     "x": 79.2,
     "y": 60,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 29.92,
     "y": 26.66,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 105.47,
     "y": 58.61,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 61.94,
     "y": 64.02,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 63.03,
     "y": 64.05,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 43.68,
     "y": 70.13,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 56.32,
     "y": 34.36,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 17.47,
     "y": 66.92,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 46.72,
     "y": 39.24,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 63.98,
     "y": 64.12
    },
    {
     "t": "pine_young",
     "x": 92.61,
     "y": 49.23,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 78.55,
     "y": 70.77,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 22.59,
     "y": 74.18,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 57.65,
     "y": 27.64,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 80.36,
     "y": 62.12,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 106.76,
     "y": 50.62
    },
    {
     "t": "pine_young",
     "x": 52.08,
     "y": 41.2,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 87.22,
     "y": 68.41,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 57.17,
     "y": 61.22,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 96.73,
     "y": 65.39,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 28.78,
     "y": 28.97,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 30.24,
     "y": 73.3,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 108.55,
     "y": 51.47,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 34.67,
     "y": 88.45,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 27.5,
     "y": 69.65,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 28.01,
     "y": 70.24,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 23.82,
     "y": 73.59
    },
    {
     "t": "pine_young",
     "x": 7.63,
     "y": 85.63,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 36.53,
     "y": 30.67,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 71.69,
     "y": 70.88,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 93.78,
     "y": 49.88,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 93.31,
     "y": 49.3
    },
    {
     "t": "pine_young",
     "x": 78.15,
     "y": 63.72
    },
    {
     "t": "pine_young",
     "x": 29.04,
     "y": 35.95
    },
    {
     "t": "pine_young",
     "x": 36.44,
     "y": 86.44,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 52.56,
     "y": 43.68
    },
    {
     "t": "pine_young",
     "x": 56.95,
     "y": 67.07,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 106.27,
     "y": 57.98,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 29.1,
     "y": 96.69,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 30.59,
     "y": 96.85,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 20.67,
     "y": 75.01,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 93.06,
     "y": 48.6,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 72.04,
     "y": 72.1,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 96.66,
     "y": 43.33,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 96.82,
     "y": 44.25
    },
    {
     "t": "pine_young",
     "x": 28.38,
     "y": 66.04,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 26.82,
     "y": 65.87,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 22.55,
     "y": 65.39,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 95.05,
     "y": 54.31
    },
    {
     "t": "pine_young",
     "x": 45.82,
     "y": 84.88,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 6.16,
     "y": 82.27,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 107.82,
     "y": 50.9,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 25.7,
     "y": 65.42,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 64.37,
     "y": 63.55,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 72.27,
     "y": 32.92,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 88.26,
     "y": 59.3
    },
    {
     "t": "pine_young",
     "x": 3.07,
     "y": 65.79,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 53.6,
     "y": 34.64,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 53.77,
     "y": 35.66
    },
    {
     "t": "pine_young",
     "x": 52.01,
     "y": 35.07,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 61.37,
     "y": 63.77,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 103.66,
     "y": 60.39,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 108.32,
     "y": 48.89,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 5.39,
     "y": 68.09,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 10.77,
     "y": 61.83,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 101.89,
     "y": 50.47,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 14.16,
     "y": 45.51,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 87.02,
     "y": 45.79,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 87.59,
     "y": 45.54
    },
    {
     "t": "pine_young",
     "x": 87.45,
     "y": 46.4,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 95.41,
     "y": 57.93,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 96.04,
     "y": 57.43,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 53.05,
     "y": 34.88,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 14.35,
     "y": 93.27
    },
    {
     "t": "pine_young",
     "x": 29.78,
     "y": 91.19,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 72.95,
     "y": 57.29,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 98.75,
     "y": 51.88,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 99.36,
     "y": 52.7,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 97.83,
     "y": 52.97,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 39.28,
     "y": 72.31,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 11.42,
     "y": 108.18,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 36.56,
     "y": 63.13,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 87.69,
     "y": 58.66,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 42.35,
     "y": 83.1,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 7.62,
     "y": 63.77,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 100.88,
     "y": 58.71,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 106.94,
     "y": 59.75,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 92.42,
     "y": 48.5,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 92.63,
     "y": 47.68,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 97.7,
     "y": 56.11,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 96.76,
     "y": 57.93
    },
    {
     "t": "pine_young",
     "x": 61.17,
     "y": 62.74,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 31.19,
     "y": 25.74,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 98.64,
     "y": 52.61,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 29.65,
     "y": 28.95
    },
    {
     "t": "pine_young",
     "x": 76.83,
     "y": 32.05,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 76.8,
     "y": 66.5,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 77.61,
     "y": 66.31,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 33.06,
     "y": 110.82,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 109.79,
     "y": 48.8,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 99.6,
     "y": 80.35,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 84.87,
     "y": 59.53
    },
    {
     "t": "pine_young",
     "x": 105.23,
     "y": 52.48,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 99.15,
     "y": 60.94,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 25.64,
     "y": 109.18
    },
    {
     "t": "pine_young",
     "x": 13.58,
     "y": 87.39
    },
    {
     "t": "pine_young",
     "x": 14.41,
     "y": 88.17,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 3.09,
     "y": 63.92,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 33.45,
     "y": 93.03,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 50.42,
     "y": 75.76,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 38.01,
     "y": 73.58,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 101.28,
     "y": 82.27,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 101.54,
     "y": 61.95,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 43.85,
     "y": 83.99,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 55.93,
     "y": 35.28,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 57.29,
     "y": 68.68,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 56.97,
     "y": 69.19,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 10.05,
     "y": 108.65,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 9.86,
     "y": 110.85
    },
    {
     "t": "pine_young",
     "x": 15.89,
     "y": 108.37,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 14.32,
     "y": 106.95,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 75.65,
     "y": 64.74,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 57.48,
     "y": 70.01,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 19.52,
     "y": 73.78,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 21.22,
     "y": 73.71,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 20.32,
     "y": 72.98,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 68.13,
     "y": 60.32,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 103.59,
     "y": 59.11
    },
    {
     "t": "pine_young",
     "x": 104.9,
     "y": 58.29,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 52.43,
     "y": 29.59,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 47.18,
     "y": 93.55,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 41.73,
     "y": 71.77,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 94.49,
     "y": 58.04,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 63.54,
     "y": 61.86,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 78.95,
     "y": 70.08,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 79.74,
     "y": 70.22,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 79.27,
     "y": 70.99
    },
    {
     "t": "pine_young",
     "x": 94.92,
     "y": 64.96
    },
    {
     "t": "pine_young",
     "x": 82.47,
     "y": 38.14,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 46.43,
     "y": 71.79,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 19.39,
     "y": 88.37,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 18.51,
     "y": 90.04,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 80.51,
     "y": 65.62,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 80.13,
     "y": 64.28,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 40.47,
     "y": 40.1,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 97.35,
     "y": 56.92,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 102,
     "y": 52.34,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 32.47,
     "y": 102.21,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 31.19,
     "y": 101.6,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 12.31,
     "y": 101.09,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 13.75,
     "y": 100.41
    },
    {
     "t": "pine_young",
     "x": 37.33,
     "y": 44.11,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 7.77,
     "y": 77.76,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 8.71,
     "y": 77.1
    },
    {
     "t": "pine_young",
     "x": 34.54,
     "y": 29.62,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 25.09,
     "y": 74.45,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 101.28,
     "y": 50.78,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 30.17,
     "y": 35.86,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 31.12,
     "y": 35.53,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 15.78,
     "y": 73.63,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 67.3,
     "y": 70.25,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 33.4,
     "y": 51.9,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 55.97,
     "y": 27.38,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 107.6,
     "y": 58.73
    },
    {
     "t": "pine_young",
     "x": 109.14,
     "y": 52.23,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 90.76,
     "y": 50.63,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 68.75,
     "y": 60.68,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 100.73,
     "y": 54.98
    },
    {
     "t": "pine_young",
     "x": 9.4,
     "y": 58.93,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 10.17,
     "y": 61.53
    },
    {
     "t": "pine_young",
     "x": 34.61,
     "y": 73.74,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 26.31,
     "y": 72.56,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 76.16,
     "y": 64.16,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 110.07,
     "y": 58.6,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 48,
     "y": 80.69,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 22.3,
     "y": 70.96,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 23.01,
     "y": 71.54,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 23.04,
     "y": 72.27,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 22.27,
     "y": 70.17,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 6.99,
     "y": 108.35,
     "v": 5
    },
    {
     "t": "pine_young",
     "x": 46.09,
     "y": 50.17,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 103.18,
     "y": 58.55,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 103.78,
     "y": 57.72,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 9.66,
     "y": 68.03,
     "v": 1
    },
    {
     "t": "mushroom_red",
     "x": 56.75,
     "y": 75.69
    },
    {
     "t": "mushroom_red",
     "x": 56.88,
     "y": 76.93
    },
    {
     "t": "mushroom_red",
     "x": 24.65,
     "y": 110.52
    },
    {
     "t": "mushroom_red",
     "x": 24.84,
     "y": 111
    },
    {
     "t": "mushroom_red",
     "x": 53.06,
     "y": 75.9
    },
    {
     "t": "mushroom_red",
     "x": 52.85,
     "y": 75.3
    },
    {
     "t": "mushroom_red",
     "x": 37.9,
     "y": 71.71
    },
    {
     "t": "mushroom_red",
     "x": 51.24,
     "y": 73.88
    },
    {
     "t": "mushroom_red",
     "x": 92.67,
     "y": 54.7
    },
    {
     "t": "mushroom_red",
     "x": 92.01,
     "y": 55
    },
    {
     "t": "mushroom_red",
     "x": 73.04,
     "y": 46.46
    },
    {
     "t": "mushroom_red",
     "x": 72.95,
     "y": 48.5
    },
    {
     "t": "mushroom_red",
     "x": 72.74,
     "y": 47.92
    },
    {
     "t": "mushroom_red",
     "x": 72.3,
     "y": 49.08
    },
    {
     "t": "mushroom_red",
     "x": 73.79,
     "y": 48.24
    },
    {
     "t": "mushroom_red",
     "x": 95.7,
     "y": 86.62
    },
    {
     "t": "mushroom_red",
     "x": 94.72,
     "y": 86.01
    },
    {
     "t": "mushroom_red",
     "x": 95.62,
     "y": 86.05
    },
    {
     "t": "mushroom_red",
     "x": 5.2,
     "y": 96.03
    },
    {
     "t": "mushroom_red",
     "x": 35.87,
     "y": 51.41
    },
    {
     "t": "mushroom_red",
     "x": 36.57,
     "y": 51.37
    },
    {
     "t": "mushroom_red",
     "x": 34.76,
     "y": 92.81
    },
    {
     "t": "mushroom_red",
     "x": 34.97,
     "y": 92.14
    },
    {
     "t": "mushroom_red",
     "x": 35.23,
     "y": 93.51
    },
    {
     "t": "mushroom_red",
     "x": 58.31,
     "y": 68.53
    },
    {
     "t": "mushroom_red",
     "x": 31.34,
     "y": 28.25
    },
    {
     "t": "mushroom_red",
     "x": 73.32,
     "y": 47.26
    },
    {
     "t": "mushroom_red",
     "x": 73.85,
     "y": 47.71
    },
    {
     "t": "mushroom_red",
     "x": 14.65,
     "y": 75.64
    },
    {
     "t": "mushroom_red",
     "x": 15.42,
     "y": 75.69
    },
    {
     "t": "mushroom_red",
     "x": 37.12,
     "y": 67.69
    },
    {
     "t": "mushroom_red",
     "x": 37.1,
     "y": 68.5
    },
    {
     "t": "mushroom_red",
     "x": 32.52,
     "y": 51.75
    },
    {
     "t": "mushroom_red",
     "x": 39.67,
     "y": 74.99
    },
    {
     "t": "mushroom_red",
     "x": 74.33,
     "y": 48.51
    },
    {
     "t": "mushroom_red",
     "x": 73.74,
     "y": 49.3
    },
    {
     "t": "mushroom_red",
     "x": 7.51,
     "y": 102.05
    },
    {
     "t": "mushroom_red",
     "x": 7.28,
     "y": 101.41
    },
    {
     "t": "mushroom_red",
     "x": 46.73,
     "y": 40.32
    },
    {
     "t": "mushroom_red",
     "x": 47.42,
     "y": 40.48
    },
    {
     "t": "mushroom_red",
     "x": 6.31,
     "y": 66.83
    },
    {
     "t": "mushroom_red",
     "x": 35.97,
     "y": 50.56
    },
    {
     "t": "mushroom_red",
     "x": 16.41,
     "y": 66.82
    },
    {
     "t": "mushroom_red",
     "x": 51.24,
     "y": 43.22
    },
    {
     "t": "mushroom_red",
     "x": 52.4,
     "y": 59
    },
    {
     "t": "mushroom_red",
     "x": 52.33,
     "y": 57.55
    },
    {
     "t": "mushroom_red",
     "x": 43.3,
     "y": 74.98
    },
    {
     "t": "mushroom_red",
     "x": 71.8,
     "y": 44.89
    },
    {
     "t": "mushroom_red",
     "x": 71.17,
     "y": 45.38
    },
    {
     "t": "mushroom_red",
     "x": 72.05,
     "y": 44.07
    },
    {
     "t": "mushroom_red",
     "x": 25.8,
     "y": 78.42
    },
    {
     "t": "mushroom_red",
     "x": 30.12,
     "y": 105.37
    },
    {
     "t": "mushroom_red",
     "x": 33.95,
     "y": 51.23
    },
    {
     "t": "mushroom_red",
     "x": 54.17,
     "y": 33
    },
    {
     "t": "mushroom_red",
     "x": 92.25,
     "y": 58.93
    },
    {
     "t": "mushroom_red",
     "x": 92.23,
     "y": 53.52
    },
    {
     "t": "mushroom_red",
     "x": 82.05,
     "y": 49.29
    },
    {
     "t": "mushroom_red",
     "x": 82.51,
     "y": 49.67
    },
    {
     "t": "mushroom_red",
     "x": 82.82,
     "y": 49.02
    },
    {
     "t": "mushroom_red",
     "x": 53.37,
     "y": 37.79
    },
    {
     "t": "mushroom_red",
     "x": 26.45,
     "y": 32.55
    },
    {
     "t": "mushroom_red",
     "x": 5.51,
     "y": 97.15
    },
    {
     "t": "mushroom_red",
     "x": 19.93,
     "y": 59.73
    },
    {
     "t": "mushroom_red",
     "x": 20.3,
     "y": 60.25
    },
    {
     "t": "mushroom_red",
     "x": 20.61,
     "y": 59.21
    },
    {
     "t": "mushroom_red",
     "x": 19.66,
     "y": 60.3
    },
    {
     "t": "mushroom_red",
     "x": 51.12,
     "y": 60.55
    },
    {
     "t": "mushroom_red",
     "x": 49.91,
     "y": 73.73
    },
    {
     "t": "mushroom_red",
     "x": 5.71,
     "y": 102.71
    },
    {
     "t": "mushroom_red",
     "x": 6.52,
     "y": 102.35
    },
    {
     "t": "mushroom_red",
     "x": 6.32,
     "y": 102.89
    },
    {
     "t": "mushroom_red",
     "x": 47.13,
     "y": 73.34
    },
    {
     "t": "mushroom_red",
     "x": 79.38,
     "y": 45.35
    },
    {
     "t": "mushroom_red",
     "x": 80.12,
     "y": 45.53
    },
    {
     "t": "mushroom_red",
     "x": 52.27,
     "y": 36.97
    },
    {
     "t": "mushroom_red",
     "x": 30.56,
     "y": 27.28
    },
    {
     "t": "mushroom_red",
     "x": 91.38,
     "y": 66.93
    },
    {
     "t": "mushroom_red",
     "x": 96.5,
     "y": 86.95
    },
    {
     "t": "mushroom_red",
     "x": 93.25,
     "y": 87.08
    },
    {
     "t": "mushroom_red",
     "x": 55.15,
     "y": 37.8
    },
    {
     "t": "mushroom_red",
     "x": 54.64,
     "y": 37.83
    },
    {
     "t": "mushroom_red",
     "x": 31.51,
     "y": 50.89
    },
    {
     "t": "mushroom_red",
     "x": 29.49,
     "y": 29.48
    },
    {
     "t": "mushroom_red",
     "x": 25.64,
     "y": 74.6
    },
    {
     "t": "mushroom_red",
     "x": 26.64,
     "y": 74.52
    },
    {
     "t": "mushroom_red",
     "x": 38.7,
     "y": 64.78
    },
    {
     "t": "mushroom_red",
     "x": 39.28,
     "y": 64.82
    },
    {
     "t": "mushroom_red",
     "x": 38.06,
     "y": 65.24
    },
    {
     "t": "mushroom_red",
     "x": 63.49,
     "y": 68.15
    },
    {
     "t": "mushroom_red",
     "x": 32.37,
     "y": 75.94
    },
    {
     "t": "mushroom_red",
     "x": 31.67,
     "y": 75.84
    },
    {
     "t": "mushroom_red",
     "x": 18.97,
     "y": 59.22
    },
    {
     "t": "mushroom_red",
     "x": 34.19,
     "y": 31.32
    },
    {
     "t": "mushroom_red",
     "x": 35.3,
     "y": 68.71
    },
    {
     "t": "mushroom_red",
     "x": 35.79,
     "y": 68.55
    },
    {
     "t": "mushroom_red",
     "x": 34.89,
     "y": 68.04
    },
    {
     "t": "mushroom_red",
     "x": 94.68,
     "y": 84.93
    },
    {
     "t": "mushroom_red",
     "x": 95.49,
     "y": 85.04
    },
    {
     "t": "mushroom_red",
     "x": 32.45,
     "y": 28.31
    },
    {
     "t": "mushroom_red",
     "x": 31.83,
     "y": 28.49
    },
    {
     "t": "mushroom_red",
     "x": 30.58,
     "y": 73.82
    },
    {
     "t": "mushroom_red",
     "x": 19.95,
     "y": 76.84
    },
    {
     "t": "mushroom_red",
     "x": 19.18,
     "y": 76.4
    },
    {
     "t": "mushroom_red",
     "x": 59.59,
     "y": 77.29
    },
    {
     "t": "mushroom_red",
     "x": 59.78,
     "y": 76.52
    },
    {
     "t": "mushroom_red",
     "x": 59.25,
     "y": 77.71
    },
    {
     "t": "mushroom_red",
     "x": 17.05,
     "y": 71.36
    },
    {
     "t": "mushroom_red",
     "x": 51.93,
     "y": 64.75
    },
    {
     "t": "mushroom_red",
     "x": 51.25,
     "y": 64.85
    },
    {
     "t": "mushroom_red",
     "x": 57.54,
     "y": 64.72
    },
    {
     "t": "mushroom_red",
     "x": 56.98,
     "y": 64.51
    },
    {
     "t": "mushroom_red",
     "x": 31.55,
     "y": 66.2
    },
    {
     "t": "mushroom_red",
     "x": 94.86,
     "y": 54.95
    },
    {
     "t": "mushroom_red",
     "x": 90.82,
     "y": 60.18
    },
    {
     "t": "mushroom_red",
     "x": 80.79,
     "y": 51.47
    },
    {
     "t": "mushroom_red",
     "x": 81.35,
     "y": 51.29
    },
    {
     "t": "mushroom_red",
     "x": 80.53,
     "y": 50.98
    },
    {
     "t": "mushroom_red",
     "x": 80.01,
     "y": 51.13
    },
    {
     "t": "mushroom_red",
     "x": 88.73,
     "y": 50.73
    },
    {
     "t": "mushroom_red",
     "x": 88.21,
     "y": 50.45
    },
    {
     "t": "mushroom_red",
     "x": 58.95,
     "y": 54.49
    },
    {
     "t": "mushroom_red",
     "x": 52.23,
     "y": 37.79
    },
    {
     "t": "grass",
     "x": 39.15,
     "y": 32.89,
     "v": 1
    },
    {
     "t": "grass",
     "x": 39.78,
     "y": 33.45
    },
    {
     "t": "grass",
     "x": 51.63,
     "y": 81.86
    },
    {
     "t": "grass",
     "x": 51.91,
     "y": 82.35,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 51.08,
     "y": 82.31,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 13.85,
     "y": 86.85
    },
    {
     "t": "grass",
     "x": 86.16,
     "y": 33.62,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 85.9,
     "y": 34.1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 10.4,
     "y": 83.75,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 11.45,
     "y": 83.85
    },
    {
     "t": "grass",
     "x": 10.96,
     "y": 83.31,
     "f": 1
    },
    {
     "t": "grass",
     "x": 64.7,
     "y": 80.91
    },
    {
     "t": "grass",
     "x": 64.38,
     "y": 80.1,
     "v": 1
    },
    {
     "t": "grass",
     "x": 64.32,
     "y": 81.62,
     "v": 1
    },
    {
     "t": "grass",
     "x": 64.23,
     "y": 80.69,
     "v": 1
    },
    {
     "t": "grass",
     "x": 49.42,
     "y": 43.26,
     "v": 1
    },
    {
     "t": "grass",
     "x": 49.9,
     "y": 43.6
    },
    {
     "t": "grass",
     "x": 93.57,
     "y": 79.12,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 93.57,
     "y": 78.35,
     "f": 1
    },
    {
     "t": "grass",
     "x": 13.64,
     "y": 54.56
    },
    {
     "t": "grass",
     "x": 13.45,
     "y": 55.22,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 72.92,
     "y": 41.79
    },
    {
     "t": "grass",
     "x": 82.3,
     "y": 46.79,
     "f": 1
    },
    {
     "t": "grass",
     "x": 33.72,
     "y": 34.27
    },
    {
     "t": "grass",
     "x": 33.09,
     "y": 34.78,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 9.09,
     "y": 54.97,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 17.4,
     "y": 72.78,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 94.22,
     "y": 79.55,
     "f": 1
    },
    {
     "t": "grass",
     "x": 26.13,
     "y": 53.31,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 25.89,
     "y": 53.92
    },
    {
     "t": "grass",
     "x": 42.5,
     "y": 32.39,
     "v": 1
    },
    {
     "t": "grass",
     "x": 41.96,
     "y": 32.98,
     "f": 1
    },
    {
     "t": "grass",
     "x": 43.86,
     "y": 37.36,
     "f": 1
    },
    {
     "t": "grass",
     "x": 43.31,
     "y": 36.99,
     "v": 1
    },
    {
     "t": "grass",
     "x": 44.2,
     "y": 36.69,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 44.65,
     "y": 37.86,
     "v": 1
    },
    {
     "t": "grass",
     "x": 66.83,
     "y": 38.33
    },
    {
     "t": "grass",
     "x": 66.11,
     "y": 38.1,
     "v": 1
    },
    {
     "t": "grass",
     "x": 67.13,
     "y": 37.4,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 66.95,
     "y": 39,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 46.43,
     "y": 45.51,
     "v": 1
    },
    {
     "t": "grass",
     "x": 83.56,
     "y": 34.62,
     "v": 1
    },
    {
     "t": "grass",
     "x": 83.62,
     "y": 33.82
    },
    {
     "t": "grass",
     "x": 29.37,
     "y": 97.38
    },
    {
     "t": "grass",
     "x": 87.1,
     "y": 31.7,
     "f": 1
    },
    {
     "t": "grass",
     "x": 86.09,
     "y": 31.28,
     "v": 1
    },
    {
     "t": "grass",
     "x": 104.36,
     "y": 45.14,
     "v": 1
    },
    {
     "t": "grass",
     "x": 103.39,
     "y": 45.64,
     "f": 1
    },
    {
     "t": "grass",
     "x": 92.33,
     "y": 79.96
    },
    {
     "t": "grass",
     "x": 91.32,
     "y": 79.62,
     "v": 1
    },
    {
     "t": "grass",
     "x": 52.51,
     "y": 70.5,
     "f": 1
    },
    {
     "t": "grass",
     "x": 53.11,
     "y": 70.8,
     "v": 1
    },
    {
     "t": "grass",
     "x": 18.28,
     "y": 51.53,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 17.84,
     "y": 52.33
    },
    {
     "t": "grass",
     "x": 15.6,
     "y": 53,
     "v": 1
    },
    {
     "t": "grass",
     "x": 15.16,
     "y": 52.41,
     "f": 1
    },
    {
     "t": "grass",
     "x": 33.57,
     "y": 63.27,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 63.7,
     "y": 48.46,
     "f": 1
    },
    {
     "t": "grass",
     "x": 69.17,
     "y": 23.41
    },
    {
     "t": "grass",
     "x": 75.75,
     "y": 39.13,
     "f": 1
    },
    {
     "t": "grass",
     "x": 74.62,
     "y": 39.18,
     "v": 1
    },
    {
     "t": "grass",
     "x": 96.47,
     "y": 45.5,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 95.76,
     "y": 46.2,
     "f": 1
    },
    {
     "t": "grass",
     "x": 95.72,
     "y": 44.98,
     "f": 1
    },
    {
     "t": "grass",
     "x": 19.86,
     "y": 92.54,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 20.72,
     "y": 91.87,
     "f": 1
    },
    {
     "t": "grass",
     "x": 19.73,
     "y": 93.22
    },
    {
     "t": "grass",
     "x": 91.04,
     "y": 46.15
    },
    {
     "t": "grass",
     "x": 91.7,
     "y": 45.67,
     "v": 1
    },
    {
     "t": "grass",
     "x": 87.77,
     "y": 53.82,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 86.98,
     "y": 52.97
    },
    {
     "t": "grass",
     "x": 99.97,
     "y": 46.35,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 100.64,
     "y": 46.6,
     "f": 1
    },
    {
     "t": "grass",
     "x": 15.6,
     "y": 61.71,
     "f": 1
    },
    {
     "t": "grass",
     "x": 18.12,
     "y": 61.47,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 78.38,
     "y": 46.53,
     "f": 1
    },
    {
     "t": "grass",
     "x": 13.64,
     "y": 104.96,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 13.74,
     "y": 106.1
    },
    {
     "t": "grass",
     "x": 13.34,
     "y": 105.76,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 82.09,
     "y": 50.12,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 91.91,
     "y": 80.64,
     "v": 1
    },
    {
     "t": "grass",
     "x": 90.82,
     "y": 80.49,
     "f": 1
    },
    {
     "t": "grass",
     "x": 33.08,
     "y": 61.72
    },
    {
     "t": "grass",
     "x": 32.33,
     "y": 60.86,
     "v": 1
    },
    {
     "t": "grass",
     "x": 32.57,
     "y": 61.43,
     "v": 1
    },
    {
     "t": "grass",
     "x": 33.83,
     "y": 61.2,
     "v": 1
    },
    {
     "t": "grass",
     "x": 29.42,
     "y": 59.28,
     "f": 1
    },
    {
     "t": "grass",
     "x": 29.95,
     "y": 58.69,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 28.25,
     "y": 59.14,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 29.45,
     "y": 58.77,
     "f": 1
    },
    {
     "t": "grass",
     "x": 35.85,
     "y": 32.72,
     "v": 1
    },
    {
     "t": "grass",
     "x": 50.79,
     "y": 84.32,
     "f": 1
    },
    {
     "t": "grass",
     "x": 51.56,
     "y": 84.04,
     "v": 1
    },
    {
     "t": "grass",
     "x": 58.56,
     "y": 50.96,
     "v": 1
    },
    {
     "t": "grass",
     "x": 87.27,
     "y": 67.22
    },
    {
     "t": "grass",
     "x": 21.79,
     "y": 94.59,
     "v": 1
    },
    {
     "t": "grass",
     "x": 21.93,
     "y": 93.89
    },
    {
     "t": "grass",
     "x": 17.99,
     "y": 93.37,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 18.42,
     "y": 94.48,
     "f": 1
    },
    {
     "t": "grass",
     "x": 18.24,
     "y": 92.23
    },
    {
     "t": "grass",
     "x": 17.55,
     "y": 92.38,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 44.95,
     "y": 87.3,
     "v": 1
    },
    {
     "t": "grass",
     "x": 44.54,
     "y": 35.27,
     "f": 1
    },
    {
     "t": "grass",
     "x": 45.53,
     "y": 35.2,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 26.52,
     "y": 55.22,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 25.41,
     "y": 55.36
    },
    {
     "t": "grass",
     "x": 26.24,
     "y": 56.17
    },
    {
     "t": "grass",
     "x": 66,
     "y": 43.31,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 28.17,
     "y": 58.28,
     "f": 1
    },
    {
     "t": "grass",
     "x": 27.32,
     "y": 58.61,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 29.05,
     "y": 58.14,
     "v": 1
    },
    {
     "t": "grass",
     "x": 38.72,
     "y": 98.29
    },
    {
     "t": "grass",
     "x": 30.43,
     "y": 47.76,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 30.94,
     "y": 47.62,
     "f": 1
    },
    {
     "t": "grass",
     "x": 46,
     "y": 38.25
    },
    {
     "t": "grass",
     "x": 45.83,
     "y": 38.9,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 58.06,
     "y": 48.07
    },
    {
     "t": "grass",
     "x": 57.75,
     "y": 49.01,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 59.05,
     "y": 47.52,
     "v": 1
    },
    {
     "t": "grass",
     "x": 30.86,
     "y": 63.19
    },
    {
     "t": "grass",
     "x": 29.68,
     "y": 63.23,
     "v": 1
    },
    {
     "t": "grass",
     "x": 54.09,
     "y": 72.65,
     "f": 1
    },
    {
     "t": "grass",
     "x": 53.33,
     "y": 72.41,
     "v": 1
    },
    {
     "t": "grass",
     "x": 53.93,
     "y": 73.55,
     "v": 1
    },
    {
     "t": "grass",
     "x": 19.18,
     "y": 66.37,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 54.07,
     "y": 67.92
    },
    {
     "t": "grass",
     "x": 59.39,
     "y": 28.79
    },
    {
     "t": "grass",
     "x": 58.36,
     "y": 28.45,
     "v": 1
    },
    {
     "t": "grass",
     "x": 59.31,
     "y": 28.18,
     "v": 1
    },
    {
     "t": "grass",
     "x": 54.1,
     "y": 50.12,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 54.6,
     "y": 50.19,
     "f": 1
    },
    {
     "t": "grass",
     "x": 53.12,
     "y": 50.29
    },
    {
     "t": "grass",
     "x": 42.16,
     "y": 65.6
    },
    {
     "t": "grass",
     "x": 72.77,
     "y": 24.01,
     "f": 1
    },
    {
     "t": "grass",
     "x": 35.99,
     "y": 95.18,
     "f": 1
    },
    {
     "t": "grass",
     "x": 36.63,
     "y": 95.29,
     "v": 1
    },
    {
     "t": "grass",
     "x": 12.88,
     "y": 58.27,
     "f": 1
    },
    {
     "t": "grass",
     "x": 60.78,
     "y": 71.1
    },
    {
     "t": "grass",
     "x": 60.07,
     "y": 71.3,
     "v": 1
    },
    {
     "t": "grass",
     "x": 61.26,
     "y": 70.51,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 15.89,
     "y": 101.37,
     "f": 1
    },
    {
     "t": "grass",
     "x": 28.41,
     "y": 46.33
    },
    {
     "t": "grass",
     "x": 94.39,
     "y": 57.46
    },
    {
     "t": "grass",
     "x": 94.88,
     "y": 57.26,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 93.97,
     "y": 56.89,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 9.65,
     "y": 26.55,
     "v": 1
    },
    {
     "t": "grass",
     "x": 10.16,
     "y": 27.09,
     "f": 1
    },
    {
     "t": "grass",
     "x": 29.37,
     "y": 96.08,
     "v": 1
    },
    {
     "t": "grass",
     "x": 78.56,
     "y": 39.13,
     "v": 1
    },
    {
     "t": "grass",
     "x": 79.4,
     "y": 38.33
    },
    {
     "t": "grass",
     "x": 63.85,
     "y": 60.14,
     "f": 1
    },
    {
     "t": "grass",
     "x": 11.21,
     "y": 94.89,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 55.99,
     "y": 72.18,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 56.6,
     "y": 72.05
    },
    {
     "t": "grass",
     "x": 83.53,
     "y": 37.35,
     "f": 1
    },
    {
     "t": "grass",
     "x": 84.05,
     "y": 37.16,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 15.76,
     "y": 79.08,
     "f": 1
    },
    {
     "t": "grass",
     "x": 16.18,
     "y": 78.25,
     "v": 1
    },
    {
     "t": "grass",
     "x": 37.28,
     "y": 31.81,
     "f": 1
    },
    {
     "t": "grass",
     "x": 15.83,
     "y": 73.06,
     "f": 1
    },
    {
     "t": "grass",
     "x": 14.85,
     "y": 72.85,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 45.21,
     "y": 85.26
    },
    {
     "t": "grass",
     "x": 45.58,
     "y": 85.78,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 31.88,
     "y": 93.44,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 25.38,
     "y": 51.82,
     "f": 1
    },
    {
     "t": "grass",
     "x": 24.92,
     "y": 52.88,
     "v": 1
    },
    {
     "t": "grass",
     "x": 25.84,
     "y": 52.54
    },
    {
     "t": "grass",
     "x": 57.24,
     "y": 77.51
    },
    {
     "t": "grass",
     "x": 56.61,
     "y": 77.57,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 84.34,
     "y": 39.27,
     "v": 1
    },
    {
     "t": "grass",
     "x": 84.95,
     "y": 39.73
    },
    {
     "t": "grass",
     "x": 30.15,
     "y": 30.22
    },
    {
     "t": "grass",
     "x": 12.59,
     "y": 69.38,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 29.41,
     "y": 1.24
    },
    {
     "t": "tree_dead",
     "x": 9.54,
     "y": 13.46
    },
    {
     "t": "tree_dead",
     "x": 4.67,
     "y": 15.27
    },
    {
     "t": "tree_dead",
     "x": 6.4,
     "y": 6.69,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 49.23,
     "y": 6.04,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 27.74,
     "y": 15.15,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 52.81,
     "y": 6.22
    },
    {
     "t": "tree_dead",
     "x": 42.24,
     "y": 15.32,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 50.63,
     "y": 15.12,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 13.33,
     "y": 17.69,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 54,
     "y": 8.4,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 38.58,
     "y": 15.27,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 48.03,
     "y": 4.53,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 9.23,
     "y": 4.13
    },
    {
     "t": "tree_dead",
     "x": 45.32,
     "y": 4.39
    },
    {
     "t": "tree_dead",
     "x": 48.19,
     "y": 15.64,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 27.75,
     "y": 1.05,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 18.42,
     "y": 16.04
    },
    {
     "t": "tree_dead",
     "x": 27.05,
     "y": 10.08,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 27.03,
     "y": 12.18,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 37.33,
     "y": 5.93,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 19.57,
     "y": 6.58
    },
    {
     "t": "tree_dead",
     "x": 46.25,
     "y": 17.98
    },
    {
     "t": "tree_dead",
     "x": 7.91,
     "y": 14.35,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 53.42,
     "y": 13.78,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 22.28,
     "y": 3.5,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 11.27,
     "y": 15.74,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 15.35,
     "y": 17.77
    },
    {
     "t": "tree_dead",
     "x": 25.06,
     "y": 9.86
    },
    {
     "t": "tree_dead",
     "x": 52.37,
     "y": 7.69,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 26.86,
     "y": 17.81,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 25.42,
     "y": 12.42,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 32.36,
     "y": 1.25,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 46.15,
     "y": 16.14,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 20.26,
     "y": 17.24,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 54.94,
     "y": 13.35,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 11.45,
     "y": 4.68,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 55.89,
     "y": 11.95,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 18.04,
     "y": 17.86,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 55.31,
     "y": 9.16,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 50.02,
     "y": 8.09,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 6.31,
     "y": 5.04,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 32.49,
     "y": 16.82
    },
    {
     "t": "tree_dead",
     "x": 23.82,
     "y": 2.02,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 15.99,
     "y": 6.97,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 2.23,
     "y": 14.3,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 2.09,
     "y": 8.62,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 44.81,
     "y": 17.45,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 1.82,
     "y": 10.82,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 46.39,
     "y": 3.01,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 50.81,
     "y": 6.25,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 31.03,
     "y": 15.93,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 20.13,
     "y": 4.07,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 43.63,
     "y": 16.4,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 18.34,
     "y": 7.48,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 40.99,
     "y": 1.67
    },
    {
     "t": "tree_dead",
     "x": 14.03,
     "y": 7
    },
    {
     "t": "tree_dead",
     "x": 29.07,
     "y": 14.45
    },
    {
     "t": "tree_dead",
     "x": 22.03,
     "y": 17.79
    },
    {
     "t": "tree_dead",
     "x": 26.79,
     "y": 13.78,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 34.56,
     "y": 17.84,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 8.38,
     "y": 5.81,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 24.87,
     "y": 17.98,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 40.43,
     "y": 14.25,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 54.7,
     "y": 10.88,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 36.67,
     "y": 7.46
    },
    {
     "t": "tree_dead",
     "x": 4.25,
     "y": 6.35,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 54.87,
     "y": 14.88
    },
    {
     "t": "tree_dead",
     "x": 9.1,
     "y": 11.84,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 6.22,
     "y": 15.81,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 29.31,
     "y": 16.7,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 44.91,
     "y": 2.26,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 51.84,
     "y": 13.55
    },
    {
     "t": "tree_dead",
     "x": 2.29,
     "y": 12.31,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 42.95,
     "y": 1.77,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 38.79,
     "y": 17.51,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 12.71,
     "y": 5.51,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 9.03,
     "y": 15.86,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 31.12,
     "y": 2.12,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 23.44,
     "y": 12.44,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 19.74,
     "y": 15.01,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 23.69,
     "y": 9.02,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 5.94,
     "y": 13.87,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 26.18,
     "y": 16.33
    },
    {
     "t": "tree_dead",
     "x": 16.7,
     "y": 17.09,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 39.35,
     "y": 6.33,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 33.97,
     "y": 1.09,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 26.21,
     "y": 1.82
    },
    {
     "t": "tree_dead",
     "x": 35.31,
     "y": 4.91,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 3.23,
     "y": 15.8,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 17.32,
     "y": 6.09,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 3.71,
     "y": 13.91,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 11.63,
     "y": 13.9,
     "v": 2
    },
    {
     "t": "rock_dark",
     "x": 13.68,
     "y": 16.01,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 10.23,
     "y": 5.63
    },
    {
     "t": "rock_dark",
     "x": 10.74,
     "y": 12.09,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 48.52,
     "y": 16.85,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 36.88,
     "y": 4.65,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 23.38,
     "y": 17.88,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 38.98,
     "y": 14.08
    },
    {
     "t": "rock_dark",
     "x": 47.75,
     "y": 5.76
    },
    {
     "t": "rock_dark",
     "x": 18.19,
     "y": 14.74,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 11.8,
     "y": 6.55,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 38.5,
     "y": 5.23,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 42.11,
     "y": 16.9
    },
    {
     "t": "rock_dark",
     "x": 24.4,
     "y": 13.25,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 19.26,
     "y": 13.33,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 26.15,
     "y": 14.92,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 53.77,
     "y": 12.49,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 20.95,
     "y": 16.09,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 38.07,
     "y": 7.57,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 46.59,
     "y": 5.13,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 10.86,
     "y": 11.04,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 51.12,
     "y": 8.68
    },
    {
     "t": "rock_dark",
     "x": 47.02,
     "y": 14.72,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 30.02,
     "y": 3.1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 37.43,
     "y": 8.48
    },
    {
     "t": "rock_dark",
     "x": 48.74,
     "y": 14.47
    },
    {
     "t": "rock_dark",
     "x": 1.03,
     "y": 9.76
    },
    {
     "t": "rock_dark",
     "x": 33.68,
     "y": 5.73,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 47.36,
     "y": 16.74,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 28.64,
     "y": 13.1
    },
    {
     "t": "rock_dark",
     "x": 39.75,
     "y": 1.04,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 33.78,
     "y": 6.82
    },
    {
     "t": "rock_dark",
     "x": 7.37,
     "y": 12.04,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 36.11,
     "y": 8.95,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 45.17,
     "y": 5.84,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 3.4,
     "y": 7.72,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 44.19,
     "y": 15.08,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 7.7,
     "y": 6.95,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 35.43,
     "y": 6.8,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 22.61,
     "y": 10.31,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 10.77,
     "y": 6.5,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 33.95,
     "y": 16.52,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 31.48,
     "y": 17.75,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 8.06,
     "y": 12.86,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 9.89,
     "y": 10.7,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 12.98,
     "y": 14.17
    },
    {
     "t": "rock_dark",
     "x": 51.98,
     "y": 14.82
    },
    {
     "t": "rock_dark",
     "x": 37.52,
     "y": 17.57
    },
    {
     "t": "rock_dark",
     "x": 47.06,
     "y": 6.78,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 50.36,
     "y": 9.39,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 19.63,
     "y": 5.32,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 17.43,
     "y": 8.57,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 28.52,
     "y": 2.14,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 37.25,
     "y": 9.64,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 49.55,
     "y": 15.98,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 39.67,
     "y": 5.08,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 32.42,
     "y": 6.78,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 43.69,
     "y": 2.86,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 23.87,
     "y": 3.32,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 10.34,
     "y": 14.51,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 31.31,
     "y": 6.91,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 40.17,
     "y": 12.87,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 37.95,
     "y": 16.37,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 12.46,
     "y": 16.76
    },
    {
     "t": "rock_dark",
     "x": 40.95,
     "y": 12.04
    },
    {
     "t": "rock_dark",
     "x": 2.68,
     "y": 9.85,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 9.72,
     "y": 6.55,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 44.84,
     "y": 15.95
    },
    {
     "t": "rock_dark",
     "x": 54.9,
     "y": 7.31,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 49.02,
     "y": 7.28,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 22.23,
     "y": 2.16,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 25.44,
     "y": 14.18,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 40.89,
     "y": 5.78,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 26,
     "y": 10.82,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 22.73,
     "y": 11.39
    },
    {
     "t": "rock_dark",
     "x": 25.03,
     "y": 8.32,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 27.92,
     "y": 11.13
    },
    {
     "t": "rock_dark",
     "x": 36.94,
     "y": 1.01,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 21.45,
     "y": 4.67,
     "f": 1
    },
    {
     "t": "mushroom",
     "x": 49.23,
     "y": 8.85
    },
    {
     "t": "mushroom",
     "x": 28.61,
     "y": 7.65
    },
    {
     "t": "mushroom",
     "x": 28.24,
     "y": 7.14
    },
    {
     "t": "mushroom",
     "x": 47.68,
     "y": 11.94
    },
    {
     "t": "mushroom",
     "x": 48.33,
     "y": 11.52
    },
    {
     "t": "mushroom",
     "x": 33.96,
     "y": 4.06
    },
    {
     "t": "mushroom",
     "x": 33.38,
     "y": 4.34
    },
    {
     "t": "mushroom",
     "x": 29.4,
     "y": 4.4
    },
    {
     "t": "mushroom",
     "x": 29.09,
     "y": 3.45
    },
    {
     "t": "mushroom",
     "x": 22.46,
     "y": 14.03
    },
    {
     "t": "mushroom",
     "x": 22.22,
     "y": 14.81
    },
    {
     "t": "mushroom",
     "x": 30.53,
     "y": 10.87
    },
    {
     "t": "mushroom",
     "x": 30.91,
     "y": 10.39
    },
    {
     "t": "mushroom",
     "x": 33.58,
     "y": 15.65
    },
    {
     "t": "mushroom",
     "x": 45.31,
     "y": 13.62
    },
    {
     "t": "mushroom",
     "x": 45.75,
     "y": 13.14
    },
    {
     "t": "mushroom",
     "x": 44.67,
     "y": 13.49
    },
    {
     "t": "mushroom",
     "x": 23.05,
     "y": 1.1
    },
    {
     "t": "mushroom",
     "x": 42.33,
     "y": 11.83
    },
    {
     "t": "mushroom",
     "x": 8.61,
     "y": 10.64
    },
    {
     "t": "mushroom",
     "x": 51.8,
     "y": 9.9
    },
    {
     "t": "mushroom",
     "x": 52.42,
     "y": 10.4
    },
    {
     "t": "mushroom",
     "x": 4.86,
     "y": 11.28
    },
    {
     "t": "mushroom",
     "x": 5.32,
     "y": 11.7
    },
    {
     "t": "mushroom",
     "x": 5.54,
     "y": 10.81
    },
    {
     "t": "mushroom",
     "x": 4.19,
     "y": 11.48
    },
    {
     "t": "mushroom",
     "x": 13.66,
     "y": 13.72
    },
    {
     "t": "mushroom",
     "x": 14.26,
     "y": 14.45
    },
    {
     "t": "mushroom",
     "x": 14.31,
     "y": 13.65
    },
    {
     "t": "mushroom",
     "x": 24.99,
     "y": 15.6
    },
    {
     "t": "mushroom",
     "x": 21.37,
     "y": 14.47
    },
    {
     "t": "mushroom",
     "x": 21.22,
     "y": 15.22
    },
    {
     "t": "mushroom",
     "x": 22.16,
     "y": 15.46
    },
    {
     "t": "mushroom",
     "x": 54.18,
     "y": 9.97
    },
    {
     "t": "mushroom",
     "x": 25.89,
     "y": 5.82
    },
    {
     "t": "mushroom",
     "x": 25.65,
     "y": 5.17
    },
    {
     "t": "mushroom",
     "x": 43.17,
     "y": 13.46
    },
    {
     "t": "mushroom",
     "x": 43.9,
     "y": 13.37
    },
    {
     "t": "mushroom",
     "x": 31.33,
     "y": 9.14
    },
    {
     "t": "mushroom",
     "x": 14.86,
     "y": 16.79
    },
    {
     "t": "mushroom",
     "x": 48.35,
     "y": 10.55
    },
    {
     "t": "mushroom",
     "x": 48.98,
     "y": 10.68
    },
    {
     "t": "mushroom",
     "x": 47.87,
     "y": 10.07
    },
    {
     "t": "mushroom",
     "x": 22.64,
     "y": 13.22
    },
    {
     "t": "mushroom",
     "x": 38.15,
     "y": 12.72
    },
    {
     "t": "mushroom",
     "x": 32.74,
     "y": 15.58
    },
    {
     "t": "mushroom",
     "x": 46.6,
     "y": 13.46
    },
    {
     "t": "mushroom",
     "x": 47.12,
     "y": 13.87
    },
    {
     "t": "mushroom",
     "x": 46.24,
     "y": 14.09
    },
    {
     "t": "mushroom",
     "x": 38.37,
     "y": 3.61
    },
    {
     "t": "mushroom",
     "x": 37.7,
     "y": 3.25
    },
    {
     "t": "mushroom",
     "x": 23.49,
     "y": 7.14
    },
    {
     "t": "mushroom",
     "x": 34.17,
     "y": 11.39
    },
    {
     "t": "mushroom",
     "x": 34.8,
     "y": 11.74
    },
    {
     "t": "mushroom",
     "x": 30.32,
     "y": 6.4
    },
    {
     "t": "mushroom",
     "x": 29.88,
     "y": 5.66
    },
    {
     "t": "mushroom",
     "x": 30.36,
     "y": 7.18
    },
    {
     "t": "mushroom",
     "x": 20.5,
     "y": 9.08
    },
    {
     "t": "mushroom",
     "x": 53.81,
     "y": 6.59
    },
    {
     "t": "mushroom",
     "x": 41.11,
     "y": 10.5
    },
    {
     "t": "mushroom",
     "x": 40.42,
     "y": 11.04
    },
    {
     "t": "mushroom",
     "x": 40.39,
     "y": 10.27
    },
    {
     "t": "mushroom",
     "x": 36.46,
     "y": 2.93
    },
    {
     "t": "mushroom",
     "x": 45.11,
     "y": 12.91
    },
    {
     "t": "mushroom",
     "x": 21.22,
     "y": 13.58
    },
    {
     "t": "mushroom",
     "x": 3.68,
     "y": 12.43
    },
    {
     "t": "mushroom",
     "x": 4.5,
     "y": 12.1
    },
    {
     "t": "mushroom",
     "x": 21.71,
     "y": 12.81
    },
    {
     "t": "mushroom",
     "x": 21,
     "y": 12.96
    },
    {
     "t": "mushroom",
     "x": 49.52,
     "y": 12.92
    },
    {
     "t": "mushroom",
     "x": 49.25,
     "y": 13.53
    },
    {
     "t": "mushroom",
     "x": 24.7,
     "y": 16.46
    },
    {
     "t": "mushroom",
     "x": 24.08,
     "y": 14.25
    },
    {
     "t": "mushroom",
     "x": 24.55,
     "y": 14.74
    },
    {
     "t": "mushroom",
     "x": 5.14,
     "y": 12.95
    },
    {
     "t": "mushroom",
     "x": 4.75,
     "y": 13.48
    },
    {
     "t": "mushroom",
     "x": 29.59,
     "y": 9.8
    },
    {
     "t": "mushroom",
     "x": 28.99,
     "y": 9.75
    },
    {
     "t": "mushroom",
     "x": 29.9,
     "y": 9.21
    },
    {
     "t": "mushroom",
     "x": 29.5,
     "y": 10.45
    },
    {
     "t": "mushroom",
     "x": 42.03,
     "y": 5.96
    },
    {
     "t": "moss",
     "x": 8.68,
     "y": 9.26,
     "v": 2
    },
    {
     "t": "moss",
     "x": 11.56,
     "y": 9.88,
     "v": 1,
     "f": 1
    },
    {
     "t": "moss",
     "x": 46.28,
     "y": 8.02
    },
    {
     "t": "moss",
     "x": 50.77,
     "y": 11.84,
     "v": 1,
     "f": 1
    },
    {
     "t": "moss",
     "x": 52.36,
     "y": 11.61,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 31.94,
     "y": 12.83,
     "f": 1
    },
    {
     "t": "moss",
     "x": 41.12,
     "y": 7.59,
     "v": 1,
     "f": 1
    },
    {
     "t": "moss",
     "x": 15.29,
     "y": 10.6,
     "v": 2
    },
    {
     "t": "moss",
     "x": 40.02,
     "y": 3.64,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 12.41,
     "y": 11.86,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 29.7,
     "y": 12.26,
     "v": 1
    },
    {
     "t": "moss",
     "x": 43.36,
     "y": 11.26,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 44.38,
     "y": 7.35,
     "v": 1,
     "f": 1
    },
    {
     "t": "moss",
     "x": 43.55,
     "y": 5.25,
     "v": 2
    },
    {
     "t": "moss",
     "x": 27.13,
     "y": 5.67,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 42.12,
     "y": 9.9,
     "f": 1
    },
    {
     "t": "moss",
     "x": 33.86,
     "y": 9.54,
     "f": 1
    },
    {
     "t": "moss",
     "x": 14.69,
     "y": 8.69,
     "v": 1,
     "f": 1
    },
    {
     "t": "moss",
     "x": 17.13,
     "y": 11.27,
     "f": 1
    },
    {
     "t": "moss",
     "x": 33.89,
     "y": 14.2,
     "v": 2
    },
    {
     "t": "moss",
     "x": 21.15,
     "y": 7.41,
     "f": 1
    },
    {
     "t": "moss",
     "x": 9.64,
     "y": 7.88,
     "f": 1
    },
    {
     "t": "moss",
     "x": 24.51,
     "y": 4.77,
     "f": 1
    },
    {
     "t": "moss",
     "x": 4.91,
     "y": 9.24,
     "v": 1
    },
    {
     "t": "moss",
     "x": 38.25,
     "y": 1.27
    },
    {
     "t": "moss",
     "x": 19.53,
     "y": 9.97,
     "v": 1
    },
    {
     "t": "moss",
     "x": 17.76,
     "y": 13.2,
     "v": 2
    },
    {
     "t": "moss",
     "x": 45.81,
     "y": 11.55,
     "f": 1
    },
    {
     "t": "moss",
     "x": 14.58,
     "y": 12.58,
     "v": 1,
     "f": 1
    },
    {
     "t": "moss",
     "x": 35.38,
     "y": 3.31,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 11.84,
     "y": 8.2,
     "v": 2
    },
    {
     "t": "moss",
     "x": 38.98,
     "y": 8.96,
     "v": 2
    },
    {
     "t": "moss",
     "x": 36.09,
     "y": 11.08,
     "v": 1,
     "f": 1
    },
    {
     "t": "moss",
     "x": 41.77,
     "y": 4
    },
    {
     "t": "moss",
     "x": 16.87,
     "y": 14.56,
     "f": 1
    },
    {
     "t": "moss",
     "x": 27.67,
     "y": 3.56,
     "v": 1
    },
    {
     "t": "moss",
     "x": 33.98,
     "y": 12.54,
     "v": 1
    },
    {
     "t": "moss",
     "x": 36.75,
     "y": 14.86,
     "f": 1
    },
    {
     "t": "moss",
     "x": 39.12,
     "y": 11.82,
     "v": 1
    },
    {
     "t": "moss",
     "x": 33.34,
     "y": 2.62,
     "f": 1
    },
    {
     "t": "moss",
     "x": 6.95,
     "y": 10.67
    },
    {
     "t": "moss",
     "x": 24.66,
     "y": 6.8,
     "v": 1,
     "f": 1
    },
    {
     "t": "bush",
     "x": 12.75,
     "y": 7.09
    },
    {
     "t": "bush",
     "x": 25.01,
     "y": 1.37
    },
    {
     "t": "bush",
     "x": 35.4,
     "y": 1.09,
     "v": 2
    },
    {
     "t": "grass",
     "x": 3.37,
     "y": 8.84,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 52.26,
     "y": 8.88,
     "f": 1
    },
    {
     "t": "grass",
     "x": 53.2,
     "y": 10.62,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 28.57,
     "y": 5
    },
    {
     "t": "grass",
     "x": 46.5,
     "y": 6,
     "v": 1
    },
    {
     "t": "grass",
     "x": 25.8,
     "y": 3.46,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 25.03,
     "y": 2.47
    },
    {
     "t": "grass",
     "x": 26.18,
     "y": 4.24,
     "f": 1
    },
    {
     "t": "grass",
     "x": 43.79,
     "y": 9.98
    },
    {
     "t": "grass",
     "x": 20.4,
     "y": 13.32,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 7.59,
     "y": 15.69
    },
    {
     "t": "grass",
     "x": 27.81,
     "y": 4.72,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 20.79,
     "y": 6.21,
     "v": 1
    },
    {
     "t": "grass",
     "x": 21.76,
     "y": 6.35
    },
    {
     "t": "grass",
     "x": 45.82,
     "y": 6.79,
     "f": 1
    },
    {
     "t": "grass",
     "x": 21.35,
     "y": 16.89,
     "f": 1
    },
    {
     "t": "grass",
     "x": 42.92,
     "y": 6.58,
     "v": 1
    },
    {
     "t": "grass",
     "x": 28.41,
     "y": 9.13,
     "v": 1
    },
    {
     "t": "grass",
     "x": 27.76,
     "y": 8.14
    },
    {
     "t": "grass",
     "x": 28.52,
     "y": 6.01,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 29.18,
     "y": 5.53,
     "v": 1
    },
    {
     "t": "grass",
     "x": 28.92,
     "y": 11.21
    },
    {
     "t": "grass",
     "x": 6.39,
     "y": 12.78
    },
    {
     "t": "grass",
     "x": 30.4,
     "y": 8.12,
     "f": 1
    },
    {
     "t": "grass",
     "x": 29.5,
     "y": 8.2,
     "v": 1
    },
    {
     "t": "grass",
     "x": 30.94,
     "y": 12.01,
     "v": 1
    },
    {
     "t": "grass",
     "x": 31.18,
     "y": 11.05,
     "f": 1
    },
    {
     "t": "grass",
     "x": 35.1,
     "y": 13.39
    },
    {
     "t": "grass",
     "x": 3.03,
     "y": 6.48
    },
    {
     "t": "grass",
     "x": 43.54,
     "y": 8.19
    },
    {
     "t": "grass",
     "x": 43.95,
     "y": 1.16,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 77.77,
     "y": 4.62,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 79.93,
     "y": 4.11
    },
    {
     "t": "tree_dead",
     "x": 99.21,
     "y": 14.9
    },
    {
     "t": "tree_dead",
     "x": 103.51,
     "y": 5.59,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 60.74,
     "y": 7.63,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 93.34,
     "y": 10.91,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 103.14,
     "y": 11.91,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 101.9,
     "y": 4.65,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 63.05,
     "y": 13.77,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 62.99,
     "y": 11.58,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 75.62,
     "y": 4.49,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 88.07,
     "y": 6.38,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 95.67,
     "y": 14.18,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 66.09,
     "y": 5.36,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 98.68,
     "y": 2.64,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 81.52,
     "y": 4.81,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 81.93,
     "y": 16.06,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 84.2,
     "y": 14.59,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 68.48,
     "y": 6.17
    },
    {
     "t": "tree_dead",
     "x": 85.18,
     "y": 5.81
    },
    {
     "t": "tree_dead",
     "x": 94.76,
     "y": 4.43,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 63.12,
     "y": 4.78,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 104.99,
     "y": 8.61,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 64.95,
     "y": 13.84,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 72.86,
     "y": 8.25,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 97.13,
     "y": 2.63,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 66.95,
     "y": 14.18,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 94.54,
     "y": 12.92,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 60.23,
     "y": 10.76,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 77.03,
     "y": 3.31,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 96.9,
     "y": 15.56,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 61.8,
     "y": 9.91,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 100.21,
     "y": 2.33
    },
    {
     "t": "tree_dead",
     "x": 101.98,
     "y": 15,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 80.17,
     "y": 16.71
    },
    {
     "t": "tree_dead",
     "x": 103.86,
     "y": 13.6
    },
    {
     "t": "tree_dead",
     "x": 74.5,
     "y": 12.76,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 83.64,
     "y": 5.57,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 78.19,
     "y": 16.7,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 104.83,
     "y": 11.29,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 92.55,
     "y": 6.18,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 90.9,
     "y": 12.86,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 104.95,
     "y": 6.77
    },
    {
     "t": "tree_dead",
     "x": 71.61,
     "y": 13.77,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 99.66,
     "y": 3.78,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 100.6,
     "y": 15.77,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 64.72,
     "y": 4.39
    },
    {
     "t": "tree_dead",
     "x": 62.33,
     "y": 6.25,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 74.22,
     "y": 5.96,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 103.47,
     "y": 7.61,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 69.21,
     "y": 9.23,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 87.35,
     "y": 13.23,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 94.34,
     "y": 6.22,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 89.59,
     "y": 6.29
    },
    {
     "t": "tree_dead",
     "x": 60.2,
     "y": 9.21,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 68.66,
     "y": 7.76,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 68.39,
     "y": 14.89,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 96.15,
     "y": 5.16,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 77.24,
     "y": 17.98,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 89.17,
     "y": 12.87
    },
    {
     "t": "tree_dead",
     "x": 101.97,
     "y": 13.41,
     "v": 2
    },
    {
     "t": "rock_dark",
     "x": 97.83,
     "y": 14.65,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 102.08,
     "y": 6.23,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 63.58,
     "y": 6.17,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 100.41,
     "y": 4.8,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 95.93,
     "y": 6.48
    },
    {
     "t": "rock_dark",
     "x": 85.07,
     "y": 9.48,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 69.51,
     "y": 14.08,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 96.96,
     "y": 14.1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 92.53,
     "y": 11.89,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 66.49,
     "y": 13,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 75.88,
     "y": 13.17,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 85.97,
     "y": 13.79,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 79.24,
     "y": 17.83,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 97.75,
     "y": 4.57,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 98.3,
     "y": 15.81,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 64.04,
     "y": 12.95,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 103.19,
     "y": 10.61,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 104.52,
     "y": 10.01,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 90.9,
     "y": 6.73,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 64.83,
     "y": 12.09,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 61.42,
     "y": 11.18,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 104.91,
     "y": 12.87,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 101.14,
     "y": 3.39,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 88.67,
     "y": 7.53,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 91.54,
     "y": 11.33,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 74.07,
     "y": 7.71,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 76.22,
     "y": 5.92
    },
    {
     "t": "rock_dark",
     "x": 77.27,
     "y": 5.83,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 78.37,
     "y": 3.32,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 94.72,
     "y": 11.6,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 83.01,
     "y": 15.06,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 100.82,
     "y": 14.32,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 66.22,
     "y": 4.03,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 76.94,
     "y": 16.43,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 87.84,
     "y": 8.22,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 95.85,
     "y": 3.72
    },
    {
     "t": "rock_dark",
     "x": 63.58,
     "y": 10.31,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 95.9,
     "y": 12.44,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 83.18,
     "y": 6.78,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 70.36,
     "y": 9.85,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 67.51,
     "y": 7.01,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 62.32,
     "y": 7.92,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 67.48,
     "y": 5.3,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 71.29,
     "y": 9.36
    },
    {
     "t": "rock_dark",
     "x": 82.33,
     "y": 5.97
    },
    {
     "t": "rock_dark",
     "x": 74.95,
     "y": 7.08
    },
    {
     "t": "rock_dark",
     "x": 104.86,
     "y": 5.24,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 103.62,
     "y": 8.87,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 70.9,
     "y": 14.83,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 64.46,
     "y": 5.64,
     "v": 1,
     "f": 1
    },
    {
     "t": "mushroom",
     "x": 77.35,
     "y": 14.45
    },
    {
     "t": "mushroom",
     "x": 77.14,
     "y": 15.29
    },
    {
     "t": "mushroom",
     "x": 64.69,
     "y": 11.23
    },
    {
     "t": "mushroom",
     "x": 78.94,
     "y": 9.89
    },
    {
     "t": "mushroom",
     "x": 79.02,
     "y": 10.74
    },
    {
     "t": "mushroom",
     "x": 78.48,
     "y": 15.62
    },
    {
     "t": "mushroom",
     "x": 77.69,
     "y": 15.67
    },
    {
     "t": "mushroom",
     "x": 79.13,
     "y": 16.06
    },
    {
     "t": "mushroom",
     "x": 79.17,
     "y": 15.24
    },
    {
     "t": "mushroom",
     "x": 63.72,
     "y": 9.19
    },
    {
     "t": "mushroom",
     "x": 64.36,
     "y": 9.61
    },
    {
     "t": "mushroom",
     "x": 63.21,
     "y": 9.54
    },
    {
     "t": "mushroom",
     "x": 91.93,
     "y": 9.71
    },
    {
     "t": "mushroom",
     "x": 91.92,
     "y": 8.94
    },
    {
     "t": "mushroom",
     "x": 94.2,
     "y": 8.37
    },
    {
     "t": "mushroom",
     "x": 93.92,
     "y": 8.92
    },
    {
     "t": "mushroom",
     "x": 75.8,
     "y": 10.72
    },
    {
     "t": "mushroom",
     "x": 96.95,
     "y": 3.94
    },
    {
     "t": "mushroom",
     "x": 78.71,
     "y": 11.77
    },
    {
     "t": "mushroom",
     "x": 72.14,
     "y": 9.04
    },
    {
     "t": "mushroom",
     "x": 92.79,
     "y": 9.71
    },
    {
     "t": "mushroom",
     "x": 102.25,
     "y": 7.51
    },
    {
     "t": "mushroom",
     "x": 99.02,
     "y": 12.37
    },
    {
     "t": "mushroom",
     "x": 98.7,
     "y": 12.95
    },
    {
     "t": "mushroom",
     "x": 83.71,
     "y": 8.12
    },
    {
     "t": "mushroom",
     "x": 83.06,
     "y": 8.26
    },
    {
     "t": "mushroom",
     "x": 67.08,
     "y": 8.22
    },
    {
     "t": "mushroom",
     "x": 66.77,
     "y": 8.8
    },
    {
     "t": "mushroom",
     "x": 73.72,
     "y": 11.92
    },
    {
     "t": "mushroom",
     "x": 73.17,
     "y": 11.24
    },
    {
     "t": "mushroom",
     "x": 61.51,
     "y": 8.84
    },
    {
     "t": "mushroom",
     "x": 68.16,
     "y": 9.7
    },
    {
     "t": "mushroom",
     "x": 63.31,
     "y": 8.02
    },
    {
     "t": "mushroom",
     "x": 67.55,
     "y": 10.43
    },
    {
     "t": "mushroom",
     "x": 80.63,
     "y": 7.45
    },
    {
     "t": "mushroom",
     "x": 81.01,
     "y": 6.71
    },
    {
     "t": "mushroom",
     "x": 81.21,
     "y": 7.66
    },
    {
     "t": "mushroom",
     "x": 97.75,
     "y": 9.97
    },
    {
     "t": "mushroom",
     "x": 98.34,
     "y": 10.37
    },
    {
     "t": "mushroom",
     "x": 65.15,
     "y": 8.24
    },
    {
     "t": "mushroom",
     "x": 65.04,
     "y": 7.52
    },
    {
     "t": "mushroom",
     "x": 78.42,
     "y": 17.79
    },
    {
     "t": "mushroom",
     "x": 67.6,
     "y": 8.88
    },
    {
     "t": "mushroom",
     "x": 67.09,
     "y": 9.37
    },
    {
     "t": "mushroom",
     "x": 97.06,
     "y": 5.78
    },
    {
     "t": "mushroom",
     "x": 65.02,
     "y": 10.1
    },
    {
     "t": "mushroom",
     "x": 64.64,
     "y": 10.62
    },
    {
     "t": "mushroom",
     "x": 80.24,
     "y": 8.73
    },
    {
     "t": "mushroom",
     "x": 73.83,
     "y": 13.65
    },
    {
     "t": "mushroom",
     "x": 78.22,
     "y": 15.04
    },
    {
     "t": "mushroom",
     "x": 62.39,
     "y": 8.94
    },
    {
     "t": "mushroom",
     "x": 100,
     "y": 13.51
    },
    {
     "t": "mushroom",
     "x": 69.15,
     "y": 10.46
    },
    {
     "t": "mushroom",
     "x": 68.67,
     "y": 11.03
    },
    {
     "t": "mushroom",
     "x": 68.54,
     "y": 10.21
    },
    {
     "t": "mushroom",
     "x": 89.49,
     "y": 7.88
    },
    {
     "t": "mushroom",
     "x": 88.29,
     "y": 9.84
    },
    {
     "t": "mushroom",
     "x": 88.84,
     "y": 10.25
    },
    {
     "t": "mushroom",
     "x": 101.18,
     "y": 7.07
    },
    {
     "t": "mushroom",
     "x": 65.99,
     "y": 8.84
    },
    {
     "t": "mushroom",
     "x": 65.38,
     "y": 8.95
    },
    {
     "t": "mushroom",
     "x": 93.48,
     "y": 7.16
    },
    {
     "t": "mushroom",
     "x": 92.89,
     "y": 7.81
    },
    {
     "t": "mushroom",
     "x": 88.93,
     "y": 8.3
    },
    {
     "t": "mushroom",
     "x": 83.46,
     "y": 9.91
    },
    {
     "t": "moss",
     "x": 75.86,
     "y": 8.13
    },
    {
     "t": "moss",
     "x": 83.55,
     "y": 11.19,
     "v": 1
    },
    {
     "t": "moss",
     "x": 77.99,
     "y": 13.39,
     "v": 2
    },
    {
     "t": "moss",
     "x": 77.58,
     "y": 7.27,
     "v": 2
    },
    {
     "t": "moss",
     "x": 80.09,
     "y": 11.16,
     "v": 1
    },
    {
     "t": "moss",
     "x": 81.54,
     "y": 13.37
    },
    {
     "t": "moss",
     "x": 69.6,
     "y": 12.16,
     "v": 1
    },
    {
     "t": "moss",
     "x": 95.3,
     "y": 10.43,
     "f": 1
    },
    {
     "t": "moss",
     "x": 89.96,
     "y": 11.49
    },
    {
     "t": "moss",
     "x": 76.84,
     "y": 9.42,
     "v": 1,
     "f": 1
    },
    {
     "t": "moss",
     "x": 76.69,
     "y": 11.62
    },
    {
     "t": "moss",
     "x": 90.32,
     "y": 8.79,
     "v": 1,
     "f": 1
    },
    {
     "t": "moss",
     "x": 87.16,
     "y": 11.31,
     "v": 1,
     "f": 1
    },
    {
     "t": "moss",
     "x": 66.34,
     "y": 11.6,
     "v": 1,
     "f": 1
    },
    {
     "t": "moss",
     "x": 101.13,
     "y": 8.87,
     "v": 1,
     "f": 1
    },
    {
     "t": "moss",
     "x": 84.21,
     "y": 12.87,
     "v": 2
    },
    {
     "t": "moss",
     "x": 74.21,
     "y": 9.42,
     "v": 2
    },
    {
     "t": "moss",
     "x": 97.34,
     "y": 12.84,
     "v": 1
    },
    {
     "t": "moss",
     "x": 79.86,
     "y": 13.72,
     "v": 1,
     "f": 1
    },
    {
     "t": "moss",
     "x": 71.45,
     "y": 11.1,
     "v": 2
    },
    {
     "t": "moss",
     "x": 79.05,
     "y": 5.93,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 75.79,
     "y": 14.06,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 78.75,
     "y": 7.44
    },
    {
     "t": "grass",
     "x": 78.75,
     "y": 8.99,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 78.22,
     "y": 10,
     "f": 1
    },
    {
     "t": "grass",
     "x": 88.31,
     "y": 11.15,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 92.22,
     "y": 10.46,
     "f": 1
    },
    {
     "t": "grass",
     "x": 64.21,
     "y": 8.13,
     "v": 1
    },
    {
     "t": "grass",
     "x": 82.23,
     "y": 9.42
    },
    {
     "t": "grass",
     "x": 83.46,
     "y": 15.93
    },
    {
     "t": "grass",
     "x": 79.04,
     "y": 8.08,
     "v": 1
    },
    {
     "t": "grass",
     "x": 91.67,
     "y": 7.88,
     "v": 1
    },
    {
     "t": "grass",
     "x": 67.74,
     "y": 12.99
    },
    {
     "t": "grass",
     "x": 81.83,
     "y": 10.01,
     "v": 1
    },
    {
     "t": "grass",
     "x": 80.93,
     "y": 10.09
    },
    {
     "t": "grass",
     "x": 80.56,
     "y": 12.66,
     "v": 1
    },
    {
     "t": "grass",
     "x": 98.7,
     "y": 7.06,
     "v": 1
    },
    {
     "t": "grass",
     "x": 97.59,
     "y": 6.94,
     "f": 1
    },
    {
     "t": "grass",
     "x": 67.06,
     "y": 6.25
    },
    {
     "t": "grass",
     "x": 64.98,
     "y": 6.46
    },
    {
     "t": "grass",
     "x": 91.03,
     "y": 10.54,
     "v": 1
    },
    {
     "t": "grass",
     "x": 102.35,
     "y": 9.97
    },
    {
     "t": "grass",
     "x": 65.98,
     "y": 8.19,
     "f": 1
    },
    {
     "t": "grass",
     "x": 84.82,
     "y": 10.58,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 84.65,
     "y": 11.54
    },
    {
     "t": "rock",
     "x": 93.66,
     "y": 43.8,
     "f": 1
    },
    {
     "t": "rock",
     "x": 107.51,
     "y": 24.17,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 94.38,
     "y": 40.36,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 107.61,
     "y": 35.13,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 98.25,
     "y": 22.1
    },
    {
     "t": "rock",
     "x": 108.08,
     "y": 36.59,
     "f": 1
    },
    {
     "t": "rock",
     "x": 91.1,
     "y": 30.28,
     "v": 1
    },
    {
     "t": "rock",
     "x": 108.3,
     "y": 28.82,
     "v": 1
    },
    {
     "t": "rock",
     "x": 94.82,
     "y": 22.48,
     "f": 1
    },
    {
     "t": "rock",
     "x": 106.23,
     "y": 23.5,
     "f": 1
    },
    {
     "t": "rock",
     "x": 89.58,
     "y": 34.71,
     "f": 1
    },
    {
     "t": "rock",
     "x": 107.58,
     "y": 25.71,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 92.05,
     "y": 24.23,
     "f": 1
    },
    {
     "t": "rock",
     "x": 105.35,
     "y": 38.27,
     "v": 1,
     "f": 1
    },
    {
     "t": "log",
     "x": 109.52,
     "y": 32.19,
     "f": 1
    },
    {
     "t": "log",
     "x": 106.08,
     "y": 21.27,
     "f": 1
    },
    {
     "t": "log",
     "x": 91.13,
     "y": 26.81,
     "f": 1
    },
    {
     "t": "log",
     "x": 110.85,
     "y": 28.22,
     "f": 1
    },
    {
     "t": "log",
     "x": 101.15,
     "y": 21.03
    },
    {
     "t": "stump",
     "x": 103.6,
     "y": 42.22
    },
    {
     "t": "stump",
     "x": 109.55,
     "y": 35.57
    },
    {
     "t": "stump",
     "x": 88.1,
     "y": 27.59
    },
    {
     "t": "stump",
     "x": 90.02,
     "y": 40.42
    },
    {
     "t": "stump",
     "x": 107.93,
     "y": 38.54
    },
    {
     "t": "stump",
     "x": 96.77,
     "y": 40.94
    },
    {
     "t": "stump",
     "x": 105.76,
     "y": 42.01
    },
    {
     "t": "moss",
     "x": 93.38,
     "y": 37.37,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 99.25,
     "y": 36.19,
     "f": 1
    },
    {
     "t": "moss",
     "x": 109.55,
     "y": 24.19,
     "v": 2
    },
    {
     "t": "moss",
     "x": 103.5,
     "y": 38.12,
     "v": 2
    },
    {
     "t": "moss",
     "x": 100.12,
     "y": 27.84,
     "v": 1
    },
    {
     "t": "moss",
     "x": 90.39,
     "y": 32.21,
     "f": 1
    },
    {
     "t": "moss",
     "x": 92.27,
     "y": 34.01,
     "v": 1,
     "f": 1
    },
    {
     "t": "moss",
     "x": 101.88,
     "y": 43.26,
     "v": 2
    },
    {
     "t": "tree_oak",
     "x": 106.22,
     "y": 39.37
    },
    {
     "t": "tree_oak",
     "x": 92.52,
     "y": 42.59,
     "v": 10
    },
    {
     "t": "tree_oak",
     "x": 93.38,
     "y": 22.58,
     "v": 1
    },
    {
     "t": "tree_oak",
     "x": 108.16,
     "y": 26.99,
     "v": 4
    },
    {
     "t": "tree_oak",
     "x": 96.82,
     "y": 21.83,
     "v": 8
    },
    {
     "t": "tree_oak",
     "x": 102.92,
     "y": 22.76,
     "v": 11
    },
    {
     "t": "tree_oak",
     "x": 95.3,
     "y": 43.27,
     "v": 4
    },
    {
     "t": "tree_oak",
     "x": 91.24,
     "y": 37.9,
     "v": 3
    },
    {
     "t": "tree_birch",
     "x": 89.14,
     "y": 25.8,
     "v": 2
    },
    {
     "t": "tree_birch",
     "x": 94.03,
     "y": 21.16,
     "v": 9
    },
    {
     "t": "tree_birch",
     "x": 92.52,
     "y": 25.31,
     "v": 6
    },
    {
     "t": "tree_birch",
     "x": 106.82,
     "y": 36.91,
     "v": 10
    },
    {
     "t": "tree_birch",
     "x": 104.82,
     "y": 23.02,
     "v": 7
    },
    {
     "t": "tree_birch",
     "x": 110.61,
     "y": 26.21,
     "v": 9
    },
    {
     "t": "tree_birch",
     "x": 109.71,
     "y": 29.98,
     "v": 4
    },
    {
     "t": "tree_birch",
     "x": 104.13,
     "y": 39.63,
     "v": 9
    },
    {
     "t": "tree_birch",
     "x": 103.91,
     "y": 21.89,
     "v": 1
    },
    {
     "t": "tree_birch",
     "x": 109.58,
     "y": 26.03,
     "v": 10
    },
    {
     "t": "tree_birch",
     "x": 90.71,
     "y": 42.08,
     "v": 4
    },
    {
     "t": "tree_birch",
     "x": 92.67,
     "y": 38.84
    },
    {
     "t": "pine",
     "x": 103.7,
     "y": 40.61,
     "v": 1
    },
    {
     "t": "pine",
     "x": 93.58,
     "y": 23.98,
     "v": 2
    },
    {
     "t": "pine",
     "x": 102.58,
     "y": 40.51
    },
    {
     "t": "pine",
     "x": 107.54,
     "y": 22.87,
     "v": 2
    },
    {
     "t": "pine",
     "x": 89.28,
     "y": 38.32,
     "v": 1
    },
    {
     "t": "pine",
     "x": 106.64,
     "y": 24.97,
     "v": 5
    },
    {
     "t": "pine",
     "x": 88.46,
     "y": 37.07,
     "v": 4
    },
    {
     "t": "pine",
     "x": 93.79,
     "y": 41.93,
     "v": 2
    },
    {
     "t": "pine",
     "x": 95.02,
     "y": 41.91,
     "v": 1
    },
    {
     "t": "pine",
     "x": 91.03,
     "y": 24.79,
     "v": 4
    },
    {
     "t": "pine",
     "x": 105.04,
     "y": 40.04,
     "v": 4
    },
    {
     "t": "pine",
     "x": 91.9,
     "y": 41.31,
     "v": 3
    },
    {
     "t": "pine",
     "x": 88.62,
     "y": 29.16,
     "v": 3
    },
    {
     "t": "pine",
     "x": 88.65,
     "y": 41.6
    },
    {
     "t": "pine",
     "x": 93.16,
     "y": 40.12,
     "v": 4
    },
    {
     "t": "pine",
     "x": 95.5,
     "y": 21.21,
     "v": 5
    },
    {
     "t": "pine",
     "x": 89.48,
     "y": 28.51,
     "v": 4
    },
    {
     "t": "pine",
     "x": 95.4,
     "y": 23.67,
     "v": 1
    },
    {
     "t": "pine",
     "x": 89.88,
     "y": 25.1,
     "v": 1
    },
    {
     "t": "pine",
     "x": 103.21,
     "y": 21.08,
     "v": 2
    },
    {
     "t": "pine",
     "x": 90.07,
     "y": 29.32,
     "v": 2
    },
    {
     "t": "pine",
     "x": 92.09,
     "y": 39.69
    },
    {
     "t": "pine",
     "x": 93.78,
     "y": 39.21,
     "v": 5
    },
    {
     "t": "pine",
     "x": 97.19,
     "y": 42.48
    },
    {
     "t": "pine",
     "x": 110.92,
     "y": 30.65,
     "v": 1
    },
    {
     "t": "pine",
     "x": 99.4,
     "y": 22.88,
     "v": 1
    },
    {
     "t": "pine",
     "x": 91.4,
     "y": 29.01,
     "v": 5
    },
    {
     "t": "pine",
     "x": 93.88,
     "y": 24.97,
     "v": 5
    },
    {
     "t": "pine",
     "x": 98.96,
     "y": 21.15,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 100.44,
     "y": 22.95,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 93.47,
     "y": 41.06,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 102.39,
     "y": 39.35
    },
    {
     "t": "pine_young",
     "x": 102.4,
     "y": 41.38,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 94.15,
     "y": 42.86,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 89.48,
     "y": 41.9,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 108.74,
     "y": 25.52
    },
    {
     "t": "pine_young",
     "x": 108.16,
     "y": 23.42,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 88.37,
     "y": 40.4,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 91.99,
     "y": 29.62,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 106.8,
     "y": 43.06,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 101.55,
     "y": 40.33,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 90.96,
     "y": 39.34,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 90.33,
     "y": 28.51,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 108.81,
     "y": 23.02,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 92.11,
     "y": 43.65,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 101.47,
     "y": 22.81,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 107.87,
     "y": 22.14,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 105.3,
     "y": 37.11,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 89.23,
     "y": 26.73,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 90.9,
     "y": 42.87,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 89.92,
     "y": 38.92
    },
    {
     "t": "pine_young",
     "x": 104.35,
     "y": 43.92,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 103.17,
     "y": 39.43,
     "v": 3
    },
    {
     "t": "pine_young",
     "x": 92.23,
     "y": 23.23,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 98.28,
     "y": 42.45,
     "v": 4
    },
    {
     "t": "pine_young",
     "x": 98.07,
     "y": 41.52
    },
    {
     "t": "pine_young",
     "x": 89.52,
     "y": 27.69,
     "v": 1
    },
    {
     "t": "mushroom_red",
     "x": 109.73,
     "y": 26.86
    },
    {
     "t": "mushroom_red",
     "x": 109.26,
     "y": 27.22
    },
    {
     "t": "mushroom_red",
     "x": 108.79,
     "y": 28.05
    },
    {
     "t": "mushroom_red",
     "x": 105.98,
     "y": 27.63
    },
    {
     "t": "mushroom_red",
     "x": 106.86,
     "y": 27.77
    },
    {
     "t": "mushroom_red",
     "x": 106.27,
     "y": 28.11
    },
    {
     "t": "mushroom_red",
     "x": 105.43,
     "y": 27.94
    },
    {
     "t": "mushroom_red",
     "x": 107.7,
     "y": 29.92
    },
    {
     "t": "mushroom_red",
     "x": 107.81,
     "y": 30.59
    },
    {
     "t": "mushroom_red",
     "x": 107.17,
     "y": 29.78
    },
    {
     "t": "mushroom_red",
     "x": 104.84,
     "y": 31.33
    },
    {
     "t": "mushroom_red",
     "x": 105.27,
     "y": 31.64
    },
    {
     "t": "mushroom_red",
     "x": 104.31,
     "y": 30.6
    },
    {
     "t": "mushroom_red",
     "x": 107.19,
     "y": 30.53
    },
    {
     "t": "mushroom_red",
     "x": 94.63,
     "y": 24.48
    },
    {
     "t": "mushroom_red",
     "x": 95.39,
     "y": 25.19
    },
    {
     "t": "mushroom_red",
     "x": 104.93,
     "y": 25.51
    },
    {
     "t": "mushroom_red",
     "x": 104.89,
     "y": 24.83
    },
    {
     "t": "grass",
     "x": 102.04,
     "y": 23.4
    },
    {
     "t": "grass",
     "x": 97.79,
     "y": 25.36,
     "f": 1
    },
    {
     "t": "grass",
     "x": 98.43,
     "y": 24.51,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 97.44,
     "y": 26.32,
     "v": 1
    },
    {
     "t": "grass",
     "x": 97.19,
     "y": 25.69
    },
    {
     "t": "grass",
     "x": 102.55,
     "y": 27.75
    },
    {
     "t": "grass",
     "x": 102.11,
     "y": 27.26,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 88.19,
     "y": 43.35
    },
    {
     "t": "grass",
     "x": 88.78,
     "y": 42.84,
     "v": 1
    },
    {
     "t": "grass",
     "x": 88.72,
     "y": 43.65,
     "v": 1
    },
    {
     "t": "grass",
     "x": 99,
     "y": 26.07,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 99.56,
     "y": 26.57,
     "f": 1
    },
    {
     "t": "grass",
     "x": 98.46,
     "y": 26.06,
     "f": 1
    },
    {
     "t": "grass",
     "x": 100.41,
     "y": 24.14,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 99.99,
     "y": 23.79,
     "f": 1
    },
    {
     "t": "grass",
     "x": 103.37,
     "y": 25.2,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 103.76,
     "y": 26.32
    },
    {
     "t": "grass",
     "x": 102.87,
     "y": 25.37
    },
    {
     "t": "grass",
     "x": 96.37,
     "y": 38.29
    },
    {
     "t": "grass",
     "x": 96.18,
     "y": 38.92,
     "v": 1
    },
    {
     "t": "grass",
     "x": 99.9,
     "y": 29.88,
     "f": 1
    },
    {
     "t": "grass",
     "x": 99.25,
     "y": 29.61,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 100.47,
     "y": 29.66,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 104.68,
     "y": 40.8,
     "v": 1
    },
    {
     "t": "grass",
     "x": 104.18,
     "y": 36.62,
     "f": 1
    },
    {
     "t": "grass",
     "x": 103.55,
     "y": 36.48,
     "v": 1,
     "f": 1
    },
    {
     "t": "brazier",
     "x": 46.22,
     "y": 60.37
    },
    {
     "t": "log",
     "x": 47.52,
     "y": 60.77,
     "f": 1
    },
    {
     "t": "log",
     "x": 45.02,
     "y": 61.07
    },
    {
     "t": "stump",
     "x": 46.42,
     "y": 59.07
    },
    {
     "t": "rock",
     "x": 81.43,
     "y": 31.45
    },
    {
     "t": "rock",
     "x": 82.13,
     "y": 31.85,
     "v": 1
    },
    {
     "t": "rock",
     "x": 80.93,
     "y": 32.15,
     "v": 2
    },
    {
     "t": "lantern_blue",
     "x": 82.83,
     "y": 30.95
    },
    {
     "t": "mushroom_red",
     "x": 24.38,
     "y": 96.92
    },
    {
     "t": "mushroom_red",
     "x": 23.78,
     "y": 97.96
    },
    {
     "t": "mushroom_red",
     "x": 22.57,
     "y": 97.95
    },
    {
     "t": "mushroom_red",
     "x": 21.98,
     "y": 96.91
    },
    {
     "t": "mushroom_red",
     "x": 22.59,
     "y": 95.87
    },
    {
     "t": "mushroom_red",
     "x": 23.79,
     "y": 95.89
    },
    {
     "t": "moss",
     "x": 23.18,
     "y": 96.92
    },
    {
     "t": "lantern",
     "x": 21.38,
     "y": 96.92
    },
    {
     "t": "sign",
     "x": 80.89,
     "y": 47.56,
     "text": "Do not feed the boars."
    },
    {
     "t": "lantern",
     "x": 79.79,
     "y": 47.16
    },
    {
     "t": "stump",
     "x": 79.69,
     "y": 48.36
    },
    {
     "t": "log",
     "x": 55.88,
     "y": 86.93,
     "f": 1
    },
    {
     "t": "stump",
     "x": 57.28,
     "y": 86.43
    },
    {
     "t": "moss",
     "x": 55.08,
     "y": 87.83
    },
    {
     "t": "mushroom_red",
     "x": 55.89,
     "y": 87.62
    },
    {
     "t": "mushroom_red",
     "x": 56.78,
     "y": 88.33
    },
    {
     "t": "brazier",
     "x": 41.75,
     "y": 46.88
    },
    {
     "t": "log",
     "x": 43.05,
     "y": 47.28,
     "f": 1
    },
    {
     "t": "log",
     "x": 40.55,
     "y": 47.58
    },
    {
     "t": "stump",
     "x": 41.95,
     "y": 45.58
    },
    {
     "t": "rock",
     "x": 34.66,
     "y": 51.55
    },
    {
     "t": "rock",
     "x": 35.36,
     "y": 51.95,
     "v": 1
    },
    {
     "t": "rock",
     "x": 34.16,
     "y": 52.25,
     "v": 2
    },
    {
     "t": "lantern_blue",
     "x": 33.26,
     "y": 51.05
    },
    {
     "t": "mushroom_red",
     "x": 50.92,
     "y": 50.51
    },
    {
     "t": "mushroom_red",
     "x": 50.32,
     "y": 51.55
    },
    {
     "t": "mushroom_red",
     "x": 49.12,
     "y": 51.55
    },
    {
     "t": "mushroom_red",
     "x": 49.15,
     "y": 50.38
    },
    {
     "t": "mushroom_red",
     "x": 49.13,
     "y": 49.46
    },
    {
     "t": "mushroom_red",
     "x": 50.34,
     "y": 49.48
    },
    {
     "t": "moss",
     "x": 49.72,
     "y": 50.51
    },
    {
     "t": "lantern",
     "x": 47.92,
     "y": 50.51
    },
    {
     "t": "sign",
     "x": 33.55,
     "y": 67.22,
     "text": "Mind the roots."
    },
    {
     "t": "lantern",
     "x": 34.65,
     "y": 66.82
    },
    {
     "t": "stump",
     "x": 32.29,
     "y": 67.18
    },
    {
     "t": "log",
     "x": 61.24,
     "y": 75.26,
     "f": 1
    },
    {
     "t": "stump",
     "x": 62.64,
     "y": 74.76
    },
    {
     "t": "moss",
     "x": 60.44,
     "y": 76.16
    },
    {
     "t": "mushroom_red",
     "x": 61.84,
     "y": 76.46
    },
    {
     "t": "brazier",
     "x": 44.5,
     "y": 62.65
    },
    {
     "t": "log",
     "x": 45.8,
     "y": 63.05,
     "f": 1
    },
    {
     "t": "log",
     "x": 43.3,
     "y": 63.35
    },
    {
     "t": "stump",
     "x": 44.51,
     "y": 62.06
    },
    {
     "t": "rock",
     "x": 54.13,
     "y": 64.97
    },
    {
     "t": "rock",
     "x": 55.08,
     "y": 66,
     "v": 1
    },
    {
     "t": "rock",
     "x": 54.31,
     "y": 67.03,
     "v": 2
    },
    {
     "t": "lantern_blue",
     "x": 55.12,
     "y": 64.67
    },
    {
     "t": "mushroom_red",
     "x": 64.94,
     "y": 50.1
    },
    {
     "t": "mushroom_red",
     "x": 64.33,
     "y": 51.14
    },
    {
     "t": "mushroom_red",
     "x": 63.13,
     "y": 51.13
    },
    {
     "t": "mushroom_red",
     "x": 62.54,
     "y": 50.09
    },
    {
     "t": "mushroom_red",
     "x": 63.15,
     "y": 49.05
    },
    {
     "t": "mushroom_red",
     "x": 64.35,
     "y": 49.07
    },
    {
     "t": "moss",
     "x": 63.74,
     "y": 50.1
    },
    {
     "t": "lantern",
     "x": 61.94,
     "y": 50.1
    },
    {
     "t": "sign",
     "x": 32.55,
     "y": 91.03,
     "text": "Ogres ahead. Keep to the road."
    },
    {
     "t": "lantern",
     "x": 33.65,
     "y": 90.63
    },
    {
     "t": "stump",
     "x": 31.35,
     "y": 91.83
    },
    {
     "t": "pine_giant",
     "x": 49.59,
     "y": 71.75,
     "v": 2
    },
    {
     "t": "sunbeam",
     "x": 49.29,
     "y": 69.35
    },
    {
     "t": "pine_giant",
     "x": 34.74,
     "y": 64.43,
     "v": 2
    },
    {
     "t": "sunbeam",
     "x": 34.44,
     "y": 62.03
    },
    {
     "t": "sunbeam",
     "x": 25.62,
     "y": 49.79
    },
    {
     "t": "pine_giant",
     "x": 32.65,
     "y": 89.02,
     "v": 1
    },
    {
     "t": "sunbeam",
     "x": 30.45,
     "y": 90.42
    },
    {
     "t": "pine_giant",
     "x": 49.37,
     "y": 47.56,
     "v": 1
    },
    {
     "t": "sunbeam",
     "x": 47.17,
     "y": 48.96
    },
    {
     "t": "pine_giant",
     "x": 48.59,
     "y": 92.75
    },
    {
     "t": "sunbeam",
     "x": 50.59,
     "y": 94.75
    },
    {
     "t": "pine_giant",
     "x": 63.94,
     "y": 50.6
    },
    {
     "t": "sunbeam",
     "x": 65.94,
     "y": 52.6
    },
    {
     "t": "pine_giant",
     "x": 79.19,
     "y": 27.21
    },
    {
     "t": "pine_giant",
     "x": 81.49,
     "y": 31.61,
     "v": 2
    },
    {
     "t": "sunbeam",
     "x": 81.19,
     "y": 29.21
    },
    {
     "t": "pine_giant",
     "x": 50.06,
     "y": 68.58,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 48.16,
     "y": 72.38,
     "v": 2
    },
    {
     "t": "sunbeam",
     "x": 47.86,
     "y": 69.98
    },
    {
     "t": "sunbeam",
     "x": 51.41,
     "y": 54.21
    },
    {
     "t": "brazier",
     "x": 24.6,
     "y": 12.33
    },
    {
     "t": "crystal_violet",
     "x": 23.1,
     "y": 11.33
    },
    {
     "t": "crystal_violet",
     "x": 26.2,
     "y": 11.53
    },
    {
     "t": "crystal_violet",
     "x": 24.8,
     "y": 14.03
    },
    {
     "t": "crystal",
     "x": 85.37,
     "y": 7.23
    },
    {
     "t": "crystal_violet",
     "x": 86.27,
     "y": 7.83
    },
    {
     "t": "crystal",
     "x": 84.67,
     "y": 8.13
    },
    {
     "t": "lantern_blue",
     "x": 83.97,
     "y": 6.83
    },
    {
     "t": "mushroom",
     "x": 75.11,
     "y": 14.95
    },
    {
     "t": "mushroom",
     "x": 75.04,
     "y": 15.81
    },
    {
     "t": "mushroom",
     "x": 73.12,
     "y": 15.59
    },
    {
     "t": "mushroom",
     "x": 73.18,
     "y": 13.59
    },
    {
     "t": "mushroom",
     "x": 74.37,
     "y": 13.91
    },
    {
     "t": "moss",
     "x": 74.01,
     "y": 14.95
    },
    {
     "t": "warpdoor",
     "id": "warrens_door",
     "x": 105.5,
     "y": 48,
     "to": {
      "x": 66.9,
      "y": 8.6
     },
     "label": "Fox Warrens"
    },
    {
     "t": "warpdoor",
     "id": "warrens_exit",
     "x": 63.5,
     "y": 10.2,
     "to": {
      "x": 103.3,
      "y": 48.4
     },
     "label": "Back to the pond"
    },
    {
     "t": "warpdoor",
     "id": "hollow_door",
     "x": 44,
     "y": 35.8,
     "to": {
      "x": 6.9,
      "y": 9.7
     },
     "key": "key_roothollow",
     "label": "Root Hollow",
     "boss": "mossjaw"
    },
    {
     "t": "warpdoor",
     "id": "hollow_exit",
     "x": 52.4,
     "y": 10.5,
     "to": {
      "x": 69.3,
      "y": 34.9
     },
     "label": "Root-stair up to the shrine",
     "open": false
    }
   ],
   "objective": "Follow the animals up the road",
   "sigil": {
    "x": 45,
    "y": 10.5
   },
   "level": [
    3,
    10
   ],
   "sections": [
    {
     "id": "forest",
     "name": "Misty Pinewood",
     "kind": "outer",
     "x": 0,
     "y": 20,
     "w": 112,
     "h": 92
    },
    {
     "id": "hollow",
     "name": "Root Hollow",
     "kind": "under",
     "x": 0,
     "y": 0,
     "w": 56,
     "h": 20,
     "ambient": "#5a6a92",
     "dark": 0.45
    },
    {
     "id": "warrens",
     "name": "Fox Warrens",
     "kind": "vault",
     "x": 60,
     "y": 0,
     "w": 52,
     "h": 20,
     "ambient": "#6a5a82",
     "dark": 0.5
    },
    {
     "id": "clearing",
     "name": "Bramblehorn's Clearing",
     "kind": "arena",
     "x": 88,
     "y": 20,
     "w": 24,
     "h": 24
    }
   ],
   "anchors": [
    {
     "id": "shrine1_land",
     "x": 45.7,
     "y": 86.9
    },
    {
     "id": "shrine2_land",
     "x": 67.7,
     "y": 60.9
    },
    {
     "id": "shrine3_land",
     "x": 69.3,
     "y": 34.9
    },
    {
     "id": "warrens_in",
     "x": 66.9,
     "y": 8.6
    },
    {
     "id": "pond_out",
     "x": 103.3,
     "y": 48.4
    },
    {
     "id": "hollow_in",
     "x": 6.9,
     "y": 9.7
    },
    {
     "id": "door_shrine_land",
     "x": 47.4,
     "y": 38
    },
    {
     "id": "hollow_out",
     "x": 69.3,
     "y": 34.9
    }
   ],
   "drops": [
    [
     75,
     37,
     3,
     5
    ]
   ],
   "spans": [
    [
     60,
     37,
     4,
     3
    ]
   ],
   "rock": [
    [
     67,
     32,
     5
    ],
    [
     65,
     33,
     9
    ],
    [
     64,
     34,
     11
    ],
    [
     63,
     35,
     13
    ],
    [
     63,
     36,
     13
    ],
    [
     64,
     37,
     12
    ],
    [
     64,
     38,
     12
    ],
    [
     65,
     39,
     11
    ],
    [
     65,
     40,
     11
    ],
    [
     66,
     41,
     9
    ],
    [
     68,
     42,
     4
    ]
   ],
   "levelAreas": [
    {
     "id": "pk_moss_w",
     "x": 31,
     "y": 31,
     "r": 5.9,
     "level": 5
    },
    {
     "id": "pk_moss_e",
     "x": 57,
     "y": 31,
     "r": 5.9,
     "level": 5
    },
    {
     "id": "pk_bram_n",
     "x": 74,
     "y": 27,
     "r": 5.9,
     "level": 8
    },
    {
     "id": "pk_bram_s",
     "x": 89,
     "y": 53,
     "r": 5.7,
     "level": 8
    }
   ],
   "triggers": [
    {
     "id": "banner",
     "name": "Zone banner",
     "when": {
      "type": "map_enter"
     },
     "actions": [
      {
       "type": "dialogue",
       "id": "pinewood_banner"
      }
     ]
    },
    {
     "id": "intro",
     "name": "Pip at the glade",
     "when": {
      "type": "enter_area",
      "x": 8,
      "y": 104,
      "r": 6
     },
     "actions": [
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "The animals are running.",
        "Something big has woken in the wood."
       ]
      }
     ]
    },
    {
     "id": "trail",
     "name": "Fleeing animals",
     "when": {
      "type": "enter_area",
      "x": 17.96,
      "y": 98.59,
      "r": 4.5
     },
     "actions": [
      {
       "type": "dialogue",
       "id": "pinewood_fox"
      },
      {
       "type": "objective",
       "text": "Follow the animals up the road"
      }
     ]
    },
    {
     "id": "fish_intro",
     "name": "Fishing spot",
     "when": {
      "type": "enter_area",
      "x": 51.5,
      "y": 68.5,
      "r": 3.4
     },
     "actions": [
      {
       "type": "banner",
       "title": "Fishing",
       "sub": "Stand at the water and Interact"
      },
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "Ripples, Aerin. Fish are still here.",
        "Fishing wakes in a later dream."
       ]
      }
     ]
    },
    {
     "id": "tablet",
     "name": "Lore tablet",
     "when": {
      "type": "enter_area",
      "x": 30,
      "y": 108,
      "r": 2.2
     },
     "actions": [
      {
       "type": "dialogue",
       "id": "pinewood_tablet"
      }
     ]
    },
    {
     "id": "shrine1",
     "name": "The road to the plaza",
     "when": {
      "type": "enter_area",
      "x": 44,
      "y": 86,
      "r": 2.2
     },
     "actions": [
      {
       "type": "checkpoint",
       "text": "Checkpoint: The road to the plaza"
      },
      {
       "type": "heal",
       "pct": 100
      }
     ],
     "once": false
    },
    {
     "id": "r1",
     "name": "Ogres in the clearing",
     "when": {
      "type": "enter_area",
      "x": 40,
      "y": 92,
      "r": 5
     },
     "actions": [
      {
       "type": "banner",
       "title": "Ogre!",
       "sub": "A brute guards the sunlit clearing"
      },
      {
       "type": "spawnPack",
       "id": "pw_ogre_run",
       "at": {
        "x": 41.67,
        "y": 93.41
       }
      }
     ]
    },
    {
     "id": "r1_done",
     "name": "Ogres in the clearing cleared",
     "when": {
      "type": "all_enemies_dead"
     },
     "requires": [
      "r1"
     ],
     "actions": [
      {
       "type": "message",
       "text": "Heavy footsteps echo to the north..."
      },
      {
       "type": "heal",
       "pct": 25
      },
      {
       "type": "loot",
       "rarity": "uncommon",
       "count": 1,
       "x": 40,
       "y": 92
      },
      {
       "type": "objective",
       "text": "Take the key to the root door"
      }
     ]
    },
    {
     "id": "ford",
     "name": "Thornbacks at the ford",
     "when": {
      "type": "enter_area",
      "x": 54.96,
      "y": 73.71,
      "r": 4.2
     },
     "requires": [
      "r1_done"
     ],
     "actions": [
      {
       "type": "banner",
       "title": "Thornback Boars",
       "sub": "Arrows glance off their bristles (resist pierce)"
      },
      {
       "type": "spawnPack",
       "id": "pw_boar_pierce",
       "at": {
        "x": 54.96,
        "y": 73.71
       }
      }
     ]
    },
    {
     "id": "ford_done",
     "name": "Thornbacks at the ford cleared",
     "when": {
      "type": "all_enemies_dead"
     },
     "requires": [
      "ford"
     ],
     "actions": [
      {
       "type": "message",
       "text": "The ford is quiet again."
      },
      {
       "type": "heal",
       "pct": 20
      },
      {
       "type": "loot",
       "rarity": "uncommon",
       "count": 1,
       "x": 54.96,
       "y": 73.71
      }
     ]
    },
    {
     "id": "shrine2",
     "name": "The creek ford",
     "when": {
      "type": "enter_area",
      "x": 66,
      "y": 60,
      "r": 2.2
     },
     "actions": [
      {
       "type": "checkpoint",
       "text": "Checkpoint: The creek ford"
      },
      {
       "type": "heal",
       "pct": 100
      }
     ],
     "once": false
    },
    {
     "id": "r2",
     "name": "The Stone Plaza",
     "when": {
      "type": "enter_area",
      "x": 26,
      "y": 58,
      "r": 5
     },
     "requires": [
      "ford_done"
     ],
     "actions": [
      {
       "type": "banner",
       "title": "The Stone Plaza",
       "sub": "Kill the shaman first: it keeps the boar standing"
      },
      {
       "type": "spawnPack",
       "id": "pw_boar_shaman",
       "at": {
        "x": 27.67,
        "y": 59.41
       }
      },
      {
       "type": "wait",
       "seconds": 12
      },
      {
       "type": "spawnPack",
       "id": "pw_ogre_slimes",
       "at": {
        "x": 23.94,
        "y": 58.73
       }
      }
     ]
    },
    {
     "id": "r2_done",
     "name": "The Stone Plaza cleared",
     "when": {
      "type": "all_enemies_dead"
     },
     "requires": [
      "r2"
     ],
     "actions": [
      {
       "type": "message",
       "text": "The way to the grove is clear."
      },
      {
       "type": "heal",
       "pct": 30
      },
      {
       "type": "loot",
       "rarity": "uncommon",
       "count": 1,
       "x": 26,
       "y": 58
      },
      {
       "type": "objective",
       "text": "Enter the Warden's Grove"
      }
     ]
    },
    {
     "id": "r3",
     "name": "The Warden's Grove",
     "when": {
      "type": "enter_area",
      "x": 70,
      "y": 52,
      "r": 4.5
     },
     "requires": [
      "r2_done"
     ],
     "actions": [
      {
       "type": "banner",
       "title": "The Warden's Grove",
       "sub": "A shaman chants in the dark",
       "boss": true
      },
      {
       "type": "spawnPack",
       "id": "pw_ogre_grove",
       "at": {
        "x": 71.54,
        "y": 53.3
       }
      },
      {
       "type": "wait",
       "seconds": 12
      },
      {
       "type": "spawnPack",
       "id": "pw_boar_last",
       "at": {
        "x": 68.1,
        "y": 52.68
       }
      }
     ]
    },
    {
     "id": "r3_done",
     "name": "The Warden's Grove cleared",
     "when": {
      "type": "all_enemies_dead"
     },
     "requires": [
      "r3"
     ],
     "actions": [
      {
       "type": "message",
       "text": "The shaman falls silent."
      },
      {
       "type": "heal",
       "pct": 40
      },
      {
       "type": "loot",
       "rarity": "rare",
       "count": 1,
       "x": 70,
       "y": 52
      },
      {
       "type": "objective",
       "text": "Take the key to the root door"
      }
     ]
    },
    {
     "id": "elite",
     "name": "Elite guarding the key",
     "when": {
      "type": "enter_area",
      "x": 96,
      "y": 84,
      "r": 3.4000000000000004
     },
     "requires": [
      "r1_done"
     ],
     "actions": [
      {
       "type": "banner",
       "title": "Gnarlroot Ogre",
       "sub": "Guardian of the Root Hollow key",
       "boss": true
      },
      {
       "type": "spawn",
       "enemy": "ogre",
       "count": 1,
       "x": 95,
       "y": 84,
       "radius": 1.2,
       "elite": "shielded"
      }
     ]
    },
    {
     "id": "elite_done",
     "name": "Elite defeated",
     "when": {
      "type": "all_enemies_dead"
     },
     "requires": [
      "elite"
     ],
     "actions": [
      {
       "type": "message",
       "text": "The ogre drops a gnarled root key."
      },
      {
       "type": "loot",
       "rarity": "rare",
       "count": 1,
       "x": 96,
       "y": 84,
       "item": "key_roothollow",
       "slot": "weapon"
      },
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "That key smells of roots and earth. It opens the Root Hollow."
       ]
      },
      {
       "type": "quest",
       "id": "shard_root",
       "step": 1
      },
      {
       "type": "objective",
       "text": "Find the root door of the Hollow"
      }
     ]
    },
    {
     "id": "pk_moss_w",
     "name": "The Mossbound Hollow",
     "when": {
      "type": "enter_area",
      "x": 31,
      "y": 31,
      "r": 3.8
     },
     "actions": [
      {
       "type": "banner",
       "title": "The Mossbound Hollow",
       "sub": "Elite pocket: a Gnarlroot Brute and its pack"
      },
      {
       "type": "spawn",
       "enemy": "gnarlbrute",
       "count": 1,
       "x": 31,
       "y": 30.5,
       "radius": 0.5,
       "elite": "shielded"
      },
      {
       "type": "spawn",
       "enemy": "gloomslime",
       "count": 1,
       "x": 32.84,
       "y": 32.01,
       "radius": 0.5
      },
      {
       "type": "spawn",
       "enemy": "gloomslime",
       "count": 1,
       "x": 29.99,
       "y": 32.84,
       "radius": 0.5
      },
      {
       "type": "spawn",
       "enemy": "shadehound",
       "count": 1,
       "x": 29.16,
       "y": 29.99,
       "radius": 0.5
      },
      {
       "type": "spawn",
       "enemy": "brambleshaman",
       "count": 1,
       "x": 32.01,
       "y": 29.16,
       "radius": 0.5
      }
     ],
     "once": false,
     "cooldown": 100000
    },
    {
     "id": "pk_moss_w_done",
     "name": "The Mossbound Hollow: first clear",
     "when": {
      "type": "all_enemies_dead"
     },
     "requires": [
      "pk_moss_w"
     ],
     "actions": [
      {
       "type": "message",
       "text": "The pocket is quiet. Something good was guarded here."
      },
      {
       "type": "loot",
       "rarity": "rare",
       "count": 1,
       "x": 31,
       "y": 31,
       "slot": "upgrade",
       "ilvl": 3
      }
     ]
    },
    {
     "id": "pk_moss_e",
     "name": "The Root Bend",
     "when": {
      "type": "enter_area",
      "x": 57,
      "y": 31,
      "r": 3.8
     },
     "actions": [
      {
       "type": "banner",
       "title": "The Root Bend",
       "sub": "Elite pocket: a Gnarlroot Brute and its pack"
      },
      {
       "type": "spawn",
       "enemy": "gnarlbrute",
       "count": 1,
       "x": 57,
       "y": 30.5,
       "radius": 0.5,
       "elite": "vampiric"
      },
      {
       "type": "spawn",
       "enemy": "ogre",
       "count": 1,
       "x": 58.84,
       "y": 32.01,
       "radius": 0.5
      },
      {
       "type": "spawn",
       "enemy": "shadehound",
       "count": 1,
       "x": 55.21,
       "y": 32.09,
       "radius": 0.5
      },
      {
       "type": "spawn",
       "enemy": "shadehound",
       "count": 1,
       "x": 56.95,
       "y": 28.9,
       "radius": 0.5
      }
     ],
     "once": false,
     "cooldown": 100000
    },
    {
     "id": "pk_moss_e_done",
     "name": "The Root Bend: first clear",
     "when": {
      "type": "all_enemies_dead"
     },
     "requires": [
      "pk_moss_e"
     ],
     "actions": [
      {
       "type": "message",
       "text": "The pocket is quiet. Something good was guarded here."
      },
      {
       "type": "loot",
       "rarity": "rare",
       "count": 1,
       "x": 57,
       "y": 31,
       "slot": "upgrade",
       "ilvl": 3
      }
     ]
    },
    {
     "id": "pk_bram_n",
     "name": "Thornsow Wallow",
     "when": {
      "type": "enter_area",
      "x": 74,
      "y": 27,
      "r": 3.8
     },
     "actions": [
      {
       "type": "banner",
       "title": "Thornsow Wallow",
       "sub": "Elite pocket: a Thornsow Matriarch and her sounder"
      },
      {
       "type": "spawn",
       "enemy": "thornsow",
       "count": 1,
       "x": 74,
       "y": 26.5,
       "radius": 0.5,
       "elite": "burning"
      },
      {
       "type": "spawn",
       "enemy": "thornbackboar",
       "count": 1,
       "x": 75.84,
       "y": 28.01,
       "radius": 0.5
      },
      {
       "type": "spawn",
       "enemy": "gloomslime",
       "count": 1,
       "x": 72.99,
       "y": 28.84,
       "radius": 0.5
      },
      {
       "type": "spawn",
       "enemy": "gloomslime",
       "count": 1,
       "x": 72.16,
       "y": 25.99,
       "radius": 0.5
      },
      {
       "type": "spawn",
       "enemy": "brambleshaman",
       "count": 1,
       "x": 75.01,
       "y": 25.16,
       "radius": 0.5
      }
     ],
     "once": false,
     "cooldown": 100000
    },
    {
     "id": "pk_bram_n_done",
     "name": "Thornsow Wallow: first clear",
     "when": {
      "type": "all_enemies_dead"
     },
     "requires": [
      "pk_bram_n"
     ],
     "actions": [
      {
       "type": "message",
       "text": "The pocket is quiet. Something good was guarded here."
      },
      {
       "type": "loot",
       "rarity": "rare",
       "count": 1,
       "x": 74,
       "y": 27,
       "slot": "upgrade",
       "ilvl": 6
      }
     ]
    },
    {
     "id": "pk_bram_s",
     "name": "The Bramble Pit",
     "when": {
      "type": "enter_area",
      "x": 89,
      "y": 53,
      "r": 3.6
     },
     "actions": [
      {
       "type": "banner",
       "title": "The Bramble Pit",
       "sub": "Elite pocket: a Thornsow Matriarch and her sounder"
      },
      {
       "type": "spawn",
       "enemy": "thornsow",
       "count": 1,
       "x": 89,
       "y": 52.5,
       "radius": 0.5,
       "elite": "storm"
      },
      {
       "type": "spawn",
       "enemy": "ogre",
       "count": 1,
       "x": 90.84,
       "y": 54.01,
       "radius": 0.5
      },
      {
       "type": "spawn",
       "enemy": "shadehound",
       "count": 1,
       "x": 88.61,
       "y": 55.06,
       "radius": 0.5
      },
      {
       "type": "spawn",
       "enemy": "shadehound",
       "count": 1,
       "x": 86.92,
       "y": 53.27,
       "radius": 0.5
      },
      {
       "type": "spawn",
       "enemy": "gloomslime",
       "count": 1,
       "x": 88.1,
       "y": 51.1,
       "radius": 0.5
      },
      {
       "type": "spawn",
       "enemy": "brambleshaman",
       "count": 1,
       "x": 90.53,
       "y": 51.56,
       "radius": 0.5
      }
     ],
     "once": false,
     "cooldown": 100000
    },
    {
     "id": "pk_bram_s_done",
     "name": "The Bramble Pit: first clear",
     "when": {
      "type": "all_enemies_dead"
     },
     "requires": [
      "pk_bram_s"
     ],
     "actions": [
      {
       "type": "message",
       "text": "The pocket is quiet. Something good was guarded here."
      },
      {
       "type": "loot",
       "rarity": "rare",
       "count": 1,
       "x": 89,
       "y": 53,
       "slot": "upgrade",
       "ilvl": 6
      }
     ]
    },
    {
     "id": "crack_hum",
     "name": "The wall hums",
     "when": {
      "type": "enter_area",
      "x": 16.11,
      "y": 78,
      "r": 3.2
     },
     "actions": [
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "The wall hums, Aerin. Something is hidden behind it."
       ]
      }
     ]
    },
    {
     "id": "crack_open",
     "name": "Cracked wall gives way",
     "when": {
      "type": "enter_area",
      "x": 17.51,
      "y": 78,
      "r": 1.5
     },
     "requires": [
      "crack_hum"
     ],
     "actions": [
      {
       "type": "openGate",
       "id": "wall_crack"
      },
      {
       "type": "shake",
       "power": 3
      },
      {
       "type": "sound",
       "name": "portal"
      }
     ]
    },
    {
     "id": "crack_loot",
     "name": "Hidden gem cache",
     "when": {
      "type": "enter_area",
      "x": 22,
      "y": 78,
      "r": 2
     },
     "actions": [
      {
       "type": "message",
       "text": "A hidden gem cache!"
      },
      {
       "type": "loot",
       "rarity": "uncommon",
       "count": 1,
       "x": 22,
       "y": 78,
       "gem": true
      }
     ]
    },
    {
     "id": "bridge_pip",
     "name": "The raised bridge",
     "when": {
      "type": "enter_area",
      "x": 10,
      "y": 36.6,
      "r": 3.2
     },
     "actions": [
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "The bridge is raised. There must be a lever somewhere."
       ]
      }
     ]
    },
    {
     "id": "islet_loot",
     "name": "Skill Rune on the islet",
     "when": {
      "type": "enter_area",
      "x": 10,
      "y": 29,
      "r": 2.2
     },
     "actions": [
      {
       "type": "message",
       "text": "A Skill Rune rests on the islet stone."
      },
      {
       "type": "loot",
       "rarity": "rare",
       "count": 1,
       "x": 10,
       "y": 29,
       "item": "skill_rune"
      }
     ]
    },
    {
     "id": "env_hint",
     "name": "A light off the road",
     "when": {
      "type": "enter_area",
      "x": 100,
      "y": 46,
      "r": 4.2
     },
     "actions": [
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "A light off the road, Aerin. Worth the detour."
       ]
      }
     ]
    },
    {
     "id": "env_open",
     "name": "The pond shows a door",
     "when": {
      "type": "enter_area",
      "x": 100.5,
      "y": 47.5,
      "r": 2.4
     },
     "requires": [
      "env_hint"
     ],
     "actions": [
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "The reflection has a door in it. Look behind you."
       ]
      },
      {
       "type": "openGate",
       "id": "wall_env"
      },
      {
       "type": "shake",
       "power": 3
      },
      {
       "type": "sound",
       "name": "portal"
      }
     ]
    },
    {
     "id": "cache_hint",
     "name": "A root-sealed cache",
     "when": {
      "type": "enter_area",
      "x": 14.99,
      "y": 55.35,
      "r": 3
     },
     "actions": [
      {
       "type": "message",
       "text": "Sealed by a knot of roots. It needs a key."
      }
     ]
    },
    {
     "id": "cache_loot",
     "name": "The cache opens",
     "when": {
      "type": "enter_area",
      "x": 12,
      "y": 54,
      "r": 2.2
     },
     "requires": [
      "cache_hint"
     ],
     "actions": [
      {
       "type": "message",
       "text": "The roots let go. A cache of the Wardens!"
      },
      {
       "type": "loot",
       "rarity": "rare",
       "count": 1,
       "x": 12,
       "y": 54,
       "gem": true
      }
     ]
    },
    {
     "id": "door_shrine",
     "name": "The root door",
     "when": {
      "type": "enter_area",
      "x": 46.2,
      "y": 37.4,
      "r": 2.2
     },
     "actions": [
      {
       "type": "checkpoint",
       "text": "Checkpoint: The root door"
      },
      {
       "type": "heal",
       "pct": 100
      }
     ],
     "once": false
    },
    {
     "id": "hdoor_hint",
     "name": "The root door",
     "when": {
      "type": "enter_area",
      "x": 44,
      "y": 39.29,
      "r": 3.2
     },
     "actions": [
      {
       "type": "message",
       "text": "A door of knotted roots. It needs the Root Hollow key."
      }
     ]
    },
    {
     "id": "h_intro",
     "name": "Pip in the dark",
     "when": {
      "type": "enter_area",
      "x": 5.5,
      "y": 10,
      "r": 5
     },
     "actions": [
      {
       "type": "dialogue",
       "id": "pinewood_hollow"
      },
      {
       "type": "quest",
       "id": "shard_root",
       "step": 2
      },
      {
       "type": "objective",
       "text": "Defeat Mossjaw in the Root Hollow"
      }
     ]
    },
    {
     "id": "h_shrine",
     "name": "Midpoint shrine",
     "when": {
      "type": "enter_area",
      "x": 23.5,
      "y": 6,
      "r": 2.2
     },
     "actions": [
      {
       "type": "checkpoint",
       "text": "Checkpoint: Root Hollow midpoint"
      },
      {
       "type": "heal",
       "pct": 100
      }
     ],
     "once": false
    },
    {
     "id": "den_shrine",
     "name": "Mossjaw's gate",
     "when": {
      "type": "enter_area",
      "x": 37.82,
      "y": 10.69,
      "r": 2.2
     },
     "actions": [
      {
       "type": "checkpoint",
       "text": "Checkpoint: Mossjaw's gate"
      },
      {
       "type": "heal",
       "pct": 100
      }
     ],
     "once": false
    },
    {
     "id": "h_r1",
     "name": "First cavern",
     "when": {
      "type": "enter_area",
      "x": 15,
      "y": 12,
      "r": 2.5
     },
     "actions": [
      {
       "type": "banner",
       "title": "Root Cavern",
       "sub": "Thorn-touched brutes in numbers"
      },
      {
       "type": "spawnPack",
       "id": "rh_ogre_pack",
       "at": {
        "x": 16.03,
        "y": 12.87
       }
      }
     ]
    },
    {
     "id": "h_r1_done",
     "name": "First cavern cleared",
     "when": {
      "type": "all_enemies_dead"
     },
     "requires": [
      "h_r1"
     ],
     "actions": [
      {
       "type": "message",
       "text": "The roots go still."
      },
      {
       "type": "heal",
       "pct": 25
      },
      {
       "type": "loot",
       "rarity": "uncommon",
       "count": 1,
       "x": 15,
       "y": 12
      },
      {
       "type": "objective",
       "text": "Rest at the shrine, then press on"
      }
     ]
    },
    {
     "id": "h_r2",
     "name": "Gate gallery",
     "when": {
      "type": "enter_area",
      "x": 32.5,
      "y": 11,
      "r": 2.8
     },
     "requires": [
      "h_r1_done",
      "h_shrine"
     ],
     "actions": [
      {
       "type": "banner",
       "title": "The Gallery",
       "sub": "Something large is sleeping at the far end"
      },
      {
       "type": "spawnPack",
       "id": "rh_boar_wrong",
       "at": {
        "x": 33.61,
        "y": 11.93
       }
      },
      {
       "type": "wait",
       "seconds": 14
      },
      {
       "type": "spawnPack",
       "id": "rh_troll_sleeper",
       "at": {
        "x": 35.51,
        "y": 10.88
       }
      }
     ]
    },
    {
     "id": "h_r2_done",
     "name": "Gallery cleared",
     "when": {
      "type": "all_enemies_dead"
     },
     "requires": [
      "h_r2"
     ],
     "actions": [
      {
       "type": "message",
       "text": "Silence. A lever waits nearby."
      },
      {
       "type": "heal",
       "pct": 25
      },
      {
       "type": "loot",
       "rarity": "uncommon",
       "count": 1,
       "x": 32.5,
       "y": 11
      },
      {
       "type": "objective",
       "text": "Pull the lever to raise the gate"
      }
     ]
    },
    {
     "id": "h_ceiling",
     "name": "The ceiling gives way",
     "when": {
      "type": "enter_area",
      "x": 31.5,
      "y": 8.64,
      "r": 2.4
     },
     "requires": [
      "h_r2_done"
     ],
     "actions": [
      {
       "type": "shake",
       "power": 4
      },
      {
       "type": "sound",
       "name": "boom"
      },
      {
       "type": "message",
       "text": "The ceiling cracks. Something falls: a root key."
      },
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "That is the plaza above us. A key for a cache up there?"
       ]
      },
      {
       "type": "loot",
       "rarity": "uncommon",
       "count": 1,
       "x": 32.5,
       "y": 11,
       "item": "key_rootcache"
      }
     ]
    },
    {
     "id": "h_gate_hint",
     "name": "The rooted gate",
     "when": {
      "type": "enter_area",
      "x": 40.54,
      "y": 9.04,
      "r": 3
     },
     "requires": [
      "h_r2_done"
     ],
     "actions": [
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "The gate is knotted shut. Find a lever."
       ]
      }
     ]
    },
    {
     "id": "h_boss",
     "name": "Mossjaw's den",
     "when": {
      "type": "enter_area",
      "x": 45,
      "y": 10.5,
      "r": 3.3
     },
     "requires": [
      "h_r2_done"
     ],
     "actions": [
      {
       "type": "banner",
       "title": "Mossjaw",
       "sub": "Moss-gorged root wolf — mini-boss",
       "boss": true
      },
      {
       "type": "objective",
       "text": "Defeat Mossjaw"
      },
      {
       "type": "shake",
       "power": 5
      },
      {
       "type": "wait",
       "seconds": 1.2
      },
      {
       "type": "spawn",
       "enemy": "mossjaw",
       "count": 1,
       "x": 45,
       "y": 9,
       "radius": 0.5,
       "elite": true
      },
      {
       "type": "wait",
       "seconds": 15
      },
      {
       "type": "spawn",
       "enemy": "ogre",
       "count": 2,
       "x": 43,
       "y": 13,
       "radius": 2
      },
      {
       "type": "wait",
       "seconds": 15
      },
      {
       "type": "spawn",
       "enemy": "ogre",
       "count": 2,
       "x": 47,
       "y": 13,
       "radius": 2
      }
     ]
    },
    {
     "id": "h_boss_done",
     "name": "Mossjaw falls",
     "when": {
      "type": "all_enemies_dead"
     },
     "requires": [
      "h_boss"
     ],
     "actions": [
      {
       "type": "clear_enemies"
      },
      {
       "type": "banner",
       "title": "Mossjaw falls",
       "sub": "The root-stair loosens"
      },
      {
       "type": "dialogue",
       "speaker": "Mossjaw",
       "lines": [
        "The roots remember the first Warden... he did not wake, and neither shall I."
       ]
      },
      {
       "type": "heal",
       "pct": 100
      },
      {
       "type": "loot",
       "rarity": "epic",
       "count": 1,
       "x": 45,
       "y": 9.5,
       "sockets": 2,
       "chest": "gold"
      },
      {
       "type": "openGate",
       "id": "gate_h_short"
      },
      {
       "type": "openGate",
       "id": "hollow_exit"
      },
      {
       "type": "openGate",
       "id": "arena_gate"
      },
      {
       "type": "quest",
       "id": "shard_root",
       "step": 3
      },
      {
       "type": "objective",
       "text": "Climb the root-stair to the Clearing"
      },
      {
       "type": "sound",
       "name": "portal"
      }
     ]
    },
    {
     "id": "h_crack_hum",
     "name": "The wall hums",
     "when": {
      "type": "enter_area",
      "x": 20.55,
      "y": 12.05,
      "r": 3.2
     },
     "actions": [
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "The wall hums, Aerin. Something is hidden behind it."
       ]
      }
     ]
    },
    {
     "id": "h_crack_open",
     "name": "Cracked wall gives way",
     "when": {
      "type": "enter_area",
      "x": 21.38,
      "y": 13.18,
      "r": 1.5
     },
     "requires": [
      "h_crack_hum"
     ],
     "actions": [
      {
       "type": "openGate",
       "id": "wall_h_crack"
      },
      {
       "type": "shake",
       "power": 3
      },
      {
       "type": "sound",
       "name": "portal"
      }
     ]
    },
    {
     "id": "h_crack_loot",
     "name": "Hidden Socket Rune",
     "when": {
      "type": "enter_area",
      "x": 24,
      "y": 15.5,
      "r": 2
     },
     "actions": [
      {
       "type": "message",
       "text": "A Socket Rune!"
      },
      {
       "type": "loot",
       "rarity": "rare",
       "count": 1,
       "x": 24,
       "y": 15.5,
       "item": "socket_rune"
      }
     ]
    },
    {
     "id": "w_enter",
     "name": "Fox Warrens",
     "when": {
      "type": "enter_area",
      "x": 65.5,
      "y": 9,
      "r": 4
     },
     "actions": [
      {
       "type": "banner",
       "title": "The Fox Warrens",
       "sub": "Do not wake what sleeps here"
      },
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "Quiet, Aerin. Big things sleep in the tunnels."
       ]
      },
      {
       "type": "objective",
       "text": "Sneak past the sleepers to the vault"
      }
     ]
    },
    {
     "id": "w_hall",
     "name": "Sleepers in the hall",
     "when": {
      "type": "enter_area",
      "x": 80,
      "y": 10,
      "r": 4
     },
     "requires": [
      "w_enter"
     ],
     "actions": [
      {
       "type": "spawn",
       "enemy": "mountaintroll",
       "count": 1,
       "x": 80,
       "y": 6.5,
       "radius": 0.3,
       "instant": true
      },
      {
       "type": "spawn",
       "enemy": "mountaintroll",
       "count": 1,
       "x": 80,
       "y": 13.5,
       "radius": 0.3,
       "instant": true
      }
     ]
    },
    {
     "id": "w_vault",
     "name": "The sleeper at the vault",
     "when": {
      "type": "enter_area",
      "x": 99,
      "y": 9.5,
      "r": 3.3
     },
     "requires": [
      "w_enter"
     ],
     "actions": [
      {
       "type": "spawn",
       "enemy": "mountaintroll",
       "count": 1,
       "x": 101.6,
       "y": 7.1,
       "radius": 0.3,
       "instant": true
      }
     ]
    },
    {
     "id": "w_done",
     "name": "Warrens quiet",
     "when": {
      "type": "all_enemies_dead"
     },
     "requires": [
      "w_hall",
      "w_vault"
     ],
     "actions": [
      {
       "type": "message",
       "text": "The tunnels fall silent. The fox-gold is yours."
      },
      {
       "type": "heal",
       "pct": 30
      },
      {
       "type": "loot",
       "rarity": "rare",
       "count": 1,
       "x": 99,
       "y": 9.5,
       "item": "socket_rune"
      }
     ]
    },
    {
     "id": "shrine3",
     "name": "Hawk's Rest",
     "when": {
      "type": "enter_area",
      "x": 67.6,
      "y": 34,
      "r": 2.2
     },
     "actions": [
      {
       "type": "checkpoint",
       "text": "Checkpoint: Hawk's Rest"
      },
      {
       "type": "heal",
       "pct": 100
      }
     ],
     "once": false
    },
    {
     "id": "arena_hint",
     "name": "The rooted arena gate",
     "when": {
      "type": "enter_area",
      "x": 95.06,
      "y": 37.51,
      "r": 3.4
     },
     "requires": [
      "shrine3"
     ],
     "actions": [
      {
       "type": "message",
       "text": "The Clearing gate is knotted shut. Something in the Hollow holds it."
      }
     ]
    },
    {
     "id": "boss",
     "name": "Old Bramblehorn",
     "when": {
      "type": "enter_area",
      "x": 100,
      "y": 31,
      "r": 6.5
     },
     "requires": [
      "h_boss_done",
      "shrine3"
     ],
     "actions": [
      {
       "type": "arena",
       "id": "bramble_arena",
       "gate": "arena_gate",
       "x": 100,
       "y": 31,
       "r": 8.5
      },
      {
       "type": "banner",
       "title": "Old Bramblehorn",
       "sub": "The Troll King - Shard of Root",
       "boss": true
      },
      {
       "type": "dialogue",
       "id": "boss_bramblehorn_intro"
      },
      {
       "type": "objective",
       "text": "Defeat Old Bramblehorn"
      },
      {
       "type": "shake",
       "power": 6
      },
      {
       "type": "wait",
       "seconds": 2.5
      },
      {
       "type": "spawn",
       "enemy": "bramblehorn",
       "count": 1,
       "x": 100,
       "y": 29.5,
       "radius": 0.5,
       "elite": true
      },
      {
       "type": "wait",
       "seconds": 14
      },
      {
       "type": "banner",
       "title": "The saplings wake!",
       "sub": "Roots push up through the clearing"
      },
      {
       "type": "spawn",
       "enemy": "sapling",
       "count": 3,
       "x": 98,
       "y": 34,
       "radius": 2
      },
      {
       "type": "wait",
       "seconds": 14
      },
      {
       "type": "spawn",
       "enemy": "sapling",
       "count": 3,
       "x": 102,
       "y": 34,
       "radius": 2
      }
     ]
    },
    {
     "id": "victory",
     "name": "Old Bramblehorn falls",
     "when": {
      "type": "all_enemies_dead"
     },
     "requires": [
      "boss"
     ],
     "actions": [
      {
       "type": "clear_enemies"
      },
      {
       "type": "banner",
       "title": "Victory",
       "sub": "The Shard of Root is relit"
      },
      {
       "type": "dialogue",
       "id": "boss_bramblehorn_death"
      },
      {
       "type": "heal",
       "pct": 100
      },
      {
       "type": "openGate",
       "id": "arena_gate"
      },
      {
       "type": "quest",
       "id": "shard_root",
       "title": "The Pinewood Shard",
       "text": "The Shard of Root is relit.",
       "done": true
      },
      {
       "type": "loot",
       "rarity": "rare",
       "count": 1,
       "x": 100,
       "y": 31,
       "item": "key_dream"
      },
      {
       "type": "message",
       "text": "A key of dream-glass: the Dream Arena bridge in the Vale will open."
      },
      {
       "type": "open_portal",
       "id": "next"
      },
      {
       "type": "open_portal",
       "id": "home_arena"
      },
      {
       "type": "objective",
       "text": "Take a rift: home or the Ruins"
      },
      {
       "type": "sound",
       "name": "portal"
      }
     ]
    },
    {
     "id": "hawks_rest",
     "name": "Hawk's Rest",
     "when": {
      "type": "enter_area",
      "x": 68.3,
      "y": 34.6,
      "r": 1.9
     },
     "actions": [
      {
       "type": "vantage",
       "id": "hawks_rest",
       "r": 34,
       "title": "Hawk's Rest",
       "sub": "The Clearing road, and something big asleep at its end"
      },
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "From up here it's small. It isn't."
       ]
      }
     ]
    },
    {
     "id": "hawk_ledge",
     "name": "The gate road below",
     "when": {
      "type": "enter_area",
      "x": 75,
      "y": 38.2,
      "r": 1.6
     },
     "actions": [
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "The road to the Clearing is right below. Jump, Aerin."
       ]
      }
     ]
    }
   ]
  }
 },
 "tuning": {},
 "enemies": {
  "ogre": {
   "name": "Ogre",
   "ai": "brute",
   "hp": 515,
   "speed": 2,
   "dmg": 42,
   "range": 1.6,
   "cd": 1.7,
   "wind": 0.6,
   "r": 0.5,
   "aoe": 1.9,
   "shape": "cone",
   "blood": "#c8a060",
   "sprite": "ogre",
   "element": "slash",
   "res": {
    "fire": -0.5
   },
   "tags": [
    "beast"
   ]
  },
  "troll": {
   "name": "Mountain troll",
   "ai": "brute",
   "hp": 1245,
   "speed": 1.3,
   "dmg": 95,
   "range": 2,
   "cd": 2.4,
   "wind": 1,
   "r": 0.75,
   "aoe": 2.4,
   "shape": "circle",
   "blood": "#9ab06a",
   "sprite": "troll",
   "element": "slash",
   "res": {
    "fire": -0.5,
    "pierce": 0.5
   },
   "tags": [
    "beast"
   ]
  }
 },
 "sprites": {
  "troll": {
   "w": 44,
   "h": 66,
   "pal": [
    "#14101a",
    "#36483c",
    "#4f6652",
    "#6f8a6c",
    "#94ae88",
    "#4a3022",
    "#6e4a30",
    "#e8dfc4",
    "#ffcf5a",
    "#3c5222",
    "#6a8a32",
    "#24201c"
   ],
   "rows": [
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    "............................................",
    ".................0000000000.................",
    "...........00.0001111111111000..............",
    "..........0a9012229922b22299110..00.........",
    "...........0022b229112111992b1100a90........",
    "..........0122222122222221122111a90.........",
    ".........012222212333322221122111a90........",
    ".........02222222bbbbbbbbbb122211a90........",
    ".......0012222212233332222211221a9900.......",
    "......01111222212228222228211221111110......",
    ".....0111111222122222222222112111111110.....",
    ".....0112211222122222222221112111122110.....",
    ".....0122211222212222222211121111122210.....",
    ".....0122211122211720000117111111122210.....",
    ".....0122211111121711111117111111122210.....",
    "....011222122111177111111117111111222110....",
    "....011222122311171111111117112111222110....",
    "....011222122333311111111112222111222110....",
    "....011222122333333333222222222111222110....",
    "....012221122233333332222222222211122210....",
    "...01122212222223332222222222222111222110...",
    "...01122212222222222222222222221111222110...",
    "...01122212222222333333332222221111222110...",
    "...01122212222223333333333222221111222110...",
    "...01122212222233333333333322221111222110...",
    "...01222112222233333333333322211111122210...",
    "..0112221112222333333333333222111111222110..",
    "..0112221111222333333333333222111111222110..",
    "..0112221111122333333333333222111111222110..",
    "..0112221011112333333333333222111101222110..",
    "..0112221011111233333333332221111101222110..",
    ".01112220.011112233333333222211110.02221110.",
    ".011122100666666666666666666666666001221110.",
    ".011111100666666666666666666666666001111110.",
    ".022222100555555555555555555555555002222210.",
    "02333222105555555555555555555555550233322210",
    "02333222105555555555555555555555550233322210",
    "02232222105555555555555555555555550223222210",
    "02222222100022222225555552222221000222222210",
    "0122222110.0222222255555522222210.0122222110",
    "0112221110.0222222255555522222210.0112221110",
    ".01111110..0222222255555522222210..01111110.",
    "..000000...0222222210000222222210...000000..",
    "...........0222222210..0222222210...........",
    "...........0222222210..0222222210...........",
    "...........0122222110..0122222110...........",
    "...........0122222110..0122222110...........",
    "...........0112211110..0112211110...........",
    "..........0001111110....0111111000..........",
    ".........022222222110..022222222110.........",
    "........0222222222211002222222222110........",
    "........0122222222211001222222222110........",
    ".........011122211110..011122211110.........",
    "..........0000000000....0000000000.........."
   ]
  },
  "ogre": {
   "w": 30,
   "h": 40,
   "pal": [
    "#1a120e",
    "#5e5230",
    "#8a7a48",
    "#b3a266",
    "#d4c48a",
    "#4a3424",
    "#6a4a30",
    "#6b4a2a",
    "#9a6e40",
    "#d23a2a",
    "#f0e8d0"
   ],
   "rows": [
    "..............................",
    ".........................0000.",
    "........................088870",
    ".............0000.......088880",
    "...........00121100....0880887",
    "..........0122222110...0888887",
    "..........0233322210...0888887",
    ".........022000000010..0788887",
    ".........022232222110...078800",
    ".........012292229110...077770",
    ".........012222222110..077700.",
    ".........001222221100..07770..",
    ".....000022111a1a11110007770..",
    "....011123333111122211117770..",
    "...0111123333332222221117770..",
    "...0111122233222222221177770..",
    "...011112222222222222117770...",
    "..0111112222222222221117770...",
    "..0111111122222222111117770...",
    "..01111231111111111111177710..",
    "..01111223311111111222177710..",
    "..01111223333322222222777110..",
    ".011111222222222222222771110..",
    ".011112222222222222222722210..",
    ".0111122222222222222211222210.",
    ".0222112222222222222211222210.",
    "0122221666666666666666712210..",
    "012222155555555355555577110...",
    ".0122155555555555555555550....",
    "..01100011111111111111000.....",
    "...00...01111111111110........",
    ".......0222211111122210.......",
    ".......0222221002222210.......",
    ".......0222221002222210.......",
    ".......0222221002222210.......",
    ".......0222221002222210.......",
    ".......0122211001222110.......",
    "......055555550055555550......",
    "......055555550055555550......",
    ".......0000000..0000000......."
   ]
  },
  "fox": {
   "w": 22,
   "h": 14,
   "pal": [
    "#1e1410",
    "#8a3a1a",
    "#d9622b",
    "#f08a3c",
    "#f4efe6",
    "#2a1a14"
   ],
   "rows": [
    "......................",
    "...............0.0....",
    "..............01010...",
    ".000000.......02120...",
    "0222221000000033220...",
    "44222222222112332010..",
    "1422223333222222222200",
    "0112122333222212210220",
    ".00002222222214410.000",
    "....0112222211440.....",
    ".....005151115050.....",
    "......05050005050.....",
    "......05050.05050.....",
    ".......0.0...0.0......"
   ]
  },
  "rabbit": {
   "w": 13,
   "h": 12,
   "pal": [
    "#1e1814",
    "#5e5244",
    "#8a7a6a",
    "#b0a08c",
    "#f4f0e8",
    "#d8a0a0"
   ],
   "rows": [
    "........00...",
    ".......0210..",
    ".......0510..",
    ".......0210..",
    "...00000210..",
    "..0121123200.",
    ".023322222150",
    "042332221100.",
    "0422222110...",
    ".01222110....",
    "..011110.....",
    "...010010...."
   ]
  }
 }
};
