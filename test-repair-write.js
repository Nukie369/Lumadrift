const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/game.js','utf8');
const start=src.indexOf('  const safeObject='),end=src.indexOf('  function regen(){',start);
const baseState={credits:150,energy:5,energyAt:Date.now(),xp:0,runs:0,wins:0,best:0,total:0,totalJumps:0,damageTaken:0,upgrades:{scanner:0,magnet:0,shield:0},skins:['aurora'],skin:'aurora',dailyClaim:'',dailyStreak:0,dailyProgress:{key:'',launches:0,jumps:0,banked:0,claimed:[]},milestones:[],buildings:[],atlas:{discovered:[],claimed:[],repeats:0},sound:false};
for(const mode of ['normal','silent-drop','write-denied']){
 const data=new Map([['luma_drift_save_v2','{broken'],['luma_drift_save_v2_backup',JSON.stringify({...baseState,credits:470})]]),warnings=[];
 const localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>{if(mode==='write-denied')throw Error('denied');if(mode!=='silent-drop')data.set(k,v)}};
 const ctx={Date,Math,JSON,Array,Set,Number,structuredClone,localStorage,baseState,STORAGE:'luma_drift_save_v2',clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),dateKey:(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,toLocalDay:k=>{const [y,m,d]=(k||'').split('-').map(Number);return new Date(y,m-1,d)},notify:m=>warnings.push(m)};
 vm.createContext(ctx);const {readState,getWarning}=vm.runInContext(src.slice(start,end)+'\n({readState,getWarning:()=>pendingStorageWarning})',ctx);
 assert.equal(readState().credits,470);
 assert.equal(warnings.length,0,mode);
 assert.equal(Boolean(getWarning()),mode!=='normal',mode);
 assert.equal(data.get('luma_drift_save_v2')==='{broken',mode!=='normal');
 assert.equal(JSON.parse(data.get('luma_drift_save_v2_backup')).credits,470);
}
console.log('PASS: repaired primary verified; silent and denied writes warned; backup intact');
