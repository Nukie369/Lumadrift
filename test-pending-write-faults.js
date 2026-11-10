const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/game.js','utf8');
const i=src.indexOf('  const safeObject='),j=src.indexOf('  function regen(){',i);
assert(i>=0&&j>i);
const STORAGE='luma_fault';
const baseState={credits:0,xp:0,runs:0,wins:0,best:0,total:0,totalJumps:0,damageTaken:0,energy:5,energyAt:Date.now(),upgrades:{scanner:0,magnet:0,shield:0},dailyProgress:{key:'',launches:0,jumps:0,banked:0,claimed:[]},milestones:[],buildings:[],atlas:{discovered:[],claimed:[],repeats:0},skins:['aurora'],skin:'aurora',dailyClaim:'',dailyStreak:0,sound:false};
function harness(failure){
 const store=new Map(), warnings=[];
 const checkpoint=structuredClone(baseState);checkpoint.credits=120;checkpoint.atlas.discovered=['bloom'];
 store.set(STORAGE,JSON.stringify(checkpoint));
 const localStorage={getItem(k){if(failure==='unavailable'&&k===STORAGE+'_pending')throw Error('blocked');return store.get(k)??null;},setItem(k,v){if(k===STORAGE+'_pending'&&failure==='throw')throw Error('quota');if(k===STORAGE+'_pending'&&failure==='torn'){store.set(k,'{"credits":');throw Error('torn');}if(k===STORAGE+'_pending'&&failure==='silent')return;if(failure==='unavailable')throw Error('blocked');store.set(k,v);},removeItem:k=>store.delete(k)};
 const ctx={localStorage,STORAGE,structuredClone,Date,Math,console,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),dateKey:()=>'',toLocalDay:()=>new Date(),notify:m=>warnings.push(m),baseState};
 vm.createContext(ctx);
 vm.runInContext(src.slice(i,j)+';let state=structuredClone(baseState);this.setState=x=>state=x;this.readState=readState;this.save=save;',ctx);
 const newState=structuredClone(checkpoint);newState.credits=720;newState.atlas.claimed=['deep'];
 ctx.setState(newState);ctx.save();
 assert.equal(JSON.parse(store.get(STORAGE)).credits,120,`${failure}: last primary must remain valid`);
 const recovered=ctx.readState();
 assert.equal(recovered.credits,120,`${failure}: incomplete pending must not be committed`);
 assert.equal(recovered.atlas.claimed.length,0,`${failure}: no phantom collection reward`);
 assert.ok(warnings.length,`${failure}: storage failure must be surfaced`);
}
for(const mode of ['throw','torn','silent','unavailable'])harness(mode);
console.log('PASS: pending write failures (throw/torn/silent/unavailable) preserve last valid checkpoint');
