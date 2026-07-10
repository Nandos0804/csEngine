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
      <button id="ensemble-trigger-btn" disabled>Trigger ensemble</button>
      <button id="ensemble-release-btn" disabled>Release ensemble</button>
      <input id="pitch-slider" type="range" min="55" max="880" step="1" value="220" disabled />
      <input id="drift-slider" type="range" min="0" max="50" step="0.5" value="5" disabled />
      <input id="duty-slider" type="range" min="0.05" max="0.95" step="0.01" value="0.5" disabled />
      <button id="pink-trigger-btn" disabled>Trigger noise</button>
      <button id="pink-release-btn" disabled>Release noise</button>
      <input id="pink-amp-slider" type="range" min="0" max="1" step="0.01" value="0.2" disabled />
      <input id="att-slider" type="range" min="0.001" max="2" step="0.001" value="0.05" disabled />
      <input id="dec-slider" type="range" min="0.001" max="2" step="0.001" value="0.1" disabled />
      <input id="sus-slider" type="range" min="0" max="1" step="0.01" value="0.7" disabled />
      <input id="rel-slider" type="range" min="0.001" max="4" step="0.001" value="0.5" disabled />
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
    // 7 CSDs: poscil3-instr01, vco2-instr02, the four square voices, and
    // pinkish-instr07.
    expect(mockEngine.compile).toHaveBeenCalledTimes(7);
    expect(startBtn.disabled).toBe(true);
    expect(toneBtn.disabled).toBe(false);
    expect(stopBtn.disabled).toBe(false);
    expect(ampSlider.disabled).toBe(false);
    expect(freqSlider.disabled).toBe(false);
    expect(tone2Btn.disabled).toBe(false);
    expect(resetFilterBtn.disabled).toBe(false);
    expect(cutoffSlider.disabled).toBe(false);
    expect(resSlider.disabled).toBe(false);
    expect(document.getElementById("ensemble-trigger-btn").disabled).toBe(
      false,
    );
    expect(document.getElementById("pitch-slider").disabled).toBe(false);
    expect(document.getElementById("drift-slider").disabled).toBe(false);
    expect(document.getElementById("duty-slider").disabled).toBe(false);
    expect(document.getElementById("pink-trigger-btn").disabled).toBe(false);
    expect(document.getElementById("pink-amp-slider").disabled).toBe(false);
    expect(document.getElementById("att-slider").disabled).toBe(false);
    expect(document.getElementById("dec-slider").disabled).toBe(false);
    expect(document.getElementById("sus-slider").disabled).toBe(false);
    expect(document.getElementById("rel-slider").disabled).toBe(false);
    // Release buttons additionally require a held note, so starting the
    // engine must not enable them.
    expect(document.getElementById("ensemble-release-btn").disabled).toBe(true);
    expect(document.getElementById("pink-release-btn").disabled).toBe(true);
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
    expect(document.getElementById("ensemble-trigger-btn").disabled).toBe(true);
    expect(document.getElementById("ensemble-release-btn").disabled).toBe(true);
    expect(document.getElementById("pitch-slider").disabled).toBe(true);
    expect(document.getElementById("drift-slider").disabled).toBe(true);
    expect(document.getElementById("duty-slider").disabled).toBe(true);
    expect(document.getElementById("pink-trigger-btn").disabled).toBe(true);
    expect(document.getElementById("pink-release-btn").disabled).toBe(true);
    expect(document.getElementById("pink-amp-slider").disabled).toBe(true);
    expect(document.getElementById("att-slider").disabled).toBe(true);
    expect(document.getElementById("dec-slider").disabled).toBe(true);
    expect(document.getElementById("sus-slider").disabled).toBe(true);
    expect(document.getElementById("rel-slider").disabled).toBe(true);
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

  it("should hold all four square voices and flip trigger/release when the ensemble is triggered", async () => {
    const startBtn = document.getElementById("start-btn");
    const triggerBtn = document.getElementById("ensemble-trigger-btn");
    const releaseBtn = document.getElementById("ensemble-release-btn");
    const status = document.getElementById("status");

    startBtn.click();
    await flushPromises();

    triggerBtn.click();
    await flushPromises();

    expect(mockEngine.sendScoreEvent.mock.calls).toEqual([
      ["i 3 0 -1"],
      ["i 4 0 -1"],
      ["i 5 0 -1"],
      ["i 6 0 -1"],
    ]);
    expect(triggerBtn.disabled).toBe(true);
    expect(releaseBtn.disabled).toBe(false);
    expect(status.textContent).toBe(
      "Triggered square ensemble (instruments 3-6).",
    );
  });

  it("should turn off all four square voices and flip trigger/release when the ensemble is released", async () => {
    const startBtn = document.getElementById("start-btn");
    const triggerBtn = document.getElementById("ensemble-trigger-btn");
    const releaseBtn = document.getElementById("ensemble-release-btn");
    const status = document.getElementById("status");

    startBtn.click();
    await flushPromises();

    triggerBtn.click();
    await flushPromises();
    mockEngine.sendScoreEvent.mockClear();

    releaseBtn.click();
    await flushPromises();

    expect(mockEngine.sendScoreEvent.mock.calls).toEqual([
      ["i -3 0 0"],
      ["i -4 0 0"],
      ["i -5 0 0"],
      ["i -6 0 0"],
    ]);
    expect(triggerBtn.disabled).toBe(false);
    expect(releaseBtn.disabled).toBe(true);
    expect(status.textContent).toBe("Released square ensemble.");
  });

  it("should keep the trigger/release buttons unchanged if an ensemble trigger event fails", async () => {
    mockEngine.sendScoreEvent.mockRejectedValue(new Error("ensemble failed"));

    const startBtn = document.getElementById("start-btn");
    const triggerBtn = document.getElementById("ensemble-trigger-btn");
    const releaseBtn = document.getElementById("ensemble-release-btn");
    const status = document.getElementById("status");

    startBtn.click();
    await flushPromises();

    triggerBtn.click();
    await flushPromises();

    expect(status.textContent).toBe("Failed to send event: ensemble failed");
    expect(triggerBtn.disabled).toBe(false);
    expect(releaseBtn.disabled).toBe(true);
  });

  it("should transpose all four square voices in their 4:5:6:8 spread when the pitch slider moves", async () => {
    const startBtn = document.getElementById("start-btn");
    const pitchSlider = document.getElementById("pitch-slider");

    startBtn.click();
    await flushPromises();

    pitchSlider.value = "440";
    pitchSlider.dispatchEvent(new Event("input"));
    await flushPromises();

    expect(mockEngine.handleMessage).toHaveBeenCalledWith({
      payload: [
        { op: "csound", name: "vco2_instr03_kcps", data: 440 },
        { op: "csound", name: "vco2_instr04_kcps", data: 550 },
        { op: "csound", name: "vco2_instr05_kcps", data: 660 },
        { op: "csound", name: "vco2_instr06_kcps", data: 880 },
      ],
    });
  });

  it("should dispatch the drift range to all four square voices when the drift slider moves", async () => {
    const startBtn = document.getElementById("start-btn");
    const driftSlider = document.getElementById("drift-slider");

    startBtn.click();
    await flushPromises();

    driftSlider.value = "12";
    driftSlider.dispatchEvent(new Event("input"));
    await flushPromises();

    expect(mockEngine.handleMessage).toHaveBeenCalledWith({
      payload: [
        { op: "csound", name: "vco2_instr03_krand", data: 12 },
        { op: "csound", name: "vco2_instr04_krand", data: 12 },
        { op: "csound", name: "vco2_instr05_krand", data: 12 },
        { op: "csound", name: "vco2_instr06_krand", data: 12 },
      ],
    });
  });

  it("should dispatch the duty cycle to all four square voices when the duty slider moves", async () => {
    const startBtn = document.getElementById("start-btn");
    const dutySlider = document.getElementById("duty-slider");

    startBtn.click();
    await flushPromises();

    dutySlider.value = "0.25";
    dutySlider.dispatchEvent(new Event("input"));
    await flushPromises();

    expect(mockEngine.handleMessage).toHaveBeenCalledWith({
      payload: [
        { op: "csound", name: "vco2_instr03_kpw", data: 0.25 },
        { op: "csound", name: "vco2_instr04_kpw", data: 0.25 },
        { op: "csound", name: "vco2_instr05_kpw", data: 0.25 },
        { op: "csound", name: "vco2_instr06_kpw", data: 0.25 },
      ],
    });
  });

  it("should hold and release the pink noise note through the pink buttons", async () => {
    const startBtn = document.getElementById("start-btn");
    const triggerBtn = document.getElementById("pink-trigger-btn");
    const releaseBtn = document.getElementById("pink-release-btn");
    const status = document.getElementById("status");

    startBtn.click();
    await flushPromises();

    triggerBtn.click();
    await flushPromises();

    expect(mockEngine.sendScoreEvent).toHaveBeenCalledWith("i 7 0 -1");
    expect(triggerBtn.disabled).toBe(true);
    expect(releaseBtn.disabled).toBe(false);
    expect(status.textContent).toBe("Triggered pink noise (instrument 7).");

    releaseBtn.click();
    await flushPromises();

    expect(mockEngine.sendScoreEvent).toHaveBeenCalledWith("i -7 0 0");
    expect(triggerBtn.disabled).toBe(false);
    expect(releaseBtn.disabled).toBe(true);
    expect(status.textContent).toBe("Released pink noise.");
  });

  it("should dispatch a pink amp payload when the pink amp slider moves", async () => {
    const startBtn = document.getElementById("start-btn");
    const pinkAmpSlider = document.getElementById("pink-amp-slider");

    startBtn.click();
    await flushPromises();

    pinkAmpSlider.value = "0.5";
    pinkAmpSlider.dispatchEvent(new Event("input"));
    await flushPromises();

    expect(mockEngine.handleMessage).toHaveBeenCalledWith({
      payload: [{ op: "csound", name: "pinkish_instr07_kamp", data: 0.5 }],
    });
  });

  it.each([
    ["att-slider", "iatt", "0.2"],
    ["dec-slider", "idec", "0.3"],
    ["sus-slider", "islev", "0.5"],
    ["rel-slider", "irel", "1.5"],
  ])(
    "should dispatch %s to the ADSR channel of all five instruments in one payload",
    async (sliderId, param, value) => {
      const startBtn = document.getElementById("start-btn");
      const slider = document.getElementById(sliderId);

      startBtn.click();
      await flushPromises();

      slider.value = value;
      slider.dispatchEvent(new Event("input"));
      await flushPromises();

      expect(mockEngine.handleMessage).toHaveBeenCalledWith({
        payload: [
          { op: "csound", name: `vco2_instr03_${param}`, data: Number(value) },
          { op: "csound", name: `vco2_instr04_${param}`, data: Number(value) },
          { op: "csound", name: `vco2_instr05_${param}`, data: Number(value) },
          { op: "csound", name: `vco2_instr06_${param}`, data: Number(value) },
          {
            op: "csound",
            name: `pinkish_instr07_${param}`,
            data: Number(value),
          },
        ],
      });
    },
  );

  it("should show an error if an ensemble slider payload fails to send", async () => {
    mockEngine.handleMessage.mockRejectedValue(new Error("payload failed"));

    const startBtn = document.getElementById("start-btn");
    const pitchSlider = document.getElementById("pitch-slider");
    const status = document.getElementById("status");

    startBtn.click();
    await flushPromises();

    pitchSlider.dispatchEvent(new Event("input"));
    await flushPromises();

    expect(status.textContent).toBe("Failed to send payload: payload failed");
  });
});
