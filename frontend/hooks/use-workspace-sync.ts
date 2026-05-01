import { useEffect, useRef } from "react";
import { Card, Column } from "@prisma/client";

type SyncCallbacks = {
  onCardCreated?: (card: Card) => void;
  onCardUpdated?: (card: Card) => void;
  onCardDeleted?: (data: { id: string }) => void;
  onCardMoved?: (card: Card) => void;
  onColumnCreated?: (column: Column) => void;
  onColumnUpdated?: (column: Column) => void;
  onColumnDeleted?: (data: { id: string }) => void;
  onColumnsReordered?: (data: { columns: Column[] }) => void;
};

export function useWorkspaceSync(workspaceId: string, clientId: string, callbacks: SyncCallbacks) {
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backoffRef = useRef(1000);
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // Create a mutable ref for callbacks to avoid re-triggering effect on every render
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (!workspaceId || !clientId) return;

    function connect() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource(`/api/workspaces/${workspaceId}/stream?clientId=${clientId}`);
      eventSourceRef.current = es;

      es.onopen = () => {
        // Reset backoff on successful connection
        backoffRef.current = 1000;
      };

      es.addEventListener("card:created", (e) => {
        const data = JSON.parse(e.data);
        callbacksRef.current.onCardCreated?.(data);
      });

      es.addEventListener("card:updated", (e) => {
        const data = JSON.parse(e.data);
        callbacksRef.current.onCardUpdated?.(data);
      });

      es.addEventListener("card:deleted", (e) => {
        const data = JSON.parse(e.data);
        callbacksRef.current.onCardDeleted?.(data);
      });

      es.addEventListener("card:moved", (e) => {
        const data = JSON.parse(e.data);
        callbacksRef.current.onCardMoved?.(data);
      });

      es.addEventListener("column:created", (e) => {
        const data = JSON.parse(e.data);
        callbacksRef.current.onColumnCreated?.(data);
      });

      es.addEventListener("column:updated", (e) => {
        const data = JSON.parse(e.data);
        callbacksRef.current.onColumnUpdated?.(data);
      });

      es.addEventListener("column:deleted", (e) => {
        const data = JSON.parse(e.data);
        callbacksRef.current.onColumnDeleted?.(data);
      });

      es.addEventListener("ping", () => {
        // Just a keepalive to prevent connection from dying
      });

      es.addEventListener("columns:reordered", (e) => {
        const data = JSON.parse(e.data);
        callbacksRef.current.onColumnsReordered?.(data);
      });

      es.onerror = () => {
        es.close();
        
        // Reconnect with exponential backoff (max 30s)
        const nextBackoff = Math.min(backoffRef.current * 2, 30000);
        backoffRef.current = nextBackoff;
        
        reconnectTimeoutRef.current = setTimeout(connect, nextBackoff);
      };
    }

    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [workspaceId, clientId]);
}
