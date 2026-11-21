'use strict';
// Mirrors game.js storm odds and two-crossing relic eligibility for a fresh ship.
// Model, not player telemetry. Player banks immediately after crossing two.
const assert=require('node:assert/strict');
const lanes=[{name:'Comet Trail',base:11},{name:'Ion Rapids',base:25},{name:'Blackstar Rift',base:41}];
function risk(base,depth,scanner=0){return Math.max(3,Math.min(75,base+depth*3-scanner*3))/100;}
function qualification(base,scanner=0){
 const first=risk(base,0,scanner),second=risk(base,1,scanner);
 // Two storms leave one hull, but zero cargo. One safe crossing yields positive cargo.
 return {firstStormChance:first,secondStormChance:second,eligibleChance:1-first*second,nonqualifyingChance:first*second};
}
function simulate(base,scanner=0,trials=100000,seed=0x4c554d41){
 let x=seed>>>0,eligible=0;
 function random(){x=(x+0x6d2b79f5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}
 for(let i=0;i<trials;i++){
  let hull=3,cargo=0;
  for(let depth=0;depth<2;depth++){
   if(random()<risk(base,depth,scanner)){hull--;cargo=Math.floor(cargo*.75);}
   else cargo+=32;
  }
  if(hull>0&&cargo>0)eligible++;
 }
 return eligible/trials;
}
function run(){
 const rows=lanes.map(lane=>{
  const exact=qualification(lane.base),observed=simulate(lane.base);
  assert(Math.abs(exact.eligibleChance-observed)<0.004,`${lane.name}: simulation disagrees with exact model`);
  return {lane:lane.name,eligiblePercent:+(100*exact.eligibleChance).toFixed(2),simulatedPercent:+(100*observed).toFixed(2),nonqualifyingPercent:+(100*exact.nonqualifyingChance).toFixed(2)};
 });
 assert(rows[0].eligiblePercent>rows[1].eligiblePercent&&rows[1].eligiblePercent>rows[2].eligiblePercent);
 assert(qualification(11,3).eligibleChance>qualification(11,0).eligibleChance);
 return {assumptions:'Fresh 3-hull ship, no scanner, bank at exactly two crossings, consistent lane, independent storm rolls; actual storm risk from game.js. No fuel, real-player behavior or correlated weather modeled.',trialsPerLane:100000,rows};
}
if(require.main===module)console.log(JSON.stringify(run(),null,2));
module.exports={risk,qualification,simulate,run};
