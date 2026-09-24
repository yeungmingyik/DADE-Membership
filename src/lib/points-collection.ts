export const POINTS_PER_PAGE = 10;

export function getPointsCollectionPage(points: number, requestedPage?: number | null) {
  const availablePoints = Math.max(0, points);
  const pageCount = Math.max(1, Math.ceil(availablePoints / POINTS_PER_PAGE));
  const page = Math.min(pageCount, Math.max(1, requestedPage ?? pageCount));
  const pointsBeforePage = (page - 1) * POINTS_PER_PAGE;
  const collected = Math.min(POINTS_PER_PAGE, availablePoints - pointsBeforePage);

  return { page, pageCount, collected };
}
