// Approved raised staff cast, fixed centre and original guide layer order.
window.MAGE_STICKER = {
  "source": "assets/stickers/mage/mage-parts.png",
  "image": "assets/stickers/mage/assembled.png",
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
  "foot": 171.1290889668627,
  "parts": [
    {
      "id": "staff-arm",
      "motion": "staff",
      "image": "assets/stickers/mage/staff-arm.png",
      "crop": [
        1182,
        0,
        1774,
        887
      ],
      "rect": [
        378.08395739296276,
        45.189419847822975,
        297.9160426070373,
        446.4744549835327
      ],
      "pivot": [
        0.135,
        0.62
      ]
    },
    {
      "id": "body",
      "image": "assets/stickers/mage/body.png",
      "crop": [
        461,
        0,
        1201,
        887
      ],
      "rect": [
        150.02815440901588,
        38,
        372.59839856090207,
        446.4744549835327
      ]
    },
    {
      "id": "open-arm",
      "motion": "hand",
      "image": "assets/stickers/mage/open-arm.png",
      "crop": [
        0,
        429,
        453,
        887
      ],
      "rect": [
        36,
        268.8469954640909,
        228.0558029839469,
        230.42664733958935
      ],
      "pivot": [
        0.8,
        0.32
      ]
    }
  ],
  "poseFields": [
    "staff",
    "hand",
    "scaleX",
    "scaleY"
  ],
  "idle": {
    "duration": 2.4,
    "steps": 24,
    "values": {
      "staff": -0.7,
      "hand": 1
    },
    "scaleX": 0.002,
    "scaleY": 0.004
  },
  "attack": {
    "projectile": true,
    "anticipation": 0.48,
    "recovery": 0.26,
    "start": 0.16,
    "impact": 0.96,
    "end": 1.64,
    "sampleStep": 0.04,
    "fastStart": 0.84,
    "keys": [
      {
        "time": 0,
        "staff": 0,
        "hand": 0,
        "scaleX": 1,
        "scaleY": 1
      },
      {
        "time": 0.16,
        "staff": 0,
        "hand": 0,
        "scaleX": 1,
        "scaleY": 1
      },
      {
        "time": 0.64,
        "staff": -35,
        "hand": 15,
        "scaleX": 0.998,
        "scaleY": 1.004
      },
      {
        "time": 0.84,
        "staff": -35,
        "hand": 15,
        "scaleX": 0.998,
        "scaleY": 1.004
      },
      {
        "time": 0.96,
        "staff": 4,
        "hand": -8,
        "scaleX": 1.006,
        "scaleY": 0.995
      },
      {
        "time": 1.08,
        "staff": 6,
        "hand": -10,
        "scaleX": 1.003,
        "scaleY": 0.998
      },
      {
        "time": 1.64,
        "staff": 0,
        "hand": 0,
        "scaleX": 1,
        "scaleY": 1
      },
      {
        "time": 2.24,
        "staff": 0,
        "hand": 0,
        "scaleX": 1,
        "scaleY": 1
      }
    ]
  },
  "spell": {
    "staffPart": 0,
    "crystal": [
      0.683,
      0.397
    ],
    "colours": [
      [
        0,
        "#fff4ff"
      ],
      [
        0.15,
        "#edc7ff"
      ],
      [
        0.5,
        "#b766eeb0"
      ],
      [
        1,
        "#9f48df00"
      ]
    ],
    "charge": {
      "start": 0.16,
      "duration": 0.48,
      "pulseAmount": 0.05,
      "pulseRate": 22,
      "radius": 20,
      "radiusGain": 25,
      "alpha": 0.8,
      "ringAlpha": 0.7,
      "ringColour": "#b576d8",
      "lineWidth": 1.7,
      "ringRadius": [
        25,
        13
      ],
      "ringGain": [
        12,
        7
      ],
      "ringAngle": -0.3,
      "ringSpeed": 2,
      "sparks": 3,
      "sparkSpeed": 3,
      "sparkOrbit": [
        34,
        25
      ],
      "sparkColour": "#edd0ff",
      "sparkRadius": 2.5
    },
    "flash": {
      "duration": 0.24,
      "radius": 52,
      "radiusDecay": 30,
      "alpha": 0.85
    }
  },
  "neutralBounds": [
    35,
    29,
    221,
    174
  ],
  "uiBounds": [
    33,
    27,
    190,
    149
  ]
};
