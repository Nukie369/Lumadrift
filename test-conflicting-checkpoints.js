const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/game.js','utf8');
const a=src.indexOf('  const safeObject='),b=src.indexOf('  function regen(){',a);
const STORAGE='luma_conflicting_checkpoints';
const baseState={credits:0,xp:0,runs:0,wins:0,best:0,total:0,totalJumps:0,damageTaken:0,energy:5,energyAt:Date.now(),upgrades:{scanner:0,magnet:0,shield:0},dailyProgress:{key:'',launches:0,jumps:0,banked:0,claimed:[]},milestones:[],buildings:[],atlas:{discovered:[],claimed:[],repeats:0},skins:['aurora'],skin:'aurora',dailyClaim:'',dailyStreak:0,sound:false};
function run(primary,backup,pending,expected){
 const store=new Map();for(const [suffix,value] of [['',primary],['_backup',backup],['_pending',pending]])if(value!==null)store.set(STORAGE+suffix,value);
 const localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const ctx={localStorage,STORAGE,structuredClone,Date,Math,console,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),dateKey:()=>'',toLocalDay:()=>new Date(),notify:()=>{},baseState,state:structuredClone(baseState)};
 vm.createContext(ctx);vm.runInContext(src.slice(a,b)+';this.readState=readState;this.save=save;',ctx);
 const result=ctx.readState();assert.equal(result.credits,expected.credits);assert.equal(result.saveRevision,expected.rev);
 assert.equal(JSON.parse(store.get(STORAGE)).credits,expected.credits);
 ctx.state=result;ctx.state.credits+=10;ctx.save();assert.equal(ctx.readState().credits,expected.credits+10);
 assert.equal(ctx.readState().saveRevision,expected.rev+1);
}
const cp=(credits,saveRevision)=>JSON.stringify({...baseState,credits,saveRevision,atlas:{discovered:['bloom','pearl','kite'],claimed:['skyward'],repeats:1}});
run(cp(100,2),cp(250,5),cp(200,4),{credits:250,rev:5});
run(cp(300,6),cp(200,4),cp(250,5),{credits:300,rev:6});
run('{corrupt',cp(400,7),cp(500,8),{credits:500,rev:8});
run('{corrupt',cp(600,9),'{corrupt',{credits:600,rev:9});
run(cp(700,10),cp(600,9),cp(800,10),{credits:800,rev:10});
console.log('PASS: primary, backup and journal conflicts choose highest verified revision');
