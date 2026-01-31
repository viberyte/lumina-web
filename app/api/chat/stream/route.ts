import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const dbPath = '/opt/viberyte/lumina-web/data/lumina.db';

// In-memory store for active connections
const connections = new Map<string, Set<any>>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const room_slug = searchParams.get('room_slug');

  if (!room_slug) {
    return NextResponse.json({ error: 'Missing room_slug' }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to the room
      if (!connections.has(room_slug)) {
        connections.set(room_slug, new Set());
      }
      connections.get(room_slug)!.add(controller);

      // Send initial connection message
      const data = `data: ${JSON.stringify({ type: 'connected', room: room_slug })}\n\n`;
      controller.enqueue(encoder.encode(data));

      // Heartbeat every 30 seconds
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (e) {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        const roomConnections = connections.get(room_slug);
        if (roomConnections) {
          roomConnections.delete(controller);
          if (roomConnections.size === 0) {
            connections.delete(room_slug);
          }
        }
        try {
          controller.close();
        } catch (e) {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// Helper function to broadcast message to room (called from messages POST)
export function broadcastToRoom(room_slug: string, message: any) {
  const roomConnections = connections.get(room_slug);
  if (!roomConnections) return;

  const encoder = new TextEncoder();
  const data = `data: ${JSON.stringify({ type: 'new_message', message })}\n\n`;
  const encoded = encoder.encode(data);

  roomConnections.forEach(controller => {
    try {
      controller.enqueue(encoded);
    } catch (e) {
      roomConnections.delete(controller);
    }
  });
}
