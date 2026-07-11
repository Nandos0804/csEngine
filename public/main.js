import { CsoundEngine } from "./src/cswrapper.js";
import {
  POSCIL3_INSTR01_CSD,
  POSCIL3_INSTR01_CHANNELS,
} from "./src/instruments/poscil3-instr01.js";
import {
  VCO2_INSTR02_CSD,
  VCO2_INSTR02_CHANNELS,
} from "./src/instruments/vco2-instr02.js";
import {
  VCO2_INSTR03_CSD,
  VCO2_INSTR03_CHANNELS,
  VCO2_INSTR04_CSD,
  VCO2_INSTR04_CHANNELS,
  VCO2_INSTR05_CSD,
  VCO2_INSTR05_CHANNELS,
  VCO2_INSTR06_CSD,
  VCO2_INSTR06_CHANNELS,
} from "./src/instruments/vco2-square-instr03-06.js";
import {
  PINKISH_INSTR07_CSD,
  PINKISH_INSTR07_CHANNELS,
} from "./src/instruments/pinkish-instr07.js";

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
const ensembleTriggerBtn = document.getElementById("ensemble-trigger-btn");
const ensembleReleaseBtn = document.getElementById("ensemble-release-btn");
const pitchSlider = document.getElementById("pitch-slider");
const driftSlider = document.getElementById("drift-slider");
const dutySlider = document.getElementById("duty-slider");
const pinkTriggerBtn = document.getElementById("pink-trigger-btn");
const pinkReleaseBtn = document.getElementById("pink-release-btn");
const pinkAmpSlider = document.getElementById("pink-amp-slider");
const attSlider = document.getElementById("att-slider");
const decSlider = document.getElementById("dec-slider");
const susSlider = document.getElementById("sus-slider");
const relSlider = document.getElementById("rel-slider");

// The four square voices treated as one ensemble. `ratio` mirrors each
// voice's default 4:5:6:8 frequency spread, so the pitch slider transposes
// the whole chord instead of collapsing it to a unison.
const SQUARE_VOICES = [
  {
    instr: 3,
    csd: VCO2_INSTR03_CSD,
    channels: VCO2_INSTR03_CHANNELS,
    ratio: 1,
  },
  {
    instr: 4,
    csd: VCO2_INSTR04_CSD,
    channels: VCO2_INSTR04_CHANNELS,
    ratio: 1.25,
  },
  {
    instr: 5,
    csd: VCO2_INSTR05_CSD,
    channels: VCO2_INSTR05_CHANNELS,
    ratio: 1.5,
  },
  {
    instr: 6,
    csd: VCO2_INSTR06_CSD,
    channels: VCO2_INSTR06_CHANNELS,
    ratio: 2,
  },
];

// Controls that are only usable while the engine runs. The two release
// buttons are managed separately: they additionally require a held note.
const engineControls = [
  toneBtn,
  tone2Btn,
  resetFilterBtn,
  ampSlider,
  freqSlider,
  cutoffSlider,
  resSlider,
  ensembleTriggerBtn,
  pitchSlider,
  driftSlider,
  dutySlider,
  pinkTriggerBtn,
  pinkAmpSlider,
  attSlider,
  decSlider,
  susSlider,
  relSlider,
];

function setEngineControlsDisabled(disabled) {
  for (const control of engineControls) {
    control.disabled = disabled;
  }
}

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

// Shared dispatch/error path for the sliders below: one handleMessage() call
// carrying all the entries, applied in array order.
async function dispatchPayload(entries) {
  try {
    await engine.handleMessage({ payload: entries });
  } catch (err) {
    console.error(err);
    setStatus(`Failed to send payload: ${err.message}`);
  }
}

// Shared trigger/release path for held notes: `i N 0 -1` sustains at the
// ADSR sustain level until an explicit `i -N 0 0` turnoff, which plays the
// envelope's release stage (unlike the fixed-length notes above). onSuccess
// only runs when every event was sent, so the trigger/release buttons never
// flip state on a failed send.
async function sendScoreEvents(events, okStatus, onSuccess) {
  try {
    for (const event of events) {
      await engine.sendScoreEvent(event);
    }
    onSuccess();
    setStatus(okStatus);
  } catch (err) {
    console.error(err);
    setStatus(`Failed to send event: ${err.message}`);
  }
}

