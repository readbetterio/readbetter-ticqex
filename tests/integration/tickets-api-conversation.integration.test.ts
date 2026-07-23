import { afterEach, expect } from "vitest";
import { isChannelOperational } from "@server/config/channel-gate";
import { createAgentReply } from "@server/services/messages";
import { createTicket } from "@server/services/tickets";
import {
  adminDb,
  describeIntegration,
  staffAuth,
  signInAsSeedAdmin,
} from "../helpers/integration";

const FORM_BODY = "I was charged twice for my subscription.";
const AGENT_BODY = "Thanks for reaching out — we're looking into this.";
const OUTBOUND_BODY = "Hi — just checking in about your onboarding.";

describeIntegration("API conversation tickets", () => {
  let ticketId: string;

  afterEach(async () => {
    if (ticketId) await adminDb().from("tickets").delete().eq("id", ticketId);
  });

  it("creates conversation tickets via API and quotes form text in agent replies", async () => {
    const { userId } = await signInAsSeedAdmin();
    const auth = staffAuth(userId);
    const contactAddress = `api-conversation-${Date.now()}@ticqex.local`;

    const { ticket } = await createTicket(
      {
        kind: "conversation",
        title: "Help with billing",
        contact_address: contactAddress,
        message: { body: FORM_BODY },
      },
      auth,
    );
    ticketId = ticket.id;

    expect(ticket.kind).toBe("conversation");
    expect(ticket.channel).toBe("email");
    expect(ticket.origin).toBe("api");
    expect(ticket.contact_address).toBe(contactAddress);

    const contactMessages = ticket.messages.filter(
      (m) => m.author_type === "contact",
    );
    expect(contactMessages).toHaveLength(1);
    expect(contactMessages[0]!.channel).toBe("api");
    expect(contactMessages[0]!.body).toBe(FORM_BODY);

    const { message: reply } = await createAgentReply(
      ticketId,
      { body: AGENT_BODY, channel: "api" },
      auth,
    );

    expect(reply.body).toContain("On ");
    expect(reply.body).toContain(" wrote:");
    expect(reply.body).toContain(`> ${FORM_BODY.split("\n")[0]}`);
    expect(reply.body).toContain(AGENT_BODY);

    if (isChannelOperational("email")) {
      expect(reply.email_delivery_status).toBe("pending");
    }
  });

  it("creates agent-initiated outbound email conversations", async () => {
    if (!isChannelOperational("email")) {
      return;
    }

    const { userId } = await signInAsSeedAdmin();
    const auth = staffAuth(userId);
    const contactAddress = `outbound-init-${Date.now()}@ticqex.local`;
    const title = "Onboarding check-in";

    const { ticket, outboundMessageId } = await createTicket(
      {
        kind: "conversation",
        title,
        contact_address: contactAddress,
        outbound: {
          body: OUTBOUND_BODY,
          subject: title,
        },
        origin: "manual",
      },
      auth,
    );
    ticketId = ticket.id;

    expect(outboundMessageId).toBeTruthy();
    expect(ticket.kind).toBe("conversation");
    expect(ticket.channel).toBe("email");
    expect(ticket.origin).toBe("manual");
    expect(ticket.contact_address).toBe(contactAddress);

    const contactMessages = ticket.messages.filter(
      (m) => m.author_type === "contact",
    );
    expect(contactMessages).toHaveLength(0);

    const agentMessages = ticket.messages.filter(
      (m) => m.author_type === "agent",
    );
    expect(agentMessages).toHaveLength(1);
    expect(agentMessages[0]!.id).toBe(outboundMessageId);
    expect(agentMessages[0]!.body).toContain(OUTBOUND_BODY);
    expect(agentMessages[0]!.email_subject).toBe(title);
    expect(agentMessages[0]!.email_to).toEqual([contactAddress]);
    expect(agentMessages[0]!.email_delivery_status).toBe("pending");
    expect(agentMessages[0]!.email_subject).not.toMatch(/^Re:/i);
  });
});
