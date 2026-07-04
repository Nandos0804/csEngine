# csEngine

A lightweight browser-based Csound wrapper designed as a practical alternative to RNBO-style audio workflows.

## About The Project

csEngine is a small Node.js and Express application that serves a simple browser demo and exposes a reusable wrapper around the Csound WebAssembly API. The core goal is to provide a minimal, testable foundation for running Csound in the browser with a lifecycle that is easy to reason about:

- create the engine
- compile CSD content
- send score events
- pause, resume, or dispose cleanly

This branch focuses on the wrapper implementation and the browser-based demo experience.

### Key Features

- Browser-friendly Csound startup through a user gesture
- Lifecycle management for creation, compilation, and disposal
- Support for sending score events such as instrument triggers
- Jest coverage for the wrapper behavior

### Built With

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Csound via @csound/browser](https://csound.com/)
- [Jest](https://jestjs.io/)
- [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/)

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js 26 or newer
- npm

### Installation

1. Clone the repository

   ```sh
   git clone https://github.com/Nandos0804/csEngine.git
   cd csEngine
   ```

2. Install dependencies

   ```sh
   npm install
   ```

3. Start the local server

   ```sh
   npm start
   ```

4. Open your browser to

   ```text
   http://localhost:3000
   ```

> The browser will require a user interaction, such as clicking a button, before audio can start. This is standard browser audio policy.

### Running Tests

```sh
npm test
```

### Linting and Formatting

```sh
npm run lint
npm run format -- --check
```

## Usage

The demo UI in the browser lets you:

1. Start the Csound engine
2. Compile a CSD snippet
3. Trigger a simple test tone
4. Stop and dispose the engine when finished

A typical runtime flow looks like this:

```js
import { CsoundEngine } from "./src/CSWrapper.js";

const engine = new CsoundEngine();
await engine.start();
await engine.compile("<csd>...</csd>");
await engine.sendScoreEvent("i 1 0 1");
```

## Project Structure

- [index.js](index.js) — starts the Express server and serves the frontend
- [public/index.html](public/index.html) — basic browser UI
- [public/main.js](public/main.js) — demo interaction logic
- [public/src/CSWrapper.js](public/src/CSWrapper.js) — Csound wrapper implementation
- [tests/CSWrapper.spec.js](tests/CSWrapper.spec.js) — Jest tests for the wrapper

## License

This project is licensed under the MIT License. See [LICENSE.md](LICENSE.md) for details.

## Contact

Giuseppe Ernandez — [GitHub](https://github.com/Nandos0804)

Project link: [https://github.com/Nandos0804/csEngine](https://github.com/Nandos0804/csEngine)
