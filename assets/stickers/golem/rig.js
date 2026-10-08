// Approved rock-arm assembly and two-arm slam. Coordinates use the 720 × 560 preview.
window.GOLEM_STICKER = {
  "source": "assets/stickers/golem/golem-parts.png",
  "image": "assets/stickers/golem/assembled.png",
  "canvas": {
    "width": 256,
    "height": 224
  },
  "neutralBounds": [
    48,
    71,
    199,
    175
  ],
  "uiBounds": [
    46,
    69,
    155,
    108
  ],
  "assembly": {
    "width": 720,
    "height": 560,
    "displayWidth": 240,
    "left": 8,
    "bottom": 200.66666666666666
  },
  "centre": {
    "part": 1,
    "fraction": [
      0.5,
      0.67
    ]
  },
  "parts": [
    {
      "id": "leftArm",
      "motion": "arms",
      "image": "assets/stickers/golem/left-arm.png",
      "rect": [
        345.7671946042891,
        263.54996660534675,
        150.29100674463865,
        212.85809699009215
      ],
      "pivot": [
        0.8,
        0.035
      ],
      "angle": -35
    },
    {
      "id": "body",
      "image": "assets/stickers/golem/body.png",
      "crop": [
        641,
        0,
        1523,
        731
      ],
      "rect": [
        178.06351395913183,
        166,
        373.0777732548519,
        309.3178850583598
      ]
    },
    {
      "id": "rightArm",
      "motion": "arms",
      "image": "assets/stickers/golem/right-arm.png",
      "rect": [
        121.83033890229098,
        260.08774176419263,
        156.55313202566526,
        221.72718436467932
      ],
      "pivot": [
        0.69,
        0.164
      ],
      "angle": 0
    }
  ],
  "poseFields": [
    "arms",
    "scaleX",
    "scaleY"
  ],
  "idle": {
    "duration": 2.4,
    "steps": 24,
    "values": {
      "arms": -1
    },
    "scaleX": 0.002,
    "scaleY": 0.004
  },
  "attack": {
    "anticipation": 0.6,
    "recovery": 0.26,
    "start": 0.24,
    "impact": 1.32,
    "end": 1.96,
    "sampleStep": 0.04,
    "fastStart": 1.16,
    "keys": [
      {
        "time": 0,
        "arms": 0,
        "scaleX": 1,
        "scaleY": 1
      },
      {
        "time": 0.24,
        "arms": 0,
        "scaleX": 1,
        "scaleY": 1
      },
      {
        "time": 0.44,
        "arms": 7,
        "scaleX": 1.002,
        "scaleY": 0.995
      },
      {
        "time": 1.04,
        "arms": -165,
        "scaleX": 0.997,
        "scaleY": 1.006
      },
      {
        "time": 1.16,
        "arms": -165,
        "scaleX": 0.997,
        "scaleY": 1.006
      },
      {
        "time": 1.32,
        "arms": 5,
        "scaleX": 1.012,
        "scaleY": 0.982
      },
      {
        "time": 1.4,
        "arms": 5,
        "scaleX": 1.015,
        "scaleY": 0.978
      },
      {
        "time": 1.56,
        "arms": -7,
        "scaleX": 0.996,
        "scaleY": 1.008
      },
      {
        "time": 1.72,
        "arms": 2,
        "scaleX": 1.003,
        "scaleY": 0.995
      },
      {
        "time": 1.96,
        "arms": 0,
        "scaleX": 1,
        "scaleY": 1
      },
      {
        "time": 2.8,
        "arms": 0,
        "scaleX": 1,
        "scaleY": 1
      }
    ],
    "effects": {
      "duration": 0.38,
      "contacts": [
        [
          192,
          477
        ],
        [
          515,
          477
        ]
      ]
    }
  }
};
