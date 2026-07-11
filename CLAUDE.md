# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This project also has [AGENTS.md](AGENTS.md) and [.github/copilot-instructions.md](.github/copilot-instructions.md) with substantially the same guidance — this file summarizes the essentials; consult those for more detail if needed.

## Commands

```sh
npm install                 # must run first
npm test                    # full Jest suite with coverage; must pass, 100% required
npm run lint                # ESLint (recommended rules + real bug checks, not just style)
npm run format -- --check   # Prettier check (use `npm run format` to fix)
npm start                   # Express server on port 3000
npm run types               # emit .d.ts into types/ from JSDoc (build output, not committed)
```

Run a single test file: `node --experimental-vm-modules ./node_modules/jest/bin/jest.js tests/CSWrapper.spec.js`

Always run test, lint, and format-check before considering a change complete (see [.github/workflows/tests.yml](.github/workflows/tests.yml) — CI runs the same three). If runtime behavior changed, also run `npm start` and verify it boots.

## Architecture

csEngine is a browser-based Csound WASM wrapper (`CsoundEngine`) meant to run **side-by-side with an RNBO session**, sharing one `AudioContext`. [index.js](index.js) is just an Express static file server (serving `public/` plus, narrowly, `/node_modules/@csound/browser` for the browser-side WASM import — not all of `node_modules`).

- **[public/src/cswrapper.js](public/src/cswrapper.js)** — the entire runtime: `CsoundEngine` wraps the `@csound/browser` API with a create → `start()` → `compile()` → `sendScoreEvent()`/`handleMessage()` → `pause()`/`resume()` → `dispose()` lifecycle. All public methods are async; private state uses underscore-prefixed properties (`_csound`, `_started`, `_created`, `_messageQueue`).
- **`handleMessage()` serialization**: incoming payloads are chained through `_messageQueue` (a FIFO promise turnstile) so that (a) items within one message's `payload` array are written to Csound one at a time in array order, and (b) separate `handleMessage()` calls never race each other even if a burst arrives before prior WASM round-trips resolve. This is a load-bearing design detail — don't parallelize it.
- **Shared payload schema** (agreed with the RNBO-side integrator, don't change without coordination): `{ payload: [{ op: "csound", name, data }] }`. Only entries with `op === "csound"`, a string `name`, and a finite `data` are applied; everything else (other ops, malformed entries) is silently dropped since the payload is shared with other subsystems.
- **[public/src/instruments/](public/src/instruments/)** — instrument templates (`poscil3-instr01.js`, `vco2-instr02.js`, `vco2-square-instr03-06.js`, `pinkish-instr07.js`), each exporting a `<NAME>_CSD` string and a `<NAME>_CHANNELS` constant map per instrument (the square bank generates four such pairs from one template). Control channel names follow `<opcode>_instr<NN>_<param>`, matching the Csound opcode's own argument names (e.g. `poscil3_instr01_kamp` → `kamp` in `poscil3(kamp, kcps, ...)`). `compile()` adds to the running orchestra rather than replacing it, so multiple instrument templates can be compiled side by side into one engine. New instrument files should seed default channel values at the top level of the CSD (outside any `instr` block).
- **[public/main.js](public/main.js)** / **[public/index.html](public/index.html)** — the reference demo: creates a page-local `AudioContext`, compiles all instrument templates into one engine, and drives them via UI sliders through `handleMessage()` — the same path a real RNBO integration would use. The square-ensemble/pink-noise sections hold notes with `i N 0 -1` and release them with `i -N 0 0` so the ADSR release is audible.
- **[README.md](README.md)** is the canonical integration/API doc (written to be copy-pasted into a host project or fed to an LLM). Keep it in sync with any change to the public API of `CsoundEngine` or the instrument catalog.

## Conventions

- ESM only (`"type": "module"`) — no CommonJS, no mixing `.then()` with async/await.
- JSDoc on all public methods/params (this is also the source for generated `.d.ts` types).
- Preserve existing error message strings exactly — tests assert on them (e.g. `"Csound() returned nothing - WASM failed to load."`, `"CsoundEngine: call start() before using the engine."`).
- 100% coverage is enforced globally in [jest.config.cjs](jest.config.cjs) (branches/functions/lines/statements) — any drop is a regression.
- Don't change the control-channel naming convention or the `payload` schema without coordination (RNBO-side integrator depends on both).
