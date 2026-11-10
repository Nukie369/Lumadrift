const fs=require('fs'),assert=require('node:assert/strict');
const css=fs.readFileSync(__dirname+'/polish.css','utf8');
const block=css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
assert(block.includes('animation: none !important'));
for(const selector of ['.scene::before','.ship-wrap','.engine-flame','.view','.relic-reveal','.colony-map-monument','.colony-marker.just-built .marker-icon']) assert(block.includes(selector),selector);
assert(block.includes('transition-duration: 0.01ms !important'));
assert(block.includes('.ship-wrap { transform: translate(-50%, -50%) !important; }'));
console.log('PASS: reduced-motion covers perpetual scene motion, reveals, construction and transitions');
