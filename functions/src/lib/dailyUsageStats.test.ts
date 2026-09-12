import { dateKey, dayBoundsUtc, topCategoriesFromCounts, topFeatureTapsFromCounts, diffCumulative } from "./dailyUsageStats";

describe("dateKey", () => {
  test("formats a UTC date as YYYY-MM-DD", () => {
    expect(dateKey(new Date("2026-09-12T23:59:59.999Z"))).toBe("2026-09-12");
  });
  test("a time just past midnight UTC belongs to the new day, not the old one", () => {
    expect(dateKey(new Date("2026-09-13T00:00:00.001Z"))).toBe("2026-09-13");
  });
});

describe("dayBoundsUtc", () => {
  test("start is midnight UTC and end is exactly 24 hours later", () => {
    const { start, end } = dayBoundsUtc("2026-09-12");
    expect(start.toISOString()).toBe("2026-09-12T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-09-13T00:00:00.000Z");
  });
});

describe("topCategoriesFromCounts", () => {
  test("sorts descending and truncates to n", () => {
    const result = topCategoriesFromCounts({ a: 3, b: 10, c: 1, d: 7 }, 2);
    expect(result).toEqual([
      { categoryId: "b", count: 10 },
      { categoryId: "d", count: 7 },
    ]);
  });
  test("empty input yields an empty list", () => {
    expect(topCategoriesFromCounts({}, 5)).toEqual([]);
  });
});

describe("topFeatureTapsFromCounts", () => {
  test("sorts descending and truncates to n", () => {
    const result = topFeatureTapsFromCounts({ create_lesson: 12, top_up: 3, open_billing: 7 }, 2);
    expect(result).toEqual([
      { feature: "create_lesson", count: 12 },
      { feature: "open_billing", count: 7 },
    ]);
  });
  test("empty input yields an empty list", () => {
    expect(topFeatureTapsFromCounts({}, 5)).toEqual([]);
  });
});

describe("diffCumulative", () => {
  test("no prior snapshot yields null, not zero", () => {
    expect(diffCumulative(500, null)).toBeNull();
  });
  test("normal growth diffs cleanly", () => {
    expect(diffCumulative(500, 420)).toBe(80);
  });
  test("a drop (deleted content taking its counts with it) clamps at 0, never negative", () => {
    expect(diffCumulative(400, 420)).toBe(0);
  });
  test("no change is zero", () => {
    expect(diffCumulative(420, 420)).toBe(0);
  });
});
