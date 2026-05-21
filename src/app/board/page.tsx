import { AppShell } from "@/components/layout/app-shell";
import { KanbanBoard } from "@/components/board/kanban-board";

export default function BoardPage() {
  return (
    <AppShell>
      <div className="flex h-[calc(100svh-3.5rem)] min-h-0 flex-1 flex-col">
        <KanbanBoard />
      </div>
    </AppShell>
  );
}
