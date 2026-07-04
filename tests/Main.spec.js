import { jest } from "@jest/globals";

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("main.js UI wiring", () => {
  let mockEngine;
  let CsoundEngineMock;

  beforeEach(async () => {
    jest.resetModules();
    document.body.innerHTML = `
      <button id="start-btn">Start Csound engine</button>
      <button id="tone-btn" disabled>Play test tone</button>
      <button id="stop-btn" disabled>Stop Csound engine</button>
      <div id="status"></div>
    `;

    mockEngine = {
      start: jest.fn().mockResolvedValue(undefined),
      compile: jest.fn().mockResolvedValue(undefined),
      sendScoreEvent: jest.fn().mockResolvedValue(undefined),
      dispose: jest.fn().mockResolvedValue(undefined),
    };

    CsoundEngineMock = jest.fn().mockImplementation(() => mockEngine);

    jest.unstable_mockModule("../public/src/cswrapper.js", () => ({
      CsoundEngine: CsoundEngineMock,
    }));

    await import("../public/main.js");
  });

  it("should start the engine and enable controls", async () => {
    const startBtn = document.getElementById("start-btn");
    const toneBtn = document.getElementById("tone-btn");
    const stopBtn = document.getElementById("stop-btn");
    const status = document.getElementById("status");

    expect(toneBtn.disabled).toBe(true);
    expect(stopBtn.disabled).toBe(true);

    startBtn.click();
    await flushPromises();

    expect(CsoundEngineMock).toHaveBeenCalledTimes(1);
    expect(mockEngine.start).toHaveBeenCalledTimes(1);
    expect(mockEngine.compile).toHaveBeenCalledTimes(1);
    expect(startBtn.disabled).toBe(true);
    expect(toneBtn.disabled).toBe(false);
    expect(stopBtn.disabled).toBe(false);
    expect(status.textContent).toContain("Engine running");
  });

  it("should send score events when tone button is clicked", async () => {
    const startBtn = document.getElementById("start-btn");
    const toneBtn = document.getElementById("tone-btn");
    const status = document.getElementById("status");

    startBtn.click();
    await flushPromises();

    toneBtn.click();
    await flushPromises();

    expect(mockEngine.sendScoreEvent).toHaveBeenCalledWith("i 1 0 1");
    expect(status.textContent).toBe("Sent test tone event.");
  });

  it("should stop the engine and reset controls", async () => {
    const startBtn = document.getElementById("start-btn");
    const toneBtn = document.getElementById("tone-btn");
    const stopBtn = document.getElementById("stop-btn");

    startBtn.click();
    await flushPromises();

    stopBtn.click();
    await flushPromises();

    expect(mockEngine.dispose).toHaveBeenCalledTimes(1);
    expect(toneBtn.disabled).toBe(true);
    expect(startBtn.disabled).toBe(false);
  });

  it("should show an error if engine start fails", async () => {
    mockEngine.start.mockRejectedValue(new Error("start failed"));

    const startBtn = document.getElementById("start-btn");
    const toneBtn = document.getElementById("tone-btn");
    const stopBtn = document.getElementById("stop-btn");
    const status = document.getElementById("status");

    startBtn.click();
    await flushPromises();

    expect(mockEngine.start).toHaveBeenCalledTimes(1);
    expect(status.textContent).toBe("Failed to start: start failed");
    expect(startBtn.disabled).toBe(false);
    expect(toneBtn.disabled).toBe(true);
    expect(stopBtn.disabled).toBe(true);
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
});
