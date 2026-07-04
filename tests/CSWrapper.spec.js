import { jest } from "@jest/globals";

const mockCsoundModule = {
  Csound: jest.fn(),
};

jest.unstable_mockModule(
  "@csound/browser/dist/csound.js",
  () => mockCsoundModule,
);
const { CsoundEngine } = await import("../public/src/cswrapper.js");
const { Csound } = mockCsoundModule;

describe("CsoundEngine", () => {
  let engine;
  let mockCsoundInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock instance with all the methods CsoundEngine interacts with
    mockCsoundInstance = {
      start: jest.fn().mockResolvedValue(undefined),
      compileCSD: jest.fn().mockResolvedValue(undefined),
      readScore: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      terminateInstance: jest.fn().mockResolvedValue(undefined),
    };

    // Make the factory function return our mock instance by default
    Csound.mockResolvedValue(mockCsoundInstance);

    engine = new CsoundEngine();
  });

  describe("Initialization & start()", () => {
    it("should initialize in an unstarted state", () => {
      expect(engine.isStarted).toBe(false);
    });

    it("should initialize successfully if Csound initializes correctly", async () => {
      await engine.start();

      expect(Csound).toHaveBeenCalledTimes(1);
      expect(mockCsoundInstance.start).not.toHaveBeenCalled();
      expect(engine.isStarted).toBe(false);
    });

    it("should throw an error if Csound() factory returns null/undefined", async () => {
      Csound.mockResolvedValue(null);

      await expect(engine.start()).rejects.toThrow(
        "Csound() returned nothing - WASM failed to load.",
      );
      expect(engine.isStarted).toBe(false);
    });

    it("should do nothing if start() is called when already created", async () => {
      await engine.start();
      jest.clearAllMocks();

      await engine.start();
      expect(Csound).not.toHaveBeenCalled();
      expect(mockCsoundInstance.start).not.toHaveBeenCalled();
    });
  });

  describe("Protected operations (Assertion checks)", () => {
    it("should throw an error when calling compile() before starting", async () => {
      await expect(engine.compile("<csd>...</csd>")).rejects.toThrow(
        "CsoundEngine: call start() before using the engine.",
      );
    });

    it("should throw an error when calling sendScoreEvent() before starting", async () => {
      await expect(engine.sendScoreEvent("i 1 0 2")).rejects.toThrow(
        "CsoundEngine: call start() before using the engine.",
      );
    });
  });

  describe("Engine operations (Post-start)", () => {
    beforeEach(async () => {
      await engine.start();
      await engine.compile("<csd>test</csd>");
      jest.clearAllMocks();
    });

    it("should compile CSD text correctly", async () => {
      const testCsd = "<csd>test</csd>";
      await engine.compile(testCsd);

      expect(mockCsoundInstance.compileCSD).toHaveBeenCalledWith(testCsd, 1);
      expect(mockCsoundInstance.start).not.toHaveBeenCalled();
      expect(engine.isStarted).toBe(true);
    });

    it("should send score events correctly", async () => {
      const testScore = "i 1 0 2 60 0.5";
      await engine.sendScoreEvent(testScore);

      expect(mockCsoundInstance.readScore).toHaveBeenCalledWith(testScore);
    });

    it("should forward pause commands", async () => {
      await engine.pause();
      expect(mockCsoundInstance.pause).toHaveBeenCalledTimes(1);
    });

    it("should forward resume commands", async () => {
      await engine.resume();
      expect(mockCsoundInstance.resume).toHaveBeenCalledTimes(1);
    });
  });

  describe("Lifecycle control (Pre-start state safety)", () => {
    it("should do nothing when pausing an unstarted engine", async () => {
      await engine.pause();
      expect(mockCsoundInstance.pause).not.toHaveBeenCalled();
    });

    it("should do nothing when resuming an unstarted engine", async () => {
      await engine.resume();
      expect(mockCsoundInstance.resume).not.toHaveBeenCalled();
    });

    it("should do nothing when disposing an unstarted engine", async () => {
      await engine.dispose();
      expect(mockCsoundInstance.stop).not.toHaveBeenCalled();
    });
  });

  describe("dispose()", () => {
    it("should cleanly stop, terminate, and reset state on dispose", async () => {
      await engine.start();
      await engine.compile("<csd>test</csd>");
      jest.clearAllMocks();

      await engine.dispose();

      expect(mockCsoundInstance.stop).toHaveBeenCalledTimes(1);
      expect(mockCsoundInstance.terminateInstance).toHaveBeenCalledTimes(1);
      expect(engine.isStarted).toBe(false);
      await expect(engine.start()).resolves.toBeUndefined();
    });

    it("should safely dispose even if terminateInstance is missing on the WASM object", async () => {
      await engine.start();
      // Remove optional termination method to verify safety check
      delete mockCsoundInstance.terminateInstance;
      jest.clearAllMocks();

      await expect(engine.dispose()).resolves.not.toThrow();
      expect(mockCsoundInstance.stop).toHaveBeenCalledTimes(1);
      expect(engine.isStarted).toBe(false);
    });
  });
});
