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
   ]
  }
 },
 "tuning": {}
};
