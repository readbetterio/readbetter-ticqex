import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createContactSchema,
  parseBody,
  updateContactSchema,
} from "@server/lib/validation/schemas";
import {
  createContact,
  deleteContact,
  getContact,
  listContacts,
  updateContact,
} from "@server/services/contacts";
import {
  paginationInput,
  paramsFrom,
  registerAuthedTool,
  toolResult,
  uuid,
} from "../core";

export function registerContactTools(server: McpServer) {
  registerAuthedTool(
    server,
    "ticqex_list_contacts",
    {
      title: "List Contacts",
      description: "List contacts.",
      inputSchema: paginationInput,
    },
    async (input) => toolResult(await listContacts(paramsFrom(input))),
  );

  registerAuthedTool(
    server,
    "ticqex_get_contact",
    {
      title: "Get Contact",
      description: "Get a contact with ticket count and custom fields.",
      inputSchema: { id: uuid },
    },
    async ({ id }) => toolResult(await getContact(id)),
  );

  registerAuthedTool(
    server,
    "ticqex_create_contact",
    {
      title: "Create Contact",
      description: "Create a contact.",
      inputSchema: createContactSchema.shape,
    },
    async (input) => toolResult(await createContact(parseBody(createContactSchema, input))),
  );

  registerAuthedTool(
    server,
    "ticqex_update_contact",
    {
      title: "Update Contact",
      description: "Update a contact.",
      inputSchema: { id: uuid, patch: updateContactSchema },
    },
    async ({ id, patch }) =>
      toolResult(await updateContact(id, parseBody(updateContactSchema, patch))),
  );

  registerAuthedTool(
    server,
    "ticqex_delete_contact",
    {
      title: "Delete Contact",
      description: "Delete a contact with no existing tickets.",
      inputSchema: { id: uuid },
    },
    async ({ id }) => {
      await deleteContact(id);
      return toolResult({ deleted: true });
    },
  );
}
