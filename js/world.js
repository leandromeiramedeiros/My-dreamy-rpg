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
   "W": 40,
   "H": 40,
   "tiles": [
    "........................................",
    ".gggggg......................ffffgff....",
    ".ggggggggggg.....g...........fffggggf...",
    ".gggggggggggg...ggg.........fgggpppggg..",
    ".ggggggggggggggggggg.......fggpppdpppgg.",
    ".gggpgggggggggggffggg......fgpxppdpppgg.",
    ".gggpggggfgggggffffggg....ffpxdpxxxxxpg.",
    ".gggggggffggggffffffggg..gggpxxxxxxxxpg.",
    ".gggggffffggggffffffggg...ggpxxxxxxxxpg.",
    ".ggggffffffgggffffffggg...gggxxxxxxxpgg.",
    ".gggggfffffgggffffffggg..ffpppxxxxddpgg.",
    ".gggggggfffgggpgffgggg..ggsspgpxdpdpgfg.",
    "..gggggggfgggpppggggg..fgppsgggppppgfff.",
    "...ggggggggggppgggggg..ffsspgggggffffff.",
    "....ggggggggpppggggggfffpssgggggggfffff.",
    "......gggggggpppggggffffssssppppppfffff.",
    "........gggggpppgggggffpssspppggfpfffff.",
    "...........ggpppppxxppgsssggggggfffffff.",
    "...........gggppxxxxxxpgsgggggggfffffff.",
    "............gggpxxxxxxxpsgggfffffffffff.",
    "............fffpxxxxxxxpggggffwwwwwwggff",
    "............fffpxxxxxxxpggggwwwwwwwwwgff",
    "............fffpxxxxxxxpggggwwwwwwwwwwgg",
    "............fffgpxxxxxpgggggwwwwwwwwwwgg",
    ".............ggfppxxxpggggggwwwwwwwwwwgf",
    "...ggggggg....ggfgppgppgggggwwwwwwwwwwgf",
    "..ggggggggg...gggggffppgggggwwwwwwwwwwgg",
    ".ggggggggggg.ggggggffppfgggggwwwwwwwwwgg",
    ".ggggggggggggggggggfpppggggggwwwwwwwwwfg",
    ".gggggggggggggggppppppggggggggwwwwwwwffg",
    ".ggggggggggggggggpppppgggggggggggggffff.",
    ".ggggggggggggggggpggpppgggggggggggggfgg.",
    ".ggggggggggggggggggggpppggggggggggggggg.",
    "..gggggggpggggggggpggppppxpggggggpppggg.",
    "..ggggggppggggggggpppppxxxxpggggpxxxpgg.",
    "...ggggggggggggfggpppppppxxpggggpxxxpgg.",
    "....ggggg.gggggffg.ggpppddxppppppxxxpgg.",
    "...........gggggg....ggppppgppppgpppggg.",
    "............ggggg....gggggggggggggggggg.",
    "........................................"
   ],
   "heights": [
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000044444440000",
    "0000000000000000000000000000044444444000",
    "0000000000000000000000000000444444444400",
    "0000000000000000000000000004444444444440",
    "0000000000000000000000000004444444444440",
    "0000000000000000000000000044444444444440",
    "0000000000000000000000000444444444444440",
    "0000000000000000000000000044444444444440",
    "0000000000000000000000000044444444444440",
    "0000000000000000000000000244444444444440",
    "0000000000000000000000002234444444444440",
    "0000000000000000000000022333444444444440",
    "0000000000000000000000022333404444404000",
    "0000000000000000000000222220000000000000",
    "0000000000000000000000222110000000000000",
    "0000000000000000000000011100000000000000",
    "0000000000000000000000012200000000000000",
    "0000000000000000000000001200000000000000",
    "0000000000000000000000001200000000000000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000"
   ],
   "start": {
    "x": 5.3,
    "y": 32.2
   },
   "portals": [
    {
     "x": 30.8,
     "y": 6.8,
     "to": "ruins",
     "open": true,
     "marker": true,
     "id": "ruins"
    },
    {
     "x": 35.4,
     "y": 6.4,
     "to": "grotto",
     "open": false,
     "marker": false,
     "id": "grotto"
    },
    {
     "x": 31.4,
     "y": 10.4,
     "to": "caldera",
     "open": false,
     "marker": false,
     "id": "caldera"
    },
    {
     "x": 35.4,
     "y": 10.2,
     "to": "spire",
     "open": false,
     "marker": false,
     "id": "spire"
    },
    {
     "x": 25,
     "y": 35.8,
     "to": "pinewood",
     "open": false,
     "marker": false,
     "id": "pine"
    }
   ],
   "objects": [
    {
     "t": "house",
     "x": 7,
     "y": 7
    },
    {
     "t": "tablet",
     "x": 19.5,
     "y": 21,
     "role": "elder_stone",
     "title": "Elder Stone",
     "label": "elder stone",
     "text": "The Stone knows her. The Stone does not say. Past the cottage, where the path ends, a light waits."
    },
    {
     "t": "lantern",
     "x": 17.16,
     "y": 25.12
    },
    {
     "t": "lantern",
     "x": 14.77,
     "y": 21.1
    },
    {
     "t": "shrine",
     "x": 8.5,
     "y": 29.2,
     "label": "checkpoint"
    },
    {
     "t": "sign",
     "x": 9.3,
     "y": 32,
     "label": "sign",
     "text": "Training yard east. Elder Stone north-east."
    },
    {
     "t": "chest",
     "x": 36.5,
     "y": 16.5,
     "role": "chest",
     "label": "tutorial-chest",
     "tier": "wood",
     "starter": true
    },
    {
     "t": "crystal_violet",
     "x": 3.2,
     "y": 3.4,
     "role": "gem_cache",
     "label": "secret gem cache"
    },
    {
     "t": "fishspot",
     "x": 36.5,
     "y": 19.5,
     "role": "fishspot",
     "pool": "vale_a"
    },
    {
     "t": "fishspot",
     "x": 27.5,
     "y": 24.5,
     "role": "fishspot",
     "pool": "vale_b"
    },
    {
     "t": "tablet",
     "x": 11.7,
     "y": 11.9,
     "role": "tablet",
     "label": "lore",
     "title": "Tablet",
     "text": "Four Wardens. One would not wake."
    },
    {
     "t": "lantern_blue",
     "x": 4.5,
     "y": 4.3,
     "label": "lost-lantern"
    },
    {
     "t": "lantern",
     "x": 12.94,
     "y": 30.62
    },
    {
     "t": "lantern",
     "x": 6.25,
     "y": 13.59
    },
    {
     "t": "lantern_blue",
     "x": 37.97,
     "y": 7.89
    },
    {
     "t": "lantern_blue",
     "x": 34.72,
     "y": 12.53
    },
    {
     "t": "lantern_blue",
     "x": 28.93,
     "y": 4.98
    },
    {
     "t": "lantern_blue",
     "x": 34.48,
     "y": 3.14
    },
    {
     "t": "lantern",
     "x": 23.43,
     "y": 37.99
    },
    {
     "t": "lantern_blue",
     "x": 37.11,
     "y": 35.47
    },
    {
     "t": "lantern_blue",
     "x": 33.14,
     "y": 33.36
    },
    {
     "t": "tree_poplar",
     "x": 29.25,
     "y": 32.26,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 27.37,
     "y": 38.88
    },
    {
     "t": "tree_poplar",
     "x": 21.04,
     "y": 11.46,
     "v": 1
    },
    {
     "t": "tree_poplar",
     "x": 20.72,
     "y": 6.21,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 29.34,
     "y": 2.91
    },
    {
     "t": "tree_poplar",
     "x": 17.04,
     "y": 13,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 11.72,
     "y": 37.66,
     "v": 2
    },
    {
     "t": "tree_poplar",
     "x": 37.93,
     "y": 32.08,
     "v": 2
    },
    {
     "t": "tree_poplar",
     "x": 1.71,
     "y": 8.27,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 11.29,
     "y": 17.58,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 25.39,
     "y": 30.35,
     "v": 1
    },
    {
     "t": "tree_poplar",
     "x": 10.49,
     "y": 26.39
    },
    {
     "t": "tree_poplar",
     "x": 2.4,
     "y": 32.9,
     "v": 1
    },
    {
     "t": "tree_poplar",
     "x": 37.85,
     "y": 3.08,
     "v": 1,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 9.53,
     "y": 25.04,
     "v": 1
    },
    {
     "t": "tree_poplar",
     "x": 10.75,
     "y": 2.35,
     "v": 2
    },
    {
     "t": "tree_poplar",
     "x": 38.78,
     "y": 12.8
    },
    {
     "t": "tree_poplar",
     "x": 31.96,
     "y": 31.92,
     "v": 2
    },
    {
     "t": "tree_poplar",
     "x": 29.19,
     "y": 1.03,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 5.58,
     "y": 26.82,
     "v": 1,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 37.4,
     "y": 37.3,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 14.14,
     "y": 26.81
    },
    {
     "t": "tree_poplar",
     "x": 23.59,
     "y": 12.06
    },
    {
     "t": "tree_poplar",
     "x": 2.08,
     "y": 30.79,
     "v": 1,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 38.35,
     "y": 33.72,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 12.64,
     "y": 19.48,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 2.14,
     "y": 10.76,
     "v": 2
    },
    {
     "t": "tree_teal",
     "x": 16.37,
     "y": 38.21,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 8.6,
     "y": 16.06,
     "v": 1,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 33.89,
     "y": 1.97,
     "v": 1,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 12.53,
     "y": 5.65,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 5.33,
     "y": 36.61
    },
    {
     "t": "tree_teal",
     "x": 15.89,
     "y": 4.39
    },
    {
     "t": "tree_teal",
     "x": 35.75,
     "y": 31.88,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 18.9,
     "y": 13.4,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 17.56,
     "y": 3.52,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 38.71,
     "y": 36.44,
     "v": 1,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 12.67,
     "y": 28.38,
     "v": 1
    },
    {
     "t": "tree_teal",
     "x": 2.37,
     "y": 26.62,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 4.1,
     "y": 14.41,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 6.31,
     "y": 15.56
    },
    {
     "t": "tree_teal",
     "x": 12.23,
     "y": 22.86,
     "v": 2
    },
    {
     "t": "tree_teal",
     "x": 22.44,
     "y": 9.36,
     "v": 2
    },
    {
     "t": "tree_teal",
     "x": 7.87,
     "y": 36.39,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 14,
     "y": 24.96,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 26.33,
     "y": 22.93
    },
    {
     "t": "tree_round",
     "x": 9.17,
     "y": 3.83,
     "v": 2
    },
    {
     "t": "tree_round",
     "x": 26.35,
     "y": 6.4,
     "v": 1,
     "f": 1
    },
    {
     "t": "tree_round",
     "x": 35.26,
     "y": 38.44,
     "v": 2
    },
    {
     "t": "tree_round",
     "x": 26.64,
     "y": 26.22,
     "f": 1
    },
    {
     "t": "tree_round",
     "x": 5.22,
     "y": 34.13
    },
    {
     "t": "tree_round",
     "x": 38.33,
     "y": 29.07,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_round",
     "x": 28.97,
     "y": 20.52,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_round",
     "x": 14.28,
     "y": 38.85,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_round",
     "x": 6.53,
     "y": 1.33,
     "v": 1
    },
    {
     "t": "tree_round",
     "x": 29.81,
     "y": 30.27,
     "v": 2
    },
    {
     "t": "tree_round",
     "x": 8.12,
     "y": 26.61
    },
    {
     "t": "tree_blossom",
     "x": 4.24,
     "y": 25.13,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_blossom",
     "x": 1.56,
     "y": 5.47,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_blossom",
     "x": 25.1,
     "y": 10.58,
     "v": 1
    },
    {
     "t": "tree_blossom",
     "x": 20.9,
     "y": 15.39,
     "v": 2
    },
    {
     "t": "tree_blossom",
     "x": 33.25,
     "y": 13.35
    },
    {
     "t": "bush",
     "x": 22.85,
     "y": 7.95,
     "v": 2,
     "f": 1
    },
    {
     "t": "bush",
     "x": 10.44,
     "y": 16.74,
     "f": 1
    },
    {
     "t": "bush",
     "x": 38.9,
     "y": 6.05,
     "v": 1,
     "f": 1
    },
    {
     "t": "bush",
     "x": 12.96,
     "y": 38.02
    },
    {
     "t": "bush",
     "x": 38.3,
     "y": 8.88,
     "v": 2,
     "f": 1
    },
    {
     "t": "bush",
     "x": 19.22,
     "y": 11.06
    },
    {
     "t": "bush",
     "x": 14.75,
     "y": 22.57,
     "v": 2,
     "f": 1
    },
    {
     "t": "bush",
     "x": 1.5,
     "y": 28.25,
     "f": 1
    },
    {
     "t": "bush",
     "x": 8.37,
     "y": 2.41,
     "v": 2,
     "f": 1
    },
    {
     "t": "bush",
     "x": 38.55,
     "y": 22.32,
     "v": 2,
     "f": 1
    },
    {
     "t": "bush",
     "x": 14.66,
     "y": 28.8,
     "v": 1
    },
    {
     "t": "bush",
     "x": 32.06,
     "y": 38.61,
     "v": 2,
     "f": 1
    },
    {
     "t": "bush",
     "x": 21.66,
     "y": 38.93,
     "f": 1
    },
    {
     "t": "bush",
     "x": 33.18,
     "y": 38.77,
     "v": 1,
     "f": 1
    },
    {
     "t": "bush",
     "x": 7.32,
     "y": 14.17,
     "f": 1
    },
    {
     "t": "bush",
     "x": 21.56,
     "y": 8.03,
     "f": 1
    },
    {
     "t": "bush",
     "x": 36.76,
     "y": 31.13,
     "f": 1
    },
    {
     "t": "rock",
     "x": 26.33,
     "y": 20.42,
     "v": 1
    },
    {
     "t": "rock",
     "x": 22.19,
     "y": 37.57,
     "v": 2
    },
    {
     "t": "rock",
     "x": 10.64,
     "y": 15.3,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 28.66,
     "y": 13.85,
     "v": 2
    },
    {
     "t": "rock",
     "x": 11.87,
     "y": 29.9
    },
    {
     "t": "rock",
     "x": 19.29,
     "y": 26.25,
     "f": 1
    },
    {
     "t": "rock",
     "x": 23.65,
     "y": 28.95,
     "v": 2
    },
    {
     "t": "mushroom",
     "x": 26.08,
     "y": 34.79
    },
    {
     "t": "mushroom",
     "x": 27.68,
     "y": 33.74
    },
    {
     "t": "mushroom",
     "x": 27.37,
     "y": 33.13
    },
    {
     "t": "mushroom",
     "x": 29.32,
     "y": 8.24
    },
    {
     "t": "mushroom",
     "x": 35.79,
     "y": 11.02
    },
    {
     "t": "mushroom",
     "x": 35.59,
     "y": 11.6
    },
    {
     "t": "mushroom",
     "x": 28.62,
     "y": 12.68
    },
    {
     "t": "mushroom",
     "x": 28.12,
     "y": 12.11
    },
    {
     "t": "mushroom",
     "x": 12.78,
     "y": 13.54
    },
    {
     "t": "mushroom",
     "x": 29.54,
     "y": 10.52
    },
    {
     "t": "mushroom",
     "x": 30.24,
     "y": 10.42
    },
    {
     "t": "mushroom",
     "x": 35.55,
     "y": 13.62
    },
    {
     "t": "mushroom",
     "x": 37.23,
     "y": 15.81
    },
    {
     "t": "grass",
     "x": 32.2,
     "y": 12.18,
     "v": 1
    },
    {
     "t": "grass",
     "x": 31.23,
     "y": 11.96,
     "f": 1
    },
    {
     "t": "grass",
     "x": 32.92,
     "y": 11.57
    },
    {
     "t": "grass",
     "x": 31.72,
     "y": 11.77,
     "f": 1
    },
    {
     "t": "grass",
     "x": 25.34,
     "y": 36.68,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 24.82,
     "y": 36.77
    },
    {
     "t": "grass",
     "x": 35.42,
     "y": 3.61,
     "v": 1
    },
    {
     "t": "grass",
     "x": 13.49,
     "y": 11.61,
     "f": 1
    },
    {
     "t": "grass",
     "x": 30.44,
     "y": 31.75,
     "v": 1
    },
    {
     "t": "grass",
     "x": 22.78,
     "y": 18.4,
     "f": 1
    },
    {
     "t": "grass",
     "x": 6.42,
     "y": 12.15
    },
    {
     "t": "grass",
     "x": 6.76,
     "y": 13.26,
     "f": 1
    },
    {
     "t": "grass",
     "x": 28,
     "y": 4.53,
     "v": 1
    },
    {
     "t": "grass",
     "x": 27.28,
     "y": 4.18
    },
    {
     "t": "grass",
     "x": 27.16,
     "y": 5.19,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 35.78,
     "y": 4.12,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 28.27,
     "y": 15.07,
     "f": 1
    },
    {
     "t": "grass",
     "x": 33.86,
     "y": 38.01
    },
    {
     "t": "grass",
     "x": 17.39,
     "y": 35.98
    },
    {
     "t": "grass",
     "x": 17.37,
     "y": 35.13
    },
    {
     "t": "grass",
     "x": 3.6,
     "y": 11.95,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 27.09,
     "y": 34.94,
     "v": 1
    },
    {
     "t": "grass",
     "x": 25.44,
     "y": 35.61
    },
    {
     "t": "grass",
     "x": 25.37,
     "y": 34.01,
     "v": 1
    },
    {
     "t": "grass",
     "x": 22.22,
     "y": 30.25
    },
    {
     "t": "grass",
     "x": 21.97,
     "y": 30.71,
     "f": 1
    },
    {
     "t": "grass",
     "x": 21.29,
     "y": 30.02,
     "v": 1
    },
    {
     "t": "grass",
     "x": 36.29,
     "y": 3.55,
     "v": 1
    },
    {
     "t": "grass",
     "x": 35.16,
     "y": 4.16,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 7.69,
     "y": 30.89,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 6.94,
     "y": 29.93,
     "v": 1
    },
    {
     "t": "grass",
     "x": 22,
     "y": 21.8,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 13.95,
     "y": 5.83,
     "f": 1
    },
    {
     "t": "grass",
     "x": 9.62,
     "y": 11.24,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 9.96,
     "y": 11.96,
     "v": 1
    },
    {
     "t": "grass",
     "x": 5.04,
     "y": 28.89,
     "f": 1
    },
    {
     "t": "grass",
     "x": 4.11,
     "y": 28,
     "f": 1
    },
    {
     "t": "grass",
     "x": 25.21,
     "y": 37.39,
     "f": 1
    },
    {
     "t": "grass",
     "x": 24.38,
     "y": 38.39,
     "v": 1
    },
    {
     "t": "grass",
     "x": 13.67,
     "y": 27.95,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 13.58,
     "y": 9.6,
     "f": 1
    },
    {
     "t": "grass",
     "x": 14.25,
     "y": 8.94
    },
    {
     "t": "grass",
     "x": 14.03,
     "y": 9.82,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 25.05,
     "y": 22.19
    },
    {
     "t": "crystal",
     "x": 26.94,
     "y": 18.24
    }
   ],
   "objective": "Wake up. Training dummies wait in the yard.",
   "level": [
    1,
    3
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
       "x": 13.7,
       "y": 32.9,
       "instant": true
      },
      {
       "type": "spawn",
       "enemy": "dummy",
       "count": 1,
       "x": 15.3,
       "y": 34.3,
       "instant": true
      }
     ]
    },
    {
     "id": "wake",
     "name": "Pip wakes Aerin",
     "when": {
      "type": "enter_area",
      "x": 6.5,
      "y": 31,
      "r": 7
     },
     "actions": [
      {
       "type": "dialogue",
       "id": "vale_wake"
      },
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "Training dummies are east. Hit one."
       ]
      },
      {
       "type": "objective",
       "text": "Hit the training dummies in the yard."
      }
     ]
    },
    {
     "id": "shrine",
     "name": "Rift shrine",
     "when": {
      "type": "enter_area",
      "x": 8.5,
      "y": 29.2,
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
     ]
    },
    {
     "id": "yard_teach",
     "name": "Dummy yard lesson",
     "when": {
      "type": "enter_area",
      "x": 14.5,
      "y": 33.5,
      "r": 3.6
     },
     "actions": [
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
       "text": "Follow the path north to the Elder Plaza."
      }
     ]
    },
    {
     "id": "elder",
     "name": "The Elder Stone",
     "when": {
      "type": "enter_area",
      "x": 19.5,
      "y": 21,
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
       "text": "Open the chest north-east. Then find the Stone's lantern."
      }
     ]
    },
    {
     "id": "chest",
     "name": "Tutorial chest",
     "when": {
      "type": "enter_area",
      "x": 36.5,
      "y": 16.5,
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
      }
     ]
    },
    {
     "id": "fish_hint",
     "name": "Fishing spot",
     "when": {
      "type": "enter_area",
      "x": 36.5,
      "y": 19.5,
      "r": 3.4
     },
     "actions": [
      {
       "type": "dialogue",
       "speaker": "Pip",
       "lines": [
        "Ripples. Fishing waits in the Pinewood."
       ]
      }
     ]
    },
    {
     "id": "gems",
     "name": "Hidden gem cache",
     "when": {
      "type": "enter_area",
      "x": 3.2,
      "y": 3.4,
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
       "x": 3.2,
       "y": 3.4,
       "gem": true
      }
     ]
    },
    {
     "id": "tablet",
     "name": "Cottage tablet",
     "when": {
      "type": "enter_area",
      "x": 11.7,
      "y": 11.9,
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
      "x": 17,
      "y": 8.5,
      "r": 3.2
     },
     "requires": [
      "elder"
     ],
     "actions": [
      {
       "type": "banner",
       "title": "Gloom in the garden",
       "sub": "Slimes ooze out of the flowers"
      },
      {
       "type": "spawn",
       "enemy": "gloomslime",
       "count": 1,
       "x": 15.4,
       "y": 7.9,
       "radius": 1.2
      },
      {
       "type": "spawn",
       "enemy": "gloomslime",
       "count": 1,
       "x": 18.8,
       "y": 8.9,
       "radius": 1.2
      },
      {
       "type": "spawn",
       "enemy": "gloomslime",
       "count": 1,
       "x": 17,
       "y": 10.3,
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
       "rarity": "uncommon",
       "count": 1,
       "x": 17,
       "y": 8.5
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
       "text": "Take the rift south into the Misty Pinewood."
      }
     ]
    },
    {
     "id": "lantern_found",
     "name": "The lost lantern",
     "when": {
      "type": "enter_area",
      "x": 4.5,
      "y": 4.3,
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
       "text": "Return the lantern to the Elder Stone."
      }
     ]
    },
    {
     "id": "lantern_return",
     "name": "Lantern returned",
     "when": {
      "type": "enter_area",
      "x": 19.5,
      "y": 21,
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
       "x": 19.5,
       "y": 21,
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
    "..............................................................................................dddfffffffgggg....",
    ".............................................................................................gdddfffffffgggg....",
    "............................................................................................gggdpcppppppggggg...",
    "...........................................................................................gggppxxxxxxxxppgggg..",
    ".........................................................................................ggggpxxxxxxxxxxxxpggg..",
    ".........gg..............................................................................gggpxxxxxxxxxxxxxxpggg.",
    "........gggg............................................................................ggggpxxxxxxxxxxxxxxpggg.",
    "........gggf..........................................................................ggggggxxxxxxrrrrxxxxxcggd.",
    "........gggf.........................................................................gggggggxxxxxrrrrrrxxxxxpdd.",
    "........gggf.......................................................................gggpppgggxxxxxrrrrrrxxxxxpdd.",
    ".........gg..............................gggg.....................................gggppppppfxxxxxrrrrrrxxxxxpdd.",
    ".........bb.............................ggggggg.................................ggggpppppppppxxxxrrrrrrxxxxpdd..",
    ".........bb............................ggggggggg...............................gggggpppfffpppxxxxxrrrrxxxxxpdd..",
    ".........bbg..........................ggggggggggg..............................ggggggpffffgpppxxxxxxxxxxxxxddd..",
    ".......ggbbg..........................gggggggggggg.............................ggggggggg..ggppxxxxxxxxxxxxpddd..",
    "......gggbbgg.........................gggggggggggf.............................ggggggggg...gpppxxxxxxxxxxpddd...",
    "......gggddggg........................ggggggggggg..............................ggggggpgff..ggpppxxxxxxxxpddd....",
    "......gggddgggg........................ggggppgggg..........................gggggggggpppggg.ggggppxxxxxcpgddd....",
    ".....ggggddgggggg.......................gggppggggf.........................ggggggggggpppggf.gggggdppppggddd.....",
    ".....gggggddgggggggg....................fggppgggggg.......................ggggggggggggppggg..gggggdddggggd......",
    "......ggggddddggggggg...................fffppggggggggg....................ggppppgggggppggggg.ggggggdddddg.......",
    "......ggggggddddgggdgg..................fffpppppppggggg...................ggppppppfgpppgdddgggggggggdddggg......",
    ".......gggggggddggggddd.......dddf......fffppppppppggggg........fff..ggggggppppppppppddddddddddggggggddgggd.....",
    "........gggggggddggggdd.....dddddfffff..fffpppddppppgggg......gffffggggggggpppgggppppdddddddddddggggffddggggg...",
    "...........ggggddggggdd....ddddddffdddddddfpppddggpppgggg....ggffpggggddgggpppgggggggggdddddddddgggffffddgddgg..",
    "............ggggddggpdd....ddpppppdddddddddppddggffpppggg...gggpppppddddddggppggggggggggdddddddddggfffffdgddgg..",
    ".............gggddddppd...ddppppppppppddddpppfggffffppggg..gggppppdddddddddgppgggggggg.....dddddddwfffffggggg...",
    ".............ggggdddppd...ddppdddppppppdggppfffgffffppgggggggpppgdddddddddddppggg...........dgggwwwwfffffggggg..",
    "...........ggggggdddppddddddpppddddddpppppppfff..fffpppgggggpppgddddddddddddppggg...........gggggwwffffffgggggg.",
    ".........ggggggggdddppdddddddppdddddddpppppffff..ffffppggggpppddddxxxdddddddppggg...........gggggfffffffffgffgg.",
    ".........ggggggggddggggggddddggggddddddgppffff...fffgpppggpppdddddxdddddddxdppggg...........gggggfffffffffggggg.",
    "........ggggggggggddppppppppppppgdd...dgfffff.....fffgppppppddddddxddddddxxdppggg...........gggggfggggfggggggggg",
    "........ggggggggggggpxxxxxxxxxxpgdd.....gggg.......ffgpppppddddgddddddxdddddpgggg.......gggggggggggggggggggggggg",
    "........ffggggggggggpxxxxxxxxxxppdd..d...g.........fggggdddddddgddddddxdddddggggg...ggggggggggggggggffgwwwwwwwwg",
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
    "0000000000000000000000020222222222222222222200000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000222222222222222222222220000000000000000000000000000000000000000000000000000222200000000000",
    "0000000000000000000002222222222222222222222222220000000000000000000000000000022220000000000000022222220000000000",
    "0000000000000000000022222222222226666222222244442000000000000000000000000002222222000000000000222000222000000000",
    "0000000000022200000222222222622266666622442222444400000000000000000000000022000000222200000002220000002220000000",
    "0000000000222222222222222223366444466664422222222442220000000000000000000000000000002220000022200000000220000000",
    "0000000000022200022222222223334444446666222222222244222000000000000000000000000000000222000220000000000220000000",
    "0000000000000000002212222663344444444666222222222244222200000000000000002200000000000022200000000000000020000000",
    "0000000000000000001111022666444444444663222222222242222200000000000000002000000000000020000000000000000020000000",
    "0000000002000000000112000066444444444633222222222222222200000000000000000000000000000000000222000000000020000000",
    "0000000022000000000112000066444444444333222222222222222200000000000000000000000000000000000222000000000220000000",
    "0000000022200000000200000666444444444336222222222224222200000000000000002220000000000002000000200000000220000000",
    "0000000022200000000200000666444444443366422222222442222200000000000000002220000000000222000000220000002200000000",
    "0000000002220000000220000066664444433664422222224442202000000000000000000020000000002000000000022200222000000000",
    "0000000002220000002220000066666444333660044222244420000000000000000000000002000000020000000000002222220000000000",
    "0000000000022000002220000000066666333640004444442000000000000000000000000000220002000000000000000000000000000000",
    "0000000000002222222000000000000666633440000044200000000000000000000000000000022200000000000000000000000000000000",
    "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000466666666660000000",
    "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006666444446666600000",
    "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000066444444444446664000",
    "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000664444444444444466400",
    "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000046644444444444444446600",
    "0000000004400000000000000000000000000000000000000000000000000000000000000000000000000000046644444444444444446640",
    "0000000044440000000000000000000000000000000000000000000000000000000000000000000000000000446444444444444444444600",
    "0000000044440000000000000000000000000000000000000000000000000000000000000000000000000044466444444444444444444660",
    "0000000044440000000000000000000000000000000000000000000000000000000000000000000000000444466444444444444444444660",
    "0000000044440000000000000000000000000000000000000000000000000000000000000000000000044444466444444444444444444660",
    "0000000004400000000000000000000000000000044440000000000000000000000000000000000000444444444444444444444444444660",
    "0000000004400000000000000000000000000000444444400000000000000000000000000000000044444444444444444444444444444600",
    "0000000004400000000000000000000000000004444444440000000000000000000000000000000444444444444444444444444444444600",
    "0000000004440000000000000000000000000044444444444000000000000000000000000000000444444444446444444444444444446600",
    "0000000444440000000000000000000000000044444444444400000000000000000000000000000444444444004644444444444444446400",
    "0000004444444000000000000000000000000044444444444400000000000000000000000000000444444444000644444444444444466000",
    "0000004444444400000000000000000000000044444444444000000000000000000000000000000444444444400464444444444444660000",
    "0000004444444440000000000000000000000004444444444000000000000000000000000004444444444444440446644444444446640000",
    "0000044444444444400000000000000000000000444444444400000000000000000000000004444444444444444044664444444666400000",
    "0000044444444444444400000000000000000000444444444440000000000000000000000044444444444444444004466644466664000000",
    "0000004444444444444440000000000000000000444444444444440000000000000000000044444444444444444404444664446440000000",
    "0000004444444444444444000000000000000000444444444444444000000000000000000044444444444444444444444444444444000000",
    "0000000444444444444444400000004444000000444444444444444200000000444006666664444444444444444444444444444444400000",
    "0000000044444444444444400000444444444400444444444444444400000044466666666664444444444444444444444444444444444000",
    "0000000000044444444444400004444444444444444444444444444440000446646664444464444444444444444444444444444444444400",
    "0000000000004444444444400004444444444444444444444444444440004464444444444446444444444444444444444444444444444400",
    "0000000000000444444444400044444444444444444444444444444440044644444444444444446444444400000444444444444444444000",
    "0000000000000444444444400044444444444444444444444444444444444444444444444444446440000000000044444444444444444400",
    "0000000000044444444444444444444444444444444444400444444444444446444444444444446440000000000044444444444444444440",
    "0000000004444444444444444444444444444444444444400444444444444466444444444444446440000000000044444444444444444440",
    "0000000004444444444444444444444444444444444444000444444444444666444444444444446440000000000044444444444444444440",
    "0000000044444444444444444444444444400044444440000044444444444666444444444444446440000000000044444444444444444044",
    "0000000044444444444444444444444444400000444400000004444444444664444444444444466440000000444444444444444444444444",
    "0000000044444444444444444444444444400400040000000004444444444666444444444444466440004444444444444444444000000000",
    "0440400044444444444444444444444444444444400000000004444444440066444444444444466444444444444444444444000000000004",
    "0444440044444444444444444444444444444444440000000000444000000066644444444444666444444444444444444400000044440004",
    "4444444444444444444444444444444444444444440000000000444000000066666444444466666444444444444444444000044444444444",
    "4444444444444000044444444444444444444444444000000044444400000046644444444444644444444444444444400004444444444444",
    "4444444444444000044444444444444444444444444000004444444440004444444466644444444444444444444444000044244444444444",
    "4444444444444404444444444444444444444444444000444444444444444444444466666644422222444444444440004442244444444440",
    "4444444444444444444444444444444444444444444004444444444444444444444444444224422222222222222220044006644444422440",
    "4444444444444444444444444444444444444444444444444444444444444444444444442244244442222222222220444466444444444440",
    "4444444444444444444444444444444444444444444444444444444444424444244444222444444444444422222244444464404400000000",
    "4444444444444444444444444444444444444444444444444444444444422222222442222444444444444444444444444400000000000000",
    "0444444444444444444444444444444444444444444444444444444444422222222222224444444444444444444444444000000000000000",
    "0444444444444444444444444444444444444444444444444444433344442222222222244444444444444444444444000000000000000000",
    "0444444444444444444444444444444444444444444444444444433344422222222222444444444444444444440000000000000000000000",
    "0444444444444444444444444444444444444444444444444444233224222222222224444444444444444444400000000000000000000000",
    "0444444442244444444444444444444444444444444444444442222224222222222224444444444444000000000000000000000000000000",
    "0000040422444444444444444444444444444444444444444422222222222222224444444444444444000000000000000000000000000000",
    "0000000022444444444444444444444444444444444444444422222222222222223344444444444444400000000000000000000000000000",
    "0000000022444444440000000044444444444444444424444422222222222222233344444444444444444000000000000000000000000000",
    "0000000022333444440000000000444444444444444422222222222222222222222444444444444444444000000000000000000000000000",
    "0000000022334444400000000000000444444444444200002222222222222222222444444444444444444400000000000000000000000000",
    "0000000022224400000000000000000040000000000000000222222222222222222244444444444433322000000000000000000000000000",
    "0000000222222222200000000000000000000000000000002222222222222222222224444444000443322000000000000000000000000000",
    "0000000222222221110000000000000000000000000000022222222222222222222220044440000223322002222222200000000000000000",
    "0000000022222221110000000000000000000000000000222222222222222222222220000000000022222222222222222222000000000000",
    "0000000022222200022000000000000000000000000000022222222222222222222200000000000022222222222222222222400000000000",
    "0000000222222200000000000000000000000000000000022222222222222222222200000000000002222222222222222222440000000000",
    "0000000222222200000000000000000000000000000000022222222222222222222000000000000000222222222222222222440000000000",
    "0000002222222220000000000000000000000000200222022222222222222222220000000000000000000002222222222222244000000000",
    "0000002222222200000000000000000000000022222222222222222222000000000000000000000000000000000222222222244000000000",
    "0000002222222200000000000000000000000222222222222222222200000000000000000000000000000000000222222222244000000000",
    "0000022222222200000000000000000000022222222222222222222200000000000000000000000000000000000222222222224000000000",
    "0000022222222220000000000000000000222222222222222222222200000000000000000000000000000000000222222222222000000000",
    "0000022222222222000000000000000002222222222222222222222200000000000000000000000000000000000002222222220000000000",
    "0000002222222220000000000000000022222222222222222222222000000000000000000000000000000000000002222220000000000000",
    "0000000222222120000000000000000222222222222222222222220000000000000000000000000000000000000000000000000000000000",
    "0000000222222111000000000000000222222222222222222222220000000000000000000000000000000000000000000000000000000000",
    "0000000222222221000000000000000222222222222222222222200000000000000000000000000000000000000000000000000000000000",
    "0000000022222220000000000000000022222222222222222220000000000000000000000000000000000000000000000000000000000000",
    "0000000004422220000000000000000002222222222222222220000000000000000000000000000000000000000000000000000000000000",
    "0000000000042000000000000000000112222222222222222220000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000001112222222222222222220000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000012122222222222222200000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000220112222222222220000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000002200012222222222200000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000000002222222222000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000222222200000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000022222000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
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
      "x": 26.41,
      "y": 37.21
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
      "x": 26.41,
      "y": 37.21
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
    },
    {
     "x": 105.5,
     "y": 48,
     "to": "pinewood",
     "open": true,
     "marker": true,
     "id": "warrens_door",
     "arrive": {
      "x": 66.9,
      "y": 8.6
     },
     "label": "Fox Warrens"
    },
    {
     "x": 63.5,
     "y": 10.2,
     "to": "pinewood",
     "open": true,
     "marker": true,
     "id": "warrens_exit",
     "arrive": {
      "x": 103.3,
      "y": 48.4
     },
     "label": "Back to the pond"
    },
    {
     "x": 44,
     "y": 35.8,
     "to": "pinewood",
     "open": true,
     "marker": true,
     "id": "hollow_door",
     "arrive": {
      "x": 6.9,
      "y": 9.7
     },
     "label": "Root Hollow"
    },
    {
     "x": 52.4,
     "y": 10.5,
     "to": "pinewood",
     "open": true,
     "marker": true,
     "id": "hollow_exit",
     "arrive": {
      "x": 85.7,
      "y": 36.9
     },
     "label": "Root-stair up to the shrine"
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
     "x": 84,
     "y": 36,
     "id": "shrine3",
     "name": "The Clearing gate",
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
     "t": "keydoor",
     "x": 44,
     "y": 39.29,
     "role": "keydoor",
     "id": "door_key",
     "key": "key_roothollow",
     "ang": -1.57,
     "len": 1.8
    },
    {
     "t": "gate",
     "x": 50.07,
     "y": 12.09,
     "role": "gate",
     "id": "hollow_exit_gate",
     "ang": -0.5,
     "len": 1.8
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
     "guaranteed": "epic"
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
     "label": "boss-chest"
    },
    {
     "t": "pine_giant",
     "x": 9.1,
     "y": 53.75,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 44.5,
     "y": 51.56,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 105.38,
     "y": 61.39,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_giant",
     "x": 25.1,
     "y": 80.72,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_giant",
     "x": 33.81,
     "y": 43.76
    },
    {
     "t": "pine_giant",
     "x": 32.9,
     "y": 89.29,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 5.88,
     "y": 39.72,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_giant",
     "x": 14.77,
     "y": 86.96,
     "f": 1
    },
    {
     "t": "pine_giant",
     "x": 3.3,
     "y": 56.17
    },
    {
     "t": "pine_giant",
     "x": 42.31,
     "y": 32.56,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 98.17,
     "y": 60.85,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_giant",
     "x": 18.89,
     "y": 41.04,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 93.69,
     "y": 87.82,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_giant",
     "x": 107.46,
     "y": 57.82,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_giant",
     "x": 79.46,
     "y": 35.86,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_giant",
     "x": 35.87,
     "y": 73.21,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 76.65,
     "y": 38.86,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_giant",
     "x": 81.89,
     "y": 69.16,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 27.31,
     "y": 104.64,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 2.79,
     "y": 62.39
    },
    {
     "t": "pine_giant",
     "x": 3.75,
     "y": 99.9
    },
    {
     "t": "pine_giant",
     "x": 42.12,
     "y": 73.2
    },
    {
     "t": "pine_giant",
     "x": 101.91,
     "y": 60.11,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_giant",
     "x": 46.74,
     "y": 98,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_giant",
     "x": 8.52,
     "y": 58.31,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 7.1,
     "y": 109.5,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 37.71,
     "y": 67.59,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 86.38,
     "y": 66.34
    },
    {
     "t": "pine_giant",
     "x": 108.83,
     "y": 50.26,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_giant",
     "x": 47.55,
     "y": 36.91,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 78.29,
     "y": 75.22,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 2.86,
     "y": 68.82,
     "f": 1
    },
    {
     "t": "pine_giant",
     "x": 40.08,
     "y": 38.32,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_giant",
     "x": 53.2,
     "y": 41.25,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_giant",
     "x": 39.23,
     "y": 33.65,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 100.7,
     "y": 82.33,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 70.12,
     "y": 68.83,
     "f": 1
    },
    {
     "t": "pine_giant",
     "x": 18.23,
     "y": 88.04,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_giant",
     "x": 6.09,
     "y": 83.61,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_giant",
     "x": 109.22,
     "y": 62.69,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_giant",
     "x": 93.85,
     "y": 78.98
    },
    {
     "t": "pine_giant",
     "x": 79.68,
     "y": 63.31,
     "f": 1
    },
    {
     "t": "pine_giant",
     "x": 88.85,
     "y": 53.92,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 11.6,
     "y": 94.19,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 31.41,
     "y": 73.2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 54.7,
     "y": 43.56,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 28.81,
     "y": 44.63,
     "v": 2
    },
    {
     "t": "pine",
     "x": 91.01,
     "y": 82.48
    },
    {
     "t": "pine",
     "x": 13.93,
     "y": 94.66,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 97.12,
     "y": 64.84
    },
    {
     "t": "pine",
     "x": 40.86,
     "y": 44.56,
     "v": 2
    },
    {
     "t": "pine",
     "x": 6.21,
     "y": 86.91
    },
    {
     "t": "pine",
     "x": 39.21,
     "y": 101.41,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 24.79,
     "y": 49.94,
     "v": 2
    },
    {
     "t": "pine",
     "x": 81.09,
     "y": 38.7
    },
    {
     "t": "pine",
     "x": 84.19,
     "y": 74.07,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 22.88,
     "y": 44.4,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 3,
     "y": 107.16,
     "v": 3
    },
    {
     "t": "pine",
     "x": 35.05,
     "y": 66.98,
     "f": 1
    },
    {
     "t": "pine",
     "x": 110.17,
     "y": 58.41,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 92.24,
     "y": 83.52,
     "v": 3
    },
    {
     "t": "pine",
     "x": 58.82,
     "y": 75.5,
     "f": 1
    },
    {
     "t": "pine",
     "x": 80.11,
     "y": 49.26
    },
    {
     "t": "pine",
     "x": 43.76,
     "y": 100.06,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 9.81,
     "y": 50.18,
     "v": 1
    },
    {
     "t": "pine",
     "x": 99.85,
     "y": 86.79,
     "v": 2
    },
    {
     "t": "pine",
     "x": 40.9,
     "y": 68.78,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 107.7,
     "y": 46.45,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 2.65,
     "y": 65.89,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 26.27,
     "y": 76.75,
     "v": 2
    },
    {
     "t": "pine",
     "x": 8.98,
     "y": 69.79,
     "v": 2
    },
    {
     "t": "pine",
     "x": 110.15,
     "y": 60.47,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 12.51,
     "y": 46.63,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 89.62,
     "y": 66.15,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 42.18,
     "y": 58.13,
     "f": 1
    },
    {
     "t": "pine",
     "x": 40.38,
     "y": 47.43,
     "f": 1
    },
    {
     "t": "pine",
     "x": 44.84,
     "y": 82.72,
     "v": 1
    },
    {
     "t": "pine",
     "x": 7.02,
     "y": 43.26
    },
    {
     "t": "pine",
     "x": 79.83,
     "y": 54.6,
     "v": 2
    },
    {
     "t": "pine",
     "x": 39.84,
     "y": 74.02,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 53.68,
     "y": 55.79,
     "v": 1
    },
    {
     "t": "pine",
     "x": 94.61,
     "y": 55.63,
     "v": 2
    },
    {
     "t": "pine",
     "x": 108.33,
     "y": 47.91,
     "v": 3
    },
    {
     "t": "pine",
     "x": 16.55,
     "y": 53.75
    },
    {
     "t": "pine",
     "x": 8.11,
     "y": 98.86
    },
    {
     "t": "pine",
     "x": 38.84,
     "y": 72.17,
     "f": 1
    },
    {
     "t": "pine",
     "x": 11.62,
     "y": 108.12,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 92.83,
     "y": 85.24
    },
    {
     "t": "pine",
     "x": 20.31,
     "y": 71,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 23.99,
     "y": 106.79,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 86.42,
     "y": 54.78,
     "v": 2
    },
    {
     "t": "pine",
     "x": 9.54,
     "y": 109.7,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 23.83,
     "y": 96.25,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 27.68,
     "y": 73.68,
     "v": 2
    },
    {
     "t": "pine",
     "x": 13.56,
     "y": 37.25,
     "v": 3
    },
    {
     "t": "pine",
     "x": 73.3,
     "y": 45.43,
     "v": 2
    },
    {
     "t": "pine",
     "x": 95.46,
     "y": 51.14,
     "f": 1
    },
    {
     "t": "pine",
     "x": 86.89,
     "y": 46.99,
     "f": 1
    },
    {
     "t": "pine",
     "x": 84.51,
     "y": 68.29,
     "v": 1
    },
    {
     "t": "pine",
     "x": 38.95,
     "y": 46.21,
     "f": 1
    },
    {
     "t": "pine",
     "x": 24.62,
     "y": 75.72,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 32.46,
     "y": 99.43,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 30.19,
     "y": 67.19,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 8.62,
     "y": 91.22,
     "f": 1
    },
    {
     "t": "pine",
     "x": 54.66,
     "y": 86.58,
     "v": 3
    },
    {
     "t": "pine",
     "x": 80.54,
     "y": 47.72,
     "v": 1
    },
    {
     "t": "pine",
     "x": 55.4,
     "y": 55.66,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 9.75,
     "y": 71.22,
     "v": 1
    },
    {
     "t": "pine",
     "x": 11.03,
     "y": 59.87,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 58.8,
     "y": 64.31
    },
    {
     "t": "pine",
     "x": 45.58,
     "y": 61.05,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 55.02,
     "y": 45.39,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 47.38,
     "y": 77.39,
     "f": 1
    },
    {
     "t": "pine",
     "x": 21.68,
     "y": 82.97,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 55.49,
     "y": 59.12,
     "v": 3
    },
    {
     "t": "pine",
     "x": 12.79,
     "y": 57.78,
     "v": 2
    },
    {
     "t": "pine",
     "x": 91.87,
     "y": 77.01
    },
    {
     "t": "pine",
     "x": 23.49,
     "y": 72.21,
     "v": 3
    },
    {
     "t": "pine",
     "x": 28.37,
     "y": 71.4,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 72.25,
     "y": 43.94
    },
    {
     "t": "pine",
     "x": 4.81,
     "y": 97.15,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 2.91,
     "y": 108.83,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 27.19,
     "y": 48.82,
     "f": 1
    },
    {
     "t": "pine",
     "x": 25.77,
     "y": 106.45,
     "v": 1
    },
    {
     "t": "pine",
     "x": 98.03,
     "y": 79.88,
     "v": 2
    },
    {
     "t": "pine",
     "x": 1.33,
     "y": 104.02,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 11.93,
     "y": 67.91,
     "v": 2
    },
    {
     "t": "pine",
     "x": 62.71,
     "y": 55.97,
     "v": 2
    },
    {
     "t": "pine",
     "x": 50.87,
     "y": 59.15,
     "v": 3
    },
    {
     "t": "pine",
     "x": 24.05,
     "y": 105.08
    },
    {
     "t": "pine",
     "x": 34.97,
     "y": 110.74,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 100.96,
     "y": 63.02,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 24.92,
     "y": 109.26,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 107.24,
     "y": 52.23,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 17.84,
     "y": 65.38,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 1.76,
     "y": 59.33
    },
    {
     "t": "pine",
     "x": 12.79,
     "y": 60.9,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 74.75,
     "y": 40.65,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 9.54,
     "y": 79.6,
     "v": 2
    },
    {
     "t": "pine",
     "x": 92.58,
     "y": 66.84,
     "v": 1
    },
    {
     "t": "pine",
     "x": 61.77,
     "y": 82.29,
     "f": 1
    },
    {
     "t": "pine",
     "x": 70.49,
     "y": 43.91,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 106.39,
     "y": 44.05,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 29.68,
     "y": 103.64,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 78.4,
     "y": 56.1
    },
    {
     "t": "pine",
     "x": 10.63,
     "y": 55.98,
     "f": 1
    },
    {
     "t": "pine",
     "x": 37.65,
     "y": 44.73,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 59.06,
     "y": 61.92,
     "f": 1
    },
    {
     "t": "pine",
     "x": 32.9,
     "y": 66.76
    },
    {
     "t": "pine",
     "x": 50.54,
     "y": 51.45,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 49.6,
     "y": 39.72,
     "v": 3
    },
    {
     "t": "pine",
     "x": 48.41,
     "y": 73.79,
     "v": 2
    },
    {
     "t": "pine",
     "x": 96.76,
     "y": 54.8,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 9.44,
     "y": 65.91,
     "v": 2
    },
    {
     "t": "pine",
     "x": 20.15,
     "y": 81.49,
     "v": 2
    },
    {
     "t": "pine",
     "x": 49.5,
     "y": 96.06,
     "v": 2
    },
    {
     "t": "pine",
     "x": 21.27,
     "y": 43.48,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 10.83,
     "y": 92.51,
     "v": 1
    },
    {
     "t": "pine",
     "x": 84.8,
     "y": 54.95,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 4.52,
     "y": 110.62,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 48.88,
     "y": 71.3,
     "v": 3
    },
    {
     "t": "pine",
     "x": 33.23,
     "y": 108.71,
     "f": 1
    },
    {
     "t": "pine",
     "x": 49.02,
     "y": 51.45,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 1.33,
     "y": 101.61,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 95.57,
     "y": 65.09,
     "v": 3
    },
    {
     "t": "pine",
     "x": 16.9,
     "y": 39.68,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 90.33,
     "y": 59.84,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 59.25,
     "y": 60.19,
     "v": 3
    },
    {
     "t": "pine",
     "x": 13.87,
     "y": 84.36,
     "v": 2
    },
    {
     "t": "pine",
     "x": 33.18,
     "y": 72.17,
     "v": 3
    },
    {
     "t": "pine",
     "x": 83.08,
     "y": 47.82
    },
    {
     "t": "pine",
     "x": 4.51,
     "y": 109.03,
     "v": 2
    },
    {
     "t": "pine",
     "x": 89,
     "y": 46.87,
     "v": 2
    },
    {
     "t": "pine",
     "x": 13.98,
     "y": 45.97,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 33.94,
     "y": 50.21,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 34.78,
     "y": 52.4,
     "v": 2
    },
    {
     "t": "pine",
     "x": 38.35,
     "y": 35.92,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 31.73,
     "y": 110.99,
     "v": 3
    },
    {
     "t": "pine",
     "x": 49.71,
     "y": 94.37,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 80.72,
     "y": 51.38,
     "f": 1
    },
    {
     "t": "pine",
     "x": 95.49,
     "y": 63.29,
     "v": 1
    },
    {
     "t": "pine",
     "x": 92.27,
     "y": 59.19,
     "f": 1
    },
    {
     "t": "pine",
     "x": 93.67,
     "y": 49.67,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 8.53,
     "y": 81.68
    },
    {
     "t": "pine",
     "x": 61.63,
     "y": 46.01,
     "v": 1
    },
    {
     "t": "pine",
     "x": 19.48,
     "y": 66.18,
     "v": 1
    },
    {
     "t": "pine",
     "x": 16.72,
     "y": 106.63,
     "v": 3
    },
    {
     "t": "pine",
     "x": 19.64,
     "y": 104.74,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 47.67,
     "y": 40.19,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 76.24,
     "y": 57.28,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 58.21,
     "y": 82.26,
     "v": 1
    },
    {
     "t": "pine",
     "x": 98.59,
     "y": 63.3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 15.03,
     "y": 108.34,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 91.99,
     "y": 60.72,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 56.15,
     "y": 82.52,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 12.14,
     "y": 44.41,
     "v": 2
    },
    {
     "t": "pine",
     "x": 5.44,
     "y": 69.33,
     "v": 3
    },
    {
     "t": "pine",
     "x": 63.35,
     "y": 61.49
    },
    {
     "t": "pine",
     "x": 87.15,
     "y": 56.12,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 25.62,
     "y": 89.92,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 17.19,
     "y": 58.67,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 101.95,
     "y": 50.61,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 47.54,
     "y": 84.54,
     "v": 3
    },
    {
     "t": "pine",
     "x": 14.9,
     "y": 52.18,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 37.06,
     "y": 84.35
    },
    {
     "t": "pine_young",
     "x": 20.1,
     "y": 72.76,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 21.22,
     "y": 72.9
    },
    {
     "t": "pine_young",
     "x": 104.59,
     "y": 57.85,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 105.25,
     "y": 57.1,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 23.41,
     "y": 70.95,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 70.65,
     "y": 61.87,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 51.63,
     "y": 55.72,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 51.49,
     "y": 54.48,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 10.36,
     "y": 93.92,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 95.34,
     "y": 57.47,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 103.04,
     "y": 49.97
    },
    {
     "t": "pine_young",
     "x": 67.09,
     "y": 62.8,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 67.75,
     "y": 63.83,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 68.07,
     "y": 62.17,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 36.81,
     "y": 86.09,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 9.83,
     "y": 67.34,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 95.98,
     "y": 61.2,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 9.45,
     "y": 60.66,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 92.94,
     "y": 63.67,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 102.73,
     "y": 83.1,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 38.02,
     "y": 74.78,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 11.25,
     "y": 49.25,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 12.35,
     "y": 49.77,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 60.63,
     "y": 64.01,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 61.81,
     "y": 63.48,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 60.15,
     "y": 63.06,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 107.88,
     "y": 45.24,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 90.49,
     "y": 64.9
    },
    {
     "t": "pine_young",
     "x": 10.16,
     "y": 43.86,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 10.52,
     "y": 44.83,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 11.15,
     "y": 43.61
    },
    {
     "t": "pine_young",
     "x": 98.63,
     "y": 53.31,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 99.75,
     "y": 52.72
    },
    {
     "t": "pine_young",
     "x": 4.21,
     "y": 107.7
    },
    {
     "t": "pine_young",
     "x": 34.49,
     "y": 71.09,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 110.21,
     "y": 52.57,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 96.74,
     "y": 87.61,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 33.78,
     "y": 73.47,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 79.89,
     "y": 76.66
    },
    {
     "t": "pine_young",
     "x": 62.54,
     "y": 62.47,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 79.72,
     "y": 33.13,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 45.57,
     "y": 49.77,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 19.94,
     "y": 100.11,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 99.75,
     "y": 51.67,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 101.46,
     "y": 52.47,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 14.8,
     "y": 82.28,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 46.78,
     "y": 49.7,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 99.97,
     "y": 50.14,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 52.72,
     "y": 53.49,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 51.73,
     "y": 53.4,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 100.09,
     "y": 58.37,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 57.75,
     "y": 74.78,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 42.81,
     "y": 59.42
    },
    {
     "t": "pine_young",
     "x": 23.77,
     "y": 89.77,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 23.71,
     "y": 90.81,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 12.26,
     "y": 85.81,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 62.34,
     "y": 59.56,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 61.11,
     "y": 59.72,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 23.92,
     "y": 73.54,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 22.73,
     "y": 73.93,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 80.67,
     "y": 79.62,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 22.93,
     "y": 49.18
    },
    {
     "t": "pine_young",
     "x": 92.34,
     "y": 51.1
    },
    {
     "t": "pine_young",
     "x": 110.28,
     "y": 53.58,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 21.45,
     "y": 71.74,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 5.84,
     "y": 56.5
    },
    {
     "t": "pine_young",
     "x": 81.61,
     "y": 33.14,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 81.1,
     "y": 34.33
    },
    {
     "t": "pine_young",
     "x": 82.55,
     "y": 32.27,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 67.55,
     "y": 80.45,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 13.96,
     "y": 38.72,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 14.97,
     "y": 38.93,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 13.04,
     "y": 38.46,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 26.16,
     "y": 108.64,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 5.16,
     "y": 63.55,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 6.47,
     "y": 59.21,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 29.14,
     "y": 73.68
    },
    {
     "t": "pine_young",
     "x": 111.45,
     "y": 57.1,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 80.59,
     "y": 65.35
    },
    {
     "t": "pine_young",
     "x": 36.17,
     "y": 63.41,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 93.72,
     "y": 65.14,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 103.57,
     "y": 51.07,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 104.64,
     "y": 50.56,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 27.79,
     "y": 102.49
    },
    {
     "t": "pine_young",
     "x": 11.3,
     "y": 61.75
    },
    {
     "t": "pine_young",
     "x": 105.33,
     "y": 53.59,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 1.1,
     "y": 108.78,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 84.72,
     "y": 72.54,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 29.15,
     "y": 70.21,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 27.85,
     "y": 70.12,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 48.46,
     "y": 39.12,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 85.91,
     "y": 56.64,
     "v": 2
    },
    {
     "t": "rock",
     "x": 41.13,
     "y": 54.05,
     "f": 1
    },
    {
     "t": "rock",
     "x": 12.93,
     "y": 75.08,
     "v": 2
    },
    {
     "t": "rock",
     "x": 8.82,
     "y": 89.19,
     "v": 2
    },
    {
     "t": "rock",
     "x": 45.41,
     "y": 62.39,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 103.39,
     "y": 63.85,
     "v": 1
    },
    {
     "t": "rock",
     "x": 37.14,
     "y": 100.84,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 74.1,
     "y": 46.85,
     "f": 1
    },
    {
     "t": "rock",
     "x": 63.39,
     "y": 59.98,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 34.36,
     "y": 86.9,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 34.17,
     "y": 54.06
    },
    {
     "t": "rock",
     "x": 26.3,
     "y": 73.58,
     "f": 1
    },
    {
     "t": "rock",
     "x": 60.99,
     "y": 70.11,
     "v": 2
    },
    {
     "t": "rock",
     "x": 5.38,
     "y": 65.13
    },
    {
     "t": "rock",
     "x": 72.9,
     "y": 60.81,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 64.01,
     "y": 56.49,
     "v": 2
    },
    {
     "t": "rock",
     "x": 64.26,
     "y": 55.19,
     "f": 1
    },
    {
     "t": "rock",
     "x": 31.54,
     "y": 92.01,
     "v": 2
    },
    {
     "t": "rock",
     "x": 44.48,
     "y": 71.86,
     "v": 1
    },
    {
     "t": "rock",
     "x": 63.2,
     "y": 82.49,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 61.1,
     "y": 61.72,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 3,
     "y": 103.61,
     "f": 1
    },
    {
     "t": "rock",
     "x": 44.37,
     "y": 70.65,
     "v": 1
    },
    {
     "t": "rock",
     "x": 24.29,
     "y": 65.08
    },
    {
     "t": "rock",
     "x": 76.22,
     "y": 64.58,
     "v": 2
    },
    {
     "t": "rock",
     "x": 68.41,
     "y": 76.65,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 80.37,
     "y": 66.79,
     "f": 1
    },
    {
     "t": "rock",
     "x": 48.46,
     "y": 59.19,
     "f": 1
    },
    {
     "t": "rock",
     "x": 3.92,
     "y": 64.32,
     "v": 2
    },
    {
     "t": "rock",
     "x": 40.75,
     "y": 56.7
    },
    {
     "t": "rock",
     "x": 14.83,
     "y": 79.82,
     "v": 2
    },
    {
     "t": "rock",
     "x": 106.76,
     "y": 53.67,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 18.41,
     "y": 80.92,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 77.88,
     "y": 69.9,
     "v": 1
    },
    {
     "t": "rock",
     "x": 11.91,
     "y": 51,
     "v": 2
    },
    {
     "t": "rock",
     "x": 52.21,
     "y": 64.83,
     "v": 1
    },
    {
     "t": "rock",
     "x": 5.11,
     "y": 58.13,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 65.36,
     "y": 63.02,
     "f": 1
    },
    {
     "t": "rock",
     "x": 18.96,
     "y": 103.26,
     "v": 1
    },
    {
     "t": "log",
     "x": 98.89,
     "y": 88.9,
     "f": 1
    },
    {
     "t": "log",
     "x": 47.7,
     "y": 93.23,
     "f": 1
    },
    {
     "t": "stump",
     "x": 7.98,
     "y": 85.89
    },
    {
     "t": "stump",
     "x": 12.57,
     "y": 63.64
    },
    {
     "t": "stump",
     "x": 93.04,
     "y": 54.52
    },
    {
     "t": "stump",
     "x": 56.87,
     "y": 69.57
    },
    {
     "t": "stump",
     "x": 77.96,
     "y": 65.5
    },
    {
     "t": "stump",
     "x": 38.3,
     "y": 99.42
    },
    {
     "t": "stump",
     "x": 74.63,
     "y": 77.32
    },
    {
     "t": "stump",
     "x": 62.74,
     "y": 68.09
    },
    {
     "t": "stump",
     "x": 56.64,
     "y": 46.44
    },
    {
     "t": "stump",
     "x": 19.88,
     "y": 75.72
    },
    {
     "t": "stump",
     "x": 93.65,
     "y": 57.81
    },
    {
     "t": "stump",
     "x": 62.19,
     "y": 57.87
    },
    {
     "t": "stump",
     "x": 37.39,
     "y": 51.11
    },
    {
     "t": "stump",
     "x": 15.02,
     "y": 49.76
    },
    {
     "t": "stump",
     "x": 81.89,
     "y": 55.61
    },
    {
     "t": "stump",
     "x": 11.81,
     "y": 34.46
    },
    {
     "t": "stump",
     "x": 38.75,
     "y": 65.13
    },
    {
     "t": "stump",
     "x": 102.28,
     "y": 85.03
    },
    {
     "t": "moss",
     "x": 35.98,
     "y": 46.12,
     "v": 1,
     "f": 1
    },
    {
     "t": "moss",
     "x": 72.8,
     "y": 55.29
    },
    {
     "t": "moss",
     "x": 57.93,
     "y": 54.22,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 47.92,
     "y": 46.81,
     "v": 2
    },
    {
     "t": "moss",
     "x": 74.19,
     "y": 65.19,
     "f": 1
    },
    {
     "t": "moss",
     "x": 34.26,
     "y": 63.82
    },
    {
     "t": "moss",
     "x": 57.98,
     "y": 77.08,
     "f": 1
    },
    {
     "t": "moss",
     "x": 42.54,
     "y": 41.44,
     "v": 1
    },
    {
     "t": "moss",
     "x": 9.62,
     "y": 38.9,
     "v": 1
    },
    {
     "t": "moss",
     "x": 26.33,
     "y": 60.45,
     "v": 1
    },
    {
     "t": "moss",
     "x": 94.53,
     "y": 44.79,
     "v": 1,
     "f": 1
    },
    {
     "t": "moss",
     "x": 17.59,
     "y": 50.64,
     "f": 1
    },
    {
     "t": "moss",
     "x": 52.11,
     "y": 83.18
    },
    {
     "t": "moss",
     "x": 66.48,
     "y": 43.86,
     "v": 2
    },
    {
     "t": "moss",
     "x": 56.53,
     "y": 63.11,
     "v": 2
    },
    {
     "t": "moss",
     "x": 28.99,
     "y": 51.75
    },
    {
     "t": "moss",
     "x": 21.99,
     "y": 53.13
    },
    {
     "t": "moss",
     "x": 52.49,
     "y": 51.81,
     "v": 1,
     "f": 1
    },
    {
     "t": "moss",
     "x": 72.49,
     "y": 50.6,
     "v": 1,
     "f": 1
    },
    {
     "t": "moss",
     "x": 59.66,
     "y": 73.24,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 73.85,
     "y": 68.85,
     "v": 1
    },
    {
     "t": "moss",
     "x": 30.83,
     "y": 63.06,
     "f": 1
    },
    {
     "t": "mushroom_red",
     "x": 9.74,
     "y": 102.17
    },
    {
     "t": "mushroom_red",
     "x": 8.92,
     "y": 102.3
    },
    {
     "t": "mushroom_red",
     "x": 98.67,
     "y": 83.3
    },
    {
     "t": "mushroom_red",
     "x": 98.1,
     "y": 83.17
    },
    {
     "t": "mushroom_red",
     "x": 98.91,
     "y": 83.87
    },
    {
     "t": "mushroom_red",
     "x": 98.19,
     "y": 83.74
    },
    {
     "t": "mushroom_red",
     "x": 17.16,
     "y": 75.53
    },
    {
     "t": "mushroom_red",
     "x": 17.22,
     "y": 76.12
    },
    {
     "t": "mushroom_red",
     "x": 16.51,
     "y": 75.49
    },
    {
     "t": "mushroom_red",
     "x": 30.22,
     "y": 104.54
    },
    {
     "t": "mushroom_red",
     "x": 26.23,
     "y": 107.44
    },
    {
     "t": "mushroom_red",
     "x": 26.69,
     "y": 107.14
    },
    {
     "t": "mushroom_red",
     "x": 26.82,
     "y": 108.08
    },
    {
     "t": "mushroom_red",
     "x": 91.23,
     "y": 83.95
    },
    {
     "t": "mushroom_red",
     "x": 18.2,
     "y": 54.26
    },
    {
     "t": "mushroom_red",
     "x": 17.98,
     "y": 54.72
    },
    {
     "t": "mushroom_red",
     "x": 17.88,
     "y": 53.79
    },
    {
     "t": "mushroom_red",
     "x": 74.34,
     "y": 45.51
    },
    {
     "t": "mushroom_red",
     "x": 74.83,
     "y": 45.11
    },
    {
     "t": "mushroom_red",
     "x": 71.12,
     "y": 48.31
    },
    {
     "t": "mushroom_red",
     "x": 70.9,
     "y": 47.66
    },
    {
     "t": "mushroom_red",
     "x": 70.64,
     "y": 48.92
    },
    {
     "t": "mushroom_red",
     "x": 91.7,
     "y": 54.16
    },
    {
     "t": "mushroom_red",
     "x": 37.19,
     "y": 71.44
    },
    {
     "t": "mushroom_red",
     "x": 33.37,
     "y": 53.45
    },
    {
     "t": "mushroom_red",
     "x": 33.35,
     "y": 54.88
    },
    {
     "t": "mushroom_red",
     "x": 53.47,
     "y": 43.51
    },
    {
     "t": "mushroom_red",
     "x": 92.3,
     "y": 86.28
    },
    {
     "t": "mushroom_red",
     "x": 79.17,
     "y": 45.23
    },
    {
     "t": "mushroom_red",
     "x": 79.26,
     "y": 45.97
    },
    {
     "t": "mushroom_red",
     "x": 79.59,
     "y": 45.55
    },
    {
     "t": "mushroom_red",
     "x": 34.59,
     "y": 68.8
    },
    {
     "t": "mushroom_red",
     "x": 18.42,
     "y": 59.56
    },
    {
     "t": "mushroom_red",
     "x": 18.36,
     "y": 60.13
    },
    {
     "t": "mushroom_red",
     "x": 18.99,
     "y": 58.93
    },
    {
     "t": "mushroom_red",
     "x": 19,
     "y": 64.56
    },
    {
     "t": "mushroom_red",
     "x": 92.41,
     "y": 63.09
    },
    {
     "t": "mushroom_red",
     "x": 43.25,
     "y": 70.57
    },
    {
     "t": "mushroom_red",
     "x": 42.42,
     "y": 70.66
    },
    {
     "t": "mushroom_red",
     "x": 54.9,
     "y": 84.76
    },
    {
     "t": "mushroom_red",
     "x": 55.12,
     "y": 85.27
    },
    {
     "t": "mushroom_red",
     "x": 46.17,
     "y": 72.26
    },
    {
     "t": "mushroom_red",
     "x": 46.51,
     "y": 71.51
    },
    {
     "t": "mushroom_red",
     "x": 46.05,
     "y": 71.72
    },
    {
     "t": "mushroom_red",
     "x": 72.25,
     "y": 49.31
    },
    {
     "t": "mushroom_red",
     "x": 78.22,
     "y": 55.03
    },
    {
     "t": "mushroom_red",
     "x": 18.77,
     "y": 63.68
    },
    {
     "t": "mushroom_red",
     "x": 18.49,
     "y": 64.18
    },
    {
     "t": "mushroom_red",
     "x": 18.88,
     "y": 62.83
    },
    {
     "t": "grass",
     "x": 19.67,
     "y": 43
    },
    {
     "t": "grass",
     "x": 48.23,
     "y": 96.88,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 47.56,
     "y": 96.06,
     "v": 1
    },
    {
     "t": "grass",
     "x": 75.24,
     "y": 44.47,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 76.11,
     "y": 45.14
    },
    {
     "t": "grass",
     "x": 0.9,
     "y": 63.36,
     "f": 1
    },
    {
     "t": "grass",
     "x": 48.7,
     "y": 85.4,
     "f": 1
    },
    {
     "t": "grass",
     "x": 48.31,
     "y": 86.1,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 63.4,
     "y": 53.2,
     "f": 1
    },
    {
     "t": "grass",
     "x": 64.24,
     "y": 53.29,
     "v": 1
    },
    {
     "t": "grass",
     "x": 62.87,
     "y": 53.09,
     "f": 1
    },
    {
     "t": "grass",
     "x": 81.06,
     "y": 32.46,
     "f": 1
    },
    {
     "t": "grass",
     "x": 10.66,
     "y": 66.19,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 44.94,
     "y": 48.45
    },
    {
     "t": "grass",
     "x": 44.47,
     "y": 48.66,
     "f": 1
    },
    {
     "t": "grass",
     "x": 45.87,
     "y": 48.58,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 44.81,
     "y": 47.72,
     "v": 1
    },
    {
     "t": "grass",
     "x": 35.95,
     "y": 104.03
    },
    {
     "t": "grass",
     "x": 35.74,
     "y": 103.51,
     "v": 1
    },
    {
     "t": "grass",
     "x": 26.3,
     "y": 91.59,
     "f": 1
    },
    {
     "t": "grass",
     "x": 26.29,
     "y": 92.2,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 26.02,
     "y": 90.96,
     "f": 1
    },
    {
     "t": "grass",
     "x": 81.17,
     "y": 40.5,
     "v": 1
    },
    {
     "t": "grass",
     "x": 81.85,
     "y": 40.09,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 81.83,
     "y": 40.98,
     "f": 1
    },
    {
     "t": "grass",
     "x": 80.64,
     "y": 39.67,
     "f": 1
    },
    {
     "t": "grass",
     "x": 41.02,
     "y": 50.95
    },
    {
     "t": "grass",
     "x": 42.07,
     "y": 51.39
    },
    {
     "t": "grass",
     "x": 40.39,
     "y": 50.69,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 92.16,
     "y": 45.27,
     "v": 1
    },
    {
     "t": "grass",
     "x": 91.55,
     "y": 45.73,
     "f": 1
    },
    {
     "t": "grass",
     "x": 91.37,
     "y": 45.16,
     "v": 1
    },
    {
     "t": "grass",
     "x": 103.74,
     "y": 48.48,
     "v": 1
    },
    {
     "t": "grass",
     "x": 104.79,
     "y": 48.71,
     "f": 1
    },
    {
     "t": "grass",
     "x": 104.09,
     "y": 47.63
    },
    {
     "t": "grass",
     "x": 39.34,
     "y": 86.1,
     "v": 1
    },
    {
     "t": "grass",
     "x": 39.31,
     "y": 85.18
    },
    {
     "t": "grass",
     "x": 43.94,
     "y": 87.1,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 44.45,
     "y": 87.28,
     "f": 1
    },
    {
     "t": "grass",
     "x": 43.47,
     "y": 49.94
    },
    {
     "t": "grass",
     "x": 91.45,
     "y": 80.95
    },
    {
     "t": "grass",
     "x": 90.6,
     "y": 80.14,
     "v": 1
    },
    {
     "t": "grass",
     "x": 9.13,
     "y": 27.46,
     "v": 1
    },
    {
     "t": "grass",
     "x": 8.21,
     "y": 28.15,
     "f": 1
    },
    {
     "t": "grass",
     "x": 9.92,
     "y": 27.64
    },
    {
     "t": "grass",
     "x": 13.9,
     "y": 99.08,
     "f": 1
    },
    {
     "t": "grass",
     "x": 101.96,
     "y": 44.49,
     "f": 1
    },
    {
     "t": "grass",
     "x": 102.15,
     "y": 44.97,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 102.78,
     "y": 44.53,
     "f": 1
    },
    {
     "t": "grass",
     "x": 32.9,
     "y": 51.35,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 32.93,
     "y": 52.2,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 70.93,
     "y": 53.83,
     "f": 1
    },
    {
     "t": "grass",
     "x": 70.36,
     "y": 53.52,
     "v": 1
    },
    {
     "t": "grass",
     "x": 41.88,
     "y": 98.46
    },
    {
     "t": "grass",
     "x": 41.33,
     "y": 98.18,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 34.74,
     "y": 92.72,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 34.07,
     "y": 93.55,
     "v": 1
    },
    {
     "t": "grass",
     "x": 43.45,
     "y": 37.42
    },
    {
     "t": "grass",
     "x": 49.35,
     "y": 45.51,
     "v": 1
    },
    {
     "t": "grass",
     "x": 12.49,
     "y": 56.36,
     "v": 1
    },
    {
     "t": "grass",
     "x": 11.86,
     "y": 55.43,
     "v": 1
    },
    {
     "t": "grass",
     "x": 12.97,
     "y": 55.76
    },
    {
     "t": "grass",
     "x": 53.52,
     "y": 52.72,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 53.71,
     "y": 53.65
    },
    {
     "t": "grass",
     "x": 61.01,
     "y": 68.05,
     "f": 1
    },
    {
     "t": "grass",
     "x": 60.96,
     "y": 69.02,
     "f": 1
    },
    {
     "t": "grass",
     "x": 100.24,
     "y": 45.45,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 100.05,
     "y": 44.73,
     "v": 1
    },
    {
     "t": "grass",
     "x": 68.38,
     "y": 45.62
    },
    {
     "t": "grass",
     "x": 68.5,
     "y": 46.41,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 6.26,
     "y": 6.11
    },
    {
     "t": "tree_dead",
     "x": 1.3,
     "y": 11.31,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 45.08,
     "y": 17.11,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 2.21,
     "y": 14.28,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 10.22,
     "y": 4.91,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 15.11,
     "y": 6.47,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 54.99,
     "y": 11.45,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 24.95,
     "y": 12.3
    },
    {
     "t": "tree_dead",
     "x": 2.3,
     "y": 8.09,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 17.97,
     "y": 17.54,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 34.09,
     "y": 17.66
    },
    {
     "t": "tree_dead",
     "x": 6.84,
     "y": 13.71,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 23,
     "y": 1.93,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 54.74,
     "y": 14.71,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 12.48,
     "y": 16.88,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 39.82,
     "y": 5.87,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 55.87,
     "y": 12.84,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 3.95,
     "y": 15.83,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 3.02,
     "y": 6.42,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 44.53,
     "y": 2.74,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 48.16,
     "y": 16.96,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 54.33,
     "y": 8.03,
     "v": 3,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 29.35,
     "y": 14.47
    },
    {
     "t": "tree_dead",
     "x": 48.72,
     "y": 4.88,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 30.38,
     "y": 1.57,
     "v": 3,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 37.29,
     "y": 7.39,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 47,
     "y": 4.67,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 32.49,
     "y": 17.96,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 12.93,
     "y": 5.27,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 16.97,
     "y": 6.48,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 26.26,
     "y": 16.79,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 26.64,
     "y": 12.24,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 49.27,
     "y": 7.05
    },
    {
     "t": "tree_dead",
     "x": 38.55,
     "y": 17.89,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 15.54,
     "y": 17.26,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 52.34,
     "y": 13.7,
     "v": 3,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 10.74,
     "y": 13.58,
     "v": 1,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 26.09,
     "y": 1.1,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 52.38,
     "y": 6.61,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 20.08,
     "y": 5.97,
     "v": 1,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 18.65,
     "y": 16.08,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 55.62,
     "y": 9.34,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 34.53,
     "y": 1.03,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 50.91,
     "y": 14.62,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 25.52,
     "y": 9.87,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 26.92,
     "y": 10.55,
     "v": 3,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 41.95,
     "y": 1.47,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 46.14,
     "y": 3.41,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 39.59,
     "y": 13.62,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 10.56,
     "y": 15.64,
     "v": 3,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 38.96,
     "y": 16.43,
     "v": 1,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 1.31,
     "y": 9.71,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 22.65,
     "y": 17.92,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 27.93,
     "y": 13.93,
     "v": 3,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 4.85,
     "y": 6.72,
     "v": 1,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 48.29,
     "y": 15.12,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 24.51,
     "y": 17.78,
     "v": 3,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 8.63,
     "y": 13.98,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 47.47,
     "y": 3.29
    },
    {
     "t": "rock_dark",
     "x": 29.43,
     "y": 16.66
    },
    {
     "t": "rock_dark",
     "x": 4.01,
     "y": 14.09
    },
    {
     "t": "rock_dark",
     "x": 46.21,
     "y": 5.92,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 38.47,
     "y": 5.48
    },
    {
     "t": "rock_dark",
     "x": 7.26,
     "y": 5.11,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 52.77,
     "y": 7.82
    },
    {
     "t": "rock_dark",
     "x": 18.93,
     "y": 14.45,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 13.29,
     "y": 7.65,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 24.69,
     "y": 2.53,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 8.15,
     "y": 15.86
    },
    {
     "t": "rock_dark",
     "x": 36.68,
     "y": 6.18
    },
    {
     "t": "rock_dark",
     "x": 12.53,
     "y": 6.5,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 46.96,
     "y": 16.16
    },
    {
     "t": "rock_dark",
     "x": 6.52,
     "y": 15.73,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 29.1,
     "y": 2.02,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 31.62,
     "y": 6.74,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 5.36,
     "y": 13.25,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 18.21,
     "y": 8.25,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 42.53,
     "y": 15.55
    },
    {
     "t": "rock_dark",
     "x": 51.84,
     "y": 8.79,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 14.12,
     "y": 17.29,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 50.56,
     "y": 9.63,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 32.52,
     "y": 16.36,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 53.73,
     "y": 13.28,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 11.61,
     "y": 5.55,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 21.25,
     "y": 4.22,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 8.1,
     "y": 5.71,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 23.5,
     "y": 8.93,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 2.12,
     "y": 12.72,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 35.25,
     "y": 6.38,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 40.62,
     "y": 14.92
    },
    {
     "t": "rock_dark",
     "x": 12.55,
     "y": 14.1,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 33.87,
     "y": 6.73,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 20.21,
     "y": 16.32,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 21.11,
     "y": 16.77,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 38.27,
     "y": 14.37,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 33.84,
     "y": 16.35,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 50.86,
     "y": 6.73,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 53.34,
     "y": 14.84
    },
    {
     "t": "rock_dark",
     "x": 8.43,
     "y": 11.35,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 22.87,
     "y": 11.62,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 18.46,
     "y": 6.44,
     "v": 1,
     "f": 1
    },
    {
     "t": "mushroom",
     "x": 44.38,
     "y": 14.28
    },
    {
     "t": "mushroom",
     "x": 22.75,
     "y": 13.13
    },
    {
     "t": "mushroom",
     "x": 23.39,
     "y": 13.53
    },
    {
     "t": "mushroom",
     "x": 22.11,
     "y": 13.62
    },
    {
     "t": "mushroom",
     "x": 22.62,
     "y": 12.47
    },
    {
     "t": "mushroom",
     "x": 47.84,
     "y": 10.7
    },
    {
     "t": "mushroom",
     "x": 47.16,
     "y": 11.17
    },
    {
     "t": "mushroom",
     "x": 48.17,
     "y": 11.54
    },
    {
     "t": "mushroom",
     "x": 29.89,
     "y": 4.64
    },
    {
     "t": "mushroom",
     "x": 30.57,
     "y": 4.05
    },
    {
     "t": "mushroom",
     "x": 38.15,
     "y": 2.04
    },
    {
     "t": "mushroom",
     "x": 37.91,
     "y": 1.26
    },
    {
     "t": "mushroom",
     "x": 7.25,
     "y": 7.45
    },
    {
     "t": "mushroom",
     "x": 7.86,
     "y": 7.11
    },
    {
     "t": "mushroom",
     "x": 30.39,
     "y": 2.84
    },
    {
     "t": "mushroom",
     "x": 31.25,
     "y": 2.93
    },
    {
     "t": "mushroom",
     "x": 30.26,
     "y": 3.47
    },
    {
     "t": "mushroom",
     "x": 44.33,
     "y": 15.17
    },
    {
     "t": "mushroom",
     "x": 44.38,
     "y": 16
    },
    {
     "t": "mushroom",
     "x": 43.54,
     "y": 15.26
    },
    {
     "t": "mushroom",
     "x": 45.37,
     "y": 12.78
    },
    {
     "t": "mushroom",
     "x": 45.61,
     "y": 13.42
    },
    {
     "t": "mushroom",
     "x": 25.69,
     "y": 6.89
    },
    {
     "t": "mushroom",
     "x": 25.19,
     "y": 6.28
    },
    {
     "t": "mushroom",
     "x": 43.4,
     "y": 13.05
    },
    {
     "t": "mushroom",
     "x": 35.16,
     "y": 13.65
    },
    {
     "t": "mushroom",
     "x": 26.3,
     "y": 13.47
    },
    {
     "t": "mushroom",
     "x": 25.86,
     "y": 13.06
    },
    {
     "t": "mushroom",
     "x": 26.63,
     "y": 5.77
    },
    {
     "t": "mushroom",
     "x": 27.17,
     "y": 5.2
    },
    {
     "t": "mushroom",
     "x": 28.36,
     "y": 11.16
    },
    {
     "t": "mushroom",
     "x": 28.68,
     "y": 11.79
    },
    {
     "t": "mushroom",
     "x": 30.19,
     "y": 7.34
    },
    {
     "t": "moss",
     "x": 30.49,
     "y": 13.13,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 44.98,
     "y": 6.63,
     "f": 1
    },
    {
     "t": "moss",
     "x": 43.77,
     "y": 8.37
    },
    {
     "t": "moss",
     "x": 34.59,
     "y": 4.94
    },
    {
     "t": "moss",
     "x": 5.49,
     "y": 9.81,
     "v": 1
    },
    {
     "t": "moss",
     "x": 36.67,
     "y": 8.87,
     "v": 1
    },
    {
     "t": "moss",
     "x": 41.44,
     "y": 5.68
    },
    {
     "t": "moss",
     "x": 10.33,
     "y": 8.31,
     "f": 1
    },
    {
     "t": "moss",
     "x": 21.81,
     "y": 7.89,
     "v": 2
    },
    {
     "t": "moss",
     "x": 42.28,
     "y": 7.2,
     "v": 2
    },
    {
     "t": "moss",
     "x": 12.96,
     "y": 10.21,
     "v": 1
    },
    {
     "t": "moss",
     "x": 28.52,
     "y": 7.8,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 16.83,
     "y": 13.93,
     "v": 2
    },
    {
     "t": "moss",
     "x": 43.51,
     "y": 11,
     "f": 1
    },
    {
     "t": "moss",
     "x": 49.13,
     "y": 13.72,
     "f": 1
    },
    {
     "t": "moss",
     "x": 4.56,
     "y": 12.11,
     "f": 1
    },
    {
     "t": "moss",
     "x": 8.12,
     "y": 9.09,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 29.28,
     "y": 6.05,
     "f": 1
    },
    {
     "t": "stump",
     "x": 19.06,
     "y": 13.2
    },
    {
     "t": "stump",
     "x": 30.62,
     "y": 16.19
    },
    {
     "t": "stump",
     "x": 53.89,
     "y": 6.17
    },
    {
     "t": "stump",
     "x": 36.37,
     "y": 4.63
    },
    {
     "t": "stump",
     "x": 2.87,
     "y": 10.1
    },
    {
     "t": "stump",
     "x": 25.92,
     "y": 14.6
    },
    {
     "t": "stump",
     "x": 10.96,
     "y": 11.34
    },
    {
     "t": "bush",
     "x": 31.17,
     "y": 17.46,
     "v": 1
    },
    {
     "t": "bush",
     "x": 32.76,
     "y": 1.42,
     "v": 1
    },
    {
     "t": "bush",
     "x": 27.67,
     "y": 15.88,
     "v": 2
    },
    {
     "t": "bush",
     "x": 16.77,
     "y": 17.97,
     "v": 1
    },
    {
     "t": "bush",
     "x": 20.28,
     "y": 15.05,
     "v": 1
    },
    {
     "t": "bush",
     "x": 20.18,
     "y": 17.34,
     "v": 1
    },
    {
     "t": "bush",
     "x": 17.22,
     "y": 8.01,
     "v": 1
    },
    {
     "t": "bush",
     "x": 8.98,
     "y": 6.66,
     "v": 1
    },
    {
     "t": "bush",
     "x": 45.76,
     "y": 15.45
    },
    {
     "t": "bush",
     "x": 9.29,
     "y": 15.1
    },
    {
     "t": "bush",
     "x": 54.45,
     "y": 9.8,
     "v": 1
    },
    {
     "t": "grass",
     "x": 33.88,
     "y": 3.07
    },
    {
     "t": "grass",
     "x": 43.43,
     "y": 1.32,
     "v": 1
    },
    {
     "t": "grass",
     "x": 43.41,
     "y": 2.14
    },
    {
     "t": "grass",
     "x": 34.84,
     "y": 14.98,
     "f": 1
    },
    {
     "t": "grass",
     "x": 42.21,
     "y": 3.98
    },
    {
     "t": "grass",
     "x": 43.05,
     "y": 3.38,
     "f": 1
    },
    {
     "t": "grass",
     "x": 32.28,
     "y": 12.11
    },
    {
     "t": "grass",
     "x": 32.47,
     "y": 10.96,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 52.21,
     "y": 12.01,
     "v": 1
    },
    {
     "t": "grass",
     "x": 21.37,
     "y": 12.46
    },
    {
     "t": "grass",
     "x": 17.91,
     "y": 11.03,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 17.67,
     "y": 12.1,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 10.21,
     "y": 6.48
    },
    {
     "t": "tree_dead",
     "x": 68.06,
     "y": 7.59,
     "v": 3,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 97.91,
     "y": 15.73,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 104.64,
     "y": 6.2
    },
    {
     "t": "tree_dead",
     "x": 102.51,
     "y": 4.36,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 89.88,
     "y": 12.24
    },
    {
     "t": "tree_dead",
     "x": 103.33,
     "y": 7.5,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 103.34,
     "y": 11.91,
     "v": 3,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 65.33,
     "y": 13.1,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 60.92,
     "y": 8.98
    },
    {
     "t": "tree_dead",
     "x": 103.6,
     "y": 13.46,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 88.06,
     "y": 6.37,
     "v": 3,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 96.05,
     "y": 15.45,
     "v": 1,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 99.84,
     "y": 2.53
    },
    {
     "t": "tree_dead",
     "x": 97.84,
     "y": 2.03,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 95.53,
     "y": 4.73,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 83.99,
     "y": 5.61,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 100.91,
     "y": 15.27,
     "v": 1,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 99.28,
     "y": 14.6,
     "v": 3,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 68.16,
     "y": 14.6,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 74.8,
     "y": 5.69,
     "v": 3,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 63.47,
     "y": 12.57,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 85.33,
     "y": 7.7,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 63.22,
     "y": 5.74,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 76.18,
     "y": 16.72,
     "v": 3,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 75.35,
     "y": 4.09,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 79.14,
     "y": 3.96,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 71.49,
     "y": 14.82,
     "v": 1,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 85.55,
     "y": 5.81
    },
    {
     "t": "tree_dead",
     "x": 95.09,
     "y": 13.65,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 77.38,
     "y": 3.16
    },
    {
     "t": "tree_dead",
     "x": 60.54,
     "y": 7.05,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 73.14,
     "y": 13.99,
     "v": 1
    },
    {
     "t": "tree_dead",
     "x": 102.02,
     "y": 13.86,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 82.13,
     "y": 5.41,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 96.84,
     "y": 3.7,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 104.68,
     "y": 10.8,
     "v": 3
    },
    {
     "t": "tree_dead",
     "x": 80.52,
     "y": 16.77,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 89.76,
     "y": 6.04,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 102.67,
     "y": 6.05,
     "v": 3,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 62.38,
     "y": 10.93,
     "v": 2
    },
    {
     "t": "tree_dead",
     "x": 64.56,
     "y": 4.93,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 74.78,
     "y": 13.15,
     "v": 1,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 93,
     "y": 5.59,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 78.06,
     "y": 16.79
    },
    {
     "t": "tree_dead",
     "x": 77.91,
     "y": 5.11,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_dead",
     "x": 101.17,
     "y": 3.33,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 82.27,
     "y": 15.85,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 69.95,
     "y": 9.94
    },
    {
     "t": "rock_dark",
     "x": 80.88,
     "y": 3.43,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 104.64,
     "y": 9.38,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 62.89,
     "y": 7.58,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 75.15,
     "y": 15.13
    },
    {
     "t": "rock_dark",
     "x": 63.11,
     "y": 13.91,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 74.34,
     "y": 7.58,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 93.05,
     "y": 11.78,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 96.76,
     "y": 14.31,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 76.67,
     "y": 5.96
    },
    {
     "t": "rock_dark",
     "x": 87.74,
     "y": 8.27,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 66.17,
     "y": 14.77,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 72.1,
     "y": 8.11
    },
    {
     "t": "rock_dark",
     "x": 85.18,
     "y": 9.28,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 88.27,
     "y": 12.88,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 86.61,
     "y": 8.69
    },
    {
     "t": "rock_dark",
     "x": 84.28,
     "y": 14.26,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 70.12,
     "y": 14.53
    },
    {
     "t": "rock_dark",
     "x": 94.88,
     "y": 12.05,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 93.96,
     "y": 11.1
    },
    {
     "t": "rock_dark",
     "x": 76.48,
     "y": 15.37,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 60.26,
     "y": 10.61
    },
    {
     "t": "rock_dark",
     "x": 68.41,
     "y": 8.93,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 84.17,
     "y": 7.12
    },
    {
     "t": "rock_dark",
     "x": 104.87,
     "y": 7.44
    },
    {
     "t": "rock_dark",
     "x": 67.16,
     "y": 6.1,
     "f": 1
    },
    {
     "t": "rock_dark",
     "x": 98.88,
     "y": 3.82
    },
    {
     "t": "rock_dark",
     "x": 86.98,
     "y": 13.77
    },
    {
     "t": "rock_dark",
     "x": 75.79,
     "y": 14.35
    },
    {
     "t": "rock_dark",
     "x": 79.36,
     "y": 16.23
    },
    {
     "t": "rock_dark",
     "x": 99.42,
     "y": 4.8
    },
    {
     "t": "rock_dark",
     "x": 88.78,
     "y": 7.41,
     "v": 1
    },
    {
     "t": "rock_dark",
     "x": 86.63,
     "y": 7.41,
     "v": 1,
     "f": 1
    },
    {
     "t": "mushroom",
     "x": 81.41,
     "y": 15.01
    },
    {
     "t": "mushroom",
     "x": 82.43,
     "y": 14.78
    },
    {
     "t": "mushroom",
     "x": 65.61,
     "y": 5.94
    },
    {
     "t": "mushroom",
     "x": 66.17,
     "y": 5.29
    },
    {
     "t": "mushroom",
     "x": 61.95,
     "y": 7.37
    },
    {
     "t": "mushroom",
     "x": 67.09,
     "y": 10.99
    },
    {
     "t": "mushroom",
     "x": 67.75,
     "y": 10.58
    },
    {
     "t": "mushroom",
     "x": 66.48,
     "y": 10.87
    },
    {
     "t": "mushroom",
     "x": 82.51,
     "y": 8.6
    },
    {
     "t": "mushroom",
     "x": 72.8,
     "y": 12.05
    },
    {
     "t": "mushroom",
     "x": 72.58,
     "y": 11.2
    },
    {
     "t": "mushroom",
     "x": 77.87,
     "y": 15.54
    },
    {
     "t": "mushroom",
     "x": 85.08,
     "y": 12.06
    },
    {
     "t": "mushroom",
     "x": 85.16,
     "y": 11.23
    },
    {
     "t": "mushroom",
     "x": 84.4,
     "y": 11.86
    },
    {
     "t": "mushroom",
     "x": 85.7,
     "y": 11.49
    },
    {
     "t": "mushroom",
     "x": 78.8,
     "y": 14.53
    },
    {
     "t": "mushroom",
     "x": 78.86,
     "y": 13.76
    },
    {
     "t": "mushroom",
     "x": 78.47,
     "y": 13.24
    },
    {
     "t": "mushroom",
     "x": 64.68,
     "y": 11.56
    },
    {
     "t": "mushroom",
     "x": 73.54,
     "y": 8.51
    },
    {
     "t": "mushroom",
     "x": 69.12,
     "y": 9.45
    },
    {
     "t": "mushroom",
     "x": 64.59,
     "y": 6.13
    },
    {
     "t": "mushroom",
     "x": 64.29,
     "y": 6.69
    },
    {
     "t": "mushroom",
     "x": 62.57,
     "y": 8.74
    },
    {
     "t": "mushroom",
     "x": 99.65,
     "y": 13.03
    },
    {
     "t": "moss",
     "x": 79.69,
     "y": 7.91,
     "v": 2
    },
    {
     "t": "moss",
     "x": 77.65,
     "y": 7.32,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 77.66,
     "y": 11.39,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 82.8,
     "y": 12.65,
     "v": 2
    },
    {
     "t": "moss",
     "x": 89.17,
     "y": 9.57,
     "f": 1
    },
    {
     "t": "moss",
     "x": 87.84,
     "y": 11.66,
     "v": 1
    },
    {
     "t": "moss",
     "x": 69,
     "y": 11.27,
     "v": 1
    },
    {
     "t": "moss",
     "x": 96.15,
     "y": 11.5,
     "v": 2
    },
    {
     "t": "moss",
     "x": 77.29,
     "y": 13.11,
     "f": 1
    },
    {
     "t": "moss",
     "x": 94.74,
     "y": 7,
     "v": 1
    },
    {
     "t": "moss",
     "x": 76.76,
     "y": 9.78,
     "v": 1,
     "f": 1
    },
    {
     "t": "moss",
     "x": 66.96,
     "y": 9.13,
     "v": 1,
     "f": 1
    },
    {
     "t": "moss",
     "x": 100.96,
     "y": 12.14,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 95.18,
     "y": 3.02,
     "v": 1
    },
    {
     "t": "stump",
     "x": 71.17,
     "y": 9
    },
    {
     "t": "stump",
     "x": 91.77,
     "y": 11.88
    },
    {
     "t": "stump",
     "x": 101.16,
     "y": 5.42
    },
    {
     "t": "stump",
     "x": 61.69,
     "y": 6.03
    },
    {
     "t": "bush",
     "x": 63.69,
     "y": 10.49
    },
    {
     "t": "bush",
     "x": 68.97,
     "y": 6.13,
     "v": 2
    },
    {
     "t": "bush",
     "x": 81.91,
     "y": 16.97,
     "v": 1
    },
    {
     "t": "bush",
     "x": 66.65,
     "y": 4.13,
     "v": 2
    },
    {
     "t": "bush",
     "x": 67.82,
     "y": 5.16,
     "v": 2
    },
    {
     "t": "grass",
     "x": 82.66,
     "y": 13.99,
     "v": 1
    },
    {
     "t": "grass",
     "x": 96.67,
     "y": 13.07,
     "f": 1
    },
    {
     "t": "grass",
     "x": 98.16,
     "y": 11.75,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 98.59,
     "y": 10.56
    },
    {
     "t": "grass",
     "x": 73.02,
     "y": 12.82,
     "v": 1
    },
    {
     "t": "grass",
     "x": 64.42,
     "y": 8.55
    },
    {
     "t": "grass",
     "x": 65.07,
     "y": 8.84,
     "v": 1
    },
    {
     "t": "grass",
     "x": 61.07,
     "y": 10.29
    },
    {
     "t": "grass",
     "x": 87.88,
     "y": 9.57,
     "f": 1
    },
    {
     "t": "grass",
     "x": 80.14,
     "y": 11.38,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 102.97,
     "y": 22.79,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 105.97,
     "y": 40.4
    },
    {
     "t": "pine_giant",
     "x": 90.94,
     "y": 28.28,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 109.29,
     "y": 24.72,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 93.91,
     "y": 24.41,
     "f": 1
    },
    {
     "t": "pine_giant",
     "x": 107.69,
     "y": 36.61,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 97.67,
     "y": 21.57,
     "v": 3
    },
    {
     "t": "pine",
     "x": 90.2,
     "y": 41.05,
     "v": 3
    },
    {
     "t": "pine",
     "x": 109.41,
     "y": 30.79,
     "v": 2
    },
    {
     "t": "pine",
     "x": 88.89,
     "y": 39.1,
     "v": 2
    },
    {
     "t": "pine",
     "x": 91.42,
     "y": 42.09,
     "v": 2
    },
    {
     "t": "pine",
     "x": 95.44,
     "y": 42.9
    },
    {
     "t": "pine",
     "x": 109.82,
     "y": 34.86,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 91.24,
     "y": 24.11,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 109.28,
     "y": 32.93,
     "v": 1
    },
    {
     "t": "pine",
     "x": 88.39,
     "y": 27.53,
     "v": 2
    },
    {
     "t": "pine",
     "x": 88.3,
     "y": 37.23,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 108.78,
     "y": 27.62,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 107.54,
     "y": 21.92
    },
    {
     "t": "pine",
     "x": 104.14,
     "y": 42.21,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 91.19,
     "y": 37.77
    },
    {
     "t": "pine",
     "x": 105.52,
     "y": 23.71,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 93.1,
     "y": 22.03,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 94.24,
     "y": 41.01,
     "v": 2
    },
    {
     "t": "pine",
     "x": 110.69,
     "y": 29.6,
     "f": 1
    },
    {
     "t": "pine",
     "x": 100.63,
     "y": 21.11,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 95.49,
     "y": 21.19,
     "v": 1
    },
    {
     "t": "pine",
     "x": 110.52,
     "y": 31.92,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 92.19,
     "y": 39.88
    },
    {
     "t": "pine",
     "x": 105.63,
     "y": 22.04,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 105.44,
     "y": 37.37,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 92.35,
     "y": 25.91
    },
    {
     "t": "pine_young",
     "x": 99.05,
     "y": 21.53,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 106.32,
     "y": 24.64,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 99.88,
     "y": 22.44
    },
    {
     "t": "pine_young",
     "x": 89.67,
     "y": 25.58,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 89.35,
     "y": 26.59,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 104.42,
     "y": 38.72,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 110.27,
     "y": 28.2,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 91.28,
     "y": 26.06,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 91.99,
     "y": 31.34
    },
    {
     "t": "pine_young",
     "x": 107.04,
     "y": 23.92,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 103.68,
     "y": 39.83,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 102.31,
     "y": 39.56,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 95.86,
     "y": 40.77,
     "v": 2,
     "f": 1
    },
    {
     "t": "rock",
     "x": 93.57,
     "y": 39.17
    },
    {
     "t": "rock",
     "x": 110.03,
     "y": 26.98,
     "v": 1,
     "f": 1
    },
    {
     "t": "rock",
     "x": 88.43,
     "y": 33.69
    },
    {
     "t": "rock",
     "x": 103.47,
     "y": 40.9,
     "f": 1
    },
    {
     "t": "moss",
     "x": 102.72,
     "y": 35.59,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 96.12,
     "y": 37.16
    },
    {
     "t": "moss",
     "x": 99.31,
     "y": 25.41,
     "v": 1
    },
    {
     "t": "mushroom_red",
     "x": 106.91,
     "y": 34.53
    },
    {
     "t": "mushroom_red",
     "x": 107.59,
     "y": 27.7
    },
    {
     "t": "mushroom_red",
     "x": 108.33,
     "y": 31.28
    },
    {
     "t": "mushroom_red",
     "x": 105.67,
     "y": 26.75
    },
    {
     "t": "mushroom_red",
     "x": 106.39,
     "y": 27.05
    },
    {
     "t": "mushroom_red",
     "x": 110.84,
     "y": 30.64
    },
    {
     "t": "mushroom_red",
     "x": 95.97,
     "y": 24.55
    },
    {
     "t": "grass",
     "x": 95.2,
     "y": 31.89,
     "v": 1
    },
    {
     "t": "grass",
     "x": 94.8,
     "y": 32.51
    },
    {
     "t": "grass",
     "x": 96.3,
     "y": 32.97
    },
    {
     "t": "grass",
     "x": 97.26,
     "y": 32.73,
     "v": 1
    },
    {
     "t": "grass",
     "x": 97.26,
     "y": 33.23,
     "v": 1
    },
    {
     "t": "grass",
     "x": 103.88,
     "y": 33.68,
     "v": 1,
     "f": 1
    },
    {
     "t": "grass",
     "x": 104.58,
     "y": 33.28,
     "f": 1
    },
    {
     "t": "grass",
     "x": 103.97,
     "y": 37.93
    },
    {
     "t": "grass",
     "x": 106.01,
     "y": 35.45,
     "v": 1
    },
    {
     "t": "grass",
     "x": 105.19,
     "y": 36.09,
     "v": 1,
     "f": 1
    },
    {
     "t": "log",
     "x": 47.52,
     "y": 60.77,
     "f": 1
    },
    {
     "t": "stump",
     "x": 46.42,
     "y": 59.07
    },
    {
     "t": "rock",
     "x": 26.87,
     "y": 90.21
    },
    {
     "t": "rock",
     "x": 27.97,
     "y": 89.99,
     "v": 1
    },
    {
     "t": "lantern_blue",
     "x": 28.67,
     "y": 89.09
    },
    {
     "t": "mushroom_red",
     "x": 82.09,
     "y": 47.56
    },
    {
     "t": "mushroom_red",
     "x": 80.31,
     "y": 46.51
    },
    {
     "t": "mushroom_red",
     "x": 81.51,
     "y": 46.53
    },
    {
     "t": "lantern",
     "x": 79.09,
     "y": 47.56
    },
    {
     "t": "sign",
     "x": 72.78,
     "y": 48.89,
     "text": "Do not feed the boars."
    },
    {
     "t": "lantern",
     "x": 73.88,
     "y": 48.49
    },
    {
     "t": "stump",
     "x": 71.58,
     "y": 49.69
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
     "x": 55.98,
     "y": 87.75
    },
    {
     "t": "mushroom_red",
     "x": 56.78,
     "y": 88.33
    },
    {
     "t": "brazier",
     "x": 72.67,
     "y": 47.68
    },
    {
     "t": "stump",
     "x": 72.87,
     "y": 46.38
    },
    {
     "t": "rock",
     "x": 38.98,
     "y": 55.01
    },
    {
     "t": "rock",
     "x": 40.01,
     "y": 55.04,
     "v": 1
    },
    {
     "t": "lantern_blue",
     "x": 37.63,
     "y": 54.21
    },
    {
     "t": "mushroom_red",
     "x": 42.95,
     "y": 46.88
    },
    {
     "t": "mushroom_red",
     "x": 42.34,
     "y": 47.92
    },
    {
     "t": "mushroom_red",
     "x": 41.16,
     "y": 45.83
    },
    {
     "t": "mushroom_red",
     "x": 42.36,
     "y": 45.85
    },
    {
     "t": "moss",
     "x": 41.75,
     "y": 46.88
    },
    {
     "t": "lantern",
     "x": 43.55,
     "y": 46.88
    },
    {
     "t": "sign",
     "x": 49.55,
     "y": 50,
     "text": "Mind the roots."
    },
    {
     "t": "log",
     "x": 28.06,
     "y": 56.4,
     "f": 1
    },
    {
     "t": "stump",
     "x": 29.46,
     "y": 55.9
    },
    {
     "t": "moss",
     "x": 27.26,
     "y": 57.3
    },
    {
     "t": "mushroom_red",
     "x": 28.66,
     "y": 57.6
    },
    {
     "t": "brazier",
     "x": 28.76,
     "y": 60.5
    },
    {
     "t": "log",
     "x": 30.06,
     "y": 60.9,
     "f": 1
    },
    {
     "t": "log",
     "x": 27.56,
     "y": 61.2
    },
    {
     "t": "stump",
     "x": 28.96,
     "y": 59.2
    },
    {
     "t": "rock",
     "x": 27.36,
     "y": 56.6,
     "v": 2
    },
    {
     "t": "mushroom_red",
     "x": 36.47,
     "y": 51.97
    },
    {
     "t": "mushroom_red",
     "x": 35,
     "y": 53.5
    },
    {
     "t": "mushroom_red",
     "x": 35.82,
     "y": 51.71
    },
    {
     "t": "lantern",
     "x": 33.4,
     "y": 52.74
    },
    {
     "t": "sign",
     "x": 61.24,
     "y": 75.26,
     "text": "Ogres ahead. Keep to the road."
    },
    {
     "t": "lantern",
     "x": 62.34,
     "y": 74.86
    },
    {
     "t": "stump",
     "x": 60.04,
     "y": 76.06
    },
    {
     "t": "log",
     "x": 87,
     "y": 35.17,
     "f": 1
    },
    {
     "t": "stump",
     "x": 88.4,
     "y": 34.67
    },
    {
     "t": "moss",
     "x": 86.2,
     "y": 36.07
    },
    {
     "t": "mushroom_red",
     "x": 87.6,
     "y": 36.37
    },
    {
     "t": "brazier",
     "x": 53.53,
     "y": 64.65
    },
    {
     "t": "log",
     "x": 54.68,
     "y": 65,
     "f": 1
    },
    {
     "t": "log",
     "x": 52.29,
     "y": 66.14
    },
    {
     "t": "rock",
     "x": 44.58,
     "y": 62.83
    },
    {
     "t": "rock",
     "x": 44.08,
     "y": 63.53,
     "v": 2
    },
    {
     "t": "lantern_blue",
     "x": 43.18,
     "y": 62.33
    },
    {
     "t": "mushroom_red",
     "x": 64.25,
     "y": 43.57
    },
    {
     "t": "mushroom_red",
     "x": 64.27,
     "y": 41.49
    },
    {
     "t": "mushroom_red",
     "x": 65.47,
     "y": 41.51
    },
    {
     "t": "moss",
     "x": 65.13,
     "y": 43.19
    },
    {
     "t": "log",
     "x": 35.68,
     "y": 65.18,
     "f": 1
    },
    {
     "t": "stump",
     "x": 37.08,
     "y": 64.68
    },
    {
     "t": "mushroom_red",
     "x": 36.28,
     "y": 66.38
    },
    {
     "t": "pine_giant",
     "x": 49.59,
     "y": 71.75,
     "v": 1
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
     "v": 1
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
     "x": 65.1,
     "y": 53.81,
     "v": 1
    },
    {
     "t": "sunbeam",
     "x": 64.8,
     "y": 51.41
    },
    {
     "t": "pine_giant",
     "x": 32.64,
     "y": 89.3,
     "v": 1
    },
    {
     "t": "sunbeam",
     "x": 30.44,
     "y": 90.7
    },
    {
     "t": "sunbeam",
     "x": 86.4,
     "y": 46.8
    },
    {
     "t": "pine_giant",
     "x": 48.59,
     "y": 92.75,
     "v": 1
    },
    {
     "t": "sunbeam",
     "x": 50.59,
     "y": 94.75
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
     "v": 1
    },
    {
     "t": "sunbeam",
     "x": 47.86,
     "y": 69.98
    },
    {
     "t": "pine_giant",
     "x": 49.04,
     "y": 51.51,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 51.34,
     "y": 55.91,
     "v": 1
    },
    {
     "t": "sunbeam",
     "x": 51.04,
     "y": 53.51
    },
    {
     "t": "pine_giant",
     "x": 90.62,
     "y": 25.4,
     "v": 1
    },
    {
     "t": "sunbeam",
     "x": 92.62,
     "y": 27.4
    },
    {
     "t": "brazier",
     "x": 22.83,
     "y": 10.32
    },
    {
     "t": "crystal_violet",
     "x": 21.33,
     "y": 9.32
    },
    {
     "t": "crystal_violet",
     "x": 24.43,
     "y": 9.52
    },
    {
     "t": "crystal_violet",
     "x": 23.03,
     "y": 12.02
    },
    {
     "t": "crystal",
     "x": 90.79,
     "y": 12.71
    },
    {
     "t": "crystal_violet",
     "x": 90.1,
     "y": 14.16
    },
    {
     "t": "lantern_blue",
     "x": 92.4,
     "y": 13.16
    },
    {
     "t": "mushroom",
     "x": 70.22,
     "y": 8.02
    },
    {
     "t": "mushroom",
     "x": 70.23,
     "y": 6.73
    },
    {
     "t": "mushroom",
     "x": 71.47,
     "y": 6.34
    },
    {
     "t": "moss",
     "x": 71.11,
     "y": 7.38
    }
   ],
   "objective": "Follow the animals north along the dirt road.",
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
     "x": 85.7,
     "y": 36.9
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
     "id": "hollow_out",
     "x": 85.7,
     "y": 36.9
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
       "text": "Follow the animals north along the dirt road."
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
       "text": "Follow the road north to the stone plaza"
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
       "text": "Enter the Warden's Grove (east). The root door waits north of the road"
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
       "text": "Defeat the Gnarlroot Ogre (south-east) for the Hollow key"
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
       "item": "key_roothollow"
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
       "text": "Take the root key to the door north of the road (the Root Hollow)"
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
       "text": "Descend through the Root Hollow and defeat Mossjaw"
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
       "text": "Find the lever that raises the gate"
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
       "id": "hollow_exit_gate"
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
       "text": "Take the root-stair up to the Clearing shrine, then face Bramblehorn"
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
       "text": "Sneak past the sleepers to the vault (or wake them one by one)"
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
       "x": 77.2,
       "y": 7.8,
       "radius": 0.3,
       "instant": true
      },
      {
       "type": "spawn",
       "enemy": "mountaintroll",
       "count": 1,
       "x": 82.9,
       "y": 12.6,
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
       "x": 96.8,
       "y": 11.1,
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
     "name": "The Clearing gate",
     "when": {
      "type": "enter_area",
      "x": 84,
      "y": 36,
      "r": 2.2
     },
     "actions": [
      {
       "type": "checkpoint",
       "text": "Checkpoint: The Clearing gate"
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
       "text": "Take the rift home, or on to the Gloomspire Ruins"
      },
      {
       "type": "sound",
       "name": "portal"
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
