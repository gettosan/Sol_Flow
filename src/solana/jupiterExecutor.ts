/**
 * Jupiter Swap Executor
 * Executes real swaps using Jupiter Ultra API
 */

import { Connection, Keypair, Transaction, PublicKey } from '@solana/web3.js';
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

  constructor() {
    this.connection = new Connection(config.solana.rpcEndpoint, config.solana.commitment);
    this.ultraApiUrl = 'https://lite-api.jup.ag/ultra/v1';
    this.quoteApiUrl = 'https://api.jup.ag/v6';
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
   * Based on OpenAPI spec: transaction can be base64 string, null, or empty string
   */
  async buildTransaction(order: JupiterOrderResponse): Promise<Transaction | null> {
    try {
      // Check if transaction exists per OpenAPI spec
      if (!order.transaction || order.transaction === '') {
        // Per spec: If taker is defined and transaction is empty string, error fields are present
        if (order.taker && order.transaction === '' && order.errorCode) {
          logger.error('Jupiter returned error', { 
            errorCode: order.errorCode,
            errorMessage: order.errorMessage,
            taker: order.taker
          });
        } else if (!order.transaction) {
          logger.warn('No transaction in Jupiter order response (null)');
        } else {
          logger.warn('Transaction is empty string - insufficient liquidity or funds');
        }
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
   * Build transaction using Jupiter's /swap-instructions API (proper fallback)
   * Based on OpenAPI spec: https://dev.jup.ag/docs/swap-api
   */
  async buildTransactionFromSwapAPI(params: {
    inputMint: string;
    outputMint: string;
    amount: string;
    slippageBps?: number;
    userWallet: string;
  }): Promise<Transaction | null> {
    try {
      logger.info('Attempting Jupiter swap-instructions API (v1)');

      // First get a quote from v6 API
      const quoteResponse = await axios.get(`${this.quoteApiUrl}/quote`, {
        params: {
          inputMint: params.inputMint,
          outputMint: params.outputMint,
          amount: params.amount,
          slippageBps: params.slippageBps || 50,
        },
      });

      logger.info('Got Jupiter v6 quote', { 
        outAmount: quoteResponse.data?.outAmount,
        inputMint: quoteResponse.data?.inputMint,
        outputMint: quoteResponse.data?.outputMint,
      });

      if (!quoteResponse.data || !quoteResponse.data.outAmount) {
        logger.warn('No quote received from Jupiter');
        return null;
      }

      // Get swap instructions from swap API
      const instructionsUrl = 'https://api.jup.ag/swap/v1';
      const swapInstructionsResponse = await axios.post(
        `${instructionsUrl}/swap-instructions`,
        {
          userPublicKey: params.userWallet,
          quoteResponse: quoteResponse.data,
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: {
            priorityLevelWithMaxLamports: {
              priorityLevel: 'medium',
              maxLamports: 100000,
            },
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info('Got swap instructions', {
        hasSetup: !!swapInstructionsResponse.data?.setupInstructions,
        hasSwap: !!swapInstructionsResponse.data?.swapInstruction,
      });

      if (!swapInstructionsResponse.data || !swapInstructionsResponse.data.swapInstruction) {
        logger.warn('No swap instruction in response');
        return null;
      }

      // Build transaction from instructions
      const { swapInstruction, setupInstructions, computeBudgetInstructions, cleanupInstruction } = swapInstructionsResponse.data;
      
      // Get recent blockhash
      const recentBlockhash = await this.connection.getLatestBlockhash('finalized');

      // Create transaction
      const transaction = new Transaction({
        recentBlockhash: recentBlockhash.blockhash,
        feePayer: new PublicKey(params.userWallet),
      });

      // Helper function to convert accounts to TransactionInstruction format
      const createInstruction = (inst: any) => ({
        keys: inst.accounts.map((acc: any) => ({
          pubkey: new PublicKey(acc.pubkey),
          isSigner: acc.isSigner,
          isWritable: acc.isWritable,
        })),
        programId: new PublicKey(inst.programId),
        data: Buffer.from(inst.data, 'base64'),
      });

      // Add all instructions
      if (computeBudgetInstructions) {
        for (const inst of computeBudgetInstructions) {
          transaction.add(createInstruction(inst));
        }
      }

      if (setupInstructions) {
        for (const inst of setupInstructions) {
          transaction.add(createInstruction(inst));
        }
      }

      // Add swap instruction
      if (swapInstruction) {
        transaction.add(createInstruction(swapInstruction));
      }

      if (cleanupInstruction) {
        transaction.add(createInstruction(cleanupInstruction));
      }

      logger.info('Successfully built transaction from swap-instructions');
      return transaction;
    } catch (error: any) {
      logger.error('Failed to build transaction from swap-instructions API', { 
        error: error.message,
        stack: error.stack,
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

