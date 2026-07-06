import {
  POSCIL3_INSTR01_CHANNELS,
  POSCIL3_INSTR01_CSD,
} from "../../public/src/instruments/poscil3-instr01.js";

describe("poscil3-instr01", () => {
  it("exposes the kamp and kcps control channel names", () => {
    expect(POSCIL3_INSTR01_CHANNELS).toEqual({
      kamp: "poscil3_instr01_kamp",
      kcps: "poscil3_instr01_kcps",
    });
  });

  it("uses poscil3 and reads both channels via chnget", () => {
    expect(POSCIL3_INSTR01_CSD).toContain("poscil3");
    expect(POSCIL3_INSTR01_CSD).toContain(POSCIL3_INSTR01_CHANNELS.kamp);
    expect(POSCIL3_INSTR01_CSD).toContain(POSCIL3_INSTR01_CHANNELS.kcps);
  });
});
