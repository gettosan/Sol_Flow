/**
 * Transaction Tracker
 * Tracks Solana transaction status in real-time
 */

import { Connection } from '@solana/web3.js';
import { logger } from '../utils/logger';
import { config } from '../config';

export type TransactionStatus = 'pending' | 'processing' | 'confirmed' | 'failed' | 'finalized';

export interface TransactionInfo {
  signature: string;
  status: TransactionStatus;
  blockTime: number | null;
  slot: number | null;
  confirmationStatus: 'processed' | 'confirmed' | 'finalized' | null;
  error?: string;
  fee?: number;
  timestamp: number;
}

export interface TransactionUpdate {
  signature: string;
  status: TransactionStatus;
  blockTime: number | null;
  slot: number | null;
  confirmationStatus: 'processed' | 'confirmed' | 'finalized' | null;
  error?: string;
  fee?: number;
}

export class TransactionTracker {
  private connection: Connection;
  private subscriptions: Map<string, any>;
  private statusCache: Map<string, TransactionInfo>;
  private updateCallbacks: Map<string, Set<(update: TransactionUpdate) => void>>;

  constructor() {
    this.connection = new Connection(config.solana.rpcEndpoint, config.solana.commitment);
    this.subscriptions = new Map();
    this.statusCache = new Map();
    this.updateCallbacks = new Map();
  }

  /**
   * Get transaction status by signature
   */
  async getTransactionStatus(signature: string): Promise<TransactionInfo | null> {
    try {
      // Check cache first
      if (this.statusCache.has(signature)) {
        const cached = this.statusCache.get(signature);
        if (cached && Date.now() - cached.timestamp < 60000) { // Cache for 1 minute
          return cached;
        }
      }

      const status = await this.connection.getSignatureStatus(signature);
      
      if (!status || !status.value) {
        return {
          signature,
          status: 'pending',
          blockTime: null,
          slot: null,
          confirmationStatus: null,
          timestamp: Date.now(),
        };
      }

      const transactionInfo: TransactionInfo = {
        signature,
        status: status.value.err ? 'failed' : 'confirmed',
        blockTime: null,
        slot: status.context.slot,
        confirmationStatus: status.value.confirmationStatus || null,
        error: status.value.err?.toString(),
        fee: undefined,
        timestamp: Date.now(),
      };

      // Determine detailed status
      if (transactionInfo.confirmationStatus === 'finalized') {
        transactionInfo.status = 'finalized';
      } else if (transactionInfo.confirmationStatus === 'confirmed') {
        transactionInfo.status = 'confirmed';
      } else if (transactionInfo.confirmationStatus === 'processed') {
        transactionInfo.status = 'processing';
      }

      // Cache the result
      this.statusCache.set(signature, transactionInfo);

      return transactionInfo;
    } catch (error: any) {
      logger.error(`Failed to get transaction status: ${signature}`, { error: error.message });
      return null;
    }
  }

  /**
   * Get transaction details including block time
   */
  async getTransactionDetails(signature: string): Promise<TransactionInfo | null> {
    try {
      const transaction = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!transaction) {
        return await this.getTransactionStatus(signature);
      }

      const status = await this.connection.getSignatureStatus(signature);
      
      return {
        signature,
        status: transaction.meta?.err ? 'failed' : 'confirmed',
        blockTime: transaction.blockTime ? transaction.blockTime * 1000 : null,
        slot: transaction.slot,
        confirmationStatus: status?.value?.confirmationStatus || 'processed' as 'processed' | 'confirmed' | 'finalized',
        error: transaction.meta?.err?.toString(),
        fee: transaction.meta?.fee || undefined,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      logger.error(`Failed to get transaction details: ${signature}`, { error: error.message });
      return null;
    }
  }

