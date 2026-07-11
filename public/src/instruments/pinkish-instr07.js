// Instrument templates follow the `<opcode>_instr<NN>_<param>` control
// channel naming convention, e.g. pinkish_instr07_kamp maps to the amplitude
// input of pinkish(kamp) in instrument 07, and pinkish_instr07_iatt to the
// `iatt` argument of the madsr(iatt, idec, islev, irel) envelope shaping its
// output. A JSON payload item addresses a parameter by setting that exact
// channel name, e.g. { "op": "csound", "name": "pinkish_instr07_kamp", "data": 0.5 }.

export const PINKISH_INSTR07_CHANNELS = {
  kamp: "pinkish_instr07_kamp",
  iatt: "pinkish_instr07_iatt",
  idec: "pinkish_instr07_idec",
  islev: "pinkish_instr07_islev",
  irel: "pinkish_instr07_irel",
};

export const PINKISH_INSTR07_CSD = `
<CsoundSynthesizer>
<CsOptions>
-odac
</CsOptions>
<CsInstruments>

sr = 44100
ksmps = 32
nchnls = 2
0dbfs = 1

; Seed default control channel values so instrument 7 is safe to trigger
; before any JSON payload arrives.
chnset 0.2, "${PINKISH_INSTR07_CHANNELS.kamp}"
chnset 0.05, "${PINKISH_INSTR07_CHANNELS.iatt}"
chnset 0.1, "${PINKISH_INSTR07_CHANNELS.idec}"
chnset 0.7, "${PINKISH_INSTR07_CHANNELS.islev}"
chnset 0.5, "${PINKISH_INSTR07_CHANNELS.irel}"

instr 7
  ; i-rate read seeds port's initial value so the note starts at the current
  ; channel value instead of ramping up from 0 over iSmooth seconds.
  iAmp chnget "${PINKISH_INSTR07_CHANNELS.kamp}"
  kampIn chnget "${PINKISH_INSTR07_CHANNELS.kamp}"
  ; The ADSR stages are i-rate madsr arguments: read once at note start, so a
  ; payload change applies from the next triggered note on, not mid-note.
  iAtt chnget "${PINKISH_INSTR07_CHANNELS.iatt}"
  iDec chnget "${PINKISH_INSTR07_CHANNELS.idec}"
  iSus chnget "${PINKISH_INSTR07_CHANNELS.islev}"
  iRel chnget "${PINKISH_INSTR07_CHANNELS.irel}"
  ; A UI control (e.g. a slider) can step the channel value between k-cycles;
  ; feeding that step straight into pinkish produces an audible click on
  ; every change. port glides toward the new value over iSmooth seconds.
  iSmooth = 0.02
  kamp port kampIn, iSmooth, iAmp
  aenv madsr iAtt, iDec, iSus, iRel
  asig pinkish kamp
  ; outs is deprecated in Csound 7 - out now takes one arg per channel
  ; (nchnls = 2 here), replacing outs/outq/outo's old per-count opcodes.
  out asig * aenv, asig * aenv
endin

</CsInstruments>
<CsScore>
</CsScore>
</CsoundSynthesizer>
`;