// One payload entry per square voice, all targeting the same parameter.
function ensembleEntries(param, data) {
  return SQUARE_VOICES.map(({ channels }) => ({
    op: "csound",
    name: channels[param],
    data,
  }));
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
    // All CSDs compile into the same running engine - compileCSD() adds
    // instruments incrementally rather than replacing the orchestra, so
    // instruments 1 through 7 can be triggered and driven side by side.
    await engine.compile(POSCIL3_INSTR01_CSD);
    await engine.compile(VCO2_INSTR02_CSD);
    for (const { csd } of SQUARE_VOICES) {
      await engine.compile(csd);
    }
    await engine.compile(PINKISH_INSTR07_CSD);
    setStatus('Engine running. Click "Trigger note" to check audio.');
    stopBtn.disabled = false;
    setEngineControlsDisabled(false);
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
    setEngineControlsDisabled(true);
    ensembleReleaseBtn.disabled = true;
    pinkReleaseBtn.disabled = true;
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

ensembleTriggerBtn.addEventListener("click", async () => {
  await sendScoreEvents(
    SQUARE_VOICES.map(({ instr }) => `i ${instr} 0 -1`),
    "Triggered square ensemble (instruments 3-6).",
    () => {
      ensembleTriggerBtn.disabled = true;
      ensembleReleaseBtn.disabled = false;
    },
  );
});

ensembleReleaseBtn.addEventListener("click", async () => {
  await sendScoreEvents(
    SQUARE_VOICES.map(({ instr }) => `i -${instr} 0 0`),
    "Released square ensemble.",
    () => {
      ensembleTriggerBtn.disabled = false;
      ensembleReleaseBtn.disabled = true;
    },
  );
});

pitchSlider.addEventListener("input", async () => {
  // One slider drives all four voices' kcps in a single payload, keeping the
  // ensemble's 4:5:6:8 spread while transposing it.
  const base = Number(pitchSlider.value);
  await dispatchPayload(
    SQUARE_VOICES.map(({ channels, ratio }) => ({
      op: "csound",
      name: channels.kcps,
      data: base * ratio,
    })),
  );
});

driftSlider.addEventListener("input", async () => {
  await dispatchPayload(ensembleEntries("krand", Number(driftSlider.value)));
});

dutySlider.addEventListener("input", async () => {
  await dispatchPayload(ensembleEntries("kpw", Number(dutySlider.value)));
});

pinkTriggerBtn.addEventListener("click", async () => {
  await sendScoreEvents(
    ["i 7 0 -1"],
    "Triggered pink noise (instrument 7).",
    () => {
      pinkTriggerBtn.disabled = true;
      pinkReleaseBtn.disabled = false;
    },
  );
});

pinkReleaseBtn.addEventListener("click", async () => {
  await sendScoreEvents(["i -7 0 0"], "Released pink noise.", () => {
    pinkTriggerBtn.disabled = false;
    pinkReleaseBtn.disabled = true;
  });
});

pinkAmpSlider.addEventListener("input", async () => {
  await dispatchPayload([
    {
      op: "csound",
      name: PINKISH_INSTR07_CHANNELS.kamp,
      data: Number(pinkAmpSlider.value),
    },
  ]);
});

// One envelope control group for all five instruments: each slider writes
// the matching ADSR channel of the four square voices plus the pink noise in
// a single payload. The stages are i-rate, so a change lands on the next
// triggered note, not one already sounding.
function bindAdsrSlider(slider, param) {
  slider.addEventListener("input", async () => {
    const value = Number(slider.value);
    await dispatchPayload([
      ...ensembleEntries(param, value),
      { op: "csound", name: PINKISH_INSTR07_CHANNELS[param], data: value },
    ]);
  });
}

bindAdsrSlider(attSlider, "iatt");
bindAdsrSlider(decSlider, "idec");
bindAdsrSlider(susSlider, "islev");
bindAdsrSlider(relSlider, "irel");

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
