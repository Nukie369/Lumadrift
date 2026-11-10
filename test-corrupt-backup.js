const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(__dirname+'/game.js','utf8');
const start=source.indexOf('  const BACKUP_STORAGE=');
const end=source.indexOf('  function save(){',start);
assert(start>=0&&end>start);
const segment=source.slice(start,end);
const PRIMARY='luma_drift_save_v2',BACKUP=PRIMARY+'_backup';
const cases=[
 {name:'invalid backup with missing primary',data:{[BACKUP]:'{bad'},expected:150},
 {name:'valid primary and invalid backup',data:{[PRIMARY]:JSON.stringify({credits:420}),[BACKUP]:'{bad'},expected:420},
 {name:'invalid primary and valid backup',data:{[PRIMARY]:'{bad',[BACKUP]:JSON.stringify({credits:730})},expected:730},
 {name:'both corrupt',data:{[PRIMARY]:'{bad',[BACKUP]:'{bad'},expected:150}
];
for(const test of cases){
 const data={...test.data};
 const localStorage={getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v};
 const ctx={localStorage,STORAGE:PRIMARY,baseState:{credits:150},structuredClone,JSON,Number,Array,console,normalizeState:x=>x};
 vm.createContext(ctx);
 const actual=vm.runInContext(segment+'\nreadState()',ctx);
 assert.equal(actual.credits,test.expected,test.name);
 if(test.name==='invalid primary and valid backup')assert.equal(JSON.parse(data[PRIMARY]).credits,730);
}
console.log('PASS: four primary/backup corruption and recovery scenarios');
