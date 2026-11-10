const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/game.js','utf8');
const a=src.indexOf('  const safeObject='),b=src.indexOf('  function regen(){',a);
const STORAGE='luma_stale';
const baseState={credits:0,xp:0,runs:0,wins:0,best:0,total:0,totalJumps:0,damageTaken:0,energy:5,energyAt:Date.now(),upgrades:{scanner:0,magnet:0,shield:0},dailyProgress:{key:'',launches:0,jumps:0,banked:0,claimed:[]},milestones:[],buildings:[],atlas:{discovered:[],claimed:[],repeats:0},skins:['aurora'],skin:'aurora',dailyClaim:'',dailyStreak:0,sound:false};
for(const mode of ['throw','silent']){
 const store=new Map(),warnings=[];let failPending=false;
 const localStorage={getItem:k=>store.get(k)??null,setItem(k,v){if(failPending&&k===STORAGE+'_pending'){if(mode==='throw')throw Error('pending overwrite failed');return;}store.set(k,v);},removeItem(k){if(k!==STORAGE+'_pending')store.delete(k);}};
 const ctx={localStorage,STORAGE,structuredClone,Date,Math,console,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),dateKey:()=>'',toLocalDay:()=>new Date(),notify:x=>warnings.push(x),baseState,state:structuredClone(baseState)};
 vm.createContext(ctx);vm.runInContext(src.slice(a,b)+';this.readState=readState;this.save=save;',ctx);
 ctx.state.credits=100;ctx.save();
 const stale=store.get(STORAGE+'_pending');
 ctx.state.credits=200;ctx.save();
 assert.equal(JSON.parse(store.get(STORAGE)).credits,200);
 store.set(STORAGE+'_pending',stale);failPending=true;
 ctx.state.credits=300;ctx.save();
 assert.equal(JSON.parse(store.get(STORAGE)).credits,200,`${mode}: failed save must not alter primary`);
 assert.equal(ctx.readState().credits,200,`${mode}: stale journal must not override newer primary`);
 assert.equal(ctx.readState().saveRevision,2,`${mode}: revision preserved`);
 assert.ok(warnings.length,`${mode}: failed save warns player`);
}
console.log('PASS: stale pending overwrite failures never supersede newer primary');
