const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(__dirname+'/game.js','utf8');
const start=src.indexOf('  const safeObject='),end=src.indexOf('  function regen(){',start);
const baseState={credits:150,energy:5,energyAt:Date.now(),xp:0,runs:0,wins:0,best:0,total:0,totalJumps:0,damageTaken:0,upgrades:{scanner:0,magnet:0,shield:0},skins:['aurora'],skin:'aurora',dailyClaim:'',dailyStreak:0,dailyProgress:{key:'',launches:0,jumps:0,banked:0,claimed:[]},milestones:[],buildings:[],atlas:{discovered:[],claimed:[],repeats:0},sound:false};
for(const mode of ['normal','backup-denied','backup-silent','primary-denied','fresh']){
 const data=new Map();if(mode!=='fresh')data.set('luma_drift_save_v2',JSON.stringify(baseState));
 const warnings=[];const localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>{if((mode==='backup-denied'&&k.endsWith('_backup'))||(mode==='primary-denied'&&k==='luma_drift_save_v2'))throw Error('denied');if(mode==='backup-silent'&&k.endsWith('_backup'))return;data.set(k,v)},removeItem:k=>data.delete(k)};
 const ctx={Date,Math,JSON,Array,Set,Number,structuredClone,localStorage,baseState,STORAGE:'luma_drift_save_v2',clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),dateKey:(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,toLocalDay:k=>{const [y,m,d]=(k||'').split('-').map(Number);return new Date(y,m-1,d)},notify:m=>warnings.push(m),state:{...baseState,credits:250}};
 vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);vm.runInContext('save()',ctx);
 assert.equal(JSON.parse(data.get('luma_drift_save_v2')).credits,mode==='primary-denied'?150:250,mode);
 assert.equal(warnings.length,['backup-denied','backup-silent','primary-denied'].includes(mode)?1:0,mode);
 if(mode.startsWith('backup-'))assert.match(warnings[0],/backup/i);
 if(mode==='normal')assert.equal(JSON.parse(data.get('luma_drift_save_v2_backup')).credits,150);
}
console.log('PASS: verified backup writes, backup failure warnings, primary failure and fresh saves');
