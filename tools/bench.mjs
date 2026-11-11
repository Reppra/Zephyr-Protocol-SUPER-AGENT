#!/usr/bin/env node
// Runs the game's built-in benchmark in headless Chromium and exits non-zero on failure.
//   node tools/bench.mjs [file.html] [--json out.json]
// Chromium is taken from $CHROMIUM, else "chromium" on PATH. Uses software WebGL.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { root, analyze } from './functions.mjs';

const args = process.argv.slice(2);
const jsonAt = args.indexOf('--json');
const jsonOut = jsonAt >= 0 ? args.splice(jsonAt, 2)[1] : null;
const file = path.resolve(args[0] ?? path.join(root, 'dist', `${analyze().build}.html`));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'sun-bench-'));
const chromium = spawn(process.env.CHROMIUM || 'chromium', [
  '--headless=new', '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1280,720', 'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'] });
const finish = code => { chromium.kill(); fs.rmSync(profile, { recursive: true, force: true }); process.exit(code); };

try {
  const wsUrl = await new Promise((resolve, reject) => {
    let log = '';
    chromium.stderr.on('data', d => { log += d; const m = log.match(/DevTools listening on (ws:\S+)/); if (m) resolve(m[1]); });
    chromium.on('error', reject);
    setTimeout(() => reject(new Error('Chromium did not start')), 20000);
  });
  const targets = await (await fetch(`http://127.0.0.1:${new URL(wsUrl).port}/json`)).json();
  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => { ws.onopen = r; });

  let id = 0;
  const pending = new Map(), pageErrors = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    else if (m.method === 'Runtime.exceptionThrown') pageErrors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  };
  const send = (method, params = {}) => new Promise(r => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'evaluation failed');
    return r.result.result.value;
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: `file://${file}?debug=1` });
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) { await sleep(250); try { ready = await evaluate('!!(window.__SUN&&window.__SUN.bootReady)'); } catch {} }
  if (!ready) { console.error(`error: page did not boot\n${pageErrors.join('\n')}`); finish(1); }

  const bench = await evaluate('(()=>{const b=__SUN.runBenchmark();return {ok:b.ok,payload:b.payload};})()');
  await sleep(1000);
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ ...bench.payload, pageErrors }, null, 2) + '\n');
  const t = bench.payload.totals;
  console.log(`${path.basename(file)}  ${bench.ok ? 'PASS' : 'FAIL'}  pass ${t.pass}  fail ${t.fail}  threw ${t.threw}  skip ${t.skip}  untested ${bench.payload.coverage.untested.length}  page errors ${pageErrors.length}`);
  for (const r of bench.payload.results) if (r.status === 'FAIL' || r.status === 'THREW') console.log(`  ${r.status}  ${r.name}  ${r.error}`);
  for (const e of pageErrors) console.log(`  page error: ${e}`);
  finish(bench.ok && pageErrors.length === 0 ? 0 : 1);
} catch (e) {
  console.error('error: ' + e.message);
  finish(1);
}
