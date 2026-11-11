# SUN — module sources and build

The single-file game, split into 35 JavaScript modules that are assembled back
into one self-contained HTML file, with a manifest that tracks every function.

## Setup

```
npm install        # one dev dependency: acorn (JavaScript parser)
```

## Build

```
node build.mjs     # writes dist/SUN_NNN.html
```

`NNN` is the build number in the `<title>` of `src/index.html`, so the output
name counts up with the sources (`SUN_011.html`, `SUN_012.html`, ...).

Each build also writes:

- `builds/SUN_NNN.functions.json` — snapshot of every function's module and hash (commit these)
- `dist/SUN_NNN.changes.json` — functions added, changed, removed or moved since the previous build number

## Function manifest

`functions.json` lists all top-level functions. Per function: module, file,
line count, registry names (`FN_REGISTRY` entries), benchmark coverage, content
hash, and a `frozen` flag.

```
node tools/functions.mjs update              # regenerate after intended changes (keeps frozen flags)
node tools/functions.mjs check               # verify src/js against functions.json
node tools/functions.mjs freeze <name>...    # lock functions
node tools/functions.mjs unfreeze <name>...
node tools/functions.mjs diff <old> [new]    # change report between two snapshots
```

The build stops when:

- a function exists in `src/js` but is not listed (run `update` to accept it)
- a listed function is missing
- two functions share a name
- a frozen function was changed, moved or removed (unfreeze it first)

Coverage values: `direct` = named inside `runBenchmark`, `indirect` = reachable
from it through other functions, `none` = neither. Coverage is reported, not
enforced.

## Benchmark

```
node tools/bench.mjs [file.html] [--json out.json]
```

Loads the build in headless Chromium (`$CHROMIUM`, else `chromium` on PATH),
runs the game's own benchmark and exits non-zero on any failure or page error.

## Layout

- `src/index.html` — page skeleton with `<!--@include NAME-->` markers
- `src/styles.css` — contents of the `<style>` block
- `src/body.html` — page markup
- `src/js/NN-module.js` — one file per module, concatenated in filename order

## Notes

- The module files are fragments of one classic script, not ES modules. They
  share a single top-level scope, and the filename order is the load order.
- Only functions are tracked. Top-level data tables (`PERKS`, `WEAPONS`, ...)
  are not in the manifest.
- Raising the build number is a source change: besides the title it touches the
  storage keys, schema names and legacy-key lists. The build does not do this.
- Files use CRLF line endings; `.gitattributes` disables line-ending conversion.
