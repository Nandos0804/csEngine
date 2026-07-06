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
  kamp chnget "${POSCIL3_INSTR01_CHANNELS.kamp}"
  kcps chnget "${POSCIL3_INSTR01_CHANNELS.kcps}"
  asig poscil3 kamp, kcps
  outs asig, asig
endin

</CsInstruments>
<CsScore>
</CsScore>
</CsoundSynthesizer>
`;
