// Instrument templates follow the `<opcode>_instr<NN>_<param>` control
// channel naming convention, e.g. poscil3_instr01_kamp maps to the `kamp`
// argument of poscil3(kamp, kcps, ifn, iphs) in instrument 01. A JSON
// payload item addresses a parameter by setting that exact channel name,
// e.g. { "op": "csound", "name": "poscil3_instr01_kamp", "data": 0.5 }.

export const POSCIL3_INSTR01_CHANNELS = {
  kamp: "poscil3_instr01_kamp",
  kcps: "poscil3_instr01_kcps",
};

export const POSCIL3_INSTR01_CSD = `
<CsoundSynthesizer>
<CsOptions>
-odac
</CsOptions>
<CsInstruments>

sr = 44100
ksmps = 32
nchnls = 2
0dbfs = 1

; Seed default control channel values so instrument 1 is safe to trigger
; before any JSON payload arrives.
chnset 0.3, "${POSCIL3_INSTR01_CHANNELS.kamp}"
chnset 440, "${POSCIL3_INSTR01_CHANNELS.kcps}"

instr 1
  ; i-rate reads seed port's initial value so the note starts at the
  ; current channel value instead of ramping up from 0 over iSmooth seconds.
  iAmp chnget "${POSCIL3_INSTR01_CHANNELS.kamp}"
  iCps chnget "${POSCIL3_INSTR01_CHANNELS.kcps}"
  kampIn chnget "${POSCIL3_INSTR01_CHANNELS.kamp}"
  kcpsIn chnget "${POSCIL3_INSTR01_CHANNELS.kcps}"
  ; A UI control (e.g. a slider) can step the channel value between k-cycles;
  ; feeding that step straight into poscil3 produces an audible click on
  ; every change. port glides toward the new value over iSmooth seconds
  ; instead of jumping to it.
  iSmooth = 0.02
  kamp port kampIn, iSmooth, iAmp
  kcps port kcpsIn, iSmooth, iCps
  asig poscil3 kamp, kcps
  ; outs is deprecated in Csound 7 - out now takes one arg per channel
  ; (nchnls = 2 here), replacing outs/outq/outo's old per-count opcodes.
  out asig, asig
endin

</CsInstruments>
<CsScore>
</CsScore>
</CsoundSynthesizer>
`;
