// Instrument templates follow the `<opcode>_instr<NN>_<param>` control
// channel naming convention, e.g. vco2_instr02_kcutoff maps to the `kcutoff`
// argument of moogladder(asig, kcutoff, kres) filtering instrument 02's
// vco2 sawtooth. A JSON payload item addresses a parameter by setting that
// exact channel name, e.g. { "op": "csound", "name": "vco2_instr02_kcutoff", "data": 2000 }.

export const VCO2_INSTR02_CHANNELS = {
  kamp: "vco2_instr02_kamp",
  kcps: "vco2_instr02_kcps",
  kcutoff: "vco2_instr02_kcutoff",
  kres: "vco2_instr02_kres",
};

export const VCO2_INSTR02_CSD = `
<CsoundSynthesizer>
<CsOptions>
-odac
</CsOptions>
<CsInstruments>

sr = 44100
ksmps = 32
nchnls = 2
0dbfs = 1

; Seed default control channel values so instrument 2 is safe to trigger
; before any JSON payload arrives.
chnset 0.3, "${VCO2_INSTR02_CHANNELS.kamp}"
chnset 220, "${VCO2_INSTR02_CHANNELS.kcps}"
chnset 2000, "${VCO2_INSTR02_CHANNELS.kcutoff}"
chnset 0.3, "${VCO2_INSTR02_CHANNELS.kres}"

instr 2
  ; i-rate reads seed each port's initial value so the note starts at the
  ; current channel value instead of ramping up from 0 over iSmooth seconds.
  iAmp chnget "${VCO2_INSTR02_CHANNELS.kamp}"
  iCps chnget "${VCO2_INSTR02_CHANNELS.kcps}"
  iCutoff chnget "${VCO2_INSTR02_CHANNELS.kcutoff}"
  iRes chnget "${VCO2_INSTR02_CHANNELS.kres}"
  kampIn chnget "${VCO2_INSTR02_CHANNELS.kamp}"
  kcpsIn chnget "${VCO2_INSTR02_CHANNELS.kcps}"
  kcutoffIn chnget "${VCO2_INSTR02_CHANNELS.kcutoff}"
  kresIn chnget "${VCO2_INSTR02_CHANNELS.kres}"
  ; A UI control (e.g. a slider) can step a channel value between k-cycles;
  ; feeding that step straight into vco2/moogladder produces an audible
  ; click on every change. port glides toward the new value over iSmooth
  ; seconds instead of jumping to it.
  iSmooth = 0.02
  kamp port kampIn, iSmooth, iAmp
  kcps port kcpsIn, iSmooth, iCps
  kcutoff port kcutoffIn, iSmooth, iCutoff
  kres port kresIn, iSmooth, iRes
  asaw vco2 kamp, kcps
  afilt moogladder asaw, kcutoff, kres
  ; outs is deprecated in Csound 7 - out now takes one arg per channel
  ; (nchnls = 2 here), replacing outs/outq/outo's old per-count opcodes.
  out afilt, afilt
endin

</CsInstruments>
<CsScore>
</CsScore>
</CsoundSynthesizer>
`;
