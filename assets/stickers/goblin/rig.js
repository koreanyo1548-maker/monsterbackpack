// Approved goblin assembly, drawing-arm motion and archery geometry.
window.GOBLIN_STICKER = {
  "source": "assets/stickers/goblin/goblin-parts.png",
  "image": "assets/stickers/goblin/assembled.png",
  "canvas": {
    "width": 256,
    "height": 224
  },
  "assembly": {
    "width": 720,
    "height": 620,
    "displayWidth": 240,
    "left": 8,
    "bottom": 220.66666666666666
  },
  "centre": {
    "part": 1,
    "fraction": [
      0.5,
      0.67
    ]
  },
  "foot": 183.96282161685613,
  "neutralBounds": [
    24,
    29,
    229,
    199
  ],
  "uiBounds": [
    22,
    27,
    209,
    174
  ],
  "parts": [
    {
      "id": "bow-arm",
      "image": "assets/stickers/goblin/bow-arm.png",
      "rect": [
        362.9763766675706,
        32,
        255.6551736449674,
        568.3133319788462
      ],
      "sourceSize": [
        399,
        887
      ],
      "crop": [
        1251,
        0,
        1650,
        887
      ],
      "pivot": [
        0.2,
        0.6
      ],
      "angle": -8,
      "motion": "bowAngle"
    },
    {
      "id": "body",
      "image": "assets/stickers/goblin/body.png",
      "rect": [
        35.49903475275881,
        35.495052863252624,
        486.8979246219782,
        475.03448416567704
      ],
      "sourceSize": [
        760,
        741
      ],
      "crop": [
        499,
        0,
        1259,
        741
      ]
    },
    {
      "id": "arrow",
      "image": "assets/stickers/goblin/arrow.png",
      "rect": [
        243.4222097919219,
        316.156393958534,
        452.5777902080781,
        86.37035135339617
      ],
      "sourceSize": [
        706,
        135
      ],
      "crop": [
        572,
        733,
        1278,
        868
      ]
    },
    {
      "id": "drawing-arm",
      "image": "assets/stickers/goblin/drawing-arm.png",
      "rect": [
        113.86804291627314,
        316.156393958534,
        259.1083337512975,
        158.92044541657705
      ],
      "sourceSize": [
        405,
        248
      ],
      "crop": [
        191,
        402,
        596,
        650
      ],
      "pivot": [
        0.25,
        0.42
      ],
      "motion": "drawAngle"
    }
  ],
  "poseFields": [
    "bowAngle",
    "drawAngle",
    "forearm",
    "scaleX",
    "scaleY"
  ],
  "idle": {
    "duration": 2.4,
    "steps": 24,
    "values": {
      "bowAngle": 0,
      "drawAngle": 0
    },
    "scaleX": 0.002,
    "scaleY": 0.004
  },
  "attack": {
    "projectile": true,
    "anticipation": 0.4,
    "recovery": 0.26,
    "start": 0.16,
    "impact": 1,
    "end": 1.84,
    "sampleStep": 0.04,
    "keys": [
      {
        "time": 0,
        "bowAngle": 0,
        "drawAngle": 0,
        "forearm": 1,
        "scaleX": 1,
        "scaleY": 1
      },
      {
        "time": 0.16,
        "bowAngle": 0,
        "drawAngle": 0,
        "forearm": 1,
        "scaleX": 1,
        "scaleY": 1
      },
      {
        "time": 0.4,
        "bowAngle": -7,
        "drawAngle": -9,
        "forearm": 0.97,
        "scaleX": 1,
        "scaleY": 1
      },
      {
        "time": 0.76,
        "bowAngle": -7,
        "drawAngle": -11,
        "forearm": 0.68,
        "scaleX": 0.998,
        "scaleY": 1.002
      },
      {
        "time": 1,
        "bowAngle": -7,
        "drawAngle": -11,
        "forearm": 0.68,
        "scaleX": 0.998,
        "scaleY": 1.002
      },
      {
        "time": 1.08,
        "bowAngle": -5,
        "drawAngle": -12,
        "forearm": 0.64,
        "scaleX": 1.004,
        "scaleY": 0.996
      },
      {
        "time": 1.24,
        "bowAngle": -3,
        "drawAngle": -6,
        "forearm": 0.85,
        "scaleX": 1.002,
        "scaleY": 0.998
      },
      {
        "time": 1.56,
        "bowAngle": 0,
        "drawAngle": 0,
        "forearm": 1,
        "scaleX": 1,
        "scaleY": 1
      },
      {
        "time": 1.92,
        "bowAngle": 0,
        "drawAngle": 0,
        "forearm": 1,
        "scaleX": 1,
        "scaleY": 1
      }
    ]
  },
  "archery": {
    "bowPart": 0,
    "bodyPart": 1,
    "arrowPart": 2,
    "drawingPart": 3,
    "drawingFinger": [
      0.68,
      0.31
    ],
    "forearmStartPx": 120,
    "handStartPx": 225,
    "bowTipsPx": [
      [
        195,
        245
      ],
      [
        206,
        782
      ]
    ],
    "bowGripPx": [
      311,
      554
    ],
    "arrowNockPx": [
      78,
      77
    ],
    "stringStart": 0.16,
    "stringEnd": 1.6,
    "stringFadeIn": 0.16,
    "stringFadeOut": 0.36,
    "stringSnapDuration": 0.06,
    "reloadStart": 1.56,
    "reloadDuration": 0.2
  }
};
