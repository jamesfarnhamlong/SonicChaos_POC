// Execute the shipped Task-07 object-floor helper against the real THZ map.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({global:{},floor:Math.floor,round:Math.round,abs:Math.abs,
    min:Math.min,max:Math.max,array_create:(n,v)=>Array(n).fill(v),array_length:a=>a.length,
    array_copy:(dst,di,src,si,n)=>{for(let i=0;i<n;i++)dst[di+i]=src[si+i];},is_array:Array.isArray});
for(const n of ['SCR_chaos_motion_data','SCR_chaos_core_data','SCR_chaos_core'])
    vm.runInContext(fs.readFileSync(path.join(root,'scripts',n,n+'.gml'),'utf8'),ctx,{filename:n+'.gml'});
ctx.SCR_chaos_motion_data();ctx.SCR_chaos_core_data();

const adapter=fs.readFileSync(path.join(root,'scripts','SCR_chaos_adapter','SCR_chaos_adapter.gml'),'utf8');
const helper=adapter.match(/function SCR_chaos_object_floor_project\(cp_x, cp_y\) \{[\s\S]*?\r?\n\}\r?\n\r?\n\/\/ Type \$21/);
assert(helper,'object-floor helper not found');
vm.runInContext(helper[0].replace(/\r?\n\r?\n\/\/ Type \$21[\s\S]*$/,''),ctx,{filename:'SCR_chaos_object_floor_project.gml'});

const placements=[[800,606,590],[1248,862,846],[2048,318,302],
    [3152,894,878],[3296,286,270],[2400,254,238]];
const stable=[];
for(const [x,placementY,expectedY] of placements){
    // The original callback first integrates +$0200, then probes anchor+18.
    const integratedY=placementY+2;
    const result=ctx.SCR_chaos_object_floor_project(x,integratedY);
    assert.strictEqual(result.grounded,true,`grounded ${x},${placementY}`);
    assert.strictEqual(result.y,expectedY,`stable anchor ${x},${placementY}`);
    stable.push({placement:[x,placementY],integrated_y:integratedY,stable_y:result.y});
}

const report={rom_sha256:'eabc8db59746714262d2f91a921d054823484349099a9fcd04fd6e84a1fee607',
    actual_gml_helper_executed:true,lookup_y_offset:18,projection_anchor:'unshifted',
    stable_type_21_anchors:stable};
fs.writeFileSync(path.join(__dirname,'task07-results.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
