import { OPERATION_CATALOG, type HttpMethod } from "@ticqex/api-spec";

function splitPath(path: string): string[] {
  return path.split("/").filter(Boolean);
}

function matchPathTemplate(template: string, path: string): boolean {
  const templateParts = splitPath(template);
  const pathParts = splitPath(path);
  if (templateParts.length !== pathParts.length) return false;

  for (let index = 0; index < templateParts.length; index++) {
    const segment = templateParts[index]!;
    const value = pathParts[index]!;
    if (segment.startsWith(":")) continue;
    if (segment !== value) return false;
  }

  return true;
}

/** Strip `/api/v1` prefix and resolve to catalog operation name. */
export function resolveOperation(
  method: string,
  requestPath: string,
): string | null {
  const normalizedPath = requestPath.replace(/^\/api\/v1/, "") || "/";
  const httpMethod = method.toUpperCase() as HttpMethod;

  for (const operation of OPERATION_CATALOG) {
    if (operation.method !== httpMethod) continue;
    if (matchPathTemplate(operation.pathTemplate, normalizedPath)) {
      return operation.name;
    }
  }

  return null;
}
