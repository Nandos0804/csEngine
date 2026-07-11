# csEngine

A lightweight browser-based Csound wrapper designed to run **side-by-side** with an [RNBO](https://rnbo.cycling74.com/js) session in the same page, sharing one `AudioContext`.

## About The Project

csEngine wraps the Csound WebAssembly API with a lifecycle that's easy to reason about:

- create the engine (optionally reusing an existing `AudioContext`, e.g. one an RNBO session already created)
- compile CSD content
- send score events
- dispatch a shared JSON payload to Csound control channels
- pause, resume, or dispose cleanly

This section is the API reference. It's written so it can be copy-pasted into another project (or fed to an LLM) to generate the integration glue code without needing any other documentation.

## Integration Guide

### What to copy

The wrapper plus whichever instrument templates you need, no build step, no npm install required in the host project:

- [public/src/cswrapper.js](public/src/cswrapper.js) — the `CsoundEngine` class
- [public/src/instruments/poscil3-instr01.js](public/src/instruments/poscil3-instr01.js) — instrument 1, a continuously controllable oscillator
- [public/src/instruments/vco2-instr02.js](public/src/instruments/vco2-instr02.js) — instrument 2, a filtered sawtooth
- [public/src/instruments/vco2-square-instr03-06.js](public/src/instruments/vco2-square-instr03-06.js) — instruments 3–6, four square-wave voices with random drift, duty-cycle control, and an ADSR
- [public/src/instruments/pinkish-instr07.js](public/src/instruments/pinkish-instr07.js) — instrument 7, pink noise with an ADSR

Drop them anywhere in your project (e.g. `src/csound/`) and import them:

```js
import { CsoundEngine } from "./csound/cswrapper.js";
import {
  POSCIL3_INSTR01_CSD,
  POSCIL3_INSTR01_CHANNELS,
} from "./csound/instruments/poscil3-instr01.js";
```

`@csound/browser` is the only runtime dependency `cswrapper.js` needs; make sure it (or an import map pointing `@csound/browser/dist/csound.js` at the package) is available in the host project.

Working in TypeScript, or just want editor autocomplete over the plain-JS wrapper? Run `npm run types` to emit `.d.ts` declarations (generated from the existing JSDoc) into a local `types/` directory — it's build output, not something to commit or ship.

### Where to create the engine

Call `start()` from inside a user-gesture handler (click, keydown, etc.) — browsers block `AudioContext` creation otherwise. Pass in RNBO's `AudioContext` so both engines share one audio graph:

```js
const engine = new CsoundEngine();

button.addEventListener("click", async () => {
  // audioContext: reuse the AudioContext your RNBO device already created.
  // autoConnect: set to false if you want to route Csound's output node
  // yourself (via engine.getAudioContext() + the Csound object's getNode())
  // instead of letting it auto-connect to destination.
  await engine.start({ audioContext: rnboAudioContext, autoConnect: true });
  await engine.compile(POSCIL3_INSTR01_CSD);
});
```

If Csound should own the context instead (no `audioContext` passed), call `await engine.getAudioContext()` afterwards to retrieve it and hand it to RNBO instead.

`compile()` adds instruments to the running engine rather than replacing its orchestra, so calling it more than once (e.g. once per instrument template) loads them all side by side:

```js
await engine.compile(POSCIL3_INSTR01_CSD);
await engine.compile(VCO2_INSTR02_CSD);
```

### Where to add the payload listener

Wherever your app already receives the incoming JSON message (RNBO device message handler, WebSocket, postMessage, etc.), forward the parsed payload to the engine:

```js
function onIncomingMessage(message) {
  engine.handleMessage(message);
}
```

`handleMessage()` only acts on entries where `op` is `"csound"`; every other entry in the same payload is ignored, since the payload is shared with other subsystems (e.g. RNBO).

### Diagnosing audio glitches

Csound reports compiler errors and runtime warnings (e.g. buffer underruns, a common and otherwise-silent cause of audible clicks) through its own message stream, which is already logged via `console.log` by default. `engine.onMessage(callback)` lets the host also inspect or filter that stream without opening dev tools; it returns an unsubscribe function:

```js
const stopLogging = engine.onMessage((message) =>
  console.log("[csound]", message),
);
// later, if needed:
stopLogging();
```

### Payload schema

```json
{
  "payload": [
    {
      "op": "csound",
      "name": "poscil3_instr01_kamp",
      "data": 0.5
    }
  ]
}
```

| Field  | Type   | Meaning                                                                |
| ------ | ------ | ---------------------------------------------------------------------- |
| `op`   | string | Must be `"csound"` for this engine to act on the entry.                |
| `name` | string | Csound control channel name to write to (see naming convention below). |
| `data` | number | Value written to that channel via `setControlChannel(name, data)`.     |

A `payload` array can contain any number of entries addressing the same or different instruments — `handleMessage()` writes them one at a time, in array order, rather than firing them concurrently, so a message that touches several channels at once always lands predictably. Calls to `handleMessage()` are also serialized against each other in the order they were made, so a fast, real-time source (a WebSocket relaying many clients, an animation loop) can't race a still in-flight call. Entries whose `name` isn't a string or `data` isn't a finite number are dropped rather than sent to Csound, since payloads may now arrive over the network from client input.

### Instrument naming convention

Control channel names follow `<opcode>_instr<NN>_<param>`, so the channel maps directly back to the Csound opcode signature it feeds. Example: `poscil3_instr01_kamp` targets the `kamp` argument of `poscil3(kamp, kcps, ifn, iphs)` in instrument `01`.

### Instrument catalog

#### poscil3-instr01

`public/src/instruments/poscil3-instr01.js` — instrument 1, a continuously controllable oscillator (`poscil3(kamp, kcps)`).

| Channel                | Constant                        | Csound param | Default |
| ---------------------- | ------------------------------- | ------------ | ------- |
| `poscil3_instr01_kamp` | `POSCIL3_INSTR01_CHANNELS.kamp` | `kamp`       | `0.3`   |
| `poscil3_instr01_kcps` | `POSCIL3_INSTR01_CHANNELS.kcps` | `kcps`       | `440`   |

Trigger the note with a score event (e.g. `engine.sendScoreEvent("i 1 0 3600")`), then drive `kamp`/`kcps` live via `handleMessage()`. Both channels are smoothed through `port` (20ms glide) before reaching `poscil3`, so stepped updates from a UI control don't produce an audible click on every change.

#### vco2-instr02

`public/src/instruments/vco2-instr02.js` — instrument 2, a sawtooth (`vco2(kamp, kcps)`) through a resonant lowpass filter (`moogladder(asig, kcutoff, kres)`).

| Channel                | Constant                        | Csound param | Default |
| ---------------------- | ------------------------------- | ------------ | ------- |
| `vco2_instr02_kamp`    | `VCO2_INSTR02_CHANNELS.kamp`    | `kamp`       | `0.3`   |
| `vco2_instr02_kcps`    | `VCO2_INSTR02_CHANNELS.kcps`    | `kcps`       | `220`   |
| `vco2_instr02_kcutoff` | `VCO2_INSTR02_CHANNELS.kcutoff` | `kcutoff`    | `2000`  |
| `vco2_instr02_kres`    | `VCO2_INSTR02_CHANNELS.kres`    | `kres`       | `0.3`   |

Trigger the note with a score event (e.g. `engine.sendScoreEvent("i 2 0 3600")`), then drive any of the four channels live via `handleMessage()` — including several at once in a single call (e.g. `kcutoff` and `kres` together), since payload items are applied in array order. All four channels are smoothed through `port` (20ms glide) before reaching `vco2`/`moogladder`.

#### vco2-square-instr03-06

`public/src/instruments/vco2-square-instr03-06.js` — instruments 3–6, four identical square-wave voices generated from one template. Each voice is a PWM square (`vco2(kamp, kcps + kjit, 2, kpw)`) whose frequency drifts randomly within ±`krand` Hz around `kcps` (`randi`, clock-seeded so the voices drift independently), shaped by an ADSR envelope on the output (`madsr(iatt, idec, islev, irel)`).

Each voice `<NN>` (`03`–`06`) exports `VCO2_INSTR<NN>_CSD` and `VCO2_INSTR<NN>_CHANNELS`:

| Channel                | Constant                        | Csound param                    | Default                 |
| ---------------------- | ------------------------------- | ------------------------------- | ----------------------- |
| `vco2_instr<NN>_kamp`  | `VCO2_INSTR<NN>_CHANNELS.kamp`  | `kamp`                          | `0.2`                   |
| `vco2_instr<NN>_kcps`  | `VCO2_INSTR<NN>_CHANNELS.kcps`  | `kcps` (base frequency, Hz)     | `220`/`275`/`330`/`440` |
| `vco2_instr<NN>_krand` | `VCO2_INSTR<NN>_CHANNELS.krand` | `krand` (± drift range, Hz)     | `5`                     |
| `vco2_instr<NN>_kpw`   | `VCO2_INSTR<NN>_CHANNELS.kpw`   | `kpw` (duty cycle, `0.05–0.95`) | `0.5`                   |
| `vco2_instr<NN>_iatt`  | `VCO2_INSTR<NN>_CHANNELS.iatt`  | `iatt` (attack, s)              | `0.05`                  |
| `vco2_instr<NN>_idec`  | `VCO2_INSTR<NN>_CHANNELS.idec`  | `idec` (decay, s)               | `0.1`                   |
| `vco2_instr<NN>_islev` | `VCO2_INSTR<NN>_CHANNELS.islev` | `islev` (sustain level, `0–1`)  | `0.7`                   |
| `vco2_instr<NN>_irel`  | `VCO2_INSTR<NN>_CHANNELS.irel`  | `irel` (release, s)             | `0.5`                   |

The default base frequencies (`220`/`275`/`330`/`440` for instruments 3/4/5/6) form a 4:5:6:8 ratio, so triggering all four voices untouched already sounds like an ensemble. Trigger each voice with its own score event (e.g. `engine.sendScoreEvent("i 3 0 3600")` … `"i 6 0 3600"`). The k-rate channels (`kamp`, `kcps`, `krand`, `kpw`) are smoothed through `port` (20ms glide) and can be driven live; the ADSR channels are read once at note start, so changing them affects the next triggered note, and the release stage plays when the note ends.

Example — hold one voice, reshape it live, then release it through the ADSR release stage:

```js
await engine.compile(VCO2_INSTR03_CSD);

// Negative p3 holds the note at the ADSR sustain level until turned off.
await engine.sendScoreEvent("i 3 0 -1");

// Live control while the note sounds (k-rate channels), plus an envelope
// tweak that lands on the next trigger (i-rate channels).
await engine.handleMessage({
  payload: [
    { op: "csound", name: VCO2_INSTR03_CHANNELS.kpw, data: 0.25 },
    { op: "csound", name: VCO2_INSTR03_CHANNELS.krand, data: 10 },
    { op: "csound", name: VCO2_INSTR03_CHANNELS.irel, data: 2 },
  ],
});

// Turnoff plays the madsr release stage instead of cutting the note dead.
await engine.sendScoreEvent("i -3 0 0");
```

#### pinkish-instr07

`public/src/instruments/pinkish-instr07.js` — instrument 7, pink noise (`pinkish(kamp)`) shaped by an ADSR envelope on the output (`madsr(iatt, idec, islev, irel)`).

| Channel                 | Constant                         | Csound param                   | Default |
| ----------------------- | -------------------------------- | ------------------------------ | ------- |
| `pinkish_instr07_kamp`  | `PINKISH_INSTR07_CHANNELS.kamp`  | `kamp`                         | `0.2`   |
| `pinkish_instr07_iatt`  | `PINKISH_INSTR07_CHANNELS.iatt`  | `iatt` (attack, s)             | `0.05`  |
| `pinkish_instr07_idec`  | `PINKISH_INSTR07_CHANNELS.idec`  | `idec` (decay, s)              | `0.1`   |
| `pinkish_instr07_islev` | `PINKISH_INSTR07_CHANNELS.islev` | `islev` (sustain level, `0–1`) | `0.7`   |
| `pinkish_instr07_irel`  | `PINKISH_INSTR07_CHANNELS.irel`  | `irel` (release, s)            | `0.5`   |

Trigger the note with a score event (e.g. `engine.sendScoreEvent("i 7 0 3600")`). `kamp` is smoothed through `port` (20ms glide) and can be driven live; the ADSR channels are read once at note start, so changing them affects the next triggered note.

### Adding a new instrument

1. Add `public/src/instruments/<opcode>-instr<NN>.js` exporting a `<NAME>_CHANNELS` map and a `<NAME>_CSD` string, following the pattern in `poscil3-instr01.js`. A family of near-identical instruments can share one file that generates and exports a `<NAME>_CHANNELS`/`<NAME>_CSD` pair per instrument, as in `vco2-square-instr03-06.js`.
2. Name every control channel `<opcode>_instr<NN>_<param>`, matching the opcode's own argument names.
3. Seed default channel values at the top level of the CSD (outside any `instr` block) so the instrument is safe to trigger before any payload arrives.

## License

MIT with attribution — see [LICENSE.md](LICENSE.md). Include the copyright notice in any redistribution, per the license terms.

## Local Development

### Prerequisites

- Node.js 26 or newer
- npm

### Setup

```sh
git clone https://github.com/Nandos0804/csEngine.git
cd csEngine
npm install
npm start
```

Open `http://localhost:3000`. The demo starts Csound with a page-local `AudioContext` (standing in for one an RNBO session would own), compiles every instrument template (`poscil3-instr01`, `vco2-instr02`, the four `vco2-square` voices, and `pinkish-instr07`) into the same running engine, and exposes sliders for each that drive them through `handleMessage()` — the same path a real RNBO integration would use. The square ensemble and pink noise sections hold notes with `i N 0 -1` and release them with `i -N 0 0`, so the ADSR sustain and release stages are audible, and their sliders fan one control out to several instruments' channels in a single payload.

> The browser will require a user interaction, such as clicking a button, before audio can start. This is standard browser audio policy.

### Tests, linting, formatting

```sh
npm test
npm run lint
npm run format -- --check
```

## Project Structure

- [index.js](index.js) — starts the Express server and serves the frontend
- [public/index.html](public/index.html) — demo UI
- [public/main.js](public/main.js) — demo wiring
- [public/src/cswrapper.js](public/src/cswrapper.js) — `CsoundEngine` (the integration API)
- [public/src/instruments/poscil3-instr01.js](public/src/instruments/poscil3-instr01.js) — poscil3 instrument template
- [public/src/instruments/vco2-instr02.js](public/src/instruments/vco2-instr02.js) — filtered vco2 instrument template
- [public/src/instruments/vco2-square-instr03-06.js](public/src/instruments/vco2-square-instr03-06.js) — four-voice square-wave instrument templates
- [public/src/instruments/pinkish-instr07.js](public/src/instruments/pinkish-instr07.js) — pink noise instrument template
- [tests/](tests/) — Jest coverage for the wrapper, instrument templates, and demo wiring

## Contact

Giuseppe Ernandez — [GitHub](https://github.com/Nandos0804)

Project link: [https://github.com/Nandos0804/csEngine](https://github.com/Nandos0804/csEngine)
