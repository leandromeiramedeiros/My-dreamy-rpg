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
   "W": 24,
   "H": 24,
   "tiles": [
    "gggggggggffffgggfggggggg",
    "gggggggggffffggggggggggg",
    "ggggggggggggggggggggffgg",
    "ggggggggggggpsssgggfffgg",
    "ggggggppgggppsssggffffgg",
    "ggggggpppppppggggggwwfgg",
    "ggggggggppppffgggggwwfgg",
    "ggggggggggppffgggggwfffg",
    "ggggggggggppffggggfwfffg",
    "ggggggggggpfffggggwwwffg",
    "gggggggggppffffgggwwwfgg",
    "gggffffgppggggggggwwffff",
    "gggffffgppggggggggwwffff",
    "gggfffgpppppppppppbbppff",
    "ggggfgpppppgggfggfwwppff",
    "ggggggppfffggggggwwfppff",
    "gggggppfgffggggggwwffpff",
    "ggggppggggggggggfwwgfpff",
    "fgpppgggggggggggfwwgffff",
    "ffppffggfggggggggwwfffff",
    "fffffffffgggggggwwgfffff",
    "ffffffgffgggggggwwffffff",
    "ffffggggfgggggggwwfgffff",
    "ffffggggggggggffwwfgffff"
   ],
   "heights": [
    "000000000000000004444444",
    "000000000000000044444444",
    "000000000000000044444444",
    "000000000000012344444444",
    "000000000000012344444444",
    "000000000000000044444444",
    "000000000000000044444444",
    "000000000000000044444444",
    "000000000000000004444440",
    "000000000000000000000000",
    "000000000000000000000000",
    "000000000000000000000000",
    "000000000000000000000000",
    "000000000000000000000000",
    "000000000000000000000000",
    "000000000000000000000000",
    "000000000000000000000000",
    "000000000000000000000000",
    "000000000000000000000000",
    "000000000000000000000000",
    "000000000000000000000000",
    "000000000000000000000000",
    "000000000000000000000000",
    "000000000000000000000000"
   ],
   "start": {
    "x": 3.2,
    "y": 19.2
   },
   "portals": [
    {
     "x": 21.5,
     "y": 2.5,
     "to": "ruins",
     "open": true,
     "marker": true
    },
    {
     "x": 10.5,
     "y": 21.5,
     "to": "pinewood",
     "open": true,
     "marker": false
    }
   ],
   "objects": [
    {
     "t": "house",
     "x": 4,
     "y": 4
    },
    {
     "t": "tree_poplar",
     "x": 0.575,
     "y": 0.314,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 1.401,
     "y": 0.597,
     "v": 3
    },
    {
     "t": "tree_poplar",
     "x": 0.355,
     "y": 1.575,
     "v": 3,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 1.669,
     "y": 1.593,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 0.613,
     "y": 2.533,
     "v": 2
    },
    {
     "t": "tree_poplar",
     "x": 0.568,
     "y": 3.483,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 1.57,
     "y": 3.474,
     "v": 3,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 0.607,
     "y": 4.689,
     "v": 3
    },
    {
     "t": "tree_poplar",
     "x": 1.545,
     "y": 4.392,
     "v": 1
    },
    {
     "t": "tree_teal",
     "x": 1.393,
     "y": 5.55,
     "v": 3,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 0.379,
     "y": 6.349,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 1.552,
     "y": 6.6,
     "v": 3
    },
    {
     "t": "tree_teal",
     "x": 0.574,
     "y": 7.618,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_round",
     "x": 1.603,
     "y": 7.506,
     "v": 1
    },
    {
     "t": "tree_poplar",
     "x": 0.318,
     "y": 8.592,
     "v": 2
    },
    {
     "t": "tree_teal",
     "x": 1.522,
     "y": 8.335,
     "v": 3,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 0.38,
     "y": 9.584,
     "v": 1,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 1.637,
     "y": 9.649,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 0.686,
     "y": 10.336,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 0.434,
     "y": 11.32,
     "v": 3
    },
    {
     "t": "tree_round",
     "x": 1.696,
     "y": 11.397
    },
    {
     "t": "tree_poplar",
     "x": 0.318,
     "y": 12.563,
     "v": 1
    },
    {
     "t": "tree_round",
     "x": 1.422,
     "y": 12.345,
     "v": 1
    },
    {
     "t": "tree_poplar",
     "x": 0.507,
     "y": 13.437,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 1.631,
     "y": 13.532,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 0.494,
     "y": 14.309,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 1.468,
     "y": 14.422
    },
    {
     "t": "tree_poplar",
     "x": 0.532,
     "y": 15.446,
     "v": 1,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 1.647,
     "y": 15.503,
     "v": 1,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 0.672,
     "y": 16.463,
     "v": 3
    },
    {
     "t": "tree_teal",
     "x": 0.623,
     "y": 17.479
    },
    {
     "t": "tree_poplar",
     "x": 1.603,
     "y": 17.471,
     "v": 3
    },
    {
     "t": "tree_poplar",
     "x": 0.658,
     "y": 18.319,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 0.567,
     "y": 19.515,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_round",
     "x": 1.375,
     "y": 19.432,
     "v": 3
    },
    {
     "t": "tree_poplar",
     "x": 0.305,
     "y": 20.561,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 1.675,
     "y": 20.517,
     "v": 1
    },
    {
     "t": "tree_poplar",
     "x": 0.323,
     "y": 21.422
    },
    {
     "t": "tree_teal",
     "x": 1.593,
     "y": 21.546,
     "v": 3,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 0.628,
     "y": 22.338,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 0.665,
     "y": 23.409,
     "v": 1,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 1.659,
     "y": 23.661,
     "v": 1
    },
    {
     "t": "tree_teal",
     "x": 2.541,
     "y": 0.558,
     "v": 1
    },
    {
     "t": "tree_teal",
     "x": 2.558,
     "y": 1.655,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 3.675,
     "y": 0.399,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 4.565,
     "y": 0.464,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 5.524,
     "y": 0.448,
     "v": 2
    },
    {
     "t": "tree_poplar",
     "x": 5.352,
     "y": 1.604,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 6.511,
     "y": 0.42,
     "v": 3,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 7.407,
     "y": 0.634
    },
    {
     "t": "tree_poplar",
     "x": 8.302,
     "y": 0.539
    },
    {
     "t": "tree_teal",
     "x": 9.61,
     "y": 1.482,
     "v": 1
    },
    {
     "t": "tree_teal",
     "x": 10.405,
     "y": 0.42,
     "v": 2
    },
    {
     "t": "tree_poplar",
     "x": 11.584,
     "y": 0.637,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 12.693,
     "y": 0.489,
     "f": 1
    },
    {
     "t": "tree_poplar",
     "x": 12.505,
     "y": 1.611,
     "v": 2
    },
    {
     "t": "tree_teal",
     "x": 13.678,
     "y": 0.601,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 13.351,
     "y": 1.473,
     "v": 2
    },
    {
     "t": "tree_teal",
     "x": 14.604,
     "y": 0.656,
     "v": 2
    },
    {
     "t": "tree_poplar",
     "x": 14.634,
     "y": 1.644
    },
    {
     "t": "tree_teal",
     "x": 15.669,
     "y": 0.416,
     "v": 1
    },
    {
     "t": "tree_blossom",
     "x": 3,
     "y": 7.3,
     "v": 3
    },
    {
     "t": "tree_blossom",
     "x": 7.6,
     "y": 3.2,
     "v": 3
    },
    {
     "t": "tree_blossom",
     "x": 2.6,
     "y": 3.1,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_blossom",
     "x": 9.2,
     "y": 2.6
    },
    {
     "t": "tree_round",
     "x": 18.426,
     "y": 0.447,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 16.39,
     "y": 1.594,
     "v": 1
    },
    {
     "t": "tree_round",
     "x": 17.589,
     "y": 1.642,
     "v": 1
    },
    {
     "t": "tree_round",
     "x": 22.575,
     "y": 5.591,
     "v": 2
    },
    {
     "t": "tree_round",
     "x": 23.552,
     "y": 7.447,
     "v": 2
    },
    {
     "t": "tree_round",
     "x": 22.512,
     "y": 8.578,
     "v": 2
    },
    {
     "t": "tree_round",
     "x": 6.363,
     "y": 11.282,
     "v": 3,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 9.177,
     "y": 21.719,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_teal",
     "x": 5.385,
     "y": 20.948
    },
    {
     "t": "tree_teal",
     "x": 4.117,
     "y": 15.246,
     "f": 1
    },
    {
     "t": "tree_round",
     "x": 13.929,
     "y": 9.857,
     "f": 1
    },
    {
     "t": "tree_blossom",
     "x": 9.781,
     "y": 16.116
    },
    {
     "t": "tree_teal",
     "x": 4.156,
     "y": 13.05,
     "f": 1
    },
    {
     "t": "tree_round",
     "x": 3.345,
     "y": 9.993,
     "v": 1
    },
    {
     "t": "tree_teal",
     "x": 4.39,
     "y": 21.991,
     "v": 2,
     "f": 1
    },
    {
     "t": "tree_blossom",
     "x": 15.827,
     "y": 8.05,
     "v": 3
    },
    {
     "t": "tree_round",
     "x": 13.478,
     "y": 16.505,
     "f": 1
    },
    {
     "t": "tree_round",
     "x": 11.022,
     "y": 19.949,
     "f": 1
    },
    {
     "t": "bush",
     "x": 11.884,
     "y": 10.602,
     "v": 2
    },
    {
     "t": "bush",
     "x": 21.107,
     "y": 21.956,
     "v": 2
    },
    {
     "t": "bush",
     "x": 11.25,
     "y": 11.633
    },
    {
     "t": "bush",
     "x": 9.076,
     "y": 18.399
    },
    {
     "t": "bush",
     "x": 12.8,
     "y": 10.633,
     "v": 2
    },
    {
     "t": "bush",
     "x": 15.335,
     "y": 18.618
    },
    {
     "t": "bush",
     "x": 7.924,
     "y": 18.767
    },
    {
     "t": "bush",
     "x": 16.829,
     "y": 8.613,
     "v": 2
    },
    {
     "t": "bush",
     "x": 7.075,
     "y": 11.692,
     "v": 2
    },
    {
     "t": "bush",
     "x": 19.725,
     "y": 16.874,
     "v": 2
    },
    {
     "t": "bush",
     "x": 22.153,
     "y": 7.218,
     "v": 2
    },
    {
     "t": "rock",
     "x": 3.358,
     "y": 15.703,
     "v": 1
    },
    {
     "t": "rock",
     "x": 20.463,
     "y": 11.927
    },
    {
     "t": "rock",
     "x": 9.909,
     "y": 19.042,
     "v": 2
    },
    {
     "t": "rock",
     "x": 2.699,
     "y": 9.347,
     "v": 2
    },
    {
     "t": "rock",
     "x": 22.752,
     "y": 13.15,
     "v": 2
    },
    {
     "t": "grass",
     "x": 23.299,
     "y": 20.847
    },
    {
     "t": "grass",
     "x": 20.983,
     "y": 4.872
    },
    {
     "t": "grass",
     "x": 11.835,
     "y": 9.611
    },
    {
     "t": "grass",
     "x": 19.009,
     "y": 20.045
    },
    {
     "t": "grass",
     "x": 8.481,
     "y": 1.469
    },
    {
     "t": "grass",
     "x": 22.253,
     "y": 8.473
    },
    {
     "t": "grass",
     "x": 13.603,
     "y": 7.365
    },
    {
     "t": "grass",
     "x": 13.929,
     "y": 11.889
    },
    {
     "t": "grass",
     "x": 14.514,
     "y": 11.852
    },
    {
     "t": "grass",
     "x": 3.879,
     "y": 5.436
    },
    {
     "t": "grass",
     "x": 6.485,
     "y": 20.434
    },
    {
     "t": "grass",
     "x": 9.917,
     "y": 17.595
    },
    {
     "t": "grass",
     "x": 19.686,
     "y": 0.927
    },
    {
     "t": "grass",
     "x": 5.499,
     "y": 11.942
    },
    {
     "t": "grass",
     "x": 1.225,
     "y": 13.386
    },
    {
     "t": "grass",
     "x": 11.846,
     "y": 21.05
    },
    {
     "t": "grass",
     "x": 13.449,
     "y": 15.667
    },
    {
     "t": "grass",
     "x": 8.015,
     "y": 2.755
    },
    {
     "t": "grass",
     "x": 0.881,
     "y": 7.677
    },
    {
     "t": "grass",
     "x": 19.057,
     "y": 16.316
    },
    {
     "t": "grass",
     "x": 3.897,
     "y": 21.438
    },
    {
     "t": "grass",
     "x": 0.986,
     "y": 14.754
    },
    {
     "t": "grass",
     "x": 12.463,
     "y": 17.551
    },
    {
     "t": "grass",
     "x": 16.404,
     "y": 17.51
    },
    {
     "t": "grass",
     "x": 6.295,
     "y": 0.867
    },
    {
     "t": "grass",
     "x": 13.477,
     "y": 14.882
    },
    {
     "t": "grass",
     "x": 2.845,
     "y": 9.734
    },
    {
     "t": "grass",
     "x": 1.069,
     "y": 2.354
    },
    {
     "t": "grass",
     "x": 4.293,
     "y": 15.746
    },
    {
     "t": "grass",
     "x": 0.921,
     "y": 20.963
    },
    {
     "t": "grass",
     "x": 8.881,
     "y": 1.586
    },
    {
     "t": "grass",
     "x": 20.274,
     "y": 11.223
    },
    {
     "t": "grass",
     "x": 12.949,
     "y": 22.351
    },
    {
     "t": "grass",
     "x": 22.489,
     "y": 2.744
    },
    {
     "t": "grass",
     "x": 2.191,
     "y": 22.433
    },
    {
     "t": "grass",
     "x": 5.05,
     "y": 11.196
    },
    {
     "t": "grass",
     "x": 6.92,
     "y": 17.236
    },
    {
     "t": "grass",
     "x": 0.966,
     "y": 10.293
    },
    {
     "t": "grass",
     "x": 9.455,
     "y": 20.048
    },
    {
     "t": "grass",
     "x": 16.396,
     "y": 10.026
    },
    {
     "t": "grass",
     "x": 4.742,
     "y": 12.98
    },
    {
     "t": "grass",
     "x": 21.531,
     "y": 8.546
    },
    {
     "t": "grass",
     "x": 18.695,
     "y": 0.47
    },
    {
     "t": "grass",
     "x": 13.184,
     "y": 12.387
    },
    {
     "t": "grass",
     "x": 16.526,
     "y": 9.863
    },
    {
     "t": "grass",
     "x": 12.692,
     "y": 0.797
    },
    {
     "t": "grass",
     "x": 16.706,
     "y": 1.238
    },
    {
     "t": "grass",
     "x": 23.104,
     "y": 22.142
    },
    {
     "t": "grass",
     "x": 19.838,
     "y": 1.026
    },
    {
     "t": "grass",
     "x": 5.579,
     "y": 8.449
    },
    {
     "t": "grass",
     "x": 9.278,
     "y": 16.713
    },
    {
     "t": "grass",
     "x": 11.34,
     "y": 18.049
    },
    {
     "t": "grass",
     "x": 19.109,
     "y": 23.631
    },
    {
     "t": "grass",
     "x": 17.463,
     "y": 10.725
    },
    {
     "t": "grass",
     "x": 19.378,
     "y": 23.178
    },
    {
     "t": "grass",
     "x": 7.787,
     "y": 11.955
    },
    {
     "t": "grass",
     "x": 2.185,
     "y": 12.519
    },
    {
     "t": "grass",
     "x": 6.228,
     "y": 0.975
    },
    {
     "t": "grass",
     "x": 16.278,
     "y": 4.743
    },
    {
     "t": "grass",
     "x": 0.409,
     "y": 13.013
    },
    {
     "t": "grass",
     "x": 0.371,
     "y": 9.86
    },
    {
     "t": "grass",
     "x": 3.309,
     "y": 16.07
    },
    {
     "t": "grass",
     "x": 4.818,
     "y": 8.724
    },
    {
     "t": "grass",
     "x": 1.915,
     "y": 14.667
    },
    {
     "t": "grass",
     "x": 2.817,
     "y": 22.613
    },
    {
     "t": "grass",
     "x": 1.235,
     "y": 21.409
    },
    {
     "t": "grass",
     "x": 6.977,
     "y": 10.007
    },
    {
     "t": "grass",
     "x": 20.413,
     "y": 20.655
    },
    {
     "t": "grass",
     "x": 8.4,
     "y": 20.888
    },
    {
     "t": "grass",
     "x": 1.24,
     "y": 7.039
    },
    {
     "t": "grass",
     "x": 11.557,
     "y": 20.453
    },
    {
     "t": "grass",
     "x": 12.234,
     "y": 0.53
    },
    {
     "t": "grass",
     "x": 16.404,
     "y": 17.903
    },
    {
     "t": "grass",
     "x": 22.076,
     "y": 5.926
    },
    {
     "t": "grass",
     "x": 16.47,
     "y": 19.514
    },
    {
     "t": "grass",
     "x": 5.911,
     "y": 10.368
    },
    {
     "t": "grass",
     "x": 5.577,
     "y": 20.566
    },
    {
     "t": "mushroom",
     "x": 16.092,
     "y": 0.449
    },
    {
     "t": "mushroom",
     "x": 1.984,
     "y": 8.275
    },
    {
     "t": "mushroom",
     "x": 2.847,
     "y": 2.034
    },
    {
     "t": "mushroom",
     "x": 1.264,
     "y": 2.962
    },
    {
     "t": "mushroom",
     "x": 11.396,
     "y": 0.617
    },
    {
     "t": "mushroom",
     "x": 2.273,
     "y": 6.299
    },
    {
     "t": "mushroom",
     "x": 21.902,
     "y": 1.678
    },
    {
     "t": "mushroom",
     "x": 1.761,
     "y": 7.807
    },
    {
     "t": "mushroom",
     "x": 14.612,
     "y": 1.541
    },
    {
     "t": "mushroom",
     "x": 1.346,
     "y": 6.469
    },
    {
     "t": "mushroom",
     "x": 10.901,
     "y": 2.055
    },
    {
     "t": "mushroom",
     "x": 0.574,
     "y": 3.885
    },
    {
     "t": "mushroom",
     "x": 3.196,
     "y": 1.786
    },
    {
     "t": "mushroom",
     "x": 1.728,
     "y": 22.432
    },
    {
     "t": "mushroom",
     "x": 5.26,
     "y": 1.564
    },
    {
     "t": "mushroom",
     "x": 2.49,
     "y": 8.727
    },
    {
     "t": "lantern",
     "x": 4.452,
     "y": 19.219
    },
    {
     "t": "lantern",
     "x": 6.984,
     "y": 16.682
    },
    {
     "t": "lantern",
     "x": 9.105,
     "y": 13.895
    },
    {
     "t": "lantern",
     "x": 10.926,
     "y": 10.885
    },
    {
     "t": "lantern",
     "x": 12.223,
     "y": 7.486
    },
    {
     "t": "lantern",
     "x": 9.285,
     "y": 13.009
    },
    {
     "t": "lantern",
     "x": 13.669,
     "y": 12.555
    },
    {
     "t": "lantern",
     "x": 17.885,
     "y": 12.5
    },
    {
     "t": "lantern",
     "x": 22.178,
     "y": 14.389
    },
    {
     "t": "lantern",
     "x": 17.2,
     "y": 12.6
    },
    {
     "t": "lantern",
     "x": 20.8,
     "y": 14.4
    },
    {
     "t": "sign",
     "x": 4.3,
     "y": 18.4
    },
    {
     "t": "shrine",
     "x": 21.6,
     "y": 19.6
    },
    {
     "t": "crystal",
     "x": 22.3,
     "y": 19.2
    },
    {
     "t": "crystal",
     "x": 21.4,
     "y": 6.8
    },
    {
     "t": "crystal",
     "x": 18.2,
     "y": 6.3
    },
    {
     "t": "chest",
     "x": 4.5,
     "y": 17.2,
     "starter": true
    },
    {
     "t": "shrine",
     "x": 2.6,
     "y": 21.2
    }
   ],
   "objective": "Explore. A rift hums to the NE.",
   "triggers": [
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
       "x": 6.3,
       "y": 19.6,
       "instant": true
      },
      {
       "type": "spawn",
       "enemy": "dummy",
       "count": 1,
       "x": 7.2,
       "y": 20.6,
       "instant": true
      }
     ]
    }
   ],
   "level": [
    1,
    3
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
   "sub": "Dawn mist among the giant pines",
   "theme": "forest",
   "W": 26,
   "H": 26,
   "tiles": [
    "..........gd..............",
    ".........ggddddddd........",
    "........ggggdddddddd......",
    "......ggggggdddgggdd......",
    ".....gggggggppdgggddd.....",
    "....gggggddggpdggggggg....",
    "...gggggggdggpggggggggg...",
    "...gggggggdggpggggggddgg..",
    "...dddgggddddppgggggddgg..",
    "..gggggggggggppgggggggggg.",
    "..ggggggggggggpgggggggggg.",
    ".ggggwwgggggggpgggggggggg.",
    ".gggwwwwgggggppgggggggggg.",
    ".ggggggggggggppgggggggggg.",
    ".gggggggggggpppppgppppggg.",
    ".gggggggggppppppppppgggg..",
    ".ggggggggpppgggggggggggg..",
    "..ggggggppgggggggggggggg..",
    "..ggggpppggggggggggggggg..",
    "...ggpppggggggggggggggg...",
    "....ppgggggggggggggggg....",
    "....pgggggggggggggggg.....",
    ".....ggggggggggggggg......",
    "........gggggggggggg......",
    "........gggggg..gg........",
    "...........g.............."
   ],
   "heights": [
    "00000000001100000000000000",
    "00000000011111111100000000",
    "00000000111111111110000000",
    "00000000111111111110000000",
    "00000000111111111110000000",
    "00000000111111111110000000",
    "00000011111111111110000000",
    "00000011000000000000000000",
    "00000000000000000000000000",
    "00000000000000000000000000",
    "00000000000000000000000000",
    "00000000000000000000000000",
    "00000000000000000000000000",
    "00000000000000000000000000",
    "00000000000000000000000000",
    "00000000000000000000000000",
    "00000000000000000000000000",
    "00000000000000000000000000",
    "00000000000000000001100000",
    "00000000000000000011110000",
    "00000000000000000011110000",
    "00000000000000000001100000",
    "00000000000000000000000000",
    "00000000000000000000000000",
    "00000000000000000000000000",
    "00000000000000000000000000"
   ],
   "start": {
    "x": 5.4,
    "y": 20.4
   },
   "portals": [
    {
     "x": 3.6,
     "y": 21.6,
     "to": "vale",
     "open": true,
     "marker": false
    }
   ],
   "objects": [
    {
     "t": "pine_giant",
     "x": 22.49,
     "y": 13.16,
     "v": 0
    },
    {
     "t": "pine_giant",
     "x": 8.33,
     "y": 7.71,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine_giant",
     "x": 18.09,
     "y": 18.6,
     "v": 2
    },
    {
     "t": "pine_giant",
     "x": 23.87,
     "y": 9.42,
     "v": 0
    },
    {
     "t": "pine_giant",
     "x": 20.92,
     "y": 6.41,
     "v": 1
    },
    {
     "t": "pine_giant",
     "x": 4.35,
     "y": 6.12,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine_giant",
     "x": 11.95,
     "y": 11.44,
     "v": 0
    },
    {
     "t": "pine_giant",
     "x": 12.82,
     "y": 22.32,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 10.63,
     "y": 0.6,
     "v": 3
    },
    {
     "t": "pine",
     "x": 10.41,
     "y": 2.35,
     "v": 0,
     "f": 1
    },
    {
     "t": "pine",
     "x": 15.64,
     "y": 2.47,
     "v": 0
    },
    {
     "t": "pine",
     "x": 16.72,
     "y": 2.69,
     "v": 1
    },
    {
     "t": "pine",
     "x": 8.32,
     "y": 3.51,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 10.4,
     "y": 3.62,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 17.54,
     "y": 3.56,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 16.29,
     "y": 8.74,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 3.33,
     "y": 10.72,
     "v": 1
    },
    {
     "t": "pine",
     "x": 4.57,
     "y": 10.37,
     "v": 3
    },
    {
     "t": "pine",
     "x": 4.65,
     "y": 11.69,
     "v": 2
    },
    {
     "t": "pine",
     "x": 2.74,
     "y": 12.69,
     "v": 0
    },
    {
     "t": "pine",
     "x": 3.7,
     "y": 13.51,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 7.33,
     "y": 13.43,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 2.26,
     "y": 14.42,
     "v": 3
    },
    {
     "t": "pine",
     "x": 5.72,
     "y": 14.39,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 3.63,
     "y": 15.74,
     "v": 0,
     "f": 1
    },
    {
     "t": "pine",
     "x": 2.6,
     "y": 16.72,
     "v": 1,
     "f": 1
    },
    {
     "t": "pine",
     "x": 5.65,
     "y": 16.48,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 22.32,
     "y": 17.69,
     "v": 0,
     "f": 1
    },
    {
     "t": "pine",
     "x": 3.62,
     "y": 18.61,
     "v": 0
    },
    {
     "t": "pine",
     "x": 5.54,
     "y": 18.7,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 10.43,
     "y": 19.48,
     "v": 0
    },
    {
     "t": "pine",
     "x": 7.39,
     "y": 21.64,
     "v": 2
    },
    {
     "t": "pine",
     "x": 8.74,
     "y": 21.65,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine",
     "x": 17.29,
     "y": 22.66,
     "v": 2,
     "f": 1
    },
    {
     "t": "pine",
     "x": 18.43,
     "y": 22.73,
     "v": 1
    },
    {
     "t": "pine",
     "x": 9.28,
     "y": 23.69,
     "v": 3,
     "f": 1
    },
    {
     "t": "pine_young",
     "x": 14.08,
     "y": 18.31,
     "v": 0
    },
    {
     "t": "pine_young",
     "x": 16.6,
     "y": 12.05,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 6.27,
     "y": 17.72,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 7.53,
     "y": 20.04,
     "v": 0
    },
    {
     "t": "pine_young",
     "x": 11.34,
     "y": 18.12,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 15.85,
     "y": 3.8,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 17.41,
     "y": 12.91,
     "v": 0
    },
    {
     "t": "pine_young",
     "x": 16.9,
     "y": 7.68,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 16.22,
     "y": 5.17,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 9.08,
     "y": 20.1,
     "v": 0
    },
    {
     "t": "pine_young",
     "x": 11.68,
     "y": 17.1,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 16.28,
     "y": 13.82,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 10.07,
     "y": 14.89,
     "v": 0
    },
    {
     "t": "pine_young",
     "x": 9.99,
     "y": 18.12,
     "v": 1
    },
    {
     "t": "pine_young",
     "x": 6.09,
     "y": 22.24,
     "v": 2
    },
    {
     "t": "pine_young",
     "x": 7.9,
     "y": 16.13,
     "v": 0
    },
    {
     "t": "log",
     "x": 18.98,
     "y": 12.35,
     "f": 1
    },
    {
     "t": "log",
     "x": 15.96,
     "y": 10.49
    },
    {
     "t": "log",
     "x": 7.31,
     "y": 11.59,
     "f": 1
    },
    {
     "t": "log",
     "x": 19.01,
     "y": 9.59,
     "f": 1
    },
    {
     "t": "stump",
     "x": 15.49,
     "y": 7.29
    },
    {
     "t": "stump",
     "x": 4.41,
     "y": 14.72
    },
    {
     "t": "stump",
     "x": 3.16,
     "y": 9.63
    },
    {
     "t": "stump",
     "x": 17.39,
     "y": 9.33
    },
    {
     "t": "stump",
     "x": 12.51,
     "y": 17.9
    },
    {
     "t": "stump",
     "x": 13.31,
     "y": 16.97
    },
    {
     "t": "rock",
     "x": 21.73,
     "y": 19.27,
     "v": 0
    },
    {
     "t": "rock",
     "x": 17.16,
     "y": 14.07,
     "v": 1
    },
    {
     "t": "rock",
     "x": 8.85,
     "y": 14.88,
     "v": 2
    },
    {
     "t": "rock",
     "x": 7.13,
     "y": 16.65,
     "v": 0
    },
    {
     "t": "rock",
     "x": 9.18,
     "y": 13.79,
     "v": 1
    },
    {
     "t": "rock",
     "x": 7.04,
     "y": 15.14,
     "v": 2
    },
    {
     "t": "mushroom_red",
     "x": 9.14,
     "y": 18.55
    },
    {
     "t": "mushroom_red",
     "x": 11.63,
     "y": 1.95
    },
    {
     "t": "mushroom_red",
     "x": 5.2,
     "y": 17.55
    },
    {
     "t": "mushroom_red",
     "x": 7.04,
     "y": 3.63
    },
    {
     "t": "mushroom_red",
     "x": 7.87,
     "y": 14.87
    },
    {
     "t": "mushroom_red",
     "x": 14.38,
     "y": 17.17
    },
    {
     "t": "mushroom_red",
     "x": 15.82,
     "y": 6.15
    },
    {
     "t": "mushroom_red",
     "x": 4.73,
     "y": 17.91
    },
    {
     "t": "mushroom_red",
     "x": 17.99,
     "y": 23.8
    },
    {
     "t": "mushroom_red",
     "x": 14.49,
     "y": 17.46
    },
    {
     "t": "mushroom_red",
     "x": 14.38,
     "y": 7.35
    },
    {
     "t": "mushroom_red",
     "x": 8.45,
     "y": 13.11
    },
    {
     "t": "mushroom_red",
     "x": 8.5,
     "y": 22.77
    },
    {
     "t": "mushroom_red",
     "x": 16.06,
     "y": 12.77
    },
    {
     "t": "mushroom_red",
     "x": 15.12,
     "y": 9.02
    },
    {
     "t": "mushroom_red",
     "x": 9.25,
     "y": 15.7
    },
    {
     "t": "moss",
     "x": 8.15,
     "y": 19.35,
     "v": 0,
     "f": 1
    },
    {
     "t": "moss",
     "x": 19.23,
     "y": 2.88,
     "v": 1
    },
    {
     "t": "moss",
     "x": 17.02,
     "y": 6.71,
     "v": 2,
     "f": 1
    },
    {
     "t": "moss",
     "x": 2.13,
     "y": 11.36,
     "v": 0,
     "f": 1
    },
    {
     "t": "moss",
     "x": 17.39,
     "y": 4.74,
     "v": 1
    },
    {
     "t": "grass",
     "x": 5.96,
     "y": 13.3
    },
    {
     "t": "grass",
     "x": 7.97,
     "y": 17.27
    },
    {
     "t": "grass",
     "x": 9.35,
     "y": 3.09
    },
    {
     "t": "grass",
     "x": 15.48,
     "y": 12.38
    },
    {
     "t": "grass",
     "x": 12.35,
     "y": 7.59
    },
    {
     "t": "grass",
     "x": 12.2,
     "y": 7.49
    },
    {
     "t": "grass",
     "x": 8.85,
     "y": 16.69
    },
    {
     "t": "grass",
     "x": 17.04,
     "y": 5.66
    },
    {
     "t": "grass",
     "x": 16.42,
     "y": 6.12
    },
    {
     "t": "grass",
     "x": 14.76,
     "y": 7.9
    },
    {
     "t": "grass",
     "x": 12.76,
     "y": 7.15
    },
    {
     "t": "grass",
     "x": 5.54,
     "y": 10.97
    },
    {
     "t": "sunbeam",
     "x": 14.6,
     "y": 15.4
    },
    {
     "t": "sunbeam",
     "x": 9.6,
     "y": 16.8
    },
    {
     "t": "sunbeam",
     "x": 15.4,
     "y": 9.2
    },
    {
     "t": "fox",
     "x": 15.8,
     "y": 16.2
    },
    {
     "t": "fox",
     "x": 12.4,
     "y": 16.8
    },
    {
     "t": "fox",
     "x": 18.4,
     "y": 13.6
    },
    {
     "t": "rabbit",
     "x": 11.2,
     "y": 13.2
    },
    {
     "t": "rabbit",
     "x": 16.6,
     "y": 17.6
    },
    {
     "t": "rabbit",
     "x": 9.2,
     "y": 11.4
    },
    {
     "t": "rabbit",
     "x": 19.6,
     "y": 16.4
    },
    {
     "t": "rabbit",
     "x": 6.8,
     "y": 16.8
    },
    {
     "t": "chest",
     "x": 13.2,
     "y": 3,
     "tier": "silver"
    },
    {
     "t": "shrine",
     "x": 6.8,
     "y": 19.2
    },
    {
     "t": "tablet",
     "x": 4.6,
     "y": 17.2,
     "title": "Warden stone",
     "text": "The Wardens planted the first pines to hold the Gloam back. Now the roots are black."
    }
   ],
   "objective": "Explore the pinewood. Something big lives to the north.",
   "triggers": [
    {
     "id": "ogres",
     "name": "Ogres in the clearing",
     "when": {
      "type": "enter_area",
      "x": 13.8,
      "y": 14.6,
      "r": 2.6
     },
     "actions": [
      {
       "type": "banner",
       "title": "Ogres!",
       "sub": "Lesser brutes guard the sunlit clearing"
      },
      {
       "type": "objective",
       "text": "Defeat the ogres"
      },
      {
       "type": "spawn",
       "enemy": "ogre",
       "count": 3,
       "x": 15,
       "y": 11.5,
       "radius": 2
      }
     ]
    },
    {
     "id": "ogres_done",
     "name": "Ogres defeated",
     "when": {
      "type": "all_enemies_dead"
     },
     "requires": [
      "ogres"
     ],
     "actions": [
      {
       "type": "message",
       "text": "Heavy footsteps echo from the north..."
      },
      {
       "type": "objective",
       "text": "Find the trolls' den (north)"
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
     "id": "trolls",
     "name": "Troll den",
     "when": {
      "type": "enter_area",
      "x": 13.6,
      "y": 7.5,
      "r": 2.6
     },
     "requires": [
      "ogres_done"
     ],
     "actions": [
      {
       "type": "banner",
       "title": "Mountain Trolls",
       "sub": "Giants of the misty pinewood",
       "boss": true
      },
      {
       "type": "objective",
       "text": "Defeat the trolls"
      },
      {
       "type": "wait",
       "seconds": 1.2
      },
      {
       "type": "spawn",
       "enemy": "troll",
       "count": 2,
       "x": 13.2,
       "y": 3.6,
       "radius": 1.6
      },
      {
       "type": "spawn",
       "enemy": "ogre",
       "count": 2,
       "x": 13.4,
       "y": 5.6,
       "radius": 2
      }
     ]
    },
    {
     "id": "calm",
     "name": "The wood is calm",
     "when": {
      "type": "all_enemies_dead"
     },
     "requires": [
      "trolls"
     ],
     "actions": [
      {
       "type": "banner",
       "title": "The pinewood is calm",
       "sub": "The animals creep back into the light"
      },
      {
       "type": "heal",
       "pct": 50
      },
      {
       "type": "objective",
       "text": "Rest here, or take the rift home (SW)"
      },
      {
       "type": "sound",
       "name": "heal"
      },
      {
       "type": "loot",
       "rarity": "rare",
       "count": 1
      }
     ]
    }
   ],
   "level": [
    3,
    10
   ]
  }
 },
 "tuning": {},
 "enemies": {
  "ogre": {
   "name": "Ogre",
   "ai": "brute",
   "hp": 420,
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
   "hp": 1500,
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
