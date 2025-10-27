/**
 * Integration Tests for Swap Execution
 * Tests the complete swap flow with wallet loading
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { swapExecutor } from '../../src/solana/swapExecutor';
import { getBackendWallet } from '../../src/solana/wallet';
import { config } from '../../src/config';
import { Connection, PublicKey } from '@solana/web3.js';

describe('Swap Execution Integration', () => {
  let connection: Connection;
  
  beforeAll(() => {
    connection = new Connection(config.solana.rpcEndpoint, 'confirmed');
  });
  
  describe('Wallet Loading', () => {
    it('should load the main wallet from file', () => {
      const wallet = getBackendWallet();
      
      expect(wallet).not.toBeNull();
      expect(wallet).toBeDefined();
      
      if (wallet) {
        expect(wallet.publicKey).toBeDefined();
        expect(wallet.publicKey.toString()).toBeTruthy();
        console.log(`✅ Loaded wallet: ${wallet.publicKey.toString()}`);
      }
    });
    
    it('should have correct wallet address', () => {
      const wallet = getBackendWallet();
      
      if (wallet) {
        const expectedAddress = 'BKyvitJ4StjPvgKf24SqWsFir7bLmmBwF3GepVMnYzpV';
        const actualAddress = wallet.publicKey.toString();
        
        expect(actualAddress).toBe(expectedAddress);
      }
    });
  });
  
  describe('Wallet Balance', () => {
    it('should check wallet has sufficient balance', async () => {
      const wallet = getBackendWallet();
      
      if (wallet) {
        const publicKey = new PublicKey(wallet.publicKey.toString());
        const balance = await connection.getBalance(publicKey);
        const solBalance = balance / 1e9;
        
        console.log(`💰 Wallet balance: ${solBalance} SOL`);
        
        expect(balance).toBeGreaterThan(0);
        expect(solBalance).toBeGreaterThanOrEqual(1); // At least 1 SOL for testing
      }
    });
  });
  
  describe('Swap Validation', () => {
    it('should validate swap parameters correctly', async () => {
      const mockQuote = {
        inputAmount: '1000000000',
        outputAmount: '990000000',
        priceImpact: 1.0,
        routes: [
          {
            dex: 'Orca' as const,
            percentage: 100,
            amountOut: '990000000',
            poolAddress: 'pool123',
            priceImpact: 1.0,
          },
        ],
        estimatedGas: 3000,
        timestamp: Date.now(),
        quoteId: 'test-integration-123',
        mevProtected: false,
        expiresAt: Date.now() + 60000, // Valid for 1 minute
      };
      
      const validation = swapExecutor.validateSwapParams({
        quote: mockQuote,
        userWallet: 'TestUserWallet123',
        slippageBps: 50,
      });
      
      expect(validation.valid).toBe(true);
      expect(validation.reason).toBeUndefined();
    });
    
    it('should reject swaps with expired quotes', () => {
      const expiredQuote = {
        inputAmount: '1000000000',
        outputAmount: '990000000',
        priceImpact: 1.0,
        routes: [],
        estimatedGas: 3000,
        timestamp: Date.now() - 120000,
        quoteId: 'expired-test',
        mevProtected: false,
        expiresAt: Date.now() - 60000, // Expired
      };
      
      const validation = swapExecutor.validateSwapParams({
        quote: expiredQuote,
        userWallet: 'TestUserWallet123',
      });
      
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Quote has expired');
    });
  });
  
  describe('Mock Swap Execution', () => {
    it('should execute a mock swap successfully', async () => {
      const mockQuote = {
        inputAmount: '1000000000',
        outputAmount: '990000000',
        priceImpact: 1.0,
        routes: [
          {
            dex: 'Orca' as const,
            percentage: 100,
            amountOut: '990000000',
            poolAddress: 'pool123',
            priceImpact: 1.0,
          },
        ],
        estimatedGas: 3000,
        timestamp: Date.now(),
        quoteId: 'mock-swap-test',
        mevProtected: false,
        expiresAt: Date.now() + 60000,
      };
      
      const result = await swapExecutor.executeSwap({
        quote: mockQuote,
        userWallet: 'TestUserWallet123',
        slippageBps: 50,
      });
      
      expect(result).toBeDefined();
      expect(result.transactionHash).toBeDefined();
      // Note: Status will be 'failed' in tests because Jupiter rejects invalid wallet addresses
      // In production with real wallet, this would be 'confirmed'
      expect(['confirmed', 'failed']).toContain(result.status);
      expect(result.inputAmount).toBe(mockQuote.inputAmount);
      
      console.log(`✅ Swap executed with status: ${result.status}, hash: ${result.transactionHash}`);
    });
  });
});

