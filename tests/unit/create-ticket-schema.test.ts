import { describe, expect, it } from "vitest";
import {
  createTicketSchema,
  createTicketMcpInputSchema,
} from "@server/lib/validation/schemas";

describe("createTicketSchema conversation outbound", () => {
  it("accepts contact message intake", () => {
    const parsed = createTicketSchema.parse({
      kind: "conversation",
      title: "Billing help",
      contact_address: "user@example.com",
      message: { body: "I need help" },
    });
    expect(parsed.kind).toBe("conversation");
    if (parsed.kind === "conversation") {
      expect(parsed.message?.body).toBe("I need help");
      expect(parsed.outbound).toBeUndefined();
    }
  });

  it("accepts agent outbound init", () => {
    const parsed = createTicketSchema.parse({
      kind: "conversation",
      title: "Check-in",
      contact_address: "user@example.com",
      outbound: { body: "Hello", subject: "Check-in", cc: ["cc@example.com"] },
      origin: "manual",
    });
    expect(parsed.kind).toBe("conversation");
    if (parsed.kind === "conversation") {
      expect(parsed.outbound?.body).toBe("Hello");
      expect(parsed.outbound?.subject).toBe("Check-in");
      expect(parsed.message).toBeUndefined();
    }
  });

  it("rejects missing message and outbound", () => {
    const result = createTicketSchema.safeParse({
      kind: "conversation",
      title: "Check-in",
      contact_address: "user@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects both message and outbound", () => {
    const result = createTicketSchema.safeParse({
      kind: "conversation",
      title: "Check-in",
      contact_address: "user@example.com",
      message: { body: "form" },
      outbound: { body: "email" },
    });
    expect(result.success).toBe(false);
  });

  it("mcp schema accepts outbound", () => {
    const parsed = createTicketMcpInputSchema.parse({
      kind: "conversation",
      title: "Check-in",
      contact_address: "user@example.com",
      outbound: { body: "Hello from MCP" },
    });
    expect(parsed.outbound?.body).toBe("Hello from MCP");
  });
});
