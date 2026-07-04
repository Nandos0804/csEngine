# Copilot instructions for csEngine

## Repository summary

- This repository is a small JavaScript/Node.js app that serves a browser-based Csound audio wrapper.
- The main entry point is [index.js](../index.js), which starts an Express server and serves the static frontend from [public](../public).
- The core runtime logic lives in [public/src/CSWrapper.js](../public/src/CSWrapper.js), which wraps the Csound WASM browser API.
- Tests are in [tests/CSWrapper.spec.js](../tests/CSWrapper.spec.js) and target the wrapper behavior.

## Project layout and architecture

- Root files:
  - [package.json](../package.json) defines scripts and dependencies.
  - [index.js](../index.js) starts the app.
  - [jest.config.cjs](../jest.config.cjs) configures Jest.
  - [eslint.config.js](../eslint.config.js) configures ESLint.
  - [README.md](../README.md) is currently minimal.
  - [public/index.html](../public/index.html) and [public/main.js](../public/main.js) provide the browser UI bootstrap.
  - [public/src/CSWrapper.js](../public/src/CSWrapper.js) contains the engine wrapper.
  - [tests/CSWrapper.spec.js](../tests/CSWrapper.spec.js) contains Jest coverage.
- The app is ESM-based (`"type": "module"`) and runs in Node.js with Express for static serving.
- The browser-side logic depends on the Csound browser package via `@csound/browser/dist/csound.js`.

## Build, test, and validation workflow

Always use the repository's existing npm scripts rather than inventing new commands.

### 1. Install dependencies

- Run `npm install` before any build or test work.
- This repository already includes [package-lock.json](../package-lock.json), so npm will resolve the pinned dependency tree.

### 2. Run tests

- Use: `npm test`
- Verified result: the suite currently fails in the existing implementation. The current failure output shows 6 failing tests and 9 passing tests.
- Treat test failures as real regressions unless you are intentionally changing the behavior under test.

### 3. Run linting

- Use: `npm run lint`
- Verified result: this command completes successfully.

### 4. Check formatting

- Use: `npm run format -- --check`
- Verified result: this command reports that all matched files use Prettier code style.

### 5. Run the app locally

- Use: `npm start`
- Verified result: the app starts successfully and listens on port 3000.
- The server serves the static frontend from [public](../public) and also exposes `/node_modules` for browser assets.

## Important implementation notes

- Keep changes compatible with the current ESM setup and existing package scripts.
- Prefer minimal, targeted edits in [public/src/CSWrapper.js](../public/src/CSWrapper.js) and corresponding tests in [tests/CSWrapper.spec.js](../tests/CSWrapper.spec.js).
- If you change public-facing runtime behavior, verify it by rerunning tests and, when relevant, starting the app with `npm start`.
- The current test suite expects specific error messages and lifecycle semantics in the wrapper; follow those expectations unless the task explicitly requires a behavior change.

## Validation checklist before finishing

- Run `npm test`
- Run `npm run lint`
- Run `npm run format -- --check`
- If the change affects runtime behavior, also run `npm start` and verify the server boots

## Agent guidance

- Trust these instructions first; only search the codebase further when the provided guidance is incomplete or appears incorrect.
- Avoid introducing new build tooling or workflow changes unless the task explicitly requires it.
