// Regression: a partially completed reset must not silently replace surviving damaged checkpoints.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/game.js','utf8');
const start=src.indexOf('  if(recoveryBlocked){\n    const banner=');
const end=src.indexOf('  setInterval(updateDay',start);
assert(start>=0&&end>start);
const snippet=src.slice(start,end);
const primary='luma_drift_save_v2',backup=primary+'_backup',pending=primary+'_pending';
const store=new Map([[primary,'corrupted primary'],[backup,'corrupted backup'],[pending,'corrupted pending']]);
let failBackup=true, click, removed=false, saveCalls=0;
const messages=[];
const localStorage={getItem:k=>store.has(k)?store.get(k):null,
 removeItem:k=>{if(k===backup&&failBackup)return;store.delete(k)},
 setItem:(k,v)=>store.set(k,v)};
const document={createElement:()=>({style:{},setAttribute(){},append(){},addEventListener:(_,cb)=>{click=cb},remove(){removed=true}}),body:{append(){}}};
const context={document,window:{confirm:()=>true},localStorage,STORAGE:primary,BACKUP_STORAGE:backup,PENDING_STORAGE:pending,recoveryBlocked:true,pendingStorageWarning:'',notify:m=>messages.push(m),save:()=>{saveCalls++;localStorage.setItem(primary,JSON.stringify({credits:150}))},parseSaved:raw=>{try{const o=JSON.parse(raw);return typeof o.credits==='number'?o:null}catch{return null}}};
vm.createContext(context);vm.runInContext(snippet,context);
click();
assert.equal(store.has(primary),false,'first key may be deleted');
assert.equal(store.get(backup),'corrupted backup','failed backup removal must remain visible');
assert.equal(store.get(pending),'corrupted pending','later keys must not be cleared');
assert.equal(saveCalls,0,'no new save may be committed after partial reset');
assert.equal(removed,false,'warning must remain');
assert.equal(context.recoveryBlocked,true,'writes remain blocked');
failBackup=false;click();
assert.equal(saveCalls,1,'retry saves exactly once');
assert.equal(removed,true,'warning dismissed only after verified save');
assert.equal(store.has(backup),false);assert.equal(store.has(pending),false);
assert.equal(JSON.parse(store.get(primary)).credits,150);
assert.equal(messages.at(-1),'New game saved.');
console.log('PASS: partial checkpoint removal preserves remaining damaged data; successful retry commits fresh save');
