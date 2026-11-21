'use strict';
// Modeled fresh-ship two-crossing strategy; not observed player telemetry.
const assert = require('node:assert/strict');
const lanes = [{name:'Comet Trail',base:11},{name:'Ion Rapids',base:25},{name:'Blackstar Rift',base:41}];
const relics = [26,20,14,20,13,7];
function rng(seed){let x=seed>>>0;return()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function percentile(a,p){a.sort((x,y)=>x-y);return a[Math.ceil(a.length*p)-1];}
function simulateLane(base,attempts=20000,seed=0x4c554d41){
 const random=rng(seed),eligible=[],launches=[],longestLossStreak=[];
 const p=(1-(base/100)*((base+3)/100));
 for(let i=0;i<attempts;i++){
  let owned=0,duplicates=0,draws=0,total=0,losses=0,maxLosses=0;
  while(owned!==63){
   total++;
   if(random()>=p){losses++;maxLosses=Math.max(maxLosses,losses);continue;}
   losses=0;draws++;
   const missing=relics.map((w,j)=>({w,j})).filter(r=>!(owned&(1<<r.j)));
   const pool=duplicates>=6?missing:relics.map((w,j)=>({w,j}));
   let roll=random()*pool.reduce((s,r)=>s+r.w,0),selected=pool[pool.length-1].j;
   for(const r of pool){roll-=r.w;if(roll<0){selected=r.j;break;}}
   if(owned&(1<<selected))duplicates++;else{owned|=1<<selected;duplicates=0;}
   assert(total<10000,'Unexpectedly long collection');
  }
  eligible.push(draws);launches.push(total);longestLossStreak.push(maxLosses);
 }
 return {lane:lanes.find(l=>l.base===base).name,qualificationPercent:+(p*100).toFixed(2),eligibleFlights:{median:percentile(eligible,.5),p90:percentile(eligible,.9)},totalLaunches:{median:percentile(launches,.5),p90:percentile(launches,.9)},longestNonqualifyingStreak:{median:percentile(longestLossStreak,.5),p90:percentile(longestLossStreak,.9)}};
}
function run(){const rows=lanes.map(l=>simulateLane(l.base));assert(rows.every(r=>r.totalLaunches.median>=r.eligibleFlights.median));assert(rows[0].totalLaunches.p90<=rows[1].totalLaunches.p90&&rows[1].totalLaunches.p90<=rows[2].totalLaunches.p90);assert(rows[0].qualificationPercent===98.46);return {assumptions:'Fresh unupgraded ship, bank at two crossings, independent storm rolls, one relic per qualifying flight, six-duplicate missing-relic protection. Does not model fuel, correlated storms, or player decisions.',trialsPerLane:20000,rows};}
if(require.main===module)console.log(JSON.stringify(run(),null,2));
module.exports={simulateLane,run};
