import { AppShell } from "@/components/layout/app-shell";
import { KanbanBoard } from "@/components/board/kanban-board";

export default function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <KanbanBoard>{children}</KanbanBoard>
    </AppShell>
  );
}
