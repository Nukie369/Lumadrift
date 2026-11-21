'use strict';
// First landmark affordability under fresh-ship, two-crossing bank strategy.
// Mirrors game.js: initial 150 shards, Bloom Gardens 260, daily day-one supply 100.
// Excludes mission rewards, relic bonuses, fuel timing and upgrades; model only.
const assert=require('node:assert/strict');
const routes=[
 {name:'Comet Trail',base:11,min:32,max:58},
 {name:'Ion Rapids',base:25,min:70,max:106},
 {name:'Blackstar Rift',base:41,min:128,max:186}
];
function rng(seed){let x=seed>>>0;return ()=>{x=(x+0x6d2b79f5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function flight(route,random,stormPersistence=0){
 let cargo=0,consecutiveStorms=0,maxStormStreak=0;
 for(let depth=0;depth<2;depth++){
  if(random()<Math.min(1,(route.base+depth*3+(consecutiveStorms?stormPersistence:0))/100)){
   cargo=Math.floor(cargo*.75);consecutiveStorms++;maxStormStreak=Math.max(maxStormStreak,consecutiveStorms);
  }else{
   const prize=route.min+Math.floor(random()*(route.max-route.min+1));
   cargo+=Math.round(prize*(1+depth*.18));consecutiveStorms=0;
  }
 }
 return {cargo,maxStormStreak};
}
function simulate(route,{trials=20000,dailyClaim=false,seed=0x4c554d41,stormPersistence=0}={}){
 const random=rng(seed),counts=[],stormLossStreaks=[];let zeroCargo=0,firstFlight=0;
 for(let i=0;i<trials;i++){
  let balance=150+(dailyClaim?100:0),launches=0,lossStreak=0,maxLossStreak=0;
  while(balance<260&&launches<100){
   const result=flight(route,random,stormPersistence);launches++;balance+=result.cargo;
   if(result.cargo===0){zeroCargo++;lossStreak++;maxLossStreak=Math.max(maxLossStreak,lossStreak);}
   else lossStreak=0;
  }
  assert(balance>=260,'landmark unreachable within 100 launches');
  if(launches===1)firstFlight++;
  counts.push(launches);stormLossStreaks.push(maxLossStreak);
 }
 const percentile=(arr,p)=>{const sorted=[...arr].sort((a,b)=>a-b);return sorted[Math.ceil(p*sorted.length)-1];};
 return {route:route.name,dailyClaim,stormPersistence,trials,medianLaunches:percentile(counts,.5),p90Launches:percentile(counts,.9),oneLaunchPercent:+(100*firstFlight/trials).toFixed(2),p90ConsecutiveZeroCargoFlights:percentile(stormLossStreaks,.9),zeroCargoFlightPercent:+(100*zeroCargo/counts.reduce((a,b)=>a+b,0)).toFixed(2)};
}
function run(){
 const without=routes.map(route=>simulate(route));
 const withDaily=routes.map(route=>simulate(route,{dailyClaim:true}));
 // Sensitivity scenario only: an additional 15 percentage points of storm risk
 // on the crossing immediately after a storm. This is NOT a live game mechanic.
 const persistentStorms=routes.map(route=>simulate(route,{stormPersistence:15}));
 assert(without.every(r=>r.medianLaunches>=1&&r.p90Launches>=r.medianLaunches));
 assert(withDaily.every((r,i)=>r.medianLaunches<=without[i].medianLaunches));
 assert(without[0].medianLaunches>=without[2].medianLaunches,'higher cargo route should be faster in this model');
 assert(persistentStorms.every(r=>r.p90Launches>=1));
 assert(persistentStorms[2].zeroCargoFlightPercent>without[2].zeroCargoFlightPercent,'storm persistence should raise Blackstar zero-cargo incidence');
 return {persistentStormSensitivity:persistentStorms,assumptions:'Fresh 3-hull ship, bank after two crossings, 150 starting shards, first landmark costs 260, optional first-day 100-shard supply. No missions, relics, upgrades, energy recharge or time estimates. Baseline uses independent storms as modeled in game.js. Sensitivity adds hypothetical +15 percentage points after a storm; NOT a live game mechanic. Simulated, not player telemetry.',withoutDaily:without,withDayOneSupply:withDaily};
}
if(require.main===module)console.log(JSON.stringify(run(),null,2));
module.exports={flight,simulate,run};
