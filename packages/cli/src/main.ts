#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { TicqexApiError } from "@ticqex/api-client";
import { runCli } from "./register-commands.js";
import { CliUsageError, EXIT_API_ERROR, EXIT_USAGE_ERROR, writeError } from "./output.js";

export async function run(argv: string[]): Promise<number> {
  try {
    return await runCli(argv);
  } catch (error) {
    if (error instanceof CliUsageError) {
      writeError(error.code, error.message);
      return EXIT_USAGE_ERROR;
    }
    if (error instanceof TicqexApiError) {
      writeError(error.code, error.message);
      return EXIT_API_ERROR;
    }
    writeError("internal_error", error instanceof Error ? error.message : "Unknown error");
    return EXIT_API_ERROR;
  }
}

const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  run(process.argv)
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      writeError(
        "internal_error",
        error instanceof Error ? error.message : "Unknown error",
      );
      process.exit(EXIT_API_ERROR);
    });
}
