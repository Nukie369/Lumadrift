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
// Deep Signal: invalid saves must never fabricate claims or multiply payouts across sessions.
const corrupted={credits:200,atlas:{discovered:['lantern','key','key','missing',{},null],claimed:['deep','deep','invalid'],repeats:-8}};
const first=vm.runInContext('normalizeState(corrupted)',Object.assign(ctx,{corrupted}));
assert.deepEqual(Array.from(first.atlas.discovered),['lantern','key']);
assert.deepEqual(Array.from(first.atlas.claimed),['deep']); // Valid prior claims are preserved, not repaid.
assert.equal(first.atlas.repeats,0);
// A malformed prior claim for an incomplete collection must not yield a second completion payout.
ctx.state=first;ctx.random=()=>.98;ctx.run={cargo:40,depth:2,practice:false};
vm.runInContext('finish(false,false)',ctx);
assert.equal(first.end.relic.id,'crown');
assert.equal(first.end.relic.bonus,0,'previously claimed collection cannot pay again');
assert.equal(first.credits,240);
assert.deepEqual(Array.from(first.atlas.claimed),['deep']);
const second=vm.runInContext('normalizeState(JSON.parse(JSON.stringify(state)))',ctx);
ctx.state=second;ctx.random=()=>.98;ctx.run={cargo:30,depth:2,practice:false};
vm.runInContext('finish(false,false)',ctx);
assert.equal(second.end.relic.bonus,45,'subsequent session receives duplicate reward only');
assert.equal(second.credits,315);
assert.deepEqual(Array.from(second.atlas.claimed),['deep']);
// A separate clean-but-corrupted discovery save must award legitimate Deep completion once.
const unclaimed={credits:100,atlas:{discovered:['lantern','key','key','bogus'],claimed:['unknown'],repeats:-1}};
const third=vm.runInContext('normalizeState(unclaimed)',Object.assign(ctx,{unclaimed}));
ctx.state=third;ctx.random=()=>.98;ctx.run={cargo:50,depth:2,practice:false};
vm.runInContext('finish(false,false)',ctx);
assert.equal(third.end.relic.bonus,600,'new Deep completion pays 600 once');
assert.equal(third.credits,750);
assert.deepEqual(Array.from(third.atlas.claimed),['deep']);
const fourth=vm.runInContext('normalizeState(JSON.parse(JSON.stringify(state)))',ctx);
ctx.state=fourth;ctx.random=()=>.98;ctx.run={cargo:20,depth:2,practice:false};
vm.runInContext('finish(false,false)',ctx);
assert.equal(fourth.end.relic.bonus,45);
assert.equal(fourth.credits,815);
assert.equal(writes,4);
console.log('PASS malformed Deep Signal claims and discoveries across restored flights');
