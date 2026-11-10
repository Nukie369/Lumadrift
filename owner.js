(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const MONEY = new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:0});
  const NUM = new Intl.NumberFormat('en-US', {maximumFractionDigits:0});
  const STORE='luma_drift_owner_assumptions_v1';
  const presets={
    lean:{dau:400,sessions:1.3,ads:0.6,ecpm:6,payer:1.5,spend:9,fee:15,cloud:130,marketing:200,other:100,rewards:0},
    base:{dau:1500,sessions:1.7,ads:0.9,ecpm:8,payer:2.5,spend:11,fee:15,cloud:280,marketing:500,other:150,rewards:0},
    scale:{dau:10000,sessions:2,ads:1.1,ecpm:10,payer:3.5,spend:14,fee:15,cloud:1200,marketing:5000,other:900,rewards:0}
  };
  function setForm(vals){for(const [key,value] of Object.entries(vals)){const field=document.querySelector(`[name="${key}"]`);if(field)field.value=value;}}
  function getForm(){const o={};for(const input of $('assumptions').querySelectorAll('input'))o[input.name]=Math.max(0,Number(input.value)||0);return o;}
  function calculate(){const v=getForm(), days=30;
    const impressions=v.dau*days*v.sessions*v.ads;
    const adRevenue=impressions*v.ecpm/1000;
    const iapGross=v.dau*v.payer/100*v.spend;
    const feeAmount=iapGross*v.fee/100;
    const iapNet=iapGross-feeAmount;
    const expenses=v.cloud+v.marketing+v.other+v.rewards;
    const net=adRevenue+iapNet-expenses;
    const revenuePerDauMonth=days*v.sessions*v.ads*v.ecpm/1000+(v.payer/100)*v.spend*(1-v.fee/100);
    const breakEven=revenuePerDauMonth>0?Math.ceil(expenses/revenuePerDauMonth):Infinity;
    const margin=adRevenue+iapNet>0?net/(adRevenue+iapNet)*100:0;
    $('net').textContent=MONEY.format(net);
    $('net').classList.toggle('negative',net<0);
    $('net-state').textContent=net>=0?'Modeled surplus · not actual profit':'Modeled loss · revise assumptions';
    $('ad-rev').textContent=MONEY.format(adRevenue);
    $('iap-net').textContent=MONEY.format(iapNet);
    $('break-even').textContent=Number.isFinite(breakEven)?NUM.format(breakEven):'No revenue';
    $('impressions').textContent=NUM.format(impressions);
    $('iap-gross').textContent=MONEY.format(iapGross);
    $('store-fees').textContent=MONEY.format(feeAmount);
    $('expenses').textContent=MONEY.format(expenses);
    $('margin').textContent=Number.isFinite(margin)?`${margin.toFixed(1)}%`:'—';
    $('rpuda').textContent=`$${revenuePerDauMonth.toFixed(2)}`;
    $('costpuda').textContent=v.dau>0?`$${(expenses/v.dau).toFixed(2)}`:'—';
    $('verdict').classList.toggle('loss',net<0);
    $('verdict').textContent=net>=0?`This hypothetical scenario covers modeled expenses by ${MONEY.format(net)} per month. Validate actual conversion and retention before spending on acquisition.`:`At these assumptions, modeled expenses exceed revenue by ${MONEY.format(-net)} per month. Increase effective revenue per retained player or reduce cost before scaling.`;
    try{localStorage.setItem(STORE,JSON.stringify(v));}catch{}
  }
  function refreshObserved(){let events=[],game={};try{events=JSON.parse(localStorage.getItem('luma_drift_analytics_v1')||'[]');if(!Array.isArray(events))events=[];}catch{}
    try{game=JSON.parse(localStorage.getItem('luma_drift_save_v2')||'{}');}catch{}
    const count=t=>events.filter(e=>e.type===t).length;
    $('obs-open').textContent=NUM.format(count('open'));
    $('obs-launch').textContent=NUM.format(count('launch'));
    $('obs-routes').textContent=NUM.format(count('route'));
    $('obs-daily').textContent=NUM.format(count('daily'));
    $('obs-builds').textContent=NUM.format(count('colony-build'));
    $('obs-relics').textContent=NUM.format(count('relic-discovery'));
    $('obs-atlas').textContent=`${Array.isArray(game.atlas?.discovered)?game.atlas.discovered.length:0} / 6`; 
    $('obs-last').textContent=events.length?`${events[events.length-1].type} · ${new Date(events[events.length-1].time).toLocaleString()}`:'No activity yet';
    $('obs-credits').textContent=NUM.format(Math.max(0,Number(game.credits)||0));
    $('obs-streak').textContent=NUM.format(Math.max(0,Number(game.dailyStreak)||0));
  }
  for(const b of document.querySelectorAll('[data-preset]'))b.addEventListener('click',()=>{setForm(presets[b.dataset.preset]);for(const p of document.querySelectorAll('[data-preset]'))p.classList.toggle('selected',p===b);calculate();});
  $('assumptions').addEventListener('input',()=>{for(const p of document.querySelectorAll('[data-preset]'))p.classList.remove('selected');calculate();});
  $('assumptions').addEventListener('submit',e=>e.preventDefault());
  $('reset-events').addEventListener('click',()=>{if(confirm('Clear only the local test event log? Your game progress will remain untouched.')){localStorage.removeItem('luma_drift_analytics_v1');refreshObserved();}});
  let saved;try{saved=JSON.parse(localStorage.getItem(STORE)||'null');}catch{}
  setForm(saved&&typeof saved==='object'?{...presets.base,...saved}:presets.base);
  calculate();refreshObserved();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshObserved();});
})();
