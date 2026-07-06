import { Csound } from "@csound/browser/dist/csound.js";

/**
 * One entry in a shared payload's `payload` array. Items whose `op` is not
 * "csound" belong to other subsystems (e.g. RNBO) and are ignored by
 * {@link CsoundEngine#handleMessage}.
 * @typedef {object} CsoundPayloadItem
 * @property {string} op - Must be "csound" for this engine to act on it.
 * @property {string} name - Control channel name, e.g. "poscil3_instr01_kamp".
 * @property {number} data - Value to write to that control channel.
 */

/**
 * The shared JSON message format agreed with the RNBO-side integration.
 * @typedef {object} CsoundPayloadMessage
 * @property {CsoundPayloadItem[]} payload
 */

export class CsoundEngine {
  constructor() {
    /** @type {import("@csound/browser").Csound | null} */
    this._csound = null;
    this._started = false;
    this._created = false;
    // Chain of handleMessage() dispatches. Always resolves (rejections are
    // swallowed here) so it only ever serves as a FIFO turnstile - one
    // message's control channel writes fully land before the next
    // message's writes start, even if handleMessage() is called again
    // (e.g. from a burst of socket messages) before the previous call's
    // WASM round-trips have resolved.
    this._messageQueue = Promise.resolve();
  }

  get isStarted() {
    return this._started;
  }

  /**
   * Create the underlying Csound WASM instance. Must be called from within
   * a user gesture handler (click, keydown, etc.) - browsers block
   * AudioContext creation otherwise.
   * @param {object} [options]
   * @param {AudioContext} [options.audioContext] - Reuse an existing
   *   AudioContext (e.g. one already created by an RNBO session) instead of
   *   letting Csound create its own.
   * @param {boolean} [options.autoConnect] - Whether Csound should connect
   *   itself to the AudioContext's destination. Defaults to Csound's own
   *   default (true); set to false if the host wants to route the output
   *   node manually.
   */
  async start({ audioContext, autoConnect } = {}) {
    if (this._created) return;

    this._csound = await Csound({ audioContext, autoConnect });
    if (!this._csound) {
      throw new Error("Csound() returned nothing - WASM failed to load.");
    }

    this._created = true;
  }

  /**
   * Return the AudioContext Csound is using - either the one passed to
   * start(), or the one Csound created for itself. Useful for handing it to
   * another audio engine (e.g. RNBO) that should share the same context.
   */
  async getAudioContext() {
    this._assertCreated();
    return this._csound.getAudioContext();
  }

  /**
   * Dispatch a shared JSON message: entries with `op: "csound"` are written
   * to the matching Csound control channel via setControlChannel(name, data);
   * every other entry is ignored, since the same payload is shared with
   * other subsystems (e.g. RNBO). A message's items are written one at a
   * time, in payload order (not concurrently) - a payload addressing the
   * same channel twice, or several channels for the same or different
   * instruments, always lands in a predictable order. Calls to
   * handleMessage() are themselves serialized in the order they were made,
   * so a fast-arriving message (e.g. over a WebSocket) can't race a still
   * in-flight one.
   * @param {CsoundPayloadMessage} message
   */
  async handleMessage(message) {
    this._assertStarted();

    const items = Array.isArray(message?.payload)
      ? message.payload.filter(
          (item) =>
            item?.op === "csound" &&
            typeof item.name === "string" &&
            Number.isFinite(item.data),
        )
      : [];

    const applyItems = async () => {
      for (const item of items) {
        await this._csound.setControlChannel(item.name, item.data);
      }
    };

    const turn = this._messageQueue.then(applyItems);
    this._messageQueue = turn.catch(() => {});
    return turn;
  }

  /**
   * Compile a .csd or bare orchestra string. Safe to call multiple times
   * (e.g. to hot-swap instruments later) as long as the engine is created.
   * @param {string} csd
   */
  async compile(csd) {
    this._assertCreated();
    await this._csound.compileCSD(csd, 1);

    if (!this._started) {
      await this._csound.start();
      this._started = true;
    }
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
  async dispose() {
    if (!this._csound) return;
    await this._csound.stop();
    await this._csound.terminateInstance?.();
    this._csound = null;
    this._started = false;
    this._created = false;
    // Drop any still-queued handleMessage() turns from this session so they
    // can't apply stale data to a future session's Csound instance.
    this._messageQueue = Promise.resolve();
  }

  _assertCreated() {
    if (!this._created || !this._csound) {
      throw new Error("CsoundEngine: call start() before using the engine.");
    }
  }

  _assertStarted() {
    if (!this._started || !this._csound) {
      throw new Error("CsoundEngine: call start() before using the engine.");
    }
  }
}
