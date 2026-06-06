import { afterEach, expect } from "vitest";
import { createApiKey, revokeApiKey } from "@server/services/api-keys";
import {
  createTicketComment,
  deleteTicketComment,
  listTicketComments,
  updateTicketComment,
} from "@server/services/comments";
import { patchSettings } from "@server/services/settings";
import {
  adminDb,
  describeIntegration,
  insertMinimalTicket,
  staffAuth,
  signInAsSeedAdmin,
} from "../helpers/integration";

describeIntegration("ticket comments API", () => {
  let ticketId: string;
  let apiKeyId: string | undefined;

  afterEach(async () => {
    if (ticketId) await adminDb().from("tickets").delete().eq("id", ticketId);
    if (apiKeyId) await adminDb().from("api_keys").delete().eq("id", apiKeyId);
    await patchSettings({ comment_thread_order: "oldest_first" });
  });

  it("creates, lists, updates, and hard-deletes comments for staff and API keys", async () => {
    const { userId } = await signInAsSeedAdmin();
    const auth = staffAuth(userId);
    const ticket = await insertMinimalTicket({
      title: `comments-${Date.now()}`,
      kind: "task",
      body: "Task body",
    });
    ticketId = ticket.id;

    const staffComment = await createTicketComment(
      ticketId,
      { body: "First internal note" },
      auth,
    );
    expect(staffComment.author_type).toBe("agent");
    expect(staffComment.author_label).toBeTruthy();
    expect(staffComment.body).toBe("First internal note");

    const createdKey = await createApiKey("Comments integration key", userId);
    apiKeyId = createdKey.id;
    const apiAuth = {
      type: "api_key" as const,
      userId,
      role: "admin" as const,
      apiKeyId: createdKey.id,
    };

    const apiComment = await createTicketComment(
      ticketId,
      { body: "API-authored **markdown** note" },
      apiAuth,
    );
    expect(apiComment.author_type).toBe("api_key");
    expect(apiComment.author_label).toBe("Comments integration key");

    const listed = await listTicketComments(
      ticketId,
      new URLSearchParams({ page: "1", per_page: "25" }),
    );
    expect(listed.total).toBe(2);
    expect(listed.comments.map((c) => c.id)).toEqual([
      staffComment.id,
      apiComment.id,
    ]);

    await patchSettings({ comment_thread_order: "newest_first" });
    const newestFirst = await listTicketComments(
      ticketId,
      new URLSearchParams({ page: "1", per_page: "25" }),
    );
    expect(newestFirst.order).toBe("newest_first");
    expect(newestFirst.comments.map((c) => c.id)).toEqual([
      apiComment.id,
      staffComment.id,
    ]);

    const updated = await updateTicketComment(
      ticketId,
      staffComment.id,
      { body: "Updated note" },
      auth,
    );
    expect(updated.body).toBe("Updated note");
    expect(updated.author_label).toBe(staffComment.author_label);

    await expect(
      updateTicketComment(
        ticketId,
        apiComment.id,
        { body: "Should fail" },
        auth,
      ),
    ).rejects.toMatchObject({ code: "forbidden" });

    const apiUpdated = await updateTicketComment(
      ticketId,
      apiComment.id,
      { body: "Updated by API key" },
      apiAuth,
    );
    expect(apiUpdated.body).toBe("Updated by API key");

    await revokeApiKey(createdKey.id);
    const afterRevoke = await listTicketComments(
      ticketId,
      new URLSearchParams({ page: "1", per_page: "25" }),
    );
    const revokedComment = afterRevoke.comments.find((c) => c.id === apiComment.id);
    expect(revokedComment?.author_label).toBe("Deleted API key");

    await deleteTicketComment(ticketId, staffComment.id, auth);
    const afterDelete = await listTicketComments(
      ticketId,
      new URLSearchParams({ page: "1", per_page: "25" }),
    );
    expect(afterDelete.total).toBe(1);
    expect(afterDelete.comments[0]?.id).toBe(apiComment.id);
  });

  it("returns can_manage true for own agent comments and false for api_key comments", async () => {
    const { userId } = await signInAsSeedAdmin();
    const auth = staffAuth(userId);
    const ticket = await insertMinimalTicket({
      title: `comments-can-manage-${Date.now()}`,
      kind: "task",
      body: "Task body",
    });
    ticketId = ticket.id;

    const staffComment = await createTicketComment(
      ticketId,
      { body: "Staff-authored note" },
      auth,
    );

    const createdKey = await createApiKey("can_manage integration key", userId);
    apiKeyId = createdKey.id;
    const apiAuth = {
      type: "api_key" as const,
      userId,
      role: "admin" as const,
      apiKeyId: createdKey.id,
    };

    const apiComment = await createTicketComment(
      ticketId,
      { body: "API-authored note" },
      apiAuth,
    );

    const listed = await listTicketComments(
      ticketId,
      new URLSearchParams({ page: "1", per_page: "25" }),
      auth,
    );

    const ownComment = listed.comments.find((c) => c.id === staffComment.id);
    const apiKeyComment = listed.comments.find((c) => c.id === apiComment.id);

    expect(ownComment?.can_manage).toBe(true);
    expect(apiKeyComment?.can_manage).toBe(false);
  });
});
