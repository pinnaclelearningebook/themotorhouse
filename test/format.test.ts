import { describe, expect, it } from "vitest";
import { titleCaseVehicle } from "../lib/format";

describe("vehicle text casing", () => {
  it("turns DVLA capitals into sentence case", () => {
    expect(titleCaseVehicle("LAND ROVER")).toBe("Land Rover");
    expect(titleCaseVehicle("DISCOVERY SPORT")).toBe("Discovery Sport");
    expect(titleCaseVehicle("SANTORINI BLACK")).toBe("Santorini Black");
    expect(titleCaseVehicle("DIESEL")).toBe("Diesel");
  });

  it("leaves genuine initialisms alone", () => {
    expect(titleCaseVehicle("BMW")).toBe("BMW");
    expect(titleCaseVehicle("MERCEDES-BENZ GLE")).toBe("Mercedes-Benz GLE");
    expect(titleCaseVehicle("ROLLS-ROYCE")).toBe("Rolls-Royce");
  });

  it("is stable on already-cased input", () => {
    expect(titleCaseVehicle("Land Rover")).toBe("Land Rover");
  });
});

describe("titleCaseVehicle on derivatives", () => {
  // Added after a logged comparable rendered "110 D300 X-DYNAMIC HSE" as
  // "110 D300 X-Dynamic Hse". Trim acronyms live in derivative strings,
  // which only reached the UI with the comparables logger.
  it("keeps trim acronyms upper case", () => {
    expect(titleCaseVehicle("110 D300 X-DYNAMIC HSE")).toBe(
      "110 D300 X-Dynamic HSE",
    );
    expect(titleCaseVehicle("RANGE ROVER SPORT SVR")).toBe(
      "Range Rover Sport SVR",
    );
    expect(titleCaseVehicle("DISCOVERY SPORT SE TD4")).toBe(
      "Discovery Sport SE TD4",
    );
  });

  it("still lower-cases ordinary words in a derivative", () => {
    expect(titleCaseVehicle("AUTOBIOGRAPHY DYNAMIC")).toBe(
      "Autobiography Dynamic",
    );
  });
});
