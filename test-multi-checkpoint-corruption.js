const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/game.js','utf8');
const a=src.indexOf('  const safeObject='),b=src.indexOf('  function regen(){',a);
const STORAGE='luma_integrity_matrix';
const baseState={credits:0,xp:0,runs:0,wins:0,best:0,total:0,totalJumps:0,damageTaken:0,energy:5,energyAt:Date.now(),upgrades:{scanner:0,magnet:0,shield:0},dailyProgress:{key:'',launches:0,jumps:0,banked:0,claimed:[]},milestones:[],buildings:[],atlas:{discovered:[],claimed:[],repeats:0},skins:['aurora'],skin:'aurora',dailyClaim:'',dailyStreak:0,sound:false};
function fixture(){
 const store=new Map();const localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const ctx={localStorage,STORAGE,structuredClone,Date,Math,console,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),dateKey:()=>'',toLocalDay:()=>new Date(),notify:()=>{},baseState,state:structuredClone(baseState)};
 vm.createContext(ctx);vm.runInContext(src.slice(a,b)+';this.readState=readState;this.save=save;this.parseSaved=parseSaved;',ctx);
 function snapshot(credits,claimed,revision){ctx.state=structuredClone(baseState);ctx.state.credits=credits;ctx.state.atlas.claimed=claimed;ctx.state.saveRevision=revision-1;ctx.save();return store.get(STORAGE);}
 function corrupt(raw){const x=JSON.parse(raw);x.credits+=999;return JSON.stringify(x);}
 function check(expectedCredits,expectedClaims){const first=ctx.readState();assert.equal(first.credits,expectedCredits);assert.deepEqual(Array.from(first.atlas.claimed),expectedClaims);const second=ctx.readState();assert.equal(second.credits,expectedCredits);assert.deepEqual(Array.from(second.atlas.claimed),expectedClaims);}
 return {ctx,store,snapshot,corrupt,check};
}
// Both newer primary and pending corrupted: use verified backup and retain claimed state.
{
 const f=fixture(),backup=f.snapshot(150,['deep'],1),newer=f.snapshot(200,['deep','star'],2);
 f.store.set(STORAGE+'_backup',backup);f.store.set(STORAGE,f.corrupt(newer));f.store.set(STORAGE+'_pending',f.corrupt(newer));f.check(150,['deep']);
}
// Corrupted backup cannot compete with a verified pending reward transaction.
{
 const f=fixture(),old=f.snapshot(150,[],1),pending=f.snapshot(240,['deep'],2);
 f.store.set(STORAGE,old);f.store.set(STORAGE+'_backup',f.corrupt(old));f.store.set(STORAGE+'_pending',pending);f.check(240,['deep']);
}
// Corrupted newest pending must not replace valid committed primary.
{
 const f=fixture(),old=f.snapshot(100,[],1),primary=f.snapshot(260,['deep'],2),newest=f.snapshot(320,['deep','star'],3);
 f.store.set(STORAGE,primary);f.store.set(STORAGE+'_backup',old);f.store.set(STORAGE+'_pending',f.corrupt(newest));f.check(260,['deep']);
}
// If all copies are corrupted, reset safely rather than minting phantom rewards.
{
 const f=fixture(),s=f.snapshot(500,['deep'],1),bad=f.corrupt(s);
 f.store.set(STORAGE,bad);f.store.set(STORAGE+'_backup',bad);f.store.set(STORAGE+'_pending',bad);f.check(0,[]);
}
console.log('PASS: multi-checkpoint checksum faults preserve only verified balances and reward claims');
