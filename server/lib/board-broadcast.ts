import { createAdminClient } from "@server/lib/supabase-admin";
import {
  BOARD_REFRESH_EVENT,
  BOARD_UPDATES_CHANNEL,
} from "@shared/board-broadcast";

async function broadcastBoardRefresh(): Promise<void> {
  const supabase = createAdminClient();
  const channel = supabase.channel(BOARD_UPDATES_CHANNEL);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      void supabase.removeChannel(channel);
      reject(new Error("Board refresh broadcast timed out"));
    }, 5_000);

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.send({
          type: "broadcast",
          event: BOARD_REFRESH_EVENT,
          payload: {},
        });
        clearTimeout(timeout);
        await supabase.removeChannel(channel);
        resolve();
        return;
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timeout);
        void supabase.removeChannel(channel);
        reject(new Error(`Board refresh broadcast failed: ${status}`));
      }
    });
  });
}

/** Best-effort signal for open board clients to refetch after server-side mutations. */
export function notifyBoardRefresh(): void {
  void broadcastBoardRefresh().catch(() => {
    // Realtime is best-effort; clients still refetch on focus or manual refresh.
  });
}
