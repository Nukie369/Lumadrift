const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/game.js','utf8');
const a=src.indexOf('  const safeObject='),b=src.indexOf('  function regen(){',a);
const STORAGE='luma_revision_migration';
const baseState={credits:0,xp:0,runs:0,wins:0,best:0,total:0,totalJumps:0,damageTaken:0,energy:5,energyAt:Date.now(),upgrades:{scanner:0,magnet:0,shield:0},dailyProgress:{key:'',launches:0,jumps:0,banked:0,claimed:[]},milestones:[],buildings:[],atlas:{discovered:[],claimed:[],repeats:0},skins:['aurora'],skin:'aurora',dailyClaim:'',dailyStreak:0,sound:false};
const make=()=>{const store=new Map(),warnings=[];const localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};const ctx={localStorage,STORAGE,structuredClone,Date,Math,console,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),dateKey:()=>'',toLocalDay:()=>new Date(),notify:x=>warnings.push(x),baseState,state:structuredClone(baseState)};vm.createContext(ctx);vm.runInContext(src.slice(a,b)+';this.readState=readState;this.save=save;',ctx);return {store,ctx};};
// Old saves have no revision; a newer verified journal must recover them.
{
 const {store,ctx}=make();store.set(STORAGE,JSON.stringify({...baseState,credits:100}));store.set(STORAGE+'_pending',JSON.stringify({...baseState,credits:350,saveRevision:1}));
 const recovered=ctx.readState();assert.equal(recovered.credits,350);assert.equal(recovered.saveRevision,1);assert.equal(JSON.parse(store.get(STORAGE)).credits,350);assert.equal(store.has(STORAGE+'_pending'),false);
 ctx.state=recovered;ctx.state.credits=400;ctx.save();assert.equal(ctx.readState().saveRevision,2);assert.equal(ctx.readState().credits,400);
}
// Corrupt primary is repaired from a verified pending checkpoint with revision retained.
{
 const {store,ctx}=make();store.set(STORAGE,'{torn');store.set(STORAGE+'_pending',JSON.stringify({...baseState,credits:600,saveRevision:7}));
 const recovered=ctx.readState();assert.equal(recovered.credits,600);assert.equal(recovered.saveRevision,7);ctx.state=recovered;ctx.state.credits=645;ctx.save();assert.equal(ctx.readState().saveRevision,8);assert.equal(ctx.readState().credits,645);
}
// A valid newer primary must beat an older journal, even if that journal is legacy.
{
 const {store,ctx}=make();store.set(STORAGE,JSON.stringify({...baseState,credits:900,saveRevision:9}));store.set(STORAGE+'_pending',JSON.stringify({...baseState,credits:100}));
 const restored=ctx.readState();assert.equal(restored.credits,900);assert.equal(restored.saveRevision,9);assert.equal(store.has(STORAGE+'_pending'),false);
}
console.log('PASS: legacy revision migration and corrupted primary checkpoint recovery');
