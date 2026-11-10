// Regression coverage for state recovery of earned cosmetics and colony progress.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/game.js','utf8');
const start=src.indexOf('  const safeObject='),end=src.indexOf('  function save(){',start);
assert(start>=0&&end>start);
const data=new Map(),localStorage={getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,v)};
const baseState={credits:150,energy:5,energyAt:Date.now(),xp:0,runs:0,wins:0,best:0,total:0,totalJumps:0,damageTaken:0,upgrades:{scanner:0,magnet:0,shield:0},skins:['aurora'],skin:'aurora',dailyClaim:'',dailyStreak:0,dailyProgress:{key:'',launches:0,jumps:0,banked:0,claimed:[]},milestones:[],buildings:[],atlas:{discovered:[],claimed:[],repeats:0},sound:false};
const ctx={STORAGE:'luma_drift_save_v2',localStorage,Date,Math,JSON,Array,Set,Number,structuredClone,baseState,clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),dateKey:(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,toLocalDay:k=>{const [y,m,d]=(k||'').split('-').map(Number);return new Date(y,m-1,d)},notify:()=>{}};
vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);
const valid={...baseState,credits:1245,skins:['aurora','ember','phantom'],skin:'phantom',buildings:['bloom'],atlas:{discovered:['pearl'],claimed:[],repeats:0}};
const read=()=>vm.runInContext('readState()',ctx);
data.set('luma_drift_save_v2',JSON.stringify(valid));
let got=read();assert.equal(got.skin,'phantom');assert.deepEqual([...got.skins],valid.skins);assert.deepEqual([...got.buildings],['bloom']);
data.set('luma_drift_save_v2_backup',JSON.stringify(valid));data.set('luma_drift_save_v2','{invalid-json');
got=read();assert.equal(got.skin,'phantom');assert.equal(got.credits,1245);assert.deepEqual([...got.atlas.discovered],['pearl']);
assert.equal(JSON.parse(data.get('luma_drift_save_v2')).skin,'phantom');
data.set('luma_drift_save_v2','{broken');data.set('luma_drift_save_v2_backup','{also-broken');
got=read();assert.equal(got.skin,'aurora');assert.equal(got.credits,150);
console.log('PASS: valid cosmetic and colony reload, backup recovery and repair, double-corrupt fallback');
