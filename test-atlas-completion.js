// Deterministic Star Atlas completion simulation; run: node test-atlas-completion.js
'use strict';
const assert = require('node:assert/strict');
const weights = [26,20,14,20,13,7]; // game.js atlasSets relic weights
const total = weights.reduce((a,b)=>a+b,0);
assert.equal(total,100);
function rng(seed){let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function sample(r){let x=r()*total;for(let i=0;i<weights.length;i++){x-=weights[i];if(x<0)return i;}return weights.length-1;}
function percentile(sorted,p){return sorted[Math.ceil(p*sorted.length)-1];}
function simulate(trials=100000){
  const r=rng(0x1a71a5), draws=[];
  for(let k=0;k<trials;k++){
    let mask=0,count=0;
    while(mask!==63){
      mask|=1<<sample(r);count++;
      assert.ok(count<100000,'completion must be finite');
    }
    draws.push(count);
  }
  draws.sort((a,b)=>a-b);
  return {trials,median:percentile(draws,0.5),p90:percentile(draws,0.9),mean:Number((draws.reduce((a,b)=>a+b,0)/trials).toFixed(2))};
}
const result=simulate();
assert.ok(result.median>=6&&result.p90>=result.median);
console.log(JSON.stringify(result));
// Each eligible banked expedition yields one draw. This counts eligible flights,
// not all attempted flights; storm losses and fuel recharge are excluded.