  /**
   * Subscribe to transaction status updates
   */
  async subscribeToTransaction(
    signature: string,
    callback: (update: TransactionUpdate) => void
  ): Promise<void> {
    try {
      logger.info(`Subscribing to transaction: ${signature}`);

      // Add callback to set
      if (!this.updateCallbacks.has(signature)) {
        this.updateCallbacks.set(signature, new Set());
      }
      this.updateCallbacks.get(signature)!.add(callback);

      // Check if already subscribed
      if (this.subscriptions.has(signature)) {
        return;
      }

      // Get initial status
      const initialStatus = await this.getTransactionDetails(signature);
      if (initialStatus) {
        callback({
          signature: initialStatus.signature,
          status: initialStatus.status,
          blockTime: initialStatus.blockTime,
          slot: initialStatus.slot,
          confirmationStatus: initialStatus.confirmationStatus,
          error: initialStatus.error,
          fee: initialStatus.fee,
        });
      }

      // Subscribe to status changes
      const subscriptionId = this.connection.onSignature(
        signature,
        async (result, context) => {
          logger.info(`Transaction update: ${signature}`, {
            err: result.err,
            confirmationStatus: 'confirmed',
          });

          const update: TransactionUpdate = {
            signature,
            status: result.err ? 'failed' : 'confirmed',
            blockTime: null,
            slot: context.slot,
            confirmationStatus: 'confirmed' as 'processed' | 'confirmed' | 'finalized',
            error: result.err?.toString(),
          };

          // Update cache
          this.statusCache.set(signature, {
            signature,
            status: update.status as TransactionStatus,
            blockTime: update.blockTime,
            slot: update.slot,
            confirmationStatus: update.confirmationStatus,
            error: update.error,
            timestamp: Date.now(),
          });

          // Notify all callbacks
          const callbacks = this.updateCallbacks.get(signature);
          if (callbacks) {
            callbacks.forEach(cb => cb(update));
          }
        },
        'confirmed' // Listen for confirmed status
      );

      this.subscriptions.set(signature, subscriptionId);
    } catch (error: any) {
      logger.error(`Failed to subscribe to transaction: ${signature}`, { error: error.message });
    }
  }

  /**
   * Unsubscribe from transaction updates
   */
  async unsubscribeFromTransaction(signature: string, callback?: (update: TransactionUpdate) => void): Promise<void> {
    try {
      if (callback) {
        const callbacks = this.updateCallbacks.get(signature);
        if (callbacks) {
          callbacks.delete(callback);
          
          // If no callbacks left, unsubscribe
          if (callbacks.size === 0) {
            const subscriptionId = this.subscriptions.get(signature);
            if (subscriptionId) {
              await this.connection.removeSignatureListener(subscriptionId);
              this.subscriptions.delete(signature);
              this.updateCallbacks.delete(signature);
            }
          }
        }
      } else {
        // Remove all subscriptions for this transaction
        const subscriptionId = this.subscriptions.get(signature);
        if (subscriptionId) {
          await this.connection.removeSignatureListener(subscriptionId);
          this.subscriptions.delete(signature);
          this.updateCallbacks.delete(signature);
        }
      }

      logger.info(`Unsubscribed from transaction: ${signature}`);
    } catch (error: any) {
      logger.error(`Failed to unsubscribe from transaction: ${signature}`, { error: error.message });
    }
  }

  /**
   * Get multiple transaction statuses
   */
  async getMultipleTransactionStatuses(signatures: string[]): Promise<TransactionInfo[]> {
    const statuses: TransactionInfo[] = [];
    
    for (const signature of signatures) {
      const status = await this.getTransactionStatus(signature);
      if (status) {
        statuses.push(status);
      }
    }

    return statuses;
  }

  /**
   * Check if transaction is confirmed
   */
  async isTransactionConfirmed(signature: string): Promise<boolean> {
    const status = await this.getTransactionStatus(signature);
    return status?.status === 'confirmed' || status?.status === 'finalized';
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForConfirmation(signature: string, timeoutMs: number = 30000): Promise<TransactionInfo | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getTransactionStatus(signature);
      
      if (status?.status === 'confirmed' || status?.status === 'finalized') {
        return status;
      }
      
      if (status?.status === 'failed') {
        return status;
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return await this.getTransactionStatus(signature);
  }

  /**
   * Cleanup all subscriptions
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up transaction tracker subscriptions');
    
    for (const [signature, subscriptionId] of this.subscriptions.entries()) {
      try {
        await this.connection.removeSignatureListener(subscriptionId);
      } catch (error) {
        logger.error(`Failed to remove subscription for: ${signature}`, { error });
      }
    }
    
    this.subscriptions.clear();
    this.updateCallbacks.clear();
  }
}

export const transactionTracker = new TransactionTracker();

