/** Max tickets returned per lane in browse mode (no active search). */
export const BOARD_LANE_LIMIT = 100;

/** Max tickets returned across all lanes combined in browse mode. */
export const BOARD_TOTAL_LIMIT = 1000;

export function perLaneTicketLimit(laneCount: number): number {
  if (laneCount <= 0) return BOARD_LANE_LIMIT;
  const totalCapPerLane = Math.floor(BOARD_TOTAL_LIMIT / laneCount);
  return Math.min(BOARD_LANE_LIMIT, totalCapPerLane);
}
