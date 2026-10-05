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
