const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/game.js','utf8');
const start=src.indexOf('  const safeObject='),end=src.indexOf('  function regen(){',start);
assert(start>=0&&end>start);
const STORAGE='luma_consecutive';
const baseState={credits:0,xp:0,runs:0,wins:0,best:0,total:0,totalJumps:0,damageTaken:0,energy:5,energyAt:Date.now(),upgrades:{scanner:0,magnet:0,shield:0},dailyProgress:{key:'',launches:0,jumps:0,banked:0,claimed:[]},milestones:[],buildings:[],atlas:{discovered:[],claimed:[],repeats:0},skins:['aurora'],skin:'aurora',dailyClaim:'',dailyStreak:0,sound:false};
for(const mode of ['throw','silent']){
 const store=new Map();let blocked=true;
 const localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem(k){if(blocked&&k===STORAGE+'_pending'){if(mode==='throw')throw Error('cleanup denied');return;}store.delete(k);}};
 const ctx={localStorage,STORAGE,structuredClone,Date,Math,console,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),dateKey:()=>'',toLocalDay:()=>new Date(),notify:()=>{},baseState,state:structuredClone(baseState)};
 vm.createContext(ctx);vm.runInContext(src.slice(start,end)+';this.readState=readState;this.save=save;',ctx);
 for(let i=1;i<=5;i++){
  ctx.state.credits=i*100;ctx.state.atlas.repeats=i;
  ctx.save();
  assert.equal(ctx.readState().credits,i*100,`${mode}: latest save ${i}`);
  assert.equal(ctx.readState().atlas.repeats,i,`${mode}: repeat count ${i}`);
  assert.equal(JSON.parse(store.get(STORAGE)).credits,i*100,`${mode}: primary ${i}`);
 }
 blocked=false;
 assert.equal(ctx.readState().credits,500,`${mode}: final checkpoint`);
 assert.equal(store.has(STORAGE+'_pending'),false,`${mode}: pending cleared`);
}
console.log('PASS: consecutive saves during journal cleanup outage retain latest progress');
