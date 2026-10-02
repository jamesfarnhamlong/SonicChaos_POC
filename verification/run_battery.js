// Runs the platform / spike battery against a host and prints the results.
// Usage: node verification/run_battery.js [gitRef|working] [section...]     (BATTERY_JSON=<file> also writes the results as JSON)
const {loadHost} = require('./chaos_world_harness.js'); const B = require('./platform_spike_battery.js');
const ref = process.argv[2] && process.argv[2] !== 'working' ? process.argv[2] : null, secs = process.argv.slice(3);
const host = loadHost(ref), results = [];
const add = (id, area, desc, pass, detail) => { results.push({id, area, desc, pass, detail}); console.log(`${pass ? 'PASS' : 'FAIL'} ${id} [${area}] ${desc}${pass ? '' : '\n       -> ' + detail}`); };
const names = secs.length ? secs : Object.keys(B).filter(k => k.startsWith('section_')).map(k => k.slice(8));
for (const s of names) {
    try { B['section_' + s](host, add); }
    catch (e) { add('ERR', s, `section ${s} aborted`, false, String(e.stack || e).split('\n').slice(0, 3).join(' | ')); }
}
const passed = results.filter(r => r.pass).length;
console.log(`\n${passed}/${results.length} pass`);
if (process.env.BATTERY_JSON) require('fs').writeFileSync(process.env.BATTERY_JSON, JSON.stringify({ref: ref || 'working tree', passed, total: results.length, results}, null, 1));
process.exitCode = passed === results.length ? 0 : 1;
