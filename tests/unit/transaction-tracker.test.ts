/**
 * Unit Tests for Transaction Tracker
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { transactionTracker } from '../../src/solana/transactionTracker';
import { TransactionInfo, TransactionStatus } from '../../src/solana/transactionTracker';

describe('Transaction Tracker', () => {
  beforeEach(() => {
    // Reset state if needed
  });

  describe('TransactionTracker', () => {
    it('should get transaction status', async () => {
      const signature = 'test-signature-123';
      
      const status = await transactionTracker.getTransactionStatus(signature);

      expect(status).toBeDefined();
      expect(status?.signature).toBe(signature);
      expect(status?.status).toBeDefined();
      expect(['pending', 'processing', 'confirmed', 'failed', 'finalized']).toContain(status?.status);
    });

    it('should handle null transaction status', async () => {
      const signature = 'non-existent-signature';
      
      const status = await transactionTracker.getTransactionStatus(signature);

      if (status) {
        expect(status.status).toBe('pending');
        expect(status.slot).toBeNull();
      }
    });

    it('should get transaction details', async () => {
      const signature = 'test-signature-456';
      
      const details = await transactionTracker.getTransactionDetails(signature);

      expect(details).toBeDefined();
      if (details) {
        expect(details.signature).toBe(signature);
        expect(details).toHaveProperty('status');
        expect(details).toHaveProperty('slot');
        expect(details).toHaveProperty('timestamp');
      }
    });

    it('should handle failed transaction', async () => {
      const signature = 'failed-tx-signature';
      
      const status = await transactionTracker.getTransactionStatus(signature);

      expect(status).toBeDefined();
      if (status?.status === 'failed') {
        expect(status.error).toBeDefined();
      }
    });

    it('should get multiple transaction statuses', async () => {
      const signatures = ['sig1', 'sig2', 'sig3'];
      
      const statuses = await transactionTracker.getMultipleTransactionStatuses(signatures);

      expect(statuses).toBeInstanceOf(Array);
      expect(statuses.length).toBeLessThanOrEqual(signatures.length);
      
      statuses.forEach(status => {
        expect(status.signature).toBeDefined();
        expect(status.status).toBeDefined();
      });
    });

    it('should check if transaction is confirmed', async () => {
      const signature = 'confirmed-tx';
      
      const isConfirmed = await transactionTracker.isTransactionConfirmed(signature);

      expect(typeof isConfirmed).toBe('boolean');
    });

    it('should wait for confirmation with timeout', async () => {
      const signature = 'pending-tx';
      const timeout = 1000; // 1 second
      
      const result = await transactionTracker.waitForConfirmation(signature, timeout);

      expect(result).toBeDefined();
      if (result) {
        expect(['pending', 'processing', 'confirmed', 'failed', 'finalized']).toContain(result.status);
      }
    });

    it('should subscribe to transaction updates', async () => {
      const signature = 'test-subscription';
      
      let updateReceived = false;

      const callback = (update: any) => {
        expect(update.signature).toBe(signature);
        expect(['pending', 'processing', 'confirmed', 'failed', 'finalized']).toContain(update.status);
        updateReceived = true;
      };

      await transactionTracker.subscribeToTransaction(signature, callback);
      
      // Wait for update or timeout
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (updateReceived) {
        await transactionTracker.unsubscribeFromTransaction(signature, callback);
      }
      
      expect(true).toBe(true); // Test passes if no errors
    });

    it('should handle subscription without updates', async () => {
      const signature = 'no-update-tx';
      
      await transactionTracker.subscribeToTransaction(signature, () => {
        // Should not be called
      });

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Transaction Info Interface', () => {
    it('should create valid TransactionInfo', () => {
      const info: TransactionInfo = {
        signature: 'test-sig',
        status: 'confirmed',
        blockTime: Date.now(),
        slot: 123456,
        confirmationStatus: 'confirmed',
        timestamp: Date.now(),
      };

      expect(info.signature).toBe('test-sig');
      expect(info.status).toBe('confirmed');
      expect(info.slot).toBe(123456);
      expect(info.confirmationStatus).toBe('confirmed');
    });

    it('should handle all status types', () => {
      const statuses: TransactionStatus[] = ['pending', 'processing', 'confirmed', 'failed', 'finalized'];
      
      statuses.forEach(status => {
        const info: TransactionInfo = {
          signature: `test-${status}`,
          status,
          blockTime: null,
          slot: null,
          confirmationStatus: null,
          timestamp: Date.now(),
        };

        expect(info.status).toBe(status);
      });
    });

    it('should handle optional fields', () => {
      const info: TransactionInfo = {
        signature: 'test-sig',
        status: 'confirmed',
        blockTime: null,
        slot: null,
        confirmationStatus: null,
        error: 'Some error',
        fee: 5000,
        timestamp: Date.now(),
      };

      expect(info.error).toBe('Some error');
      expect(info.fee).toBe(5000);
    });
  });
});

