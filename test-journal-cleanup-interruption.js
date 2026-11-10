const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/game.js','utf8');
const start=src.indexOf('  const safeObject='),end=src.indexOf('  function regen(){',start);
assert(start>=0&&end>start);
const STORAGE='luma_cleanup_test';
const baseState={credits:0,xp:0,runs:0,wins:0,best:0,total:0,totalJumps:0,damageTaken:0,energy:5,energyAt:Date.now(),upgrades:{scanner:0,magnet:0,shield:0},dailyProgress:{key:'',launches:0,jumps:0,banked:0,claimed:[]},milestones:[],buildings:[],atlas:{discovered:[],claimed:[],repeats:0},skins:['aurora'],skin:'aurora',dailyClaim:'',dailyStreak:0,sound:false};
for(const mode of ['throw','silent']){
 const prior=structuredClone(baseState);prior.credits=120;
 const rewarded=structuredClone(baseState);rewarded.credits=720;rewarded.atlas.discovered=['pearl','lantern','key'];rewarded.atlas.claimed=['deep'];
 const store=new Map([[STORAGE,JSON.stringify(prior)],[STORAGE+'_pending',JSON.stringify(rewarded)]]);
 let cleanupBlocked=true;
 const localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem(k){if(cleanupBlocked&&k===STORAGE+'_pending'){if(mode==='throw')throw Error('cleanup interrupted');return;}store.delete(k);}};
 const ctx={localStorage,STORAGE,structuredClone,Date,Math,console,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),dateKey:()=>'',toLocalDay:()=>new Date(),notify:()=>{},baseState,state:structuredClone(rewarded)};
 vm.createContext(ctx);
 vm.runInContext(src.slice(start,end)+';this.readState=readState;this.save=save;',ctx);
 assert.equal(ctx.readState().credits,720,`${mode}: recovered pending reward`);
 assert.equal(JSON.parse(store.get(STORAGE)).credits,720,`${mode}: repaired primary`);
 // Cleanup may throw or silently do nothing, but an old pending record must not replay later.
 assert.equal(ctx.readState().credits,720,`${mode}: repeated reload stable`);
 cleanupBlocked=false;
 assert.equal(ctx.readState().credits,720,`${mode}: cleanup recovery stable`);
 assert.equal(store.has(STORAGE+'_pending'),false,`${mode}: stale pending cleared`);
 ctx.state.credits=765;ctx.state.atlas.repeats=1;
 ctx.save();
 assert.equal(ctx.readState().credits,765,`${mode}: subsequent save not overwritten by stale journal`);
 assert.equal(ctx.readState().atlas.repeats,1,`${mode}: duplicate count persists`);
 assert.equal(ctx.readState().atlas.claimed.length,1,`${mode}: reward claim remains once`);
 assert.equal(store.has(STORAGE+'_pending'),false,`${mode}: subsequent journal cleared`);
}
console.log('PASS: interrupted pending cleanup and later saves preserve exactly-once rewards');
