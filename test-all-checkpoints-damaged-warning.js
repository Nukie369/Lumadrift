const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/game.js','utf8');
const a=src.indexOf('  const safeObject='),b=src.indexOf('  function regen(){',a);
const STORAGE='luma_warning_test';const baseState={credits:0,xp:0,runs:0,wins:0,best:0,total:0,totalJumps:0,damageTaken:0,energy:5,energyAt:Date.now(),upgrades:{scanner:0,magnet:0,shield:0},dailyProgress:{key:'',launches:0,jumps:0,banked:0,claimed:[]},milestones:[],buildings:[],atlas:{discovered:[],claimed:[],repeats:0},skins:['aurora'],skin:'aurora',dailyClaim:'',dailyStreak:0,sound:false};
function run(initial){const store=new Map(initial),localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};const ctx={localStorage,STORAGE,structuredClone,Date,Math,console,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),dateKey:()=>'',toLocalDay:()=>new Date(),notify:()=>{},baseState,state:structuredClone(baseState)};vm.createContext(ctx);vm.runInContext(src.slice(a,b)+';this.readState=readState;this.save=save;this.blocked=()=>recoveryBlocked;this.warning=()=>pendingStorageWarning;',ctx);return {ctx,store};}
const damaged='{"credits":250,"checkpointHash":"bad"}';
const f=run([[STORAGE,damaged],[STORAGE+'_backup',damaged],[STORAGE+'_pending',damaged]]);
assert.equal(f.ctx.readState().credits,0);assert.equal(f.ctx.blocked(),true);assert.match(f.ctx.warning(),/could not be verified/);
f.ctx.state.credits=900;f.ctx.save();assert.equal(f.store.get(STORAGE),damaged);assert.equal(f.store.get(STORAGE+'_backup'),damaged);assert.equal(f.store.get(STORAGE+'_pending'),damaged);
const clean=run([]);assert.equal(clean.ctx.readState().credits,0);assert.equal(clean.ctx.blocked(),false);clean.ctx.save();assert.ok(clean.store.has(STORAGE));
console.log('PASS: damaged saves show recovery state and remain untouched; clean installs save normally');
