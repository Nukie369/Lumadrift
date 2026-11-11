// Reproducible design comparison only: does not change live Atlas odds.
'use strict';
const assert=require('node:assert/strict');
const weights=[26,20,14,20,13,7];
assert.equal(weights.reduce((a,b)=>a+b),100);
const rng=seed=>{let s=seed>>>0;return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);};
function draw(r,mask,missingOnly){
  const eligible=weights.map((w,i)=>({w,i})).filter(({i})=>!missingOnly||!(mask&(1<<i)));
  const total=eligible.reduce((s,{w})=>s+w,0);
  let roll=r()*total;
  for(const {w,i} of eligible){roll-=w;if(roll<0)return i;}
  return eligible.at(-1).i;
}
function run(threshold,trials=100000){
  const r=rng(0x1a71a5),lengths=[],duplicates=[];
  for(let t=0;t<trials;t++){
    let mask=0,streak=0,count=0,dupes=0;
    while(mask!==63){
      const forced=threshold!==Infinity&&streak>=threshold;
      const id=draw(r,mask,forced),repeat=!!(mask&(1<<id));
      if(repeat){streak++;dupes++;}else{mask|=1<<id;streak=0;}
      count++;
      assert.ok(count<10000);
    }
    lengths.push(count);duplicates.push(dupes);
  }
  lengths.sort((a,b)=>a-b);
  const pct=p=>lengths[Math.ceil(p*trials)-1];
  return {rule:threshold===Infinity?'current-independent':`guarantee-new-after-${threshold}-consecutive-duplicates`,trials,median:pct(.5),p90:pct(.9),mean:Number((lengths.reduce((a,b)=>a+b,0)/trials).toFixed(2)),meanDuplicates:Number((duplicates.reduce((a,b)=>a+b,0)/trials).toFixed(2))};
}
const results=[Infinity,4,6,8].map(n=>run(n));
assert.ok(results.slice(1).every(x=>x.p90<results[0].p90));
assert.ok(results.every(x=>x.median>=6&&x.p90>=x.median));
console.log(JSON.stringify(results,null,2));
// A pity rule would change published probabilities and must not ship without
// updated in-game odds disclosure, player-facing explanation, and UI tests.
