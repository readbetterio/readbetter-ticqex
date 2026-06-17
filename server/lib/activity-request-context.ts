import { AsyncLocalStorage } from "node:async_hooks";
import type { AuthContext } from "@server/middleware/auth";

export type ActivityRequestMetadata = {
  requestId: string;
  requestMethod: string;
  requestPath: string;
  operation: string | null;
  source: "ui" | "api" | "mcp";
  auth?: AuthContext;
};

export class ActivityRecorder {
  #domainEventCount = 0;

  hasDomainActivity(): boolean {
    return this.#domainEventCount > 0;
  }

  markDomainActivity(): void {
    this.#domainEventCount += 1;
  }
}

export type ActivityRequestStore = ActivityRequestMetadata & {
  recorder: ActivityRecorder;
};

const storage = new AsyncLocalStorage<ActivityRequestStore>();

export function createActivityRequestStore(
  metadata: ActivityRequestMetadata,
): ActivityRequestStore {
  return {
    ...metadata,
    recorder: new ActivityRecorder(),
  };
}

export function runWithActivityRequestContext<T>(
  store: ActivityRequestStore,
  fn: () => T,
): T {
  return storage.run(store, fn);
}

export function getActivityRequestContext(): ActivityRequestMetadata | undefined {
  const store = storage.getStore();
  if (!store) return undefined;

  return {
    requestId: store.requestId,
    requestMethod: store.requestMethod,
    requestPath: store.requestPath,
    operation: store.operation,
    source: store.source,
    auth: store.auth,
  };
}

export function getActivityRecorder(): ActivityRecorder | undefined {
  return storage.getStore()?.recorder;
}
