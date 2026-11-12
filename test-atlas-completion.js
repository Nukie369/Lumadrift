// Deterministic Star Atlas completion simulation; run: node test-atlas-completion.js
'use strict';
const assert = require('node:assert/strict');
const weights = [26,20,14,20,13,7]; // game.js atlasSets relic weights
const total = weights.reduce((a,b)=>a+b,0);
assert.equal(total,100);
function rng(seed){let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function sample(r,mask,protectedDraw){
  const pool=weights.map((weight,i)=>({weight,i})).filter(({i})=>!protectedDraw||!(mask&(1<<i)));
  const sum=pool.reduce((a,b)=>a+b.weight,0);
  let x=r()*sum;
  for(const {weight,i} of pool){x-=weight;if(x<0)return i;}
  return pool[pool.length-1].i;
}
function percentile(sorted,p){return sorted[Math.ceil(p*sorted.length)-1];}
function simulate(trials=100000,protectionAfter=Infinity){
  const r=rng(0x1a71a5),draws=[];
  for(let k=0;k<trials;k++){
    let mask=0,count=0,duplicateStreak=0;
    while(mask!==63){
      const protectedDraw=duplicateStreak>=protectionAfter;
      const relic=sample(r,mask,protectedDraw);
      if(mask&(1<<relic))duplicateStreak++;
      else{mask|=1<<relic;duplicateStreak=0;}
      count++;
      assert.ok(count<100000,'completion must be finite');
    }
    draws.push(count);
  }
  draws.sort((a,b)=>a-b);
  return {trials,median:percentile(draws,0.5),p90:percentile(draws,0.9),mean:Number((draws.reduce((a,b)=>a+b,0)/trials).toFixed(2))};
}
// Compare the actual six-duplicate policy to the old independent-draw baseline.
const baseline=simulate();
const protectedSix=simulate(100000,6);
assert.ok(baseline.median>=6&&baseline.p90>=baseline.median);
assert.ok(protectedSix.median>=6&&protectedSix.p90>=protectedSix.median);
assert.ok(protectedSix.p90<baseline.p90,'duplicate protection must reduce p90');
assert.ok(protectedSix.mean<baseline.mean,'duplicate protection must reduce mean');
console.log(JSON.stringify({baseline,protectedSix}));
// Each eligible banked expedition yields one draw. This counts eligible flights,
// not all attempted flights; storm losses and fuel recharge are excluded.
