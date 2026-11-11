#!/usr/bin/env node
// Function manifest: lists every top-level function in src/js with its module,
// registry names, benchmark coverage, content hash and frozen flag.
//
//   node tools/functions.mjs update            regenerate functions.json (keeps frozen flags)
//   node tools/functions.mjs check             verify src/js against functions.json
//   node tools/functions.mjs freeze <name>...  mark functions as frozen
//   node tools/functions.mjs unfreeze <name>...
//   node tools/functions.mjs diff <old> [new]  change report between two snapshots
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const manifestPath = path.join(root, 'functions.json');
const jsDir = path.join(root, 'src', 'js');
const rel = p => path.relative(root, p).split(path.sep).join('/');
const hashOf = text => crypto.createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex').slice(0, 16);

// Identifiers used inside a node (property names and object keys excluded).
function identifiers(node, out = new Set()) {
  if (!node || typeof node.type !== 'string') return out;
  if (node.type === 'Identifier') out.add(node.name);
  for (const key of Object.keys(node)) {
    if (key === 'property' && node.type === 'MemberExpression' && !node.computed) continue;
    if (key === 'key' && node.type === 'Property' && !node.computed) continue;
    const v = node[key];
    if (Array.isArray(v)) v.forEach(x => identifiers(x, out));
    else if (v && typeof v.type === 'string') identifiers(v, out);
  }
  return out;
}

// Parses src/js and returns { build, version, functions (source order), duplicates }.
export function analyze() {
  const fns = [];
  let registry = [];
  let version = '';
  for (const file of fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).sort()) {
    const full = path.join(jsDir, file);
    const text = fs.readFileSync(full, 'utf8');
    const module = file.replace(/^\d+-/, '').replace(/\.js$/, '');
    for (const node of acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'script' }).body) {
      if (node.type === 'FunctionDeclaration') {
        const body = text.slice(node.start, node.end);
        fns.push({ name: node.id.name, module, file: rel(full), lines: body.split('\n').length, hash: hashOf(body), refs: identifiers(node.body) });
      } else if (node.type === 'VariableDeclaration') {
        for (const d of node.declarations) {
          if (d.id.name === 'FN_REGISTRY' && d.init?.type === 'ArrayExpression') registry = d.init.elements.map(e => e.value);
          if (d.id.name === 'GAME_VERSION' && d.init?.type === 'Literal') version = String(d.init.value);
        }
      }
    }
  }
  const seen = new Set();
  const duplicates = [...new Set(fns.filter(f => seen.has(f.name) || !seen.add(f.name)).map(f => f.name))];
  const byName = new Map(fns.map(f => [f.name, f]));

  // Coverage: "direct" = named inside runBenchmark, "indirect" = reachable from it, "none" = neither.
  const direct = byName.get('runBenchmark')?.refs ?? new Set();
  const reached = new Set();
  const queue = [...direct].filter(n => byName.has(n));
  while (queue.length) {
    const n = queue.pop();
    if (reached.has(n)) continue;
    reached.add(n);
    for (const r of byName.get(n).refs) if (byName.has(r) && !reached.has(r)) queue.push(r);
  }
  for (const f of fns) {
    f.registry = registry.filter(r => r === `${f.module}.${f.name}`);
    f.coverage = direct.has(f.name) ? 'direct' : reached.has(f.name) ? 'indirect' : 'none';
    delete f.refs;
  }
  const title = fs.readFileSync(path.join(root, 'src', 'index.html'), 'utf8').match(/<title>\s*(SUN_\d{3})/);
  if (!title) throw new Error('no SUN_NNN build number in the <title> of src/index.html');
  return { build: title[1], version, functions: fns, duplicates };
}

export function toManifest(a, previous) {
  const functions = {};
  for (const f of a.functions) {
    functions[f.name] = { module: f.module, file: f.file, lines: f.lines, registry: f.registry, coverage: f.coverage, hash: f.hash, frozen: !!previous?.functions?.[f.name]?.frozen };
  }
  const list = Object.values(functions);
  const count = k => list.filter(f => f.coverage === k).length;
  return {
    schema: 'zephyr.functions.v1', build: a.build, version: a.version,
    totals: { functions: list.length, modules: new Set(list.map(f => f.module)).size, frozen: list.filter(f => f.frozen).length, coverage: { direct: count('direct'), indirect: count('indirect'), none: count('none') } },
    functions
  };
}

