/**
 * Jupiter Swap Executor
 * Executes real swaps using Jupiter Ultra API
 */

import { Connection, Keypair, Transaction } from '@solana/web3.js';
import axios from 'axios';
import { logger } from '../utils/logger';
import { config } from '../config';
import { SwapQuote } from '../types';
import { getBackendWallet } from './wallet';

export interface JupiterOrderResponse {
  mode: string;
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  swapMode: string;
  slippageBps: number;
  priceImpact: number;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
    bps: number;
  }>;
  transaction: string | null;
  requestId: string;
  taker: string | null;
  quoteId: string;
  router: string;
  gasless: boolean;
  expireAt: string;
  errorCode?: number;
  errorMessage?: string;
}

export interface JupiterExecuteResponse {
  success: boolean;
  signature?: string;
  txid?: string;
  error?: string;
}

export class JupiterExecutor {
  private connection: Connection;
  private ultraApiUrl: string;
  private quoteApiUrl: string;
  private swapApiUrl: string;

  constructor() {
    this.connection = new Connection(config.solana.rpcEndpoint, config.solana.commitment);
    this.ultraApiUrl = 'https://lite-api.jup.ag/ultra/v1';
    this.quoteApiUrl = 'https://quote-api.jup.ag';
    this.swapApiUrl = 'https://quote-api.jup.ag';
  }

  /**
   * Get an order from Jupiter Ultra API
   */
  async getOrder(params: {
    inputMint: string;
    outputMint: string;
    amount: string;
    slippageBps?: number;
    userWallet?: string;
  }): Promise<JupiterOrderResponse> {
    try {
      const queryParams = new URLSearchParams({
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        amount: params.amount,
        slippageBps: (params.slippageBps || 50).toString(),
      });

      // Add taker if provided
      if (params.userWallet) {
        queryParams.append('taker', params.userWallet);
      }

      const response = await axios.get(`${this.ultraApiUrl}/order?${queryParams.toString()}`);
      
      return response.data;
    } catch (error: any) {
      // Handle API errors gracefully
      if (error.response?.data?.error) {
        logger.warn('Jupiter API error', { error: error.response.data.error });
      } else {
        logger.error('Failed to get Jupiter order', { error: error.message });
      }
      throw error;
    }
  }

  /**
   * Build unsigned transaction from Jupiter order
   */
  async buildTransaction(order: JupiterOrderResponse): Promise<Transaction | null> {
    try {
      if (!order.transaction) {
        logger.warn('No transaction in Jupiter order response');
        return null;
      }

      if (order.transaction === '') {
        logger.error('Transaction is empty string', { 
          errorCode: order.errorCode,
          errorMessage: order.errorMessage 
        });
        return null;
      }

      // Decode base64 transaction
      const transactionBuffer = Buffer.from(order.transaction, 'base64');
      const transaction = Transaction.from(transactionBuffer);

      return transaction;
    } catch (error: any) {
      logger.error('Failed to build transaction', { error: error.message });
      throw error;
    }
  }

  /**
   * Build transaction using Jupiter's swap API (fallback when Ultra returns no tx)
   */
  async buildTransactionFromSwapAPI(params: {
    inputMint: string;
    outputMint: string;
    amount: string;
    slippageBps?: number;
    userWallet: string;
  }): Promise<Transaction | null> {
    try {
      // First get a quote
      const quoteResponse = await axios.get(`${this.quoteApiUrl}/quote`, {
        params: {
          inputMint: params.inputMint,
          outputMint: params.outputMint,
          amount: params.amount,
          slippageBps: params.slippageBps || 50,
          onlyDirectRoutes: false,
          asLegacyTransaction: false,
        },
      });

      logger.info('Got Jupiter quote', { 
        quoteResponse: !!quoteResponse.data,
      });

      if (!quoteResponse.data) {
        return null;
      }

      // Then build swap transaction
      const swapResponse = await axios.post(`${this.swapApiUrl}/swap`, {
        quoteResponse: quoteResponse.data,
        userPublicKey: params.userWallet,
        wrapUnwrapSOL: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      });

      if (!swapResponse.data || !swapResponse.data.swapTransaction) {
        logger.warn('No swap transaction in response');
        return null;
      }

      // Decode transaction
      const transactionBuffer = Buffer.from(swapResponse.data.swapTransaction, 'base64');
      const transaction = Transaction.from(transactionBuffer);

      return transaction;
    } catch (error: any) {
      logger.error('Failed to build transaction from swap API', { 
        error: error.message,
        response: error.response?.data,
      });
      return null;
    }
  }

  /**
   * Sign transaction with backend wallet
   */
  async signTransaction(transaction: Transaction, keypair: Keypair): Promise<Transaction> {
    try {
      // Sign the transaction
      transaction.partialSign(keypair);

      return transaction;
    } catch (error: any) {
      logger.error('Failed to sign transaction', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute the swap transaction
   */
  async executeSwap(params: {
    inputMint: string;
    outputMint: string;
    amount: string;
    slippageBps?: number;
    userWallet?: string;
    swapQuote: SwapQuote;
  }): Promise<{ transactionHash: string; status: string }> {
    try {
      logger.info('Executing Jupiter swap', {
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        amount: params.amount,
      });

      // Step 1: Get order from Jupiter
      const order = await this.getOrder({
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        amount: params.amount,
        slippageBps: params.slippageBps,
        userWallet: params.userWallet,
      });

      logger.info('Jupiter order received', {
        requestId: order.requestId,
        quoteId: order.quoteId,
        router: order.router,
        outAmount: order.outAmount,
      });

      // Step 2: Build transaction with fallback
      let unsignedTransaction = await this.buildTransaction(order);
      
      // Fallback: If Ultra API doesn't return transaction, use quote + swap API
      if (!unsignedTransaction && params.userWallet) {
        logger.info('Ultra API returned no transaction, trying quote + swap API');
        unsignedTransaction = await this.buildTransactionFromSwapAPI({
          inputMint: params.inputMint,
          outputMint: params.outputMint,
          amount: params.amount,
          slippageBps: params.slippageBps,
          userWallet: params.userWallet,
        });
      }

      if (!unsignedTransaction) {
        throw new Error('Failed to build transaction from Jupiter');
      }

      // Step 3: Load backend wallet
      const wallet = getBackendWallet();
      if (!wallet) {
        throw new Error('Backend wallet not loaded');
      }

      // Step 4: Sign transaction
      const signedTransaction = await this.signTransaction(unsignedTransaction, wallet);

      // Step 5: Submit to Solana
      const signature = await this.connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });

      logger.info('Transaction submitted', { signature });

      // Step 6: Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }

      logger.info('Transaction confirmed', { 
        signature, 
        slot: confirmation.context.slot 
      });

      return {
        transactionHash: signature,
        status: 'confirmed',
      };

    } catch (error: any) {
      logger.error('Jupiter swap execution failed', { error: error.message });
      throw error;
    }
  }
}

export const jupiterExecutor = new JupiterExecutor();

