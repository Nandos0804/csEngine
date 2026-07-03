import { Csound } from "@csound/browser";

export class CsoundEngine {
  constructor() {
    /** @type {import("@csound/browser").Csound | null} */
    this._csound = null;
    this._started = false;
  }

  get isStarted() {
    return this._started;
  }

  /**
   * Create the underlying Csound WASM instance. Must be called from within
   * a user gesture handler (click, keydown, etc.) - browsers block
   * AudioContext creation otherwise.
   */
  async start() {
    if (this._started) return;

    this._csound = await Csound();
    if (!this._csound) {
      throw new Error("Csound() returned nothing - WASM failed to load.");
    }

    await this._csound.start();
    this._started = true;
  }

  /**
   * Compile a .csd or bare orchestra string. Safe to call multiple times
   * (e.g. to hot-swap instruments later) as long as the engine is started.
   * @param {string} csd
   */
  async compile(csd) {
    this._assertStarted();
    await this._csound.compileCsdText(csd);
  }

  /**
   * Send a single score line / event, e.g. "i 1 0 2 60 0.5".
   * This is the method a future WebSocket handler will call once we have
   * the message schema - one JSON message in, one (or more) score events
   * out.
   * @param {string} scoreLine
   */
  async sendScoreEvent(scoreLine) {
    this._assertStarted();
    await this._csound.readScore(scoreLine);
  }

  /** Pause audio without destroying the engine. */
  async pause() {
    if (!this._started) return;
    await this._csound.pause();
  }

  async resume() {
    if (!this._started) return;
    await this._csound.resume();
  }

  /**
   * Fully stop and release the engine, including its AudioContext.
   * Call this if the page needs to hand audio resources back, e.g. when
   * switching to another audio app sharing the same tab/device.
   */
  async dispose() {if (!this._csound) return;
await this._csound.stop();
await this._csound.terminateInstance?.();
this._csound = null;
this._started = false;
  }

  _assertStarted() {
    if (!this._started || !this._csound) {
      throw new Error("CsoundEngine: call start() before using the engine.");
    }
  }
}
