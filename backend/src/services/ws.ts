import { Server } from 'ws';
import { logger } from '../config/db';

let wss: Server | null = null;
const clients = new Set<any>();

export const initWebSocket = (server: any) => {
  wss = new Server({ server });

  wss.on('connection', (ws) => {
    logger.info('WebSocket client connected.');
    clients.add(ws);

    // Send initial greeting
    ws.send(JSON.stringify({ type: 'SYSTEM', message: 'Connected to DICC Real-time Server' }));

    ws.on('message', (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        logger.info(`Received WS message: ${JSON.stringify(parsed)}`);
        
        // Handle echo or collaborate ping
        if (parsed.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG' }));
        }
      } catch (err: any) {
        logger.error(`Error parsing WebSocket message: ${err.message}`);
      }
    });

    ws.on('close', () => {
      logger.info('WebSocket client disconnected.');
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      logger.error(`WebSocket client error: ${err.message}`);
      clients.delete(ws);
    });
  });
};

// Broadcast data to all connected clients
export const broadcast = (type: string, data: any) => {
  if (!wss) return;

  const payload = JSON.stringify({ type, timestamp: new Date(), data });
  
  clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(payload);
    }
  });
};
