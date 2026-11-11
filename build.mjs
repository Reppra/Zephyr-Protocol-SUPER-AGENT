#!/usr/bin/env node
// Assembles src/ into one self-contained dist/SUN_NNN.html, where NNN is the
// build number in the <title> of src/index.html. The build fails when src/js
// disagrees with functions.json (unlisted, missing, duplicate or frozen-but-changed
// functions), and writes a per-function change report against the previous build.
import fs from 'node:fs';
import path from 'node:path';
import { root, analyze, check, readManifest, toManifest, snapshot, diff } from './tools/functions.mjs';

const src = path.join(root, 'src');
const read = p => fs.readFileSync(path.join(src, p));

// "<!--@include NAME-->" on its own line is replaced by the file src/NAME,
// or, if NAME is a directory, by all of its files in filename order.
const include = name => {
  const p = path.join(src, name);
  if (!fs.statSync(p).isDirectory()) return read(name);
  return Buffer.concat(fs.readdirSync(p).sort().map(f => read(path.join(name, f))));
};

const analysis = analyze();
const manifest = readManifest();
const result = check(analysis, manifest);
if (result.errors.length) {
  for (const e of result.errors) console.error('error: ' + e);
  console.error('build stopped: fix the sources or run "node tools/functions.mjs update"');
  process.exit(1);
}

const template = read('index.html').toString('latin1'); // byte-preserving
const html = Buffer.concat(
  template.split(/(<!--@include [^>]+-->\r?\n)/).map(part => {
    const m = part.match(/^<!--@include ([^>]+)-->/);
    return m ? include(m[1]) : Buffer.from(part, 'latin1');
  })
);

const build = analysis.build;
const dist = path.join(root, 'dist');
const builds = path.join(root, 'builds');
fs.mkdirSync(dist, { recursive: true });
fs.mkdirSync(builds, { recursive: true });
fs.writeFileSync(path.join(dist, `${build}.html`), html);
console.log(`dist/${build}.html  ${html.length} bytes  v${analysis.version}  ${analysis.functions.length} functions`);

// Snapshot of this build's functions, and the change report against the previous build number.
const writeJSON = (p, obj) => fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
const snap = snapshot(toManifest(analysis, manifest));
writeJSON(path.join(builds, `${build}.functions.json`), snap);
const previous = fs.readdirSync(builds).map(f => f.match(/^(SUN_\d{3})\.functions\.json$/)?.[1]).filter(b => b && b < build).sort().pop();
if (previous) {
  const report = diff(JSON.parse(fs.readFileSync(path.join(builds, `${previous}.functions.json`), 'utf8')), snap);
  writeJSON(path.join(dist, `${build}.changes.json`), report);
  console.log(`changes since ${previous}: ${report.added.length} added, ${report.changed.length} changed, ${report.removed.length} removed, ${report.moved.length} moved  (dist/${build}.changes.json)`);
} else {
  console.log(`no earlier build in builds/: ${build} is the baseline`);
}
if (result.changed.length) console.log(`note: ${result.changed.length} function(s) differ from functions.json: ${result.changed.join(', ')}`);
