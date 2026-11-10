const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/game.js','utf8');
const a=src.indexOf('  const safeObject='),b=src.indexOf('  function regen(){',a);
const STORAGE='luma_integrity_test';
const baseState={credits:0,xp:0,runs:0,wins:0,best:0,total:0,totalJumps:0,damageTaken:0,energy:5,energyAt:Date.now(),upgrades:{scanner:0,magnet:0,shield:0},dailyProgress:{key:'',launches:0,jumps:0,banked:0,claimed:[]},milestones:[],buildings:[],atlas:{discovered:[],claimed:[],repeats:0},skins:['aurora'],skin:'aurora',dailyClaim:'',dailyStreak:0,sound:false};
const store=new Map();const localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
const ctx={localStorage,STORAGE,structuredClone,Date,Math,console,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),dateKey:()=>'',toLocalDay:()=>new Date(),notify:()=>{},baseState,state:structuredClone(baseState)};
vm.createContext(ctx);vm.runInContext(src.slice(a,b)+';this.readState=readState;this.save=save;this.parseSaved=parseSaved;',ctx);
ctx.state.credits=500;ctx.save();
const original=store.get(STORAGE);assert.match(original,/checkpointHash/);
assert.equal(ctx.readState().credits,500);
const tampered=JSON.parse(original);tampered.credits=9000;store.set(STORAGE,JSON.stringify(tampered));
assert.equal(ctx.parseSaved(store.get(STORAGE)),null,'modified primary must be rejected');
assert.equal(ctx.readState().credits,0,'without a valid fallback, do not trust altered primary');
// Valid older save formats remain readable and migrate to checksummed writes.
store.set(STORAGE,JSON.stringify({...baseState,credits:77}));
assert.equal(ctx.readState().credits,77);ctx.state=ctx.readState();ctx.save();
assert.equal(ctx.readState().credits,77);assert.match(store.get(STORAGE),/checkpointHash/);
// Damaged primary must recover a verified backup.
const valid=store.get(STORAGE);store.set(STORAGE+'_backup',valid);
const bad=JSON.parse(valid);bad.atlas.claimed=['deep'];store.set(STORAGE,JSON.stringify(bad));
assert.equal(ctx.readState().credits,77);assert.deepEqual(Array.from(ctx.readState().atlas.claimed),[]);
console.log('PASS: checksum rejects changed credits and reward claims, restores verified backup, and migrates legacy saves');
