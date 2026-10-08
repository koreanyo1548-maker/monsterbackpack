// Sprite assets: image paths, sticker rigs and the <img> helpers used by the prepare and battle screens.
'use strict';
const ASSETS={'slime':'assets/stickers/slime/game.png','fireSlime':'assets/stickers/fireSlime/game.png','goblin':'assets/stickers/goblin/assembled.png','golem':'assets/stickers/golem/assembled.png','mage':'assets/stickers/mage/assembled.png','skeleton':'assets/stickers/skeleton/assembled.png','orc':'assets/stickers/orc/assembled.png','fire':'assets/materials/fire.png','water':'assets/materials/water.png','poison':'assets/materials/poison.png','panel':'assets/ui/panel.png','card':'assets/ui/card.png','button':'assets/ui/button.png','secondary':'assets/ui/secondary.png','cell':'assets/ui/cell.png','battlefield':'assets/backgrounds/battlefield.png','backdrop':'assets/backgrounds/backdrop.png'};
const orcSticker=createStickerRenderer(window.ORC_STICKER);
const golemSticker=createStickerRenderer(window.GOLEM_STICKER);
const goblinSticker=createStickerRenderer(window.GOBLIN_STICKER,createArcherComposer(window.GOBLIN_STICKER));
const skeletonSticker=createStickerRenderer(window.SKELETON_STICKER);
const mageSticker=createStickerRenderer(window.MAGE_STICKER,createMageComposer(window.MAGE_STICKER));
const stickerRigs={orc:{data:window.ORC_STICKER,renderer:orcSticker},golem:{data:window.GOLEM_STICKER,renderer:golemSticker},goblin:{data:window.GOBLIN_STICKER,renderer:goblinSticker},skeleton:{data:window.SKELETON_STICKER,renderer:skeletonSticker},mage:{data:window.MAGE_STICKER,renderer:mageSticker}};
const imgFor=p=>p.type==='slime'&&['fire','steam','blast'].includes(p.aff)?'fireSlime':D[p.type]?.asset||p.type;
function filterFor(p){if(D[p.type]?.fx)return D[p.type].fx;if(p.type==='curse')return 'grayscale(.85) brightness(.5) contrast(1.15)';if(p.type==='life')return 'hue-rotate(255deg) saturate(.8)';if(!p.aff||p.aff==='none')return '';if(p.type==='slime'&&p.aff==='fire')return '';if(p.type==='slime'&&p.aff==='steam')return 'hue-rotate(155deg)';if(p.type==='slime'&&p.aff==='blast')return 'hue-rotate(40deg) saturate(1.2)';return AFF[p.aff].filter;}
function pic(p,cls=''){return `<img class="${cls}" src="${ASSETS[imgFor(p)]}" style="filter:${filterFor(p)}" alt="${D[p.type]?.name||p.type}" draggable="false">`;}
