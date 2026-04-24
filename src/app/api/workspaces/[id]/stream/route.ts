import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { connections } from "@/lib/sse";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const params = await context.params;
  const workspaceId = params.id;
  const clientId = request.nextUrl.searchParams.get("clientId") || crypto.randomUUID();

  // Validate workspace access
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace || workspace.userId !== session.user.id) {
    return new NextResponse("Not Found", { status: 404 });
  }

  let clientController: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(controller) {
      clientController = controller;

      if (!connections.has(workspaceId)) {
        connections.set(workspaceId, new Set());
      }
      
      const workspaceClients = connections.get(workspaceId)!;
      workspaceClients.add({ controller, clientId });

      // Send initial connected event
      controller.enqueue(
        new TextEncoder().encode(`event: connected\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`)
      );

      // Keepalive ping every 30 seconds
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`event: ping\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`));
        } catch (e) {
          clearInterval(pingInterval);
        }
      }, 30000);

      // Store interval so we can clear it on cancel
      (controller as any)._pingInterval = pingInterval;
    },
    cancel(controller) {
      if ((controller as any)._pingInterval) {
        clearInterval((controller as any)._pingInterval);
      }
      
      if (clientController && connections.has(workspaceId)) {
        const workspaceClients = connections.get(workspaceId)!;
        
        // Find and remove this specific client
        for (const client of workspaceClients) {
          if (client.controller === clientController) {
            workspaceClients.delete(client);
            break;
          }
        }

        if (workspaceClients.size === 0) {
          connections.delete(workspaceId);
        }
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable Nginx buffering if behind proxy
    },
  });
}
