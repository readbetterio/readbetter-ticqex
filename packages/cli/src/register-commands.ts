import { Command } from "commander";
import { authLogin, authLogout, authStatus } from "./auth.js";
import { getOperation } from "./command-catalog.js";
import { executeOperation, type GlobalOptions } from "./execute.js";
import { CliUsageError } from "./output.js";

type CommandAction = (options: GlobalOptions, command: Command) => Promise<void>;

function collectUnknownOptions(
  command: Command,
  options: GlobalOptions,
): GlobalOptions {
  const merged: GlobalOptions = { ...options };
  const rawOptions = command.optsWithGlobals();

  for (const [key, value] of Object.entries(rawOptions)) {
    if (!(key in merged)) {
      merged[key] = value;
    }
  }

  return merged;
}

function bindOperation(operationName: string): CommandAction {
  return async (options, command) => {
    const merged = collectUnknownOptions(command, options);
    await executeOperation(operationName, merged);
  };
}

function bindAuth(
  handler: (options: GlobalOptions) => Promise<void>,
): CommandAction {
  return async (options, command) => {
    const merged = collectUnknownOptions(command, options);
    await handler(merged);
  };
}

function addGlobalOptions(command: Command): Command {
  return command
    .option("--instance <url>", "Ticqex instance URL")
    .option("--api-key <key>", "API key (tq_live_*)")
    .option("--json", "Output JSON (default: true)", true);
}

function addInputOption(command: Command): Command {
  return command.option("--input <json>", "JSON input object");
}

function registerOperationCommand(
  parent: Command,
  name: string,
  description: string,
  operationName: string,
): Command {
  const operation = getOperation(operationName);
  const cmd = parent.command(name).description(description);
  addInputOption(cmd);

  if (operation) {
    for (const param of operation.pathParams) {
      cmd.option(`--${param.replace(/_/g, "-")} <value>`, `${param} path parameter`);
    }
    for (const param of operation.queryParams) {
      cmd.option(`--${param.replace(/_/g, "-")} <value>`, `${param} query parameter`);
    }
  }

  cmd.action(bindOperation(operationName));
  return cmd;
}

