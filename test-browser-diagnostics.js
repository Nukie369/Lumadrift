const fs=require('fs'),assert=require('assert');
const s=fs.readFileSync('browser-colony-check.html','utf8');
for(const phrase of ['loads=0','lastEvent=',"frame.addEventListener('error'",'window.addEventListener("error"','loads='+"'+loads",'last='+"'+lastEvent",'construction saved; requesting reload'])assert(s.includes(phrase),`missing diagnostic ${phrase}`);
assert(s.indexOf('loads++;')<s.indexOf("if(frame.getAttribute('src')==='about:blank')"));
console.log('PASS browser harness records load count, last checkpoint and resource/window errors');
