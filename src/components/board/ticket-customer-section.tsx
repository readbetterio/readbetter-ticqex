"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api-client";
import { usePersistedExpanded } from "@/hooks/use-persisted-expanded";

type CustomerDetail = {
  id: string;
  username: string;
  created_at: string;
  ticket_count: number;
  custom_fields: Record<string, unknown>;
};

type CustomFieldDefinition = {
  id: string;
  key: string;
  label: string;
  type: string;
  position: number;
};

type CustomFieldRow = {
  def: CustomFieldDefinition;
  value: unknown;
};

function customerInitials(name: string): string {
  const parts = name.trim().split(/[\s@._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function hasCustomFieldValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}

function buildCustomFieldRows(
  definitions: CustomFieldDefinition[],
  values: Record<string, unknown>,
): CustomFieldRow[] {
  return [...definitions]
    .sort((a, b) => a.position - b.position)
    .map((def) => ({
      def,
      value: values[def.key],
    }));
}

function formatCustomFieldValue(type: string, value: unknown): string {
  if (!hasCustomFieldValue(value)) return "—";

  switch (type) {
    case "boolean":
      return value ? "Yes" : "No";
    case "date":
      return formatDate(String(value));
    case "json":
      return typeof value === "string" ? value : JSON.stringify(value);
    default:
      return String(value);
  }
}

export function TicketCustomerSection({
  customerId,
  displayName,
  contactAddress,
}: {
  customerId: string;
  displayName: string;
  contactAddress?: string | null;
}) {
  const { expanded, toggleExpanded, hydrated } = usePersistedExpanded(
    "ticqex.ticket-customer.expanded.v1",
    false,
  );
  const [showAllFields, setShowAllFields] = useState(false);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [definitions, setDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      setDetail(null);
      setDefinitions([]);
      setError(null);
      setShowAllFields(false);
    });

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  useEffect(() => {
    if (expanded) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setShowAllFields(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);

      void Promise.all([
        apiFetch<CustomerDetail>(`/api/v1/customers/${customerId}`),
        apiFetch<CustomFieldDefinition[]>("/api/v1/custom-fields?group=customer"),
      ])
        .then(([customer, fields]) => {
          if (!cancelled) {
            setDetail(customer);
            setDefinitions(fields);
          }
        })
        .catch((e) => {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : "Failed to load customer");
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [expanded, customerId]);

  const showContactAddress =
    contactAddress &&
    contactAddress.trim().toLowerCase() !== displayName.trim().toLowerCase();

  const fieldRows = useMemo(
    () => buildCustomFieldRows(definitions, detail?.custom_fields ?? {}),
    [definitions, detail?.custom_fields],
  );

  const populatedFieldCount = fieldRows.filter(({ value }) =>
    hasCustomFieldValue(value),
  ).length;

  const visibleFieldRows = showAllFields
    ? fieldRows
    : fieldRows.filter(({ value }) => hasCustomFieldValue(value));

  const hasHiddenFields = definitions.length > populatedFieldCount;

  return (
    <div className="-mx-4 border-t border-border">
      <button
        type="button"
        className="flex w-full items-center gap-2 border-b border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
        aria-expanded={expanded}
        onClick={toggleExpanded}
      >
        {expanded ? (
          <ChevronDown className="size-3.5 shrink-0" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0" />
        )}
        Customer
        {!expanded && (
          <span className="ml-auto min-w-0 truncate text-xs font-normal text-muted-foreground">
            {displayName}
          </span>
        )}
      </button>

      {hydrated && expanded && (
        <div className="p-4">
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}

          {!loading && error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {!loading && !error && detail && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Avatar size="sm">
                  <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                    {customerInitials(detail.username)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">
                  {detail.username}
                </span>
              </div>

              <dl className="space-y-1.5 text-xs">
                {showContactAddress && (
                  <div className="grid grid-cols-[minmax(5.5rem,8rem)_1fr] gap-x-2">
                    <dt className="text-muted-foreground">Contact</dt>
                    <dd className="break-all text-foreground">{contactAddress}</dd>
                  </div>
                )}
                <div className="grid grid-cols-[minmax(5.5rem,8rem)_1fr] gap-x-2">
                  <dt className="text-muted-foreground">Tickets</dt>
                  <dd className="text-foreground">{detail.ticket_count}</dd>
                </div>
                <div className="grid grid-cols-[minmax(5.5rem,8rem)_1fr] gap-x-2">
                  <dt className="text-muted-foreground">Member since</dt>
                  <dd className="text-foreground">
                    {formatDate(detail.created_at)}
                  </dd>
                </div>
                {visibleFieldRows.map(({ def, value }) => (
                  <div
                    key={def.id}
                    className="grid grid-cols-[minmax(5.5rem,8rem)_1fr] gap-x-2"
                  >
                    <dt className="truncate text-muted-foreground">{def.label}</dt>
                    <dd className="break-all text-foreground">
                      {formatCustomFieldValue(def.type, value)}
                    </dd>
                  </div>
                ))}
              </dl>

              {hasHiddenFields && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setShowAllFields((value) => !value)}
                >
                  {showAllFields
                    ? "Show fewer fields"
                    : `Show all fields (${definitions.length})`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