export const readManifest = () => (fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null);
const writeJSON = (p, obj) => fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');

// Compares src/js with functions.json. Errors fail the build; changes are informational.
export function check(a = analyze(), manifest = readManifest()) {
  const errors = [], changed = [];
  if (!manifest) return { errors: ['functions.json is missing: run "node tools/functions.mjs update"'], changed };
  for (const n of a.duplicates) errors.push(`duplicate function: ${n}`);
  const now = new Map(a.functions.map(f => [f.name, f]));
  for (const [name, f] of now) {
    const m = manifest.functions[name];
    if (!m) { errors.push(`unlisted function: ${name} (${f.file})`); continue; }
    if (m.hash !== f.hash) (m.frozen ? errors : changed).push(m.frozen ? `frozen function changed: ${name} (${f.file})` : name);
    if (m.frozen && m.file !== f.file) errors.push(`frozen function moved: ${name} (${m.file} -> ${f.file})`);
  }
  for (const [name, m] of Object.entries(manifest.functions)) {
    if (!now.has(name)) errors.push(`${m.frozen ? 'frozen function removed' : 'listed function missing'}: ${name} (${m.file})`);
  }
  return { errors, changed };
}

export const snapshot = manifest => ({
  schema: 'zephyr.functions.snapshot.v1', build: manifest.build, version: manifest.version,
  functions: Object.fromEntries(Object.entries(manifest.functions).map(([n, f]) => [n, { module: f.module, hash: f.hash }]))
});

export function diff(oldSnap, newSnap) {
  const o = oldSnap.functions, n = newSnap.functions;
  return {
    schema: 'zephyr.changes.v1', build: newSnap.build, version: newSnap.version, previous: oldSnap.build,
    added: Object.keys(n).filter(k => !o[k]),
    removed: Object.keys(o).filter(k => !n[k]),
    changed: Object.keys(n).filter(k => o[k] && o[k].hash !== n[k].hash),
    moved: Object.keys(n).filter(k => o[k] && o[k].module !== n[k].module).map(k => ({ name: k, from: o[k].module, to: n[k].module }))
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...args] = process.argv.slice(2);
  const fail = lines => { for (const l of [].concat(lines)) console.error('error: ' + l); process.exit(1); };
  if (cmd === 'update') {
    const a = analyze(), prev = readManifest();
    if (a.duplicates.length) fail(a.duplicates.map(n => `duplicate function: ${n}`));
    const frozenErrors = prev ? check(a, prev).errors.filter(e => e.startsWith('frozen')) : [];
    if (frozenErrors.length) fail([...frozenErrors, 'unfreeze these functions first if the change is intended']);
    const m = toManifest(a, prev);
    writeJSON(manifestPath, m);
    console.log(`functions.json  ${m.build} v${m.version}  ${JSON.stringify(m.totals)}`);
  } else if (cmd === 'check') {
    const r = check();
    if (r.changed.length) console.log(`changed since functions.json (${r.changed.length}): ${r.changed.join(', ')}`);
    if (r.errors.length) fail(r.errors);
    console.log('functions.json: ok');
  } else if (cmd === 'freeze' || cmd === 'unfreeze') {
    const m = readManifest() ?? fail('functions.json is missing');
    const unknown = args.filter(n => !m.functions[n]);
    if (!args.length || unknown.length) fail(args.length ? unknown.map(n => `unknown function: ${n}`) : 'name at least one function');
    if (cmd === 'freeze') {
      const stale = check(analyze(), m).changed.filter(n => args.includes(n));
      if (stale.length) fail(stale.map(n => `${n} differs from functions.json: run update before freezing`));
    }
    for (const n of args) m.functions[n].frozen = cmd === 'freeze';
    m.totals.frozen = Object.values(m.functions).filter(f => f.frozen).length;
    writeJSON(manifestPath, m);
    console.log(`${cmd}: ${args.join(', ')}  (frozen total: ${m.totals.frozen})`);
  } else if (cmd === 'diff' && args[0]) {
    const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
    console.log(JSON.stringify(diff(read(args[0]), args[1] ? read(args[1]) : snapshot(toManifest(analyze(), readManifest()))), null, 2));
  } else {
    console.error('usage: node tools/functions.mjs update | check | freeze <name>... | unfreeze <name>... | diff <old> [new]');
    process.exit(2);
  }
}
