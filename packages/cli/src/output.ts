export class CliUsageError extends Error {
  readonly code: string;

  constructor(message: string, code = "usage_error") {
    super(message);
    this.name = "CliUsageError";
    this.code = code;
  }
}

export type ErrorPayload = {
  error: {
    code: string;
    message: string;
  };
};

export function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function writeError(code: string, message: string): void {
  const payload: ErrorPayload = {
    error: { code, message },
  };
  process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
}

export const EXIT_API_ERROR = 1;
export const EXIT_USAGE_ERROR = 2;

export function exitWithUsageError(message: string, code = "usage_error"): never {
  writeError(code, message);
  process.exit(EXIT_USAGE_ERROR);
}

export function exitWithApiError(code: string, message: string): never {
  writeError(code, message);
  process.exit(EXIT_API_ERROR);
}
