/**
 * Transaction History Repository
 * Manages transaction status history in PostgreSQL
 */

import { query } from './connection';
import { TransactionInfo, TransactionUpdate } from '../../solana/transactionTracker';
import { logger } from '../../utils/logger';

export interface TransactionRecord {
  id: string;
  signature: string;
  userAddress: string;
  status: string;
  blockTime: Date | null;
  slot: number | null;
  confirmationStatus: string | null;
  errorMessage: string | null;
  fee: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Save transaction status to database
 */
export async function saveTransactionStatus(transaction: TransactionInfo, userAddress: string): Promise<void> {
  try {
    await query(`
      INSERT INTO transaction_history (
        signature, user_address, status, block_time, slot,
        confirmation_status, error_message, fee, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (signature)
      DO UPDATE SET
        status = EXCLUDED.status,
        block_time = EXCLUDED.block_time,
        slot = EXCLUDED.slot,
        confirmation_status = EXCLUDED.confirmation_status,
        error_message = EXCLUDED.error_message,
        fee = EXCLUDED.fee,
        updated_at = NOW()
    `, [
      transaction.signature,
      userAddress,
      transaction.status,
      transaction.blockTime ? new Date(transaction.blockTime) : null,
      transaction.slot,
      transaction.confirmationStatus,
      transaction.error,
      transaction.fee,
    ]);

    logger.debug(`Saved transaction status: ${transaction.signature}`);
  } catch (error) {
    logger.error('Error saving transaction status:', error);
    throw error;
  }
}

/**
 * Update transaction status
 */
export async function updateTransactionStatus(
  signature: string,
  update: TransactionUpdate
): Promise<void> {
  try {
    await query(`
      UPDATE transaction_history
      SET
        status = $2,
        block_time = COALESCE($3, block_time),
        slot = COALESCE($4, slot),
        confirmation_status = COALESCE($5, confirmation_status),
        error_message = COALESCE($6, error_message),
        fee = COALESCE($7, fee),
        updated_at = NOW()
      WHERE signature = $1
    `, [
      signature,
      update.status,
      update.blockTime ? new Date(update.blockTime) : null,
      update.slot,
      update.confirmationStatus,
      update.error,
      update.fee,
    ]);

    logger.debug(`Updated transaction status: ${signature}`);
  } catch (error) {
    logger.error('Error updating transaction status:', error);
    throw error;
  }
}

/**
 * Get transaction history by signature
 */
export async function getTransactionHistory(signature: string): Promise<TransactionRecord | null> {
  try {
    const result = await query(`
      SELECT * FROM transaction_history
      WHERE signature = $1
    `, [signature]);

    if (result.rows.length === 0) {
      return null;
    }

    return mapToTransactionRecord(result.rows[0]);
  } catch (error) {
    logger.error('Error getting transaction history:', error);
    throw error;
  }
}

/**
 * Get transaction history by user
 */
export async function getUserTransactionHistory(
  userAddress: string,
  limit: number = 50
): Promise<TransactionRecord[]> {
  try {
    const result = await query(`
      SELECT * FROM transaction_history
      WHERE user_address = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userAddress, limit]);

    return result.rows.map(mapToTransactionRecord);
  } catch (error) {
    logger.error('Error getting user transaction history:', error);
    throw error;
  }
}

/**
 * Get recent transactions
 */
export async function getRecentTransactions(limit: number = 100): Promise<TransactionRecord[]> {
  try {
    const result = await query(`
      SELECT * FROM transaction_history
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);

    return result.rows.map(mapToTransactionRecord);
  } catch (error) {
    logger.error('Error getting recent transactions:', error);
    throw error;
  }
}

/**
 * Map database row to TransactionRecord
 */
function mapToTransactionRecord(row: any): TransactionRecord {
  return {
    id: row.id,
    signature: row.signature,
    userAddress: row.user_address,
    status: row.status,
    blockTime: row.block_time,
    slot: row.slot,
    confirmationStatus: row.confirmation_status,
    errorMessage: row.error_message,
    fee: row.fee,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

