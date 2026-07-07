# AGENTS.md

## Quick Commands

Always run these in order before committing:

```bash
npm install        # Install dependencies (must run first)
npm test           # Run full test suite (must pass before commit)
npm run lint       # Check code quality
npm run format -- --check  # Verify Prettier formatting
npm start          # Start dev server on port 3000 (verify it boots)
```

## Project Overview

csEngine is a JavaScript/Node.js application that serves a browser-based Csound audio wrapper designed to run side-by-side with an RNBO session, sharing one `AudioContext`. It combines:

- An Express server ([index.js](index.js)) that serves static frontend files
- A Csound WASM wrapper ([public/src/cswrapper.js](public/src/cswrapper.js)) that manages the core audio runtime and dispatches the shared JSON payload
- Instrument templates ([public/src/instruments/](public/src/instruments/)), starting with `poscil3-instr01`
- Browser UI bootstrap ([public/index.html](public/index.html), [public/main.js](public/main.js))
- Comprehensive test coverage ([tests/](tests/))

**Tech Stack:** JavaScript ES Modules (ESM), Express.js, Jest, ESLint, Prettier, Csound WASM API

**Current Test Baseline:** all tests passing, 100% coverage enforced via `jest.config.cjs` (`coverageThreshold.global` = 100% for branches/functions/lines/statements). Any drop below 100% coverage or any new test failure is a real regression.

**Public API (README.md is the canonical integration/API doc — keep it in sync with this file):**

