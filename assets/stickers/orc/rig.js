// Source crop and layer order come from 설명서.pptx; pivots and poses match the approved preview.
window.ORC_STICKER = {
  source: 'assets/stickers/orc/orc-parts.png',
  image: 'assets/stickers/orc/assembled.png',
  canvas: { width: 256, height: 224 },
  neutralBounds: [41,57,214,162],
  uiBounds: [39,55,177,109],
  assembly: { width: 1952625, height: 1365250, displayWidth: 190, left: 33, bottom: 176 },
  centre: { part: 1, fraction: [.45, .67] },
  parts: [
    { id: 'sword', image: 'assets/stickers/orc/sword-arm.png', crop: [0,0,651,887], rect: [0,50800,965200,1314450], pivot: [.86,.45] },
    { id: 'body', image: 'assets/stickers/orc/body.png', crop: [651,0,1251,887], rect: [692150,0,889000,1314450] },
    { id: 'freeArm', image: 'assets/stickers/orc/free-arm.png', crop: [1273,0,1774,887], rect: [1209675,0,742950,1314450], pivot: [.18,.43] }
  ],
  idle: { duration: 2.4, steps: 24, sword: 1.5, freeArm: -1.1, scaleX: .003, scaleY: .006 },
  attack: {
    anticipation: .32, recovery: .26, start: .28, impact: .88, end: 1.6,
    sampleStep: .04, freeArmDelay: .06, fastStart: .72,
    keys: [
      { time: 0, sword: 0, bodyAngle: 0, freeArm: 0 },
      { time: .28, sword: 0, bodyAngle: 0, freeArm: 0 },
      { time: .72, sword: 70, bodyAngle: 2.8, freeArm: -8 },
      { time: .88, sword: -32, bodyAngle: -2, freeArm: 6 },
      { time: 1, sword: -29, bodyAngle: -1.2, freeArm: 4.5 },
      { time: 1.14, sword: -17, bodyAngle: .6, freeArm: -2 },
      { time: 1.32, sword: -6, bodyAngle: -.35, freeArm: 1.5 },
      { time: 1.52, sword: 0, bodyAngle: 0, freeArm: 0 }
    ]
  }
};
