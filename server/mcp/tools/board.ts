import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { parseBoardSortParam } from "@server/domain/board-sort";
import { parseTicketFilterParam } from "@server/domain/ticket-filter";
import {
  boardLaneOrderSchema,
  boardMoveTicketSchema,
  parseBody,
  seedManualLaneOrdersSchema,
} from "@server/lib/validation/schemas";
import { getBoard, getLaneTicketsPage } from "@server/services/board";
import { getBoardFilterOptions } from "@server/services/board-filter-options";
import { setLaneOrder, seedManualLaneOrders } from "@server/services/board-lane-orders";
import { moveTicketOnBoard } from "@server/services/board-move";
import { registerAuthedTool, toolResult, uuid } from "../core";

export function registerBoardTools(server: McpServer) {
  registerAuthedTool(
    server,
    "ticqex_get_board",
    {
      title: "Get Board",
      description: "Get the kanban board using optional serialized filter, sort, and search values.",
      inputSchema: {
        filter: z.string().optional(),
        sort: z.string().optional(),
        q: z.string().optional(),
      },
    },
    async ({ filter, sort, q }, auth) =>
      toolResult(
        await getBoard(
          auth.userId,
          parseTicketFilterParam(filter ?? null),
          parseBoardSortParam(sort ?? null),
          q ?? "",
        ),
      ),
  );

  registerAuthedTool(
    server,
    "ticqex_get_board_filter_options",
    {
      title: "Get Board Filter Options",
      description: "List contacts, assignees, and tags that appear on the visible board.",
      inputSchema: {},
    },
    async () => toolResult(await getBoardFilterOptions()),
  );

  registerAuthedTool(
    server,
    "ticqex_get_board_lane_tickets",
    {
      title: "Get Board Lane Tickets",
      description: "Load a page of tickets for one board lane.",
      inputSchema: {
        status_id: uuid,
        offset: z.number().int().min(0),
        limit: z.number().int().min(1).max(100).optional(),
        filter: z.string().optional(),
        sort: z.string().optional(),
      },
    },
    async ({ status_id, offset, limit, filter, sort }, auth) =>
      toolResult(
        await getLaneTicketsPage(
          status_id,
          offset,
          limit ?? 25,
          auth.userId,
          parseTicketFilterParam(filter ?? null),
          parseBoardSortParam(sort ?? null),
        ),
      ),
  );

  registerAuthedTool(
    server,
    "ticqex_set_board_lane_order",
    {
      title: "Set Board Lane Order",
      description: "Persist the current user's manual order for a board lane.",
      inputSchema: { status_id: uuid, order: boardLaneOrderSchema },
    },
    async ({ status_id, order }, auth) => {
      const body = parseBody(boardLaneOrderSchema, order);
      const ticketIds = await setLaneOrder(
        auth.userId,
        status_id,
        body.ticket_ids,
        body.visible_ticket_ids?.length
          ? {
              visibleTicketIds: body.visible_ticket_ids,
              removedTicketIds: body.removed_ticket_ids,
            }
          : undefined,
      );
      return toolResult({ status_id, ticket_ids: ticketIds });
    },
  );

  registerAuthedTool(
    server,
    "ticqex_seed_manual_board_orders",
    {
      title: "Seed Manual Board Orders",
      description: "Persist multiple manual board lane orders for the current user.",
      inputSchema: seedManualLaneOrdersSchema.shape,
    },
    async (input, auth) => {
      const body = parseBody(seedManualLaneOrdersSchema, input);
      const lanes = await seedManualLaneOrders(auth.userId, body.lanes, {
        onlyIfEmpty: body.only_if_empty,
        mergeVisible: body.merge_visible,
      });
      return toolResult({ lanes });
    },
  );

  registerAuthedTool(
    server,
    "ticqex_move_ticket_on_board",
    {
      title: "Move Ticket On Board",
      description: "Move/reorder a ticket on the board and persist lane ordering.",
      inputSchema: boardMoveTicketSchema.shape,
    },
    async (input, auth) =>
      toolResult(
        await moveTicketOnBoard(
          auth.userId,
          parseBody(boardMoveTicketSchema, input),
          auth,
        ),
      ),
  );
}
