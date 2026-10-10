// Evaluated inside index.html by tools/balance.mjs and tools/sim-regression.mjs (needs the game's globals).
(() => {
  const SHARES={slime:.30,skeleton:.20,goblin:.15,mage:.10,golem:.15,orc:.10},COST={slime:3,skeleton:4,goblin:4,mage:5,golem:6,orc:7},CELLS={slime:1,skeleton:1,goblin:2,mage:3,golem:4,orc:2};
  const earned=r=>r%4===0?12:6+Math.floor((r-1)/4);
  const budget=w=>{let g=5+3;for(let r=1;r<w;r++){g+=earned(r);if(r%4===0)g+=5;}return g*.88;};
  const cap=w=>w<=4?25:w<=8?30:36;
  const cellsOf=n=>Object.entries(n).reduce((a,[t,k])=>a+CELLS[t]*k,0);
  function army(w){const n={slime:1},gold=budget(w),mins={slime:1};let spend=3;
    for(const t in SHARES){const k=Math.floor(SHARES[t]*(gold-3)/COST[t]);n[t]=(n[t]||0)+k;spend+=k*COST[t];}
    while(cellsOf(n)>cap(w)){let best=null;for(const t in n)if(n[t]>(mins[t]||0)&&(best===null||n[t]*CELLS[t]>n[best]*CELLS[best]))best=t;if(!best)break;n[best]--;spend-=COST[best];}
    for(const t of ['skeleton','slime'])while(gold-spend>=COST[t]&&cellsOf(n)+CELLS[t]<=cap(w)){n[t]++;spend+=COST[t];}
    return n;}
  function setup(w){newRun();closeModal();state.pieces=[];state.bench=state.bench.map(()=>null);for(let i=0;i<(w>8?2:w>4?1:0);i++)expand();rebuild();
    const n=army(w),order=['golem','orc','skeleton','slime','goblin','mage'],aff=w>=4?{slime:'fire',goblin:'water',mage:'poison'}:{};
    for(const t of order)for(let i=0;i<(n[t]||0);i++){const p=piece(t);if(aff[t])p.aff=aff[t];if(!place(p))break;}
    state.wave=w;return n;}
  function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
  // Wave 1 with a bag's own starting pieces and no purchase, real rules, no median patches.
  function startRun(bag,seed,comp){const real=Math.random;Math.random=rng(seed*104729);window.__TEST__=true;GAME_DATA.encounters[0]=comp;newRun(bag);closeModal();state.wave=1;battle=buildBattle();mode='battle';battle.intro=null;let t=0;while(!battle.end&&t<61){simulate(.025);t+=.025;}const won=battle.won;Math.random=real;window.__TEST__=false;mode='prepare';battle=null;return won;}
  window.BAL={army,setup,startRun,rng,startWins(comp,seeds){const o={};for(const b of [GAME_DATA.run.defaultBag]){let n=0;for(let s=1;s<=seeds;s++)if(startRun(b,s,comp))n++;o[b]=n/seeds;}return o;},
    run(w,seed,comp){const real=Math.random;Math.random=rng(seed*7919+w);window.__TEST__=true;
      const oP=powerOf,f=Math.min(1,w/8);powerOf=()=>({hp:1+.087*f,atk:1+.09*f,rate:1,tags:[]});
      GAME_DATA.encounters[w-1]=comp;setup(w);battle=buildBattle();mode='battle';battle.intro=null;
      const allies=battle.units.filter(u=>u.team===0),total=allies.reduce((a,u)=>a+u.maxHp,0);let t=0;
      while(!battle.end&&t<61){simulate(.025);t+=.025;}
      const foes=battle.units.filter(u=>u.team===1),foeTotal=foes.reduce((a,u)=>a+u.maxHp,0);
      const left=allies.reduce((a,u)=>a+Math.max(0,u.hp),0),foeLeft=foes.reduce((a,u)=>a+Math.max(0,u.hp),0),won=battle.won;
      powerOf=oP;Math.random=real;window.__TEST__=false;mode='prepare';battle=null;
      // margin is continuous across the win/loss cliff: +HP share left when winning, -(enemy HP share left) when losing
      return {won,rem:won?left/total:0,margin:won?left/total:-foeLeft/foeTotal,time:t,units:allies.length};},
    mean(w,seeds,comp){let r=0,wins=0,mg=0;for(let s=1;s<=seeds;s++){const o=this.run(w,s,comp);r+=o.rem;mg+=o.margin;wins+=o.won?1:0;}return {rem:r/seeds,remWon:wins?r/wins:0,margin:mg/seeds,wins:wins/seeds};},
    // The authored mix (data.encounterMix) with N units in total, rounded by largest remainder.
    mix(w,N){const m=GAME_DATA.encounterMix[w-1],keys=Object.keys(m),sum=keys.reduce((a,k)=>a+m[k],0),list=keys.map(k=>({k,c:Math.floor(m[k]/sum*N),r:(m[k]/sum*N)%1}));
      let left=N-list.reduce((a,o)=>a+o.c,0);list.slice().sort((a,b)=>b.r-a.r).forEach(o=>{if(left>0){o.c++;left--;}});
      const o={};for(const x of list)if(x.c)o[x.k]=x.c;return o;},
    // Enemy stats are never touched: only how many units stand there. HP left in a typical win falls as N grows, so find the
    // largest N that still leaves >= target (binary search), then try single-slime fillers around it for a finer fit.
    fit(w,seeds,target,minWin,guard){let lo=1,hi=60;
      while(lo<hi){const mid=Math.ceil((lo+hi)/2),r=this.mean(w,seeds,this.mix(w,mid));if(r.wins>=minWin&&r.remWon>=target)lo=mid;else hi=mid-1;}
      let best=null;
      for(const N of [lo,lo+1])for(let k=0;k<=2;k++){const c=this.mix(w,N);if(k)c.slime=(c.slime||0)+k;const r=this.mean(w,seeds*2,c);
        if(r.wins<minWin)continue;const d=Math.abs(r.remWon-target);if(best===null||d<best.d-1e-9)best={d,c};}
      let comp=best?best.c:this.mix(w,lo);
      // wave 1 guard: even the unmodified starting army (no purchase) must be able to win
      if(guard)for(let k=0;k<60&&Math.min(...Object.values(this.startWins(comp,seeds)))<minWin;k++){const big=Object.keys(comp).sort((a,b)=>comp[b]-comp[a])[0];if(Object.values(comp).reduce((a,b)=>a+b,0)<=1)break;if(--comp[big]<=0)delete comp[big];}
      return comp;}
  };
})()
