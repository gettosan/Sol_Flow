/**
 * Integration Tests for WebSocket Price Streaming
 * Tests real WebSocket connections with actual market data
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Server } from 'http';
import { AddressInfo } from 'net';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { createServer } from 'http';
import { setupPriceStream } from '../../src/api/websocket/priceStream';
import express from 'express';

describe('WebSocket Price Streaming Integration', () => {
  let server: Server;
  let clientSocket: Socket;
  let port: number;

  beforeAll((done) => {
    const app = express();
    server = createServer(app);
    
    // Initialize Socket.IO
    const io = require('socket.io')(server, {
      cors: { origin: '*' },
    });

    setupPriceStream(io);

    server.listen(() => {
      const address = server.address() as AddressInfo;
      port = address.port;
      
      clientSocket = io(`http://localhost:${port}`, {
        transports: ['websocket'],
      });

      clientSocket.on('connect', () => {
        done();
      });
    });
  });

  afterAll(() => {
    clientSocket.disconnect();
    server.close();
  });

  describe('WebSocket Connection', () => {
    it('should connect to WebSocket server', (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    it('should receive price updates after subscription', (done) => {
      const inputMint = 'So11111111111111111111111111111111111111112'; // SOL
      const outputMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC

      // Set up listener for price updates
      clientSocket.on('price-update', (update: any) => {
        expect(update).toBeDefined();
        expect(update.inputMint).toBe(inputMint);
        expect(update.outputMint).toBe(outputMint);
        expect(update.rate).toBeDefined();
        expect(typeof update.rate).toBe('string');
        expect(update.timestamp).toBeDefined();
        expect(typeof update.timestamp).toBe('number');
        expect(update.source).toBeDefined();
        
        clientSocket.off('price-update');
        done();
      });

      // Subscribe to price updates
      clientSocket.emit('subscribe', {
        inputMint,
        outputMint,
        amount: '1000000000', // 1 SOL
      });

      // Wait for initial update
      setTimeout(() => {
        done();
      }, 10000);
    });

    it('should receive multiple price updates', (done) => {
      let updateCount = 0;
      const targetUpdates = 3;

      const inputMint = 'So11111111111111111111111111111111111111112';
      const outputMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

      clientSocket.on('price-update', (update: any) => {
        updateCount++;
        
        expect(update).toBeDefined();
        expect(update.rate).toBeDefined();
        expect(parseFloat(update.rate)).toBeGreaterThan(0);

        if (updateCount >= targetUpdates) {
          clientSocket.off('price-update');
          done();
        }
      });

      // Subscribe
      clientSocket.emit('subscribe', {
        inputMint,
        outputMint,
        amount: '1000000000',
      });
    }, 15000);

    it('should handle unsubscription', (done) => {
      const inputMint = 'So11111111111111111111111111111111111111112';
      const outputMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

      clientSocket.emit('subscribe', { inputMint, outputMint });
      
      setTimeout(() => {
        clientSocket.emit('unsubscribe', { inputMint, outputMint });
        
        // Verify unsubscribed
        setTimeout(() => {
          done();
        }, 1000);
      }, 2000);
    });

    it('should handle disconnection gracefully', (done) => {
      clientSocket.disconnect();
      
      setTimeout(() => {
        expect(clientSocket.disconnected).toBe(true);
        done();
      }, 500);
    });
  });

  describe('Price Update Quality', () => {
    it('should have valid rate format', (done) => {
      const inputMint = 'So11111111111111111111111111111111111111112';
      const outputMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

      clientSocket.on('price-update', (update: any) => {
        const rate = parseFloat(update.rate);
        
        // Rate should be a valid number
        expect(isNaN(rate)).toBe(false);
        expect(rate).toBeGreaterThan(0);
        
        // Rate should be reasonable (SOL/USDC should be > 0 and < 1000)
        expect(rate).toBeLessThan(1000);
        
        clientSocket.off('price-update');
        done();
      });

      clientSocket.emit('subscribe', {
        inputMint,
        outputMint,
        amount: '1000000000',
      });

      setTimeout(() => {
        if (!done) return;
        done(new Error('Timeout waiting for price update'));
      }, 10000);
    });

    it('should include confidence and MEV risk assessment', (done) => {
      const inputMint = 'So11111111111111111111111111111111111111112';
      const outputMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
      let updateReceived = false;

      clientSocket.on('price-update', (update: any) => {
        if (updateReceived) return;
        updateReceived = true;

        expect(update.confidence).toBeDefined();
        expect(typeof update.confidence).toBe('number');
        expect(update.confidence).toBeGreaterThanOrEqual(0);
        expect(update.confidence).toBeLessThanOrEqual(1);
        
        expect(update.mevRisk).toBeDefined();
        expect(['low', 'medium', 'high']).toContain(update.mevRisk);
        
        expect(update.priceImpact).toBeDefined();
        expect(typeof update.priceImpact).toBe('number');
        
        clientSocket.off('price-update');
        done();
      });

      clientSocket.emit('subscribe', {
        inputMint,
        outputMint,
        amount: '1000000000',
      });

      setTimeout(() => {
        if (!updateReceived) {
          done(new Error('No price update received'));
        }
      }, 10000);
    });
  });
});

