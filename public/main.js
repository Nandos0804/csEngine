import { CsoundEngine } from "./src/cswrapper.js";
import {
  POSCIL3_INSTR01_CSD,
  POSCIL3_INSTR01_CHANNELS,
} from "./src/instruments/poscil3-instr01.js";
import {
  VCO2_INSTR02_CSD,
  VCO2_INSTR02_CHANNELS,
} from "./src/instruments/vco2-instr02.js";

const statusEl = document.getElementById("status");
const startBtn = document.getElementById("start-btn");
const toneBtn = document.getElementById("tone-btn");
const stopBtn = document.getElementById("stop-btn");
const ampSlider = document.getElementById("amp-slider");
const freqSlider = document.getElementById("freq-slider");
const tone2Btn = document.getElementById("tone2-btn");
const resetFilterBtn = document.getElementById("reset-filter-btn");
const cutoffSlider = document.getElementById("cutoff-slider");
const resSlider = document.getElementById("res-slider");

const engine = new CsoundEngine();
// Owned by this demo page, not by CsoundEngine: dispose() deliberately
// leaves a caller-supplied AudioContext running (so a real host, e.g. RNBO,
// keeps its own context alive across a Csound restart). Since this demo
// creates the context itself, it must close it explicitly or repeated
// Start/Stop clicks leak AudioContexts until the browser refuses new ones.
let audioContext = null;

function setStatus(text) {
  statusEl.textContent = text;
}

startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  setStatus("Starting Csound engine...");
  try {
    // Stand-in for an AudioContext an RNBO session would already own -
    // Csound is told to reuse it instead of creating its own, so the two
    // engines can share one audio graph side-by-side.
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    await engine.start({ audioContext });
    // Surface Csound's own diagnostics (e.g. buffer underrun warnings, a
    // common cause of audible clicks/glitches) with a clear prefix so they
    // stand out from the rest of the page's console output.
    engine.onMessage((message) => console.log("[csound]", message));
    // Both CSDs compile into the same running engine - compileCSD() adds
    // instruments incrementally rather than replacing the orchestra, so
    // instrument 1 and instrument 2 can be triggered and driven side by side.
    await engine.compile(POSCIL3_INSTR01_CSD);
    await engine.compile(VCO2_INSTR02_CSD);
    setStatus('Engine running. Click "Trigger note" to check audio.');
    toneBtn.disabled = false;
    tone2Btn.disabled = false;
    resetFilterBtn.disabled = false;
    stopBtn.disabled = false;
    ampSlider.disabled = false;
    freqSlider.disabled = false;
    cutoffSlider.disabled = false;
    resSlider.disabled = false;
  } catch (err) {
    console.error(err);
    setStatus(`Failed to start: ${err.message}`);
    startBtn.disabled = false;
    if (audioContext) {
      await audioContext.close();
      audioContext = null;
    }
  }
});

stopBtn.addEventListener("click", async () => {
  stopBtn.disabled = true;
  setStatus("Stopping Csound engine...");
  try {
    await engine.dispose();
    await audioContext.close();
    audioContext = null;
    setStatus("Csound engine stopped.");
    toneBtn.disabled = true;
    tone2Btn.disabled = true;
    resetFilterBtn.disabled = true;
    ampSlider.disabled = true;
    freqSlider.disabled = true;
    cutoffSlider.disabled = true;
    resSlider.disabled = true;
    startBtn.disabled = false;
  } catch (err) {
    console.error(err);
    setStatus(`Failed to stop: ${err.message}`);
    stopBtn.disabled = false;
  }
});

toneBtn.addEventListener("click", async () => {
  try {
    // i 1 0 3600 -> play instrument 1 for a long held note so the sliders
    // below have something to modulate live.
    await engine.sendScoreEvent("i 1 0 3600");
    setStatus("Sent trigger note event.");
  } catch (err) {
    console.error(err);
    setStatus(`Failed to send event: ${err.message}`);
  }
});

ampSlider.addEventListener("input", async () => {
  try {
    await engine.handleMessage({
      payload: [
        {
          op: "csound",
          name: POSCIL3_INSTR01_CHANNELS.kamp,
          data: Number(ampSlider.value),
        },
      ],
    });
  } catch (err) {
    console.error(err);
    setStatus(`Failed to send payload: ${err.message}`);
  }
});

freqSlider.addEventListener("input", async () => {
  try {
    await engine.handleMessage({
      payload: [
        {
          op: "csound",
          name: POSCIL3_INSTR01_CHANNELS.kcps,
          data: Number(freqSlider.value),
        },
      ],
    });
  } catch (err) {
    console.error(err);
    setStatus(`Failed to send payload: ${err.message}`);
  }
});

tone2Btn.addEventListener("click", async () => {
  try {
    // i 2 0 3600 -> play instrument 2 for a long held note so the sliders
    // below have something to modulate live.
    await engine.sendScoreEvent("i 2 0 3600");
    setStatus("Sent trigger note event.");
  } catch (err) {
    console.error(err);
    setStatus(`Failed to send event: ${err.message}`);
  }
});

cutoffSlider.addEventListener("input", async () => {
  try {
    await engine.handleMessage({
      payload: [
        {
          op: "csound",
          name: VCO2_INSTR02_CHANNELS.kcutoff,
          data: Number(cutoffSlider.value),
        },
      ],
    });
  } catch (err) {
    console.error(err);
    setStatus(`Failed to send payload: ${err.message}`);
  }
});

resSlider.addEventListener("input", async () => {
  try {
    await engine.handleMessage({
      payload: [
        {
          op: "csound",
          name: VCO2_INSTR02_CHANNELS.kres,
          data: Number(resSlider.value),
        },
      ],
    });
  } catch (err) {
    console.error(err);
    setStatus(`Failed to send payload: ${err.message}`);
  }
});

resetFilterBtn.addEventListener("click", async () => {
  try {
    // A single handleMessage() call carrying two items - demonstrates that a
    // payload addressing multiple channels for the same instrument lands in
    // payload order within one dispatch, not just one channel at a time.
    cutoffSlider.value = "2000";
    resSlider.value = "0.3";
    await engine.handleMessage({
      payload: [
        {
          op: "csound",
          name: VCO2_INSTR02_CHANNELS.kcutoff,
          data: Number(cutoffSlider.value),
        },
        {
          op: "csound",
          name: VCO2_INSTR02_CHANNELS.kres,
          data: Number(resSlider.value),
        },
      ],
    });
    setStatus("Reset filter to defaults.");
  } catch (err) {
    console.error(err);
    setStatus(`Failed to send payload: ${err.message}`);
  }
});
