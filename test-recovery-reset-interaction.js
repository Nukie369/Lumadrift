const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/game.js','utf8');
const snippet=src.slice(src.indexOf('  if(recoveryBlocked){\n    const banner='),src.indexOf('  setInterval(updateDay',src.indexOf('  if(recoveryBlocked){\n    const banner=')));
assert(snippet.includes('Checkpoint removal verification failed'));
function scenario({confirm=true,failRemove=false,throwRemove=false,failSave=false}={}){
 const store=new Map([['primary','bad'],['backup','bad'],['pending','bad']]);const messages=[];let clicked,removed=false,saves=0;
 const localStorage={getItem:k=>store.has(k)?store.get(k):null,removeItem:k=>{if(throwRemove)throw Error('denied');if(!failRemove)store.delete(k)},setItem:(k,v)=>store.set(k,v)};
 const document={createElement:()=>({style:{},setAttribute(){},append(){},addEventListener(_,cb){clicked=cb},remove(){removed=true}}),body:{append(){}}};
 const context={document,window:{confirm:()=>confirm},localStorage,STORAGE:'primary',BACKUP_STORAGE:'backup',PENDING_STORAGE:'pending',recoveryBlocked:true,pendingStorageWarning:'',notify:m=>messages.push(m),save:()=>{saves++;if(!failSave)localStorage.setItem('primary',JSON.stringify({credits:150,checkpointHash:'valid'}))},parseSaved:v=>{try{return JSON.parse(v)?.checkpointHash==='valid'?JSON.parse(v):null}catch{return null}}};
 vm.createContext(context);vm.runInContext(snippet,context);clicked();return {context,store,messages,removed,saves};
}
let r=scenario({confirm:false});assert.equal(r.removed,false);assert.equal(r.saves,0);assert.equal(r.store.size,3);
r=scenario({failRemove:true});assert.equal(r.removed,false);assert.equal(r.context.recoveryBlocked,true);assert.equal(r.saves,0);assert.equal(r.store.size,3);
r=scenario({throwRemove:true});assert.equal(r.removed,false);assert.equal(r.context.recoveryBlocked,true);assert.equal(r.saves,0);
r=scenario({failSave:true});assert.equal(r.removed,false);assert.equal(r.context.recoveryBlocked,true);assert.equal(r.saves,1);
r=scenario();assert.equal(r.removed,true);assert.equal(r.context.recoveryBlocked,false);assert.equal(r.saves,1);assert.equal(r.messages.at(-1),'New game saved.');
console.log('PASS: reset cancellation, silent/throwing removal failures, failed new save, verified successful reset');
