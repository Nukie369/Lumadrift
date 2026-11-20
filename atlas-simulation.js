'use strict';
// Seeded, reproducible simulation of eligible two-crossing Atlas flights.
// Update weights/protection together with game.js when balancing changes.
const assert=require('node:assert/strict');
const relics=[['bloom',26,0],['pearl',20,0],['kite',14,0],['lantern',20,1],['key',13,1],['crown',7,1]];
function rng(seed){let x=seed>>>0;return()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function trial(random,protection=true){
 const owned=new Set();let streak=0,flights=0,firstSet=0,maxStreak=0;
 while(owned.size<6&&flights<10000){
  flights++;const missing=relics.filter(r=>!owned.has(r[0]));
  const pool=protection&&streak>=6?missing:relics;
  let roll=random()*pool.reduce((s,r)=>s+r[1],0),picked=pool[pool.length-1];
  for(const r of pool){roll-=r[1];if(roll<0){picked=r;break;}}
  if(owned.has(picked[0])){streak++;maxStreak=Math.max(maxStreak,streak);}
  else{owned.add(picked[0]);streak=0;}
  if(!firstSet&&[0,1].some(set=>relics.filter(r=>r[2]===set).every(r=>owned.has(r[0]))))firstSet=flights;
 }
 assert.equal(owned.size,6);return{firstSet,all:flights,maxStreak};
}
function percentile(sorted,p){return sorted[Math.ceil(sorted.length*p)-1];}
function run(n=20000){
 const results={};
 for(const enabled of [false,true]){
  const random=rng(0x4c554d41),samples=Array.from({length:n},()=>trial(random,enabled));
  const sorted=key=>samples.map(s=>s[key]).sort((a,b)=>a-b);
  results[enabled?'protected':'unprotected']={
   firstSet:{median:percentile(sorted('firstSet'),.5),p90:percentile(sorted('firstSet'),.9)},
   allRelics:{median:percentile(sorted('all'),.5),p90:percentile(sorted('all'),.9)},
   longestDuplicateStreak:{median:percentile(sorted('maxStreak'),.5),p90:percentile(sorted('maxStreak'),.9)}
  };
 }
 assert(results.protected.allRelics.p90<results.unprotected.allRelics.p90);
 return results;
}
if(require.main===module)console.log(JSON.stringify({eligibleFlightsPerDraw:1,trialsPerScenario:20000,results:run()},null,2));
module.exports={trial,run};
