import {
  PINKISH_INSTR07_CHANNELS,
  PINKISH_INSTR07_CSD,
} from "../../public/src/instruments/pinkish-instr07.js";

describe("pinkish-instr07", () => {
  it("exposes the amplitude and ADSR control channel names", () => {
    expect(PINKISH_INSTR07_CHANNELS).toEqual({
      kamp: "pinkish_instr07_kamp",
      iatt: "pinkish_instr07_iatt",
      idec: "pinkish_instr07_idec",
      islev: "pinkish_instr07_islev",
      irel: "pinkish_instr07_irel",
    });
  });

  it("uses pinkish through a madsr envelope and reads every channel via chnget", () => {
    expect(PINKISH_INSTR07_CSD).toContain("instr 7");
    expect(PINKISH_INSTR07_CSD).toContain("pinkish");
    expect(PINKISH_INSTR07_CSD).toContain("madsr");
    for (const name of Object.values(PINKISH_INSTR07_CHANNELS)) {
      expect(PINKISH_INSTR07_CSD).toContain(name);
    }
  });

  it("smooths the amplitude channel through port before it reaches pinkish", () => {
    // An un-smoothed control-channel step lands straight in pinkish's
    // amplitude input, which produces an audible click on every UI update -
    // port glides toward the new value instead of jumping to it.
    expect(PINKISH_INSTR07_CSD).toMatch(/kamp\s+port\s+kampIn/);
  });
});
