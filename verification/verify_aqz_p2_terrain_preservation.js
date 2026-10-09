const assert=require('assert'),fs=require('fs'),cp=require('child_process');
const {loadHost,root}=require('./chaos_world_harness');
const base='7ca3336eed3c204f3c794082c7c91d15f76ec42c';
const norm=s=>s.replace(/\r\n/g,'\n');let files=0,functions=0,cases=0;
for(const n of ['SCR_chaos_core','SCR_chaos_adapter','SCR_chaos_motion','SCR_chaos_core_data','SCR_chaos_aqz_data','SCR_chaos_sez_s2_data']){
 const p=`scripts/${n}/${n}.gml`;assert.strictEqual(norm(fs.readFileSync(root+'/'+p,'utf8')),norm(cp.execFileSync('git',['show',base+':'+p],{cwd:root,encoding:'utf8',maxBuffer:1<<28})));files++;
}
const p='scripts/SCR_chaos_sez_s2/SCR_chaos_sez_s2.gml';
const hook='        if (variable_struct_exists(cp_s,"platform3f")) {\n            if (chaos_platform3f_visit(cp_s,cp_b,cp_i,cp_c,cp_have,cp_vp)) cp_hold=true;\n            continue;\n        }\n';
assert.strictEqual(norm(fs.readFileSync(root+'/'+p,'utf8')).replace(hook,''),norm(cp.execFileSync('git',['show',base+':'+p],{cwd:root,encoding:'utf8'})));files++;
const hosts=[loadHost(base),loadHost()];
for(const name of Object.keys(hosts[0].ctx).filter(n=>/^(SCR_cc_|SCR_chaos_break|chaos_s2_)/.test(n)&&typeof hosts[0].ctx[n]==='function')){
 if(name==='chaos_s2_phase')continue;assert.strictEqual(norm(hosts[0].ctx[name].toString()),norm(hosts[1].ctx[name].toString()),name);functions++;
}
for(let move=0;move<4;move++)for(let hi=0;hi<256;hi++)for(const right of [false,true])for(const frac of [0,255]){
 const results=hosts.map(h=>{let broken=[];h.ctx.SCR_cc_break13=i=>broken.push(i);const k=h.ctx.SCR_cc_new(100,100);k.move=move;k.vx=h.ctx.SCR_cc_s16(hi*256+frac);return [h.ctx.SCR_cc_break13_side(k,{index:7},right),k.vx,broken];});
 assert.deepStrictEqual(results[0],results[1]);cases++;
}
console.log(JSON.stringify({status:'PASS',base,source_files:files,runtime_functions: functions,side_break_cases:cases}));