export function createProgram(): Command {
  const program = addGlobalOptions(new Command());
  program
    .name("ticqex")
    .description("Ticqex REST API command-line interface")
    .showHelpAfterError("(use --help for usage)");

  const call = program.command("call").description("Execute a catalog operation by MCP name");
  addInputOption(call)
    .argument("<operation>", "Operation name (e.g. ticqex_get_me)")
    .action(async (operation: string, options: GlobalOptions, command: Command) => {
      const merged = collectUnknownOptions(command, options);
      await executeOperation(operation, merged);
    });

  const auth = program.command("auth").description("Manage stored API credentials");
  auth
    .command("login")
    .description("Store API key for an instance (requires --instance)")
    .action(bindAuth(authLogin));
  auth.command("logout").description("Clear stored credentials").action(bindAuth(authLogout));
  auth.command("status").description("Show auth status").action(bindAuth(authStatus));

  const users = program.command("users").description("User operations");
  registerOperationCommand(users, "me", "Get current user", "ticqex_get_me");
  registerOperationCommand(users, "list", "List users", "ticqex_list_users");

  const tickets = program.command("tickets").description("Ticket operations");
  registerOperationCommand(tickets, "list", "List tickets", "ticqex_list_tickets");
  registerOperationCommand(tickets, "create", "Create ticket", "ticqex_create_ticket");
  registerOperationCommand(tickets, "get", "Get ticket", "ticqex_get_ticket");
  registerOperationCommand(tickets, "summary", "Get ticket summary", "ticqex_get_ticket_summary");
  registerOperationCommand(tickets, "context", "Get ticket context", "ticqex_get_ticket_context");
  registerOperationCommand(tickets, "update", "Update ticket", "ticqex_update_ticket");
  registerOperationCommand(tickets, "delete", "Delete ticket", "ticqex_delete_ticket");
  registerOperationCommand(tickets, "read", "Mark ticket read", "ticqex_mark_ticket_read");

  const ticketMessages = tickets.command("messages").description("Ticket message operations");
  registerOperationCommand(ticketMessages, "list", "List messages", "ticqex_list_ticket_messages");
  registerOperationCommand(ticketMessages, "create", "Create message", "ticqex_create_ticket_message");
  registerOperationCommand(ticketMessages, "set-read", "Set message read state", "ticqex_set_message_read");

  const ticketComments = tickets.command("comments").description("Ticket comment operations");
  registerOperationCommand(ticketComments, "list", "List comments", "ticqex_list_ticket_comments");
  registerOperationCommand(ticketComments, "create", "Create comment", "ticqex_create_ticket_comment");
  registerOperationCommand(ticketComments, "update", "Update comment", "ticqex_update_ticket_comment");
  registerOperationCommand(ticketComments, "delete", "Delete comment", "ticqex_delete_ticket_comment");

  const ticketDrafts = tickets.command("drafts").description("Ticket draft operations");
  registerOperationCommand(ticketDrafts, "list", "List drafts", "ticqex_list_ticket_drafts");
  registerOperationCommand(ticketDrafts, "create", "Create draft", "ticqex_create_ticket_draft");
  registerOperationCommand(ticketDrafts, "update", "Update draft", "ticqex_update_ticket_draft");
  registerOperationCommand(ticketDrafts, "send", "Send draft", "ticqex_send_ticket_draft");
  registerOperationCommand(ticketDrafts, "delete", "Delete draft", "ticqex_delete_ticket_draft");

  const ticketAttachments = tickets.command("attachments").description("Ticket attachment operations");
  registerOperationCommand(
    ticketAttachments,
    "stage-upload",
    "Stage attachment upload",
    "ticqex_stage_ticket_attachment_upload",
  );
  registerOperationCommand(
    ticketAttachments,
    "get-url",
    "Get attachment URL",
    "ticqex_get_attachment_url",
  );

  const board = program.command("board").description("Board operations");
  registerOperationCommand(board, "get", "Get board", "ticqex_get_board");
  registerOperationCommand(
    board,
    "filter-options",
    "Get board filter options",
    "ticqex_get_board_filter_options",
  );
  registerOperationCommand(
    board,
    "move-ticket",
    "Move ticket on board",
    "ticqex_move_ticket_on_board",
  );
  registerOperationCommand(
    board,
    "seed-manual-order",
    "Seed manual board order",
    "ticqex_seed_manual_board_orders",
  );

  const boardLanes = board.command("lanes").description("Board lane operations");
  registerOperationCommand(
    boardLanes,
    "tickets",
    "List lane tickets",
    "ticqex_get_board_lane_tickets",
  );
  registerOperationCommand(
    boardLanes,
    "set-order",
    "Set lane order",
    "ticqex_set_board_lane_order",
  );

  const contacts = program.command("contacts").description("Contact operations");
  registerOperationCommand(contacts, "list", "List contacts", "ticqex_list_contacts");
  registerOperationCommand(contacts, "get", "Get contact", "ticqex_get_contact");
  registerOperationCommand(contacts, "create", "Create contact", "ticqex_create_contact");
  registerOperationCommand(contacts, "update", "Update contact", "ticqex_update_contact");
  registerOperationCommand(contacts, "delete", "Delete contact", "ticqex_delete_contact");

  const tags = program.command("tags").description("Tag operations");
  registerOperationCommand(tags, "list", "List tags", "ticqex_list_tags");
  registerOperationCommand(tags, "create", "Create tag", "ticqex_create_tag");
  registerOperationCommand(tags, "update", "Update tag", "ticqex_update_tag");
  registerOperationCommand(tags, "delete", "Delete tag", "ticqex_delete_tag");

  const statuses = program.command("statuses").description("Status operations");
  registerOperationCommand(statuses, "list", "List statuses", "ticqex_list_statuses");
  registerOperationCommand(statuses, "create", "Create status", "ticqex_create_status");
  registerOperationCommand(statuses, "update", "Update status", "ticqex_update_status");
  registerOperationCommand(statuses, "delete", "Delete status", "ticqex_delete_status");
  registerOperationCommand(statuses, "reorder", "Reorder statuses", "ticqex_reorder_statuses");

  const customFields = program.command("custom-fields").description("Custom field operations");
  registerOperationCommand(customFields, "list", "List custom fields", "ticqex_list_custom_fields");
  registerOperationCommand(customFields, "create", "Create custom field", "ticqex_create_custom_field");
  registerOperationCommand(customFields, "update", "Update custom field", "ticqex_update_custom_field");
  registerOperationCommand(customFields, "delete", "Delete custom field", "ticqex_delete_custom_field");
  registerOperationCommand(
    customFields,
    "reorder",
    "Reorder custom fields",
    "ticqex_reorder_custom_fields",
  );

  const settings = program.command("settings").description("Settings operations");
  registerOperationCommand(settings, "get", "Get settings", "ticqex_get_settings");
  registerOperationCommand(settings, "patch", "Patch settings", "ticqex_patch_settings");

  const emailSnippets = program.command("email-snippets").description("Email snippet operations");
  registerOperationCommand(
    emailSnippets,
    "list",
    "List email snippets",
    "ticqex_list_email_snippets",
  );
  registerOperationCommand(
    emailSnippets,
    "create",
    "Create email snippet",
    "ticqex_create_email_snippet",
  );
  registerOperationCommand(
    emailSnippets,
    "delete",
    "Delete email snippet",
    "ticqex_delete_email_snippet",
  );

  const apiKeys = program.command("api-keys").description("API key management (admin, REST-only)");
  registerOperationCommand(apiKeys, "list", "List API keys", "ticqex_list_api_keys");
  registerOperationCommand(apiKeys, "create", "Create API key", "ticqex_create_api_key");
  registerOperationCommand(apiKeys, "revoke", "Revoke API key", "ticqex_revoke_api_key");

  return program;
}

export async function runCli(argv: string[]): Promise<number> {
  const program = createProgram();

  try {
    await program.parseAsync(argv);
    return 0;
  } catch (error) {
    if (error instanceof CliUsageError) {
      throw error;
    }
    throw error;
  }
}
