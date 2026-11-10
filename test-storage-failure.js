const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/game.js','utf8');
const start=src.indexOf('  const safeObject='),end=src.indexOf('  function regen(){',start);
const data=new Map();let mode='normal',warnings=[];
const localStorage={getItem:k=>{if(mode==='read-denied')throw Error('denied');return data.get(k)||null},setItem:(k,v)=>{if(mode==='write-denied')throw Error('quota');if(mode!=='silent-drop')data.set(k,v)},removeItem:k=>data.delete(k)};
const baseState={credits:150,energy:5,energyAt:Date.now(),xp:0,runs:0,wins:0,best:0,total:0,totalJumps:0,damageTaken:0,upgrades:{scanner:0,magnet:0,shield:0},skins:['aurora'],skin:'aurora',dailyClaim:'',dailyStreak:0,dailyProgress:{key:'',launches:0,jumps:0,banked:0,claimed:[]},milestones:[],buildings:[],atlas:{discovered:[],claimed:[],repeats:0},sound:false};
const ctx={Date,Math,JSON,Array,Set,Number,structuredClone,localStorage,baseState,STORAGE:'luma_drift_save_v2',clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),dateKey:(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,toLocalDay:k=>{const [y,m,d]=(k||'').split('-').map(Number);return new Date(y,m-1,d)},notify:m=>warnings.push(m)};
vm.createContext(ctx);const {save,readState}=vm.runInContext(src.slice(start,end)+'\n({save,readState})',ctx);
ctx.state={...baseState,credits:300};save();assert.equal(readState().credits,300);assert.equal(warnings.length,0);
for(const failure of ['write-denied','silent-drop']){mode=failure;ctx.state={...baseState,credits:400};save();assert.equal(warnings.length,['write-denied','silent-drop'].indexOf(failure)+1);mode='normal';assert.equal(readState().credits,300,'failed write must not replace saved progress');}
mode='read-denied';assert.equal(readState().credits,150,'read denial safely falls back');mode='normal';assert.equal(readState().credits,300,'save still available after access restored');
console.log('PASS: normal save, quota rejection, silent write drop, read restriction, recovery after restored access');
