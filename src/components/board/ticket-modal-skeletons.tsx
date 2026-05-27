import { Skeleton } from "@/components/ui/skeleton";

export function TicketMetaSkeleton() {
  return (
    <div className="space-y-3 border-b border-border p-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-32" />
      </div>
    </div>
  );
}

export function TicketConversationSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-border">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <Skeleton className="size-3.5" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-hidden p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border p-3">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
      <div className="border-t border-border p-4">
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
