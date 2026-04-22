// lib/sse.ts
export type BroadcastEvent =
  | "card:created"
  | "card:updated"
  | "card:deleted"
  | "card:moved"
  | "column:created"
  | "column:updated"
  | "column:deleted"
  | "columns:reordered";

interface Client {
  controller: ReadableStreamDefaultController;
  clientId: string;
}

// Global variable to maintain connections across hot reloads in development
// and keep state in the Node.js process.
const globalForSse = globalThis as unknown as {
  sseConnections: Map<string, Set<Client>>;
};

export const connections = globalForSse.sseConnections || new Map<string, Set<Client>>();

if (process.env.NODE_ENV !== "production") {
  globalForSse.sseConnections = connections;
}

export function broadcast(
  workspaceId: string,
  event: BroadcastEvent,
  data: any,
  senderId?: string
) {
  const workspaceClients = connections.get(workspaceId);

  if (!workspaceClients || workspaceClients.size === 0) {
    return;
  }

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  workspaceClients.forEach((client) => {
    // Optionally skip sending to the client that originated the change
    if (senderId && client.clientId === senderId) {
      return;
    }

    try {
      client.controller.enqueue(new TextEncoder().encode(payload));
    } catch (err) {
      console.error("Error broadcasting to client, removing:", err);
      workspaceClients.delete(client);
    }
  });

  // Cleanup if empty
  if (workspaceClients.size === 0) {
    connections.delete(workspaceId);
  }
}
