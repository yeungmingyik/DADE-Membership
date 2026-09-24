import { describe, expect, it } from "vitest";
import { normalizePhone, parseRegistrationPhone } from "../src/lib/phone";

describe("international registration phone", () => {
  it("defaults local numbers to Singapore", () => {
    expect(normalizePhone("8123 4567")).toBe("+6581234567");
    expect(parseRegistrationPhone("8123 4567")).toEqual({
      e164: "+6581234567",
      country: "SG",
      callingCode: "65",
      nationalNumber: "81234567",
    });
  });

  it("honors complete international numbers over the selected default", () => {
    expect(normalizePhone("+44 7911 123456", "SG")).toBe("+447911123456");
    expect(normalizePhone("+1 (202) 555-0123", "SG")).toBe("+12025550123");
    expect(normalizePhone("020 7946 0018", "GB")).toBe("+442079460018");
    expect(normalizePhone("138 1234 5678", "CN")).toBe("+8613812345678");
  });

  it.each([
    "",
    "12345678",
    "+65 1234 5678",
    "+99981234567",
    "call me at +6581234567",
    "+6581234567 ext 123",
    "+6581234567;123",
    "+6581234567\n",
    "++6581234567",
    "8".repeat(65),
  ])("rejects malformed or invalid input %j", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});
