import { describe, expect, it } from "vitest";
import { getPointsCollectionPage, POINTS_PER_PAGE } from "@/lib/points-collection";

describe("points collection pages", () => {
  it.each([0, -1, -500, -Number.MAX_SAFE_INTEGER])("shows an empty page for a balance of %s", points => {
    expect(getPointsCollectionPage(points)).toEqual({ page: 1, pageCount: 1, collected: 0 });
  });

  it.each([1, 10, 28, 100, 101])("preserves the exact balance across every page for %s points", points => {
    const { pageCount } = getPointsCollectionPage(points);
    const collected = Array.from({ length: pageCount }, (_, index) => getPointsCollectionPage(points, index + 1).collected);
    expect(collected.reduce((sum, count) => sum + count, 0)).toBe(points);
    expect(collected.every(count => count >= 0 && count <= POINTS_PER_PAGE)).toBe(true);
  });

  it("opens the last populated page without adding a blank page at a full boundary", () => {
    expect(getPointsCollectionPage(10)).toEqual({ page: 1, pageCount: 1, collected: 10 });
    expect(getPointsCollectionPage(28)).toEqual({ page: 3, pageCount: 3, collected: 8 });
  });

  it("clamps a selected page after the balance falls", () => {
    expect(getPointsCollectionPage(7, 3)).toEqual({ page: 1, pageCount: 1, collected: 7 });
    expect(getPointsCollectionPage(28, 0)).toEqual({ page: 1, pageCount: 3, collected: 10 });
  });

  it("keeps the largest supported balance exact without overflowing the final slot", () => {
    const lastPage = getPointsCollectionPage(Number.MAX_SAFE_INTEGER);
    expect(lastPage).toEqual({ page: 900719925474100, pageCount: 900719925474100, collected: 1 });
    expect(getPointsCollectionPage(Number.MAX_SAFE_INTEGER, lastPage.page - 1).collected).toBe(10);
    expect((lastPage.pageCount - 1) * POINTS_PER_PAGE + lastPage.collected).toBe(Number.MAX_SAFE_INTEGER);
  });
});
