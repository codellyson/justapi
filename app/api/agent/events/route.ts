import { agentHub } from "@/src/server/agent-hub";

export const dynamic = "force-dynamic";

/** SSE stream the open canvas subscribes to for agent-pushed work. */
export async function GET() {
  const encoder = new TextEncoder();
  let clientRef: { send: (e: string, d: unknown) => void; close: () => void };

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };
      clientRef = {
        send,
        close: () => {
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        },
      };
      agentHub.addClient(clientRef);
      send("connected", { flows: agentHub.list() });
    },
    cancel() {
      if (clientRef) agentHub.removeClient(clientRef);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
