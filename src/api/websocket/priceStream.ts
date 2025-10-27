import { Server } from 'socket.io';
import { logger } from '../../utils/logger';

/**
 * Setup WebSocket server for real-time price streaming
 */
export function setupPriceStream(io: Server): void {
  io.on('connection', (socket) => {
    logger.info('WebSocket client connected', { socketId: socket.id });

    // Handle subscription to price updates
    socket.on('subscribe', (data: { inputMint: string; outputMint: string }) => {
      logger.info('Client subscribed to price updates', {
        socketId: socket.id,
        inputMint: data.inputMint,
        outputMint: data.outputMint,
      });

      // Join room for this token pair
      const roomId = `${data.inputMint}-${data.outputMint}`;
      socket.join(roomId);

      // Send initial price (mock for now)
      socket.emit('price-update', {
        inputMint: data.inputMint,
        outputMint: data.outputMint,
        rate: '0.12',
        timestamp: Date.now(),
        source: 'Jupiter',
        confidence: 0.95,
        mevRisk: 'low',
      });
    });

    // Handle unsubscription
    socket.on('unsubscribe', (data: { inputMint: string; outputMint: string }) => {
      const roomId = `${data.inputMint}-${data.outputMint}`;
      socket.leave(roomId);
      logger.info('Client unsubscribed from price updates', {
        socketId: socket.id,
        roomId,
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info('WebSocket client disconnected', { socketId: socket.id });
    });
  });

  logger.info('WebSocket price streaming initialized');
}

