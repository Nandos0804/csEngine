import { CsoundEngine } from "./src/CSWrapper.js";

// Bare-bones orchestra: instrument 1 is a 440Hz sine tone, 1 second long,
// with a short fade in/out so it doesn't click.
const TEST_CSD = `
<CsoundSynthesizer>
<CsOptions>
-odac
</CsOptions>
<CsInstruments>
sr = 44100
ksmps = 32
nchnls = 2
0dbfs = 1

instr 1
  aenv linseg 0, 0.05, 0.3, 0.9, 0.3, 0.05, 0
  asig poscil aenv, 440
  outs asig, asig
endin

</CsInstruments>
<CsScore>
</CsScore>
</CsoundSynthesizer>
`;

const statusEl = document.getElementById("status");
const startBtn = document.getElementById("start-btn");
const toneBtn = document.getElementById("tone-btn");

const engine = new CsoundEngine();

function setStatus(text) {
  statusEl.textContent = text;
}

startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  setStatus("Starting Csound engine...");
  try {
    await engine.start();
    await engine.compile(TEST_CSD);
    setStatus('Engine running. Click "Play test tone" to check audio.');
    toneBtn.disabled = false;
  } catch (err) {
    console.error(err);
    setStatus(`Failed to start: ${err.message}`);
    startBtn.disabled = false;
  }
});

toneBtn.addEventListener("click", async () => {
  try {
    // i 1 0 1  ->  play instrument 1, start at time 0 (now), duration 1s
    await engine.sendScoreEvent("i 1 0 1");
    setStatus("Sent test tone event.");
  } catch (err) {
    console.error(err);
    setStatus(`Failed to send event: ${err.message}`);
  }
});
