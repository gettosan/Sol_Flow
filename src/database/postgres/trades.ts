import { TradeRecord } from '../../types';
import { query } from './connection';

/**
 * Repository for trade operations
 */
export class TradeRepository {
  /**
   * Create new trade record
   */
  async create(trade: Omit<TradeRecord, 'id' | 'createdAt'>): Promise<TradeRecord> {
    const result = await query(
      `
      INSERT INTO trades (
        user_address, input_mint, output_mint, 
        input_amount, output_amount, route, dex_fees_bps, 
        slippage_bps, mev_protected, transaction_hash, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `,
      [
        trade.userAddress,
        trade.inputMint,
        trade.outputMint,
        trade.inputAmount,
        trade.outputAmount,
        JSON.stringify(trade.route),
        trade.dexFeesBps,
        trade.slippageBps,
        trade.mevProtected,
        trade.transactionHash,
        trade.status,
      ]
    );

    return this.mapToTradeRecord(result.rows[0]);
  }

  /**
   * Update trade status
   */
  async updateStatus(
    id: string,
    status: 'pending' | 'confirmed' | 'failed',
    executedAt?: Date
  ): Promise<void> {
    await query(
      `
      UPDATE trades 
      SET status = $1, executed_at = $2
      WHERE id = $3
    `,
      [status, executedAt || new Date(), id]
    );
  }

  /**
   * Get trade by ID
   */
  async findById(id: string): Promise<TradeRecord | null> {
    const result = await query('SELECT * FROM trades WHERE id = $1', [id]);
    return result.rows[0] ? this.mapToTradeRecord(result.rows[0]) : null;
  }

  /**
   * Get trades by user
   */
  async findByUser(userAddress: string, limit: number = 50): Promise<TradeRecord[]> {
    const result = await query(
      `SELECT * FROM trades 
       WHERE user_address = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userAddress, limit]
    );
    return result.rows.map((row: any) => this.mapToTradeRecord(row));
  }

  /**
   * Get recent trades
   */
  async getRecent(limit: number = 100): Promise<TradeRecord[]> {
    const result = await query(
      `SELECT * FROM trades 
       ORDER BY created_at DESC 
       LIMIT $1`,
      [limit]
    );
    return result.rows.map((row: any) => this.mapToTradeRecord(row));
  }

  /**
   * Get trading volume statistics
   */
  async getVolumeStats(hours: number = 24): Promise<any> {
    const result = await query(
      `
      SELECT 
        COUNT(*) as total_trades,
        SUM(input_amount) as total_volume_lamports,
        AVG(slippage_bps) as avg_slippage_bps,
        COUNT(CASE WHEN mev_protected THEN 1 END) as mev_protected_count
      FROM trades
      WHERE created_at > NOW() - INTERVAL '${hours} hours'
        AND status = 'confirmed'
    `
    );
    return result.rows[0];
  }

  /**
   * Map database row to TradeRecord
   */
  private mapToTradeRecord(row: any): TradeRecord {
    return {
      id: row.id,
      userAddress: row.user_address,
      inputMint: row.input_mint,
      outputMint: row.output_mint,
      inputAmount: row.input_amount.toString(),
      outputAmount: row.output_amount.toString(),
      route: typeof row.route === 'string' ? JSON.parse(row.route) : row.route,
      dexFeesBps: row.dex_fees_bps,
      slippageBps: row.slippage_bps,
      mevProtected: row.mev_protected,
      transactionHash: row.transaction_hash,
      status: row.status,
      createdAt: new Date(row.created_at),
      executedAt: row.executed_at ? new Date(row.executed_at) : undefined,
    };
  }
}

/**
 * Export singleton instance
 */
export const tradeRepository = new TradeRepository();

