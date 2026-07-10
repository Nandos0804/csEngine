import {
  VCO2_INSTR03_CHANNELS,
  VCO2_INSTR03_CSD,
  VCO2_INSTR04_CHANNELS,
  VCO2_INSTR04_CSD,
  VCO2_INSTR05_CHANNELS,
  VCO2_INSTR05_CSD,
  VCO2_INSTR06_CHANNELS,
  VCO2_INSTR06_CSD,
} from "../../public/src/instruments/vco2-square-instr03-06.js";

const voices = [
  ["03", 3, VCO2_INSTR03_CHANNELS, VCO2_INSTR03_CSD],
  ["04", 4, VCO2_INSTR04_CHANNELS, VCO2_INSTR04_CSD],
  ["05", 5, VCO2_INSTR05_CHANNELS, VCO2_INSTR05_CSD],
  ["06", 6, VCO2_INSTR06_CHANNELS, VCO2_INSTR06_CSD],
];

describe.each(voices)(
  "vco2-square-instr%s",
  (nn, instrNumber, channels, csd) => {
    it("exposes the square-wave and ADSR control channel names", () => {
      expect(channels).toEqual({
        kamp: `vco2_instr${nn}_kamp`,
        kcps: `vco2_instr${nn}_kcps`,
        krand: `vco2_instr${nn}_krand`,
        kpw: `vco2_instr${nn}_kpw`,
        iatt: `vco2_instr${nn}_iatt`,
        idec: `vco2_instr${nn}_idec`,
        islev: `vco2_instr${nn}_islev`,
        irel: `vco2_instr${nn}_irel`,
      });
    });

    it("uses a vco2 PWM square with randi drift and a madsr envelope, reading every channel via chnget", () => {
      expect(csd).toContain(`instr ${instrNumber}`);
      expect(csd).toContain("vco2");
      expect(csd).toContain("randi");
      expect(csd).toContain("madsr");
      for (const name of Object.values(channels)) {
        expect(csd).toContain(name);
      }
    });

    it("smooths the k-rate channels through port before they reach vco2/randi", () => {
      // Un-smoothed control-channel steps land straight in vco2's amp/freq/
      // duty-cycle or randi's drift range, which produces an audible click on
      // every UI update - port glides toward the new value instead of jumping
      // to it.
      expect(csd).toMatch(/kamp\s+port\s+kampIn/);
      expect(csd).toMatch(/kcps\s+port\s+kcpsIn/);
      expect(csd).toMatch(/krand\s+port\s+krandIn/);
      expect(csd).toMatch(/kpw\s+port\s+kpwIn/);
    });

    it("clamps the duty cycle before it reaches vco2", () => {
      // vco2's PWM square degenerates toward silence/DC at kpw 0 or 1.
      expect(csd).toMatch(/kpwSafe\s+limit\s+kpw/);
    });
  },
);

describe("vco2-square bank", () => {
  it("gives each voice its own instrument number and channel namespace", () => {
    const numbers = voices.map(([, instrNumber]) => instrNumber);
    const allChannelNames = voices.flatMap(([, , channels]) =>
      Object.values(channels),
    );
    expect(new Set(numbers).size).toBe(voices.length);
    expect(new Set(allChannelNames).size).toBe(allChannelNames.length);
  });
});
