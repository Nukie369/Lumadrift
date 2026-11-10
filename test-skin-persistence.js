const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/game.js','utf8');
const start=source.indexOf('  const safeObject=');
const end=source.indexOf('  function save(){',start);
assert(start>=0&&end>start);
const code=source.slice(start,end);
const ctx={STORAGE:"luma_drift_save_v2",Date,structuredClone,JSON,Math,Number,Array,Set,console,
 clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),
 dateKey:(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
 toLocalDay:k=>{const [y,m,d]=(k||'').split('-').map(Number);return new Date(y,m-1,d)},
 baseState:{credits:150,energy:5,energyAt:Date.now(),xp:0,runs:0,wins:0,best:0,total:0,totalJumps:0,damageTaken:0,upgrades:{scanner:0,magnet:0,shield:0},skins:['aurora'],skin:'aurora',dailyClaim:'',dailyStreak:0,dailyProgress:{key:'',launches:0,jumps:0,banked:0,claimed:[]},milestones:[],buildings:[],atlas:{discovered:[],claimed:[],repeats:0},sound:false}};
vm.createContext(ctx);
const normalize=vm.runInContext(code+'\nnormalizeState',ctx);
for(const skin of ['ember','phantom','verdant']){
 const stored=JSON.parse(JSON.stringify({credits:125,skins:['aurora',skin],skin}));
 const restored=normalize(stored);
 assert.equal(restored.skin,skin,`equipped ${skin} should survive reload`);
 assert(restored.skins.includes(skin),`ownership of ${skin} should survive reload`);
 assert.equal(restored.credits,125,'reload must not refund or charge again');
}
const invalid=normalize({skins:['aurora','fake','ember','ember'],skin:'fake'});
assert.deepEqual([...invalid.skins],['aurora','ember']);
assert.equal(invalid.skin,'aurora');
console.log('PASS: purchased skins persist; unknown and duplicate IDs rejected');
