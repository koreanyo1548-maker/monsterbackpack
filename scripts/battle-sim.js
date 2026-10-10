// Battle simulation core: combat rules only. No DOM, canvas, audio or timers, so it can run headless
// (tools/balance.mjs) and be ported to another engine.
//
// createBattle(setup) turns a plain description of the bag (see below) into a ready battle; step(battle, dt) advances it.
//   setup = {seed, wave, cols, open: [bool per cell], cellPiece: [piece id or null per cell, materials excluded],
//            groups: [{type, aff, pieces: [{id, cells: [cell index], power: {hp, atk, rate}}]}]}
//
// The view reacts through `battle.listener`; every method is optional and is called inline, at the exact point
// the rule fires, so the order of random draws never depends on whether a view is attached:
//   hit(target, source, amount, dot)   hp was reduced        shieldAbsorb(target)       a barrier soaked a hit
//   died(target)                       unit reached 0 hp     revived(target)            hp refilled instead of dying
//   effect(kind, at)                   'heal' | 'burst' | 'shield' at at.x/at.y
//   skill(kind, pc, unit)              'revive' | 'rage' | 'slimeBurst' | 'volley' | 'barrier'; pc is the bag piece or null,
//                                      unit is the unit the skill belongs to (where the view draws it)
//   status(target, kind, source)       a hit applied 'burn' | 'slow' | 'poison' to target
//   impact(source, target)             a melee/projectile hit landed
//   attack(unit, target, nx, ny)       a unit started an attack (nx/ny = unit direction to the target)
//   moved(unit, dt)                    a unit walked this tick  projectile(p) / projectileMoved(p)
//   ended(won)                         the battle is decided
//
// Combat randomness comes from the sim's own seeded stream (seed() before building the units), never Math.random,
// so a battle replays identically whatever the view does with its own random effects.
window.createBattleSim = function createBattleSim(data) {
  const unitDefs = data.units, ENEMY = data.enemies, ELEM = data.elements, scaling = data.scaling;
  const {width: W, height: H} = data.field;
  const NOBODY = {};
  const on = b => b.listener || NOBODY;
  let unitId = 1;
  let rand = Math.random;
  // mulberry32: small, fast and identical in any language, so a port can reproduce battles from the seed.
  function seed(n) {
    let a = n >>> 0;
    rand = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function unit(type, team, x, y, opts = {}) {
    const d = unitDefs[type] || {hp: type === 'orc' ? 155 : 64, atk: type === 'orc' ? 15 : 7, rate: type === 'orc' ? .55 : .8, range: 22, speed: type === 'orc' ? 25 : 33};
    const u = {id: unitId++, type, team, x, y, hp: d.hp, maxHp: d.hp, atk: d.atk, rate: d.rate, range: d.range, speed: d.speed, aff: 'none', cd: rand() * .6, flash: 0, swing: 0, dir: team === 0 ? 1 : -1, burn: 0, burnDps: 0, poison: 0, poisonDps: 0, stacks: 0, slow: 0, healClock: 0, moving: false, deadFor: 0, boss: false, windup: d.windup || 0, recovery: d.recovery || 0, ...opts};
    u.maxHp = u.hp;
    return u;
  }

  function elemMult(target, els) {
    const e = target.team === 1 ? ENEMY[target.type] : null;
    if (!e || !els.length) return 1;
    if (els.includes(e.weak)) return 1.5;
    if (els.includes(e.res)) return .5;
    return 1;
  }

  // Body size drives collisions and melee reach (the sprite is drawn at the same size).
  const bodySize = u => u.boss ? 76 : u.type === 'golem' ? 57 : u.type === 'orc' ? 43 : u.type === 'slime' ? 35 : 39;
  const rad = u => bodySize(u) * .4;
  const isMelee = u => u.range <= 60;
  // Melee reach is body-to-body: units stop when their bodies touch instead of stacking inside each other.
  const reachOf = (u, v) => isMelee(u) ? rad(u) + rad(v) + (u.range - 22) * .5 + 3 : u.range;

  // Units with a rigged attack animation need their wind-up and follow-through to play at 1x. `windup` and `recovery`
  // (seconds, from the data) are the rig's natural lengths; both shrink together only when a faster attack rate
  // (buffs) leaves the cycle too short to hold them.
  const fitOf = u => u.windup > 0 ? Math.min(1, 1 / u.rate / (u.windup + (u.recovery || 0))) : 1;
  const windupOf = u => u.windup > 0 ? u.windup * fitOf(u) : 0;
  const recoveryOf = u => (u.recovery || 0) * fitOf(u);
  const pstat = (b, pid) => b.stats.by[pid] ??= {dmg: 0, kills: 0, skills: 0};

  function chain(b, pc, kind, ids = [], at = null) {
    pstat(b, pc.pid).skills++;
    pc.pulse = b.time;
    for (const id of ids) {
      const o = b.pieceList.find(x => x.pid === id);
      if (o) o.pulse = b.time;
    }
    on(b).skill?.(kind, pc, at);
  }

  function hit(b, target, amount, source, dot = false) {
    if (target.hp <= 0) return;
    if (target.trait === 'armor') amount *= .75;
    if (!dot && target.shield > 0) {
      const absorbed = Math.min(target.shield, amount);
      target.shield -= absorbed;
      amount -= absorbed;
      on(b).shieldAbsorb?.(target);
      if (amount <= .01) return;
    }
    target.hp -= amount;
    on(b).hit?.(target, source, amount, dot);
    if (source.team === 0) {
      b.stats.damage += amount;
      if (source.pid) pstat(b, source.pid).dmg += amount;
    }
    if (target.hp > 0) return;
    const rv = target.trait === 'revive' ? .4 : target.team === 0 && target.type === 'skeleton' ? .3 : 0;
    if (rv && !target.revived) {
      target.revived = true;
      target.hp = target.maxHp * rv;
      on(b).revived?.(target);
      const rp = target.pid && b.pieceList.find(x => x.pid === target.pid);
      if (rp) chain(b, rp, 'revive', [], target);
      else on(b).skill?.('revive', null, target);
      return;
    }
    target.hp = 0;
    if (target.team === 1) {
      b.stats.kills++;
      if (source.pid) pstat(b, source.pid).kills++;
    }
    on(b).died?.(target);
    onDeath(b, target);
  }

  function impact(b, source, target, mult = 1) {
    if (target.hp <= 0) return;
    const em = elemMult(target, ELEM[source.aff] || []);
    hit(b, target, source.atk * mult * em, source);
    if (em > 1 && source.team === 0) b.stats.weak = (b.stats.weak || 0) + 1;
    const a = source.aff;
    if (['fire', 'steam', 'blast'].includes(a)) {
      target.burn = 3;
      target.burnDps = Math.max(target.burnDps, source.atk * .2);
      target.dotSource = source;
      on(b).status?.(target, 'burn', source);
    }
    if (['water', 'steam', 'spring'].includes(a)) {
      target.slow = 2;
      on(b).status?.(target, 'slow', source);
    }
    if (['poison', 'plague', 'blast'].includes(a)) {
      target.poison = 4;
      target.stacks = Math.min(3, target.stacks + 1);
      target.poisonDps = Math.max(target.poisonDps, source.atk * .1);
      target.dotSource = source;
      on(b).status?.(target, 'poison', source);
    }
    on(b).impact?.(source, target);
    if (source.type === 'mage' || source.type === 'orc' || source.boss)
      for (const u of b.units)
        if (u !== target && u.team !== source.team && u.hp > 0 && Math.hypot(u.x - target.x, u.y - target.y) < (source.boss ? 46 : source.type === 'orc' ? 36 : 42))
          hit(b, u, source.atk * .55, source);
  }

  // Melee units claim one of a limited number of slots around a target (3, boss 7); the rest spread to other enemies.
  function pickTarget(b, u, units, dt) {
    u.retarget = (u.retarget || 0) - dt;
    const t = u.target;
    if (t && t.hp > 0 && u.retarget > 0) return t;
    let best = null, score = Infinity;
    const eg = b.engaged;
    for (const v of units) {
      if (v.hp <= 0 || v.team === u.team) continue;
      let s = Math.hypot(u.x - v.x, u.y - v.y);
      if (isMelee(u) && v !== t && (eg.get(v) || 0) >= (v.boss ? 7 : 3)) s += 220;
      if (s < score) { score = s; best = v; }
    }
    if (isMelee(u) && best !== t) {
      if (t && t.hp > 0) eg.set(t, Math.max(0, (eg.get(t) || 0) - 1));
      if (best) eg.set(best, (eg.get(best) || 0) + 1);
    }
    u.target = best;
    u.retarget = .45 + rand() * .3;
    return best;
  }

  function launchProjectile(b, source, target, kind, mult = 1) {
    const p = {x: source.x, y: source.y - 9, source, target, kind, t: 2};
    if (mult !== 1) p.mult = mult;
    b.projectiles.push(p);
    on(b).projectile?.(p);
  }

  // Triggered effects: slime -> poison burst on death, goblin -> volley when an adjacent ally falls.
  function onDeath(b, dead) {
    if (dead.team !== 0 || !dead.pid) return;
    const pc = b.pieceList.find(x => x.pid === dead.pid);
    if (dead.type === 'slime') {
      let n = 0;
      for (const u of b.units)
        if (u.team === 1 && u.hp > 0 && Math.hypot(u.x - dead.x, u.y - dead.y) < 44) {
          hit(b, u, dead.atk * .8, dead);
          u.poison = 4;
          u.stacks = Math.min(3, u.stacks + 1);
          u.poisonDps = Math.max(u.poisonDps, dead.atk * .1);
          u.dotSource = dead;
          n++;
        }
      on(b).effect?.('burst', dead);
      if (n && pc && b.time - (pc.lastBurst || -9) > .8) {
        pc.lastBurst = b.time;
        chain(b, pc, 'slimeBurst', [], dead);
      }
    }
    for (const g of b.pieceList) {
      if (g.type !== 'goblin' || g.icd > 0 || !b.adj.get(g.pid)?.has(dead.pid)) continue;
      const gob = b.units.find(u => u.pid === g.pid && u.hp > 0);
      if (!gob) continue;
      const foes = b.units.filter(u => u.team === 1 && u.hp > 0).sort((p, q) => Math.hypot(p.x - gob.x, p.y - gob.y) - Math.hypot(q.x - gob.x, q.y - gob.y)).slice(0, 3);
      if (!foes.length) continue;
      g.icd = 3;
      for (const t of foes) launchProjectile(b, gob, t, 'arrow', 1.2);
      chain(b, g, 'volley', [dead.pid], gob);
    }
  }

  // Mage -> periodic barrier on itself and adjacent pieces.
  function skillTick(b, dt) {
    for (const pc of b.pieceList) {
      if (pc.icd > 0) pc.icd = Math.max(0, pc.icd - dt);
      const caster = pc.type === 'mage' ? b.units.find(u => u.pid === pc.pid && u.hp > 0) : null;
      if (!caster) continue;
      pc.skillCd -= dt;
      if (pc.skillCd > 0) continue;
      pc.skillCd = 8;
      const ids = new Set([pc.pid, ...(b.adj.get(pc.pid) || [])]);
      let n = 0;
      for (const u of b.units)
        if (u.team === 0 && u.hp > 0 && ids.has(u.pid)) {
          u.shield = Math.min(u.maxHp * .4, (u.shield || 0) + u.maxHp * .2);
          u.shieldT = 5;
          on(b).effect?.('shield', u);
          n++;
        }
      if (n) chain(b, pc, 'barrier', [...ids], caster);
    }
  }

  // ---- Battle setup: bag layout -> battlefield units ----
  const groupBonus = n => data.groupBonus[n >= 1 && n < 5 ? n - 1 : 4];
  const eHp = w => Math.pow(scaling.enemyHpGrowth, w - 1) * data.tune[w - 1].hp;
  const eAtk = w => Math.pow(scaling.enemyAtkGrowth, w - 1) * data.tune[w - 1].atk;
  const formation = n => { const t = Math.max(0, Math.min(1, (n - 6) / 40)); return {sx: 42 + 22 * t, gap: 40 + 32 * t}; };
  const neighbors = (i, c, n) => [i % c > 0 ? i - 1 : -1, i % c < c - 1 ? i + 1 : -1, i - c, i + c].filter(j => j >= 0 && j < n);

  const enemyCount = w => scaling.enemyBaseCount + Math.floor(w * scaling.enemyCountPerWave);

  // Enemy list for a wave: counts follow the weights in data.encounters, rounded by largest remainder.
  function encounter(w) {
    const wts = data.encounters[w - 1], en = enemyCount(w);
    const keys = Object.keys(wts), sum = keys.reduce((a, k) => a + wts[k], 0);
    const list = keys.map(k => ({type: k, count: Math.floor(wts[k] / sum * en), rem: (wts[k] / sum * en) % 1}));
    let left = en - list.reduce((a, o) => a + o.count, 0);
    list.slice().sort((a, b) => b.rem - a.rem).forEach(o => { if (left > 0) { o.count++; left--; } });
    return {list: list.filter(o => o.count > 0), total: en, boss: data.bosses[w] || null};
  }

  function createBattle(setup) {
    seed(setup.seed);
    const c = setup.cols, gs = setup.groups, wave = setup.wave;
    // Bag top row = front line. Every piece starts on the battlefield exactly where it sat in the bag.
    const op = setup.open.map((o, i) => o ? i : -1).filter(i => i >= 0);
    const ocx = (Math.min(...op.map(i => i % c)) + Math.max(...op.map(i => i % c))) / 2, or0 = Math.min(...op.map(i => Math.floor(i / c)));
    const r = Math.max(...op.map(i => Math.floor(i / c))) - or0 + 1;
    const n = gs.reduce((s, g) => s + g.pieces.length * unitDefs[g.type].count, 0), {sx, gap} = formation(n);
    const mid = H * .47, front = mid + gap, sy = Math.min(sx * .7, (H - 40 - front) / Math.max(1, r - 1));
    const cellPos = i => ({x: W / 2 + ((i % c) - ocx) * sx, y: front + (Math.floor(i / c) - or0) * sy});

    const allies = [];
    for (const g of gs) {
      const d = unitDefs[g.type], b = groupBonus(g.pieces.length);
      for (const pp of g.pieces) {
        const pc = pp.cells, pw = pp.power;
        const p = {x: W / 2 + (pc.reduce((a, k) => a + k % c, 0) / pc.length - ocx) * sx, y: front + (pc.reduce((a, k) => a + Math.floor(k / c), 0) / pc.length - or0) * sy};
        for (let j = 0; j < d.count; j++) {
          const ox = d.count > 1 ? (j - (d.count - 1) / 2) * sx * .42 : 0, oy = d.count > 1 ? (j % 2 ? -1 : 1) * sy * .12 : 0;
          allies.push(unit(g.type, 0, p.x + ox, p.y + oy, {aff: g.aff, hp: d.hp * b.hp * pw.hp, atk: d.atk * b.atk * pw.atk, rate: d.rate * pw.rate, cell: pc[0], slot: j, slots: d.count, pid: pp.id}));
        }
      }
    }

    const boss = wave % 4 === 0, scale = eHp(wave), en = enemyCount(wave);
    const ecols = Math.min(7, Math.max(3, Math.ceil(Math.sqrt(en * 1.6)))), efront = mid - gap, esy = Math.min(sy, 32), enemies = [];
    const order = encounter(wave).list.flatMap(o => Array(o.count).fill(o.type)).sort((a, b) => (ENEMY[a].range > 60) - (ENEMY[b].range > 60));
    for (let i = 0; i < en; i++) {
      const type = order[i], E = ENEMY[type], row = Math.floor(i / ecols), inRow = Math.min(ecols, en - row * ecols), col = i % ecols;
      enemies.push(unit(type, 1, W / 2 + (col - (inRow - 1) / 2) * sx * .95, efront - row * esy, {hp: E.hp * scale, atk: E.atk * eAtk(wave), rate: E.rate, range: E.range, speed: E.speed}));
    }
    if (boss) {
      const B = data.bosses[wave], BS = scaling.boss;
      enemies.push(unit(B.type, 1, W / 2, Math.max(46, efront - Math.ceil(en / ecols) * esy - 16), {hp: BS.hp * scale, atk: BS.atk * Math.pow(BS.atkGrowth, wave) * data.tune[wave - 1].atk, rate: BS.rate, range: BS.range, speed: BS.speed, boss: true, trait: B.trait}));
    }

    const pieceList = [], adj = new Map();
    for (const g of gs) for (const pp of g.pieces) pieceList.push({pid: pp.id, type: g.type, aff: g.aff, skillCd: g.type === 'mage' ? 4 : 0, icd: 0, pulse: -9, cells: pp.cells});
    for (const pc of pieceList) {
      const set = new Set();
      for (const i of pc.cells) for (const nb of neighbors(i, c, setup.cellPiece.length)) {
        const q = setup.cellPiece[nb];
        if (q != null && q !== pc.pid) set.add(q);
      }
      adj.set(pc.pid, set);
    }
    return {seed: setup.seed, units: [...allies, ...enemies], time: 0, allies: allies.length, initialEnemies: enemies.length, projectiles: [], end: false, stats: {damage: 0, kills: 0, by: {}}, pieceList, adj, boss, layout: {sx, sy, cellPos}};
  }

  function step(b, dt) {
    if (!b || b.end) return;
    const L = on(b);
    b.time += dt;
    skillTick(b, dt);
    const units = b.units;
    b.engaged = new Map();
    for (const u of units) if (u.hp > 0 && isMelee(u) && u.target && u.target.hp > 0) b.engaged.set(u.target, (b.engaged.get(u.target) || 0) + 1);
    for (const u of units) {
      u.moving = false;
      if (u.hp <= 0) continue;
      if (u.burn > 0) {
        u.burn -= dt;
        hit(b, u, u.burnDps * dt * elemMult(u, ['fire']), u.dotSource, true);
      } else u.burnDps = 0;
      if (u.poison > 0) {
        u.poison -= dt;
        hit(b, u, u.poisonDps * u.stacks * dt * elemMult(u, ['poison']), u.dotSource, true);
      } else { u.stacks = 0; u.poisonDps = 0; }
      u.slow = Math.max(0, u.slow - dt);
      if (u.trait === 'rage' && !u.raged && u.hp > 0 && u.hp < u.maxHp * .5) {
        u.raged = true;
        u.atk *= 1.5;
        L.effect?.('burst', u);
        L.skill?.('rage', null, u);
      }
      if (u.shield > 0) {
        u.shieldT -= dt;
        if (u.shieldT <= 0) u.shield = 0;
      }
      if (['life', 'plague', 'spring'].includes(u.aff)) {
        u.healClock += dt;
        if (u.healClock >= 3) {
          u.healClock -= 3;
          u.hp = Math.min(u.maxHp, u.hp + u.maxHp * .03);
          L.effect?.('heal', u);
        }
      }
      if (u.hp <= 0) continue;
      const nearest = pickTarget(b, u, units, dt);
      if (!nearest) continue;
      const dist = Math.hypot(nearest.x - u.x, nearest.y - u.y) || .01, reach = reachOf(u, nearest);
      const dx = nearest.x - u.x, dy = nearest.y - u.y;
      u.dir = dx >= 0 ? 1 : -1;
      // A unit that has arrived stands still: float noise (dist a hair above reach) must not count as walking,
      // otherwise it never shows its wind-up pose.
      const stride = Math.min(dist - reach, u.speed * dt);
      if (stride > 1e-6) {
        u.x += dx / dist * stride;
        u.y += dy / dist * stride;
        u.moving = true;
        L.moved?.(u, dt);
      }
      // While walking the cooldown never drops below the wind-up, so arriving starts a full, visible wind-up
      // instead of an instant, animation-less hit.
      if (u.moving && u.windup > 0) u.cd = Math.max(u.cd, windupOf(u));
      u.cd -= dt * (u.slow > 0 ? .75 : 1);
      if (dist <= reach + 4 && u.cd <= 0) {
        u.cd = 1 / u.rate;
        L.attack?.(u, nearest, dx / dist, dy / dist);
        if (u.range > 60) launchProjectile(b, u, nearest, u.type === 'goblin' ? 'arrow' : 'magic');
        else impact(b, u, nearest);
      }
    }
    // Soft separation prevents a growing army from collapsing into a single overlapping sprite.
    for (let i = 0; i < units.length; i++) {
      const u = units[i];
      if (u.hp <= 0) continue;
      for (let j = i + 1; j < units.length; j++) {
        const v = units[j];
        if (v.hp <= 0) continue;
        let dx = v.x - u.x, dy = v.y - u.y, dist = Math.hypot(dx, dy);
        const same = u.team === v.team, min = same ? (u.boss || v.boss ? 28 : 17) : rad(u) + rad(v) - 2;
        if (dist < min) {
          if (dist < .01) { dx = .1; dy = .1; dist = .141; }
          const f = (min - dist) * Math.min(.5, dt * 4) * 2, mu = same ? 1 : rad(u) ** 2, mv = same ? 1 : rad(v) ** 2, wu = mv / (mu + mv), wv = mu / (mu + mv);
          u.x -= dx / dist * f * wu; u.y -= dy / dist * f * wu;
          v.x += dx / dist * f * wv; v.y += dy / dist * f * wv;
        }
      }
      u.x = Math.max(18, Math.min(W - 18, u.x));
      u.y = Math.max(28, Math.min(H - 25, u.y));
    }
    b.projectiles = b.projectiles.filter(p => {
      p.t -= dt;
      if (p.t <= 0 || p.target.hp <= 0) return false;
      const dx = p.target.x - p.x, dy = p.target.y - p.y, d = Math.hypot(dx, dy);
      if (d < 270 * dt + 4) { impact(b, p.source, p.target, p.mult || 1); return false; }
      L.projectileMoved?.(p);
      p.x += dx / d * 270 * dt;
      p.y += dy / d * 270 * dt;
      return true;
    });
    const alive = units.filter(u => u.hp > 0), a = alive.filter(u => u.team === 0).length, e = alive.length - a;
    if (!a || !e || b.time >= 60) {
      b.end = true;
      b.won = a > 0 && e === 0;
      L.ended?.(b.won);
    }
  }

  return {W, H, seed, unit, createBattle, step, encounter, eHp, eAtk, groupBonus, elemMult, isMelee, reachOf, bodySize, windupOf, recoveryOf};
};
