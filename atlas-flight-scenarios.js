'use strict';
// Scenario analysis, not a claim about observed player performance or actual storm odds.
// Eligible relic draws use the existing Atlas model; nonqualifying launches earn no draw.
const assert=require('node:assert/strict');
const {trial}=require('./atlas-simulation');
function rng(seed){let x=seed>>>0;return()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function percentile(sorted,p){return sorted[Math.ceil(sorted.length*p)-1];}
function scenario(qualificationRate,attempts=20000,seed=0x4c554d41){
 assert(Number.isFinite(qualificationRate)&&qualificationRate>0&&qualificationRate<=1);
 assert(Number.isInteger(attempts)&&attempts>0);
 const random=rng(seed),launches=[];
 for(let i=0;i<attempts;i++){
  const draws=trial(random,true).all;
  let total=0,qualified=0;
  while(qualified<draws){total++;if(random()<qualificationRate)qualified++;}
  launches.push(total);
 }
 launches.sort((a,b)=>a-b);
 return {qualificationRate,medianLaunches:percentile(launches,.5),p90Launches:percentile(launches,.9)};
}
function run(){
 const scenarios=[1,.8,.6,.4].map(rate=>scenario(rate));
 assert(scenarios.every((s,i)=>i===0||s.medianLaunches>=scenarios[i-1].medianLaunches));
 assert(scenarios.every(s=>s.p90Launches>=s.medianLaunches));
 assert.equal(scenarios[0].medianLaunches,14);
 return {disclaimer:'Illustrative independent launch-qualification probabilities; excludes fuel recharge, progression, and correlated storm-loss streaks. Not measured game rates.',trialsPerScenario:20000,scenarios};
}
if(require.main===module)console.log(JSON.stringify(run(),null,2));
module.exports={scenario,run};
