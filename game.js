(() => {
  'use strict';
  const STORAGE='luma_drift_save_v2';
  const $=id=>document.getElementById(id);
  const nf=new Intl.NumberFormat('en-US');
  const dateKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const toLocalDay=k=>{const [y,m,d]=(k||'').split('-').map(Number);return Number.isFinite(y)&&Number.isFinite(m)&&Number.isFinite(d)?new Date(y,m-1,d):new Date(2000,0,1);};
  const dayDistance=(a,b)=>Math.round((Date.UTC(toLocalDay(b).getFullYear(),toLocalDay(b).getMonth(),toLocalDay(b).getDate())-Date.UTC(toLocalDay(a).getFullYear(),toLocalDay(a).getMonth(),toLocalDay(a).getDate()))/86400000);
  const random=()=>{if(globalThis.crypto?.getRandomValues){const a=new Uint32Array(1);globalThis.crypto.getRandomValues(a);return a[0]/4294967296;}return Math.random();};
  const int=(min,max)=>min+Math.floor(random()*(max-min+1));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const validNum=(n,fallback=0)=>Number.isFinite(Number(n))?Number(n):fallback;
  const baseState={credits:150,energy:5,energyAt:Date.now(),xp:0,runs:0,wins:0,best:0,total:0,totalJumps:0,damageTaken:0,upgrades:{scanner:0,magnet:0,shield:0},skins:['aurora'],skin:'aurora',dailyClaim:'',dailyStreak:0,dailyProgress:{key:'',launches:0,jumps:0,banked:0,claimed:[]},milestones:[],buildings:[],atlas:{discovered:[],claimed:[],repeats:0,duplicateStreak:0},sound:false};
  function track(type, details={}){
    try{
      const key='luma_drift_analytics_v1';
      let entries=JSON.parse(localStorage.getItem(key)||'[]');
      if(!Array.isArray(entries))entries=[];
      entries.push({type,time:Date.now(),...details});
      localStorage.setItem(key,JSON.stringify(entries.slice(-500)));
    }catch{/* Local test analytics are optional. */}
  }
  // A flight is intentionally not resumed after a tab closes: route randomness and
  // unbanked cargo must never be replayed or awarded twice after a reload.
  const FLIGHT_STORAGE=STORAGE+'_active_flight';
  function markFlight(active){
    try{
      if(active)localStorage.setItem(FLIGHT_STORAGE,JSON.stringify({started:Date.now(),practice:active.practice,depth:active.depth}));
      else localStorage.removeItem(FLIGHT_STORAGE);
    }catch{/* Storage restrictions cannot interrupt gameplay. */}
  }
  function interruptedFlight(){
    try{
      const raw=localStorage.getItem(FLIGHT_STORAGE);
      if(!raw)return null;
      localStorage.removeItem(FLIGHT_STORAGE);
      const flight=JSON.parse(raw);
      if(!flight||typeof flight!=='object'||typeof flight.started!=='number'||!Number.isFinite(flight.started))return null;
      if(flight.started>Date.now()+60000||Date.now()-flight.started>7*86400000)return null;
      return flight.practice===true?'Your practice flight ended when the game closed. No virtual rewards were affected.':'Your expedition ended when the game closed. Unbanked virtual cargo was not awarded. Fuel and completed mission progress remain saved.';
    }catch{return null;}
  }
  let run=null, toastTimeout;
  let mostRecentLandmark=null;
  const upDefs=[
    {id:'scanner',name:'Echo Scanner',icon:'📡',desc:'Read the storms more clearly. Lowers hazard chance by 3 percentage points per rank.',max:3,cost:[250,650,1450]},
    {id:'magnet',name:'Salvage Magnet',icon:'🧲',desc:'Collect 10% more shards from successful crossings per rank.',max:3,cost:[300,750,1650]},
    {id:'shield',name:'Hull Weave',icon:'🛡️',desc:'Adds one hull point to your ship per rank.',max:2,cost:[450,1200]}
  ];
  const skins=[
    {id:'aurora',name:'Aurora',icon:'🔷',desc:'The Wisp’s original cosmic finish.',cost:0,color:['#4bd1dc','#8a90f7','#b8c6ff','#141e45']},
    {id:'ember',name:'Solar Ember',icon:'🔶',desc:'Make the stars look twice.',cost:450,color:['#ffac63','#fd627e','#ffedbf','#502845']},
    {id:'phantom',name:'Void Phantom',icon:'🌙',desc:'Silent, sleek, and difficult to forget.',cost:850,color:['#a99ffd','#4a5fa2','#eff6ff','#152040']},
    {id:'verdant',name:'Ion Grove',icon:'🍃',desc:'A luminous green ion trail.',cost:1100,color:['#80e3a1','#2d9e98','#c7f9b9','#113c4b']}
  ];
  const buildingDefs=[
    {id:'bloom',name:'Bloom Gardens',icon:'🌸',tag:'NATURE',cost:260,bonus:15,desc:'Bring the first living gardens to Nova Haven.',x:22,y:58},
    {id:'array',name:'Solar Array',icon:'☀️',tag:'ENERGY',cost:650,bonus:20,desc:'Catch the light of distant suns.',x:43,y:35},
    {id:'observatory',name:'Star Observatory',icon:'🔭',tag:'DISCOVERY',cost:1350,bonus:30,desc:'Map mysterious worlds beyond the horizon.',x:65,y:51},
    {id:'port',name:'Sky Harbor',icon:'🛸',tag:'EXPLORATION',cost:2600,bonus:50,desc:'Build a home for every daring pilot.',x:79,y:31}
  ];
  const atlasSets=[
    {id:'skyward',name:'Skyward Wonders',subtitle:'Lost treasures carried through the bright nebulae.',reward:350,monument:'🌠',relics:[
      {id:'bloom',name:'Prism Bloom',rarity:'COMMON',weight:26},
      {id:'pearl',name:'Comet Pearl',rarity:'UNCOMMON',weight:20},
      {id:'kite',name:'Nimbus Kite',rarity:'RARE',weight:14}
    ]},
    {id:'deep',name:'Deep Signal',subtitle:'Objects recovered from the rim of the unknown.',reward:600,monument:'🌀',relics:[
      {id:'lantern',name:'Pulse Lantern',rarity:'COMMON',weight:20},
      {id:'key',name:'Orbit Key',rarity:'UNCOMMON',weight:13},
      {id:'crown',name:'Void Crown',rarity:'RARE',weight:7}
    ]}
  ];
  const allRelics=atlasSets.flatMap(s=>s.relics);
  function renderAtlasOdds(){
    const grid=$('atlas-odds-grid');if(!grid)return;
    const missing=allRelics.filter(relic=>!state.atlas.discovered.includes(relic.id));
    const protectedDraw=state.atlas.duplicateStreak>=6&&missing.length>0;
    const pool=protectedDraw?missing:allRelics;
    const total=pool.reduce((sum,relic)=>sum+relic.weight,0);
    grid.replaceChildren();
    for(const relic of allRelics){
      const item=document.createElement('div');item.className='atlas-odds-row';
      const label=document.createElement('span');label.textContent=relic.name;
      const percent=document.createElement('strong');
      const weight=protectedDraw&&state.atlas.discovered.includes(relic.id)?0:relic.weight;
      percent.textContent=`${(weight/total*100).toFixed(1).replace(/\.0$/,'')}%`;
      item.append(label,percent);grid.append(item);
    }
    grid.setAttribute('aria-label',protectedDraw?'Next draw odds: duplicate protection active':'Next draw odds: standard weighted draw');
  }
  const atlasComplete=set=>set.relics.every(r=>state.atlas.discovered.includes(r.id));
  const atlasArt=id=>`assets/relic-${id}.svg`;
  function revealRelic(){
    const totalWeight=allRelics.reduce((a,r)=>a+r.weight,0);
    const missing=allRelics.filter(r=>!state.atlas.discovered.includes(r.id));
    const protectedDraw=state.atlas.duplicateStreak>=6&&missing.length>0;
    const pool=protectedDraw?missing:allRelics;
    const poolWeight=protectedDraw?missing.reduce((sum,r)=>sum+r.weight,0):totalWeight;
    let roll=random()*poolWeight;
    const relic=pool.find(r=>(roll-=r.weight)<0)||pool[pool.length-1];
    const repeated=state.atlas.discovered.includes(relic.id);
    const set=atlasSets.find(s=>s.relics.some(r=>r.id===relic.id));
    let bonus=0;
    if(repeated){state.atlas.repeats++;state.atlas.duplicateStreak=Math.min(6,state.atlas.duplicateStreak+1);bonus=45;}
    else{
      state.atlas.duplicateStreak=0;
      state.atlas.discovered.push(relic.id);
      if(atlasComplete(set)&&!state.atlas.claimed.includes(set.id)){
        state.atlas.claimed.push(set.id);bonus=set.reward;
      }
    }
    track('relic-discovery',{relic:relic.id,repeated,set:set.id,bonus,protectedDraw});
    return {id:relic.id,name:relic.name,rarity:relic.rarity,repeated,bonus,setName:set.name,completed:!repeated&&atlasComplete(set),protectedDraw};
  }
  const colonyBonus=()=>buildingDefs.reduce((sum,b)=>sum+(state.buildings.includes(b.id)?b.bonus:0),0);
  const missionDefs=[{id:'launches',icon:'🚀',name:'First contact',desc:'Launch 2 expeditions today.',goal:2,reward:110},
  {id:'jumps',icon:'🌌',name:'Starlane explorer',desc:'Complete 6 crossings today.',goal:6,reward:160},
  {id:'banked',icon:'💎',name:'Safe delivery',desc:'Bank 250 shards today.',goal:250,reward:200}];
  const milestones=[{id:'total1',icon:'🌠',name:'Cosmic collector',desc:'Collect 1,000 lifetime shards.',stat:'total',goal:1000,reward:250},
  {id:'runs1',icon:'🛸',name:'Seasoned pilot',desc:'Launch 10 expeditions.',stat:'runs',goal:10,reward:300},
  {id:'jumps1',icon:'🪐',name:'Drift veteran',desc:'Complete 50 crossings.',stat:'totalJumps',goal:50,reward:500},
  {id:'total2',icon:'✨',name:'Master salvager',desc:'Collect 5,000 lifetime shards.',stat:'total',goal:5000,reward:900}];
  // Validate untrusted local save data before it can affect the virtual economy.
  const safeObject=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const safeCount=(value,max=1000000000)=>typeof value==='number'&&Number.isFinite(value)?clamp(Math.floor(value),0,max):0;
  const safeDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&dateKey(toLocalDay(value))===value?value:'';
  function normalizeState(raw){
    const data=safeObject(raw),s=structuredClone(baseState);
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return s;
    for(const k of ['credits','xp','runs','wins','best','total','totalJumps','damageTaken'])s[k]=safeCount(data[k]);
    s.energy=typeof data.energy==='number'&&Number.isFinite(data.energy)?clamp(Math.floor(data.energy),0,5):5;
    const now=Date.now();
    s.energyAt=typeof data.energyAt==='number'&&Number.isFinite(data.energyAt)?clamp(data.energyAt,now-86400000,now):now;
    const upgrades=safeObject(data.upgrades);
    for(const def of [{id:'scanner',max:3},{id:'magnet',max:3},{id:'shield',max:2}])s.upgrades[def.id]=safeCount(upgrades[def.id],def.max);
    const progress=safeObject(data.dailyProgress);
    s.dailyProgress.key=safeDate(progress.key);
    for(const k of ['launches','jumps','banked'])s.dailyProgress[k]=safeCount(progress[k]);
    const missionIds=['launches','jumps','banked'];
    s.dailyProgress.claimed=Array.isArray(progress.claimed)?[...new Set(progress.claimed.filter(id=>missionIds.includes(id)))]:[];
    s.milestones=Array.isArray(data.milestones)?[...new Set(data.milestones.filter(id=>typeof id==='string'&&id.length<=64))].slice(0,30):[];
    s.buildings=Array.isArray(data.buildings)?[...new Set(data.buildings.filter(id=>['bloom','array','observatory','port'].includes(id)))]:[];
    const atlas=safeObject(data.atlas);
    s.atlas.discovered=Array.isArray(atlas.discovered)?[...new Set(atlas.discovered.filter(id=>['bloom','pearl','kite','lantern','key','crown'].includes(id)))]:[];
    s.atlas.claimed=Array.isArray(atlas.claimed)?[...new Set(atlas.claimed.filter(id=>['skyward','deep'].includes(id)))]:[];
    s.atlas.repeats=safeCount(atlas.repeats);
    s.atlas.duplicateStreak=s.atlas.discovered.length===6?0:safeCount(atlas.duplicateStreak,6);
    s.skins=Array.isArray(data.skins)?[...new Set(['aurora',...data.skins.filter(id=>['aurora','ember','phantom','verdant'].includes(id))])]:['aurora'];
    s.skin=s.skins.includes(data.skin)?data.skin:'aurora';
    s.dailyClaim=safeDate(data.dailyClaim);
    s.dailyStreak=safeCount(data.dailyStreak,7);
    s.sound=data.sound===true;
    s.saveRevision=safeCount(data.saveRevision);
    return s;
  }
  // Preserve the last readable save before replacing the primary copy.
  // A damaged or interrupted write can be recovered without silently wiping progress.
  const BACKUP_STORAGE=STORAGE+'_backup';
  const PENDING_STORAGE=STORAGE+'_pending';
  let pendingStorageWarning='';
  let recoveryBlocked=false; // Preserve damaged raw snapshots until the player explicitly starts fresh.
  // Detect torn or modified modern checkpoints while retaining legacy save support.
  // This is an integrity checksum, not a security signature.
  function checkpointHash(data){
    const payload={...data};delete payload.checkpointHash;
    const json=JSON.stringify(payload);
    let hash=2166136261;
    for(let i=0;i<json.length;i++){hash=Math.imul(hash^json.charCodeAt(i),16777619)>>>0;}
    return hash.toString(16).padStart(8,'0');
  }
  function parseSaved(raw){
    if(!raw)return null;
    const data=JSON.parse(raw);
    if(!data||typeof data!=='object'||Array.isArray(data)||typeof data.credits!=='number'||!Number.isFinite(data.credits))return null;
    if(Object.hasOwn(data,'checkpointHash')&&(typeof data.checkpointHash!=='string'||data.checkpointHash!==checkpointHash(data)))return null;
    return normalizeState(data);
  }
  function readState(){
    try{
      const primary=localStorage.getItem(STORAGE);
      let committed=null,pending=null,backup=null;
      try{committed=parseSaved(primary);}catch{/* Corrupt primary. */}
      try{pending=parseSaved(localStorage.getItem(PENDING_STORAGE));}catch{/* Corrupt journal. */}
      try{backup=parseSaved(localStorage.getItem(BACKUP_STORAGE));}catch{/* Corrupt backup. */}
      // Only verified checkpoints compete. On equal revisions, a committed
      // primary wins over an uncommitted journal, then the recovery backup.
      const candidates=[{state:pending,source:'pending'},{state:committed,source:'primary'},{state:backup,source:'backup'}];
      const winner=candidates.filter(item=>item.state).sort((a,b)=>b.state.saveRevision-a.state.saveRevision)[0];
      if(!winner){
        if([primary,localStorage.getItem(PENDING_STORAGE),localStorage.getItem(BACKUP_STORAGE)].some(v=>v!==null)){
          recoveryBlocked=true;
          pendingStorageWarning='Saved progress could not be verified. Existing data is preserved until you choose to start fresh.';
        }
        return structuredClone(baseState);
      }
      recoveryBlocked=false; // A newly verified checkpoint permits normal saving again.
      if(winner.source!=='primary'){
        try{
          const snapshot=JSON.stringify(winner.state);
          localStorage.setItem(STORAGE,snapshot);
          if(localStorage.getItem(STORAGE)!==snapshot)throw Error('Recovery verification failed');
        }catch{pendingStorageWarning=winner.source==='pending'?'Recovered a pending reward, but storage may still be unavailable.':'Recovered your previous checkpoint, but storage is unavailable. Progress may not persist.';}
      }
      // Never clear a newer journal unless its snapshot has been committed.
      if(pending&&winner.source!=='pending'){
        try{localStorage.removeItem(PENDING_STORAGE);}catch{/* Retry cleanup later. */}
      }else if(pending&&winner.source==='pending'){
        try{
          if(localStorage.getItem(STORAGE)===JSON.stringify(winner.state))localStorage.removeItem(PENDING_STORAGE);
        }catch{/* Retry cleanup later. */}
      }
      return winner.state;
    }catch{/* Private browsing or storage restrictions. */}
    return structuredClone(baseState);
  }
  function save(){
    if(recoveryBlocked)return;
    try{
      const prior=localStorage.getItem(STORAGE);
      let backupFailed=false;
      if(prior){
        try{
          if(parseSaved(prior)){
            localStorage.setItem(BACKUP_STORAGE,prior);
            if(localStorage.getItem(BACKUP_STORAGE)!==prior)backupFailed=true;
          }
        }catch{backupFailed=true;/* A valid previous checkpoint could not be backed up. */}
      }
      // Advance only on a successfully verified pending write. Older journals
      // cannot supersede a later committed checkpoint after a failed overwrite.
      const previousRevision=(()=>{try{return parseSaved(prior)?.saveRevision||0;}catch{return 0;}})();
      state.saveRevision=Math.max(safeCount(state.saveRevision),previousRevision)+1;
      const snapshot=JSON.stringify({...state,checkpointHash:checkpointHash(state)});
      // Write-ahead checkpoint: if a primary write tears, the already-computed
      // reward and its claimed flag are restored together, exactly once.
      localStorage.setItem(PENDING_STORAGE,snapshot);
      if(localStorage.getItem(PENDING_STORAGE)!==snapshot)throw Error('Pending transaction verification failed');
      localStorage.setItem(STORAGE,snapshot);
      // Some embedded browsers silently reject writes; verify the checkpoint.
      if(localStorage.getItem(STORAGE)!==snapshot)throw new Error('Save verification failed');
      localStorage.removeItem(PENDING_STORAGE);
      if(backupFailed)notify('Progress saved, but the recovery backup could not be updated.');
    }catch{notify('Local storage is unavailable. Progress may not persist.');}
  }
  // Player-controlled, portable backups. Checksum detects accidental damage, not cheating.
  function encodeBackup(snapshot){
    const payload=normalizeState(snapshot);
    return {format:'luma-drift-save',version:1,createdAt:new Date().toISOString(),
      payload,checksum:checkpointHash(payload)};
  }
  function decodeBackup(backup){
    if(!backup||backup.format!=='luma-drift-save'||backup.version!==1||
       !backup.payload||typeof backup.payload!=='object'||Array.isArray(backup.payload)||
       typeof backup.checksum!=='string'||checkpointHash(backup.payload)!==backup.checksum){
      throw Error('Unrecognized or damaged Luma Drift backup');
    }
    const restored=parseSaved(JSON.stringify({...backup.payload,checkpointHash:backup.checksum}));
    if(!restored)throw Error('Invalid saved progress');
    return restored;
  }
  function exportBackup(){
    if(run){notify('Bank or finish your current flight before exporting progress.');return;}
    if(recoveryBlocked){notify('Saved data is damaged. Preserve the original data before attempting recovery.');return;}
    try{
      save();
      const verified=parseSaved(localStorage.getItem(STORAGE));
      if(!verified||verified.saveRevision!==state.saveRevision)throw Error('Current progress is not saved');
      const body=JSON.stringify(encodeBackup(verified),null,2)+'\n';
      const blob=new Blob([body],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');
      link.href=url;link.download=`luma-drift-save-${dateKey()}.json`;
      document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      notify('Progress backup downloaded. Store it somewhere safe.');
    }catch{notify('Could not verify a saved checkpoint. No backup was exported.');}
  }
  async function importBackup(file){
    if(!file)return;
    if(run){notify('Bank or finish your current flight before importing.');return;}
    if(recoveryBlocked){notify('First resolve the damaged-save warning before importing a backup.');return;}
    try{
      if(file.size>200000)throw Error('Backup file exceeds size limit');
      const replacement=decodeBackup(JSON.parse(await file.text()));
      if(!window.confirm('Replace this device’s Luma Drift progress with your backup? Your previous checkpoint is kept as a recovery copy.'))return;
      const previous=state;
      const latestRevision=[STORAGE,BACKUP_STORAGE,PENDING_STORAGE].reduce((max,key)=>{
        try{return Math.max(max,parseSaved(localStorage.getItem(key))?.saveRevision||0);}catch{return max;}
      },0);
      replacement.saveRevision=Math.max(latestRevision,replacement.saveRevision);
      state=replacement;state.end=null;
      save();
      const committed=parseSaved(localStorage.getItem(STORAGE));
      if(!committed||committed.saveRevision!==state.saveRevision||checkpointHash(committed)!==checkpointHash(state)){
        state=previous;
        throw Error('Imported checkpoint could not be verified');
      }
      renderHeader();renderShop();renderColony();renderAtlas();renderMissions();renderRewards();updateScene();
      notify('Backup imported. Your pilot progress is restored.');
    }catch{notify('Backup rejected or storage could not verify the import. Existing recovery data was kept.');}
  }
  function regen(){let now=Date.now();if(now<state.energyAt){state.energyAt=now;return;}const elapsed=now-state.energyAt;const gain=Math.floor(elapsed/1200000);if(gain>0){state.energy=clamp(state.energy+gain,0,5);state.energyAt=now-(elapsed%1200000);if(state.energy===5)state.energyAt=now;save();}}
  function ensureDay(){const today=dateKey();if(state.dailyProgress.key!==today){state.dailyProgress={key:today,launches:0,jumps:0,banked:0,claimed:[]};save();}}
  function level(){return 1+Math.floor(Math.sqrt(state.xp/125));}
  function notify(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>t.classList.remove('show'),3300);}
  let audio;
  function beep(freq=520,duration=.12,type='sine'){if(!state.sound)return;try{audio=audio||new (globalThis.AudioContext||globalThis.webkitAudioContext)();const osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,audio.currentTime);gain.gain.setValueAtTime(.09,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration+.01);}catch{}}
  function renderHeader(){regen();ensureDay();$('credits').textContent=nf.format(state.credits);if(document.getElementById('colony-next-milestone'))renderColonyFunding();$('energy').textContent=`${state.energy}/5`;$('level').textContent=level();$('runs').textContent=nf.format(state.runs);$('best-haul').textContent=`${nf.format(state.best)} ✦`;$('total-salvage').textContent=nf.format(state.total);$('streak').textContent=nf.format(state.wins);$('upgrades').textContent=Object.values(state.upgrades).reduce((a,b)=>a+b,0);$('sound-btn').setAttribute('aria-pressed',String(state.sound));$('sound-btn').title=state.sound?'Mute':'Enable sound';}
  function activateTab(name){track('tab',{name});for(const button of document.querySelectorAll('.nav-item')){button.classList.toggle('active',button.dataset.tab===name);button.setAttribute('aria-current',button.dataset.tab===name?'page':'false');}for(const view of document.querySelectorAll('.view'))view.classList.toggle('active',view.id===name);if(name==='colony'){renderColony();renderAtlas();}if(name==='missions')renderMissions();if(name==='hangar')renderShop();if(name==='earn')renderRewards();window.scrollTo({top:0,behavior:'smooth'});}
  function burst(emoji='✦'){
    const target=$('scene');
    if(!target||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    for(let i=0;i<16;i++){
      const el=document.createElement('span');el.className='reward-spark';el.textContent=i%3===0?'✧':emoji;
      el.style.setProperty('--sx',`${Math.round((random()-.5)*300)}px`);
      el.style.setProperty('--sy',`${Math.round((random()-.5)*240)}px`);
      el.style.animationDelay=`${i*24}ms`;
      target.append(el);setTimeout(()=>el.remove(),1500);
    }
  }
  function sceneMessage(msg,impact=false){$('scene-message').textContent=msg;$('scene-message').classList.toggle('impact',impact);}
  function maxHull(){return 3+state.upgrades.shield;}
  function updateScene(){renderMissionBadge();const isActive=Boolean(run);$('scene-label').textContent=isActive?'DRIFT EXPEDITION / ACTIVE':'DOCKED • ORBITAL STATION';$('run-counter').textContent=`RUN ${String(state.runs+(!run?1:0)).padStart(3,'0')}`;$('hull-text').textContent=`${Math.round((isActive?run.hull/maxHull():1)*100)}%`;$('hull-bar').style.width=`${(isActive?run.hull/maxHull():1)*100}%`;$('hull-bar').style.background=isActive&&run.hull<=1?'linear-gradient(90deg,#ff7b82,#f6c57f)':'linear-gradient(90deg,#4de9d4,#91f5c4)';$('depth-indicator').textContent=`${run?run.depth:0} / 5 JUMPS`;$('stardust').textContent=run?`${run.hull} HULL / ${nf.format(run.cargo)} ✦`:'FLUCTUATING';$('ready-controls').hidden=isActive||state.end!=null;$('run-controls').hidden=!isActive;$('end-controls').hidden=state.end==null;
   if(isActive){renderFlightForecast();$('cargo').textContent=nf.format(run.cargo);$('jump').textContent=`${Math.min(5,run.depth+1)} / 5`;$('bank-btn').disabled=run.cargo===0;renderRoutes();}
   if(state.end){$('again-btn').textContent=state.energy>0?'FLY AGAIN ➜':'PRACTICE FREE • NO REWARDS ➜';renderRelicReveal(state.end.relic);$('end-title').textContent=state.end.title;$('end-desc').textContent=state.end.description;$('end-earned').textContent=nf.format(state.end.earned);$('end-icon').textContent=state.end.icon;}
  }
  function renderFlightForecast(){
    const afterHit = run.hull === 1 ? 0 : Math.floor(run.cargo * .75);
    const storm = run.hull === 1
      ? 'Last hull point. A storm ends this flight.'
      : 'A storm costs 1 hull point.';
    const cargo = run.cargo ? (run.practice ? ` Simulated cargo after a hit: ${nf.format(afterHit)} ✦. Practice awards no shards.` : ` Cargo after a hit: ${nf.format(afterHit)} ✦.`) : '';
    const beacon = run.depth === 4 && !run.practice ? ' Survive this jump for the 120-shard beacon bonus.' : '';
    const relic = run.practice ? '' : run.depth >= 2 ? ' Bank now to secure one free Star Atlas relic draw. Pushing deeper risks losing the draw if the hull breaks.' : ` ${2-run.depth} more safe or storm-survived jump${2-run.depth===1?'':'s'} before banking qualifies for a Star Atlas relic draw.`;
    $('flight-forecast').textContent = storm + cargo + beacon + relic;
  }
  const lanes=[{id:'calm',name:'Comet Trail',icon:'☄️',base:11,range:[32,58],theme:'LOW RISK'},
    {id:'surge',name:'Ion Rapids',icon:'⚡',base:25,range:[70,106],theme:'BALANCED'},
    {id:'rift',name:'Blackstar Rift',icon:'🌑',base:41,range:[128,186],theme:'HIGH RISK'}];
  const riskFor=(lane,depth)=>clamp(lane.base+depth*3-state.upgrades.scanner*3,3,75);
  function renderRoutes(){if(!run)return;const el=$('routes');el.replaceChildren();for(const lane of lanes){const risk=riskFor(lane,run.depth),mult=1+run.depth*.18+state.upgrades.magnet*.1;const min=Math.round(lane.range[0]*mult),max=Math.round(lane.range[1]*mult);const b=document.createElement('button');b.className='route';b.type='button';b.setAttribute('aria-label',run.practice?`${lane.name}; ${risk} percent hazard risk; simulated ${min} to ${max} shards, no rewards awarded`:`${lane.name}; ${risk} percent hazard risk; earn ${min} to ${max} shards on a safe crossing`);const left=document.createElement('div'),right=document.createElement('div');left.innerHTML=`<b>${lane.icon} ${lane.name}</b><small>${lane.theme} • ${risk}% hazard</small>`;right.className='route-side';right.innerHTML=run.practice?`<strong>${min}–${max} ✦</strong><small>simulation only · no rewards</small>`:`<strong>+${min}–${max} ✦</strong><small>if you pass</small>`;b.append(left,right);b.addEventListener('click',()=>fly(lane));el.append(b);}}
  function addMissionStat(key,count){state.dailyProgress[key]=validNum(state.dailyProgress[key])+count;}
  function launch(practice=false){if(run)return;regen();ensureDay();if(!practice){if(state.energy<=0){notify('Fuel is empty. Practice for free or return after fuel recharges.');return;}state.energy--;if(state.energy===4)state.energyAt=Date.now();state.runs++;state.xp+=15;addMissionStat('launches',1);}else state.runs+=0;state.end=null;run={cargo:0,depth:0,hull:maxHull(),practice};track('launch',{practice});sceneMessage(practice?'PRACTICE FLIGHT / NO REWARDS':'SELECT A STARMAP ROUTE');$('route-prompt').textContent=practice?'Practice mode uses the same flight rules, but earns no shards or mission progress.':'Choose a lane. More risk can mean more shards.';updateScene();renderHeader();save();markFlight(run);beep(480,.12);}
  function fly(lane){if(!run||run.depth>=5)return;const risk=riskFor(lane,run.depth);const damaged=random()*100<risk;track('route',{lane:lane.id,risk,damaged,practice:run.practice});let msg;if(damaged){run.hull--;if(!run.practice)state.damageTaken++;run.cargo=Math.floor(run.cargo*.75);msg=run.practice?'STORM HIT! −1 HULL / SIMULATED CARGO DAMAGED • NO REWARDS':'STORM HIT! −1 HULL / CARGO DAMAGED';beep(180,.28,'sawtooth');}else{const mult=1+run.depth*.18+state.upgrades.magnet*.1;const prize=Math.round(int(lane.range[0],lane.range[1])*mult);run.cargo+=prize;msg=run.practice?`CLEAR PASSAGE! ${nf.format(prize)} SIMULATED SHARDS / NO REWARDS`:`CLEAR PASSAGE! +${nf.format(prize)} SHARDS`;beep(700,.13,'triangle');burst('✦');}run.depth++;if(!run.practice){state.totalJumps++;addMissionStat('jumps',1);}sceneMessage(msg,damaged);if(run.hull<=0){finish(false,true);return;}if(run.depth>=5){finish(true,false);return;}updateScene();save();markFlight(run);}
  function renderRelicReveal(relic){
    const el=$('relic-reveal');
    if(!relic){el.hidden=true;return;}
    el.hidden=false;
    const art=$('relic-reveal-art');art.src=atlasArt(relic.id);art.alt='Illustration of '+relic.name;
    $('relic-reveal-name').textContent=relic.name;
    $('relic-reveal-rarity').textContent=relic.rarity+' • '+relic.setName+(relic.protectedDraw?' • GUARANTEED NEW':'');
    $('relic-reveal-message').textContent=relic.completed
      ?`Collection complete! +${nf.format(relic.bonus)} bonus shards and a new colony monument.`
      :relic.repeated?`Duplicate converted into +${nf.format(relic.bonus)} virtual shards.`
      :relic.protectedDraw?'Duplicate protection delivered a guaranteed new relic.':'A new relic has joined your Star Atlas.';
    el.classList.toggle('is-duplicate',relic.repeated);
    el.classList.toggle('is-new',!relic.repeated);
    el.classList.toggle('rarity-rare',relic.rarity==='RARE');
    el.classList.toggle('rarity-uncommon',relic.rarity==='UNCOMMON');
  }
  function validMonumentClaims(){
    const claims=state.atlas?.claimed;
    return Array.isArray(claims)?atlasSets.filter(set=>claims.includes(set.id)).map(set=>set.id):[];
  }
  function renderAtlas(){
    renderAtlasOdds();
    const owned=state.atlas.discovered.length;
    $('atlas-total').textContent=`${owned} / ${allRelics.length} DISCOVERED`;
    const totalWeight=allRelics.reduce((sum,relic)=>sum+relic.weight,0);
    const missingWeight=allRelics.reduce((sum,relic)=>sum+(state.atlas.discovered.includes(relic.id)?0:relic.weight),0);
    const protectedDraw=state.atlas.duplicateStreak>=6&&owned<allRelics.length;
    const newChance=(protectedDraw?100:missingWeight/totalWeight*100).toFixed(1).replace(/\.0$/,'');
    $('atlas-subtitle').textContent=`Recover a relic when you safely bank after at least two jumps. ${owned} unique relic${owned===1?'':'s'} collected. Next draw: ${newChance}% chance of a new relic. ${protectedDraw?'Duplicate protection active: your next draw is guaranteed new.':`Duplicate streak ${state.atlas.duplicateStreak}/6; after six consecutive duplicates, the next draw is guaranteed new.`} Normal draws use independent weighted odds.`;
    const gallery=$('atlas-gallery');gallery.replaceChildren();
    for(const set of atlasSets){
      const collected=set.relics.filter(r=>state.atlas.discovered.includes(r.id)).length;
      const complete=atlasComplete(set);
      const card=document.createElement('article');card.className=`atlas-set ${complete?'complete':''}`;
      const head=document.createElement('div');head.className='atlas-set-head';
      head.innerHTML=`<div><small>★ COLLECTION ${set.id==='skyward'?'01':'02'}</small><h3>${set.name}</h3><p>${set.subtitle}</p></div><span class="atlas-count">${collected}/3</span>`;
      card.append(head);
      const slots=document.createElement('div');slots.className='atlas-slots';
      for(const relic of set.relics){
        const found=state.atlas.discovered.includes(relic.id);
        const tile=document.createElement('div');tile.className=`atlas-tile ${found?'found':'missing'}`;
        tile.innerHTML=`<div class="atlas-image"><img src="${atlasArt(relic.id)}" alt="" loading="lazy" /></div><strong>${found?relic.name:'Unknown relic'}</strong><small>${found?relic.rarity:'UNDISCOVERED'}</small>`;
        tile.setAttribute('aria-label',`${relic.name}: ${found?'discovered':'not yet discovered'}`);
        slots.append(tile);
      }
      card.append(slots);
      const footer=document.createElement('div');footer.className='atlas-set-footer';
      footer.innerHTML=`<span>${complete?'✓ COLLECTION COMPLETE':`COMPLETE FOR +${nf.format(set.reward)} ✦`}</span><span>${complete?'MONUMENT UNLOCKED':'FREE TO DISCOVER'}</span>`;
      card.append(footer);gallery.append(card);
    }
    const monuments=$('atlas-monuments');monuments.replaceChildren();
    for(const set of atlasSets){if(!validMonumentClaims().includes(set.id))continue;
      const m=document.createElement('span');m.className='atlas-monument';m.textContent=`${set.monument} ${set.name} Monument`;
      monuments.append(m);
    }
    monuments.hidden=validMonumentClaims().length===0;
  }
  function finish(success,crashed){if(!run)return;const cargo=run.cargo,practice=run.practice;let earned=!crashed&&!practice?cargo:0;if(success&&!crashed&&!practice)earned+=120;let title,description,icon;if(crashed){title='Signal lost';description=practice?'Practice ship lost. You can try again.':'Your hull broke apart. Unbanked virtual cargo was lost; you still earned pilot XP.';icon='🛸';}else if(success){title='You made it home!';description=practice?'Practice complete. No shards awarded.':`Full expedition complete. ${nf.format(120)} bonus shards for reaching the final beacon.`;icon='🌟';}else{title='Cargo secured!';description=practice?'Practice complete. No shards awarded.':'You chose a smart exit. Salvage delivered safely to the station.';icon='💎';}
   let relic=null;if(!practice&&!crashed&&run.depth>=2){relic=revealRelic();earned+=relic.bonus;}
   if(relic&&!relic.repeated){beep(relic.rarity==='RARE'?880:relic.rarity==='UNCOMMON'?760:640,.20,'triangle');}
   if(!practice){state.credits+=earned;state.total+=earned;state.best=Math.max(state.best,earned);state.xp+=Math.max(10,run.depth*15);if(!crashed){state.wins++;addMissionStat('banked',earned);}}track('finish',{crashed,success,earned,practice,depth:run.depth,relic:relic?.id});state.end={title,description,icon,earned,relic};run=null;sceneMessage(crashed?'HULL LOST / RETURN TO BASE':'HOMEBOUND / CARGO SECURED',crashed);updateScene();renderHeader();save();markFlight(null);}
  function claimDaily(){ensureDay();const today=dateKey();if(state.dailyClaim===today){notify('You already collected today’s free supply. Come back tomorrow.');return;}const dist=state.dailyClaim?dayDistance(state.dailyClaim,today):999;state.dailyStreak=dist===1?(state.dailyStreak%7)+1:1;const gift=100+(state.dailyStreak-1)*20+(state.dailyStreak===7?180:0)+colonyBonus();state.dailyClaim=today;track('daily',{streak:state.dailyStreak,gift});state.credits+=gift;state.xp+=25;save();renderHeader();renderRewards();showDailyClaimReveal(gift);notify(`+${nf.format(gift)} shards! Daily login streak: ${state.dailyStreak}/7`);burst('✦');beep(750,.22,'triangle');}
  function showDailyClaimReveal(gift){
    const panel=$('daily-claim-reveal');
    $('daily-claim-amount').textContent=`+${nf.format(gift)} virtual shards collected`;
    $('daily-claim-total').textContent=`New balance: ${nf.format(state.credits)} virtual shards · Day ${state.dailyStreak} of 7`;
    panel.hidden=false;
    panel.classList.remove('claim-reveal-enter');
    // Reflow restarts the one-shot reveal for a new claim, without a timer or blocking overlay.
    void panel.offsetWidth;
    panel.classList.add('claim-reveal-enter');
  }
  function renderRewards(){
    const today=dateKey(),already=state.dailyClaim===today,dist=state.dailyClaim?dayDistance(state.dailyClaim,today):999;
    const next=(already||dist===1)?(state.dailyStreak%7)+1:1;
    const gift=100+(next-1)*20+(next===7?180:0)+colonyBonus();
    $('daily-status').textContent=`${nf.format(gift)} virtual shards per next claim · colony bonus +${colonyBonus()}.`;
    $('daily-btn').disabled=already;
    $('daily-btn').textContent=already?'TODAY’S SUPPLY CLAIMED':`CLAIM +${nf.format(gift)} SHARDS`;
    $('daily-reward-description').textContent=`Claim ${nf.format(gift)} free virtual shards ${already?'tomorrow':'today'}. Claims reset at local midnight. Consecutive days increase rewards; missing a day restarts at Day 1. The 7-day cycle repeats. Colony buildings add a permanent bonus.`;
    $('checkin-btn').disabled=already;
    $('checkin-btn').textContent=already?'CLAIMED ✓':`CLAIM +${nf.format(gift)} ✦`;
    $('checkin-head').textContent=already?'Your daily delivery is complete':'Your daily supply is ready!';
    $('checkin-sub').textContent=already?'New cargo arrives tomorrow. Keep exploring!':`Day ${next} of 7 · ${nf.format(gift)} free shards waiting`;
    $('daily-banner').classList.toggle('collected',already);
    $('streak-count').textContent=`DAY ${state.dailyStreak} / 7`;
    $('streak-title').textContent=already?'A little progress, every day.':'Follow the stars to your next reward';
    const days=$('streak-days');days.replaceChildren();
    for(let i=1;i<=7;i++){
      const box=document.createElement('div');box.className=`streak-day ${i<next?'past':''} ${i===next&&!already?'next':''} ${already&&i===state.dailyStreak?'claimed':''}`;
      const value=100+(i-1)*20+(i===7?180:0)+colonyBonus();
      const icon=document.createElement('span');icon.textContent=i===7?'🎁':i<=state.dailyStreak&&already?'✓':'✦';
      const d=document.createElement('small');d.textContent=`DAY ${i}`;const v=document.createElement('b');v.textContent=nf.format(value);
      box.setAttribute('aria-label',`Day ${i}: ${nf.format(value)} virtual shards${already&&i===state.dailyStreak?', claimed today':!already&&i===next?', available today':''}`);
      if(!already&&i===next)box.setAttribute('aria-current','step');
      box.append(icon,d,v);days.append(box);
    }
  }
  // Pure funding calculation: no shards are reserved or spent by the meter.
  function colonyFunding(credits,cost){
    const available=Number.isFinite(credits)?Math.max(0,credits):0;
    const target=Number.isFinite(cost)&&cost>0?cost:1;
    const saved=Math.min(target,available);
    return {saved,percentage:Math.round(saved/target*100),shortfall:Math.max(0,target-available)};
  }
  function renderColonyFunding(){
    const next=buildingDefs.find(def=>!state.buildings.includes(def.id));
    const milestone=$('colony-next-milestone');
    const funding=$('colony-funding-progress');
    const fundingLabel=$('colony-funding-label');
    if(next){
      const {saved,percentage,shortfall}=colonyFunding(state.credits,next.cost);
      milestone.textContent=`NEXT LANDMARK · ${next.name} · ${nf.format(next.cost)} shards · +${next.bonus} shards per daily supply · ${shortfall===0?'Ready to build':`${nf.format(shortfall)} more shards needed`}`;
      milestone.dataset.ready=String(shortfall===0);
      funding.hidden=false;
      funding.max=next.cost;
      funding.value=saved;
      funding.setAttribute('aria-label',`${next.name}: ${nf.format(saved)} of ${nf.format(next.cost)} shards currently available (${percentage}% of construction cost); shards are not reserved`);
      fundingLabel.textContent=`${nf.format(saved)} / ${nf.format(next.cost)} shards available · ${percentage}% of cost available`;
    }else{
      milestone.textContent=`COLONY COMPLETE · All ${buildingDefs.length} landmarks constructed · +${colonyBonus()} shards per daily supply`;
      milestone.dataset.ready='complete';
      funding.hidden=true;
      funding.removeAttribute('aria-label');
      funding.value=0;
      fundingLabel.textContent='All colony landmarks constructed';
    }

  }
  function renderColony(){
    $('colony-count').textContent=`${state.buildings.length} / ${buildingDefs.length} BUILT`;
    $('colony-daily-bonus').textContent=`+${colonyBonus()} ✦`;
    renderColonyFunding();

    $('colony-scene-label').textContent=state.buildings.length===0?'A NEW WORLD IS TAKING SHAPE':`${state.buildings.length} LANDMARK${state.buildings.length===1?'':'S'} LIGHT THE SKY`;
    // Decorative world growth is derived from saved buildings; never stored separately.
    const world=$('colony-world');
    world.dataset.growth=String(state.buildings.length);
    let ambience=$('colony-ambience');
    if(!ambience){ambience=document.createElement('div');ambience.id='colony-ambience';ambience.className='colony-ambience';ambience.setAttribute('aria-hidden','true');world.prepend(ambience);}
    ambience.replaceChildren();
    // Position scenery by landmark identity, not build order, so restored saves stay visually consistent.
    const scenes={bloom:['✿',24,66],array:['✦',78,39],observatory:['🌿',61,78],port:['✧',41,32]};
    for(const buildingId of state.buildings){
      const scene=scenes[buildingId];
      if(!scene)continue;
      const [symbol,x,y]=scene;
      const accent=document.createElement('span');accent.className='colony-ambient-accent';accent.textContent=symbol;
      accent.style.left=`${x}%`;accent.style.top=`${y}%`;ambience.append(accent);
    }
    const markers=$('colony-markers'),list=$('colony-build-list');markers.replaceChildren();list.replaceChildren();
    const relicMonuments=$('colony-map-monuments');relicMonuments.replaceChildren();
    for(const [i,set] of atlasSets.entries()){
      if(!validMonumentClaims().includes(set.id))continue;
      const statue=document.createElement('div');statue.className='colony-map-monument';
      statue.style.left=`${i===0?31:70}%`;statue.style.top=`${i===0?78:74}%`;
      statue.innerHTML=`<span>${set.monument}</span><small>${set.name}</small>`;
      relicMonuments.append(statue);
    }

    for(const def of buildingDefs){
      const built=state.buildings.includes(def.id);
      const marker=document.createElement('button');marker.type='button';marker.className=`colony-marker landmark-${def.id} ${built?'built':'locked'} ${mostRecentLandmark===def.id?'just-built':''}`;
      marker.style.left=`${def.x}%`;marker.style.top=`${def.y}%`;
      marker.innerHTML=`<span class="marker-icon">${built?def.icon:'+'}</span><small>${def.name}</small>`;
      marker.setAttribute('aria-label',`${def.name}: ${built?'built':`${def.cost} shards to build`}`);
      marker.addEventListener('click',()=>{if(built){notify(`${def.name}: +${def.bonus} shards in each daily supply crate.`);}else{document.getElementById(`build-${def.id}`)?.focus();}});
      markers.append(marker);
      const item=document.createElement('article');item.className=`colony-build-item ${built?'constructed':''}`;
      const copy=document.createElement('div');copy.className='building-copy';copy.innerHTML=`<strong>${def.icon} ${def.name}</strong><small>${def.desc}</small><span>+${def.bonus} ✦ DAILY</span>`;
      const b=document.createElement('button');b.id=`build-${def.id}`;b.textContent=built?'BUILT ✓':`${nf.format(def.cost)} ✦`;
      b.disabled=built;b.addEventListener('click',()=>construct(def));
      item.append(copy,b);list.append(item);
    }
  }
  function showLandmarkReveal(def){
    const panel=$('landmark-reveal');
    $('landmark-reveal-icon').textContent=def.icon;
    $('landmark-reveal-title').textContent=`${def.name} completed!`;
    $('landmark-reveal-detail').textContent=`+${nf.format(def.bonus)} virtual shards in each future daily supply · ${nf.format(state.credits)} shards remaining`;
    panel.hidden=false;
    panel.classList.remove('landmark-reveal-enter');
    void panel.offsetWidth;
    panel.classList.add('landmark-reveal-enter');
  }
  function construct(def){
    if(state.buildings.includes(def.id))return;
    if(state.credits<def.cost){notify(`Earn ${nf.format(def.cost-state.credits)} more shards to build ${def.name}.`);return;}
    state.credits-=def.cost;state.buildings.push(def.id);state.xp+=75;
    track('colony-build',{id:def.id,cost:def.cost});save();renderHeader();mostRecentLandmark=def.id;renderColony();mostRecentLandmark=null;renderRewards();showLandmarkReveal(def);
    notify(`${def.name} completed! Daily supply bonus +${def.bonus} ✦`);beep(940,.18,'triangle');
  }
  function claimMission(id,milestone=false){ensureDay();const def=(milestone?milestones:missionDefs).find(m=>m.id===id);if(!def)return;const claims=milestone?state.milestones:state.dailyProgress.claimed;if(claims.includes(id)){notify('This reward has already been claimed.');return;}const score=milestone?state[def.stat]:state.dailyProgress[id];if(score<def.goal){notify('Keep exploring to finish the mission.');return;}claims.push(id);track('mission',{id,milestone,reward:def.reward});state.credits+=def.reward;state.xp+=40;save();renderHeader();renderMissions();notify(`Mission completed: +${nf.format(def.reward)} shards!`);beep(850,.17);}
  function buildMission(def,milestone){const done=milestone?state.milestones.includes(def.id):state.dailyProgress.claimed.includes(def.id);const progress=clamp(milestone?state[def.stat]:state.dailyProgress[def.id],0,def.goal);const el=document.createElement('article');el.className='mission-card';el.innerHTML=`<div class="mission-top"><span class="mission-icon">${def.icon}</span><strong class="mission-reward">+${nf.format(def.reward)} ✦</strong></div><h3>${def.name}</h3><p>${def.desc}</p><div class="mission-progress"><div style="width:${Math.round(progress/def.goal*100)}%"></div></div><div class="mission-count">${nf.format(progress)} / ${nf.format(def.goal)}</div>`;const b=document.createElement('button');b.textContent=done?'CLAIMED':progress>=def.goal?'CLAIM REWARD':'IN PROGRESS';b.disabled=done||progress<def.goal;b.className=done?'owned':'';b.addEventListener('click',()=>claimMission(def.id,milestone));el.append(b);return el;}
  function renderMissionBadge(){
    const daily = missionDefs.filter(m => !state.dailyProgress.claimed.includes(m.id) && state.dailyProgress[m.id] >= m.goal);
    const career = milestones.filter(m => !state.milestones.includes(m.id) && state[m.stat] >= m.goal);
    const count = daily.length + career.length;
    const badge = $('mission-badge');
    badge.hidden = count === 0;
    badge.textContent = count ? String(count) : '';
    $('missions-nav').setAttribute('aria-label', count ? `Missions, ${count} unclaimed ${count === 1 ? 'reward' : 'rewards'}` : 'Missions');
  }
  function renderMissions(){ensureDay();renderMissionBadge();$('day-label').textContent=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});const d=$('daily-grid');d.replaceChildren(...missionDefs.map(v=>buildMission(v,false)));const m=$('milestone-grid');m.replaceChildren(...milestones.map(v=>buildMission(v,true)));}
  function purchaseUpgrade(def){const rank=state.upgrades[def.id];if(rank>=def.max)return;const cost=def.cost[rank];if(state.credits<cost){notify(`You need ${nf.format(cost-state.credits)} more shards.`);return;}state.credits-=cost;track('upgrade',{id:def.id,rank:rank+1,cost});state.upgrades[def.id]++;save();renderHeader();renderShop();notify(`${def.name} upgraded to rank ${rank+1}!`);beep(830,.19);}
  function makeShopCard(data,type){const el=document.createElement('article');el.className='shop-card';const rank=type==='upgrade'?state.upgrades[data.id]:0,owned=type==='skin'&&state.skins.includes(data.id),active=type==='skin'&&state.skin===data.id;const cost=type==='upgrade'?data.cost[rank]:data.cost;el.innerHTML=`<span class="shop-icon">${data.icon}</span><h3>${data.name}${type==='upgrade'?` • ${rank}/${data.max}`:''}</h3><p>${data.desc}</p>`;const bottom=document.createElement('div');bottom.className='shop-bottom';const b=document.createElement('button');if(type==='upgrade'){b.textContent=rank===data.max?'MAX LEVEL':`UPGRADE · ${nf.format(cost)} ✦`;b.disabled=rank===data.max;b.addEventListener('click',()=>purchaseUpgrade(data));}else{b.textContent=active?'EQUIPPED':owned?'EQUIP':data.cost?`UNLOCK · ${nf.format(cost)} ✦`:'FREE';b.className=active?'owned':'';b.disabled=active;b.addEventListener('click',()=>purchaseSkin(data));}bottom.append(b);el.append(bottom);return el;}
  function purchaseSkin(skin){if(!state.skins.includes(skin.id)){if(state.credits<skin.cost){notify(`You need ${nf.format(skin.cost-state.credits)} more shards.`);return;}state.credits-=skin.cost;track('skin-unlock',{id:skin.id,cost:skin.cost});state.skins.push(skin.id);}state.skin=skin.id;track('skin-equip',{id:skin.id});save();renderHeader();renderShop();notify(`${skin.name} finish equipped.`);beep(550,.2);}
  function renderShop(){$('upgrade-grid').replaceChildren(...upDefs.map(def=>makeShopCard(def,'upgrade')));$('skin-grid').replaceChildren(...skins.map(def=>makeShopCard(def,'skin')));let skin=skins.find(s=>s.id===state.skin)||skins[0];$('active-skin-name').textContent=skin.name.toUpperCase();['wing','core','light','glass'].forEach((part,i)=>document.documentElement.style.setProperty('--ship-'+part,skin.color[i]));}
  function updateDay(){ensureDay();renderMissionBadge();renderHeader();if(state.end&&!run)updateScene();if($('missions').classList.contains('active'))renderMissions();renderRewards();}
  // Restore only after the checkpoint keys and validators are initialized.
  let state=readState();
  for(const btn of document.querySelectorAll('.nav-item'))btn.addEventListener('click',()=>activateTab(btn.dataset.tab));$('launch-btn').addEventListener('click',()=>launch(false));$('practice-btn').addEventListener('click',()=>launch(true));$('bank-btn').addEventListener('click',()=>finish(false,false));$('again-btn').addEventListener('click',()=>{regen();launch(state.energy<=0);});$('end-hangar-btn').addEventListener('click',()=>activateTab('hangar'));$('daily-btn').addEventListener('click',claimDaily);$('checkin-btn').addEventListener('click',claimDaily);$('goto-colony').addEventListener('click',()=>activateTab('colony'));$('reward-colony-btn').addEventListener('click',()=>activateTab('colony'));$('sound-btn').addEventListener('click',()=>{state.sound=!state.sound;save();renderHeader();beep(620,.1);});
  $('export-backup-btn')?.addEventListener('click',exportBackup);
  $('import-backup-btn')?.addEventListener('click',()=>$('import-backup-file')?.click());
  $('import-backup-file')?.addEventListener('change',async event=>{
    const input=event.currentTarget;const file=input.files?.[0];input.value='';
    await importBackup(file);
  });
  const interrupted=interruptedFlight();
  if(interrupted){state.end={title:'Flight interrupted',description:interrupted,icon:'🛟',earned:0,relic:null};}
  track('open');ensureDay();renderHeader();renderShop();renderColony();renderAtlas();renderMissions();renderRewards();updateScene();
  if(recoveryBlocked){
    const banner=document.createElement('section');
    banner.id='save-recovery-alert';banner.setAttribute('role','alert');
    banner.style.cssText='position:fixed;z-index:10000;inset:auto 12px 12px;background:#202342;color:#fff;border:2px solid #ffcf7a;border-radius:14px;padding:18px;max-width:540px;margin:auto;box-shadow:0 8px 35px #0009';
    const heading=document.createElement('strong');heading.textContent='Save recovery needs attention';
    const message=document.createElement('p');message.textContent='All available local checkpoints failed verification. The damaged data has NOT been deleted. You can preserve it for troubleshooting, or explicitly start a new game. New progress will not be saved until you choose.';
    const restart=document.createElement('button');restart.type='button';restart.textContent='Start a new game (replace damaged saves)';
    restart.addEventListener('click',()=>{
      if(!window.confirm('Replace the damaged local save checkpoints with a new game? This cannot be undone.'))return;
      try{
        // Never unblock writes while any damaged checkpoint survives a silent removal failure.
        for(const key of [STORAGE,BACKUP_STORAGE,PENDING_STORAGE]){
          localStorage.removeItem(key);
          if(localStorage.getItem(key)!==null)throw Error('Checkpoint removal verification failed');
        }
        recoveryBlocked=false;
        save();
        // A silent failed save must not dismiss the warning or promise persistence.
        if(!parseSaved(localStorage.getItem(STORAGE)))throw Error('Fresh checkpoint verification failed');
        banner.remove();notify('New game saved.');
      }catch{recoveryBlocked=true;notify('Storage is unavailable; new progress cannot be saved.');}
    });
    banner.append(heading,message,restart);document.body.append(banner);
  }else if(pendingStorageWarning)notify(pendingStorageWarning);
  setInterval(updateDay,60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateDay();});
  if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
