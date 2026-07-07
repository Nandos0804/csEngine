import { jest } from "@jest/globals";

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("main.js UI wiring", () => {
  let mockEngine;
  let CsoundEngineMock;

  beforeEach(async () => {
    jest.resetModules();
    document.body.innerHTML = `
      <button id="start-btn">Start Csound engine</button>
      <button id="tone-btn" disabled>Trigger note</button>
      <button id="stop-btn" disabled>Stop Csound engine</button>
      <input id="amp-slider" type="range" min="0" max="1" step="0.01" value="0.3" disabled />
      <input id="freq-slider" type="range" min="55" max="1760" step="1" value="440" disabled />
      <button id="tone2-btn" disabled>Trigger note</button>
      <button id="reset-filter-btn" disabled>Reset filter</button>
      <input id="cutoff-slider" type="range" min="200" max="8000" step="1" value="2000" disabled />
      <input id="res-slider" type="range" min="0" max="1" step="0.01" value="0.3" disabled />
      <div id="status"></div>
    `;

    global.AudioContext = jest.fn().mockImplementation(() => ({
      close: jest.fn().mockResolvedValue(undefined),
    }));

    mockEngine = {
      start: jest.fn().mockResolvedValue(undefined),
      compile: jest.fn().mockResolvedValue(undefined),
      sendScoreEvent: jest.fn().mockResolvedValue(undefined),
      handleMessage: jest.fn().mockResolvedValue(undefined),
      dispose: jest.fn().mockResolvedValue(undefined),
      onMessage: jest.fn(),
    };

    CsoundEngineMock = jest.fn().mockImplementation(() => mockEngine);

    jest.unstable_mockModule("../public/src/cswrapper.js", () => ({
      CsoundEngine: CsoundEngineMock,
    }));

    await import("../public/main.js");
  });

  afterEach(() => {
    delete global.AudioContext;
  });

  it("should start the engine with a shared AudioContext and enable controls", async () => {
    const startBtn = document.getElementById("start-btn");
    const toneBtn = document.getElementById("tone-btn");
    const stopBtn = document.getElementById("stop-btn");
    const ampSlider = document.getElementById("amp-slider");
    const freqSlider = document.getElementById("freq-slider");
    const tone2Btn = document.getElementById("tone2-btn");
    const resetFilterBtn = document.getElementById("reset-filter-btn");
    const cutoffSlider = document.getElementById("cutoff-slider");
    const resSlider = document.getElementById("res-slider");
    const status = document.getElementById("status");

    expect(toneBtn.disabled).toBe(true);
    expect(stopBtn.disabled).toBe(true);

    startBtn.click();
    await flushPromises();

    expect(CsoundEngineMock).toHaveBeenCalledTimes(1);
    expect(global.AudioContext).toHaveBeenCalledTimes(1);
    expect(mockEngine.start).toHaveBeenCalledWith({
      audioContext: expect.any(Object),
    });
    expect(mockEngine.compile).toHaveBeenCalledTimes(2);
    expect(startBtn.disabled).toBe(true);
    expect(toneBtn.disabled).toBe(false);
    expect(stopBtn.disabled).toBe(false);
    expect(ampSlider.disabled).toBe(false);
    expect(freqSlider.disabled).toBe(false);
    expect(tone2Btn.disabled).toBe(false);
    expect(resetFilterBtn.disabled).toBe(false);
    expect(cutoffSlider.disabled).toBe(false);
    expect(resSlider.disabled).toBe(false);
    expect(status.textContent).toContain("Engine running");
  });

  it("should forward Csound messages to the console", async () => {
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

    const startBtn = document.getElementById("start-btn");
    startBtn.click();
    await flushPromises();

    expect(mockEngine.onMessage).toHaveBeenCalledTimes(1);
    const forward = mockEngine.onMessage.mock.calls[0][0];
    forward("buffer underrun");

    expect(consoleLogSpy).toHaveBeenCalledWith("[csound]", "buffer underrun");

    consoleLogSpy.mockRestore();
  });

  it("should fall back to webkitAudioContext when AudioContext is unavailable", async () => {
    delete global.AudioContext;
    global.webkitAudioContext = jest.fn().mockImplementation(() => ({
      close: jest.fn().mockResolvedValue(undefined),
    }));

    const startBtn = document.getElementById("start-btn");

    startBtn.click();
    await flushPromises();

    expect(global.webkitAudioContext).toHaveBeenCalledTimes(1);
    expect(mockEngine.start).toHaveBeenCalledWith({
      audioContext: expect.any(Object),
    });

    delete global.webkitAudioContext;
  });

  it("should send a trigger note event when the tone button is clicked", async () => {
    const startBtn = document.getElementById("start-btn");
    const toneBtn = document.getElementById("tone-btn");
    const status = document.getElementById("status");

    startBtn.click();
    await flushPromises();

    toneBtn.click();
    await flushPromises();

    expect(mockEngine.sendScoreEvent).toHaveBeenCalledWith("i 1 0 3600");
    expect(status.textContent).toBe("Sent trigger note event.");
  });

  it("should dispatch an amp payload when the amp slider moves", async () => {
    const startBtn = document.getElementById("start-btn");
    const ampSlider = document.getElementById("amp-slider");

    startBtn.click();
    await flushPromises();

    ampSlider.value = "0.7";
    ampSlider.dispatchEvent(new Event("input"));
    await flushPromises();

    expect(mockEngine.handleMessage).toHaveBeenCalledWith({
      payload: [{ op: "csound", name: "poscil3_instr01_kamp", data: 0.7 }],
    });
  });

  it("should dispatch a freq payload when the freq slider moves", async () => {
    const startBtn = document.getElementById("start-btn");
    const freqSlider = document.getElementById("freq-slider");

    startBtn.click();
    await flushPromises();

    freqSlider.value = "220";
    freqSlider.dispatchEvent(new Event("input"));
    await flushPromises();

    expect(mockEngine.handleMessage).toHaveBeenCalledWith({
      payload: [{ op: "csound", name: "poscil3_instr01_kcps", data: 220 }],
    });
  });

  it("should send a trigger note event for instrument 2 when tone2 button is clicked", async () => {
    const startBtn = document.getElementById("start-btn");
    const tone2Btn = document.getElementById("tone2-btn");
    const status = document.getElementById("status");

    startBtn.click();
    await flushPromises();

    tone2Btn.click();
    await flushPromises();

    expect(mockEngine.sendScoreEvent).toHaveBeenCalledWith("i 2 0 3600");
    expect(status.textContent).toBe("Sent trigger note event.");
  });

  it("should dispatch a cutoff payload when the cutoff slider moves", async () => {
    const startBtn = document.getElementById("start-btn");
    const cutoffSlider = document.getElementById("cutoff-slider");

    startBtn.click();
    await flushPromises();

    cutoffSlider.value = "3500";
    cutoffSlider.dispatchEvent(new Event("input"));
    await flushPromises();

    expect(mockEngine.handleMessage).toHaveBeenCalledWith({
      payload: [{ op: "csound", name: "vco2_instr02_kcutoff", data: 3500 }],
    });
  });

  it("should dispatch a res payload when the res slider moves", async () => {
    const startBtn = document.getElementById("start-btn");
    const resSlider = document.getElementById("res-slider");

    startBtn.click();
    await flushPromises();

    resSlider.value = "0.6";
    resSlider.dispatchEvent(new Event("input"));
    await flushPromises();

    expect(mockEngine.handleMessage).toHaveBeenCalledWith({
      payload: [{ op: "csound", name: "vco2_instr02_kres", data: 0.6 }],
    });
  });

  it("should dispatch both filter channels in one payload when reset filter is clicked", async () => {
    const startBtn = document.getElementById("start-btn");
    const resetFilterBtn = document.getElementById("reset-filter-btn");
    const cutoffSlider = document.getElementById("cutoff-slider");
    const resSlider = document.getElementById("res-slider");
    const status = document.getElementById("status");

    startBtn.click();
    await flushPromises();

    cutoffSlider.value = "7000";
    resSlider.value = "0.9";

    resetFilterBtn.click();
    await flushPromises();

    expect(mockEngine.handleMessage).toHaveBeenCalledWith({
      payload: [
        { op: "csound", name: "vco2_instr02_kcutoff", data: 2000 },
        { op: "csound", name: "vco2_instr02_kres", data: 0.3 },
      ],
    });
    expect(cutoffSlider.value).toBe("2000");
    expect(resSlider.value).toBe("0.3");
    expect(status.textContent).toBe("Reset filter to defaults.");
  });

  it("should stop the engine and reset controls", async () => {
    const startBtn = document.getElementById("start-btn");
    const toneBtn = document.getElementById("tone-btn");
    const stopBtn = document.getElementById("stop-btn");
    const ampSlider = document.getElementById("amp-slider");
    const freqSlider = document.getElementById("freq-slider");
    const tone2Btn = document.getElementById("tone2-btn");
    const resetFilterBtn = document.getElementById("reset-filter-btn");
    const cutoffSlider = document.getElementById("cutoff-slider");
    const resSlider = document.getElementById("res-slider");

    startBtn.click();
    await flushPromises();

    const createdContext = global.AudioContext.mock.results[0].value;

    stopBtn.click();
    await flushPromises();

    expect(mockEngine.dispose).toHaveBeenCalledTimes(1);
    expect(createdContext.close).toHaveBeenCalledTimes(1);
    expect(toneBtn.disabled).toBe(true);
    expect(ampSlider.disabled).toBe(true);
    expect(freqSlider.disabled).toBe(true);
    expect(tone2Btn.disabled).toBe(true);
    expect(resetFilterBtn.disabled).toBe(true);
    expect(cutoffSlider.disabled).toBe(true);
    expect(resSlider.disabled).toBe(true);
    expect(startBtn.disabled).toBe(false);
  });

  it("should show an error and close the AudioContext if engine start fails", async () => {
    mockEngine.start.mockRejectedValue(new Error("start failed"));

    const startBtn = document.getElementById("start-btn");
    const toneBtn = document.getElementById("tone-btn");
    const stopBtn = document.getElementById("stop-btn");
    const status = document.getElementById("status");

    startBtn.click();
    await flushPromises();

    const createdContext = global.AudioContext.mock.results[0].value;

    expect(mockEngine.start).toHaveBeenCalledTimes(1);
    expect(status.textContent).toBe("Failed to start: start failed");
    expect(startBtn.disabled).toBe(false);
    expect(toneBtn.disabled).toBe(true);
    expect(stopBtn.disabled).toBe(true);
    expect(createdContext.close).toHaveBeenCalledTimes(1);
  });

  it("should show an error without closing an AudioContext if construction itself throws", async () => {
    global.AudioContext = jest.fn().mockImplementation(() => {
      throw new Error("no more contexts allowed");
    });

    const startBtn = document.getElementById("start-btn");
    const status = document.getElementById("status");

    startBtn.click();
    await flushPromises();

    expect(mockEngine.start).not.toHaveBeenCalled();
    expect(status.textContent).toBe(
      "Failed to start: no more contexts allowed",
    );
    expect(startBtn.disabled).toBe(false);
  });

  it("should show an error if engine stop fails", async () => {
    mockEngine.dispose.mockRejectedValue(new Error("stop failed"));

    const startBtn = document.getElementById("start-btn");
    const stopBtn = document.getElementById("stop-btn");
    const status = document.getElementById("status");

    startBtn.click();
    await flushPromises();

    stopBtn.click();
    await flushPromises();

    expect(mockEngine.dispose).toHaveBeenCalledTimes(1);
    expect(status.textContent).toBe("Failed to stop: stop failed");
    expect(stopBtn.disabled).toBe(false);
  });

  it("should show an error if the amp payload fails to send", async () => {
    mockEngine.handleMessage.mockRejectedValue(new Error("payload failed"));

    const startBtn = document.getElementById("start-btn");
    const ampSlider = document.getElementById("amp-slider");
    const status = document.getElementById("status");

    startBtn.click();
    await flushPromises();

    ampSlider.dispatchEvent(new Event("input"));
    await flushPromises();

    expect(status.textContent).toBe("Failed to send payload: payload failed");
  });

  it("should show an error if the freq payload fails to send", async () => {
    mockEngine.handleMessage.mockRejectedValue(new Error("payload failed"));

    const startBtn = document.getElementById("start-btn");
    const freqSlider = document.getElementById("freq-slider");
    const status = document.getElementById("status");

    startBtn.click();
    await flushPromises();

    freqSlider.dispatchEvent(new Event("input"));
    await flushPromises();

    expect(status.textContent).toBe("Failed to send payload: payload failed");
  });

  it("should show an error if tone event send fails", async () => {
    mockEngine.sendScoreEvent.mockRejectedValue(new Error("tone failed"));

    const startBtn = document.getElementById("start-btn");
    const toneBtn = document.getElementById("tone-btn");
    const status = document.getElementById("status");

    startBtn.click();
    await flushPromises();

    toneBtn.click();
    await flushPromises();

    expect(mockEngine.sendScoreEvent).toHaveBeenCalledTimes(1);
    expect(status.textContent).toBe("Failed to send event: tone failed");
  });

  it("should show an error if the instrument 2 tone event send fails", async () => {
    mockEngine.sendScoreEvent.mockRejectedValue(new Error("tone2 failed"));

    const startBtn = document.getElementById("start-btn");
    const tone2Btn = document.getElementById("tone2-btn");
    const status = document.getElementById("status");

    startBtn.click();
    await flushPromises();

    tone2Btn.click();
    await flushPromises();

    expect(mockEngine.sendScoreEvent).toHaveBeenCalledTimes(1);
    expect(status.textContent).toBe("Failed to send event: tone2 failed");
  });

  it("should show an error if the cutoff payload fails to send", async () => {
    mockEngine.handleMessage.mockRejectedValue(new Error("payload failed"));

    const startBtn = document.getElementById("start-btn");
    const cutoffSlider = document.getElementById("cutoff-slider");
    const status = document.getElementById("status");

    startBtn.click();
    await flushPromises();

    cutoffSlider.dispatchEvent(new Event("input"));
    await flushPromises();

    expect(status.textContent).toBe("Failed to send payload: payload failed");
  });

  it("should show an error if the res payload fails to send", async () => {
    mockEngine.handleMessage.mockRejectedValue(new Error("payload failed"));

    const startBtn = document.getElementById("start-btn");
    const resSlider = document.getElementById("res-slider");
    const status = document.getElementById("status");

    startBtn.click();
    await flushPromises();

    resSlider.dispatchEvent(new Event("input"));
    await flushPromises();

    expect(status.textContent).toBe("Failed to send payload: payload failed");
  });

  it("should show an error if the reset filter payload fails to send", async () => {
    mockEngine.handleMessage.mockRejectedValue(new Error("payload failed"));

    const startBtn = document.getElementById("start-btn");
    const resetFilterBtn = document.getElementById("reset-filter-btn");
    const status = document.getElementById("status");

    startBtn.click();
    await flushPromises();

    resetFilterBtn.click();
    await flushPromises();

    expect(status.textContent).toBe("Failed to send payload: payload failed");
  });
});
