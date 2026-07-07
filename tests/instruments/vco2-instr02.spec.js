import {
  VCO2_INSTR02_CHANNELS,
  VCO2_INSTR02_CSD,
} from "../../public/src/instruments/vco2-instr02.js";

describe("vco2-instr02", () => {
  it("exposes the kamp, kcps, kcutoff, and kres control channel names", () => {
    expect(VCO2_INSTR02_CHANNELS).toEqual({
      kamp: "vco2_instr02_kamp",
      kcps: "vco2_instr02_kcps",
      kcutoff: "vco2_instr02_kcutoff",
      kres: "vco2_instr02_kres",
    });
  });

  it("uses vco2 into moogladder and reads all four channels via chnget", () => {
    expect(VCO2_INSTR02_CSD).toContain("vco2");
    expect(VCO2_INSTR02_CSD).toContain("moogladder");
    expect(VCO2_INSTR02_CSD).toContain(VCO2_INSTR02_CHANNELS.kamp);
    expect(VCO2_INSTR02_CSD).toContain(VCO2_INSTR02_CHANNELS.kcps);
    expect(VCO2_INSTR02_CSD).toContain(VCO2_INSTR02_CHANNELS.kcutoff);
    expect(VCO2_INSTR02_CSD).toContain(VCO2_INSTR02_CHANNELS.kres);
  });

  it("smooths all four channels through port before they reach vco2/moogladder", () => {
    // Un-smoothed control-channel steps land straight in vco2's amp/freq or
    // moogladder's cutoff/res arguments, which produces an audible click on
    // every UI update - port glides toward the new value instead of jumping
    // to it.
    expect(VCO2_INSTR02_CSD).toMatch(/kamp\s+port\s+kampIn/);
    expect(VCO2_INSTR02_CSD).toMatch(/kcps\s+port\s+kcpsIn/);
    expect(VCO2_INSTR02_CSD).toMatch(/kcutoff\s+port\s+kcutoffIn/);
    expect(VCO2_INSTR02_CSD).toMatch(/kres\s+port\s+kresIn/);
  });
});
