export type LaneTicketsPageResponse = {
  status: { id: string; name: string; color: string };
  tickets: Array<{ id: string } & Record<string, unknown>>;
  total_count: number;
  has_more: boolean;
  offset: number;
};
