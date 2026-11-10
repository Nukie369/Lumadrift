const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/game.js','utf8');
const start=src.indexOf('  const safeObject='),end=src.indexOf('  function regen(){',start);
assert(start>=0&&end>start);
const STORAGE='luma_pending_repair';
const baseState={credits:0,xp:0,runs:0,wins:0,best:0,total:0,totalJumps:0,damageTaken:0,energy:5,energyAt:Date.now(),upgrades:{scanner:0,magnet:0,shield:0},dailyProgress:{key:'',launches:0,jumps:0,banked:0,claimed:[]},milestones:[],buildings:[],atlas:{discovered:[],claimed:[],repeats:0},skins:['aurora'],skin:'aurora',dailyClaim:'',dailyStreak:0,sound:false};
for(const mode of ['throw','silent']){
 const previous=structuredClone(baseState);previous.credits=120;
 const completed=structuredClone(baseState);completed.credits=720;completed.atlas.discovered=['pearl','lantern','key'];completed.atlas.claimed=['deep'];
 const store=new Map([[STORAGE,JSON.stringify(previous)],[STORAGE+'_pending',JSON.stringify(completed)]]);
 let outage=true;
 const localStorage={getItem:k=>store.get(k)??null,setItem(k,v){if(outage&&k===STORAGE){if(mode==='throw')throw Error('storage unavailable');return;}store.set(k,v);},removeItem:k=>store.delete(k)};
 const ctx={localStorage,STORAGE,structuredClone,Date,Math,console,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),dateKey:()=>'',toLocalDay:()=>new Date(),notify:()=>{},baseState};
 vm.createContext(ctx);
 vm.runInContext(src.slice(start,end)+';this.readState=readState;this.getWarning=()=>pendingStorageWarning;',ctx);
 for(let i=0;i<3;i++){
  const recovered=ctx.readState();
  assert.equal(recovered.credits,720,`${mode}: completed reward survives reload ${i}`);
  assert.equal(Array.from(recovered.atlas.claimed).join(','),'deep');
  assert.equal(JSON.parse(store.get(STORAGE)).credits,120,`${mode}: primary not repaired while unavailable`);
  assert.ok(store.has(STORAGE+'_pending'),`${mode}: pending journal retained`);
 }
 assert.match(ctx.getWarning(),/pending reward/i);
 outage=false;
 const repaired=ctx.readState();
 assert.equal(repaired.credits,720);
 assert.equal(JSON.parse(store.get(STORAGE)).credits,720,`${mode}: primary repaired`);
 assert.equal(store.has(STORAGE+'_pending'),false,`${mode}: pending cleared after repair`);
 assert.equal(ctx.readState().credits,720,`${mode}: later reload stable`);
 assert.equal(ctx.readState().atlas.claimed.length,1,`${mode}: no duplicate claim`);
}
console.log('PASS: pending checkpoint survives repeated failed repairs and commits once after storage recovery');
