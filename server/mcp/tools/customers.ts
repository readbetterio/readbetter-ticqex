import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createCustomerSchema,
  parseBody,
  updateCustomerSchema,
} from "@server/lib/validation/schemas";
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
} from "@server/services/customers";
import {
  paginationInput,
  paramsFrom,
  registerAuthedTool,
  toolResult,
  uuid,
} from "../core";

export function registerCustomerTools(server: McpServer) {
  registerAuthedTool(
    server,
    "ticqex_list_customers",
    {
      title: "List Customers",
      description: "List customers.",
      inputSchema: paginationInput,
    },
    async (input) => toolResult(await listCustomers(paramsFrom(input))),
  );

  registerAuthedTool(
    server,
    "ticqex_get_customer",
    {
      title: "Get Customer",
      description: "Get a customer with ticket count and custom fields.",
      inputSchema: { id: uuid },
    },
    async ({ id }) => toolResult(await getCustomer(id)),
  );

  registerAuthedTool(
    server,
    "ticqex_create_customer",
    {
      title: "Create Customer",
      description: "Create a customer.",
      inputSchema: createCustomerSchema.shape,
    },
    async (input) => toolResult(await createCustomer(parseBody(createCustomerSchema, input))),
  );

  registerAuthedTool(
    server,
    "ticqex_update_customer",
    {
      title: "Update Customer",
      description: "Update a customer.",
      inputSchema: { id: uuid, patch: updateCustomerSchema },
    },
    async ({ id, patch }) =>
      toolResult(await updateCustomer(id, parseBody(updateCustomerSchema, patch))),
  );

  registerAuthedTool(
    server,
    "ticqex_delete_customer",
    {
      title: "Delete Customer",
      description: "Delete a customer with no existing tickets.",
      inputSchema: { id: uuid },
    },
    async ({ id }) => {
      await deleteCustomer(id);
      return toolResult({ deleted: true });
    },
  );
}
