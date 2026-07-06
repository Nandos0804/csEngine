import { CsoundEngine } from "./src/cswrapper.js";
import {
  POSCIL3_INSTR01_CSD,
  POSCIL3_INSTR01_CHANNELS,
} from "./src/instruments/poscil3-instr01.js";

const statusEl = document.getElementById("status");
const startBtn = document.getElementById("start-btn");
const toneBtn = document.getElementById("tone-btn");
const stopBtn = document.getElementById("stop-btn");
const ampSlider = document.getElementById("amp-slider");
const freqSlider = document.getElementById("freq-slider");

const engine = new CsoundEngine();

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
    const audioContext = new (
      window.AudioContext || window.webkitAudioContext
    )();

    await engine.start({ audioContext });
    await engine.compile(POSCIL3_INSTR01_CSD);
    setStatus('Engine running. Click "Trigger note" to check audio.');
    toneBtn.disabled = false;
    stopBtn.disabled = false;
    ampSlider.disabled = false;
    freqSlider.disabled = false;
  } catch (err) {
    console.error(err);
    setStatus(`Failed to start: ${err.message}`);
    startBtn.disabled = false;
  }
});

stopBtn.addEventListener("click", async () => {
  stopBtn.disabled = true;
  setStatus("Stopping Csound engine...");
  try {
    await engine.dispose();
    setStatus("Csound engine stopped.");
    toneBtn.disabled = true;
    ampSlider.disabled = true;
    freqSlider.disabled = true;
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
