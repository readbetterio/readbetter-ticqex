import { NextRequest } from "next/server";
import { jsonList } from "@server/lib/response";
import { withAuth } from "@server/lib/route-handler";
import { listActivityEvents } from "@server/services/activity";
import {
  tryParseActivityAction,
  tryParseActivityOutcome,
  tryParseActivitySource,
} from "@shared/activity/parse";
import type { ActivityListFilters } from "@shared/activity/types";

function parseFilters(searchParams: URLSearchParams): ActivityListFilters {
  const statusCode = searchParams.get("status_code");
  return {
    actor_user_id: searchParams.get("actor_user_id") ?? undefined,
    api_key_id: searchParams.get("api_key_id") ?? undefined,
    source: tryParseActivitySource(searchParams.get("source")),
    action: tryParseActivityAction(searchParams.get("action")),
    outcome: tryParseActivityOutcome(searchParams.get("outcome")),
    target_type: searchParams.get("target_type") ?? undefined,
    operation: searchParams.get("operation") ?? undefined,
    request_method: searchParams.get("request_method") ?? undefined,
    request_path: searchParams.get("request_path") ?? undefined,
    status_code: statusCode ? Number(statusCode) : undefined,
    occurred_after: searchParams.get("occurred_after") ?? undefined,
    occurred_before: searchParams.get("occurred_before") ?? undefined,
    hide_self_referential:
      searchParams.get("hide_self_referential") !== "false",
  };
}

export async function GET(request: NextRequest) {
  return withAuth(
    request,
    async () => {
      const filters = parseFilters(request.nextUrl.searchParams);
      const result = await listActivityEvents(request.nextUrl.searchParams, filters);
      return jsonList(result.events, {
        total: result.total,
        page: result.page,
        per_page: result.perPage,
      });
    },
    { admin: true },
  );
}
