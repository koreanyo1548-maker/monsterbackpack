// Approved sword swing with fixed centre and guide layer order. Coordinates use the 720 × 620 preview.
window.SKELETON_STICKER = {
  "source": "assets/stickers/skeleton/skeleton-parts.png",
  "image": "assets/stickers/skeleton/assembled.png",
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
  "foot": 170.46732699562622,
  "parts": [
    {
      "id": "sword-arm",
      "motion": "sword",
      "image": "assets/stickers/skeleton/sword-arm.png",
      "crop": [
        0,
        0,
        629,
        887
      ],
      "rect": [
        59.5,
        48.71011150086835,
        306.833579216023,
        432.4019809868787
      ],
      "pivot": [
        0.8744,
        0.5299
      ]
    },
    {
      "id": "body",
      "image": "assets/stickers/skeleton/body.png",
      "crop": [
        620,
        0,
        1197,
        887
      ],
      "rect": [
        283.73240510793926,
        37,
        280.84535281716524,
        432.4019809868787
      ]
    },
    {
      "id": "shield-arm",
      "motion": "shield",
      "image": "assets/stickers/skeleton/shield-arm.png",
      "crop": [
        1244,
        0,
        1774,
        887
      ],
      "rect": [
        441.373232099292,
        42.85525587538719,
        258.126767900708,
        432.4019809868787
      ],
      "pivot": [
        0.2057,
        0.5254
      ]
    }
  ],
  "poseFields": [
    "sword",
    "shield",
    "scaleX",
    "scaleY"
  ],
  "idle": {
    "duration": 2.4,
    "steps": 24,
    "values": {
      "sword": 1,
      "shield": -0.7
    },
    "scaleX": 0.002,
    "scaleY": 0.004
  },
  "attack": {
    "anticipation": 0.4,
    "recovery": 0.26,
    "start": 0.16,
    "impact": 0.92,
    "end": 1.6,
    "sampleStep": 0.04,
    "fastStart": 0.72,
    "keys": [
      {
        "time": 0,
        "sword": 0,
        "shield": 0,
        "scaleX": 1,
        "scaleY": 1
      },
      {
        "time": 0.16,
        "sword": 0,
        "shield": 0,
        "scaleX": 1,
        "scaleY": 1
      },
      {
        "time": 0.56,
        "sword": 66,
        "shield": 7,
        "scaleX": 0.998,
        "scaleY": 1.003
      },
      {
        "time": 0.72,
        "sword": 66,
        "shield": 7,
        "scaleX": 0.998,
        "scaleY": 1.003
      },
      {
        "time": 0.92,
        "sword": -65,
        "shield": -5,
        "scaleX": 1.006,
        "scaleY": 0.995
      },
      {
        "time": 1.04,
        "sword": -71,
        "shield": -6,
        "scaleX": 1.003,
        "scaleY": 0.998
      },
      {
        "time": 1.6,
        "sword": 0,
        "shield": 0,
        "scaleX": 1,
        "scaleY": 1
      },
      {
        "time": 2.24,
        "sword": 0,
        "shield": 0,
        "scaleX": 1,
        "scaleY": 1
      }
    ]
  },
  "neutralBounds": [
    42,
    29,
    214,
    171
  ],
  "uiBounds": [
    40,
    27,
    176,
    146
  ]
};