- `CsoundEngine.start({ audioContext, autoConnect })` – optional options to share an existing AudioContext (e.g. RNBO's) instead of creating a new one
- `CsoundEngine.getAudioContext()` – returns the AudioContext Csound is using
- `CsoundEngine.handleMessage(message)` – dispatches `{ payload: [{ op: "csound", name, data }] }` entries to Csound control channels via `setControlChannel`
- `CsoundEngine.onMessage(callback)` – subscribes to Csound's own log messages (compiler diagnostics, buffer-underrun warnings, etc.); returns an unsubscribe function
- `CsoundEngine.compile()`, `sendScoreEvent()`, `pause()`, `resume()`, `dispose()` – unchanged from prior versions

## Project Knowledge

**File Structure:**

- `index.js` – Express server entry point, serves static frontend from `public/`
- `public/src/cswrapper.js` – Core Csound WASM wrapper (main implementation)
- `public/src/instruments/` – Instrument templates (CSD string + control channel constants per instrument), e.g. `poscil3-instr01.js`
- `tests/CSWrapper.spec.js` – Jest test suite for wrapper behavior
- `tests/instruments/` – Jest test suite for instrument templates
- `public/main.js` – Browser-side initialization / demo wiring
- `package.json` – Dependencies and npm scripts

**Static Assets:**

- The Express server serves the `public/` directory and exposes `/node_modules` for browser assets
- Csound WASM is loaded via `@csound/browser/dist/csound.js`

**Architecture:**

- CsoundEngine class wraps the Csound WASM API
- Lifecycle: create instance → call start() → compile .csd → send score events → dispose
- All public methods are async
- Private state tracked with underscore-prefixed properties

## Code Style & Standards

Follow these rules for all code you write:

**Naming conventions:**

- Private properties: underscore prefix (`_csound`, `_started`)
- Public methods: camelCase (`compile()`, `sendScoreEvent()`)
- Constants: UPPER_SNAKE_CASE (e.g., in config files)
- JSDoc types for all public methods

**Code style example (Good - descriptive names, error handling, async/await):**

```javascript
/**
 * Create the underlying Csound WASM instance. Must be called from a user gesture.
 */
async start() {
  if (this._created) return;

  this._csound = await Csound();
  if (!this._csound) {
    throw new Error("Csound() returned nothing - WASM failed to load.");
  }

  this._created = true;
}

/**
 * Send a single score line / event.
 * @param {string} scoreLine
 */
async sendScoreEvent(scoreLine) {
  this._assertStarted();
  await this._csound.readScore(scoreLine);
}
```

**Testing style (Good - clear setup, mocking dependencies, specific error messages):**

```javascript
describe("CsoundEngine", () => {
  let engine;
  let mockCsoundInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCsoundInstance = {
      start: jest.fn().mockResolvedValue(undefined),
      compileCSD: jest.fn().mockResolvedValue(undefined),
    };
    Csound.mockResolvedValue(mockCsoundInstance);
    engine = new CsoundEngine();
  });

  it("should throw an error if Csound() returns null", async () => {
    Csound.mockResolvedValue(null);
    await expect(engine.start()).rejects.toThrow(
      "Csound() returned nothing - WASM failed to load.",
    );
  });
});
```

## Testing Instructions

**Run the full test suite:**

```bash
npm test
```

Expected result: all tests passing, 100% coverage (branches/functions/lines/statements, enforced by `jest.config.cjs`). New test failures or any coverage drop are real regressions unless you intentionally change behavior.

**Understand test expectations:**

- Tests validate core wrapper lifecycle: initialization (with/without a shared AudioContext), compilation, score events, payload dispatch via `handleMessage()`, pause/resume, disposal
- Tests enforce specific error messages: e.g., "Csound() returned nothing - WASM failed to load."
- Tests use Jest mocks to isolate CsoundEngine from actual WASM API
- Look at test patterns in [tests/CSWrapper.spec.js](tests/CSWrapper.spec.js), [tests/instruments/](tests/instruments/), and [tests/Main.spec.js](tests/Main.spec.js) when adding tests

**After any change to [public/src/cswrapper.js](public/src/cswrapper.js):**

1. Run `npm test` — ensure no new failures
2. Run `npm run lint` — check for style violations
3. Run `npm run format -- --check` — verify Prettier compliance
4. Fix any issues before considering the change complete

**Do NOT:**

- Modify error message strings used by tests without updating tests
- Remove or skip failing tests
- Run only a subset of tests and claim success

## Build & Validation Workflow

Always follow this workflow before finishing any task:

1. Run `npm test` — ensure no regressions
2. Run `npm run lint` — validate code quality
3. Run `npm run format -- --check` — verify Prettier compliance
4. If changes affect runtime behavior, run `npm start` and verify the server boots on port 3000

## Boundaries

Agents must follow these rules strictly:

**Always do:**

- Write to `public/src/cswrapper.js`, `public/src/instruments/`, `public/main.js`, `public/index.html`, their matching tests, and `README.md` (the canonical API/integration doc) as needed
- Run `npm test` before considering work complete
- Run `npm run lint` and `npm run format -- --check` after changes
- Include JSDoc comments for all public methods and parameters
- Write specific error messages that help developers debug issues
- Include test cases for error conditions and edge cases
- Use async/await consistently; never mix with `.then()` chains
- Preserve all existing error message strings (tests depend on them)
- Keep `README.md` in sync with the actual public API — it's read by other integrators (and LLMs) as the sole API doc, not just this file

**Ask first:**

- Adding new dependencies or changing versions in package.json
- Modifying the Express server configuration in index.js
- Changing test framework, linter, or formatter settings
- Adding new public methods to `CsoundEngine` beyond the existing `start()`, `getAudioContext()`, `handleMessage()`, `onMessage()`, `compile()`, `sendScoreEvent()`, `pause()`, `resume()`, `dispose()`
- Changing the `<opcode>_instr<NN>_<param>` control channel naming convention or the shared payload schema (`{ payload: [{ op, name, data }] }`) — it's agreed with the RNBO-side integrator

**Never do:**

- Modify `node_modules/` or vendor files
- Commit secrets, API keys, or sensitive credentials
- Change package.json scripts without explicit approval
- Remove failing tests without fixing the underlying issue
- Break existing public API or change method signatures without coordination
- Import or use CommonJS modules (ESM only)
- Add console.log or debug code that gets committed
- Ignore or suppress linting/formatting errors

## Key Dependencies

- **Express**: HTTP server framework
- **@csound/browser**: Csound WASM browser API
- **Jest**: Testing framework
- **ESLint**: Code linting
- **Prettier**: Code formatting

## Agent Guidance

When working on this project:

1. Consult [copilot-instructions.md](.github/copilot-instructions.md) for additional context
2. Trust the existing instructions first; only search further if guidance is incomplete
3. Always validate changes with the full workflow (test, lint, format, start)
4. Preserve the current test suite semantics unless changes are explicitly required
5. Treat the current test baseline (all passing, 100% coverage) as known state
