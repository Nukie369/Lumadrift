const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/game.js','utf8');
const a=src.indexOf('  const safeObject='),b=src.indexOf('  function regen(){',a);
assert(a>=0&&b>a);
const STORAGE='luma_equal_revision_conflicts';
const baseState={credits:0,xp:0,runs:0,wins:0,best:0,total:0,totalJumps:0,damageTaken:0,energy:5,energyAt:Date.now(),upgrades:{scanner:0,magnet:0,shield:0},dailyProgress:{key:'',launches:0,jumps:0,banked:0,claimed:[]},milestones:[],buildings:[],atlas:{discovered:[],claimed:[],repeats:0},skins:['aurora'],skin:'aurora',dailyClaim:'',dailyStreak:0,sound:false};
const cp=(credits,claimed,rev=12)=>JSON.stringify({...baseState,credits,saveRevision:rev,atlas:{discovered:['bloom','pearl','kite'],claimed:claimed?['skyward']:[],repeats:claimed?1:0}});
function scenario(primary,backup,pending,expected,source){
 const store=new Map();for(const [suffix,value] of [['',primary],['_backup',backup],['_pending',pending]])if(value!==null)store.set(STORAGE+suffix,value);
 const localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const ctx={localStorage,STORAGE,structuredClone,Date,Math,console,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),dateKey:()=>'',toLocalDay:()=>new Date(),notify:()=>{},baseState,state:structuredClone(baseState)};
 vm.createContext(ctx);vm.runInContext(src.slice(a,b)+';this.readState=readState;this.save=save;',ctx);
 for(let i=0;i<3;i++){
  const result=ctx.readState();assert.equal(result.credits,expected);assert.equal(result.atlas.claimed.includes('skyward'),source);
  assert.equal(result.saveRevision,12);assert.equal(JSON.parse(store.get(STORAGE)).credits,expected);
 }
 ctx.state=ctx.readState();ctx.state.credits+=17;ctx.save();
 const saved=ctx.readState();assert.equal(saved.credits,expected+17);assert.equal(saved.atlas.claimed.includes('skyward'),source);assert.equal(saved.saveRevision,13);
 assert.equal(store.has(STORAGE+'_pending'),false);
}
// A verified pending transaction is authoritative on equal revisions, preserving interrupted commits.
scenario(cp(100,true),cp(200,false),cp(300,false),300,false);
scenario(cp(100,false),cp(200,true),cp(300,true),300,true);
// Without primary, the pending transaction wins over the backup at equal revision.
scenario('{corrupt',cp(200,false),cp(300,true),300,true);
scenario(null,cp(200,true),cp(300,false),300,false);
// Without primary or pending, the backup is the only valid checkpoint.
scenario('{corrupt',cp(200,true),'{corrupt',200,true);
console.log('PASS: equal-revision conflicting reward claims follow deterministic precedence and persist across reload/save');
