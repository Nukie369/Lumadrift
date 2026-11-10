const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/game.js','utf8');
function section(a,b){const start=src.indexOf(a),end=src.indexOf(b,start);assert(start>=0&&end>start,`missing ${a}`);return src.slice(start,end);}
const defs=section('  const atlasSets=[','  const colonyBonus=');
const normalize=section('  const safeObject=','  // Preserve the last readable save');
const nodes={};for(const id of ['colony-next-milestone','colony-funding-progress','colony-funding-label','credits','energy','level','runs','best-haul','total-salvage','streak','upgrades','sound-btn'])nodes[id]={textContent:'',dataset:{},hidden:false,attributes:{},setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];}};
const state={credits:100,atlas:{discovered:['bloom','pearl','lantern','key'],claimed:[],repeats:0},buildings:[],xp:0,energy:5,runs:1,best:0,total:0,wins:0,upgrades:{scanner:0,magnet:0,shield:0},sound:false,dailyProgress:{key:'',launches:0,jumps:0,banked:0,claimed:[]}};
let writes=0, events=[];
const ctx={clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),dateKey:()=>'',toLocalDay:()=>new Date(),state,run:null,buildingDefs:[{id:'beacon',name:'Sky Beacon',cost:500,bonus:20}],$:id=>nodes[id],document:{getElementById:id=>nodes[id]},nf:new Intl.NumberFormat('en-US'),regen:()=>{},ensureDay:()=>{},level:()=>1,colonyBonus:()=>0,track:(...x)=>events.push(x),save:()=>writes++,markFlight:()=>{},sceneMessage:()=>{},updateScene:()=>{},addMissionStat:()=>{},beep:()=>{},Math,Number,Date,console,random:()=>.39,structuredClone};
vm.createContext(ctx);
vm.runInContext(src.slice(src.indexOf('  const baseState='),src.indexOf('  function track(')) + defs+normalize+section('  function renderHeader(){','  function activateTab(')+section('  function finish(success,crashed){','  function claimDaily(){')+section('  function colonyFunding(credits,cost){','  function renderColony(){'),ctx);
// Corrupted saves must not fabricate completion or pay a collection bonus.
const malformed={credits:100,atlas:{discovered:['bloom','pearl','pearl','unknown',null,{}],claimed:['bogus','bogus'],repeats:-3}};
const restored=vm.runInContext('normalizeState(malformed)',Object.assign(ctx,{malformed}));
assert.deepEqual(Array.from(restored.atlas.discovered),['bloom','pearl']);
assert.deepEqual(Array.from(restored.atlas.claimed),[]);
assert.equal(restored.atlas.repeats,0);
ctx.state=restored;
ctx.random=()=>.53; // kite: legitimately completes Skyward Wonders
ctx.run={cargo:75,depth:2,practice:false};
vm.runInContext('finish(false,false)',ctx);
assert.equal(restored.end.relic.bonus,350,'one legitimate completion bonus');
assert.deepEqual(Array.from(restored.atlas.claimed),['skyward']);
assert.equal(restored.credits,525);
const clean=vm.runInContext('normalizeState(JSON.parse(JSON.stringify(state)))',ctx);
ctx.state=clean;
ctx.random=()=>.53;
ctx.run={cargo:25,depth:2,practice:false};
vm.runInContext('finish(false,false)',ctx);
assert.equal(clean.end.relic.bonus,45,'duplicate earns only repeat bonus');
assert.equal(clean.end.relic.completed,false);
assert.equal(clean.credits,595);
assert.deepEqual(Array.from(clean.atlas.claimed),['skyward']);
assert.equal(writes,2);
console.log('PASS malformed restored relic data cannot fabricate or repeat flight collection payouts');
