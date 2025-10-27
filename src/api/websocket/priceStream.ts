import { Server } from 'socket.io';
import { logger } from '../../utils/logger';
import { priceStreamService } from '../../services/priceStreamService';

/**
 * Setup WebSocket server for real-time price streaming
 */
export function setupPriceStream(io: Server): void {
  // Start the price streaming service
  priceStreamService.start();

  // Emit cached updates every second
  setInterval(() => {
    const updates = priceStreamService.getCachedUpdates();
    
    for (const [roomId, update] of updates.entries()) {
      io.to(roomId).emit('price-update', update);
      priceStreamService.clearCache(roomId);
    }
  }, 1000);

  io.on('connection', (socket) => {
    logger.info('WebSocket client connected', { socketId: socket.id });

    // Handle subscription to price updates
    socket.on('subscribe', (data: { 
      inputMint: string; 
      outputMint: string;
      amount?: string;
    }) => {
      const roomId = `${data.inputMint}-${data.outputMint}`;
      socket.join(roomId);

      // Subscribe to price service
      priceStreamService.subscribe(socket.id, data.inputMint, data.outputMint, data.amount);

      // Get cached update if available
      const cachedUpdate = priceStreamService.getCachedUpdates().get(roomId);
      if (cachedUpdate) {
        socket.emit('price-update', cachedUpdate);
      }
    });

    // Handle unsubscription
    socket.on('unsubscribe', (data: { inputMint: string; outputMint: string }) => {
      const roomId = `${data.inputMint}-${data.outputMint}`;
      socket.leave(roomId);
      
      priceStreamService.unsubscribe(socket.id, data.inputMint, data.outputMint);
      
      logger.info('Client unsubscribed from price updates', {
        socketId: socket.id,
        roomId,
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      // Clean up subscriptions
      priceStreamService.subscriptions.forEach((subscribers, roomId) => {
        const [inputMint, outputMint] = roomId.split('-');
        const index = subscribers.findIndex(sub => sub.socketId === socket.id);
        if (index !== -1) {
          priceStreamService.unsubscribe(socket.id, inputMint, outputMint);
        }
      });

      logger.info('WebSocket client disconnected', { socketId: socket.id });
    });
  });

  logger.info('WebSocket price streaming initialized');
}

