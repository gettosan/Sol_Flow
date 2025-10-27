import { tradeRepository } from '../../src/database/postgres/trades';
import { TradeRecord } from '../../src/types';
import { MOCK_SOL_MINT, MOCK_USDC_MINT } from '../setup';

describe('Database Layer', () => {
  describe('TradeRepository', () => {
    describe('mapToTradeRecord', () => {
      it('should correctly map database row to TradeRecord', () => {
        const mockRow = {
          id: 'test-id-123',
          user_address: 'User123',
          input_mint: MOCK_SOL_MINT,
          output_mint: MOCK_USDC_MINT,
          input_amount: '1000000000',
          output_amount: '120000000',
          route: JSON.stringify([]),
          dex_fees_bps: 5,
          slippage_bps: 50,
          mev_protected: false,
          transaction_hash: 'tx-hash-123',
          status: 'pending',
          created_at: new Date(),
          executed_at: null,
        };

        const trade = (tradeRepository as any).mapToTradeRecord(mockRow);

        expect(trade.id).toBe('test-id-123');
        expect(trade.userAddress).toBe('User123');
        expect(trade.inputAmount).toBe('1000000000');
        expect(trade.status).toBe('pending');
        expect(trade.createdAt).toBeInstanceOf(Date);
        expect(trade.executedAt).toBeUndefined();
      });

      it('should handle executed_at when present', () => {
        const mockRow = {
          id: 'test-id-123',
          user_address: 'User123',
          input_mint: MOCK_SOL_MINT,
          output_mint: MOCK_USDC_MINT,
          input_amount: '1000000000',
          output_amount: '120000000',
          route: JSON.stringify([]),
          dex_fees_bps: 5,
          slippage_bps: 50,
          mev_protected: true,
          transaction_hash: 'tx-hash-123',
          status: 'confirmed',
          created_at: new Date('2024-01-01'),
          executed_at: new Date('2024-01-01T12:00:00'),
        };

        const trade = (tradeRepository as any).mapToTradeRecord(mockRow);

        expect(trade.status).toBe('confirmed');
        expect(trade.mevProtected).toBe(true);
        expect(trade.executedAt).toBeInstanceOf(Date);
        expect(trade.executedAt?.getTime()).toBe(new Date('2024-01-01T12:00:00').getTime());
      });

      it('should handle route as JSON object', () => {
        const route = [{ dex: 'Jupiter', percentage: 100, amountOut: '100', priceImpact: 0.01 }];
        const mockRow = {
          id: 'test-id',
          user_address: 'User123',
          input_mint: MOCK_SOL_MINT,
          output_mint: MOCK_USDC_MINT,
          input_amount: '1000000000',
          output_amount: '120000000',
          route,
          dex_fees_bps: 5,
          slippage_bps: 50,
          mev_protected: false,
          transaction_hash: 'tx-hash',
          status: 'pending',
          created_at: new Date(),
        };

        const trade = (tradeRepository as any).mapToTradeRecord(mockRow);

        expect(trade.route).toEqual(route);
      });
    });
  });

  describe('TradeRecord type validation', () => {
    it('should create valid TradeRecord with all required fields', () => {
      const trade: TradeRecord = {
        id: 'test-id',
        userAddress: 'User123',
        inputMint: MOCK_SOL_MINT,
        outputMint: MOCK_USDC_MINT,
        inputAmount: '1000000000',
        outputAmount: '120000000',
        route: [],
        dexFeesBps: 5,
        slippageBps: 50,
        mevProtected: false,
        transactionHash: 'tx-hash',
        status: 'pending',
        createdAt: new Date(),
      };

      expect(typeof trade.id).toBe('string');
      expect(['pending', 'confirmed', 'failed']).toContain(trade.status);
      expect(typeof trade.mevProtected).toBe('boolean');
      expect(trade.createdAt instanceof Date).toBe(true);
    });
  });
});

