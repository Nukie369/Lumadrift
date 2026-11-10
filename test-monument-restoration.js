const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(__dirname+'/game.js','utf8');
function between(a,b){const i=src.indexOf(a),j=src.indexOf(b,i);assert(i>=0&&j>i);return src.slice(i,j);}
function node(tag='div'){return {tag,children:[],style:{},hidden:false,textContent:'',innerHTML:'',append(child){this.children.push(child)},replaceChildren(){this.children=[]}};}
const atlas=node(),colony=node();
const nodes={'atlas-monuments':atlas,'colony-map-monuments':colony};
const ctx={state:{atlas:{claimed:['skyward','deep']}},document:{createElement:node},$:id=>nodes[id]};
vm.createContext(ctx);
vm.runInContext(between('  const atlasSets=[','  const colonyBonus='),ctx);
vm.runInContext(between('  function validMonumentClaims(){','  function renderAtlas(){'),ctx);
const atlasCode=between("    const monuments=$('atlas-monuments');","  function finish(success,crashed)");
// The closing renderAtlas brace is included; wrap the selected statements in a function.
const atlasBody=atlasCode.slice(0,atlasCode.lastIndexOf('  }'));
const colonyCode=between("    const relicMonuments=$('colony-map-monuments');","    for(const def of buildingDefs){");
vm.runInContext(`function drawAtlas(){${atlasBody}} function drawColony(){${colonyCode}}`,ctx);
function verify(ids){ctx.state.atlas.claimed=ids;vm.runInContext('drawAtlas();drawColony()',ctx);
 const valid=Array.isArray(ids)?['skyward','deep'].filter(id=>ids.includes(id)):[];
 assert.equal(atlas.hidden,valid.length===0);
 assert.equal(atlas.children.length,valid.length);
 assert.equal(colony.children.length,valid.length);
 assert.deepEqual(atlas.children.map(n=>n.textContent),valid.map(id=>id==='skyward'?'🌠 Skyward Wonders Monument':'🌀 Deep Signal Monument'));
 assert.deepEqual(colony.children.map(n=>n.style.left),valid.map(id=>id==='skyward'?'31%':'70%'));
 assert.deepEqual(colony.children.map(n=>n.style.top),valid.map(id=>id==='skyward'?'78%':'74%'));
 assert.deepEqual(colony.children.map(n=>n.innerHTML),valid.map(id=>id==='skyward'?'<span>🌠</span><small>Skyward Wonders</small>':'<span>🌀</span><small>Deep Signal</small>'));
}
verify(['skyward','deep']);
const snapshot=JSON.stringify(ctx.state);ctx.state=JSON.parse(snapshot);
verify(['skyward','deep']);verify(['deep']);verify([]);verify(['skyward','deep']);
verify(['unknown']);verify(['unknown','skyward']);verify(['skyward','skyward']);verify(null);verify('skyward');verify({id:'skyward'});
console.log('PASS: both collection monuments restore, preserve positions, and clear stale visuals');
