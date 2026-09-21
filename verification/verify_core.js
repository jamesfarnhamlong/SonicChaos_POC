// Executes the actual shipped GML core (JS-compatible syntax), not a reimplementation.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const root = path.resolve(__dirname,'..');
const ctx = vm.createContext({global:{},floor:Math.floor,round:Math.round,abs:Math.abs,
    min:Math.min,max:Math.max,array_create:(n,v)=>Array(n).fill(v),is_array:Array.isArray});
for(const n of ['SCR_chaos_motion_data','SCR_chaos_core_data','SCR_chaos_core'])
    vm.runInContext(fs.readFileSync(path.join(root,'scripts',n,n+'.gml'),'utf8'),ctx,{filename:n+'.gml'});
ctx.SCR_chaos_motion_data();ctx.SCR_chaos_core_data();
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures.json'),'utf8'));
function initial(v){return Object.assign(ctx.SCR_cc_new(200,200),{state:5,next:5},v);}
function check(c,expected,label){for(const [k,v] of Object.entries(expected)) assert.strictEqual(c[k],v,`${label}: ${k}; actual ${c[k]}, expected ${v}`);}
let count=0;
for(const f of data.cases){const c=initial(f.initial);const result=f.fn==='lookup'?ctx.SCR_cc_lookup(...f.args):ctx['SCR_cc_'+f.fn](c,...f.args);check(f.fn==='lookup'?result:c,f.expected,`${f.fn} #${count} ${JSON.stringify(f.initial)}`);count++;}
let c=initial(data.ramp.initial);
for(let i=0;i<data.ramp.trace.length;i++){c.state=c.next;ctx.SCR_cc_shared(c);check(c,data.ramp.trace[i],`ramp tick ${i}`);}
const saved=ctx.global.chaosTileIds;ctx.global.chaosTileIds=Array(4095).fill(0);
c=initial(data.spring.initial);
for(let i=0;i<data.spring.trace.length;i++){
    c.state=c.next;
    if(c.state==11)ctx.SCR_cc_tick(c);else ctx.SCR_cc_shared(c);
    check(c,data.spring.trace[i],`spring tick ${i}`);
}
ctx.global.chaosTileIds=saved;
assert.strictEqual(ctx.SCR_cc_lookup(4095,1023,0).index,-1,'4096th map cell must not be queried');
const report={rom_sha256:data.rom_sha256,actual_gml_executed:true,subroutine_cases:count,
    first_ramp_updates:48,vertical_spring_updates:160,game_maker_compiled:false,
    limitation:'Numerical ROM fixtures, not GameMaker gameplay or full scheduler emulation'};
fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
