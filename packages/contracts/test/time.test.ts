import { describe, expect, it } from "vitest";
import { shiftDateTimeDefaults, businessDate, businessDateTimeCandidates, businessDateTimeInput, businessTime, resolveBusinessDateTime } from "../src/time.js";

describe("Prague business time", () => {
  it("converts winter and summer input to unambiguous instants", () => {
    expect(resolveBusinessDateTime("2026-01-15T08:00")).toBe("2026-01-15T07:00:00.000Z");
    expect(resolveBusinessDateTime("2026-07-15T08:00")).toBe("2026-07-15T06:00:00.000Z");
  });

  it("rejects missing spring times and invalid calendar dates", () => {
    expect(businessDateTimeCandidates("2026-03-29T02:30")).toEqual([]);
    expect(() => resolveBusinessDateTime("2026-03-29T02:30")).toThrow("neexistuje");
    expect(businessDateTimeCandidates("2026-02-30T08:00")).toEqual([]);
    expect(businessDateTimeCandidates("")).toEqual([]);
  });

  it("requires an explicit choice for both occurrences of the autumn hour", () => {
    expect(businessDateTimeCandidates("2026-10-25T02:30")).toEqual([
      "2026-10-25T00:30:00.000Z", "2026-10-25T01:30:00.000Z",
    ]);
    expect(() => resolveBusinessDateTime("2026-10-25T02:30")).toThrow("dvakrát");
    expect(resolveBusinessDateTime("2026-10-25T02:30", "earlier")).toBe("2026-10-25T00:30:00.000Z");
    expect(resolveBusinessDateTime("2026-10-25T02:30", "later")).toBe("2026-10-25T01:30:00.000Z");
  });

  it("renders dates and midnight independently of the device timezone", () => {
    for (const timezone of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
      const previous = process.env.TZ;
      try {
        process.env.TZ = timezone;
        expect(businessDate("2026-10-31T23:30:00Z")).toBe("2026-11-01");
        expect(businessDateTimeInput("2026-10-31T23:00:00Z")).toBe("2026-11-01T00:00");
        expect(businessTime("2026-10-31T23:30:00Z")).toBe("00:30");
        expect(resolveBusinessDateTime("2026-10-31T22:00")).toBe("2026-10-31T21:00:00.000Z");
      } finally {
        if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
      }
    }
  });
});

describe("shift preset defaults", () => {
  it("uses the selected date and Prague clock before Admin configures hours", () => {
    expect(shiftDateTimeDefaults('2026-02-10',undefined,'2026-11-25T08:30:00Z'))
      .toEqual({start:'2026-02-10T09:30',end:'2026-02-10T09:30'});
  });
  it("supports afternoon shifts and next-calendar-day night endings across months", () => {
    expect(shiftDateTimeDefaults('2026-10-31',{startTime:'14:00',endTime:'22:00'}))
      .toEqual({start:'2026-10-31T14:00',end:'2026-10-31T22:00'});
    expect(shiftDateTimeDefaults('2026-12-31',{startTime:'22:00',endTime:'06:00'}))
      .toEqual({start:'2026-12-31T22:00',end:'2027-01-01T06:00'});
  });
  it("retains DST ambiguity for explicit resolution rather than silently choosing an instant", () => {
    const defaults=shiftDateTimeDefaults('2026-10-25',{startTime:'02:30',endTime:'10:30'});
    expect(businessDateTimeCandidates(defaults.start)).toHaveLength(2);
    expect(()=>resolveBusinessDateTime(defaults.start)).toThrow('dvakrát');
  });
});
