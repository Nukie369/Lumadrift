const fs=require('fs'),vm=require('vm'),assert=require('assert');
const root=__dirname;
const src=fs.readFileSync(root+'/game.js','utf8');
const slice=(a,b)=>{const start=src.indexOf(a),end=src.indexOf(b,start);assert(start>=0&&end>start,`${a} extraction bounds`);return src.slice(start,end)};
const logic=slice('  const safeObject=','  function save(){')+'\n'+slice('  function encodeBackup(','  function exportBackup(){');
const ctx={STORAGE:'luma_drift_save_v2',Date,structuredClone,JSON,Math,Number,Array,Set,
 clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),
 dateKey:(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
 toLocalDay:k=>{const [y,m,d]=(k||'').split('-').map(Number);return new Date(y,m-1,d)},
 baseState:{credits:150,energy:5,energyAt:Date.now(),xp:0,runs:0,wins:0,best:0,total:0,totalJumps:0,damageTaken:0,upgrades:{scanner:0,magnet:0,shield:0},skins:['aurora'],skin:'aurora',dailyClaim:'',dailyStreak:0,dailyProgress:{key:'',launches:0,jumps:0,banked:0,claimed:[]},milestones:[],buildings:[],atlas:{discovered:[],claimed:[],repeats:0},sound:false}};
vm.createContext(ctx);
const codec=vm.runInContext(logic+'\n({encodeBackup,decodeBackup})',ctx);
const saved={credits:1245,energy:3,xp:500,saveRevision:14,buildings:['bloom','array'],atlas:{discovered:['bloom','key'],claimed:[],repeats:2},skins:['aurora','ember'],skin:'ember'};
const backup=JSON.parse(JSON.stringify(codec.encodeBackup(saved)));
assert.equal(backup.version,1);assert.equal(backup.format,'luma-drift-save');
const restored=codec.decodeBackup(backup);
assert.equal(restored.credits,1245);assert.equal(restored.saveRevision,14);assert.equal(restored.skin,'ember');
assert.deepEqual([...restored.buildings],['bloom','array']);
assert.deepEqual([...restored.atlas.discovered],['bloom','key']);
const changed=JSON.parse(JSON.stringify(backup));changed.payload.credits+=999;
assert.throws(()=>codec.decodeBackup(changed),/damaged/i,'tampering invalidates checksum');
const wrongVersion={...backup,version:99};assert.throws(()=>codec.decodeBackup(wrongVersion),/Unrecognized/i);
assert.throws(()=>codec.decodeBackup({format:'luma-drift-save',version:1,payload:null,checksum:'0'}));
const style=fs.readFileSync(root+'/polish.css','utf8');
assert(style.includes('grid-template-columns:repeat(5,minmax(0,1fr))'),'five-tab mobile navigation');
const html=fs.readFileSync(root+'/index.html','utf8');
for(const id of ['export-backup-btn','import-backup-btn','import-backup-file'])assert(html.includes(`id="${id}"`));
assert(src.includes('if(run){notify(\'Bank or finish your current flight before importing.'),'no import during active flight');
assert(src.includes("window.confirm('Replace this device"),'explicit confirmation');
console.log('PASS: save-transfer codec, version rejection, tamper rejection, flight guard, confirmation, five-tab navigation');
