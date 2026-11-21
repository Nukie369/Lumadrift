'use strict';
// Fresh-ship, two-crossing, immediate-bank route comparison; excludes relic bonuses and missions.
const assert = require('node:assert/strict');
const { qualification } = require('./atlas-route-qualification');
const routes = [
  {name:'Comet Trail',base:11,min:32,max:58},
  {name:'Ion Rapids',base:25,min:70,max:106},
  {name:'Blackstar Rift',base:41,min:128,max:186}
];
const meanPrize=(min,max,depth)=>{
  let total=0;
  for(let n=min;n<=max;n++)total+=Math.round(n*(1+depth*.18));
  return total/(max-min+1);
};
function exact(route){
 const p=route.base/100,q=(route.base+3)/100;
 const a=meanPrize(route.min,route.max,0),b=meanPrize(route.min,route.max,1);
 let damaged=0;
 for(let n=route.min;n<=route.max;n++)damaged+=Math.floor(n*.75);
 damaged/=route.max-route.min+1;
 const expectedCargo=(1-p)*((1-q)*(a+b)+q*damaged)+p*(1-q)*b;
 const eligibility=qualification(route.base).eligibleChance;
 return {route:route.name,expectedCargo:+expectedCargo.toFixed(2),eligiblePercent:+(100*eligibility).toFixed(2),cargoPerEligibleDraw:+(expectedCargo/eligibility).toFixed(2)};
}
function simulate(route,n=150000){
 let x=0x5eed1234,sum=0,eligible=0;
 const random=()=>{x=(x+0x6d2b79f5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
 for(let i=0;i<n;i++){
  let cargo=0;
  for(let depth=0;depth<2;depth++){
   if(random()<(route.base+depth*3)/100)cargo=Math.floor(cargo*.75);
   else cargo+=Math.round((route.min+Math.floor(random()*(route.max-route.min+1)))*(1+depth*.18));
  }
  sum+=cargo;if(cargo>0)eligible++;
 }
 return {meanCargo:sum/n,eligibleRate:eligible/n};
}
function run(){
 const rows=routes.map(route=>{
  const result=exact(route),observed=simulate(route);
  assert(Math.abs(result.expectedCargo-observed.meanCargo)<1.5,`${route.name} cargo mismatch`);
  assert(Math.abs(result.eligiblePercent/100-observed.eligibleRate)<.005,`${route.name} qualification mismatch`);
  return {...result,simulatedCargo:+observed.meanCargo.toFixed(2)};
 });
 assert(rows[0].expectedCargo<rows[1].expectedCargo&&rows[1].expectedCargo<rows[2].expectedCargo);
 assert(rows[0].eligiblePercent>rows[1].eligiblePercent&&rows[1].eligiblePercent>rows[2].eligiblePercent);
 return {assumptions:'Fresh ship, zero upgrades, same route for two crossings, immediate bank, independent storm rolls; cargo only (excludes missions, relic bonuses, recharge, fuel and later flights). Model not player telemetry.',trialsPerRoute:150000,rows};
}
if(require.main===module)console.log(JSON.stringify(run(),null,2));
module.exports={exact,simulate,run};
