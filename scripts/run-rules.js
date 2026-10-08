// Run rules: everything the prepare screen decides, with no DOM, storage, timers or sound.
//
// Every function takes the run state `st` explicitly and mutates it in place (like the UI always did), returning a
// small result object that says what happened. The UI turns results into toasts, modals, saves and sounds.
// Randomness comes from the `rand` argument (default: Math.random read at call time) so a port can inject its own.
//
// st = {version, bag, grown, open[], cols, rows, pieces[], board[], bench[], rerolls, gold, wave, shop[], wins,
//       mutations, status, nextId}; a piece is {id, type, aff, rot, x, y} (x,y = top-left of its bounding box) and
// st.board is derived occupancy (cell -> piece), refreshed by rebuild().
window.createRunRules = function createRunRules(data) {
  const D = data.units, AFF = data.affinities, RECIPES = data.recipes, FUSE = data.fusions, SHAPES = data.shapes;
  const AURA = data.auras, ELEM = data.elements, ENEMY = data.enemies, R = data.run;

  // ---- Bags ----
  function mkBag(d) {
    const open = [], kinds = {};
    d.open.join('').split('').forEach(ch => open.push(ch === '.'));
    d.kinds.join('').split('').forEach((ch, i) => { const k = {b: 'banner', s: 'shield', d: 'still'}[ch]; if (k) kinds[i] = k; });
    return {...d, open0: open, kinds};
  }
  const BAGS = Object.fromEntries(Object.entries(data.bags).map(([id, d]) => [id, mkBag(d)]));
  const cellKind = (st, i) => BAGS[st.bag]?.kinds[i] || null;

  // ---- Geometry and placement ----
  function shapeOf(type, rot = 0) {
    let c = (SHAPES[type] || [[0, 0]]).map(a => a.slice());
    for (let k = 0; k < ((rot % 4) + 4) % 4; k++) c = c.map(([x, y]) => [-y, x]);
    const mx = Math.min(...c.map(a => a[0])), my = Math.min(...c.map(a => a[1]));
    return c.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  }
  function rotDir(d, rot) {
    let [x, y] = d;
    for (let k = 0; k < ((rot % 4) + 4) % 4; k++) [x, y] = [-y, x];
    return [x, y];
  }
  const neighbors = (i, c, n) => [i % c > 0 ? i - 1 : -1, i % c < c - 1 ? i + 1 : -1, i - c, i + c].filter(j => j >= 0 && j < n);

  function pieceIdx(st, p, x = p.x, y = p.y, rot = p.rot) {
    const out = [];
    for (const [dx, dy] of shapeOf(p.type, rot)) {
      const cx = x + dx, cy = y + dy;
      if (cx < 0 || cy < 0 || cx >= st.cols || cy >= st.rows || !st.open[cy * st.cols + cx]) return null;
      out.push(cy * st.cols + cx);
    }
    return out;
  }
  function rebuild(st) {
    st.board = Array(st.cols * st.rows).fill(null);
    for (const p of st.pieces) for (const i of pieceIdx(st, p) || []) st.board[i] = p;
  }
  function fits(st, p, x, y, rot, ignore) {
    const ix = pieceIdx(st, p, x, y, rot);
    return !!ix && ix.every(i => !st.board[i] || st.board[i] === ignore);
  }
  function place(st, p) {
    for (const rot of [0, 1, 2, 3]) for (let y = 0; y < st.rows; y++) for (let x = 0; x < st.cols; x++)
      if (fits(st, p, x, y, rot)) { p.rot = rot; p.x = x; p.y = y; st.pieces.push(p); rebuild(st); return true; }
    return false;
  }
  const benchOK = (st, k, p) => BAGS[st.bag].bench[k] === 'any' || (D[p.type].material && !D[p.type].curse);
  function stash(st, p) {
    if (place(st, p)) return true;
    const k = st.bench.findIndex((x, j) => !x && benchOK(st, j, p));
    if (k < 0) return false;
    st.bench[k] = p;
    return true;
  }
  const removePiece = (st, p) => { st.pieces = st.pieces.filter(x => x !== p); st.bench = st.bench.map(x => x === p ? null : x); };
  function newPiece(st, type, aff = 'none') { return {id: st.nextId++, type, aff, rot: 0, x: 0, y: 0}; }

  // ---- Power: bag special cells and directional auras ----
  // tags describe where a bonus came from: {kind:'banner'|'shield', pct} or {kind:'aura', from, stat, pct}.
  function powerOf(st, p) {
    const out = {hp: 1, atk: 1, rate: 1, tags: []};
    if (D[p.type].material || !st.pieces.includes(p)) return out;
    const pc = pieceIdx(st, p), c = st.cols, frac = k => pc.filter(i => cellKind(st, i) === k).length / pc.length;
    for (const k of ['banner', 'shield']) {
      const kb = R.kindBonus[k];
      if (frac(k)) { out[kb.stat] += kb.v * frac(k); out.tags.push({kind: k, pct: Math.round(kb.v * 100 * frac(k))}); }
    }
    const add = {hp: 0, atk: 0, rate: 0};
    for (const sp of st.pieces) {
      if (sp === p || !AURA[sp.type]) continue;
      const sc = pieceIdx(st, sp);
      for (const a of AURA[sp.type]) {
        const d = rotDir(a.d, sp.rot);
        if (sc.some(i => { const x = i % c + d[0], y = Math.floor(i / c) + d[1]; return x >= 0 && x < c && y >= 0 && y < st.rows && pc.includes(y * c + x); })) {
          add[a.stat] += a.v;
          out.tags.push({kind: 'aura', from: sp.type, stat: a.stat, pct: Math.round(a.v * 100)});
        }
      }
    }
    for (const k of ['hp', 'atk', 'rate']) out[k] += Math.min(R.auraCap, add[k]);
    return out;
  }

  // ---- Swarms: same type and affinity pieces touching each other ----
  function groups(st) {
    const b = st.board, c = st.cols, seen = new Set(), out = [];
    for (const p of st.pieces) {
      if (D[p.type].material || seen.has(p.id)) continue;
      const todo = [p], ps = [];
      seen.add(p.id);
      while (todo.length) {
        const a = todo.pop();
        ps.push(a);
        for (const i of pieceIdx(st, a)) for (const n of neighbors(i, c, b.length)) {
          const q = b[n];
          if (q && q !== a && q.type === p.type && q.aff === p.aff && !seen.has(q.id)) { seen.add(q.id); todo.push(q); }
        }
      }
      out.push({pieces: ps, cells: ps.flatMap(a => pieceIdx(st, a)), type: p.type, aff: p.aff, count: ps.length * D[p.type].count});
    }
    return out;
  }
  const groupAt = (st, i) => groups(st).find(g => g.cells.includes(i));
  const totalCount = st => groups(st).reduce((s, g) => s + g.count, 0);
  const linkedCount = st => groups(st).filter(g => g.pieces.length >= 2).reduce((n, g) => n + g.pieces.length, 0);

  function expand(st) {
    const step = BAGS[st.bag].steps[st.grown || 0];
    if (!step) return false;
    step.forEach(([x, y]) => st.open[y * st.cols + x] = true);
    st.grown = (st.grown || 0) + 1;
    rebuild(st);
    return true;
  }

  // ---- Run lifecycle ----
  function makeShop(st, first = false, rand = Math.random) {
    const keep = first ? [] : (st.shop || []).map((o, i) => o && o.pinned && !o.sold ? [i, o] : null).filter(Boolean);
    const pool = R.shopPool;
    st.shop = Array.from({length: 3}, () => ({type: pool[Math.floor(rand() * pool.length)], sold: false}));
    keep.forEach(([i, o]) => st.shop[i] = o);
    if (first) st.shop = BAGS[st.bag].shop.map(type => ({type, sold: false}));
  }

  function createRun(bagId, rand = Math.random) {
    const B = BAGS[bagId];
    const st = {version: 3, bag: bagId, grown: 0, open: B.open0.slice(), cols: 6, rows: 6, pieces: [], board: [], bench: B.bench.map(() => null), rerolls: 0, gold: R.startGold, wave: 1, shop: [], wins: 0, mutations: 0, status: R.startingStatus, nextId: 1};
    rebuild(st);
    for (const [t, x, y] of B.start) { const p = newPiece(st, t); p.x = x; p.y = y; st.pieces.push(p); }
    rebuild(st);
    makeShop(st, true, rand);
    return st;
  }

  // Validates a parsed save; returns the state ready to play, or null if it is not usable.
  function restoreRun(s) {
    if (!s || s.version !== 3 || s.cols !== 6 || s.rows !== 6 || !BAGS[s.bag] || !Array.isArray(s.open) || s.open.length !== 36 || !Array.isArray(s.pieces) || !Number.isFinite(s.gold) || s.wave < 1 || s.wave > R.finalWave || !Array.isArray(s.shop)) return null;
    for (const p of s.pieces) if (!p || !D[p.type] || !AFF[p.aff] || !Number.isFinite(p.id) || !Number.isInteger(p.x) || !Number.isInteger(p.y) || !Number.isInteger(p.rot)) return null;
    if (s.shop.some(o => !o || !D[o.type])) return null;
    if (!Array.isArray(s.bench)) s.bench = BAGS[s.bag].bench.map(() => null);
    if (s.bench.length !== BAGS[s.bag].bench.length || s.bench.some(b => b && (!D[b.type] || !AFF[b.aff] || !Number.isFinite(b.id)))) return null;
    s.rerolls = s.rerolls || 0;
    const seen = new Set();
    for (const p of s.pieces) {
      const ix = pieceIdx(s, p);
      if (!ix || ix.some(i => seen.has(i))) return null;
      ix.forEach(i => seen.add(i));
    }
    rebuild(s);
    s.nextId = Math.max(s.nextId || 1, ...s.pieces.map(p => p.id + 1), ...s.bench.filter(Boolean).map(p => p.id + 1));
    return s;
  }

  // ---- Shop ----
  const rerollCost = st => R.rerollBase + (st.rerolls || 0);
  function reroll(st, rand = Math.random) {
    const cost = rerollCost(st);
    if (st.gold < cost) return {ok: false};
    st.gold -= cost;
    st.rerolls = (st.rerolls || 0) + 1;
    makeShop(st, false, rand);
    return {ok: true};
  }
  function togglePin(st, i) {
    const o = st.shop[i];
    if (!o || o.sold) return false;
    const on = !o.pinned;
    st.shop.forEach(x => x.pinned = false);
    o.pinned = on;
    return true;
  }
  // -> {ok:false, reason:'none'|'gold'|'space'} | {ok:true, piece, onBench}
  function buy(st, i) {
    const o = st.shop[i];
    if (!o || o.sold) return {ok: false, reason: 'none'};
    const d = D[o.type];
    if (st.gold < d.cost) return {ok: false, reason: 'gold'};
    const np = newPiece(st, o.type);
    let onBench = false;
    if (!place(st, np)) {
      const bi = st.bench.findIndex((x, k) => !x && benchOK(st, k, np));
      if (bi < 0) return {ok: false, reason: 'space'};
      st.bench[bi] = np;
      onBench = true;
    }
    st.gold -= d.cost;
    o.sold = true;
    o.pinned = false;
    return {ok: true, piece: np, onBench};
  }
  const sellInfo = (st, p) => { const curse = !!D[p.type].curse; return {curse, value: Math.floor(D[p.type].cost / R.sellDivisor), blocked: curse && st.gold < R.curseCost}; };
  function applySell(st, p) {
    const {curse, value} = sellInfo(st, p);
    if (curse) st.gold -= R.curseCost; else st.gold += value;
    removePiece(st, p);
    rebuild(st);
  }

  // ---- Bench ----
  function stowTo(st, p, k) {
    removePiece(st, p);
    st.bench[k] = p;
    rebuild(st);
  }
  // Bench -> first free spot in the bag; false (and no change) if it does not fit.
  function takeFromBench(st, p) {
    const k = st.bench.indexOf(p);
    st.bench[k] = null;
    if (!place(st, p)) { st.bench[k] = p; return false; }
    return true;
  }
  const benchSlotFor = (st, p) => st.bench.findIndex((x, n) => !x && benchOK(st, n, p));
  // Bench -> the bag, with the piece covering cell i (trying the current rotation first).
  function unbenchAt(st, p, i) {
    const c = st.cols;
    for (const rot of [p.rot, 0, 1, 2, 3]) for (const [dx, dy] of shapeOf(p.type, rot)) {
      const x = i % c - dx, y = Math.floor(i / c) - dy;
      if (fits(st, p, x, y, rot)) {
        st.bench = st.bench.map(b => b === p ? null : b);
        p.rot = rot; p.x = x; p.y = y;
        st.pieces.push(p);
        rebuild(st);
        return true;
      }
    }
    return false;
  }

  // ---- Moving and rotating pieces on the board ----
  // The cell of p that can be dragged onto empty cell i so the whole piece fits, or -1.
  function relocateFrom(st, p, i) {
    const c = st.cols;
    for (const from of pieceIdx(st, p)) {
      const dx = i % c - from % c, dy = Math.floor(i / c) - Math.floor(from / c);
      if (fits(st, p, p.x + dx, p.y + dy, p.rot, p)) return from;
    }
    return -1;
  }
  // Drop the piece at `from` onto cell `to`. -> {kind:'none'|'mutation'|'fusion'|'fail'|'moved', linked}
  // 'mutation'/'fusion' change nothing: the UI asks the player to confirm first. 'moved' may swap two pieces.
  function move(st, from, to) {
    const p = st.board[from];
    if (!p || to < 0 || to >= st.board.length) return {kind: 'none'};
    const c = st.cols, q = st.board[to];
    if (D[p.type].material && q && !D[q.type].material) return {kind: 'mutation'};
    if (D[p.type].material && q && q !== p && D[q.type].material && fusionResult(st, from, to)) return {kind: 'fusion'};
    const nx = p.x + (to % c - from % c), ny = p.y + (Math.floor(to / c) - Math.floor(from / c)), before = linkedCount(st);
    if (fits(st, p, nx, ny, p.rot, p)) { p.x = nx; p.y = ny; }
    else if (q && q !== p) {
      const A = pieceIdx(st, p, nx, ny, p.rot), B = pieceIdx(st, q, p.x, p.y, q.rot), ok = i => !st.board[i] || st.board[i] === p || st.board[i] === q;
      if (A && B && !A.some(i => B.includes(i)) && A.every(ok) && B.every(ok)) { const ox = p.x, oy = p.y; p.x = nx; p.y = ny; q.x = ox; q.y = oy; }
      else return {kind: 'fail'};
    } else return {kind: 'fail'};
    rebuild(st);
    return {kind: 'moved', linked: linkedCount(st) > before};
  }
  // -> {status:'bench'} | {status:'same', changed} | {status:'ok'} | {status:'nospace'}
  function rotate(st, p) {
    if (st.bench.includes(p)) { p.rot = (p.rot + 1) % 4; return {status: 'bench'}; }
    const nr = (p.rot + 1) % 4, a = shapeOf(p.type, p.rot), b = shapeOf(p.type, nr);
    if (a.length < 2 || JSON.stringify(a) === JSON.stringify(b)) {
      if (a.length > 1) p.rot = nr;
      return {status: 'same', changed: a.length > 1};
    }
    const wa = Math.max(...a.map(v => v[0])) + 1, ha = Math.max(...a.map(v => v[1])) + 1, wb = Math.max(...b.map(v => v[0])) + 1, hb = Math.max(...b.map(v => v[1])) + 1;
    const bx = Math.round(p.x + (wa - wb) / 2), by = Math.round(p.y + (ha - hb) / 2), tries = [];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) tries.push([dx, dy]);
    tries.sort((u, v) => Math.abs(u[0]) + Math.abs(u[1]) - Math.abs(v[0]) - Math.abs(v[1]));
    for (const [dx, dy] of tries) if (fits(st, p, bx + dx, by + dy, nr, p)) { p.rot = nr; p.x = bx + dx; p.y = by + dy; rebuild(st); return {status: 'ok'}; }
    return {status: 'nospace'};
  }

  // ---- Materials: mutation (material onto a swarm) and fusion (material onto material) ----
  function mutationResult(st, source, target) {
    const a = st.board[source], b = st.board[target];
    if (!a || !b || !D[a.type].material || D[a.type].curse || D[b.type].material) return null;
    const gv = D[a.type].gives;
    if (b.aff === 'none') return {aff: gv || a.type, chance: 1};
    if (gv) return null;
    const aff = RECIPES[b.aff]?.[a.type];
    if (!aff) return null;
    const g = groupAt(st, target), still = !!g && g.pieces.some(q => pieceIdx(st, q).some(i => cellKind(st, i) === 'still'));
    return {aff, chance: still ? R.mutationChance.withStill : R.mutationChance.complex, still};
  }
  // -> null if invalid, else {success, count, target}. Consumes the material; on success the whole swarm changes affinity.
  function applyMutation(st, source, target, r, rand = Math.random) {
    if (!st.board[source] || !st.board[target]) return null;
    const result = mutationResult(st, source, target);
    if (!result || result.aff !== r.aff) return null;
    const g = groupAt(st, target), tp = st.board[target], mat = st.board[source];
    st.pieces = st.pieces.filter(x => x !== mat);
    const success = rand() < r.chance;
    if (success) { g.pieces.forEach(x => x.aff = r.aff); st.mutations++; }
    rebuild(st);
    return {success, count: g.count, target: tp};
  }
  function fusionResult(st, i, j) {
    const a = st.board[i], b = st.board[j];
    if (!a || !b || a === b) return null;
    const da = D[a.type], db = D[b.type];
    if (!da.material || !db.material || da.curse || db.curse || da.gives || db.gives) return null;
    const t = FUSE[[a.type, b.type].sort().join('+')];
    return t ? {type: t} : null;
  }
  // -> the new essence piece, or null if the fusion is no longer valid.
  function applyFusion(st, i, j, r) {
    const a = st.board[i], b = st.board[j];
    if (!a || !b || fusionResult(st, i, j)?.type !== r.type) return null;
    const np = newPiece(st, r.type);
    np.x = b.x; np.y = b.y;
    st.pieces = st.pieces.filter(x => x !== a && x !== b);
    st.pieces.push(np);
    rebuild(st);
    return np;
  }
  function fusableCells(st) {
    const out = new Set(), c = st.cols;
    for (const p of st.pieces) {
      if (!D[p.type].material || D[p.type].gives || D[p.type].curse) continue;
      for (const i of pieceIdx(st, p)) for (const n of neighbors(i, c, st.board.length)) {
        const q = st.board[n];
        if (q && q !== p && FUSE[[p.type, q.type].sort().join('+')] && !D[q.type].gives) { out.add(i); out.add(n); }
      }
    }
    return out;
  }

  // ---- After a battle ----
  // Pays the win, sets st.status. -> {round, final, boss, earned}
  function settleBattle(st, won) {
    const round = st.wave, final = round === R.finalWave, boss = round % R.bossEvery === 0;
    const earned = boss ? R.winGold.boss : R.winGold.base + Math.floor((round - 1) / R.winGold.regionStep);
    if (won) { st.wins++; st.gold += earned; st.status = final ? 'cleared' : boss ? 'reward' : 'between'; }
    else st.status = 'defeated';
    return {round, final, boss, earned};
  }
  function advanceRound(st, rand = Math.random) {
    st.wave++;
    st.rerolls = 0;
    st.status = R.startingStatus;
    makeShop(st, false, rand);
  }
  // -> {ok:true} | {ok:false, reason:'status'|'unknown'|'noSpace'}; the caller advances the round on ok.
  function claimReward(st, kind) {
    if (st.status !== 'reward') return {ok: false, reason: 'status'};
    if (kind === 'slimes') {
      const sa = newPiece(st, 'slime'), sb = newPiece(st, 'slime');
      if (!stash(st, sa)) return {ok: false, reason: 'noSpace'};
      if (!stash(st, sb)) { removePiece(st, sa); rebuild(st); return {ok: false, reason: 'noSpace'}; }
    } else if (kind === 'gold') st.gold += R.bossReward.gold;
    else if (kind === 'expand') { if (!expand(st)) st.gold += R.bossReward.expandFallback; }
    else if (kind === 'cursed') {
      const cp = newPiece(st, 'curse');
      if (!stash(st, cp)) return {ok: false, reason: 'noSpace'};
      st.gold += R.bossReward.cursed;
    } else return {ok: false, reason: 'unknown'};
    return {ok: true};
  }

  // ---- Matchup advice for the next fight ----
  function armyElems(st) {
    const m = {fire: 0, water: 0, poison: 0};
    for (const g of groups(st)) for (const e of ELEM[g.aff] || []) m[e] += g.count;
    return m;
  }
  function foeAdvice(st, enc) {
    const am = armyElems(st), score = {fire: 0, water: 0, poison: 0};
    for (const o of enc.list) if (ENEMY[o.type].weak) score[ENEMY[o.type].weak] += o.count;
    const best = Object.keys(score).sort((a, b) => score[b] - score[a])[0];
    const hits = enc.list.filter(o => am[ENEMY[o.type].weak] > 0).reduce((a, o) => a + o.count, 0);
    const bad = enc.list.filter(o => ENEMY[o.type].res && am[ENEMY[o.type].res] > 0 && !(am[ENEMY[o.type].weak] > 0)).reduce((a, o) => a + o.count, 0);
    return {best, bestN: score[best], hits, bad, total: enc.total};
  }

  return {BAGS, shapeOf, rotDir, neighbors, pieceIdx, rebuild, fits, place, benchOK, stash, newPiece, cellKind, powerOf, groups, groupAt, totalCount,
    linkedCount, expand, makeShop, createRun, restoreRun, rerollCost, reroll, togglePin, buy, sellInfo, applySell, stowTo, takeFromBench, benchSlotFor,
    unbenchAt, relocateFrom, move, rotate, mutationResult, applyMutation, fusionResult, applyFusion, fusableCells, settleBattle, advanceRound,
    claimReward, armyElems, foeAdvice};
};
