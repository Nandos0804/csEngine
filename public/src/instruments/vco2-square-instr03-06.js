// Four identical square-wave voices (instruments 3-6) built from one
// template. Control channels follow the `<opcode>_instr<NN>_<param>` naming
// convention, e.g. vco2_instr03_kpw maps to the `kpw` (duty cycle) argument
// of vco2(kamp, kcps, imode, kpw) in instrument 03. A JSON payload item
// addresses a parameter by setting that exact channel name, e.g.
// { "op": "csound", "name": "vco2_instr03_kpw", "data": 0.25 }.
//
// Per-voice parameters:
//   kamp  - amplitude fed to vco2
//   kcps  - base frequency in Hz
//   krand - random drift range: the voice wanders +-krand Hz around kcps
//   kpw   - duty cycle of the square (clamped to 0.05-0.95 inside the instr)
//   iatt / idec / islev / irel - madsr ADSR applied to the output

function squareVoice(nn, icps) {
  const channel = (param) => `vco2_instr${nn}_${param}`;
  const channels = {
    kamp: channel("kamp"),
    kcps: channel("kcps"),
    krand: channel("krand"),
    kpw: channel("kpw"),
    iatt: channel("iatt"),
    idec: channel("idec"),
    islev: channel("islev"),
    irel: channel("irel"),
  };
  const csd = `
<CsoundSynthesizer>
<CsOptions>
-odac
</CsOptions>
<CsInstruments>

sr = 44100
ksmps = 32
nchnls = 2
0dbfs = 1

; Seed default control channel values so instrument ${Number(nn)} is safe to
; trigger before any JSON payload arrives. 0.2 amplitude leaves headroom when
; all four square voices (instruments 3-6) sound at once.
chnset 0.2, "${channels.kamp}"
chnset ${icps}, "${channels.kcps}"
chnset 5, "${channels.krand}"
chnset 0.5, "${channels.kpw}"
chnset 0.05, "${channels.iatt}"
chnset 0.1, "${channels.idec}"
chnset 0.7, "${channels.islev}"
chnset 0.5, "${channels.irel}"

instr ${Number(nn)}
  ; i-rate reads seed each port's initial value so the note starts at the
  ; current channel value instead of ramping up from 0 over iSmooth seconds.
  iAmp chnget "${channels.kamp}"
  iCps chnget "${channels.kcps}"
  iRand chnget "${channels.krand}"
  iPw chnget "${channels.kpw}"
  kampIn chnget "${channels.kamp}"
  kcpsIn chnget "${channels.kcps}"
  krandIn chnget "${channels.krand}"
  kpwIn chnget "${channels.kpw}"
  ; The ADSR stages are i-rate madsr arguments: read once at note start, so a
  ; payload change applies from the next triggered note on, not mid-note.
  iAtt chnget "${channels.iatt}"
  iDec chnget "${channels.idec}"
  iSus chnget "${channels.islev}"
  iRel chnget "${channels.irel}"
  ; A UI control (e.g. a slider) can step a channel value between k-cycles;
  ; feeding that step straight into vco2 produces an audible click on every
  ; change. port glides toward the new value over iSmooth seconds instead.
  iSmooth = 0.02
  kamp port kampIn, iSmooth, iAmp
  kcps port kcpsIn, iSmooth, iCps
  krand port krandIn, iSmooth, iRand
  kpw port kpwIn, iSmooth, iPw
  ; Random frequency drift: interpolate toward a new random offset within
  ; -krand..+krand Hz five times per second. Seed 2 seeds randi from the
  ; system clock, so the four square voices drift independently of each
  ; other instead of in lockstep.
  kjit randi krand, 5, 2
  ; vco2's PWM square degenerates toward silence/DC as the duty cycle
  ; approaches 0 or 1 - clamp it to a usable range.
  kpwSafe limit kpw, 0.05, 0.95
  aenv madsr iAtt, iDec, iSus, iRel
  asig vco2 kamp, kcps + kjit, 2, kpwSafe
  ; outs is deprecated in Csound 7 - out now takes one arg per channel
  ; (nchnls = 2 here), replacing outs/outq/outo's old per-count opcodes.
  out asig * aenv, asig * aenv
endin

</CsInstruments>
<CsScore>
</CsScore>
</CsoundSynthesizer>
`;
  return { channels, csd };
}

// Default base frequencies form a 4:5:6:8 ratio (an A major chord-ish
// spread), so triggering all four voices untouched already sounds like an
// ensemble rather than a unison.
const instr03 = squareVoice("03", 220);
const instr04 = squareVoice("04", 275);
const instr05 = squareVoice("05", 330);
const instr06 = squareVoice("06", 440);

export const VCO2_INSTR03_CHANNELS = instr03.channels;
export const VCO2_INSTR03_CSD = instr03.csd;
export const VCO2_INSTR04_CHANNELS = instr04.channels;
export const VCO2_INSTR04_CSD = instr04.csd;
export const VCO2_INSTR05_CHANNELS = instr05.channels;
export const VCO2_INSTR05_CSD = instr05.csd;
export const VCO2_INSTR06_CHANNELS = instr06.channels;
export const VCO2_INSTR06_CSD = instr06.csd;
